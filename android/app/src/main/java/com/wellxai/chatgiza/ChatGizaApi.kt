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

data class ApiMessage(val id: String, val role: String, val content: String, val createdAt: Long?)

data class ApiConversation(
  val id: String,
  val title: String,
  val messages: List<ApiMessage>,
  val pinned: Boolean = false
)

data class ApiProfile(
  val nickname: String = "",
  val about: String = "",
  val role: String? = null,
  val fullName: String? = null,
  val birthDate: String? = null,
  val country: String? = null
)

data class ProfileData(
  val profile: ApiProfile = ApiProfile(),
  val memory: List<String> = emptyList(),
  val memoryEnabled: Boolean = true,
  val language: String = ""
)

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

  suspend fun getHistory(token: String): ApiResult<List<ApiConversation>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/history")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        val arr = json.optJSONArray("conversations") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i -> conversationFromJson(arr.getJSONObject(i)) })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveHistory(token: String, conversations: List<ApiConversation>): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val arr = JSONArray()
        for (c in conversations) arr.put(conversationToJson(c))
        val payload = JSONObject().put("conversations", arr).toString().toRequestBody(JSON)
        val request = Request.Builder()
          .url("$BASE_URL/api/history")
          .header("Authorization", "Bearer $token")
          .put(payload)
          .build()
        client.newCall(request).execute().use { response ->
          if (!response.isSuccessful) {
            val text = response.body?.string().orEmpty()
            return@withContext ApiResult.Failure(errorMessage(text, response.code))
          }
          ApiResult.Success(Unit)
        }
      } catch (e: Exception) {
        ApiResult.Failure(e.message ?: "Network error")
      }
    }

  suspend fun getProfile(token: String): ApiResult<ProfileData> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/profile")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(profileDataFromJson(JSONObject(text)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveProfile(token: String, data: ProfileData): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = profileDataToJson(data).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile")
        .header("Authorization", "Bearer $token")
        .put(payload)
        .build()
      client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
          val text = response.body?.string().orEmpty()
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(Unit)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  private fun profileDataFromJson(obj: JSONObject): ProfileData {
    val profileObj = obj.optJSONObject("profile") ?: JSONObject()
    val memoryArr = obj.optJSONArray("memory") ?: JSONArray()
    return ProfileData(
      profile = ApiProfile(
        nickname = profileObj.optString("nickname", ""),
        about = profileObj.optString("about", ""),
        role = profileObj.optString("role", null),
        fullName = profileObj.optString("fullName", null),
        birthDate = profileObj.optString("birthDate", null),
        country = profileObj.optString("country", null)
      ),
      memory = (0 until memoryArr.length()).map { memoryArr.getString(it) },
      memoryEnabled = obj.optBoolean("memoryEnabled", true),
      language = obj.optString("language", "")
    )
  }

  private fun profileDataToJson(data: ProfileData): JSONObject {
    val profileObj = JSONObject()
      .put("nickname", data.profile.nickname)
      .put("about", data.profile.about)
    data.profile.role?.let { profileObj.put("role", it) }
    data.profile.fullName?.let { profileObj.put("fullName", it) }
    data.profile.birthDate?.let { profileObj.put("birthDate", it) }
    data.profile.country?.let { profileObj.put("country", it) }

    val memoryArr = JSONArray()
    for (m in data.memory) memoryArr.put(m)

    return JSONObject()
      .put("profile", profileObj)
      .put("memory", memoryArr)
      .put("memoryEnabled", data.memoryEnabled)
      .put("language", data.language)
  }

  private fun conversationFromJson(obj: JSONObject): ApiConversation {
    val messagesArr = obj.optJSONArray("messages") ?: JSONArray()
    val messages = (0 until messagesArr.length()).map { i ->
      val m = messagesArr.getJSONObject(i)
      ApiMessage(
        id = m.optString("id", java.util.UUID.randomUUID().toString()),
        role = m.optString("role", "user"),
        content = m.optString("content", ""),
        createdAt = if (m.has("createdAt") && !m.isNull("createdAt")) m.optLong("createdAt") else null
      )
    }
    return ApiConversation(
      id = obj.getString("id"),
      title = obj.optString("title", "New chat"),
      messages = messages,
      pinned = obj.optBoolean("pinned", false)
    )
  }

  private fun conversationToJson(c: ApiConversation): JSONObject {
    val messagesArr = JSONArray()
    for (m in c.messages) {
      val mj = JSONObject().put("id", m.id).put("role", m.role).put("content", m.content)
      if (m.createdAt != null) mj.put("createdAt", m.createdAt)
      messagesArr.put(mj)
    }
    return JSONObject()
      .put("id", c.id)
      .put("title", c.title)
      .put("pinned", c.pinned)
      .put("messages", messagesArr)
  }

  private fun errorMessage(body: String, code: Int): String {
    return try {
      JSONObject(body).optString("error", "Request failed ($code)")
    } catch (e: Exception) {
      "Request failed ($code)"
    }
  }
}
