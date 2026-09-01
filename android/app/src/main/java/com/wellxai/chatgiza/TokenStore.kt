package com.wellxai.chatgiza

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Encrypted on-device storage for the mobile bearer token — this is the
 * app's whole session; nothing else identifies the signed-in user locally. */
class TokenStore(context: Context) {
  // The Keystore-backed encryption key behind this can go bad on its own
  // (OS restore to a new device, a ROM/OS update that invalidates it) --
  // without this, that throws inside `by lazy` and crashes the app on
  // every single launch from then on, with no way for the user to recover
  // short of a reinstall. Self-healing here (wipe + recreate, and fall
  // back to a plain unencrypted store as a last resort) trades "signed
  // out once" for "app permanently unusable".
  private val prefs: SharedPreferences by lazy { buildPrefs(context) }

  private fun buildPrefs(context: Context): SharedPreferences {
    return try {
      buildEncryptedPrefs(context)
    } catch (e: Exception) {
      context.deleteSharedPreferences(PREFS_NAME)
      try {
        buildEncryptedPrefs(context)
      } catch (e2: Exception) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      }
    }
  }

  private fun buildEncryptedPrefs(context: Context): SharedPreferences {
    val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()
    return EncryptedSharedPreferences.create(
      context,
      PREFS_NAME,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  }

  fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

  fun setToken(token: String) {
    prefs.edit().putString(KEY_TOKEN, token).apply()
  }

  // Whether this device already cleared its second-factor challenge --
  // sent back on every mobileAuth/authWithPassword call so it isn't
  // challenged again (see resolveMobileSignIn server-side). Unlike the
  // "remembered account" fields below, this MUST be wiped by clear() on
  // sign-out: "trusted until sign-out" only holds if signing out actually
  // forgets it.
  fun getDeviceTrustToken(): String? = prefs.getString(KEY_DEVICE_TRUST_TOKEN, null)

  fun setDeviceTrustToken(token: String?) {
    prefs.edit().putString(KEY_DEVICE_TRUST_TOKEN, token).apply()
  }

  fun getUserId(): String? = prefs.getString(KEY_ID, null)
  fun getUserName(): String? = prefs.getString(KEY_NAME, null)
  fun getUserEmail(): String? = prefs.getString(KEY_EMAIL, null)
  fun getUserImage(): String? = prefs.getString(KEY_IMAGE, null)

  fun setUser(id: String?, name: String?, email: String?, image: String?) {
    prefs.edit()
      .putString(KEY_ID, id)
      .putString(KEY_NAME, name)
      .putString(KEY_EMAIL, email)
      .putString(KEY_IMAGE, image)
      .apply()
  }

  // Separate from the KEY_NAME/EMAIL/IMAGE above on purpose: those get
  // wiped by clear() on sign-out, but the "Welcome back" sign-in screen
  // needs this to survive sign-out (and the app being reopened after being
  // fully closed) so a returning user sees their last account instead of
  // the plain sign-in form every time.
  fun getRememberedAccountName(): String? = prefs.getString(KEY_REMEMBERED_NAME, null)
  fun getRememberedAccountEmail(): String? = prefs.getString(KEY_REMEMBERED_EMAIL, null)
  fun getRememberedAccountImage(): String? = prefs.getString(KEY_REMEMBERED_IMAGE, null)
  fun rememberAccount(name: String?, email: String?, image: String?) {
    prefs.edit()
      .putString(KEY_REMEMBERED_NAME, name)
      .putString(KEY_REMEMBERED_EMAIL, email)
      .putString(KEY_REMEMBERED_IMAGE, image)
      .apply()
  }
  fun forgetRememberedAccount() {
    prefs.edit()
      .remove(KEY_REMEMBERED_NAME)
      .remove(KEY_REMEMBERED_EMAIL)
      .remove(KEY_REMEMBERED_IMAGE)
      .apply()
  }

  // Individual setters for updating just one field after the initial
  // sign-in (e.g. renaming the account, changing the avatar) -- without
  // these the local cache stays stale and getUserName()/getUserImage()
  // revert to the sign-in value on the next app launch, undoing the change.
  fun setUserName(name: String) {
    prefs.edit().putString(KEY_NAME, name).apply()
  }

  fun setUserEmail(email: String) {
    prefs.edit().putString(KEY_EMAIL, email).apply()
  }

  fun setUserImage(image: String) {
    prefs.edit().putString(KEY_IMAGE, image).apply()
  }

  fun getUserPhone(): String? = prefs.getString(KEY_PHONE, null)
  fun setUserPhone(phone: String) {
    prefs.edit().putString(KEY_PHONE, phone).apply()
  }

  fun getHapticsEnabled(): Boolean = prefs.getBoolean(KEY_HAPTICS_ENABLED, true)
  fun setHapticsEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_HAPTICS_ENABLED, value).apply()
  }

  // Quantara's own light/dark toggle -- independent of the main app's
  // appearance setting, scoped to Quantara per explicit request.
  fun getExtraDarkMode(): Boolean = prefs.getBoolean(KEY_EXTRA_DARK_MODE, false)
  fun setExtraDarkMode(value: Boolean) {
    prefs.edit().putBoolean(KEY_EXTRA_DARK_MODE, value).apply()
  }

  fun getHapticsOnPress(): Boolean = prefs.getBoolean(KEY_HAPTICS_ON_PRESS, true)
  fun setHapticsOnPress(value: Boolean) {
    prefs.edit().putBoolean(KEY_HAPTICS_ON_PRESS, value).apply()
  }

  fun getHapticsOnResponse(): Boolean = prefs.getBoolean(KEY_HAPTICS_ON_RESPONSE, true)
  fun setHapticsOnResponse(value: Boolean) {
    prefs.edit().putBoolean(KEY_HAPTICS_ON_RESPONSE, value).apply()
  }

  fun getPasteAsFileMode(): String = prefs.getString(KEY_PASTE_AS_FILE_MODE, "always_ask") ?: "always_ask"
  fun setPasteAsFileMode(value: String) {
    prefs.edit().putString(KEY_PASTE_AS_FILE_MODE, value).apply()
  }

  // Private Chat's own thread (see ChatViewModel's privateMessages) --
  // stored as a raw JSON string here, same encrypted store as the auth
  // token itself, and never sent to ChatGizaApi.saveHistory.
  // Superseded by getPrivateConversationsJson() below (a real list of
  // threads instead of one flat one) -- kept read-only so an existing
  // single thread already on a device gets folded into that list once,
  // rather than silently disappearing for anyone updating from before
  // multi-thread Private history existed.
  fun getPrivateChatJson(): String? = prefs.getString(KEY_PRIVATE_CHAT, null)
  fun setPrivateChatJson(value: String?) {
    prefs.edit().putString(KEY_PRIVATE_CHAT, value).apply()
  }

  fun getPrivateConversationsJson(): String? = prefs.getString(KEY_PRIVATE_CONVERSATIONS, null)
  fun setPrivateConversationsJson(value: String?) {
    prefs.edit().putString(KEY_PRIVATE_CONVERSATIONS, value).apply()
  }

  // Private Chat's own PIN gate -- separate from the whole-app App Lock
  // above; this one only guards this one screen, and is required every
  // single time it's opened (not just after backgrounding the app). Same
  // reasoning on only storing the hash: this whole prefs file is already
  // Keystore-backed encrypted at rest. Not preserved by clear() below, same
  // as the private thread itself -- signing out wipes both together since
  // there's no server copy of either to fall back on.
  fun getPrivateChatPinHash(): String? = prefs.getString(KEY_PRIVATE_CHAT_PIN_HASH, null)
  fun setPrivateChatPinHash(value: String?) {
    prefs.edit().putString(KEY_PRIVATE_CHAT_PIN_HASH, value).apply()
  }

  // A locally-picked preset avatar (see AVATAR_PRESETS in MainActivity.kt)
  // that overrides the Google-account photo everywhere the app shows an
  // avatar -- device-local only, no backend field for this exists yet.
  fun getAvatarPresetId(): String? = prefs.getString(KEY_AVATAR_PRESET_ID, null)
  fun setAvatarPresetId(value: String?) {
    prefs.edit().putString(KEY_AVATAR_PRESET_ID, value).apply()
  }

  // A custom name given to the chosen avatar, shown as a small label on
  // top of it wherever it renders -- also device-local only.
  fun getAvatarName(): String? = prefs.getString(KEY_AVATAR_NAME, null)
  fun setAvatarName(value: String?) {
    prefs.edit().putString(KEY_AVATAR_NAME, value).apply()
  }

  // Which subaccount (see /api/subaccounts) is currently active on this
  // device -- null means the main signed-in account itself. Device-local:
  // switching on one device doesn't switch it everywhere the account is
  // signed in, same as which tab is open.
  fun getActiveSubaccountId(): String? = prefs.getString(KEY_ACTIVE_SUBACCOUNT_ID, null)
  fun getActiveSubaccountName(): String? = prefs.getString(KEY_ACTIVE_SUBACCOUNT_NAME, null)
  fun setActiveSubaccount(id: String?, name: String?) {
    prefs.edit().putString(KEY_ACTIVE_SUBACCOUNT_ID, id).putString(KEY_ACTIVE_SUBACCOUNT_NAME, name).apply()
  }

  fun getThemeMode(): String = prefs.getString(KEY_THEME_MODE, "dark") ?: "dark"
  fun setThemeMode(value: String) {
    prefs.edit().putString(KEY_THEME_MODE, value).apply()
  }

  // "nova_regular" | "nova_light" — see ChatGizaTypography in
  // MainActivity.kt for what each maps to. Device-level like theme, not
  // account data.
  fun getFontChoice(): String = prefs.getString(KEY_FONT_CHOICE, "nova_regular") ?: "nova_regular"
  fun setFontChoice(value: String) {
    prefs.edit().putString(KEY_FONT_CHOICE, value).apply()
  }

  // Live Vision voice preferences — device-level, not account data, so they
  // survive sign-out the same way haptics/theme do.
  fun getVoiceName(): String = prefs.getString(KEY_VOICE_NAME, "marin") ?: "marin"
  fun setVoiceName(value: String) {
    prefs.edit().putString(KEY_VOICE_NAME, value).apply()
  }

  fun getVoiceActivationMode(): String = prefs.getString(KEY_VOICE_ACTIVATION_MODE, "default") ?: "default"
  fun setVoiceActivationMode(value: String) {
    prefs.edit().putString(KEY_VOICE_ACTIVATION_MODE, value).apply()
  }

  fun getVoiceSpeed(): Float = prefs.getFloat(KEY_VOICE_SPEED, 1.0f)
  fun setVoiceSpeed(value: Float) {
    prefs.edit().putFloat(KEY_VOICE_SPEED, value).apply()
  }

  fun getVoiceOutputDevice(): String = prefs.getString(KEY_VOICE_OUTPUT_DEVICE, "speaker") ?: "speaker"
  fun setVoiceOutputDevice(value: String) {
    prefs.edit().putString(KEY_VOICE_OUTPUT_DEVICE, value).apply()
  }

  // Whether regular chat replies are read aloud with real OpenAI TTS audio
  // (the same voice picked above) instead of the free on-device engine.
  fun getPremiumChatVoiceEnabled(): Boolean = prefs.getBoolean(KEY_PREMIUM_CHAT_VOICE, false)
  fun setPremiumChatVoiceEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_PREMIUM_CHAT_VOICE, value).apply()
  }

  // One of PERSONALITY_OPTIONS' ids (assistant, therapist, romantic, ...) —
  // changes the live session's actual conversational tone server-side, not
  // just a UI label.
  fun getPersonality(): String = prefs.getString(KEY_PERSONALITY, "assistant") ?: "assistant"
  fun setPersonality(value: String) {
    prefs.edit().putString(KEY_PERSONALITY, value).apply()
  }

  fun getCustomPersonalityText(): String = prefs.getString(KEY_CUSTOM_PERSONALITY_TEXT, "") ?: ""
  fun setCustomPersonalityText(value: String) {
    prefs.edit().putString(KEY_CUSTOM_PERSONALITY_TEXT, value).apply()
  }

  /** One-time self-attestation gate before romantic/argumentative
   * personas can be selected — required since those change the AI's tone
   * to flirtatious/contrarian content meant for adult users. */
  fun getAgeConfirmed18Plus(): Boolean = prefs.getBoolean(KEY_AGE_CONFIRMED_18PLUS, false)
  fun setAgeConfirmed18Plus(value: Boolean) {
    prefs.edit().putBoolean(KEY_AGE_CONFIRMED_18PLUS, value).apply()
  }

  /** Permission gate for the Chat<->Quantara bridge (granted via the "+"
   * -> "Connect With ChatGiZa" sheet in Quantara). Off by default, and
   * deliberately NOT preserved across clear() (sign-out) -- this permission
   * is what lets chat replies reach a public feed under whichever account
   * is signed in, so a new sign-in on a shared device shouldn't silently
   * inherit it. */
  fun getChatGizaMediaConnected(): Boolean = prefs.getBoolean(KEY_CHATGIZA_MEDIA_CONNECTED, false)
  fun setChatGizaMediaConnected(value: Boolean) {
    prefs.edit().putBoolean(KEY_CHATGIZA_MEDIA_CONNECTED, value).apply()
  }

  fun getPersonalizeChatGiza(): Boolean = prefs.getBoolean(KEY_PERSONALIZE_CHATGIZA, true)
  fun setPersonalizeChatGiza(value: Boolean) {
    prefs.edit().putBoolean(KEY_PERSONALIZE_CHATGIZA, value).apply()
  }

  fun getChatLinkSharing(): Boolean = prefs.getBoolean(KEY_CHAT_LINK_SHARING, true)
  fun setChatLinkSharing(value: Boolean) {
    prefs.edit().putBoolean(KEY_CHAT_LINK_SHARING, value).apply()
  }

  fun getKidsModeEnabled(): Boolean = prefs.getBoolean(KEY_KIDS_MODE_ENABLED, false)
  fun setKidsModeEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_KIDS_MODE_ENABLED, value).apply()
  }

  fun getBlurMatureContentEnabled(): Boolean = prefs.getBoolean(KEY_BLUR_MATURE_CONTENT_ENABLED, true)
  fun setBlurMatureContentEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_BLUR_MATURE_CONTENT_ENABLED, value).apply()
  }

  // App Lock -- a device-local PIN gate shown whenever the app returns to
  // the foreground (see MainActivity.onStop/ChatViewModel.armAppLockIfEnabled),
  // independent of the signed-in account. Only the SHA-256 hash is stored,
  // never the PIN itself; this whole prefs file is already Keystore-backed
  // encrypted at rest, so a simple hash (vs. the backend password's scrypt)
  // is enough for what's a casual-snooper deterrent, not a network-facing
  // credential.
  fun getAppLockEnabled(): Boolean = prefs.getBoolean(KEY_APP_LOCK_ENABLED, false)
  fun getAppLockPinHash(): String? = prefs.getString(KEY_APP_LOCK_PIN_HASH, null)
  fun setAppLock(enabled: Boolean, pinHash: String?) {
    prefs.edit().putBoolean(KEY_APP_LOCK_ENABLED, enabled).putString(KEY_APP_LOCK_PIN_HASH, pinHash).apply()
  }

  /** Wipes the session but keeps device-level prefs (haptics, voice) that
   * aren't tied to any particular account. Deliberately does NOT preserve
   * the active personality — a new sign-in on a shared device should land
   * back on "neutral", not silently inherit the previous user's romantic/
   * argumentative choice. The 18+ attestation itself is a device-level fact
   * (not a persona choice), so it's kept to avoid re-prompting adults. */
  fun clear() {
    val hapticsEnabled = getHapticsEnabled()
    val hapticsOnPress = getHapticsOnPress()
    val hapticsOnResponse = getHapticsOnResponse()
    val pasteAsFileMode = getPasteAsFileMode()
    val themeMode = getThemeMode()
    val voiceName = getVoiceName()
    val voiceActivationMode = getVoiceActivationMode()
    val voiceSpeed = getVoiceSpeed()
    val voiceOutputDevice = getVoiceOutputDevice()
    val premiumChatVoiceEnabled = getPremiumChatVoiceEnabled()
    val ageConfirmed18Plus = getAgeConfirmed18Plus()
    val personalizeChatGiza = getPersonalizeChatGiza()
    val chatLinkSharing = getChatLinkSharing()
    val kidsModeEnabled = getKidsModeEnabled()
    val blurMatureContentEnabled = getBlurMatureContentEnabled()
    val appLockEnabled = getAppLockEnabled()
    val appLockPinHash = getAppLockPinHash()
    prefs.edit().clear().apply()
    setHapticsEnabled(hapticsEnabled)
    setHapticsOnPress(hapticsOnPress)
    setHapticsOnResponse(hapticsOnResponse)
    setPasteAsFileMode(pasteAsFileMode)
    setThemeMode(themeMode)
    setVoiceName(voiceName)
    setVoiceActivationMode(voiceActivationMode)
    setVoiceSpeed(voiceSpeed)
    setVoiceOutputDevice(voiceOutputDevice)
    setPremiumChatVoiceEnabled(premiumChatVoiceEnabled)
    setAgeConfirmed18Plus(ageConfirmed18Plus)
    setPersonalizeChatGiza(personalizeChatGiza)
    setChatLinkSharing(chatLinkSharing)
    setKidsModeEnabled(kidsModeEnabled)
    setBlurMatureContentEnabled(blurMatureContentEnabled)
    setAppLock(appLockEnabled, appLockPinHash)
  }

  companion object {
    private const val PREFS_NAME = "chatgiza_secure_prefs"
    private const val KEY_TOKEN = "mobile_token"
    private const val KEY_DEVICE_TRUST_TOKEN = "device_trust_token"
    private const val KEY_ID = "user_id"
    private const val KEY_NAME = "user_name"
    private const val KEY_EMAIL = "user_email"
    private const val KEY_IMAGE = "user_image"
    private const val KEY_REMEMBERED_NAME = "remembered_account_name"
    private const val KEY_REMEMBERED_EMAIL = "remembered_account_email"
    private const val KEY_REMEMBERED_IMAGE = "remembered_account_image"
    private const val KEY_PHONE = "user_phone"
    private const val KEY_HAPTICS_ENABLED = "haptics_enabled"
    private const val KEY_EXTRA_DARK_MODE = "extra_dark_mode"
    private const val KEY_HAPTICS_ON_PRESS = "haptics_on_press"
    private const val KEY_HAPTICS_ON_RESPONSE = "haptics_on_response"
    private const val KEY_PASTE_AS_FILE_MODE = "paste_as_file_mode"
    private const val KEY_PRIVATE_CHAT = "private_chat_json"
    private const val KEY_PRIVATE_CONVERSATIONS = "private_chat_conversations_json"
    private const val KEY_AVATAR_PRESET_ID = "avatar_preset_id"
    private const val KEY_AVATAR_NAME = "avatar_name"
    private const val KEY_ACTIVE_SUBACCOUNT_ID = "active_subaccount_id"
    private const val KEY_ACTIVE_SUBACCOUNT_NAME = "active_subaccount_name"
    private const val KEY_THEME_MODE = "theme_mode"
    private const val KEY_FONT_CHOICE = "font_choice"
    private const val KEY_VOICE_NAME = "voice_name"
    private const val KEY_VOICE_ACTIVATION_MODE = "voice_activation_mode"
    private const val KEY_VOICE_SPEED = "voice_speed"
    private const val KEY_VOICE_OUTPUT_DEVICE = "voice_output_device"
    private const val KEY_PREMIUM_CHAT_VOICE = "premium_chat_voice_enabled"
    private const val KEY_PERSONALITY = "personality"
    private const val KEY_CUSTOM_PERSONALITY_TEXT = "custom_personality_text"
    private const val KEY_AGE_CONFIRMED_18PLUS = "age_confirmed_18plus"
    private const val KEY_CHATGIZA_MEDIA_CONNECTED = "chatgiza_media_connected"
    private const val KEY_PERSONALIZE_CHATGIZA = "personalize_chatgiza_enabled"
    private const val KEY_CHAT_LINK_SHARING = "chat_link_sharing_enabled"
    private const val KEY_KIDS_MODE_ENABLED = "kids_mode_enabled"
    private const val KEY_BLUR_MATURE_CONTENT_ENABLED = "blur_mature_content_enabled"
    private const val KEY_APP_LOCK_ENABLED = "app_lock_enabled"
    private const val KEY_APP_LOCK_PIN_HASH = "app_lock_pin_hash"
    private const val KEY_PRIVATE_CHAT_PIN_HASH = "private_chat_pin_hash"
  }
}
