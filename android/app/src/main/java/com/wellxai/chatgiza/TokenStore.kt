package com.wellxai.chatgiza

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Encrypted on-device storage for the mobile bearer token — this is the
 * app's whole session; nothing else identifies the signed-in user locally. */
class TokenStore(context: Context) {
  private val prefs: SharedPreferences by lazy {
    val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()
    EncryptedSharedPreferences.create(
      context,
      "chatgiza_secure_prefs",
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  }

  fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

  fun setToken(token: String) {
    prefs.edit().putString(KEY_TOKEN, token).apply()
  }

  fun getUserName(): String? = prefs.getString(KEY_NAME, null)
  fun getUserEmail(): String? = prefs.getString(KEY_EMAIL, null)
  fun getUserImage(): String? = prefs.getString(KEY_IMAGE, null)

  fun setUser(name: String?, email: String?, image: String?) {
    prefs.edit()
      .putString(KEY_NAME, name)
      .putString(KEY_EMAIL, email)
      .putString(KEY_IMAGE, image)
      .apply()
  }

  fun getHapticsEnabled(): Boolean = prefs.getBoolean(KEY_HAPTICS_ENABLED, true)
  fun setHapticsEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_HAPTICS_ENABLED, value).apply()
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

  fun getThemeMode(): String = prefs.getString(KEY_THEME_MODE, "dark") ?: "dark"
  fun setThemeMode(value: String) {
    prefs.edit().putString(KEY_THEME_MODE, value).apply()
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

  /** Wipes the session but keeps device-level prefs (haptics, voice) that
   * aren't tied to any particular account. */
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
  }

  companion object {
    private const val KEY_TOKEN = "mobile_token"
    private const val KEY_NAME = "user_name"
    private const val KEY_EMAIL = "user_email"
    private const val KEY_IMAGE = "user_image"
    private const val KEY_HAPTICS_ENABLED = "haptics_enabled"
    private const val KEY_HAPTICS_ON_PRESS = "haptics_on_press"
    private const val KEY_HAPTICS_ON_RESPONSE = "haptics_on_response"
    private const val KEY_PASTE_AS_FILE_MODE = "paste_as_file_mode"
    private const val KEY_THEME_MODE = "theme_mode"
    private const val KEY_VOICE_NAME = "voice_name"
    private const val KEY_VOICE_ACTIVATION_MODE = "voice_activation_mode"
    private const val KEY_VOICE_SPEED = "voice_speed"
    private const val KEY_VOICE_OUTPUT_DEVICE = "voice_output_device"
  }
}
