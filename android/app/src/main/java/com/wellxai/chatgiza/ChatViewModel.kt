package com.wellxai.chatgiza

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import java.util.UUID

data class UiMessage(val id: String, val role: String, val content: String)

sealed class AppScreen {
  object Loading : AppScreen()
  object SignedOut : AppScreen()
  object Chat : AppScreen()
}

class ChatViewModel(private val tokenStore: TokenStore) : ViewModel() {
  var screen by mutableStateOf<AppScreen>(AppScreen.Loading)
    private set

  var userName by mutableStateOf<String?>(null)
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

  init {
    screen = if (tokenStore.getToken() != null) {
      userName = tokenStore.getUserName()
      AppScreen.Chat
    } else {
      AppScreen.SignedOut
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
    messages = emptyList()
    userName = null
    screen = AppScreen.SignedOut
  }

  fun onInputChange(value: String) {
    input = value
  }

  fun sendMessage() {
    val text = input.trim()
    val token = tokenStore.getToken()
    if (text.isEmpty() || sending || token == null) return

    val userMsg = UiMessage(UUID.randomUUID().toString(), "user", text)
    val assistantId = UUID.randomUUID().toString()
    messages = messages + userMsg + UiMessage(assistantId, "assistant", "")
    input = ""
    sending = true
    errorMessage = null

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
    }
  }
}
