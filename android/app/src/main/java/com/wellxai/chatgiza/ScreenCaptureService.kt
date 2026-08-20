package com.wellxai.chatgiza

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * A no-op foreground service that exists purely to satisfy Android 14+'s
 * requirement that a foreground service of type "mediaProjection" be
 * running before MediaProjectionManager#getMediaProjection can be called.
 * The actual screen capture (VirtualDisplay/ImageReader, feeding frames
 * into RealtimeVisionController.sendFrame) is driven from LiveVisionScreen
 * itself -- this service just keeps the OS happy and shows the mandatory
 * "screen is being shared" notification for as long as it's alive.
 */
class ScreenCaptureService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Screen sharing", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_chatgiza_logo)
      .setContentTitle("ChatGiZa is sharing your screen")
      .setContentText("GiZa can see what's on your screen during this Live Vision call.")
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  companion object {
    private const val CHANNEL_ID = "screen_share"
    private const val NOTIFICATION_ID = 4201
  }
}
