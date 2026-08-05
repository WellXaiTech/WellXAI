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

  /** Wipes the session but keeps device-level prefs (haptics) that aren't
   * tied to any particular account. */
  fun clear() {
    val hapticsEnabled = getHapticsEnabled()
    val hapticsOnPress = getHapticsOnPress()
    val hapticsOnResponse = getHapticsOnResponse()
    val pasteAsFileMode = getPasteAsFileMode()
    prefs.edit().clear().apply()
    setHapticsEnabled(hapticsEnabled)
    setHapticsOnPress(hapticsOnPress)
    setHapticsOnResponse(hapticsOnResponse)
    setPasteAsFileMode(pasteAsFileMode)
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
  }
}
