package com.wellxai.chatgiza

import com.google.android.gms.tasks.Task
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Idea #4: on-device AI for real privacy. Detects whether a message is
 * already Swahili or English, then translates it to the other one --
 * entirely on the phone via ML Kit. The only thing that ever touches the
 * network is a one-time download of the generic (same for every user)
 * language pack; the actual message text is never sent anywhere for this
 * feature, unlike the rest of the app, which sends messages to the cloud
 * model to get a reply at all. */
object OnDeviceTranslator {
  private val languageIdentifier by lazy { LanguageIdentification.getClient() }
  private var cachedTranslator: Translator? = null
  private var cachedTargetIsSwahili: Boolean? = null

  private fun translatorFor(targetIsSwahili: Boolean): Translator {
    val existing = cachedTranslator
    if (existing != null && cachedTargetIsSwahili == targetIsSwahili) return existing
    existing?.close()
    val options = TranslatorOptions.Builder()
      .setSourceLanguage(if (targetIsSwahili) TranslateLanguage.ENGLISH else TranslateLanguage.SWAHILI)
      .setTargetLanguage(if (targetIsSwahili) TranslateLanguage.SWAHILI else TranslateLanguage.ENGLISH)
      .build()
    return Translation.getClient(options).also {
      cachedTranslator = it
      cachedTargetIsSwahili = targetIsSwahili
    }
  }

  suspend fun translate(text: String): Result<String> = runCatching {
    val detected = awaitTask(languageIdentifier.identifyLanguage(text))
    val looksSwahili = detected == "sw"
    val translator = translatorFor(targetIsSwahili = !looksSwahili)
    awaitTask(translator.downloadModelIfNeeded(DownloadConditions.Builder().build()))
    awaitTask(translator.translate(text))
  }

  private suspend fun <T> awaitTask(task: Task<T>): T = suspendCancellableCoroutine { cont ->
    task
      .addOnSuccessListener { if (cont.isActive) cont.resume(it) }
      .addOnFailureListener { if (cont.isActive) cont.resumeWithException(it) }
  }
}
