package com.wellxai.chatgiza

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.max

/**
 * Drives a live, two-way voice+vision conversation with OpenAI's Realtime
 * API: streams the phone's microphone in, streams the model's spoken reply
 * out, and periodically sends camera frames so the model can see what the
 * camera sees. Connects directly from the device to OpenAI over WebSocket
 * (not through our own backend — audio/video is too latency-sensitive to
 * relay), using a short-lived token our backend mints via /api/realtime/session.
 *
 * Server-side voice activity detection (VAD) is left on its OpenAI default,
 * so we never have to decide client-side when the user has finished
 * talking — we just keep streaming mic audio continuously, and the server
 * decides when to reply (and lets the user interrupt it by talking again).
 */
class RealtimeVisionController(
  context: Context,
  private val tokenStore: TokenStore,
  private val scope: CoroutineScope
) {
  private val appContext = context.applicationContext
  private val audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var previousAudioMode = AudioManager.MODE_NORMAL

  var connectionState by mutableStateOf(ConnectionState.Idle)
    private set
  var isAiSpeaking by mutableStateOf(false)
    private set
  var errorMessage by mutableStateOf<String?>(null)
    private set

  enum class ConnectionState { Idle, Connecting, Listening }

  private val client = OkHttpClient.Builder()
    .readTimeout(0, TimeUnit.MILLISECONDS)
    .build()

  private var webSocket: WebSocket? = null
  private var audioRecord: AudioRecord? = null
  private var audioTrack: AudioTrack? = null
  private var captureJob: Job? = null
  private var connectJob: Job? = null

  // Tracks the assistant item currently being spoken, and how much of its
  // audio we've actually written to the speaker — needed to tell the server
  // exactly where playback was cut off when the user barges in.
  private var currentAssistantItemId: String? = null
  private var playedAudioBytes: Long = 0

  private val sampleRate = 24000

  fun start(language: String) {
    if (connectionState != ConnectionState.Idle) return
    connectionState = ConnectionState.Connecting
    errorMessage = null

    // MODE_IN_COMMUNICATION pairs with USAGE_VOICE_COMMUNICATION on the
    // playback side (started once the socket is open) so the platform can
    // apply echo cancellation between them — without it, the mic tends to
    // pick up the AI's own voice as if the user said it, garbling turns.
    // Route to the speaker since the user is holding the phone up to look
    // through the camera, not holding it to their ear.
    previousAudioMode = audioManager.mode
    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
    audioManager.isSpeakerphoneOn = true

    connectJob = scope.launch {
      val token = tokenStore.getToken()
      if (token == null) {
        errorMessage = "Not signed in"
        connectionState = ConnectionState.Idle
        return@launch
      }
      when (val result = ChatGizaApi.getRealtimeToken(token, language)) {
        is ApiResult.Success -> openSocket(result.value)
        is ApiResult.Failure -> {
          errorMessage = result.message
          connectionState = ConnectionState.Idle
        }
      }
    }
  }

  private fun openSocket(ephemeralToken: String) {
    val request = Request.Builder()
      .url("wss://api.openai.com/v1/realtime?model=gpt-realtime")
      .addHeader("Sec-WebSocket-Protocol", "realtime, openai-insecure-api-key.$ephemeralToken")
      .build()

    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        connectionState = ConnectionState.Listening
        startAudioCapture()
        startAudioPlayback()
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        handleServerEvent(text)
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        errorMessage = t.message ?: "Connection lost"
        stopInternal()
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        stopInternal()
      }
    })
  }

  private fun handleServerEvent(text: String) {
    val json = runCatching { JSONObject(text) }.getOrNull() ?: return
    when (json.optString("type")) {
      "response.output_audio.delta" -> {
        isAiSpeaking = true
        val itemId = json.optString("item_id", null)
        if (itemId != null) currentAssistantItemId = itemId
        val delta = json.optString("delta", "")
        if (delta.isNotEmpty()) {
          val bytes = Base64.decode(delta, Base64.NO_WRAP)
          playedAudioBytes += bytes.size
          audioTrack?.write(bytes, 0, bytes.size)
        }
      }
      "response.output_audio.done", "response.done" -> {
        isAiSpeaking = false
        currentAssistantItemId = null
        playedAudioBytes = 0
      }
      // Server-side VAD fires this the instant it hears the user start
      // talking — this is the actual barge-in signal. The server already
      // cancels its own in-progress response (interrupt_response is on by
      // default), so our job is purely local: stop the speaker output
      // immediately (don't wait for it to finish its sentence), and tell
      // the server exactly how much of its last reply we actually played
      // so it doesn't think we heard words we cut off.
      "input_audio_buffer.speech_started" -> handleBargeIn()
      "error" -> {
        val message = json.optJSONObject("error")?.optString("message") ?: "Realtime error"
        errorMessage = message
      }
    }
  }

  private fun handleBargeIn() {
    audioTrack?.let {
      runCatching {
        it.pause()
        it.flush()
        it.play()
      }
    }
    val itemId = currentAssistantItemId
    if (itemId != null && playedAudioBytes > 0) {
      val playedMs = (playedAudioBytes / 2) * 1000 / sampleRate
      val truncateEvent = JSONObject()
        .put("type", "conversation.item.truncate")
        .put("item_id", itemId)
        .put("content_index", 0)
        .put("audio_end_ms", playedMs)
      webSocket?.send(truncateEvent.toString())
    }
    isAiSpeaking = false
    currentAssistantItemId = null
    playedAudioBytes = 0
  }

  fun reportCameraError(message: String) {
    errorMessage = message
  }

  /** Sends one camera frame as a still image the model can see, alongside
   * the continuous audio — this is how "live video" actually works with
   * this API (periodic frames, not a literal video codec stream). */
  fun sendFrame(jpegBytes: ByteArray) {
    val socket = webSocket ?: return
    val b64 = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
    val event = JSONObject()
      .put("type", "conversation.item.create")
      .put(
        "item",
        JSONObject()
          .put("type", "message")
          .put("role", "user")
          .put(
            "content",
            JSONArray().put(
              JSONObject()
                .put("type", "input_image")
                .put("image_url", "data:image/jpeg;base64,$b64")
            )
          )
      )
    socket.send(event.toString())
  }

  private fun startAudioCapture() {
    val minBuf = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (minBuf <= 0) {
      errorMessage = "Microphone not available"
      return
    }
    val bufferSize = max(minBuf, 4096)
    val record = try {
      AudioRecord(
        MediaRecorder.AudioSource.VOICE_COMMUNICATION,
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
      )
    } catch (e: SecurityException) {
      errorMessage = "Microphone permission missing"
      return
    }
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      errorMessage = "Microphone not available"
      return
    }
    audioRecord = record
    record.startRecording()

    captureJob = scope.launch(Dispatchers.IO) {
      val buffer = ByteArray(bufferSize)
      while (audioRecord != null) {
        val read = record.read(buffer, 0, buffer.size)
        if (read > 0) {
          val chunk = buffer.copyOf(read)
          val b64 = Base64.encodeToString(chunk, Base64.NO_WRAP)
          val event = JSONObject().put("type", "input_audio_buffer.append").put("audio", b64)
          webSocket?.send(event.toString())
        }
      }
    }
  }

  private fun startAudioPlayback() {
    val minBuf = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val track = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setSampleRate(sampleRate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .build()
      )
      .setBufferSizeInBytes(max(minBuf, 4096) * 4)
      .setTransferMode(AudioTrack.MODE_STREAM)
      .build()
    audioTrack = track
    track.play()
  }

  fun stop() {
    connectJob?.cancel()
    webSocket?.close(1000, "User left")
    stopInternal()
  }

  private fun stopInternal() {
    captureJob?.cancel()
    captureJob = null
    audioRecord?.let {
      runCatching { it.stop() }
      it.release()
    }
    audioRecord = null
    audioTrack?.let {
      runCatching { it.stop() }
      it.release()
    }
    audioTrack = null
    webSocket = null
    isAiSpeaking = false
    currentAssistantItemId = null
    playedAudioBytes = 0
    connectionState = ConnectionState.Idle
    audioManager.isSpeakerphoneOn = false
    audioManager.mode = previousAudioMode
  }
}
