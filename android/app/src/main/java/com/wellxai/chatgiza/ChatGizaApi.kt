package com.wellxai.chatgiza

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.util.concurrent.TimeUnit

data class ChatMessage(val role: String, val content: String)

data class MobileUser(val id: String, val name: String?, val email: String?, val image: String?)

data class AuthResult(val token: String, val user: MobileUser)

sealed class ApiResult<out T> {
  data class Success<T>(val value: T) : ApiResult<T>()
  data class Failure(val message: String) : ApiResult<Nothing>()
}

/** Talks to the ChatGiZa backend directly over HTTP — no WebView, no
 * embedded website, just the same REST endpoints the web app itself calls. */
object ChatGizaApi {
  private const val BASE_URL = "https://www.chatgiza.com"
  private val JSON = "application/json; charset=utf-8".toMediaType()

  private val client = OkHttpClient.Builder()
    .connectTimeout(20, TimeUnit.SECONDS)
    .readTimeout(90, TimeUnit.SECONDS)
    .writeTimeout(20, TimeUnit.SECONDS)
    .build()

  suspend fun mobileAuth(idToken: String): ApiResult<AuthResult> = withContext(Dispatchers.IO) {
    try {
      val body = JSONObject().put("idToken", idToken).toString().toRequestBody(JSON)
      val request = Request.Builder().url("$BASE_URL/api/mobile/auth").post(body).build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        val userJson = json.getJSONObject("user")
        ApiResult.Success(
          AuthResult(
            token = json.getString("token"),
            user = MobileUser(
              id = userJson.getString("id"),
              name = userJson.optString("name", null),
              email = userJson.optString("email", null),
              image = userJson.optString("image", null)
            )
          )
        )
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  /** Streams the assistant's reply, invoking [onChunk] for each piece of text
   * as it arrives (the backend sends plain incremental text, not SSE). */
  suspend fun streamChat(token: String, messages: List<ChatMessage>, onChunk: (String) -> Unit): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val messagesJson = JSONArray()
        for (m in messages) {
          messagesJson.put(JSONObject().put("role", m.role).put("content", m.content))
        }
        val payload = JSONObject().put("messages", messagesJson).toString().toRequestBody(JSON)
        val request = Request.Builder()
          .url("$BASE_URL/api/chat")
          .header("Authorization", "Bearer $token")
          .post(payload)
          .build()

        client.newCall(request).execute().use { response ->
          if (!response.isSuccessful) {
            val text = response.body?.string().orEmpty()
            return@withContext ApiResult.Failure(errorMessage(text, response.code))
          }
          val source = response.body?.byteStream() ?: return@withContext ApiResult.Failure("Empty response")
          val reader = BufferedReader(source.reader(Charsets.UTF_8))
          val buffer = CharArray(512)
          while (true) {
            val read = reader.read(buffer)
            if (read == -1) break
            if (read > 0) onChunk(String(buffer, 0, read))
          }
          ApiResult.Success(Unit)
        }
      } catch (e: Exception) {
        ApiResult.Failure(e.message ?: "Network error")
      }
    }

  private fun errorMessage(body: String, code: Int): String {
    return try {
      JSONObject(body).optString("error", "Request failed ($code)")
    } catch (e: Exception) {
      "Request failed ($code)"
    }
  }
}
