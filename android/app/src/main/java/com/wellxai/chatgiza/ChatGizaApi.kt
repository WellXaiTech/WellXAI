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

data class HistorySnapshot(val conversations: List<ApiConversation>, val deletedIds: Map<String, Long>)

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

data class PrivacyPrefs(
  val improveModel: Boolean = false,
  val includeAudioRecordings: Boolean = false,
  val includeVideoRecordings: Boolean = false,
  val marketingMeasurement: Boolean = true,
  val personalizedMarketing: Boolean = true
)

data class CompanyEmployee(val name: String = "", val role: String = "")

data class CompanyProfile(
  val name: String = "",
  val description: String = "",
  val employees: List<CompanyEmployee> = emptyList()
)

data class CompanyRequest(
  val id: String,
  val customerName: String,
  val note: String,
  val status: String,
  val createdAt: Long
)

data class PluginsState(
  val webSearch: Boolean = true,
  val deepResearch: Boolean = true,
  val deepThink: Boolean = true,
  val image: Boolean = true,
  val video: Boolean = true,
  val documentWriter: Boolean = true,
  val sqlHelper: Boolean = true,
  val pythonHelper: Boolean = true,
  val businessAssistant: Boolean = true
)

data class SettingsData(
  val plugins: PluginsState = PluginsState(),
  val notifyOnComplete: Boolean = true,
  val notifyImageGen: Boolean = true,
  val allNotificationsEnabled: Boolean = true,
  val privacy: PrivacyPrefs = PrivacyPrefs(),
  val location: String = "",
  val company: CompanyProfile = CompanyProfile(),
  val companyRequests: List<CompanyRequest> = emptyList()
)

data class ApiProject(val id: String, val name: String, val createdAt: Long?)

data class ApiScheduledTask(val id: String, val prompt: String, val runAt: String, val fired: Boolean)

data class BillingSubscription(
  val tier: String?,
  val planName: String,
  val currentPeriodEnd: Long?,
  val cancelAtPeriodEnd: Boolean
)

data class BillingSummary(val subscription: BillingSubscription?)

data class ApiMediaPost(
  val id: String,
  val authorId: String,
  val authorName: String,
  val authorImage: String?,
  val text: String,
  val imageDataUrl: String?,
  val sentiment: String?,
  val createdAt: Long,
  val likeCount: Int,
  val likedByMe: Boolean,
  val commentCount: Int
)

