package com.wellxai.chatgiza

import android.content.Context
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.UUID

/** Reads ChatGiZa's replies aloud using the device's built-in text-to-speech
 * engine — no network call, no extra permission needed. */
class TtsController(context: Context) {
  private var engine: TextToSpeech? = null
  private var ready = false
  private val mainHandler = Handler(Looper.getMainLooper())

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

  fun speak(text: String) {
    if (!ready || text.isBlank()) return
    engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString())
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
}
