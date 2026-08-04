package com.wellxai.chatgiza

import android.content.Context
import android.speech.tts.TextToSpeech

/** Reads ChatGiZa's replies aloud using the device's built-in text-to-speech
 * engine — no network call, no extra permission needed. */
class TtsController(context: Context) {
  private var engine: TextToSpeech? = null
  private var ready = false

  init {
    engine = TextToSpeech(context.applicationContext) { status ->
      ready = status == TextToSpeech.SUCCESS
    }
  }

  fun speak(text: String) {
    if (!ready || text.isBlank()) return
    engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "chatgiza_reply")
  }

  fun stop() {
    engine?.stop()
  }

  fun shutdown() {
    engine?.stop()
    engine?.shutdown()
  }
}
