package com.wellxai.chatgiza

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.TimeUnit

/** Makes Scheduled Tasks actually do something -- until this, the feature
 * only ever stored a prompt + a time; nothing anywhere (web or Android)
 * ever checked whether a task was due and acted on it. Runs on a periodic
 * background schedule via WorkManager, so it keeps firing even when the
 * app itself isn't open, unlike a check that only ran while a screen was
 * visible. For each due task: asks the AI for a real reply to the saved
 * prompt, and posts an actual notification with the result -- a genuine
 * automated action, not just a reminder that a message *would* be sent. */
class ScheduledTaskWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

  companion object {
    private const val CHANNEL_ID = "scheduled_tasks"
    private const val WORK_NAME = "scheduled_tasks_check"
    // 15 minutes is WorkManager's minimum period for periodic work -- as
    // tight as this can run without switching to a foreground service,
    // which is a much heavier commitment than a background task feature
    // needs.
    private const val INTERVAL_MINUTES = 15L

    fun enqueuePeriodicWork(context: Context) {
      val request = PeriodicWorkRequestBuilder<ScheduledTaskWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        WORK_NAME,
        // KEEP -- don't restart (and lose the current cycle's timing) on
        // every app launch, just make sure it's scheduled at all.
        ExistingPeriodicWorkPolicy.KEEP,
        request
      )
    }
  }

  override suspend fun doWork(): Result {
    val tokenStore = TokenStore(applicationContext)
    val token = tokenStore.getToken() ?: return Result.success()

    val tasksResult = ChatGizaApi.getScheduled(token)
    val tasks = (tasksResult as? ApiResult.Success)?.value ?: return Result.success()

    val nowMs = System.currentTimeMillis()
    val dueTasks = tasks.filter { !it.fired && (runAtMillis(it.runAt) ?: Long.MAX_VALUE) <= nowMs }
    if (dueTasks.isEmpty()) return Result.success()

    val profileData = (ChatGizaApi.getProfile(token) as? ApiResult.Success)?.value

    ensureNotificationChannel()

    var updatedTasks = tasks
    for (task in dueTasks) {
      val reply = StringBuilder()
      runCatching {
        ChatGizaApi.streamChat(
          token = token,
          messages = listOf(ChatMessage("user", task.prompt)),
          tool = null,
          conversationId = null,
          profile = profileData?.profile ?: ApiProfile(),
          memory = if (profileData?.memoryEnabled == true) profileData.memory else emptyList(),
          language = profileData?.language ?: "",
          location = "",
          company = CompanyProfile()
        ) { chunk -> reply.append(chunk) }
      }
      postNotification(task.id, task.prompt, reply.toString().ifBlank { "Done." })
      updatedTasks = updatedTasks.map { if (it.id == task.id) it.copy(fired = true) else it }
    }
    ChatGizaApi.saveScheduled(token, updatedTasks)
    return Result.success()
  }

  // Mirrors how the app itself builds runAt when a task is created
  // (newTaskRunAt.trim().replaceFirst(" ", "T")) and how the web side
  // reads it (`new Date(runAt)`, local time, no "Z" suffix).
  private fun runAtMillis(runAt: String): Long? = runCatching {
    val normalized = runAt.trim().replaceFirst(" ", "T")
    val pattern = if (normalized.length <= 16) "yyyy-MM-dd'T'HH:mm" else "yyyy-MM-dd'T'HH:mm:ss"
    SimpleDateFormat(pattern, Locale.US).parse(normalized)?.time
  }.getOrNull()

  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Scheduled Tasks", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }
  }

  private fun postNotification(taskId: String, prompt: String, body: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val intent = Intent(applicationContext, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      applicationContext,
      taskId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_chatgiza_logo)
      .setContentTitle(prompt.take(60))
      .setContentText(body.take(120))
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .build()
    runCatching { manager.notify(taskId.hashCode(), notification) }
  }
}
