package com.wellxai.chatgiza

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import java.util.UUID

data class UiMessage(val id: String, val role: String, val content: String, val createdAt: Long? = null)

sealed class AppScreen {
  object Loading : AppScreen()
  object SignedOut : AppScreen()
  object Chat : AppScreen()
  object History : AppScreen()
  object Account : AppScreen()
}

class ChatViewModel(private val tokenStore: TokenStore) : ViewModel() {
  var screen by mutableStateOf<AppScreen>(AppScreen.Loading)
    private set

  var userName by mutableStateOf<String?>(null)
    private set

  /** All of the signed-in user's conversations, most-recent-first. */
  var conversations by mutableStateOf<List<ApiConversation>>(emptyList())
    private set

  var loadingHistory by mutableStateOf(false)
    private set

  /** null = an unsaved new chat that hasn't been persisted yet. */
  var activeConversationId by mutableStateOf<String?>(null)
    private set

  var messages by mutableStateOf<List<UiMessage>>(emptyList())
    private set

  var input by mutableStateOf("")
  var sending by mutableStateOf(false)
    private set

  var signingIn by mutableStateOf(false)
    private set

  var errorMessage by mutableStateOf<String?>(null)
    private set

  var profileData by mutableStateOf(ProfileData())
    private set

  var savingProfile by mutableStateOf(false)
    private set

  var nicknameInput by mutableStateOf("")
  var aboutInput by mutableStateOf("")

  init {
    if (tokenStore.getToken() != null) {
      userName = tokenStore.getUserName()
      screen = AppScreen.Chat
      loadHistory()
      loadProfile()
    } else {
      screen = AppScreen.SignedOut
    }
  }

  fun loadProfile() {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getProfile(token)) {
        is ApiResult.Success -> {
          profileData = result.value
          nicknameInput = result.value.profile.nickname
          aboutInput = result.value.profile.about
        }
        is ApiResult.Failure -> {} // Account screen just shows blank fields; not worth surfacing.
      }
    }
  }

  fun openAccount() {
    screen = AppScreen.Account
  }

  fun closeAccount() {
    screen = AppScreen.Chat
  }

  fun onNicknameChange(value: String) {
    nicknameInput = value
  }

  fun onAboutChange(value: String) {
    aboutInput = value
  }

  fun saveProfile() {
    val token = tokenStore.getToken() ?: return
    savingProfile = true
    val updated = profileData.copy(profile = profileData.profile.copy(nickname = nicknameInput, about = aboutInput))
    viewModelScope.launch {
      when (val result = ChatGizaApi.saveProfile(token, updated)) {
        is ApiResult.Success -> {
          profileData = updated
          savingProfile = false
          screen = AppScreen.Chat
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          savingProfile = false
        }
      }
    }
  }

  fun onSignInStart() {
    signingIn = true
    errorMessage = null
  }

  fun onGoogleIdToken(idToken: String) {
    viewModelScope.launch {
      when (val result = ChatGizaApi.mobileAuth(idToken)) {
        is ApiResult.Success -> {
          tokenStore.setToken(result.value.token)
          tokenStore.setUser(result.value.user.name, result.value.user.email, result.value.user.image)
          userName = result.value.user.name
          signingIn = false
          screen = AppScreen.Chat
          loadHistory()
          loadProfile()
        }
        is ApiResult.Failure -> {
          signingIn = false
          errorMessage = result.message
        }
      }
    }
  }

  fun onSignInFailed(message: String) {
    signingIn = false
    errorMessage = message
  }

  fun signOut() {
    tokenStore.clear()
    conversations = emptyList()
    messages = emptyList()
    activeConversationId = null
    userName = null
    profileData = ProfileData()
    nicknameInput = ""
    aboutInput = ""
    screen = AppScreen.SignedOut
  }

  fun loadHistory() {
    val token = tokenStore.getToken() ?: return
    loadingHistory = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getHistory(token)) {
        is ApiResult.Success -> conversations = result.value.sortedByDescending { it.lastActivity() }
        is ApiResult.Failure -> errorMessage = result.message
      }
      loadingHistory = false
    }
  }

  fun openHistory() {
    screen = AppScreen.History
  }

  fun closeHistory() {
    screen = AppScreen.Chat
  }

  fun selectConversation(id: String) {
    val convo = conversations.find { it.id == id } ?: return
    activeConversationId = id
    messages = convo.messages.map { UiMessage(it.id, it.role, it.content, it.createdAt) }
    screen = AppScreen.Chat
  }

  fun newChat() {
    activeConversationId = null
    messages = emptyList()
    input = ""
    errorMessage = null
    screen = AppScreen.Chat
  }

  fun onInputChange(value: String) {
    input = value
  }

  fun sendMessage() {
    val text = input.trim()
    val token = tokenStore.getToken()
    if (text.isEmpty() || sending || token == null) return

    val now = System.currentTimeMillis()
    val userMsg = UiMessage(UUID.randomUUID().toString(), "user", text, now)
    val assistantId = UUID.randomUUID().toString()
    messages = messages + userMsg + UiMessage(assistantId, "assistant", "", now)
    input = ""
    sending = true
    errorMessage = null

    val conversationId = activeConversationId ?: UUID.randomUUID().toString()
    val isNewConversation = activeConversationId == null
    activeConversationId = conversationId

    viewModelScope.launch {
      val history = messages.dropLast(1).map { ChatMessage(it.role, it.content) }
      val result = ChatGizaApi.streamChat(token, history) { chunk ->
        messages = messages.map { m ->
          if (m.id == assistantId) m.copy(content = m.content + chunk) else m
        }
      }
      sending = false
      if (result is ApiResult.Failure) {
        errorMessage = result.message
        messages = messages.map { m ->
          if (m.id == assistantId && m.content.isEmpty()) m.copy(content = "(failed to respond)") else m
        }
      }

      val title = if (isNewConversation) text.take(60) else conversations.find { it.id == conversationId }?.title ?: text.take(60)
      val updated = ApiConversation(
        id = conversationId,
        title = title,
        messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis()) },
        pinned = conversations.find { it.id == conversationId }?.pinned ?: false
      )
      conversations = if (isNewConversation) {
        listOf(updated) + conversations
      } else {
        conversations.map { if (it.id == conversationId) updated else it }
      }
      ChatGizaApi.saveHistory(token, conversations)
    }
  }
}

private fun ApiConversation.lastActivity(): Long = messages.maxOfOrNull { it.createdAt ?: 0L } ?: 0L
