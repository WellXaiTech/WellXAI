package com.wellxai.chatgiza

import android.app.Application
import android.content.Context
import android.util.Log
import java.util.Date

/**
 * Records the last uncaught exception to SharedPreferences before handing
 * off to the platform's default handler (which still crashes/reports the
 * process exactly as before) -- purely observational, changes no behavior.
 * Exists so a real stack trace can be pulled from the device via the
 * About Us > "Crash Log" row instead of guessing blind from a description
 * of when the crash happened.
 */
class ChatGizaApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      runCatching {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val trace = Log.getStackTraceString(throwable)
        prefs.edit().putString(KEY_LAST_CRASH, "${Date()}\n\n$trace").apply()
      }
      previousHandler?.uncaughtException(thread, throwable)
    }
  }

  companion object {
    private const val PREFS_NAME = "crash_log"
    private const val KEY_LAST_CRASH = "last_crash"

    fun lastCrash(context: Context): String? =
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_LAST_CRASH, null)
  }
}
