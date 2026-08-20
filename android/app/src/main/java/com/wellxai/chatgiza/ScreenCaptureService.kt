package com.wellxai.chatgiza

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Set from LiveVisionScreen while screen sharing is active, invoked from
 * ScreenShareActionReceiver when the user taps "Hang Up"/"Mute" on the
 * ongoing-share notification -- a plain in-process callback bridge (same
 * process, no IPC needed) rather than a broadcast payload carrying real
 * state, since the composable already owns the actual call/mute state.
 */
object LiveVisionCallBridge {
  var onHangUp: (() -> Unit)? = null
  var onToggleMute: (() -> Unit)? = null
}

/**
 * Reacts to the notification's action buttons. Registered dynamically by
 * ScreenCaptureService (not in the manifest) so its lifetime matches the
 * service's exactly -- no risk of a stale receiver reacting after the
 * share/call has already ended.
 */
class ScreenShareActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_HANGUP -> LiveVisionCallBridge.onHangUp?.invoke()
      ACTION_MUTE -> LiveVisionCallBridge.onToggleMute?.invoke()
    }
  }

  companion object {
    const val ACTION_HANGUP = "com.wellxai.chatgiza.SCREEN_SHARE_HANGUP"
    const val ACTION_MUTE = "com.wellxai.chatgiza.SCREEN_SHARE_MUTE"
  }
}

/**
 * A foreground service that exists to satisfy Android 14+'s requirement
 * that a foreground service of type "mediaProjection" be running before
 * MediaProjectionManager#getMediaProjection can be called. The actual
 * screen capture (VirtualDisplay/ImageReader, feeding frames into
 * RealtimeVisionController.sendFrame) is driven from LiveVisionScreen
 * itself -- this service just keeps the OS happy and shows the mandatory
 * "screen is being shared" notification, now an ongoing-call-style one
 * with a live timer and Hang Up/Mute actions (matching how other apps'
 * screen-share/call notifications look) for as long as it's alive.
 */
class ScreenCaptureService : Service() {
  private var receiver: ScreenShareActionReceiver? = null
  private var startedAt: Long = 0L
  private var muted: Boolean = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ChatGizaApplication.breadcrumb(this, "service: onCreate entered")
    instance = this
    startedAt = System.currentTimeMillis()
    // Found via breadcrumbs, not guessing: startForegroundService() is
    // async -- it only queues the service start -- and MainActivity used to
    // call getMediaProjection() on the very next line, before this
    // onCreate() had actually run. getMediaProjection() threw
    // SecurityException immediately (service not foreground yet), the
    // caller's failure handler called stopService() on a service that
    // hadn't even started yet, and THEN this onCreate() ran anyway and
    // called startForeground() successfully on a service already marked to
    // stop -- which is what the OS was actually rejecting as "didn't call
    // startForeground in time". onForegroundStarted lets the caller await
    // real confirmation instead of racing this.
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Screen sharing", NotificationManager.IMPORTANCE_LOW)
        )
      }
      ChatGizaApplication.breadcrumb(this, "service: channel ready, calling startForeground")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
      } else {
        startForeground(NOTIFICATION_ID, buildNotification())
      }
      ChatGizaApplication.breadcrumb(this, "service: startForeground returned OK")
      onForegroundStarted?.invoke()
      onForegroundStarted = null
    }.onFailure {
      ChatGizaApplication.breadcrumb(this, "service: startForeground FAILED: ${it}")
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
    ChatGizaApplication.breadcrumb(this, "service: onCreate finished")
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
      .setContentTitle("ChatGiZa is recording")
      .setOngoing(true)
      .setUsesChronometer(true)
      .setWhen(startedAt)
      .addAction(
        android.R.drawable.ic_menu_close_clear_cancel,
        "Hang Up",
        PendingIntent.getBroadcast(
          this,
          1,
          Intent(ScreenShareActionReceiver.ACTION_HANGUP).setPackage(packageName),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      .addAction(
        android.R.drawable.ic_lock_silent_mode,
        if (muted) "Unmute" else "Mute",
        PendingIntent.getBroadcast(
          this,
          0,
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
    private const val CHANNEL_ID = "screen_share"
    private const val NOTIFICATION_ID = 4201

    /** Set/cleared by onCreate/onDestroy -- lets LiveVisionScreen push mute
     * state changes into the running notification without needing a bound
     * connection just for that. */
    var instance: ScreenCaptureService? = null
      private set

    /** Fired once, right after startForeground() actually succeeds --
     * see the long comment in onCreate() for why this exists. Cleared
     * after firing so a stale callback from an earlier attempt can never
     * fire again. */
    var onForegroundStarted: (() -> Unit)? = null
  }
}
