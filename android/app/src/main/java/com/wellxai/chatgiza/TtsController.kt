package com.wellxai.chatgiza

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
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
