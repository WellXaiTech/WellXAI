package com.wellxai.chatgiza

import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

// pairId links a question to its answer with a short, stable, shareable
// code (e.g. "Q-4F2A19") -- both the user's message and the assistant's
// reply to it carry the same one, so either can be looked up and traced
// back to the other no matter how old the conversation is. Blank for
// messages saved before this existed; the UI falls back to deriving a
// display id from the message's own [id] for those.
data class UiMessage(val id: String, val role: String, val content: String, val createdAt: Long? = null, val pairId: String = "")

fun newPairId(): String = "Q-" + UUID.randomUUID().toString().replace("-", "").take(6).uppercase()

// Renders a single emoji (including multi-codepoint ZWJ sequences like
// "man technologist") as its Twemoji CDN image URL -- lets a preset avatar
// become a real, sharable image URL for users.image without rendering or
// uploading anything ourselves. Verified against the live CDN for every
// entry in AVATAR_PRESETS before relying on this (variation selectors like
// U+FE0F must be kept when the source string has one, e.g. "male sign" in
// the turban/doctor presets -- Twemoji's filenames require it there but
// omit it everywhere else, which is exactly what preserving the emoji
// string's own codepoints as-is produces).
fun emojiToTwemojiUrl(emoji: String): String {
  val codepoints = mutableListOf<Int>()
  var i = 0
  while (i < emoji.length) {
    val cp = emoji.codePointAt(i)
    codepoints.add(cp)
    i += Character.charCount(cp)
  }
  val hex = codepoints.joinToString("-") { Integer.toHexString(it) }
  return "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/$hex.png"
}

// `text` is folded into the outgoing message text (PDF/plain-text files);
// `imageDataUrls` are sent as vision image parts alongside it (a rendered
// PDF's pages). A file only ever populates one of the two. `previewBitmap`
// is local-only (never sent anywhere) -- Coil's AsyncImage doesn't decode
// data: URIs, so the composer preview needs the actual in-memory Bitmap
// from render time rather than re-deriving it from imageDataUrls.
data class AttachedFile(
  val name: String,
  val text: String? = null,
  val imageDataUrls: List<String> = emptyList(),
  val previewBitmap: Bitmap? = null
)

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
  object FontChoice : AppScreen()
  object Voice : AppScreen()
  object ReportProblem : AppScreen()
  object DataControls : AppScreen()
  object DataDashboard : AppScreen()
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
  object CollabChat : AppScreen()
  object Community : AppScreen()
  object TrustedDevices : AppScreen()
  object StorageManagement : AppScreen()
  object NsfwPreferences : AppScreen()
  object Connectors : AppScreen()
  object Profile : AppScreen()
  object ProfileHub : AppScreen()
  object AccountSettings : AppScreen()
  object SwitchAccount : AppScreen()
  object SubaccountSettings : AppScreen()
  object ShareTarget : AppScreen()
  object ChangePassword : AppScreen()
  object MobileNumber : AppScreen()
  object ChangeEmail : AppScreen()
  object Nickname : AppScreen()
  object TwoFactorSetup : AppScreen()
  object TotpLoginVerify : AppScreen()
  object AppLockSetup : AppScreen()
  object PasskeysManage : AppScreen()
}

