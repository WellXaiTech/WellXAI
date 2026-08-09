package com.wellxai.chatgiza

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.UUID

data class UiMessage(val id: String, val role: String, val content: String, val createdAt: Long? = null)

sealed class AppScreen {
  object Loading : AppScreen()
  object SignedOut : AppScreen()
  object Chat : AppScreen()
  object History : AppScreen()
  object Account : AppScreen()
  object Customize : AppScreen()
  object EditProfile : AppScreen()
  object AppLanguage : AppScreen()
  object Advanced : AppScreen()
  object Appearance : AppScreen()
  object Voice : AppScreen()
  object ReportProblem : AppScreen()
  object DataControls : AppScreen()
  object ManageCloudStorage : AppScreen()
  object Widgets : AppScreen()
  object Haptics : AppScreen()
  object Settings : AppScreen()
  object Projects : AppScreen()
  object Scheduled : AppScreen()
  object Billing : AppScreen()
  object Media : AppScreen()
  object LiveVision : AppScreen()
  object OpenSourceLicenses : AppScreen()
  object KidsMode : AppScreen()
  object SharedConversations : AppScreen()
  object NsfwPreferences : AppScreen()
  object Connectors : AppScreen()
}

class ChatViewModel(private val tokenStore: TokenStore) : ViewModel() {
  var screen by mutableStateOf<AppScreen>(AppScreen.Loading)
    private set

  var userId by mutableStateOf<String?>(null)
    private set
  var userName by mutableStateOf<String?>(null)
    private set
  var userEmail by mutableStateOf<String?>(null)
    private set
  var userImage by mutableStateOf<String?>(null)
    private set

  var historySearchQuery by mutableStateOf("")

  fun onHistorySearchQueryChange(value: String) {
    historySearchQuery = value
  }

  fun openChatGizaMedia() {
    screen = AppScreen.Media
  }

  fun closeChatGizaMedia() {
    screen = AppScreen.Chat
  }

  fun openLiveVision() {
    screen = AppScreen.LiveVision
  }

  fun closeLiveVision() {
    screen = AppScreen.Chat
  }

  /** All of the signed-in user's conversations, most-recent-first. */
  var conversations by mutableStateOf<List<ApiConversation>>(emptyList())
    private set

  // Conversations started by dictating the first message rather than typing
  // it -- History shows these differently (a mic icon + "VOICE" instead of
  // the message text). Local-only/session-only: there's no backend field
  // for this yet, so it resets on a fresh history load from the server.
  var voiceConversationIds by mutableStateOf<Set<String>>(emptySet())
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

  // A picture attached to whatever's about to be sent next -- the URI is
  // kept only so the composer can show a thumbnail of it; the actual
  // upload is the pre-encoded data URL (built by the composer via
  // uriToPostImageDataUrl, same helper ChatGiZa Media's post composer
  // uses, since the ViewModel itself has no Context to decode a Uri).
  // Not persisted with the message afterwards -- the backend's
  // conversation history storage only understands plain-text content, so
  // the model sees the picture live but it won't reappear if the
  // conversation is reopened later.
  var attachedImageUri by mutableStateOf<Uri?>(null)
    private set
  var attachedImageDataUrl by mutableStateOf<String?>(null)
    private set

  fun setAttachedImage(uri: Uri, dataUrl: String) {
    attachedImageUri = uri
    attachedImageDataUrl = dataUrl
  }

  fun clearAttachedImage() {
    attachedImageUri = null
    attachedImageDataUrl = null
  }

  /** One of null (default), "web_search", "deep_research", "deep_think". */
  var activeTool by mutableStateOf<String?>(null)
    private set

  fun selectTool(tool: String?) {
    activeTool = tool
  }

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

  var settingsData by mutableStateOf(SettingsData())
    private set
  var savingSettings by mutableStateOf(false)
    private set

  var projects by mutableStateOf<List<ApiProject>>(emptyList())
    private set
  var loadingProjects by mutableStateOf(false)
    private set
  var newProjectName by mutableStateOf("")

  var scheduledTasks by mutableStateOf<List<ApiScheduledTask>>(emptyList())
    private set
  var loadingScheduled by mutableStateOf(false)
    private set
  var newTaskPrompt by mutableStateOf("")
  var newTaskRunAt by mutableStateOf("")

