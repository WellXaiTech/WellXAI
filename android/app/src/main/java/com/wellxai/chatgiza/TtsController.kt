package com.wellxai.chatgiza

import android.content.Context
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.google.android.gms.tasks.Task
import com.google.mlkit.nl.languageid.LanguageIdentification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.Locale
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Reads ChatGiZa's replies aloud using the device's built-in text-to-speech
 * engine — no network call for the speech itself, no extra permission
 * needed. */
class TtsController(context: Context) {
  private var engine: TextToSpeech? = null
  private var ready = false
  private val mainHandler = Handler(Looper.getMainLooper())
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  // Same on-device model OnDeviceTranslator.kt already uses -- recognizes
  // 100+ languages, ships bundled with the library (no separate download
  // step, unlike Translation's per-language packs), and is dramatically
  // more accurate than guessing from a hardcoded word list.
  private val languageIdentifier by lazy { LanguageIdentification.getClient() }
  private var currentEngineLocale: Locale? = null

  /** Invoked (on the main thread) when the current utterance finishes or
   * errors out, so the UI can reset whichever "speaking" toggle it showed. */
  var onDone: (() -> Unit)? = null

  init {
    engine = TextToSpeech(context.applicationContext) { status ->
      ready = status == TextToSpeech.SUCCESS
      if (ready) {
        engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(utteranceId: String?) {}
          override fun onDone(utteranceId: String?) {
            mainHandler.post { onDone?.invoke() }
          }
          @Deprecated("Deprecated in Java")
          override fun onError(utteranceId: String?) {
            mainHandler.post { onDone?.invoke() }
          }
        })
      }
    }
  }

  // The free on-device engine defaults to whatever language it started in
  // and stays there for every utterance regardless of what's actually being
  // read -- locking it to one language (even a correctly-detected one)
  // mispronounces every reply in any other language just as badly. Detects
  // this specific message's actual language via ML Kit (any of the 100+ it
  // knows, not just Kiswahili) and switches the engine to match, but only
  // when that language's voice data is actually installed on this device;
  // otherwise keeps the current voice unchanged (most devices only ship a
  // handful of languages' worth of free TTS data -- Premium Voice in
  // Settings is the reliable fix for anything not installed locally).
  fun speak(text: String) {
    if (!ready || text.isBlank()) return
    scope.launch {
      runCatching {
        val bcp47 = awaitTask(languageIdentifier.identifyLanguage(text))
        if (bcp47 != "und") {
          val locale = Locale.forLanguageTag(bcp47)
          if (locale != currentEngineLocale) {
            val availability = engine?.isLanguageAvailable(locale) ?: TextToSpeech.LANG_NOT_SUPPORTED
            if (availability >= TextToSpeech.LANG_AVAILABLE) {
              engine?.language = locale
              currentEngineLocale = locale
            }
          }
        }
      }
      engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString())
    }
  }

  private suspend fun <T> awaitTask(task: Task<T>): T = suspendCancellableCoroutine { cont ->
    task
      .addOnSuccessListener { if (cont.isActive) cont.resume(it) }
      .addOnFailureListener { if (cont.isActive) cont.resumeWithException(it) }
  }

  fun stop() {
    engine?.stop()
  }

  fun shutdown() {
    engine?.stop()
    engine?.shutdown()
  }
}

/** Plays real OpenAI TTS audio (MP3 bytes already fetched from /api/tts)
 * for the Premium Voice setting, instead of the free on-device engine. */
class PremiumTtsPlayer(private val context: Context) {
  private var player: MediaPlayer? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  /** Writes [bytes] to a cache file and plays it. Safe to call from the
   * main thread — the file write happens on a background thread, and
   * MediaPlayer is prepared asynchronously (prepareAsync), so nothing
   * here blocks the caller. */
  fun play(bytes: ByteArray, onDone: () -> Unit, onError: () -> Unit) {
    stop()
    Thread {
      try {
        val file = File.createTempFile("chatgiza_tts_", ".mp3", context.cacheDir)
        file.deleteOnExit()
        file.writeBytes(bytes)
        val mp = MediaPlayer()
        mp.setDataSource(file.absolutePath)
        mp.setOnPreparedListener { it.start() }
        mp.setOnCompletionListener {
          file.delete()
          it.release()
          if (player === it) player = null
          mainHandler.post(onDone)
        }
        mp.setOnErrorListener { mpErr, _, _ ->
          file.delete()
          mpErr.release()
          if (player === mpErr) player = null
          mainHandler.post(onError)
          true
        }
        player = mp
        mp.prepareAsync()
      } catch (e: Exception) {
        mainHandler.post(onError)
      }
    }.start()
  }

  fun stop() {
    player?.let {
      try {
        it.stop()
      } catch (e: Exception) {
        // Already stopped/released — nothing to do.
      }
      it.release()
    }
    player = null
  }

  /** These four back the scrubbable now-playing bar -- pause/resume keep
   * the same MediaPlayer instance (unlike stop, which releases it), so
   * scrubbing and resuming mid-message actually works. */
  fun pause() {
    runCatching { player?.takeIf { it.isPlaying }?.pause() }
  }

  fun resume() {
    runCatching { player?.start() }
  }

  fun seekTo(ms: Int) {
    runCatching { player?.seekTo(ms) }
  }

  fun isCurrentlyPlaying(): Boolean = runCatching { player?.isPlaying }.getOrNull() ?: false

  fun currentPositionMs(): Int = runCatching { player?.currentPosition }.getOrNull() ?: 0

  fun durationMs(): Int = runCatching { player?.duration }.getOrNull()?.coerceAtLeast(0) ?: 0
}
