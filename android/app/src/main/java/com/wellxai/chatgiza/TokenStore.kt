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

  fun clear() {
    prefs.edit().clear().apply()
  }

  companion object {
    private const val KEY_TOKEN = "mobile_token"
    private const val KEY_NAME = "user_name"
    private const val KEY_EMAIL = "user_email"
    private const val KEY_IMAGE = "user_image"
  }
}