  var billingSummary by mutableStateOf<BillingSummary?>(null)
    private set
  var loadingBilling by mutableStateOf(false)
    private set

  init {
    if (tokenStore.getToken() != null) {
      userId = tokenStore.getUserId()
      userName = tokenStore.getUserName()
      userEmail = tokenStore.getUserEmail()
      userImage = tokenStore.getUserImage()
      screen = AppScreen.Chat
      loadHistory()
      loadProfile()
      loadSettings()
      loadProjects()
      loadScheduled()
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
          val nameParts = (result.value.profile.fullName ?: "").trim().split(" ", limit = 2)
          firstNameInput = nameParts.getOrElse(0) { "" }
          lastNameInput = nameParts.getOrElse(1) { "" }
          birthYearInput = result.value.profile.birthDate ?: ""
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

  fun openCustomize() {
    screen = AppScreen.Customize
  }

  fun closeCustomize() {
    screen = AppScreen.Account
  }

  var firstNameInput by mutableStateOf("")
  var lastNameInput by mutableStateOf("")
  var birthYearInput by mutableStateOf("")

  fun onFirstNameChange(value: String) {
    firstNameInput = value
  }

  fun onLastNameChange(value: String) {
    lastNameInput = value
  }

  fun onBirthYearChange(value: String) {
    birthYearInput = value
  }

  fun openEditProfile() {
    screen = AppScreen.EditProfile
  }

  fun closeEditProfile() {
    screen = AppScreen.Account
  }

  fun saveEditProfile() {
    val token = tokenStore.getToken() ?: return
    savingProfile = true
    val combinedName = listOf(firstNameInput.trim(), lastNameInput.trim()).filter { it.isNotEmpty() }.joinToString(" ")
    val updated = profileData.copy(
      profile = profileData.profile.copy(fullName = combinedName, birthDate = birthYearInput.trim())
    )
    viewModelScope.launch {
      when (val result = ChatGizaApi.saveProfile(token, updated)) {
        is ApiResult.Success -> {
          profileData = updated
          savingProfile = false
          screen = AppScreen.Account
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          savingProfile = false
        }
      }
    }
  }

  fun openAppearance() {
    screen = AppScreen.Appearance
  }

  fun closeAppearance() {
    screen = AppScreen.Account
  }

  fun openVoice() {
    screen = AppScreen.Voice
  }

  fun closeVoice() {
    screen = AppScreen.Account
  }

  var selectedVoiceId by mutableStateOf(tokenStore.getVoiceName())
    private set

  fun selectVoice(id: String) {
    selectedVoiceId = id
    tokenStore.setVoiceName(id)
  }

  var voiceActivationMode by mutableStateOf(tokenStore.getVoiceActivationMode())
    private set

  fun selectVoiceActivationMode(mode: String) {
    voiceActivationMode = mode
    tokenStore.setVoiceActivationMode(mode)
  }

  var voiceSpeed by mutableStateOf(tokenStore.getVoiceSpeed())
    private set

  fun updateVoiceSpeed(speed: Float) {
    voiceSpeed = speed
    tokenStore.setVoiceSpeed(speed)
  }

  var voiceOutputDevice by mutableStateOf(tokenStore.getVoiceOutputDevice())
    private set

  fun selectVoiceOutputDevice(device: String) {
    voiceOutputDevice = device
    tokenStore.setVoiceOutputDevice(device)
  }

  var premiumChatVoiceEnabled by mutableStateOf(tokenStore.getPremiumChatVoiceEnabled())
    private set

  fun updatePremiumChatVoiceEnabled(value: Boolean) {
    premiumChatVoiceEnabled = value
    tokenStore.setPremiumChatVoiceEnabled(value)
  }

  /** Fetches real OpenAI TTS audio for [text] using the current voice
   * choice; [onResult] is invoked on the main thread with the MP3 bytes,
   * or null if the request failed. */
  fun fetchPremiumSpeech(text: String, onResult: (ByteArray?) -> Unit) {
    val token = tokenStore.getToken()
    if (token == null) {
      onResult(null)
      return
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSpeechAudio(token, text, selectedVoiceId)) {
        is ApiResult.Success -> onResult(result.value)
        is ApiResult.Failure -> onResult(null)
      }
    }
  }

  var personality by mutableStateOf(tokenStore.getPersonality())
    private set

  var customPersonalityText by mutableStateOf(tokenStore.getCustomPersonalityText())
    private set

  var ageConfirmed18Plus by mutableStateOf(tokenStore.getAgeConfirmed18Plus())
    private set

  // Whether a persona requires the 18+ gate is a UI-list concern (see
  // PERSONALITY_OPTIONS in MainActivity.kt), so the caller is responsible
  // for checking that before calling this — this is a plain setter.
  fun selectPersonality(id: String) {
    personality = id
    tokenStore.setPersonality(id)
  }

  fun confirmAge18PlusAndSelectPersonality(id: String) {
    ageConfirmed18Plus = true
    tokenStore.setAgeConfirmed18Plus(true)
    personality = id
    tokenStore.setPersonality(id)
  }

  fun setCustomPersonality(text: String) {
    val trimmed = text.trim().take(300)
    customPersonalityText = trimmed
    tokenStore.setCustomPersonalityText(trimmed)
    personality = "custom"
    tokenStore.setPersonality("custom")
  }

  fun openReportProblem() {
    screen = AppScreen.ReportProblem
  }

  fun closeReportProblem() {
    screen = AppScreen.Account
  }

  fun openWidgets() {
    screen = AppScreen.Widgets
  }

  fun closeWidgets() {
    screen = AppScreen.Account
  }

  fun openOpenSourceLicenses() {
    screen = AppScreen.OpenSourceLicenses
  }

  fun closeOpenSourceLicenses() {
    screen = AppScreen.Account
  }

  fun openKidsMode() {
    screen = AppScreen.KidsMode
  }

  fun closeKidsMode() {
    screen = AppScreen.Account
  }

  fun openSharedConversations() {
    screen = AppScreen.SharedConversations
  }

  fun closeSharedConversations() {
    screen = AppScreen.Account
  }

  fun openNsfwPreferences() {
    screen = AppScreen.NsfwPreferences
  }

  fun closeNsfwPreferences() {
    screen = AppScreen.Account
  }

  fun openConnectors() {
    screen = AppScreen.Connectors
  }

  fun closeConnectors() {
    screen = AppScreen.Account
  }

  fun openHaptics() {
    screen = AppScreen.Haptics
  }

  fun closeHaptics() {
    screen = AppScreen.Account
  }

  // "system" | "for_you" | "dark" | "light" — see AppTheme in MainActivity.kt.
  // "for_you" has no distinct behavior of its own yet, so it follows the
  // device setting the same as "system" until it's actually designed.
  var themeMode by mutableStateOf(tokenStore.getThemeMode())
    private set

  fun updateThemeMode(value: String) {
    themeMode = value
    tokenStore.setThemeMode(value)
  }

  // Permission gate for the Chat<->Extra Media bridge: the user connects
  // once (via the "+" -> "Connect With ChatGiZa" sheet in Extra Media),
  // then a "Push to Extra" action appears under substantial ChatGiZa
  // replies (documents/letters, not short conversational ones) so they can
  // send that specific reply to their own Extra Media feed if they want.
  // Nothing is ever posted automatically -- every push is a deliberate tap.
  var chatGizaMediaConnected by mutableStateOf(tokenStore.getChatGizaMediaConnected())
    private set

  fun updateChatGizaMediaConnected(value: Boolean) {
    chatGizaMediaConnected = value
    tokenStore.setChatGizaMediaConnected(value)
  }

  fun pushReplyToExtraMedia(content: String, onDone: (Boolean) -> Unit) {
    if (content.isBlank()) return onDone(false)
    createMediaPost(content, emptyList(), null, null, null, onDone)
  }

  var hapticsEnabled by mutableStateOf(tokenStore.getHapticsEnabled())
    private set
  var hapticsOnPress by mutableStateOf(tokenStore.getHapticsOnPress())
    private set
  var hapticsOnResponse by mutableStateOf(tokenStore.getHapticsOnResponse())
    private set

  fun updateHapticsEnabled(value: Boolean) {
    hapticsEnabled = value
    tokenStore.setHapticsEnabled(value)
  }

  fun updateHapticsOnPress(value: Boolean) {
    hapticsOnPress = value
    tokenStore.setHapticsOnPress(value)
  }

  fun updateHapticsOnResponse(value: Boolean) {
    hapticsOnResponse = value
    tokenStore.setHapticsOnResponse(value)
  }

  fun openDataControls() {
    screen = AppScreen.DataControls
  }

  fun closeDataControls() {
    screen = AppScreen.Account
  }

  fun openManageCloudStorage() {
    screen = AppScreen.ManageCloudStorage
  }

  fun closeManageCloudStorage() {
    screen = AppScreen.DataControls
  }

  fun onNicknameChange(value: String) {
    nicknameInput = value
  }

  fun onAboutChange(value: String) {
    aboutInput = value
  }

  private fun persistProfile(updated: ProfileData) {
    profileData = updated
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch { ChatGizaApi.saveProfile(token, updated) }
  }

  fun setMemoryEnabled(value: Boolean) = persistProfile(profileData.copy(memoryEnabled = value))

  fun setAppLanguage(value: String) = persistProfile(profileData.copy(language = value))

  fun openAppLanguage() {
    screen = AppScreen.AppLanguage
  }

  fun closeAppLanguage() {
    screen = AppScreen.Account
  }

  fun openAdvanced() {
    screen = AppScreen.Advanced
  }

  fun closeAdvanced() {
    screen = AppScreen.Account
  }

  var pasteAsFileMode by mutableStateOf(tokenStore.getPasteAsFileMode())
    private set

  fun updatePasteAsFileMode(value: String) {
    pasteAsFileMode = value
    tokenStore.setPasteAsFileMode(value)
  }

  var personalizeChatGizaEnabled by mutableStateOf(true)
    private set

  fun setPersonalizeChatGiza(value: Boolean) {
    personalizeChatGizaEnabled = value
  }

  var chatLinkSharingEnabled by mutableStateOf(true)
    private set

  fun setChatLinkSharing(value: Boolean) {
    chatLinkSharingEnabled = value
  }

  // Named update*/not set* -- a same-named fun collides with the
  // auto-generated property setter's JVM signature and fails the build
  // (bit this exact session twice already for other prefs).
  var kidsModeEnabled by mutableStateOf(false)
    private set

  fun updateKidsModeEnabled(value: Boolean) {
    kidsModeEnabled = value
  }

  var blurMatureContentEnabled by mutableStateOf(true)
    private set

  fun updateBlurMatureContentEnabled(value: Boolean) {
    blurMatureContentEnabled = value
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
          screen = AppScreen.Account
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          savingProfile = false
        }
      }
    }
  }

  fun loadSettings() {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSettings(token)) {
        is ApiResult.Success -> settingsData = result.value
        is ApiResult.Failure -> {}
      }
    }
  }

  // Settings (Preferences) is reachable from more than one place — History's
  // gear icon and Live Vision's in-call gear — so unlike the other
  // open*/close* pairs it remembers where it was opened from instead of
  // hardcoding Account. Without this, opening it mid-call and closing it
  // would strand the user on Account instead of resuming Live Vision.
  private var settingsReturnScreen: AppScreen = AppScreen.Account

  fun openSettings() {
    settingsReturnScreen = screen
    screen = AppScreen.Settings
  }

  fun closeSettings() {
    screen = settingsReturnScreen
  }

  private fun persistSettings(updated: SettingsData) {
    settingsData = updated
    val token = tokenStore.getToken() ?: return
    savingSettings = true
    viewModelScope.launch {
      ChatGizaApi.saveSettings(token, updated)
      savingSettings = false
    }
  }

  fun togglePlugin(key: String) {
    val p = settingsData.plugins
    val updated = when (key) {
      "web_search" -> p.copy(webSearch = !p.webSearch)
      "deep_research" -> p.copy(deepResearch = !p.deepResearch)
      "deep_think" -> p.copy(deepThink = !p.deepThink)
      "image" -> p.copy(image = !p.image)
      "video" -> p.copy(video = !p.video)
      "document_writer" -> p.copy(documentWriter = !p.documentWriter)
      "sql_helper" -> p.copy(sqlHelper = !p.sqlHelper)
      "python_helper" -> p.copy(pythonHelper = !p.pythonHelper)
      "business_assistant" -> p.copy(businessAssistant = !p.businessAssistant)
      "ai_agent" -> p.copy(aiAgent = !p.aiAgent)
      else -> p
    }
    persistSettings(settingsData.copy(plugins = updated))
  }

  fun setNotifyOnComplete(value: Boolean) = persistSettings(settingsData.copy(notifyOnComplete = value))
  fun setNotifyImageGen(value: Boolean) = persistSettings(settingsData.copy(notifyImageGen = value))
  fun setAllNotificationsEnabled(value: Boolean) = persistSettings(settingsData.copy(allNotificationsEnabled = value))

  fun setPrivacyPref(patch: (PrivacyPrefs) -> PrivacyPrefs) {
    persistSettings(settingsData.copy(privacy = patch(settingsData.privacy)))
  }

  fun setLocation(value: String) = persistSettings(settingsData.copy(location = value))

  fun loadProjects() {
    val token = tokenStore.getToken() ?: return
    loadingProjects = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getProjects(token)) {
        is ApiResult.Success -> projects = result.value
        is ApiResult.Failure -> errorMessage = result.message
      }
      loadingProjects = false
    }
  }

  fun openProjects() {
    screen = AppScreen.Projects
  }

  fun closeProjects() {
    screen = AppScreen.Account
  }

  fun onNewProjectNameChange(value: String) {
    newProjectName = value
  }

  fun addProject() {
    val name = newProjectName.trim()
    if (name.isEmpty()) return
    val token = tokenStore.getToken() ?: return
    val updated = listOf(ApiProject(UUID.randomUUID().toString(), name, System.currentTimeMillis())) + projects
    projects = updated
    newProjectName = ""
    viewModelScope.launch { ChatGizaApi.saveProjects(token, updated) }
  }

  fun deleteProject(id: String) {
    val token = tokenStore.getToken() ?: return
    val updated = projects.filter { it.id != id }
    projects = updated
    viewModelScope.launch { ChatGizaApi.saveProjects(token, updated) }
  }

  fun loadScheduled() {
    val token = tokenStore.getToken() ?: return
    loadingScheduled = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> scheduledTasks = result.value
        is ApiResult.Failure -> errorMessage = result.message
      }
      loadingScheduled = false
    }
  }

  fun openScheduled() {
    screen = AppScreen.Scheduled
  }

  fun closeScheduled() {
    screen = AppScreen.Account
  }

  fun onNewTaskPromptChange(value: String) {
    newTaskPrompt = value
  }

  fun onNewTaskRunAtChange(value: String) {
    newTaskRunAt = value
  }

  fun addScheduledTask() {
    val prompt = newTaskPrompt.trim()
    // Web parses this with `new Date(runAt)`, which needs the ISO "T"
    // separator to parse reliably across browsers — a plain space works in
    // some engines but not all.
    val runAt = newTaskRunAt.trim().replaceFirst(" ", "T")
    if (prompt.isEmpty() || runAt.isEmpty()) return
    val token = tokenStore.getToken() ?: return
    val updated = listOf(ApiScheduledTask(UUID.randomUUID().toString(), prompt, runAt, false)) + scheduledTasks
    scheduledTasks = updated
    newTaskPrompt = ""
    newTaskRunAt = ""
    viewModelScope.launch { ChatGizaApi.saveScheduled(token, updated) }
  }

  fun deleteScheduledTask(id: String) {
    val token = tokenStore.getToken() ?: return
    val updated = scheduledTasks.filter { it.id != id }
    scheduledTasks = updated
    viewModelScope.launch { ChatGizaApi.saveScheduled(token, updated) }
  }

  fun loadBilling() {
    val token = tokenStore.getToken() ?: return
    loadingBilling = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getBillingSummary(token)) {
        is ApiResult.Success -> billingSummary = result.value
        is ApiResult.Failure -> errorMessage = result.message
      }
      loadingBilling = false
    }
  }

  fun openBilling() {
    screen = AppScreen.Billing
    loadBilling()
  }

  fun closeBilling() {
    screen = AppScreen.Account
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
          tokenStore.setUser(result.value.user.id, result.value.user.name, result.value.user.email, result.value.user.image)
          userId = result.value.user.id
          userName = result.value.user.name
          userEmail = result.value.user.email
          userImage = result.value.user.image
          signingIn = false
          screen = AppScreen.Chat
          loadHistory()
          loadProfile()
          loadSettings()
          loadProjects()
          loadScheduled()
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
    // viewModelScope lives for the whole app process (this ViewModel is a
    // single instance, not re-created per session), so an in-flight
    // send/regenerate would otherwise keep running after sign-out and land
    // its result -- plus save it to history under whatever token happens
    // to be stored -- once a *different* account has since signed in.
    activeChatJob?.cancel()
    activeChatJob = null
    sending = false
    tokenStore.clear()
    conversations = emptyList()
    messages = emptyList()
    activeConversationId = null
    userId = null
    userName = null
    userEmail = null
    userImage = null
    profileData = ProfileData()
    nicknameInput = ""
    aboutInput = ""
    settingsData = SettingsData()
    projects = emptyList()
    scheduledTasks = emptyList()
    billingSummary = null
    personalizeChatGizaEnabled = true
    chatLinkSharingEnabled = true
    selectedVoiceId = tokenStore.getVoiceName()
    personality = tokenStore.getPersonality()
    customPersonalityText = tokenStore.getCustomPersonalityText()
    ageConfirmed18Plus = tokenStore.getAgeConfirmed18Plus()
    firstNameInput = ""
    lastNameInput = ""
    birthYearInput = ""
    screen = AppScreen.SignedOut
  }

  private var deletedIds: Map<String, Long> = emptyMap()
  // Tracked so signOut() can cancel a still-streaming send/regenerate
  // instead of letting it finish and write into whatever account is
  // signed in by the time it completes.
  private var activeChatJob: Job? = null

  private fun sortConversations(list: List<ApiConversation>): List<ApiConversation> =
    list.sortedWith(compareByDescending<ApiConversation> { it.pinned }.thenByDescending { it.lastActivity() })

  fun loadHistory() {
    val token = tokenStore.getToken() ?: return
    loadingHistory = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getHistory(token)) {
        is ApiResult.Success -> {
          conversations = sortConversations(result.value.conversations)
          deletedIds = result.value.deletedIds
        }
        is ApiResult.Failure -> errorMessage = result.message
      }
      loadingHistory = false
    }
  }

  fun openHistory() {
    screen = AppScreen.History
  }

  // ChatGiZa Media is a real shared feed now (backend-backed via
  // /api/media/posts) -- anyone signed in can see anyone else's posts, not
  // just what this device posted this session.
  var mediaPosts by mutableStateOf<List<ApiMediaPost>>(emptyList())
    private set
  var loadingMediaPosts by mutableStateOf(false)
    private set
  var mediaComments by mutableStateOf<Map<String, List<ApiMediaComment>>>(emptyMap())
    private set
  var mediaError by mutableStateOf<String?>(null)
    private set

  fun clearMediaError() {
    mediaError = null
  }

  // Named differently from the auto-generated `mediaError` property setter
  // (var ... private set already generates a JVM setMediaError(String?))
  // -- a same-named fun here collides with it on JVM signature and fails
  // the build ("Platform declaration clash").
  fun reportMediaError(message: String) {
    mediaError = message
  }

  fun loadMediaPosts() {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    loadingMediaPosts = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getMediaPosts(token)) {
        is ApiResult.Success -> mediaPosts = result.value
        is ApiResult.Failure -> mediaError = result.message
      }
      loadingMediaPosts = false
    }
  }

  var uploadingMediaVideo by mutableStateOf(false)
    private set

  fun createMediaPost(
    text: String,
    imageDataUrls: List<String>,
    videoBytes: ByteArray?,
    videoMime: String?,
    sentiment: String?,
    onDone: (Boolean) -> Unit
  ) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return onDone(false) }
    viewModelScope.launch {
      var videoUrl: String? = null
      if (videoBytes != null && videoMime != null) {
        uploadingMediaVideo = true
        when (val slotResult = ChatGizaApi.createVideoUploadSlot(token, videoMime)) {
          is ApiResult.Success -> {
            when (val uploadResult = ChatGizaApi.uploadVideoBytes(slotResult.value.signedUrl, videoMime, videoBytes)) {
              is ApiResult.Success -> videoUrl = slotResult.value.publicUrl
              is ApiResult.Failure -> {
                mediaError = uploadResult.message
                uploadingMediaVideo = false
                return@launch onDone(false)
              }
            }
          }
          is ApiResult.Failure -> {
            mediaError = slotResult.message
            uploadingMediaVideo = false
            return@launch onDone(false)
          }
        }
        uploadingMediaVideo = false
      }

      when (val result = ChatGizaApi.createMediaPost(token, text, imageDataUrls, videoUrl, sentiment)) {
        is ApiResult.Success -> {
          mediaPosts = listOf(result.value) + mediaPosts
          onDone(true)
        }
        is ApiResult.Failure -> {
          mediaError = result.message
          onDone(false)
        }
      }
    }
  }

  fun toggleMediaPostLike(postId: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    // Optimistic flip so the tap feels instant; corrected by (or reverted
    // to match) the server's real state once the request comes back.
    mediaPosts = mediaPosts.map {
      if (it.id == postId) it.copy(likedByMe = !it.likedByMe, likeCount = it.likeCount + if (it.likedByMe) -1 else 1) else it
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.toggleMediaPostLike(token, postId)) {
        is ApiResult.Success -> {
          mediaPosts = mediaPosts.map {
            if (it.id == postId) it.copy(likedByMe = result.value.liked, likeCount = result.value.likeCount) else it
          }
        }
        is ApiResult.Failure -> {
          mediaPosts = mediaPosts.map {
            if (it.id == postId) it.copy(likedByMe = !it.likedByMe, likeCount = it.likeCount + if (it.likedByMe) -1 else 1) else it
          }
          mediaError = result.message
        }
      }
    }
  }

  fun removeMediaPost(postId: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    val previous = mediaPosts
    mediaPosts = mediaPosts.filter { it.id != postId }
    viewModelScope.launch {
      val result = ChatGizaApi.deleteMediaPost(token, postId)
      if (result is ApiResult.Failure) {
        mediaPosts = previous
        mediaError = result.message
      }
    }
  }

  fun loadMediaComments(postId: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    viewModelScope.launch {
      when (val result = ChatGizaApi.getMediaComments(token, postId)) {
        is ApiResult.Success -> mediaComments = mediaComments + (postId to result.value)
        is ApiResult.Failure -> mediaError = result.message
      }
    }
  }

  fun addMediaComment(postId: String, text: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    viewModelScope.launch {
      when (val result = ChatGizaApi.addMediaComment(token, postId, text)) {
        is ApiResult.Success -> {
          val existing = mediaComments[postId].orEmpty()
          mediaComments = mediaComments + (postId to (existing + result.value))
          mediaPosts = mediaPosts.map { if (it.id == postId) it.copy(commentCount = it.commentCount + 1) else it }
        }
        is ApiResult.Failure -> mediaError = result.message
      }
    }
  }

  fun closeHistory() {
    screen = AppScreen.Chat
  }

  fun deleteConversation(id: String) {
    val token = tokenStore.getToken() ?: return
    val updated = conversations.filter { it.id != id }
    val updatedDeleted = deletedIds + (id to System.currentTimeMillis())
    conversations = updated
    deletedIds = updatedDeleted
    if (activeConversationId == id) {
      activeConversationId = null
      messages = emptyList()
    }
    viewModelScope.launch { ChatGizaApi.saveHistory(token, updated, updatedDeleted) }
  }

  fun deleteAllConversations() {
    val token = tokenStore.getToken() ?: return
    val now = System.currentTimeMillis()
    val updatedDeleted = deletedIds + conversations.associate { it.id to now }
    conversations = emptyList()
    deletedIds = updatedDeleted
    activeConversationId = null
    messages = emptyList()
    viewModelScope.launch { ChatGizaApi.saveHistory(token, emptyList(), updatedDeleted) }
  }

  var deletingAccount by mutableStateOf(false)
    private set

  fun deleteAccount() {
    val token = tokenStore.getToken() ?: return
    deletingAccount = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.deleteAccount(token)) {
        is ApiResult.Success -> {
          deletingAccount = false
          signOut()
        }
        is ApiResult.Failure -> {
          deletingAccount = false
          errorMessage = result.message
        }
      }
    }
  }

  fun renameConversation(id: String, newTitle: String) {
    val token = tokenStore.getToken() ?: return
    val trimmed = newTitle.trim()
    if (trimmed.isEmpty()) return
    val updated = conversations.map { if (it.id == id) it.copy(title = trimmed) else it }
    conversations = updated
    viewModelScope.launch { ChatGizaApi.saveHistory(token, updated, deletedIds) }
  }

  fun togglePin(id: String) {
    val token = tokenStore.getToken() ?: return
    val updated = sortConversations(conversations.map { if (it.id == id) it.copy(pinned = !it.pinned) else it })
    conversations = updated
    viewModelScope.launch { ChatGizaApi.saveHistory(token, updated, deletedIds) }
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

  var autoSpeakNextReply by mutableStateOf(false)
    private set

  fun clearAutoSpeak() {
    autoSpeakNextReply = false
  }

  fun sendMessage(viaVoice: Boolean = false) {
    val text = input.trim()
    val token = tokenStore.getToken()
    val imageToSend = attachedImageDataUrl
    if ((text.isEmpty() && imageToSend == null) || sending || token == null) return
    autoSpeakNextReply = viaVoice

    val now = System.currentTimeMillis()
    val userMsg = UiMessage(UUID.randomUUID().toString(), "user", text, now)
    val assistantId = UUID.randomUUID().toString()
    messages = messages + userMsg + UiMessage(assistantId, "assistant", "", now)
    input = ""
    clearAttachedImage()
    sending = true
    errorMessage = null

    val conversationId = activeConversationId ?: UUID.randomUUID().toString()
    val isNewConversation = activeConversationId == null
    activeConversationId = conversationId
    if (viaVoice && isNewConversation) {
      voiceConversationIds = voiceConversationIds + conversationId
    }

    activeChatJob = viewModelScope.launch {
      val history = messages.dropLast(1).map { ChatMessage(it.role, it.content) }
      val result = ChatGizaApi.streamChat(
        token = token,
        messages = history,
        tool = activeTool,
        conversationId = conversationId,
        profile = profileData.profile,
        memory = if (profileData.memoryEnabled) profileData.memory else emptyList(),
        language = profileData.language,
        location = settingsData.location,
        company = settingsData.company,
        imageDataUrl = imageToSend
      ) { chunk ->
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

      val titleFallback = text.take(60).ifEmpty { "Photo" }
      val title = if (isNewConversation) titleFallback else conversations.find { it.id == conversationId }?.title ?: titleFallback
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
      ChatGizaApi.saveHistory(token, conversations, deletedIds)
    }
  }

  /** Re-runs the request that produced [assistantId]'s reply, replacing its
   * content with a fresh response. Anything after it in the conversation
   * (there shouldn't normally be anything, but just in case) is dropped. */
  fun regenerateMessage(assistantId: String) {
    val token = tokenStore.getToken() ?: return
    val conversationId = activeConversationId ?: return
    if (sending) return
    val idx = messages.indexOfFirst { it.id == assistantId }
    if (idx <= 0) return

    val history = messages.take(idx).map { ChatMessage(it.role, it.content) }
    messages = messages.take(idx) + UiMessage(assistantId, "assistant", "", System.currentTimeMillis())
    sending = true
    errorMessage = null

    activeChatJob = viewModelScope.launch {
      val result = ChatGizaApi.streamChat(
        token = token,
        messages = history,
        tool = activeTool,
        conversationId = conversationId,
        profile = profileData.profile,
        memory = if (profileData.memoryEnabled) profileData.memory else emptyList(),
        language = profileData.language,
        location = settingsData.location,
        company = settingsData.company
      ) { chunk ->
        messages = messages.map { m -> if (m.id == assistantId) m.copy(content = m.content + chunk) else m }
      }
      sending = false
      if (result is ApiResult.Failure) {
        errorMessage = result.message
        messages = messages.map { m ->
          if (m.id == assistantId && m.content.isEmpty()) m.copy(content = "(failed to respond)") else m
        }
      }

      val updated = ApiConversation(
        id = conversationId,
        title = conversations.find { it.id == conversationId }?.title ?: "Chat",
        messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis()) },
        pinned = conversations.find { it.id == conversationId }?.pinned ?: false
      )
      conversations = conversations.map { if (it.id == conversationId) updated else it }
      ChatGizaApi.saveHistory(token, conversations, deletedIds)
    }
  }

  /** Removes a single message (e.g. an unwanted assistant reply) from the
   * active conversation and persists the change. */
  fun deleteMessage(id: String) {
    val token = tokenStore.getToken() ?: return
    val conversationId = activeConversationId ?: return
    messages = messages.filter { it.id != id }
    val updated = ApiConversation(
      id = conversationId,
      title = conversations.find { it.id == conversationId }?.title ?: "Chat",
      messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis()) },
      pinned = conversations.find { it.id == conversationId }?.pinned ?: false
    )
    conversations = conversations.map { if (it.id == conversationId) updated else it }
    viewModelScope.launch { ChatGizaApi.saveHistory(token, conversations, deletedIds) }
  }
}

private fun ApiConversation.lastActivity(): Long = messages.maxOfOrNull { it.createdAt ?: 0L } ?: 0L
