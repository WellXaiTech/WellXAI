package com.wellxai.chatgiza

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Shows the same ongoing-call-style notification (chronometer, Hang Up,
 * Mute) that ScreenCaptureService already shows, but for ANY active Live
 * Vision voice session -- ScreenCaptureService only exists to satisfy the
 * mediaProjection foreground-service requirement while screen sharing, so
 * a plain voice-only Live call had no persistent notification at all.
 * Deliberately its own notification id (not shared with ScreenCaptureService):
 * two different Service instances both calling startForeground() with the
 * same id would make stopping either one liable to remove the notification
 * out from under the other if both happened to be running together.
 */
class LiveCallService : Service() {
  private var receiver: ScreenShareActionReceiver? = null
  private var startedAt: Long = 0L
  private var muted: Boolean = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    startedAt = System.currentTimeMillis()
    // startForeground() must run first -- see the matching note in
    // ScreenCaptureService.onCreate() for why everything else (the
    // receiver) is deferred until after it succeeds.
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Live conversation", NotificationManager.IMPORTANCE_LOW)
        )
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
      } else {
        startForeground(NOTIFICATION_ID, buildNotification())
      }
    }.onFailure {
      stopSelf()
      return
    }
    runCatching {
      val r = ScreenShareActionReceiver()
      receiver = r
      val filter = IntentFilter().apply {
        addAction(ScreenShareActionReceiver.ACTION_HANGUP)
        addAction(ScreenShareActionReceiver.ACTION_MUTE)
      }
      ContextCompat.registerReceiver(this, r, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }
  }

  /** Called from LiveVisionScreen whenever mic-mute state changes so the
   * notification's "Mute"/"Unmute" label stays in sync with reality. */
  fun setMuted(isMuted: Boolean) {
    muted = isMuted
    runCatching {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.notify(NOTIFICATION_ID, buildNotification())
    }
  }

  private fun buildNotification() =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_chatgiza_logo)
      .setContentTitle("ChatGiZa")
      .setContentText("Listening…")
      .setOngoing(true)
      .setUsesChronometer(true)
      .setWhen(startedAt)
      .addAction(
        android.R.drawable.ic_menu_close_clear_cancel,
        "Hang Up",
        PendingIntent.getBroadcast(
          this,
          11,
          Intent(ScreenShareActionReceiver.ACTION_HANGUP).setPackage(packageName),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      .addAction(
        android.R.drawable.ic_lock_silent_mode,
        if (muted) "Unmute" else "Mute",
        PendingIntent.getBroadcast(
          this,
          10,
          Intent(ScreenShareActionReceiver.ACTION_MUTE).setPackage(packageName),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      .build()

  override fun onDestroy() {
    super.onDestroy()
    receiver?.let { runCatching { unregisterReceiver(it) } }
    receiver = null
    if (instance === this) instance = null
  }

  companion object {
    private const val CHANNEL_ID = "live_call"
    private const val NOTIFICATION_ID = 4301

    /** Set/cleared by onCreate/onDestroy -- lets LiveVisionScreen push mute
     * state changes into the running notification. */
    var instance: LiveCallService? = null
      private set
  }
}
