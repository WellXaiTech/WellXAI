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
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

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
    val dueTasks = tasks.filter { !it.fired && !it.paused && (runAtMillis(it.runAt) ?: Long.MAX_VALUE) <= nowMs }
    if (dueTasks.isEmpty()) return Result.success()

    val profileData = (ChatGizaApi.getProfile(token) as? ApiResult.Success)?.value

    ensureNotificationChannel()

    var updatedTasks = tasks
    for (task in dueTasks) {
      val reply = StringBuilder()
      // Same fold-in-then-send shape as a live chat attachment (see
      // ChatViewModel.sendMessage's apiText/imagesToSend) -- the text or
      // image captured at creation time rides along with the prompt on
      // this one-off request, it's never shown anywhere itself.
      val promptWithAttachment = if (task.attachmentText.isNotBlank()) {
        "${task.prompt}\n\n[Attached file: ${task.attachmentName}]\n${task.attachmentText}"
      } else {
        task.prompt
      }
      val imageDataUrls = if (task.attachmentImageDataUrl.isNotBlank()) listOf(task.attachmentImageDataUrl) else emptyList()
      runCatching {
        ChatGizaApi.streamChat(
          token = token,
          messages = listOf(ChatMessage("user", promptWithAttachment)),
          tool = null,
          conversationId = null,
          profile = profileData?.profile ?: ApiProfile(),
          memory = if (profileData?.memoryEnabled == true) profileData.memory else emptyList(),
          language = profileData?.language ?: "",
          location = "",
          company = CompanyProfile(),
          imageDataUrls = imageDataUrls
        ) { chunk -> reply.append(chunk) }
      }
      val body = reply.toString().ifBlank { "Done." }
      postNotification(task.id, task.prompt, body)
      // Reads the reminder aloud as a real voice note, on-device (no
      // network needed, works fully offline) -- separate from the AI reply
      // itself, which does need network and just falls back to "Done." above
      // when it can't be reached. The reminder text alone is still spoken
      // either way, so the user gets a real spoken alert offline too.
      speakReminderAloud(task.prompt)
      // recurrenceDays > 0 ("every Saturday" etc.) means this task should
      // come back, not stay done forever -- previously every fired task got
      // fired=true unconditionally, which permanently excluded it from the
      // dueTasks filter above (line 64: `!it.fired && ...`) regardless of
      // recurrence, so a repeating task only ever actually fired once. This
      // advances runAt to the next occurrence still ahead of now (skipping
      // straight past any cycles missed while the device was off, instead
      // of firing a burst of catch-up reminders) and leaves fired=false so
      // it's picked up again next time it's due.
      updatedTasks = updatedTasks.map {
        if (it.id != task.id) return@map it
        if (it.recurrenceDays > 0) {
          it.copy(fired = false, runAt = nextRunAt(it.runAt, it.recurrenceDays, nowMs))
        } else {
          it.copy(fired = true)
        }
      }
    }
    ChatGizaApi.saveScheduled(token, updatedTasks)
    return Result.success()
  }

  /** Speaks [text] using the free on-device TTS engine (same one
   * TtsController uses for "Read Aloud" in chat) so a fired reminder is a
   * real voice note, not just a silent notification -- works fully offline
   * since it never touches the network. Waits for the utterance to finish
   * (capped at 15s) so the worker doesn't tear down the engine mid-sentence,
   * but never blocks the reminder itself from firing if speech fails. */
  private suspend fun speakReminderAloud(text: String) {
    if (text.isBlank()) return
    runCatching {
      withTimeoutOrNull(15_000) {
        suspendCancellableCoroutine<Unit> { cont ->
          val tts = TtsController(applicationContext)
          tts.onDone = {
            tts.shutdown()
            if (cont.isActive) cont.resume(Unit)
          }
          // TtsController's TextToSpeech init is itself async -- give it a
          // moment before speaking, otherwise speak() silently no-ops
          // because `ready` hasn't flipped true yet.
          android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            tts.speak(text)
          }, 300)
          cont.invokeOnCancellation { tts.shutdown() }
        }
      }
    }
  }

  // Mirrors how the app itself builds runAt when a task is created
  // (newTaskRunAt.trim().replaceFirst(" ", "T")) and how the web side
  // reads it (`new Date(runAt)`, local time, no "Z" suffix).
  private fun runAtMillis(runAt: String): Long? = runCatching {
    val normalized = runAt.trim().replaceFirst(" ", "T")
    val pattern = if (normalized.length <= 16) "yyyy-MM-dd'T'HH:mm" else "yyyy-MM-dd'T'HH:mm:ss"
    SimpleDateFormat(pattern, Locale.US).parse(normalized)?.time
  }.getOrNull()

  // Advances a recurring task's runAt by recurrenceDays from its own last
  // scheduled time (not from "now"), so a "every Saturday at 9am" task stays
  // at 9am indefinitely instead of drifting later each cycle by however late
  // WorkManager's 15-minute polling happened to catch it. If the device was
  // off/offline through one or more whole cycles, this jumps straight to the
  // next occurrence still ahead of now rather than firing a burst of
  // catch-up reminders for every missed cycle in between.
  private fun nextRunAt(currentRunAt: String, recurrenceDays: Int, nowMs: Long): String {
    val dayMs = TimeUnit.DAYS.toMillis(recurrenceDays.toLong())
    var next = (runAtMillis(currentRunAt) ?: nowMs) + dayMs
    while (next <= nowMs) next += dayMs
    return SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).format(java.util.Date(next))
  }

  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Scheduled Tasks", NotificationManager.IMPORTANCE_DEFAULT).apply {
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 400, 200, 400)
        }
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
      .setVibrate(longArrayOf(0, 400, 200, 400))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()
    runCatching { manager.notify(taskId.hashCode(), notification) }
  }
}
