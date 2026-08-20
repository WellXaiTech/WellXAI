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
 *
 * The Share Screen crash (ForegroundServiceDidNotStartInTimeException) is
 * thrown remotely by ActivityThread, not by any call our code makes -- its
 * stack trace is always the same generic system-delivery frames, with none
 * of our own code in it. [breadcrumb] exists to see what our code was
 * actually doing in the moments before that remote kill, since the
 * exception itself can't show that.
 */
class ChatGizaApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      runCatching {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val trace = Log.getStackTraceString(throwable)
        val trail = prefs.getString(KEY_BREADCRUMBS, null)
        val body = if (trail != null) "$trace\n\n--- breadcrumbs ---\n$trail" else trace
        prefs.edit().putString(KEY_LAST_CRASH, "${Date()}\n\n$body").apply()
      }
      previousHandler?.uncaughtException(thread, throwable)
    }
  }

  companion object {
    private const val PREFS_NAME = "crash_log"
    private const val KEY_LAST_CRASH = "last_crash"
    private const val KEY_BREADCRUMBS = "breadcrumbs"
    private const val MAX_BREADCRUMBS = 20

    fun lastCrash(context: Context): String? =
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_LAST_CRASH, null)

    /** Appends a timestamped line to a rolling trail so a later crash's
     * report can show what led up to it. Kept short and capped so it never
     * grows into something worth worrying about performance-wise. */
    fun breadcrumb(context: Context, tag: String) {
      runCatching {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_BREADCRUMBS, "")!!.lines().filter { it.isNotBlank() }
        val updated = (existing + "${Date()} $tag").takeLast(MAX_BREADCRUMBS)
        prefs.edit().putString(KEY_BREADCRUMBS, updated.joinToString("\n")).apply()
      }
    }
  }
}