// A file/text shared into ChatGiZa from another app (system Share sheet),
// waiting on the user to pick which existing conversation (or a new one)
// it should land in -- see ShareTargetPickerScreen.
data class PendingShare(val uri: Uri?, val text: String?)

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
  var userPhone by mutableStateOf<String?>(null)
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

  // "Speak" in the composer -- starts a voice-only conversation as an
  // overlay on top of whatever screen is showing, instead of navigating to
  // the full Live Vision screen (camera, personality picker, etc). A plain
  // boolean rather than an AppScreen since it's meant to sit over the
  // current screen, not replace it.
  var quickSpeakActive by mutableStateOf(false)
    private set

  fun openQuickSpeak() {
    quickSpeakActive = true
  }

  fun closeQuickSpeak() {
    quickSpeakActive = false
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

  // Same "sent live, not persisted with the message afterwards" tradeoff as
  // attachedImage above. `imageDataUrls` covers both a rendered PDF's pages
  // (sent as vision image parts, matching how the web treats scanned PDFs)
  // and plain text files (.txt/.md/.csv), which instead land in `text`.
  var attachedFile by mutableStateOf<AttachedFile?>(null)
    private set

  fun updateAttachedFile(file: AttachedFile) {
    attachedFile = file
  }

  fun clearAttachedFile() {
    attachedFile = null
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

  var showScreenshotSharePrompt by mutableStateOf(false)
    private set

  /** Offered on any screen, not just an active chat -- was previously
   * gated to `messages.isNotEmpty()`, so a screenshot taken anywhere other
   * than an in-progress conversation with messages never showed this at
   * all, per explicit request to have it work app-wide instead. */
  fun onScreenshotTaken() {
    showScreenshotSharePrompt = true
  }

  fun dismissScreenshotSharePrompt() {
    showScreenshotSharePrompt = false
  }

  var profileData by mutableStateOf(ProfileData())
    private set

  var savingProfile by mutableStateOf(false)
    private set

  var nicknameInput by mutableStateOf("")
  var aboutInput by mutableStateOf("")
  var bioInput by mutableStateOf("")
  var displayNameInput by mutableStateOf("")

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
  var activeAds by mutableStateOf<List<ApiAd>>(emptyList())
    private set
  var loadingScheduled by mutableStateOf(false)
    private set
  var newTaskPrompt by mutableStateOf("")
  var newTaskRunAt by mutableStateOf("")
  var newTaskCategory by mutableStateOf("Chat")
  // Attachment for the task being created (calendar photo, PDF page, or a
  // plain-text file) -- see ApiScheduledTask's own attachment* fields for
  // how this is persisted and later folded back into the prompt when the
  // task fires. Only one of newTaskAttachmentText/newTaskAttachmentImageDataUrl
  // is ever non-blank at a time.
  var newTaskAttachmentName by mutableStateOf("")
    private set
  var newTaskAttachmentText by mutableStateOf("")
    private set
  var newTaskAttachmentImageDataUrl by mutableStateOf("")
    private set

  var billingSummary by mutableStateOf<BillingSummary?>(null)
    private set
  var loadingBilling by mutableStateOf(false)
    private set

  // Idea #9: Digital Twin -- one synthesized narrative profile, loaded
  // once like profile/settings, editable via digitalTwinInput + saveDigitalTwin(),
  // or regenerated from the user's own chat history via regenerateDigitalTwin().
  var digitalTwin by mutableStateOf("")
    private set
  var digitalTwinInput by mutableStateOf("")
  var digitalTwinUpdatedAt by mutableStateOf(0L)
    private set
  var digitalTwinRegenerating by mutableStateOf(false)
    private set
  var savingDigitalTwin by mutableStateOf(false)
    private set

  // Up to 5 lightweight sub-identities per signed-in account (see
  // /api/subaccounts), each with its own separate ChatGiZa conversation
  // history -- switching just changes which history activeSubaccountId
  // scopes loadHistory()/saveHistory() calls to; everything else about the
  // account (profile, billing, Account Settings) stays shared. Declared
  // before init{} since loadHistory() (called from there) reads
  // activeSubaccountId immediately.
  var activeSubaccountId by mutableStateOf(tokenStore.getActiveSubaccountId())
    private set
  var activeSubaccountName by mutableStateOf(tokenStore.getActiveSubaccountName())
    private set
  var subaccounts by mutableStateOf<List<ApiSubaccount>>(emptyList())
    private set
  var loadingSubaccounts by mutableStateOf(false)
    private set
  var subaccountError by mutableStateOf<String?>(null)
    private set

  // null while the account's password status hasn't loaded yet -- the
  // screen shows a loading state rather than guessing, since guessing
  // wrong would either ask for a nonexistent old password or skip
  // straight past a real one.
  var hasPassword by mutableStateOf<Boolean?>(null)
    private set
  var passwordStep by mutableStateOf("old")
    private set
  var oldPasswordInput by mutableStateOf("")
    private set
  var newPasswordInput by mutableStateOf("")
    private set
  var passwordCodeInput by mutableStateOf("")
    private set
  var passwordError by mutableStateOf<String?>(null)
    private set
  var changingPassword by mutableStateOf(false)
    private set

  // Authenticator App 2FA -- null while the account's on/off status hasn't
  // loaded yet, same "don't guess" reasoning as hasPassword above.
  var totpEnabled by mutableStateOf<Boolean?>(null)
    private set
  // Set once setupTotp() returns a fresh secret to enroll -- shown as a QR
  // code (rendered from totpSetupUri) plus the raw secret for manual entry.
  var totpSetupSecret by mutableStateOf<String?>(null)
    private set
  var totpSetupUri by mutableStateOf<String?>(null)
    private set
  // "link" (QR/key + Next) or "verify" (code entry + Submit) -- only
  // meaningful once totpSetupSecret is set; the intro screen before that
  // doesn't consult this at all.
  var totpSetupStep by mutableStateOf("link")
    private set
  var totpSetupCodeInput by mutableStateOf("")
    private set
  // Reused for both turning 2FA on (confirming the first code) and turning
  // it back off (proving a currently-valid code) -- only one of those flows
  // is ever active at a time, driven by whether totpSetupSecret is set.
  var totpDisableCodeInput by mutableStateOf("")
    private set
  var totpError by mutableStateOf<String?>(null)
    private set
  var totpBusy by mutableStateOf(false)
    private set

  // Set when mobileAuth() reports totpRequired instead of signing straight
  // in -- carries the short-lived id the backend staged the verified Google
  // identity under, so submitLoginTotpCode() knows what it's confirming.
  var pendingLoginTotpId by mutableStateOf<String?>(null)
    private set
  var loginTotpCodeInput by mutableStateOf("")
    private set
  var loginTotpError by mutableStateOf<String?>(null)
    private set
  var loginTotpBusy by mutableStateOf(false)
    private set

  // App Lock -- a device-local PIN gate, independent of the signed-in
  // account (see TokenStore.setAppLock). appLockGateActive is what
  // actually blocks the app: true means MainActivity renders the PIN
  // gate instead of the normal screen, regardless of what `screen` is.
  var appLockEnabled by mutableStateOf(tokenStore.getAppLockEnabled())
    private set
  var appLockGateActive by mutableStateOf(false)
    private set
  var appLockSetupStep by mutableStateOf("enter")
    private set
  var appLockPinInput by mutableStateOf("")
    private set
  private var appLockFirstEnteredPin: String? = null
  var appLockDisableInput by mutableStateOf("")
    private set
  var appLockError by mutableStateOf<String?>(null)
    private set
  var appLockGateInput by mutableStateOf("")
    private set
  var appLockGateError by mutableStateOf<String?>(null)
    private set

  // Passkeys -- WebAuthn credentials registered against this account (see
  // Security > Passkeys). The actual create/get ceremonies need an
  // Activity (see MainActivity.startPasskeyRegistration/startPasskeySignIn),
  // so this state is written to from there via the setPasskey*/on Passkey*
  // functions below rather than driving the ceremony itself.
  var passkeys by mutableStateOf<List<PasskeyInfo>>(emptyList())
    private set
  var passkeysLoading by mutableStateOf(false)
    private set
  var passkeyRegisterBusy by mutableStateOf(false)
    private set
  var passkeyError by mutableStateOf<String?>(null)
    private set

  init {
    if (tokenStore.getToken() != null) {
      userId = tokenStore.getUserId()
      userName = tokenStore.getUserName()
      userEmail = tokenStore.getUserEmail()
      userImage = tokenStore.getUserImage()
      userPhone = tokenStore.getUserPhone()
      screen = AppScreen.Chat
      // Cold start with App Lock on -- gate immediately, same as returning
      // from the background (see armAppLockIfEnabled).
      appLockGateActive = appLockEnabled
      loadHistory()
      loadProfile()
      loadDigitalTwin()
      loadSettings()
      loadProjects()
      loadScheduled()
      loadSubaccounts()
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
          bioInput = result.value.profile.bio
          displayNameInput = result.value.profile.displayName
          val nameParts = (result.value.profile.fullName ?: "").trim().split(" ", limit = 2)
          firstNameInput = nameParts.getOrElse(0) { "" }
          lastNameInput = nameParts.getOrElse(1) { "" }
          birthYearInput = result.value.profile.birthDate ?: ""
        }
        is ApiResult.Failure -> {} // Account screen just shows blank fields; not worth surfacing.
      }
    }
  }

  // Remembers wherever Account was opened from (Chat, the Profile Hub,
  // etc.) instead of hardcoding Chat, so closing it returns to the
  // actual screen the user came from rather than always landing on Chat.
  private var accountReturnScreen: AppScreen = AppScreen.Chat

  fun openAccount() {
    accountReturnScreen = screen
    screen = AppScreen.ProfileHub
  }

  fun closeAccount() {
    screen = accountReturnScreen
  }

  // Reachable both directly from Chat's "Customize GiZa" quick action and
  // from Settings (via leaveAccountTabsFor) -- remembers which, instead of
  // hardcoding Profile Hub, so closing from the Chat path doesn't strand
  // the user on Profile Hub instead of back on Chat.
  private var customizeReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openCustomize() {
    customizeReturnScreen = screen
    screen = AppScreen.Customize
  }

  fun closeCustomize() {
    returnToAccountTabsIfPending()
    screen = customizeReturnScreen
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

  // Remembers wherever EditProfile was opened from (Account, the
  // Profile Hub's Account tabs sheet) instead of hardcoding Account.
  private var editProfileReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openEditProfile() {
    editProfileReturnScreen = screen
    screen = AppScreen.EditProfile
  }

  fun closeEditProfile() {
    screen = editProfileReturnScreen
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
          screen = AppScreen.ProfileHub
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
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openVoice() {
    screen = AppScreen.Voice
  }

  fun closeVoice() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
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

  /** Same as [fetchPremiumSpeech] but for previewing a specific voice in
   * the picker -- doesn't touch selectedVoiceId, so tapping a card to hear
   * it doesn't change what's actually selected. */
  fun fetchVoicePreview(voice: String, text: String, onResult: (ByteArray?) -> Unit) {
    val token = tokenStore.getToken()
    if (token == null) {
      onResult(null)
      return
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSpeechAudio(token, text, voice)) {
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

  // Remembers wherever Report a Problem was opened from (Settings, the
  // Profile Hub's About Us sheet) instead of hardcoding Account, so
  // closing it returns to the actual screen the user came from.
  private var reportProblemReturnScreen: AppScreen = AppScreen.ProfileHub
  // About Us is a dialog overlay (showAboutUs), not part of `screen` --
  // it used to be closed manually before navigating here, which lost
  // track of it entirely, so closing Report a Problem always landed on
  // the bare screen behind it instead of reopening About Us. This
  // remembers whether it needs to come back.
  private var reportProblemReturnToAboutUs = false

  fun openReportProblem() {
    reportProblemReturnScreen = screen
    reportProblemReturnToAboutUs = showAboutUs
    showAboutUs = false
    screen = AppScreen.ReportProblem
  }

  fun closeReportProblem() {
    // Always restore the underlying screen first -- ReportProblem is a
    // full AppScreen entry, so leaving `screen` pointed at it while
    // reopening About Us on top (a separate Dialog window) would render
    // both at once instead of About Us alone.
    screen = reportProblemReturnScreen
    if (reportProblemReturnToAboutUs) {
      reportProblemReturnToAboutUs = false
      showAboutUs = true
    }
  }

  fun openWidgets() {
    screen = AppScreen.Widgets
  }

  fun closeWidgets() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openOpenSourceLicenses() {
    screen = AppScreen.OpenSourceLicenses
  }

  fun closeOpenSourceLicenses() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openKidsMode() {
    screen = AppScreen.KidsMode
  }

  fun closeKidsMode() {
    screen = AppScreen.ProfileHub
  }

  fun openSharedConversations() {
    screen = AppScreen.SharedConversations
  }

  fun closeSharedConversations() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  // Idea #7: a shared AI chat session multiple people can join with a
  // short code. Polling-based (see collabPollJob below) -- no push/
  // WebSocket infra exists in this project -- but genuinely
  // multi-person: every participant's app fetches the same session and
  // sees everyone's messages, not just their own.
  var collabSession by mutableStateOf<CollabSession?>(null)
    private set
  var collabInput by mutableStateOf("")
  var collabSending by mutableStateOf(false)
    private set
  var collabJoinCodeInput by mutableStateOf("")
  var collabError by mutableStateOf<String?>(null)
    private set
  private var collabPollJob: Job? = null

  fun onCollabInputChange(value: String) {
    collabInput = value
  }

  fun onCollabJoinCodeChange(value: String) {
    collabJoinCodeInput = value.uppercase().filter { it.isLetterOrDigit() }.take(6)
  }

  private fun startCollabPolling(code: String) {
    collabPollJob?.cancel()
    collabPollJob = viewModelScope.launch {
      while (true) {
        delay(3000)
        val token = tokenStore.getToken() ?: break
        when (val result = ChatGizaApi.getCollabSession(token, code)) {
          is ApiResult.Success -> collabSession = result.value
          is ApiResult.Failure -> {}
        }
      }
    }
  }

  fun startCollabSession() {
    val token = tokenStore.getToken() ?: return
    val name = userName?.takeIf { it.isNotBlank() } ?: "Someone"
    collabError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.createCollabSession(token, name)) {
        is ApiResult.Success -> {
          collabSession = result.value
          screen = AppScreen.CollabChat
          startCollabPolling(result.value.code)
        }
        is ApiResult.Failure -> collabError = result.message
      }
    }
  }

  fun joinCollabSession() {
    val token = tokenStore.getToken() ?: return
    val code = collabJoinCodeInput.trim()
    if (code.length < 4) return
    val name = userName?.takeIf { it.isNotBlank() } ?: "Someone"
    collabError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.joinCollabSession(token, code, name)) {
        is ApiResult.Success -> {
          collabSession = result.value
          collabJoinCodeInput = ""
          screen = AppScreen.CollabChat
          startCollabPolling(result.value.code)
        }
        is ApiResult.Failure -> collabError = result.message
      }
    }
  }

  fun sendCollabMessage() {
    val token = tokenStore.getToken() ?: return
    val code = collabSession?.code ?: return
    val text = collabInput.trim()
    if (text.isEmpty() || collabSending) return
    val name = userName?.takeIf { it.isNotBlank() } ?: "Someone"
    collabInput = ""
    collabSending = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.postCollabMessage(token, code, text, name)) {
        is ApiResult.Success -> collabSession = result.value
        is ApiResult.Failure -> collabError = result.message
      }
      collabSending = false
    }
  }

  fun closeCollabChat() {
    collabPollJob?.cancel()
    collabPollJob = null
    collabSession = null
    screen = AppScreen.SharedConversations
  }

  // "Join Our Community" -- one global chat room shared by every ChatGiZa
  // user (not per-code like collab above). Same polling pattern.
  var communityMessages by mutableStateOf<List<CommunityMessage>>(emptyList())
    private set
  var communityInput by mutableStateOf("")
  var communitySending by mutableStateOf(false)
    private set
  var communityError by mutableStateOf<String?>(null)
    private set
  private var communityPollJob: Job? = null

  fun onCommunityInputChange(value: String) {
    communityInput = value
  }

  private fun startCommunityPolling() {
    communityPollJob?.cancel()
    communityPollJob = viewModelScope.launch {
      while (true) {
        val token = tokenStore.getToken() ?: break
        when (val result = ChatGizaApi.getCommunityMessages(token)) {
          is ApiResult.Success -> communityMessages = result.value
          is ApiResult.Failure -> {}
        }
        delay(3000)
      }
    }
  }

  fun openCommunity() {
    screen = AppScreen.Community
    communityError = null
    val token = tokenStore.getToken()
    if (token != null) {
      viewModelScope.launch {
        when (val result = ChatGizaApi.getCommunityMessages(token)) {
          is ApiResult.Success -> communityMessages = result.value
          is ApiResult.Failure -> communityError = result.message
        }
      }
    }
    startCommunityPolling()
  }

  fun closeCommunity() {
    communityPollJob?.cancel()
    communityPollJob = null
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun sendCommunityMessage() {
    val token = tokenStore.getToken() ?: return
    val text = communityInput.trim()
    if (text.isEmpty() || communitySending) return
    val name = userName?.takeIf { it.isNotBlank() } ?: "Someone"
    communityInput = ""
    communitySending = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.postCommunityMessage(token, text, name)) {
        is ApiResult.Success -> communityMessages = result.value
        is ApiResult.Failure -> communityError = result.message
      }
      communitySending = false
    }
  }

  // Real Security > Trusted Devices list -- previously a "coming soon"
  // placeholder. Backed by the same sessions.ts sign-in log used by the
  // web Security tab, extended with IP/location and mobile sign-ins.
  var trustedDevices by mutableStateOf<List<DeviceSession>>(emptyList())
    private set
  var trustedDevicesLoading by mutableStateOf(false)
    private set
  var trustedDevicesCurrentId by mutableStateOf<String?>(null)
    private set
  var trustedDevicesError by mutableStateOf<String?>(null)
    private set
  private var revokingDeviceId by mutableStateOf<String?>(null)

  fun isRevokingDevice(id: String) = revokingDeviceId == id

  fun openTrustedDevices() {
    screen = AppScreen.TrustedDevices
    loadTrustedDevices()
  }

  fun closeTrustedDevices() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun loadTrustedDevices() {
    val token = tokenStore.getToken() ?: return
    trustedDevicesLoading = true
    trustedDevicesError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSessions(token)) {
        is ApiResult.Success -> {
          trustedDevices = result.value.sessions
          trustedDevicesCurrentId = result.value.currentSessionId
        }
        is ApiResult.Failure -> trustedDevicesError = result.message
      }
      trustedDevicesLoading = false
    }
  }

  fun revokeTrustedDevice(id: String) {
    val token = tokenStore.getToken() ?: return
    revokingDeviceId = id
    viewModelScope.launch {
      when (val result = ChatGizaApi.revokeSession(token, id)) {
        is ApiResult.Success -> trustedDevices = trustedDevices.filter { it.id != id }
        is ApiResult.Failure -> trustedDevicesError = result.message
      }
      revokingDeviceId = null
    }
  }

  fun openNsfwPreferences() {
    screen = AppScreen.NsfwPreferences
  }

  fun closeNsfwPreferences() {
    screen = AppScreen.ProfileHub
  }

  fun openConnectors() {
    screen = AppScreen.Connectors
  }

  fun closeConnectors() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  // Real OAuth connectors (see ChatGizaApi.getConnectors/startConnectorAuth
  // and src/lib/connectors.ts). `startConnector`'s onUrl callback is used
  // by the composable to open the provider's real authorize page in an
  // external browser tab -- the ViewModel doesn't launch Intents itself.
  var connectors by mutableStateOf<List<ConnectorInfo>>(emptyList())
    private set
  var loadingConnectors by mutableStateOf(false)
    private set
  var connectorsError by mutableStateOf<String?>(null)
    private set
  private var connectorBusy by mutableStateOf<String?>(null)

  fun isConnectorBusy(id: String) = connectorBusy == id

  fun loadConnectors() {
    val token = tokenStore.getToken() ?: return
    loadingConnectors = true
    connectorsError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.getConnectors(token)) {
        is ApiResult.Success -> connectors = result.value
        is ApiResult.Failure -> connectorsError = result.message
      }
      loadingConnectors = false
    }
  }

  fun startConnector(service: String, onUrl: (String) -> Unit) {
    val token = tokenStore.getToken() ?: return
    connectorBusy = service
    viewModelScope.launch {
      when (val result = ChatGizaApi.startConnectorAuth(token, service)) {
        is ApiResult.Success -> onUrl(result.value)
        is ApiResult.Failure -> connectorsError = result.message
      }
      connectorBusy = null
    }
  }

  fun disconnectConnectorService(service: String) {
    val token = tokenStore.getToken() ?: return
    connectorBusy = service
    viewModelScope.launch {
      when (val result = ChatGizaApi.disconnectConnector(token, service)) {
        is ApiResult.Success -> connectors = connectors.map { if (it.id == service) it.copy(connected = false) else it }
        is ApiResult.Failure -> connectorsError = result.message
      }
      connectorBusy = null
    }
  }

  fun openMediaProfile() {
    screen = AppScreen.Profile
  }

  fun closeMediaProfile() {
    screen = AppScreen.ProfileHub
  }

  // The account-hub screen opened by tapping the avatar at the top of
  // History -- a static shell for now (VIP-style card, quick links,
  // trending row) matching a reference layout the user provided; none of
  // it goes deeper than this screen yet, that's deliberately a later pass.
  fun openProfileHub() {
    screen = AppScreen.ProfileHub
  }

  fun closeProfileHub() {
    screen = AppScreen.History
  }

  fun openHaptics() {
    screen = AppScreen.Haptics
  }

  fun closeHaptics() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
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

  // "plus_jakarta_sans" | "manrope" | "system" -- see ChatGizaTypography in
  // MainActivity.kt for what each resolves to.
  var fontChoice by mutableStateOf(tokenStore.getFontChoice())
    private set

  fun updateFontChoice(value: String) {
    fontChoice = value
    tokenStore.setFontChoice(value)
  }

  fun openFontChoice() {
    screen = AppScreen.FontChoice
  }

  fun closeFontChoice() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
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

  fun pushReplyToExtraMedia(content: String, destination: String, onDone: (Boolean) -> Unit) {
    if (content.isBlank()) return onDone(false)
    createMediaPost(content, emptyList(), null, null, null, destination, onDone)
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

  var extraDarkMode by mutableStateOf(tokenStore.getExtraDarkMode())
    private set

  fun updateExtraDarkMode(value: Boolean) {
    extraDarkMode = value
    tokenStore.setExtraDarkMode(value)
  }

  fun updateHapticsOnPress(value: Boolean) {
    hapticsOnPress = value
    tokenStore.setHapticsOnPress(value)
  }

  fun updateHapticsOnResponse(value: Boolean) {
    hapticsOnResponse = value
    tokenStore.setHapticsOnResponse(value)
  }

  // A locally-picked preset avatar, overriding the Google-account photo
  // wherever the app shows an avatar (the couple of screens that check
  // this id directly). [emoji], when given, is also pushed to the real
  // account avatar (users.image via /api/profile/avatar) as its Twemoji
  // image, so the choice shows up everywhere userImage is read too --
  // ChatGiZa Media posts/profile included -- not just those screens.
  var avatarPresetId by mutableStateOf(tokenStore.getAvatarPresetId())
    private set

  fun updateAvatarPreset(id: String?, emoji: String? = null) {
    avatarPresetId = id
    tokenStore.setAvatarPresetId(id)
    if (emoji == null) return
    val token = tokenStore.getToken() ?: return
    val imageUrl = emojiToTwemojiUrl(emoji)
    viewModelScope.launch {
      when (ChatGizaApi.updateAvatar(token, imageUrl)) {
        is ApiResult.Success -> {
          userImage = imageUrl
          tokenStore.setUserImage(imageUrl)
        }
        is ApiResult.Failure -> {}
      }
    }
  }

  // Renames the real account (users.name), read everywhere userName is --
  // the persistent Account header, ChatGiZa Media posts/profile, etc. --
  // not just a device-local label.
  var nameUpdateError by mutableStateOf<String?>(null)
    private set

  fun updateUserName(name: String) {
    val trimmed = name.trim()
    if (trimmed.isBlank()) return
    val token = tokenStore.getToken() ?: return
    nameUpdateError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.updateName(token, trimmed)) {
        is ApiResult.Success -> {
          userName = trimmed
          tokenStore.setUserName(trimmed)
        }
        is ApiResult.Failure -> nameUpdateError = result.message
      }
    }
  }

  // Full-screen Nickname editor (Profile Hub > My info > Nickname), same
  // screen shape as Mobile/Change Email -- back arrow + centered title, one
  // boxed field, a bottom Save button -- instead of the small AlertDialog
  // this used to be.
  var accountNicknameInput by mutableStateOf("")
    private set
  var nicknameUpdateBusy by mutableStateOf(false)
    private set

  fun openNickname() {
    screen = AppScreen.Nickname
    accountNicknameInput = userName.orEmpty()
    nameUpdateError = null
  }

  fun closeNickname() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun onNicknameInputChange(value: String) {
    if (value.length <= 30) accountNicknameInput = value
    nameUpdateError = null
  }

  fun submitNickname() {
    val trimmed = accountNicknameInput.trim()
    if (trimmed.isBlank()) return
    val token = tokenStore.getToken() ?: return
    nicknameUpdateBusy = true
    nameUpdateError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.updateName(token, trimmed)) {
        is ApiResult.Success -> {
          userName = trimmed
          tokenStore.setUserName(trimmed)
          nicknameUpdateBusy = false
          closeNickname()
        }
        is ApiResult.Failure -> {
          nicknameUpdateBusy = false
          nameUpdateError = result.message
        }
      }
    }
  }

  // Security > Mobile. No SMS provider is wired up, so this is a plain
  // self-reported contact number (same trust level as the in-app
  // password) -- not an OTP-verified line, hence no separate "code" step
  // the way Change Password has one.
  var phoneInput by mutableStateOf("")
    private set
  var phoneCountry by mutableStateOf(DEFAULT_COUNTRY_DIAL_CODE)
    private set
  var phoneCountryPickerOpen by mutableStateOf(false)
    private set
  var phoneError by mutableStateOf<String?>(null)
    private set
  var phoneUpdateBusy by mutableStateOf(false)
    private set

  fun openMobileNumber() {
    screen = AppScreen.MobileNumber
    phoneError = null
    // Split whatever's already saved back into country + local number so
    // re-opening the screen doesn't show the full "+255712345678" string
    // jammed into the plain number field.
    val saved = userPhone.orEmpty()
    val matched = matchCountryByDialCode(saved)
    if (matched != null) {
      phoneCountry = matched
      phoneInput = saved.removePrefix(matched.dialCode).trim()
    } else {
      phoneCountry = DEFAULT_COUNTRY_DIAL_CODE
      phoneInput = saved
    }
  }

  fun closeMobileNumber() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openCountryPicker() {
    phoneCountryPickerOpen = true
  }

  fun closeCountryPicker() {
    phoneCountryPickerOpen = false
  }

  fun selectCountry(country: CountryDialCode) {
    phoneCountry = country
    phoneCountryPickerOpen = false
  }

  fun onPhoneInputChange(value: String) {
    // Typing/pasting a number that already starts with a recognized dial
    // code (e.g. "+254712345678") auto-detects and switches the selected
    // country instead of leaving it jammed onto the front of the local
    // number field.
    val matched = matchCountryByDialCode(value)
    if (matched != null) {
      phoneCountry = matched
      phoneInput = value.removePrefix(matched.dialCode).trim()
    } else {
      phoneInput = value
    }
    phoneError = null
  }

  fun submitPhoneNumber() {
    val trimmed = phoneInput.trim().trimStart('0')
    if (trimmed.isEmpty()) {
      phoneError = "Enter a phone number"
      return
    }
    val fullNumber = "${phoneCountry.dialCode}$trimmed"
    val token = tokenStore.getToken() ?: return
    phoneUpdateBusy = true
    phoneError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.updatePhone(token, fullNumber)) {
        is ApiResult.Success -> {
          userPhone = fullNumber
          tokenStore.setUserPhone(fullNumber)
          phoneUpdateBusy = false
          closeMobileNumber()
        }
        is ApiResult.Failure -> {
          phoneUpdateBusy = false
          phoneError = result.message
        }
      }
    }
  }

  // Security > Email. Same trust level as Mobile/the in-app password --
  // no confirmation email is sent (no separate email-sending pipeline
  // beyond the TOTP/passkey ones this account already has), it just
  // updates the address ChatGiZa has on file.
  var emailInput by mutableStateOf("")
    private set
  var emailError by mutableStateOf<String?>(null)
    private set
  var emailUpdateBusy by mutableStateOf(false)
    private set

  fun openChangeEmail() {
    screen = AppScreen.ChangeEmail
    emailInput = userEmail.orEmpty()
    emailError = null
  }

  fun closeChangeEmail() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun onEmailInputChange(value: String) {
    emailInput = value
    emailError = null
  }

  fun submitEmail() {
    val trimmed = emailInput.trim()
    if (trimmed.isEmpty() || !trimmed.contains("@")) {
      emailError = "Enter a valid email address"
      return
    }
    val token = tokenStore.getToken() ?: return
    emailUpdateBusy = true
    emailError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.updateEmail(token, trimmed)) {
        is ApiResult.Success -> {
          userEmail = trimmed
          tokenStore.setUserEmail(trimmed)
          emailUpdateBusy = false
          closeChangeEmail()
        }
        is ApiResult.Failure -> {
          emailUpdateBusy = false
          emailError = result.message
        }
      }
    }
  }

  var emailUnlinkBusy by mutableStateOf(false)
    private set
  var emailUnlinkError by mutableStateOf<String?>(null)
    private set

  // Real, not just a UI toggle -- clears users.email server-side. Safe
  // because sign-in doesn't depend on it (the account's real identity is
  // the Google sub, not this address); the one thing that stops working is
  // signing in with email+password until an email is set again, which the
  // confirmation dialog before this is called warns about.
  fun unlinkEmail() {
    val token = tokenStore.getToken() ?: return
    emailUnlinkBusy = true
    emailUnlinkError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.unlinkEmail(token)) {
        is ApiResult.Success -> {
          userEmail = null
          tokenStore.setUserEmail("")
          emailUnlinkBusy = false
        }
        is ApiResult.Failure -> {
          emailUnlinkBusy = false
          emailUnlinkError = result.message
        }
      }
    }
  }

  // A custom name for the chosen avatar, shown as a small label over it
  // wherever it renders.
  var avatarName by mutableStateOf(tokenStore.getAvatarName())
    private set

  fun updateAvatarName(name: String?) {
    avatarName = name
    tokenStore.setAvatarName(name)
  }

  var showAvatarPicker by mutableStateOf(false)
    private set

  fun openAvatarPicker() {
    showAvatarPicker = true
  }

  fun closeAvatarPicker() {
    returnToAccountTabsIfPending()
    showAvatarPicker = false
  }

  var showAboutUs by mutableStateOf(false)
    private set

  fun openAboutUs() {
    showAboutUs = true
  }

  fun closeAboutUs() {
    returnToAccountTabsIfPending()
    showAboutUs = false
  }

  var showAccountTabs by mutableStateOf(false)
    private set

  // Which of the 4 tabs (My info/Security/Preference/General) is showing --
  // held here, not as remember{} inside AccountTabsDialog, because that
  // composable is fully removed from composition every time the dialog
  // closes (leaveAccountTabsFor to open Color Theme, etc.) and re-added
  // when it reopens, which reset a remember{} back to "My info" every
  // time, undoing whichever tab the user had actually been on.
  var activeAccountTab by mutableStateOf("My info")

  fun openAccountTabs() {
    showAccountTabs = true
  }

  fun closeAccountTabs() {
    showAccountTabs = false
  }

  // Screens like Color Theme/App Language/Data Controls close this dialog
  // first (see comments on the rows that call this) then navigate away --
  // without remembering that, closing THAT screen just landed on a bare
  // Profile Hub instead of back where the user actually was, looking like
  // the app "went back to the beginning". Each of those screens' close
  // functions calls returnToAccountTabsIfPending() to reopen the dialog
  // instead, only when it was actually left via this path.
  private var accountTabsReturnPending = false

  fun leaveAccountTabsFor(open: () -> Unit) {
    accountTabsReturnPending = true
    // screen changes first, then the dialog closes -- closing it first left
    // a brief window where showAccountTabs was already false but screen
    // hadn't moved off AppScreen.ProfileHub yet, flashing Profile Hub (with
    // its "Enter GiZa Max" banner) underneath the dialog as it dismissed,
    // on every single row tap.
    //
    // open() alone still isn't enough: the screen router (AnimatedContent)
    // needs at least one recomposition/frame to actually swap its rendered
    // content over to the new screen, even with the transition itself
    // skipped. Closing the dialog in the very same synchronous call raced
    // that -- it could disappear a frame before the new screen had actually
    // taken over underneath, showing ProfileHub for that one frame. A short
    // delay here (imperceptible, well under what a tap-to-navigate already
    // feels like) guarantees the new screen has already rendered by the
    // time the dialog goes away, instead of depending on both happening to
    // land in the same frame.
    open()
    viewModelScope.launch {
      delay(80)
      closeAccountTabs()
    }
  }

  private fun returnToAccountTabsIfPending() {
    if (accountTabsReturnPending) {
      accountTabsReturnPending = false
      showAccountTabs = true
    }
  }

  // Reached from Data Dashboard's "Data controls & delete account" row, not
  // Profile Hub -- hardcoding Profile Hub here always sent the user past
  // Data Dashboard instead of back to it.
  private var dataControlsReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openDataControls() {
    dataControlsReturnScreen = screen
    screen = AppScreen.DataControls
  }

  fun closeDataControls() {
    returnToAccountTabsIfPending()
    screen = dataControlsReturnScreen
  }

  // Real on-device cache/storage breakdown -- what "Storage management" in
  // Settings > General used to (wrongly) link to DataControlsScreen's
  // privacy toggles for. DataControlsScreen itself is unchanged and still
  // reachable from Data Dashboard's "Data controls & delete account" row.
  fun openStorageManagement() {
    screen = AppScreen.StorageManagement
  }

  fun closeStorageManagement() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openDataDashboard() {
    screen = AppScreen.DataDashboard
  }

  fun closeDataDashboard() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openAccountSettings() {
    screen = AppScreen.AccountSettings
  }

  fun closeAccountSettings() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun openSwitchAccount() {
    screen = AppScreen.SwitchAccount
  }

  fun closeSwitchAccount() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
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

  fun onBioChange(value: String) {
    bioInput = value
  }

  fun onDisplayNameChange(value: String) {
    displayNameInput = value
  }

  private fun persistProfile(updated: ProfileData) {
    profileData = updated
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch { ChatGizaApi.saveProfile(token, updated) }
  }

  fun setMemoryEnabled(value: Boolean) = persistProfile(profileData.copy(memoryEnabled = value))

  // Suggestions the AI thinks are worth remembering long-term, pulled
  // from the conversation in the background -- shown to the user to
  // accept/dismiss, never saved automatically. Checked every few
  // exchanges (not per message; an extra model call on every single
  // reply isn't worth the cost/latency), and only when nothing is
  // already pending so suggestions don't pile up.
  var memorySuggestions by mutableStateOf<List<String>>(emptyList())
    private set
  private var lastMemoryCheckMessageCount = 0

  private fun maybeCheckForMemorySuggestions() {
    if (!profileData.memoryEnabled) return
    if (memorySuggestions.isNotEmpty()) return
    val count = messages.size
    if (count < 6 || count - lastMemoryCheckMessageCount < 6) return
    lastMemoryCheckMessageCount = count
    val token = tokenStore.getToken() ?: return
    val snapshot = messages.map { ChatMessage(it.role, it.content) }
    val existing = profileData.memory
    viewModelScope.launch {
      when (val result = ChatGizaApi.suggestMemory(token, snapshot, existing)) {
        is ApiResult.Success -> {
          val fresh = result.value.filter { it.isNotBlank() && it !in existing }
          if (fresh.isNotEmpty()) memorySuggestions = fresh
        }
        is ApiResult.Failure -> {}
      }
    }
  }

  // A lightweight (title, opening-message snippet) index of the user's
  // other saved conversations -- not full content, just enough for the
  // model to answer "how many chats do I have" or reference past
  // topics by name. Excludes whichever conversation is currently being
  // sent to, so it isn't listed as its own "other" conversation.
  private fun buildHistoryIndex(excludeConversationId: String?): List<Pair<String, String>> {
    return conversations
      .filter { it.id != excludeConversationId }
      .take(40)
      .map { convo ->
        val opening = convo.messages.firstOrNull { it.role == "user" }?.content.orEmpty()
        convo.title to opening.take(120)
      }
  }

  // Idea #6: if this new message references a pair ID (e.g. "Q-4F2A19"),
  // find that exact question+answer -- checked against every saved
  // conversation, not just the open one, and against the live in-memory
  // messages too in case the pair hasn't been saved yet -- and hand it to
  // the model as real, exact context instead of leaving it to guess.
  private fun findReferencedPair(text: String): Pair<String, String>? {
    val match = Regex("Q-[A-Za-z0-9]{6}").find(text) ?: return null
    val targetId = match.value.uppercase()
    val liveQuestion = messages.firstOrNull { it.pairId.equals(targetId, ignoreCase = true) && it.role == "user" }
    val liveAnswer = messages.firstOrNull { it.pairId.equals(targetId, ignoreCase = true) && it.role == "assistant" }
    if (liveQuestion != null && liveAnswer != null) return liveQuestion.content to liveAnswer.content
    for (convo in conversations) {
      val question = convo.messages.firstOrNull { it.pairId.equals(targetId, ignoreCase = true) && it.role == "user" }
      val answer = convo.messages.firstOrNull { it.pairId.equals(targetId, ignoreCase = true) && it.role == "assistant" }
      if (question != null && answer != null) return question.content to answer.content
    }
    return null
  }

  fun acceptMemorySuggestion(text: String) {
    memorySuggestions = memorySuggestions.filter { it != text }
    if (text !in profileData.memory) {
      persistProfile(profileData.copy(memory = profileData.memory + text))
    }
  }

  fun dismissMemorySuggestion(text: String) {
    memorySuggestions = memorySuggestions.filter { it != text }
  }

  fun setAppLanguage(value: String) = persistProfile(profileData.copy(language = value))

  // Remembers wherever AppLanguage was opened from (Settings, the
  // Profile Hub's trending row) instead of hardcoding Account.
  private var appLanguageReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openAppLanguage() {
    appLanguageReturnScreen = screen
    screen = AppScreen.AppLanguage
  }

  fun closeAppLanguage() {
    returnToAccountTabsIfPending()
    screen = appLanguageReturnScreen
  }

  fun openAdvanced() {
    screen = AppScreen.Advanced
  }

  fun closeAdvanced() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  var pasteAsFileMode by mutableStateOf(tokenStore.getPasteAsFileMode())
    private set

  fun updatePasteAsFileMode(value: String) {
    pasteAsFileMode = value
    tokenStore.setPasteAsFileMode(value)
  }

  var personalizeChatGizaEnabled by mutableStateOf(tokenStore.getPersonalizeChatGiza())
    private set

  fun setPersonalizeChatGiza(value: Boolean) {
    personalizeChatGizaEnabled = value
    tokenStore.setPersonalizeChatGiza(value)
  }

  var chatLinkSharingEnabled by mutableStateOf(tokenStore.getChatLinkSharing())
    private set

  fun setChatLinkSharing(value: Boolean) {
    chatLinkSharingEnabled = value
    tokenStore.setChatLinkSharing(value)
  }

  // Named update*/not set* -- a same-named fun collides with the
  // auto-generated property setter's JVM signature and fails the build
  // (bit this exact session twice already for other prefs).
  var kidsModeEnabled by mutableStateOf(tokenStore.getKidsModeEnabled())
    private set

  fun updateKidsModeEnabled(value: Boolean) {
    kidsModeEnabled = value
    tokenStore.setKidsModeEnabled(value)
  }

  var blurMatureContentEnabled by mutableStateOf(tokenStore.getBlurMatureContentEnabled())
    private set

  fun updateBlurMatureContentEnabled(value: Boolean) {
    blurMatureContentEnabled = value
    tokenStore.setBlurMatureContentEnabled(value)
  }

  fun saveProfile() {
    val token = tokenStore.getToken() ?: return
    savingProfile = true
    val updated = profileData.copy(profile = profileData.profile.copy(nickname = nicknameInput, about = aboutInput, bio = bioInput, displayName = displayNameInput))
    viewModelScope.launch {
      when (val result = ChatGizaApi.saveProfile(token, updated)) {
        is ApiResult.Success -> {
          profileData = updated
          savingProfile = false
          screen = AppScreen.ProfileHub
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          savingProfile = false
        }
      }
    }
  }

  fun loadDigitalTwin() {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getTwin(token)) {
        is ApiResult.Success -> {
          digitalTwin = result.value.summary
          digitalTwinInput = result.value.summary
          digitalTwinUpdatedAt = result.value.updatedAt
        }
        is ApiResult.Failure -> {} // Settings just shows blank; not worth surfacing.
      }
    }
  }

  fun onDigitalTwinInputChange(value: String) {
    digitalTwinInput = value
  }

  fun saveDigitalTwin() {
    val token = tokenStore.getToken() ?: return
    savingDigitalTwin = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.saveTwin(token, digitalTwinInput)) {
        is ApiResult.Success -> {
          digitalTwin = result.value.summary
          digitalTwinUpdatedAt = result.value.updatedAt
          savingDigitalTwin = false
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          savingDigitalTwin = false
        }
      }
    }
  }

  // Samples recent turns across the user's own saved conversations (not
  // just whichever is open) so the profile reflects how they generally
  // write/decide, not just today's chat.
  fun regenerateDigitalTwin() {
    val token = tokenStore.getToken() ?: return
    if (digitalTwinRegenerating) return
    digitalTwinRegenerating = true
    val sample = conversations
      .take(8)
      .flatMap { it.messages.takeLast(10) }
      .takeLast(60)
      .map { ChatMessage(it.role, it.content) }
    viewModelScope.launch {
      when (val result = ChatGizaApi.synthesizeTwin(token, sample, digitalTwinInput)) {
        is ApiResult.Success -> {
          digitalTwinInput = result.value
          when (val saveResult = ChatGizaApi.saveTwin(token, result.value)) {
            is ApiResult.Success -> {
              digitalTwin = saveResult.value.summary
              digitalTwinUpdatedAt = saveResult.value.updatedAt
            }
            is ApiResult.Failure -> {}
          }
          digitalTwinRegenerating = false
        }
        is ApiResult.Failure -> {
          errorMessage = result.message
          digitalTwinRegenerating = false
        }
      }
    }
  }

  fun loadSettings() {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSettings(token)) {
        is ApiResult.Success -> settingsData = result.value
        is ApiResult.Failure -> errorMessage = result.message
      }
    }
  }

  // Settings (Preferences) is reachable from more than one place — History's
  // gear icon and Live Vision's in-call gear — so unlike the other
  // open*/close* pairs it remembers where it was opened from instead of
  // hardcoding Account. Without this, opening it mid-call and closing it
  // would strand the user on Account instead of resuming Live Vision.
  private var settingsReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openSettings() {
    settingsReturnScreen = screen
    screen = AppScreen.Settings
  }

  fun closeSettings() {
    screen = settingsReturnScreen
  }

  // Sideloaded (not Play Store), so nothing updates this app on its own --
  // the Settings footer calls this once to silently check the same public
  // GitHub Release the CI pipeline publishes, and only shows an "Update"
  // link if it's actually ahead of this install's own versionCode.
  var latestVersionInfo by mutableStateOf<LatestVersionInfo?>(null)
    private set

  fun checkForUpdate() {
    viewModelScope.launch {
      when (val result = ChatGizaApi.checkLatestVersion()) {
        is ApiResult.Success -> latestVersionInfo = result.value
        is ApiResult.Failure -> {}
      }
    }
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
      "digital_twin" -> p.copy(digitalTwin = !p.digitalTwin)
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
    screen = AppScreen.ProfileHub
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

  // Reachable both from Chat's Events card and from Settings (via
  // leaveAccountTabsFor) -- remembers which, instead of hardcoding
  // Profile Hub, so closing from the Chat path returns to Chat.
  private var scheduledReturnScreen: AppScreen = AppScreen.ProfileHub

  fun openScheduled() {
    scheduledReturnScreen = screen
    screen = AppScreen.Scheduled
    // The background worker can mark reminders fired while this screen was
    // never open -- refresh so what's shown here matches the server instead
    // of whatever was last loaded at sign-in.
    loadScheduled()
  }

  fun closeScheduled() {
    returnToAccountTabsIfPending()
    screen = scheduledReturnScreen
  }

  // Tapping "+" on a Tasks example (e.g. "Weekend ideas") sends its prompt
  // as a real chat message AND creates a real, pending Scheduled-tasks
  // entry -- the template itself disappears from "Get started" the
  // instant it's tapped (ScheduledScreen hides any template with a
  // pending or not-yet-due real task behind it), same as tapping it
  // being irreversible-in-the-moment. For tasks with a wizard, that entry
  // stays pending=true until the wizard is actually finished (closing or
  // skipping it leaves the task sitting in Pending, not silently
  // discarded); tasks with no wizard complete immediately since a single
  // tap is the whole action. Completing a recurring template
  // (recurrenceDays > 0) doesn't mark it fired forever -- it rolls runAt
  // forward that many days and clears fired, so the template reappears
  // in Get started once that date arrives instead of staying gone.
  var preferenceWizardStep by mutableStateOf(-1)
    private set
  var wizardTaskTitle by mutableStateOf<String?>(null)
    private set
  var wizardTaskId by mutableStateOf<String?>(null)
    private set
  var wizardSelections by mutableStateOf<List<Set<String>>>(emptyList())
    private set

  fun startTaskExample(taskTitle: String, description: String, hasWizard: Boolean, category: String, recurrenceDays: Int) {
    val token = tokenStore.getToken()
    val newTaskId = UUID.randomUUID().toString()
    if (token != null) {
      val entry = ApiScheduledTask(
        id = newTaskId,
        prompt = description,
        runAt = nowRunAtString(),
        fired = false,
        category = category,
        title = taskTitle,
        pending = true,
        recurrenceDays = recurrenceDays
      )
      viewModelScope.launch {
        val current = when (val result = ChatGizaApi.getScheduled(token)) {
          is ApiResult.Success -> result.value
          is ApiResult.Failure -> scheduledTasks
        }
        val updated = listOf(entry) + current
        scheduledTasks = updated
        ChatGizaApi.saveScheduled(token, updated)
      }
    }
    screen = AppScreen.Chat
    onInputChange(description)
    sendMessage()
    if (hasWizard) {
      wizardTaskTitle = taskTitle
      wizardTaskId = newTaskId
      wizardSelections = emptyList()
      preferenceWizardStep = 0
    } else {
      completeTemplateTask(newTaskId)
    }
  }

  fun toggleWizardOption(step: Int, option: String) {
    val updated = wizardSelections.toMutableList()
    while (updated.size <= step) updated.add(emptySet())
    val current = updated[step]
    updated[step] = if (option in current) current - option else current + option
    wizardSelections = updated
  }

  fun wizardBack() {
    if (preferenceWizardStep > 0) preferenceWizardStep--
  }

  fun wizardNext(lastStep: Int) {
    if (preferenceWizardStep < lastStep) preferenceWizardStep++ else finishPreferenceWizard()
  }

  // Closing/skipping without finishing deliberately does NOT complete the
  // task -- it's left pending=true (already set when it was created), so
  // the user finds it under the Pending filter instead of it vanishing.
  fun dismissPreferenceWizard() {
    preferenceWizardStep = -1
    wizardTaskTitle = null
    wizardTaskId = null
  }

  // "Continue" on a Pending row in Your tasks -- reopens the same wizard
  // for that specific task's own id, so finishing it completes THAT task
  // rather than creating a new one.
  fun resumeWizardForTask(task: ApiScheduledTask) {
    screen = AppScreen.Chat
    wizardTaskTitle = task.title
    wizardTaskId = task.id
    wizardSelections = emptyList()
    preferenceWizardStep = 0
  }

  private fun finishPreferenceWizard() {
    val allSelected = wizardSelections.flatten().distinct()
    val taskId = wizardTaskId
    preferenceWizardStep = -1
    wizardTaskTitle = null
    wizardTaskId = null
    completeTemplateTask(taskId)
    if (allSelected.isNotEmpty()) {
      onInputChange("My preferences — ${allSelected.joinToString(", ")}")
      sendMessage()
    }
  }

  private fun nowRunAtString(): String =
    java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(java.util.Date())

  private fun runAtPlusDays(days: Int): String {
    val cal = java.util.Calendar.getInstance()
    cal.add(java.util.Calendar.DAY_OF_YEAR, days)
    return java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(cal.time)
  }

  // Clears pending; if the task recurs, rolls it forward to reappear
  // after recurrenceDays instead of leaving it fired=true forever.
  private fun completeTemplateTask(id: String?) {
    if (id == null) return
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      val current = when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> result.value
        is ApiResult.Failure -> scheduledTasks
      }
      val updated = current.map { t ->
        if (t.id != id) t
        else if (t.recurrenceDays > 0) t.copy(pending = false, fired = false, runAt = runAtPlusDays(t.recurrenceDays))
        else t.copy(pending = false, fired = true)
      }
      scheduledTasks = updated
      ChatGizaApi.saveScheduled(token, updated)
    }
  }

  fun onNewTaskPromptChange(value: String) {
    newTaskPrompt = value
  }

  fun onNewTaskRunAtChange(value: String) {
    newTaskRunAt = value
  }

  fun onNewTaskCategoryChange(value: String) {
    newTaskCategory = value
  }

  fun setNewTaskAttachmentImage(name: String, dataUrl: String) {
    newTaskAttachmentName = name
    newTaskAttachmentImageDataUrl = dataUrl
    newTaskAttachmentText = ""
  }

  fun setNewTaskAttachmentText(name: String, text: String) {
    newTaskAttachmentName = name
    newTaskAttachmentText = text
    newTaskAttachmentImageDataUrl = ""
  }

  fun clearNewTaskAttachment() {
    newTaskAttachmentName = ""
    newTaskAttachmentText = ""
    newTaskAttachmentImageDataUrl = ""
  }

  // addScheduledTask/scheduleReminderFromChat/deleteScheduledTask all re-fetch
  // the list from the server right before writing, instead of mutating
  // whatever `scheduledTasks` already held in memory. ScheduledTaskWorker
  // runs independently every ~15 minutes and marks due reminders fired=true
  // on the server -- if a write here started from a stale in-memory copy
  // (e.g. loaded once at sign-in, never refreshed since), it would silently
  // overwrite that with fired=false, making the same reminder fire again on
  // the worker's next pass. Fetching fresh first closes that race.

  fun addScheduledTask() {
    val prompt = newTaskPrompt.trim()
    // Web parses this with `new Date(runAt)`, which needs the ISO "T"
    // separator to parse reliably across browsers — a plain space works in
    // some engines but not all.
    val runAt = newTaskRunAt.trim().replaceFirst(" ", "T")
    if (prompt.isEmpty() || runAt.isEmpty()) return
    val token = tokenStore.getToken() ?: return
    // No separate title field in the sheet -- the list row just falls back
    // to the start of the prompt itself (see task.title.ifBlank{task.prompt}
    // in ScheduledScreen), so this only ever needs the prompt.
    val newTask = ApiScheduledTask(
      UUID.randomUUID().toString(),
      prompt,
      runAt,
      false,
      category = newTaskCategory,
      title = prompt.take(48),
      attachmentName = newTaskAttachmentName,
      attachmentText = newTaskAttachmentText,
      attachmentImageDataUrl = newTaskAttachmentImageDataUrl
    )
    newTaskPrompt = ""
    newTaskRunAt = ""
    newTaskCategory = "Chat"
    clearNewTaskAttachment()
    viewModelScope.launch {
      val current = when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> result.value
        is ApiResult.Failure -> scheduledTasks
      }
      val updated = listOf(newTask) + current
      scheduledTasks = updated
      ChatGizaApi.saveScheduled(token, updated)
    }
  }

  /** Same effect as [addScheduledTask], but driven by the AI's own
   * [[REMINDER_START]] marker instead of the manual Automations form --
   * doesn't touch newTaskPrompt/newTaskRunAt since there's no form open.
   * [imageDataUrl]/[file] carry over whatever photo/PDF/text the user had
   * attached on the very message that triggered this reminder -- e.g. they
   * uploaded a calendar screenshot and the AI recognized it and offered to
   * schedule something from it (see CAPABILITIES_PROMPT in ai.ts). Same
   * attachment fields ScheduledTaskWorker already knows how to fold back
   * into the prompt when the task fires. */
  private fun scheduleReminderFromChat(reminder: ChatReminderRequest, imageDataUrl: String? = null, file: AttachedFile? = null) {
    val token = tokenStore.getToken() ?: return
    val runAt = reminder.runAt.replaceFirst(" ", "T")
    val newTask = ApiScheduledTask(
      UUID.randomUUID().toString(),
      reminder.prompt,
      runAt,
      false,
      attachmentName = file?.name ?: if (!imageDataUrl.isNullOrBlank()) "Photo" else "",
      attachmentText = file?.text ?: "",
      attachmentImageDataUrl = file?.imageDataUrls?.firstOrNull() ?: imageDataUrl ?: ""
    )
    viewModelScope.launch {
      val current = when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> result.value
        is ApiResult.Failure -> scheduledTasks
      }
      val updated = listOf(newTask) + current
      scheduledTasks = updated
      ChatGizaApi.saveScheduled(token, updated)
    }
  }

  /** Fetches admin-approved ads for the Events carousel, targeted by the
   * device's own locale country and language. Decorative content -- a
   * failure just leaves activeAds empty rather than surfacing an error
   * banner. */
  fun loadActiveAds() {
    val token = tokenStore.getToken() ?: return
    val locale = java.util.Locale.getDefault()
    val country = locale.country
    if (country.isBlank()) return
    viewModelScope.launch {
      val result = ChatGizaApi.getActiveAds(token, country, locale.language)
      if (result is ApiResult.Success) activeAds = result.value
    }
  }

  fun deleteScheduledTask(id: String) {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      val current = when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> result.value
        is ApiResult.Failure -> scheduledTasks
      }
      val updated = current.filter { it.id != id }
      scheduledTasks = updated
      ChatGizaApi.saveScheduled(token, updated)
    }
  }

  // Real pause, not cosmetic -- ScheduledTaskWorker skips any task with
  // paused=true, so this actually stops it from firing instead of just
  // hiding it from a filtered view.
  fun toggleTaskPaused(id: String) {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      val current = when (val result = ChatGizaApi.getScheduled(token)) {
        is ApiResult.Success -> result.value
        is ApiResult.Failure -> scheduledTasks
      }
      val updated = current.map { if (it.id == id) it.copy(paused = !it.paused) else it }
      scheduledTasks = updated
      ChatGizaApi.saveScheduled(token, updated)
    }
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

  /** Fetches a real, pre-authorized Stripe portal URL so the caller can hand
   * it straight to a browser Intent -- the browser needs no sign-in of its
   * own for this link to work. */
  fun fetchBillingPortalUrl(onResult: (String?) -> Unit) {
    val token = tokenStore.getToken()
    if (token == null) {
      onResult(null)
      return
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.getBillingPortalUrl(token)) {
        is ApiResult.Success -> onResult(result.value)
        is ApiResult.Failure -> {
          errorMessage = result.message
          onResult(null)
        }
      }
    }
  }

  fun closeBilling() {
    screen = AppScreen.ProfileHub
  }

  /** Real Stripe subscription checkout -- hands the caller a URL to open in
   * the browser (same pre-authorized-link pattern as fetchBillingPortalUrl).
   * Used to gate paid-tier features like longer post captions. */
  fun startCheckout(tier: String, onResult: (String?) -> Unit) {
    val token = tokenStore.getToken()
    if (token == null) {
      onResult(null)
      return
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.startCheckout(token, tier)) {
        is ApiResult.Success -> onResult(result.value)
        is ApiResult.Failure -> {
          errorMessage = result.message
          onResult(null)
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
          when (val outcome = result.value) {
            is MobileAuthOutcome.SignedIn -> {
              signingIn = false
              applySignedInResult(outcome.result)
            }
            is MobileAuthOutcome.TotpRequired -> {
              signingIn = false
              pendingLoginTotpId = outcome.pendingId
              loginTotpCodeInput = ""
              loginTotpError = null
              screen = AppScreen.TotpLoginVerify
            }
          }
        }
        is ApiResult.Failure -> {
          signingIn = false
          errorMessage = result.message
        }
      }
    }
  }

  // Shared by a normal sign-in and a 2FA-verified one -- both end up with
  // the same AuthResult, just via a different number of steps to get there.
  private fun applySignedInResult(result: AuthResult) {
    tokenStore.setToken(result.token)
    tokenStore.setUser(result.user.id, result.user.name, result.user.email, result.user.image)
    userId = result.user.id
    userName = result.user.name
    userEmail = result.user.email
    userImage = result.user.image
    screen = AppScreen.Chat
    loadHistory()
    loadProfile()
    loadSettings()
    loadProjects()
    loadScheduled()
  }

  fun onLoginTotpCodeChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      loginTotpCodeInput = value
      loginTotpError = null
    }
  }

  fun submitLoginTotpCode() {
    val pendingId = pendingLoginTotpId ?: return
    if (loginTotpCodeInput.length != 6) {
      loginTotpError = "Enter the 6-digit code from your authenticator app"
      return
    }
    loginTotpBusy = true
    loginTotpError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.verifyLoginTotp(pendingId, loginTotpCodeInput)) {
        is ApiResult.Success -> {
          loginTotpBusy = false
          pendingLoginTotpId = null
          loginTotpCodeInput = ""
          applySignedInResult(result.value)
        }
        is ApiResult.Failure -> {
          loginTotpBusy = false
          loginTotpError = result.message
        }
      }
    }
  }

  // Backs out of the code screen to a fresh sign-in instead of leaving the
  // user stuck if they can't get to their authenticator app right now.
  fun cancelLoginTotp() {
    pendingLoginTotpId = null
    loginTotpCodeInput = ""
    loginTotpError = null
    screen = AppScreen.SignedOut
  }

  fun onSignInFailed(message: String) {
    signingIn = false
    errorMessage = message
  }

  // Password sign-in tab (Email/Mobile) on SignedOutScreen -- an
  // alternate way in for accounts that have set an in-app password
  // (Security > Change Password), not a separate identity from the
  // Google-linked account. Reuses the exact same TotpRequired/SignedIn
  // dispatch as onGoogleIdToken below, including the TOTP-verify screen,
  // since the backend stages both paths into the same pending-login spot.
  var signInTab by mutableStateOf("email")
    private set
  var signInIdentifierInput by mutableStateOf("")
    private set
  var signInPasswordInput by mutableStateOf("")
    private set
  var signInCountry by mutableStateOf(DEFAULT_COUNTRY_DIAL_CODE)
    private set
  var signInCountryPickerOpen by mutableStateOf(false)
    private set
  var signInError by mutableStateOf<String?>(null)
    private set
  var signInBusy by mutableStateOf(false)
    private set

  fun onSignInTabChange(tab: String) {
    signInTab = tab
    signInError = null
  }

  fun onSignInIdentifierChange(value: String) {
    signInIdentifierInput = value
    signInError = null
  }

  fun onSignInPasswordChange(value: String) {
    signInPasswordInput = value
    signInError = null
  }

  fun openSignInCountryPicker() {
    signInCountryPickerOpen = true
  }

  fun closeSignInCountryPicker() {
    signInCountryPickerOpen = false
  }

  fun selectSignInCountry(country: CountryDialCode) {
    signInCountry = country
    signInCountryPickerOpen = false
  }

  fun submitPasswordSignIn() {
    val identifier = if (signInTab == "mobile") {
      "${signInCountry.dialCode}${signInIdentifierInput.trim().trimStart('0')}"
    } else {
      signInIdentifierInput.trim()
    }
    if (signInIdentifierInput.isBlank() || signInPasswordInput.isEmpty()) {
      signInError = "Enter your details and password"
      return
    }
    signInBusy = true
    signInError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.authWithPassword(identifier, signInTab, signInPasswordInput)) {
        is ApiResult.Success -> {
          when (val outcome = result.value) {
            is MobileAuthOutcome.SignedIn -> {
              signInBusy = false
              applySignedInResult(outcome.result)
            }
            is MobileAuthOutcome.TotpRequired -> {
              signInBusy = false
              pendingLoginTotpId = outcome.pendingId
              loginTotpCodeInput = ""
              loginTotpError = null
              screen = AppScreen.TotpLoginVerify
            }
          }
        }
        is ApiResult.Failure -> {
          signInBusy = false
          signInError = result.message
        }
      }
    }
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
    bioInput = ""
    displayNameInput = ""
    settingsData = SettingsData()
    projects = emptyList()
    scheduledTasks = emptyList()
    billingSummary = null
    personalizeChatGizaEnabled = tokenStore.getPersonalizeChatGiza()
    chatLinkSharingEnabled = tokenStore.getChatLinkSharing()
    kidsModeEnabled = tokenStore.getKidsModeEnabled()
    blurMatureContentEnabled = tokenStore.getBlurMatureContentEnabled()
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
      when (val result = ChatGizaApi.getHistory(token, activeSubaccountId)) {
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

  fun openChangePassword() {
    screen = AppScreen.ChangePassword
    hasPassword = null
    passwordStep = "old"
    oldPasswordInput = ""
    newPasswordInput = ""
    passwordCodeInput = ""
    passwordError = null
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getPasswordStatus(token)) {
        is ApiResult.Success -> {
          hasPassword = result.value
          // No password set yet -- there's nothing to ask for, so skip
          // straight to setting one instead of showing a step that can
          // never succeed.
          if (!result.value) passwordStep = "new"
        }
        is ApiResult.Failure -> passwordError = result.message
      }
    }
  }

  fun closeChangePassword() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun onOldPasswordInputChange(value: String) {
    oldPasswordInput = value
    passwordError = null
  }

  fun onNewPasswordInputChange(value: String) {
    newPasswordInput = value
    passwordError = null
  }

  // Fires when the New Password field loses focus (keyboard dismissed by
  // tapping elsewhere) -- catches a too-short password immediately instead
  // of only at Confirm.
  fun checkNewPasswordOnBlur() {
    if (newPasswordInput.length < 6) {
      passwordError = "Please enter the correct password"
    }
  }

  // Fires when the Current Password field loses focus. This is the same
  // length-based hint as New Password's, not an assertion that the typed
  // password is wrong -- passwords are always 6-16 characters system-wide,
  // so anything shorter simply can't be complete yet. Whether it's the
  // *correct* password is still only checked for real on Confirm.
  fun checkOldPasswordOnBlur() {
    if (oldPasswordInput.isNotEmpty() && oldPasswordInput.length < 6) {
      passwordError = "Please enter the correct password"
    }
  }

  // Fires when the New Password field regains focus -- hides the error
  // text immediately even though the field's own border stays red (via its
  // local invalid state) until the input actually reaches 6 characters.
  fun clearPasswordError() {
    passwordError = null
  }

  fun onPasswordCodeInputChange(value: String) {
    passwordCodeInput = value
    passwordError = null
  }

  fun confirmOldPassword() {
    if (oldPasswordInput.isEmpty()) {
      passwordError = "Enter your current password"
      return
    }
    passwordStep = "new"
  }

  // Sends the verification code -- doesn't change the password yet, that
  // only happens once submitPasswordCode confirms the code below.
  fun submitNewPassword() {
    if (newPasswordInput.length < 6 || newPasswordInput.length > 16) {
      passwordError = "Password must be 6-16 characters"
      return
    }
    val token = tokenStore.getToken() ?: return
    changingPassword = true
    passwordError = null
    viewModelScope.launch {
      val result = ChatGizaApi.requestPasswordChange(
        token,
        if (hasPassword == true) oldPasswordInput else null,
        newPasswordInput
      )
      changingPassword = false
      when (result) {
        is ApiResult.Success -> {
          passwordCodeInput = ""
          passwordStep = "code"
        }
        is ApiResult.Failure -> {
          passwordError = result.message
          // The only way this fails once a password already exists is a
          // wrong old password -- send them back to fix it rather than
          // leaving the error stuck on the new-password step.
          if (hasPassword == true) passwordStep = "old"
        }
      }
    }
  }

  fun submitPasswordCode() {
    if (passwordCodeInput.isBlank()) {
      passwordError = "Enter the code from your email"
      return
    }
    val token = tokenStore.getToken() ?: return
    changingPassword = true
    passwordError = null
    viewModelScope.launch {
      val result = ChatGizaApi.confirmPasswordChange(token, passwordCodeInput.trim())
      changingPassword = false
      when (result) {
        is ApiResult.Success -> closeChangePassword()
        is ApiResult.Failure -> passwordError = result.message
      }
    }
  }

  // Just the on/off status, no navigation -- called once when the Security
  // tab becomes reachable so its "On"/"Off" row label is accurate without
  // requiring the user to open the setup screen first.
  fun loadTotpStatus() {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getTotpStatus(token)) {
        is ApiResult.Success -> totpEnabled = result.value
        is ApiResult.Failure -> {}
      }
    }
  }

  fun openTwoFactorSetup() {
    screen = AppScreen.TwoFactorSetup
    totpSetupSecret = null
    totpSetupUri = null
    totpSetupStep = "link"
    totpSetupCodeInput = ""
    totpDisableCodeInput = ""
    totpError = null
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.getTotpStatus(token)) {
        is ApiResult.Success -> totpEnabled = result.value
        is ApiResult.Failure -> totpError = result.message
      }
    }
  }

  fun closeTwoFactorSetup() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  // Requests a fresh secret to enroll -- called once the screen knows 2FA
  // is currently off (see the enabled == false branch in the UI).
  fun startTotpSetup() {
    val token = tokenStore.getToken() ?: return
    totpBusy = true
    totpError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.setupTotp(token)) {
        is ApiResult.Success -> {
          totpSetupSecret = result.value.secret
          totpSetupUri = result.value.otpauthUri
          totpSetupStep = "link"
        }
        is ApiResult.Failure -> totpError = result.message
      }
      totpBusy = false
    }
  }

  // From the "link" step's Next button -- there's nothing to actually
  // validate client-side before a code exists, so this just moves to the
  // verify step; confirmTotpSetup() is what does the real check.
  fun goToTotpVerifyStep() {
    totpSetupStep = "verify"
    totpError = null
  }

  fun backToTotpLinkStep() {
    totpSetupStep = "link"
    totpSetupCodeInput = ""
    totpError = null
  }

  // Back out of the "link" step to the intro screen (e.g. to re-download
  // the app first) -- discards the staged secret; startTotpSetup() issues
  // a fresh one if they tap "Enable Authenticator App" again.
  fun backToTotpIntro() {
    totpSetupSecret = null
    totpSetupUri = null
    totpSetupStep = "link"
    totpError = null
  }

  fun onTotpSetupCodeChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      totpSetupCodeInput = value
      totpError = null
    }
  }

  fun confirmTotpSetup() {
    if (totpSetupCodeInput.length != 6) {
      totpError = "Enter the 6-digit code from your authenticator app"
      return
    }
    val token = tokenStore.getToken() ?: return
    totpBusy = true
    totpError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.confirmTotpSetup(token, totpSetupCodeInput)) {
        is ApiResult.Success -> {
          totpEnabled = true
          totpSetupSecret = null
          totpSetupUri = null
          totpSetupCodeInput = ""
        }
        is ApiResult.Failure -> totpError = result.message
      }
      totpBusy = false
    }
  }

  fun onTotpDisableCodeChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      totpDisableCodeInput = value
      totpError = null
    }
  }

  fun disableTotp() {
    if (totpDisableCodeInput.length != 6) {
      totpError = "Enter your current authenticator code"
      return
    }
    val token = tokenStore.getToken() ?: return
    totpBusy = true
    totpError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.disableTotp(token, totpDisableCodeInput)) {
        is ApiResult.Success -> {
          totpEnabled = false
          totpDisableCodeInput = ""
        }
        is ApiResult.Failure -> totpError = result.message
      }
      totpBusy = false
    }
  }

  private fun sha256Hex(value: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }

  fun openAppLockSetup() {
    screen = AppScreen.AppLockSetup
    appLockSetupStep = "enter"
    appLockPinInput = ""
    appLockFirstEnteredPin = null
    appLockDisableInput = ""
    appLockError = null
  }

  fun closeAppLockSetup() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun onAppLockPinChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      appLockPinInput = value
      appLockError = null
    }
  }

  fun onAppLockDisableChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      appLockDisableInput = value
      appLockError = null
    }
  }

  // "enter" -> stash the first PIN and ask for it again; "confirm" -> only
  // turns App Lock on if the second entry matches, catching a fat-fingered
  // PIN before it becomes the thing standing between the user and their
  // own app.
  fun submitAppLockPinStep() {
    if (appLockPinInput.length < 4) {
      appLockError = "Enter at least 4 digits"
      return
    }
    when (appLockSetupStep) {
      "enter" -> {
        appLockFirstEnteredPin = appLockPinInput
        appLockPinInput = ""
        appLockSetupStep = "confirm"
      }
      else -> {
        if (appLockPinInput != appLockFirstEnteredPin) {
          appLockError = "PINs didn't match -- try again"
          appLockPinInput = ""
          appLockFirstEnteredPin = null
          appLockSetupStep = "enter"
          return
        }
        tokenStore.setAppLock(true, sha256Hex(appLockPinInput))
        appLockEnabled = true
        closeAppLockSetup()
      }
    }
  }

  fun disableAppLock() {
    val storedHash = tokenStore.getAppLockPinHash()
    if (storedHash == null || sha256Hex(appLockDisableInput) != storedHash) {
      appLockError = "That PIN is incorrect"
      return
    }
    tokenStore.setAppLock(false, null)
    appLockEnabled = false
    appLockDisableInput = ""
    closeAppLockSetup()
  }

  // Called from MainActivity.onStop() -- re-arms the gate every time the
  // app leaves the foreground (not just on cold start), so someone picking
  // up an already-open phone still hits the PIN screen.
  fun armAppLockIfEnabled() {
    if (appLockEnabled) {
      appLockGateActive = true
      appLockGateInput = ""
      appLockGateError = null
    }
  }

  fun onAppLockGateInputChange(value: String) {
    if (value.length <= 6 && value.all { it.isDigit() }) {
      appLockGateInput = value
      appLockGateError = null
    }
  }

  fun submitAppLockGateUnlock() {
    val storedHash = tokenStore.getAppLockPinHash()
    if (storedHash != null && sha256Hex(appLockGateInput) == storedHash) {
      appLockGateActive = false
      appLockGateInput = ""
      appLockGateError = null
    } else {
      appLockGateError = "That PIN is incorrect"
      appLockGateInput = ""
    }
  }

  // Exposed so MainActivity's Credential Manager flows (which need an
  // Activity, unlike everything else here) can read the bearer token
  // without a second TokenStore instance.
  fun currentToken(): String? = tokenStore.getToken()

  fun openPasskeysScreen() {
    screen = AppScreen.PasskeysManage
    passkeyError = null
    loadPasskeys()
  }

  fun closePasskeysScreen() {
    returnToAccountTabsIfPending()
    screen = AppScreen.ProfileHub
  }

  fun loadPasskeys() {
    val token = tokenStore.getToken() ?: return
    passkeysLoading = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getPasskeys(token)) {
        is ApiResult.Success -> {
          passkeys = result.value
          passkeyError = null
        }
        is ApiResult.Failure -> passkeyError = result.message
      }
      passkeysLoading = false
    }
  }

  fun removePasskey(id: String) {
    val token = tokenStore.getToken() ?: return
    viewModelScope.launch {
      when (val result = ChatGizaApi.deletePasskey(token, id)) {
        is ApiResult.Success -> passkeys = passkeys.filter { it.id != id }
        is ApiResult.Failure -> passkeyError = result.message
      }
    }
  }

  // Named update*/not set* -- a Kotlin property named passkeyRegisterBusy
  // already generates a setPasskeyRegisterBusy(Boolean) JVM accessor (even
  // with `private set`, since JVM signature clashes are checked regardless
  // of Kotlin-level visibility); a same-named function here collided with
  // it and failed the build.
  fun updatePasskeyRegisterBusy(value: Boolean) {
    passkeyRegisterBusy = value
  }

  fun updatePasskeyError(value: String?) {
    passkeyError = value
  }

  fun onPasskeyRegistered() {
    passkeyError = null
    loadPasskeys()
  }

  fun onPasskeySignedIn(result: AuthResult) {
    signingIn = false
    applySignedInResult(result)
  }

  fun loadSubaccounts() {
    val token = tokenStore.getToken() ?: return
    loadingSubaccounts = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.getSubaccounts(token)) {
        is ApiResult.Success -> subaccounts = result.value
        is ApiResult.Failure -> subaccountError = result.message
      }
      loadingSubaccounts = false
    }
  }

  fun createSubaccount(name: String) {
    val token = tokenStore.getToken() ?: return
    val trimmed = name.trim()
    if (trimmed.isBlank() || subaccounts.size >= 5) return
    subaccountError = null
    viewModelScope.launch {
      when (val result = ChatGizaApi.createSubaccount(token, trimmed, null)) {
        is ApiResult.Success -> subaccounts = subaccounts + result.value
        is ApiResult.Failure -> subaccountError = result.message
      }
    }
  }

  fun deleteSubaccount(id: String) {
    val token = tokenStore.getToken() ?: return
    subaccounts = subaccounts.filter { it.id != id }
    if (activeSubaccountId == id) switchToMainAccount()
    viewModelScope.launch {
      when (val result = ChatGizaApi.deleteSubaccount(token, id)) {
        is ApiResult.Failure -> subaccountError = result.message
        else -> {}
      }
    }
  }

  fun renameSubaccount(id: String, name: String) {
    val token = tokenStore.getToken() ?: return
    val trimmed = name.trim()
    if (trimmed.isBlank()) return
    val previous = subaccounts
    subaccounts = subaccounts.map { if (it.id == id) it.copy(name = trimmed) else it }
    if (subaccountSettingsTarget?.id == id) subaccountSettingsTarget = subaccountSettingsTarget?.copy(name = trimmed)
    if (activeSubaccountId == id) {
      activeSubaccountName = trimmed
      tokenStore.setActiveSubaccount(id, trimmed)
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.renameSubaccount(token, id, trimmed)) {
        is ApiResult.Failure -> {
          subaccountError = result.message
          subaccounts = previous
          if (subaccountSettingsTarget?.id == id) subaccountSettingsTarget = previous.find { it.id == id }
        }
        else -> {}
      }
    }
  }

  // Per-subaccount "More > Settings" screen (Rename/Delete) reached from
  // SwitchAccountScreen -- closes back to that same list, not Profile Hub.
  var subaccountSettingsTarget by mutableStateOf<ApiSubaccount?>(null)
    private set

  fun openSubaccountSettings(sub: ApiSubaccount) {
    subaccountSettingsTarget = sub
    screen = AppScreen.SubaccountSettings
  }

  fun closeSubaccountSettings() {
    subaccountSettingsTarget = null
    screen = AppScreen.SwitchAccount
  }

  // Switching clears whatever's currently loaded and re-fetches history
  // scoped to the new identity -- otherwise the previous identity's
  // messages would flash on screen under the new one until the load
  // finishes.
  fun switchToSubaccount(sub: ApiSubaccount) {
    activeSubaccountId = sub.id
    activeSubaccountName = sub.name
    tokenStore.setActiveSubaccount(sub.id, sub.name)
    conversations = emptyList()
    activeConversationId = null
    messages = emptyList()
    loadHistory()
    // Actually take the user into that identity's chat -- just updating
    // state left them stuck on this same screen with nothing visibly
    // happening, which read as the switch "not being accepted". This is a
    // deliberate jump to Chat, not a "close and go back" -- clear any
    // pending reopen-Account-tabs flag (set if Switch/Create Account was
    // reached via the Subaccount row) so it doesn't fire later on some
    // unrelated screen close and flash Profile Hub before "correcting"
    // itself back to where the user actually navigated.
    accountTabsReturnPending = false
    screen = AppScreen.Chat
  }

  fun switchToMainAccount() {
    activeSubaccountId = null
    activeSubaccountName = null
    tokenStore.setActiveSubaccount(null, null)
    conversations = emptyList()
    activeConversationId = null
    messages = emptyList()
    loadHistory()
    accountTabsReturnPending = false
    screen = AppScreen.Chat
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
    destination: String = "post",
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

      when (val result = ChatGizaApi.createMediaPost(token, text, imageDataUrls, videoUrl, sentiment, destination)) {
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
    val previous = mediaPosts.find { it.id == postId } ?: return
    // Optimistic flip so the tap feels instant; corrected by (or reverted
    // to exactly match, using the captured snapshot rather than flipping
    // whatever the current value happens to be) the server's real state
    // once the request comes back. Flipping-in-place on failure used to be
    // able to land on the wrong final state if a second tap fired before
    // the first request resolved -- restoring the captured `previous`
    // instead is correct regardless of how many taps overlapped.
    mediaPosts = mediaPosts.map {
      if (it.id == postId) it.copy(likedByMe = !previous.likedByMe, likeCount = previous.likeCount + if (previous.likedByMe) -1 else 1) else it
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
            if (it.id == postId) it.copy(likedByMe = previous.likedByMe, likeCount = previous.likeCount) else it
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

  // Keyed by userId -- lets any number of profile screens (own or
  // someone else's) show real follower/following counts and bio without
  // each keeping its own separate copy in sync.
  var mediaUserProfiles by mutableStateOf<Map<String, ChatGizaApi.MediaUserProfile>>(emptyMap())
    private set

  fun loadMediaUserProfile(userId: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    viewModelScope.launch {
      when (val result = ChatGizaApi.getMediaUserProfile(token, userId)) {
        is ApiResult.Success -> mediaUserProfiles = mediaUserProfiles + (userId to result.value)
        is ApiResult.Failure -> mediaError = result.message
      }
    }
  }

  fun toggleFollowMediaUser(userId: String) {
    val token = tokenStore.getToken() ?: run { mediaError = "Not signed in"; return }
    val previous = mediaUserProfiles[userId]
    // Optimistic flip, same pattern as toggleMediaPostLike -- corrected
    // by (or reverted to match) the server's real state once the
    // request comes back.
    if (previous != null) {
      mediaUserProfiles = mediaUserProfiles + (userId to previous.copy(
        isFollowedByMe = !previous.isFollowedByMe,
        followerCount = previous.followerCount + if (previous.isFollowedByMe) -1 else 1
      ))
    }
    viewModelScope.launch {
      when (val result = ChatGizaApi.toggleFollowMediaUser(token, userId)) {
        is ApiResult.Success -> {
          val current = mediaUserProfiles[userId]
          mediaUserProfiles = mediaUserProfiles + (userId to (current?.copy(
            isFollowedByMe = result.value.following,
            followerCount = result.value.followerCount
          ) ?: ChatGizaApi.MediaUserProfile(result.value.followerCount, 0, result.value.following, "")))
        }
        is ApiResult.Failure -> {
          if (previous != null) mediaUserProfiles = mediaUserProfiles + (userId to previous)
          mediaError = result.message
        }
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
    viewModelScope.launch {
      val result = ChatGizaApi.saveHistory(token, updated, updatedDeleted, activeSubaccountId)
      if (result is ApiResult.Failure) errorMessage = result.message
    }
  }

  fun deleteAllConversations() {
    val token = tokenStore.getToken() ?: return
    val now = System.currentTimeMillis()
    val updatedDeleted = deletedIds + conversations.associate { it.id to now }
    conversations = emptyList()
    deletedIds = updatedDeleted
    activeConversationId = null
    messages = emptyList()
    viewModelScope.launch {
      val result = ChatGizaApi.saveHistory(token, emptyList(), updatedDeleted, activeSubaccountId)
      if (result is ApiResult.Failure) errorMessage = result.message
    }
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

  var deactivatingAccount by mutableStateOf(false)
    private set

  // Unlike deleteAccount, this doesn't touch any data -- the account
  // reactivates itself automatically the next time this same person signs
  // back in (see finishMobileSignIn on the backend), so signing out here is
  // enough; there's no separate reactivation screen to build.
  fun deactivateAccount() {
    val token = tokenStore.getToken() ?: return
    deactivatingAccount = true
    viewModelScope.launch {
      when (val result = ChatGizaApi.deactivateAccount(token)) {
        is ApiResult.Success -> {
          deactivatingAccount = false
          signOut()
        }
        is ApiResult.Failure -> {
          deactivatingAccount = false
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
    viewModelScope.launch {
      val result = ChatGizaApi.saveHistory(token, updated, deletedIds, activeSubaccountId)
      if (result is ApiResult.Failure) errorMessage = result.message
    }
  }

  fun togglePin(id: String) {
    val token = tokenStore.getToken() ?: return
    val updated = sortConversations(conversations.map { if (it.id == id) it.copy(pinned = !it.pinned) else it })
    conversations = updated
    viewModelScope.launch {
      val result = ChatGizaApi.saveHistory(token, updated, deletedIds, activeSubaccountId)
      if (result is ApiResult.Failure) errorMessage = result.message
    }
  }

  fun selectConversation(id: String) {
    val convo = conversations.find { it.id == id } ?: return
    activeConversationId = id
    messages = convo.messages.map { UiMessage(it.id, it.role, it.content, it.createdAt, it.pairId) }
    screen = AppScreen.Chat
  }

  fun newChat() {
    activeConversationId = null
    messages = emptyList()
    input = ""
    errorMessage = null
    screen = AppScreen.Chat
  }

  var pendingShare by mutableStateOf<PendingShare?>(null)
    private set

  /** Reached from MainActivity's ACTION_SEND handling (share-from-another-app).
   * Doesn't touch the active conversation itself -- just remembers what was
   * shared and opens the picker so the user decides where it goes, same as
   * a real chat app's share target rather than dumping it into whatever
   * chat happened to be open (or silently starting a new one). */
  fun receiveShareIntent(uri: Uri?, text: String?) {
    if (uri == null && text.isNullOrBlank()) return
    pendingShare = PendingShare(uri, text)
    screen = AppScreen.ShareTarget
  }

  fun cancelPendingShare() {
    pendingShare = null
    screen = AppScreen.History
  }

  fun clearPendingShare() {
    pendingShare = null
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
    val fileToSend = attachedFile
    if ((text.isEmpty() && imageToSend == null && fileToSend == null) || sending || token == null) return
    autoSpeakNextReply = viaVoice

    val now = System.currentTimeMillis()
    // The model sees the full extracted file text via apiText below; the
    // chat bubble itself only shows a small trace of what was attached, so
    // a big PDF/text file doesn't dump thousands of characters into the
    // visible conversation.
    val displayText = if (fileToSend != null) "$text\n\n📎 ${fileToSend.name}".trim() else text
    val apiText = if (fileToSend?.text != null) "$text\n\n[Attached file: ${fileToSend.name}]\n${fileToSend.text}" else text
    // Idea #6: every question/answer pair gets a short shared ID, so
    // either side can be looked up and traced back to the other no
    // matter how old the conversation is. If this new message itself
    // references an ID (e.g. "what did you say about Q-4F2A19"), find
    // that exact past pair and hand it to the model as real context
    // instead of hoping it remembers or guesses.
    val pairId = newPairId()
    val referencedPair = findReferencedPair(text)
    val userMsg = UiMessage(UUID.randomUUID().toString(), "user", displayText, now, pairId)
    val assistantId = UUID.randomUUID().toString()
    messages = messages + userMsg + UiMessage(assistantId, "assistant", "", now, pairId)
    input = ""
    clearAttachedImage()
    clearAttachedFile()
    sending = true
    errorMessage = null

    val conversationId = activeConversationId ?: UUID.randomUUID().toString()
    val isNewConversation = activeConversationId == null
    activeConversationId = conversationId
    if (viaVoice && isNewConversation) {
      voiceConversationIds = voiceConversationIds + conversationId
    }

    activeChatJob = viewModelScope.launch {
      val historyBase = messages.dropLast(1)
      val history = historyBase.mapIndexed { index, m ->
        ChatMessage(m.role, if (index == historyBase.lastIndex) apiText else m.content)
      }
      val imagesToSend = (fileToSend?.imageDataUrls ?: emptyList()) + listOfNotNull(imageToSend)
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
        imageDataUrls = imagesToSend,
        historyIndex = buildHistoryIndex(conversationId),
        referencedPair = referencedPair,
        localDateTime = currentLocalDateTimeString(),
        digitalTwin = digitalTwin
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
      } else {
        val finalContent = messages.find { it.id == assistantId }?.content.orEmpty()
        val (cleaned, reminder) = extractReminderRequest(finalContent)
        if (reminder != null) {
          messages = messages.map { m -> if (m.id == assistantId) m.copy(content = cleaned) else m }
          scheduleReminderFromChat(reminder, imageToSend, fileToSend)
        }
        maybeCheckForMemorySuggestions()
      }

      val titleFallback = text.take(60).ifEmpty { fileToSend?.name ?: "Photo" }
      val title = if (isNewConversation) titleFallback else conversations.find { it.id == conversationId }?.title ?: titleFallback
      val updated = ApiConversation(
        id = conversationId,
        title = title,
        messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis(), it.pairId) },
        pinned = conversations.find { it.id == conversationId }?.pinned ?: false
      )
      conversations = if (isNewConversation) {
        listOf(updated) + conversations
      } else {
        conversations.map { if (it.id == conversationId) updated else it }
      }
      val saveResult = ChatGizaApi.saveHistory(token, conversations, deletedIds, activeSubaccountId)
      if (saveResult is ApiResult.Failure) errorMessage = saveResult.message
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
    // Same question, so it keeps the same pairId -- a fresh answer, not a
    // new question needing a new one.
    val existingPairId = messages.getOrNull(idx)?.pairId.orEmpty()
    messages = messages.take(idx) + UiMessage(assistantId, "assistant", "", System.currentTimeMillis(), existingPairId)
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
        company = settingsData.company,
        historyIndex = buildHistoryIndex(conversationId),
        localDateTime = currentLocalDateTimeString(),
        digitalTwin = digitalTwin
      ) { chunk ->
        messages = messages.map { m -> if (m.id == assistantId) m.copy(content = m.content + chunk) else m }
      }
      sending = false
      if (result is ApiResult.Failure) {
        errorMessage = result.message
        messages = messages.map { m ->
          if (m.id == assistantId && m.content.isEmpty()) m.copy(content = "(failed to respond)") else m
        }
      } else {
        val finalContent = messages.find { it.id == assistantId }?.content.orEmpty()
        val (cleaned, reminder) = extractReminderRequest(finalContent)
        if (reminder != null) {
          messages = messages.map { m -> if (m.id == assistantId) m.copy(content = cleaned) else m }
          scheduleReminderFromChat(reminder)
        }
      }

      val updated = ApiConversation(
        id = conversationId,
        title = conversations.find { it.id == conversationId }?.title ?: "Chat",
        messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis(), it.pairId) },
        pinned = conversations.find { it.id == conversationId }?.pinned ?: false
      )
      conversations = conversations.map { if (it.id == conversationId) updated else it }
      val saveResult = ChatGizaApi.saveHistory(token, conversations, deletedIds, activeSubaccountId)
      if (saveResult is ApiResult.Failure) errorMessage = saveResult.message
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
      messages = messages.map { ApiMessage(it.id, it.role, it.content, it.createdAt ?: System.currentTimeMillis(), it.pairId) },
      pinned = conversations.find { it.id == conversationId }?.pinned ?: false
    )
    conversations = conversations.map { if (it.id == conversationId) updated else it }
    viewModelScope.launch {
      val saveResult = ChatGizaApi.saveHistory(token, conversations, deletedIds, activeSubaccountId)
      if (saveResult is ApiResult.Failure) errorMessage = saveResult.message
    }
  }
}

private fun ApiConversation.lastActivity(): Long = messages.maxOfOrNull { it.createdAt ?: 0L } ?: 0L

/** Device's own local wall-clock time, matching the naive "yyyy-MM-dd'T'HH:mm"
 * format the backend and the Scheduled Tasks feature both already use for
 * runAt -- sent with every chat request so the model can resolve relative
 * time references ("today at 6pm", Swahili clock hours) correctly. */
private fun currentLocalDateTimeString(): String =
  SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(Date())

private data class ChatReminderRequest(val prompt: String, val runAt: String)

private val REMINDER_MARKER_REGEX = Regex("\\[\\[REMINDER_START\\]\\]([\\s\\S]*?)\\[\\[REMINDER_END\\]\\]")

/** Pulls the model's invisible [[REMINDER_START]]{...}[[REMINDER_END]] marker
 * (see CAPABILITIES_PROMPT on the backend) out of a finished reply, if
 * present, returning the reply text with the marker stripped plus the
 * parsed reminder request. Never throws -- a malformed marker is just
 * treated as "no reminder", the reply text is still cleaned of it either way. */
private fun extractReminderRequest(content: String): Pair<String, ChatReminderRequest?> {
  val match = REMINDER_MARKER_REGEX.find(content) ?: return content to null
  val cleaned = content.replace(match.value, "").trimEnd()
  val reminder = runCatching {
    val json = JSONObject(match.groupValues[1].trim())
    val runAt = json.optString("runAt").trim()
    val prompt = json.optString("prompt").trim()
    if (runAt.isNotEmpty() && prompt.isNotEmpty()) ChatReminderRequest(prompt, runAt) else null
  }.getOrNull()
  return cleaned to reminder
}