data class ApiMediaComment(
  val id: String,
  val authorId: String,
  val authorName: String,
  val authorImage: String?,
  val text: String,
  val createdAt: Long
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
   * as it arrives (the backend sends plain incremental text, not SSE). Same
   * payload shape as the web app's /api/chat call, so tool selection and
   * personalization (profile/memory/language/location/company) behave
   * identically on both. */
  suspend fun streamChat(
    token: String,
    messages: List<ChatMessage>,
    tool: String?,
    conversationId: String?,
    profile: ApiProfile,
    memory: List<String>,
    language: String,
    location: String,
    company: CompanyProfile,
    onChunk: (String) -> Unit
  ): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val messagesJson = JSONArray()
        for (m in messages) {
          messagesJson.put(JSONObject().put("role", m.role).put("content", m.content))
        }
        val profileJson = JSONObject()
          .put("nickname", profile.nickname)
          .put("about", profile.about)
        profile.role?.let { profileJson.put("role", it) }

        val memoryJson = JSONArray()
        for (m in memory) memoryJson.put(m)

        val employeesJson = JSONArray()
        for (e in company.employees) {
          employeesJson.put(JSONObject().put("name", e.name).put("role", e.role))
        }
        val companyJson = JSONObject()
          .put("name", company.name)
          .put("description", company.description)
          .put("employees", employeesJson)

        val payloadObj = JSONObject()
          .put("messages", messagesJson)
          .put("profile", profileJson)
          .put("memory", memoryJson)
          .put("language", language)
          .put("location", location)
          .put("company", companyJson)
        if (tool != null) payloadObj.put("tool", tool)
        if (conversationId != null) payloadObj.put("conversationId", conversationId)

        val payload = payloadObj.toString().toRequestBody(JSON)
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

  suspend fun getHistory(token: String): ApiResult<HistorySnapshot> = withContext(Dispatchers.IO) {
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
        val conversations = (0 until arr.length()).map { i -> conversationFromJson(arr.getJSONObject(i)) }
        val deletedObj = json.optJSONObject("deletedIds") ?: JSONObject()
        val deletedIds = mutableMapOf<String, Long>()
        val keys = deletedObj.keys()
        while (keys.hasNext()) {
          val k = keys.next()
          deletedIds[k] = deletedObj.optLong(k, 0L)
        }
        ApiResult.Success(HistorySnapshot(conversations, deletedIds))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveHistory(token: String, conversations: List<ApiConversation>, deletedIds: Map<String, Long>): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val arr = JSONArray()
        for (c in conversations) arr.put(conversationToJson(c))
        val deletedObj = JSONObject()
        for ((k, v) in deletedIds) deletedObj.put(k, v)
        val payload = JSONObject().put("conversations", arr).put("deletedIds", deletedObj).toString().toRequestBody(JSON)
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

  suspend fun deleteAccount(token: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account")
        .header("Authorization", "Bearer $token")
        .delete()
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

  suspend fun getRealtimeToken(
    token: String,
    language: String,
    voice: String = "marin",
    pushToTalk: Boolean = false,
    personality: String = "assistant",
    ageConfirmed: Boolean = false,
    customPersonalityText: String = ""
  ): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject()
        .put("language", language)
        .put("voice", voice)
        .put("pushToTalk", pushToTalk)
        .put("personality", personality)
        .put("ageConfirmed", ageConfirmed)
        .put("customPersonalityText", customPersonalityText)
        .toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/realtime/session")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val value = JSONObject(text).optString("value", "")
        if (value.isEmpty()) ApiResult.Failure("No session token returned") else ApiResult.Success(value)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun generateImage(token: String, prompt: String): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("prompt", prompt).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/image")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val url = JSONObject(text).optString("url", "")
        if (url.isEmpty()) ApiResult.Failure("No image returned") else ApiResult.Success(url)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getSettings(token: String): ApiResult<SettingsData> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/settings")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(settingsDataFromJson(JSONObject(text)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveSettings(token: String, data: SettingsData): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = settingsDataToJson(data).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/settings")
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

  suspend fun getProjects(token: String): ApiResult<List<ApiProject>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/projects")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("projects") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i ->
          val p = arr.getJSONObject(i)
          ApiProject(
            id = p.getString("id"),
            name = p.optString("name", ""),
            createdAt = if (p.has("createdAt") && !p.isNull("createdAt")) p.optLong("createdAt") else null
          )
        })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveProjects(token: String, projects: List<ApiProject>): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val arr = JSONArray()
      for (p in projects) {
        val pj = JSONObject().put("id", p.id).put("name", p.name)
        if (p.createdAt != null) pj.put("createdAt", p.createdAt)
        arr.put(pj)
      }
      val payload = JSONObject().put("projects", arr).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/projects")
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

  suspend fun getScheduled(token: String): ApiResult<List<ApiScheduledTask>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/scheduled")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("tasks") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i ->
          val t = arr.getJSONObject(i)
          ApiScheduledTask(
            id = t.getString("id"),
            prompt = t.optString("prompt", ""),
            runAt = t.optString("runAt", ""),
            fired = t.optBoolean("fired", false)
          )
        })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveScheduled(token: String, tasks: List<ApiScheduledTask>): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val arr = JSONArray()
      for (t in tasks) {
        arr.put(
          JSONObject()
            .put("id", t.id)
            .put("prompt", t.prompt)
            .put("runAt", t.runAt)
            .put("fired", t.fired)
        )
      }
      val payload = JSONObject().put("tasks", arr).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/scheduled")
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

  suspend fun getBillingSummary(token: String): ApiResult<BillingSummary> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/billing/summary")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        val subJson = json.optJSONObject("subscription")
        val subscription = if (subJson != null) {
          BillingSubscription(
            tier = subJson.optString("tier", null).takeUnless { it.isNullOrEmpty() },
            planName = subJson.optString("planName", "ChatGiZa"),
            currentPeriodEnd = if (subJson.has("currentPeriodEnd") && !subJson.isNull("currentPeriodEnd")) subJson.optLong("currentPeriodEnd") else null,
            cancelAtPeriodEnd = subJson.optBoolean("cancelAtPeriodEnd", false)
          )
        } else null
        ApiResult.Success(BillingSummary(subscription))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getMediaPosts(token: String): ApiResult<List<ApiMediaPost>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("posts") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i -> mediaPostFromJson(arr.getJSONObject(i)) })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun createMediaPost(
    token: String,
    text: String,
    imageDataUrl: String?,
    sentiment: String?
  ): ApiResult<ApiMediaPost> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("text", text)
      if (imageDataUrl != null) payload.put("imageDataUrl", imageDataUrl)
      if (sentiment != null) payload.put("sentiment", sentiment)
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts")
        .header("Authorization", "Bearer $token")
        .post(payload.toString().toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text2 = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text2, response.code))
        }
        ApiResult.Success(mediaPostFromJson(JSONObject(text2).getJSONObject("post")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun deleteMediaPost(token: String, postId: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts/$postId")
        .header("Authorization", "Bearer $token")
        .delete()
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

  data class LikeResult(val liked: Boolean, val likeCount: Int)

  suspend fun toggleMediaPostLike(token: String, postId: String): ApiResult<LikeResult> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts/$postId/like")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(LikeResult(json.getBoolean("liked"), json.getInt("likeCount")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getMediaComments(token: String, postId: String): ApiResult<List<ApiMediaComment>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts/$postId/comments")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("comments") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i -> mediaCommentFromJson(arr.getJSONObject(i)) })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun addMediaComment(token: String, postId: String, text: String): ApiResult<ApiMediaComment> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("text", text)
      val request = Request.Builder()
        .url("$BASE_URL/api/media/posts/$postId/comments")
        .header("Authorization", "Bearer $token")
        .post(payload.toString().toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text2 = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text2, response.code))
        }
        ApiResult.Success(mediaCommentFromJson(JSONObject(text2).getJSONObject("comment")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  private fun mediaPostFromJson(obj: JSONObject): ApiMediaPost = ApiMediaPost(
    id = obj.getString("id"),
    authorId = obj.getString("authorId"),
    authorName = obj.optString("authorName", "GiZa user"),
    authorImage = obj.optString("authorImage", null),
    text = obj.optString("text", ""),
    imageDataUrl = obj.optString("imageDataUrl", null),
    sentiment = obj.optString("sentiment", null),
    createdAt = obj.optLong("createdAt", 0L),
    likeCount = obj.optInt("likeCount", 0),
    likedByMe = obj.optBoolean("likedByMe", false),
    commentCount = obj.optInt("commentCount", 0)
  )

  private fun mediaCommentFromJson(obj: JSONObject): ApiMediaComment = ApiMediaComment(
    id = obj.getString("id"),
    authorId = obj.getString("authorId"),
    authorName = obj.optString("authorName", "GiZa user"),
    authorImage = obj.optString("authorImage", null),
    text = obj.optString("text", ""),
    createdAt = obj.optLong("createdAt", 0L)
  )

  private fun settingsDataFromJson(obj: JSONObject): SettingsData {
    val pluginsObj = obj.optJSONObject("plugins") ?: JSONObject()
    val privacyObj = obj.optJSONObject("privacy") ?: JSONObject()
    val companyObj = obj.optJSONObject("company") ?: JSONObject()
    val employeesArr = companyObj.optJSONArray("employees") ?: JSONArray()
    val requestsArr = obj.optJSONArray("companyRequests") ?: JSONArray()
    return SettingsData(
      plugins = PluginsState(
        webSearch = pluginsObj.optBoolean("web_search", true),
        deepResearch = pluginsObj.optBoolean("deep_research", true),
        deepThink = pluginsObj.optBoolean("deep_think", true),
        image = pluginsObj.optBoolean("image", true),
        video = pluginsObj.optBoolean("video", true),
        documentWriter = pluginsObj.optBoolean("document_writer", true),
        sqlHelper = pluginsObj.optBoolean("sql_helper", true),
        pythonHelper = pluginsObj.optBoolean("python_helper", true),
        businessAssistant = pluginsObj.optBoolean("business_assistant", true)
      ),
      notifyOnComplete = obj.optBoolean("notifyOnComplete", true),
      notifyImageGen = obj.optBoolean("notifyImageGen", true),
      allNotificationsEnabled = obj.optBoolean("allNotificationsEnabled", true),
      privacy = PrivacyPrefs(
        improveModel = privacyObj.optBoolean("improveModel", false),
        includeAudioRecordings = privacyObj.optBoolean("includeAudioRecordings", false),
        includeVideoRecordings = privacyObj.optBoolean("includeVideoRecordings", false),
        marketingMeasurement = privacyObj.optBoolean("marketingMeasurement", true),
        personalizedMarketing = privacyObj.optBoolean("personalizedMarketing", true)
      ),
      location = obj.optString("location", ""),
      company = CompanyProfile(
        name = companyObj.optString("name", ""),
        description = companyObj.optString("description", ""),
        employees = (0 until employeesArr.length()).map { i ->
          val e = employeesArr.getJSONObject(i)
          CompanyEmployee(name = e.optString("name", ""), role = e.optString("role", ""))
        }
      ),
      companyRequests = (0 until requestsArr.length()).map { i ->
        val r = requestsArr.getJSONObject(i)
        CompanyRequest(
          id = r.getString("id"),
          customerName = r.optString("customerName", ""),
          note = r.optString("note", ""),
          status = r.optString("status", "pending"),
          createdAt = r.optLong("createdAt", 0L)
        )
      }
    )
  }

  private fun settingsDataToJson(data: SettingsData): JSONObject {
    val pluginsObj = JSONObject()
      .put("web_search", data.plugins.webSearch)
      .put("deep_research", data.plugins.deepResearch)
      .put("deep_think", data.plugins.deepThink)
      .put("image", data.plugins.image)
      .put("video", data.plugins.video)
      .put("document_writer", data.plugins.documentWriter)
      .put("sql_helper", data.plugins.sqlHelper)
      .put("python_helper", data.plugins.pythonHelper)
      .put("business_assistant", data.plugins.businessAssistant)

    val privacyObj = JSONObject()
      .put("improveModel", data.privacy.improveModel)
      .put("includeAudioRecordings", data.privacy.includeAudioRecordings)
      .put("includeVideoRecordings", data.privacy.includeVideoRecordings)
      .put("marketingMeasurement", data.privacy.marketingMeasurement)
      .put("personalizedMarketing", data.privacy.personalizedMarketing)

    val employeesArr = JSONArray()
    for (e in data.company.employees) {
      employeesArr.put(JSONObject().put("name", e.name).put("role", e.role))
    }
    val companyObj = JSONObject()
      .put("name", data.company.name)
      .put("description", data.company.description)
      .put("employees", employeesArr)

    val requestsArr = JSONArray()
    for (r in data.companyRequests) {
      requestsArr.put(
        JSONObject()
          .put("id", r.id)
          .put("customerName", r.customerName)
          .put("note", r.note)
          .put("status", r.status)
          .put("createdAt", r.createdAt)
      )
    }

    return JSONObject()
      .put("plugins", pluginsObj)
      .put("notifyOnComplete", data.notifyOnComplete)
      .put("notifyImageGen", data.notifyImageGen)
      .put("allNotificationsEnabled", data.allNotificationsEnabled)
      .put("privacy", privacyObj)
      .put("location", data.location)
      .put("company", companyObj)
      .put("companyRequests", requestsArr)
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
