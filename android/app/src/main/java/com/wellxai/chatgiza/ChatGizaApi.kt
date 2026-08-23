package com.wellxai.chatgiza

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Call
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

// deviceTrustToken is re-minted on every successful sign-in (whether it just
// cleared a real second-factor challenge or skipped one by presenting an
// already-valid token) -- stored via TokenStore.setDeviceTrustToken and
// echoed back on the next mobileAuth/authWithPassword call so this device
// isn't challenged again until an explicit sign-out clears it.
data class AuthResult(val token: String, val user: MobileUser, val deviceTrustToken: String?)

// mobileAuth/authWithPassword return one of these instead of AuthResult
// directly -- every account now needs a second factor on every sign-in
// (unless this device already presented a valid deviceTrustToken): TOTP if
// the account has it enabled, otherwise a passkey confirmation if one is
// registered, otherwise a mandatory emailed code. The real AuthResult only
// comes back once whichever of those three actually clears.
sealed class MobileAuthOutcome {
  data class SignedIn(val result: AuthResult) : MobileAuthOutcome()
  data class TotpRequired(val pendingId: String) : MobileAuthOutcome()
  // No pendingId -- Android's passkey login is discoverable-credential based
  // (see startGoogleSignIn/confirmPasskeyLogin) and identifies the account
  // from the credential itself, so there's nothing to resume against.
  object PasskeyRequired : MobileAuthOutcome()
  data class EmailCodeRequired(val pendingId: String) : MobileAuthOutcome()
}

data class TotpSetup(val secret: String, val otpauthUri: String)

data class PasskeyInfo(val id: String, val deviceName: String?, val createdAt: String?, val lastUsedAt: String?)

data class ApiMessage(val id: String, val role: String, val content: String, val createdAt: Long?, val pairId: String = "")

data class ApiConversation(
  val id: String,
  val title: String,
  val messages: List<ApiMessage>,
  val pinned: Boolean = false
)

data class HistorySnapshot(val conversations: List<ApiConversation>, val deletedIds: Map<String, Long>)

data class ApiSubaccount(val id: String, val name: String, val avatarPresetId: String?)

data class TwinData(val summary: String, val updatedAt: Long)

data class LatestVersionInfo(val runNumber: Int, val downloadUrl: String)

// Idea #7: a shared AI chat session multiple people can join with a
// short code and all talk to at once. Polling-based (see
// ChatViewModel's collab polling loop) rather than push/WebSocket --
// there's no realtime infra in this project -- but it's a real,
// working, multi-person session, not a mockup.
data class CollabParticipant(val id: String, val name: String)

data class CollabMessage(
  val id: String,
  val role: String,
  val content: String,
  val authorName: String?,
  val createdAt: Long
)

data class CollabSession(
  val code: String,
  val createdBy: String,
  val participants: List<CollabParticipant>,
  val messages: List<CollabMessage>
)

// Real OAuth connectors (Gmail, Google Calendar, GitHub, etc.) -- backed
// by src/lib/connectors.ts. `configured` means the backend has real
// client id/secret for this provider (not just that the row exists);
// a connector with configured=false shows as "Setup needed" rather than
// pretending Connect would do anything.
data class ConnectorInfo(
  val id: String,
  val name: String,
  val category: String,
  val configured: Boolean,
  val connected: Boolean
)

// One global room shared by every ChatGiZa user, unlike CollabSession's
// per-code sessions -- backs the "Join Our Community" entry point.
data class CommunityMessage(
  val id: String,
  val authorId: String,
  val authorName: String,
  val content: String,
  val createdAt: Long
)

// Backs the Trusted Devices screen -- one entry per sign-in, web or
// mobile, recorded server-side in src/lib/sessions.ts.
data class DeviceSession(
  val id: String,
  val device: String,
  val os: String,
  val signedInAt: Long,
  val ip: String,
  val location: String,
  val platform: String
)

data class ApiProfile(
  val nickname: String = "",
  val about: String = "",
  val role: String? = null,
  val fullName: String? = null,
  val birthDate: String? = null,
  val country: String? = null,
  // Public-facing, shown on the ChatGiZa Media profile page -- distinct
  // from `about`, which is private context fed to the AI, not something
  // meant for other users to read.
  val bio: String = "",
  // Bold public display name (e.g. "QUANTARA") shown on the Media
  // profile -- distinct from `nickname`, which only personalizes how the
  // AI addresses you in chat and is never shown to other users.
  val displayName: String = "",
  // Single link shown on the Media profile.
  val link: String = ""
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
  val businessAssistant: Boolean = true,
  val aiAgent: Boolean = true,
  val digitalTwin: Boolean = true
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

// attachmentImageDataUrl carries either a picked photo or a rendered PDF's
// first page (base64 data: URL, downscaled -- see uriToPostImageDataUrl/
// readAttachedFile in MainActivity.kt); attachmentText carries a plain-text
// file's contents instead. Only one of the two is ever populated. Both are
// folded into the prompt ScheduledTaskWorker sends when the task fires,
// same as an attached file works in live chat.
data class ApiScheduledTask(
  val id: String,
  val prompt: String,
  val runAt: String,
  val fired: Boolean,
  val paused: Boolean = false,
  val category: String = "Chat",
  val title: String = "",
  val pending: Boolean = false,
  val recurrenceDays: Int = 0,
  val attachmentName: String = "",
  val attachmentText: String = "",
  val attachmentImageDataUrl: String = ""
)

data class ApiAd(val id: String, val headline: String, val subtitle: String, val imageUrl: String, val linkUrl: String)

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
  val imageUrls: List<String>,
  val videoUrl: String?,
  val sentiment: String?,
  // "post" (main feed/history only), "status" (stories row only), "both".
  val destination: String,
  val createdAt: Long,
  val likeCount: Int,
  val likedByMe: Boolean,
  val commentCount: Int
)

data class VideoUploadSlot(val signedUrl: String, val publicUrl: String)

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
  // Public/publishable key, safe to embed client-side (same one the web
  // app ships in its browser bundle) -- required by Supabase Storage's
  // direct-upload endpoint alongside the per-upload signed token.
  private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VhoSIv6tr3o98PYH5yM_-w_Zj81mBYA"
  private val JSON = "application/json; charset=utf-8".toMediaType()

  private val client = OkHttpClient.Builder()
    .connectTimeout(20, TimeUnit.SECONDS)
    .readTimeout(90, TimeUnit.SECONDS)
    .writeTimeout(20, TimeUnit.SECONDS)
    .build()

  // Parses whichever of the four shapes /api/mobile/auth(-password) can
  // return -- a real device (deviceTrustToken already valid) gets signedIn
  // straight away; a fresh one gets whichever rung of the ladder applies.
  private fun parseMobileAuthOutcome(json: JSONObject): MobileAuthOutcome {
    if (json.optBoolean("totpRequired", false)) return MobileAuthOutcome.TotpRequired(json.getString("pendingId"))
    if (json.optBoolean("passkeyRequired", false)) return MobileAuthOutcome.PasskeyRequired
    if (json.optBoolean("emailCodeRequired", false)) return MobileAuthOutcome.EmailCodeRequired(json.getString("pendingId"))
    val userJson = json.getJSONObject("user")
    return MobileAuthOutcome.SignedIn(
      AuthResult(
        token = json.getString("token"),
        deviceTrustToken = json.optString("deviceTrustToken", null),
        user = MobileUser(
          id = userJson.getString("id"),
          name = userJson.optString("name", null),
          email = userJson.optString("email", null),
          image = userJson.optString("image", null)
        )
      )
    )
  }

  suspend fun mobileAuth(idToken: String, deviceTrustToken: String?): ApiResult<MobileAuthOutcome> = withContext(Dispatchers.IO) {
    try {
      // Device model (e.g. "TECNO CK6") is what the Trusted Devices list
      // shows for this sign-in -- sent once here, at token-mint time, not
      // on every request. deviceTrustToken (from TokenStore, null the first
      // time this device ever signs in) lets an already-verified device skip
      // straight past the second-factor ladder below.
      val body = JSONObject()
        .put("idToken", idToken)
        .put("deviceModel", android.os.Build.MODEL ?: "")
        .apply { if (deviceTrustToken != null) put("deviceTrustToken", deviceTrustToken) }
        .toString().toRequestBody(JSON)
      val request = Request.Builder().url("$BASE_URL/api/mobile/auth").post(body).build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(parseMobileAuthOutcome(JSONObject(text)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // Sign-in via the in-app password instead of Google -- identifier is
  // either the account's email or its saved contact phone number,
  // depending on which tab was selected. Same outcome shape as mobileAuth,
  // so callers handle both the exact same way.
  suspend fun authWithPassword(identifier: String, method: String, password: String, deviceTrustToken: String?): ApiResult<MobileAuthOutcome> = withContext(Dispatchers.IO) {
    try {
      val body = JSONObject()
        .put("identifier", identifier)
        .put("method", method)
        .put("password", password)
        .put("deviceModel", android.os.Build.MODEL ?: "")
        .apply { if (deviceTrustToken != null) put("deviceTrustToken", deviceTrustToken) }
        .toString().toRequestBody(JSON)
      val request = Request.Builder().url("$BASE_URL/api/mobile/auth-password").post(body).build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(parseMobileAuthOutcome(JSONObject(text)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // Step 2 of a TOTP-gated sign-in -- verifies the authenticator code against
  // the identity staged under pendingId, then returns the same AuthResult an
  // unchallenged sign-in would.
  suspend fun verifyLoginTotp(pendingId: String, code: String): ApiResult<AuthResult> = withContext(Dispatchers.IO) {
    try {
      val body = JSONObject().put("pendingId", pendingId).put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder().url("$BASE_URL/api/mobile/auth").put(body).build()
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
            deviceTrustToken = json.optString("deviceTrustToken", null),
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

  // Step 2 of the mandatory-email-code fallback (accounts with no TOTP and
  // no passkey) -- same URL/shape as verifyLoginTotp, the server tells the
  // two apart by which `kind` the pendingId was staged under.
  suspend fun verifyLoginEmailCode(pendingId: String, code: String): ApiResult<AuthResult> = withContext(Dispatchers.IO) {
    try {
      val body = JSONObject().put("pendingId", pendingId).put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder().url("$BASE_URL/api/mobile/auth").put(body).build()
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
            deviceTrustToken = json.optString("deviceTrustToken", null),
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
    // Only ever attached to the newest user message (the one this
    // request is actually sending) -- the backend's ChatContentPart
    // union already supports image_url parts alongside text, this just
    // needed a client that could produce them. A rendered PDF's pages
    // (see readAttachedFile in MainActivity.kt) show up here too, on top
    // of a directly picked photo -- both are just image_url parts to the
    // backend, which doesn't distinguish their origin.
    imageDataUrls: List<String> = emptyList(),
    // (title, snippet) for the user's other saved conversations -- a
    // lightweight index, not full content, so the model can answer "how
    // many chats do I have" / reference past topics by name without
    // every past conversation's full text being sent on every request.
    historyIndex: List<Pair<String, String>> = emptyList(),
    // (question, answer) -- set when this new message itself references a
    // pair ID (e.g. "Q-4F2A19") and that exact past exchange was found
    // locally, so the model gets the real content instead of guessing.
    referencedPair: Pair<String, String>? = null,
    // Device's own local wall-clock time, "yyyy-MM-dd'T'HH:mm" -- lets the
    // model resolve relative/spoken time references (e.g. reminder
    // requests) into an absolute timestamp in the user's real timezone.
    localDateTime: String? = null,
    // Idea #9: the user's synthesized digital twin profile, sent so it can
    // both quietly improve personalization in every mode and be used
    // literally when tool == "digital_twin".
    digitalTwin: String? = null,
    // Handed the live okhttp3.Call the instant it's created, before
    // .execute() blocks -- lets a caller stash it and call .cancel() on it
    // from elsewhere (a Stop button) to actually interrupt the in-flight
    // read loop below. Plain coroutine Job cancellation alone doesn't do
    // this: the blocking reader.read() call has no cancellation checkpoint
    // of its own, so it would just keep blocking until the stream ends on
    // its own. Cancelling the underlying OkHttp Call instead makes that
    // blocked read throw immediately.
    onCallCreated: ((Call) -> Unit)? = null,
    onChunk: (String) -> Unit
  ): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val messagesJson = JSONArray()
        messages.forEachIndexed { index, m ->
          val messageObj = JSONObject().put("role", m.role)
          if (imageDataUrls.isNotEmpty() && index == messages.lastIndex && m.role == "user") {
            val parts = JSONArray()
            if (m.content.isNotEmpty()) {
              parts.put(JSONObject().put("type", "text").put("text", m.content))
            }
            for (url in imageDataUrls) {
              parts.put(JSONObject().put("type", "image_url").put("image_url", JSONObject().put("url", url)))
            }
            messageObj.put("content", parts)
          } else {
            messageObj.put("content", m.content)
          }
          messagesJson.put(messageObj)
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
        if (historyIndex.isNotEmpty()) {
          val historyIndexJson = JSONArray()
          for ((title, snippet) in historyIndex) {
            historyIndexJson.put(JSONObject().put("title", title).put("snippet", snippet))
          }
          payloadObj.put("historyIndex", historyIndexJson)
        }
        if (referencedPair != null) {
          payloadObj.put(
            "referencedPair",
            JSONObject().put("question", referencedPair.first).put("answer", referencedPair.second)
          )
        }
        if (localDateTime != null) payloadObj.put("localDateTime", localDateTime)
        if (!digitalTwin.isNullOrBlank()) payloadObj.put("digitalTwin", digitalTwin)

        val payload = payloadObj.toString().toRequestBody(JSON)
        val request = Request.Builder()
          .url("$BASE_URL/api/chat")
          .header("Authorization", "Bearer $token")
          .post(payload)
          .build()

        val call = client.newCall(request)
        onCallCreated?.invoke(call)
        call.execute().use { response ->
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

  suspend fun getHistory(token: String, subaccountId: String? = null): ApiResult<HistorySnapshot> = withContext(Dispatchers.IO) {
    try {
      val builder = Request.Builder()
        .url("$BASE_URL/api/history")
        .header("Authorization", "Bearer $token")
      if (subaccountId != null) builder.header("X-Subaccount-Id", subaccountId)
      val request = builder.get().build()
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

  suspend fun saveHistory(
    token: String,
    conversations: List<ApiConversation>,
    deletedIds: Map<String, Long>,
    subaccountId: String? = null
  ): ApiResult<Unit> =
    withContext(Dispatchers.IO) {
      try {
        val arr = JSONArray()
        for (c in conversations) arr.put(conversationToJson(c))
        val deletedObj = JSONObject()
        for ((k, v) in deletedIds) deletedObj.put(k, v)
        val payload = JSONObject().put("conversations", arr).put("deletedIds", deletedObj).toString().toRequestBody(JSON)
        val builder = Request.Builder()
          .url("$BASE_URL/api/history")
          .header("Authorization", "Bearer $token")
        if (subaccountId != null) builder.header("X-Subaccount-Id", subaccountId)
        val request = builder.put(payload).build()
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

  suspend fun deactivateAccount(token: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/deactivate")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
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

  suspend fun getSubaccounts(token: String): ApiResult<List<ApiSubaccount>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/subaccounts")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("subaccounts") ?: JSONArray()
        val list = (0 until arr.length()).map { i ->
          val o = arr.getJSONObject(i)
          val avatarPresetId = if (o.isNull("avatar_preset_id")) null else o.optString("avatar_preset_id", "").ifBlank { null }
          ApiSubaccount(o.getString("id"), o.getString("name"), avatarPresetId)
        }
        ApiResult.Success(list)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun createSubaccount(token: String, name: String, avatarPresetId: String?): ApiResult<ApiSubaccount> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("name", name).apply {
        if (avatarPresetId != null) put("avatarPresetId", avatarPresetId)
      }.toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/subaccounts")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(ApiSubaccount(json.getString("id"), json.getString("name"), avatarPresetId))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun renameSubaccount(token: String, id: String, name: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("name", name).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/subaccounts/$id")
        .header("Authorization", "Bearer $token")
        .patch(payload)
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

  suspend fun deleteSubaccount(token: String, id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/subaccounts/$id")
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

  suspend fun getPasswordStatus(token: String): ApiResult<Boolean> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/password")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(JSONObject(text).optBoolean("hasPassword", false))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // oldPassword is omitted the first time an account sets a password --
  // the backend only requires it once one already exists.
  // Sends a 6-digit code to the account's email; the password itself isn't
  // written server-side until confirmPasswordChange verifies that code.
  suspend fun requestPasswordChange(token: String, oldPassword: String?, newPassword: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("newPassword", newPassword).apply {
        if (oldPassword != null) put("oldPassword", oldPassword)
      }.toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/password")
        .header("Authorization", "Bearer $token")
        .post(payload)
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

  suspend fun confirmPasswordChange(token: String, code: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/password")
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

  suspend fun getTotpStatus(token: String): ApiResult<Boolean> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/totp")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(JSONObject(text).optBoolean("enabled", false))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // Starts an Authenticator App 2FA enrollment -- the returned secret isn't
  // active yet, only confirmTotpSetup below turns it on.
  suspend fun setupTotp(token: String): ApiResult<TotpSetup> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/totp")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(TotpSetup(secret = json.getString("secret"), otpauthUri = json.getString("otpauthUri")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun confirmTotpSetup(token: String, code: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/totp")
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

  suspend fun disableTotp(token: String, code: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/totp")
        .header("Authorization", "Bearer $token")
        .delete(payload)
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

  suspend fun getPasskeys(token: String): ApiResult<List<PasskeyInfo>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/passkeys")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).getJSONArray("passkeys")
        val list = (0 until arr.length()).map { i ->
          val obj = arr.getJSONObject(i)
          PasskeyInfo(
            id = obj.getString("id"),
            deviceName = obj.optString("deviceName", null),
            createdAt = obj.optString("createdAt", null),
            lastUsedAt = obj.optString("lastUsedAt", null)
          )
        }
        ApiResult.Success(list)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun deletePasskey(token: String, id: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("id", id).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/passkeys")
        .header("Authorization", "Bearer $token")
        .delete(payload)
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

  // Returns the raw options JSON exactly as the backend produced it -- it's
  // passed straight through to CreatePublicKeyCredentialRequest(requestJson)
  // unmodified, so there's no reason to parse it into Kotlin types here.
  suspend fun passkeyRegisterOptions(token: String): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/account/passkeys/register-options")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(JSONObject(text).getJSONObject("options").toString())
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // responseJson is CreatePublicKeyCredentialResponse.registrationResponseJson
  // straight from Credential Manager -- forwarded to the backend as-is.
  suspend fun passkeyRegisterVerify(token: String, responseJson: String, deviceName: String?): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject()
        .put("response", JSONObject(responseJson))
        .apply { if (deviceName != null) put("deviceName", deviceName) }
        .toString()
        .toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/account/passkeys/register-verify")
        .header("Authorization", "Bearer $token")
        .post(payload)
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

  data class PasskeyLoginOptions(val optionsJson: String, val requestId: String)

  // Unauthenticated -- there's no token yet, this is how sign-in starts.
  suspend fun passkeyLoginOptions(): ApiResult<PasskeyLoginOptions> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/mobile/auth/passkey-options")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(PasskeyLoginOptions(json.getJSONObject("options").toString(), json.getString("requestId")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun passkeyLoginVerify(requestId: String, responseJson: String, deviceModel: String): ApiResult<AuthResult> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject()
        .put("requestId", requestId)
        .put("response", JSONObject(responseJson))
        .put("deviceModel", deviceModel)
        .toString()
        .toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/mobile/auth/passkey-verify")
        .post(payload)
        .build()
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
            deviceTrustToken = json.optString("deviceTrustToken", null),
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

  // Points users.image (the real account avatar, read everywhere userImage
  // is -- ChatGiZa Media posts/profile included) at a preset avatar's
  // Twemoji image, so picking one in the picker isn't only visible in the
  // couple of screens that check the local preset id directly.
  suspend fun updateAvatar(token: String, imageUrl: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("image", imageUrl).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/avatar")
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

  // Points users.name (the real account display name, read everywhere
  // userName is -- ChatGiZa Media posts/profile included) at the nickname
  // the user typed, so it's not just a device-local label.
  suspend fun updateName(token: String, name: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("name", name).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/name")
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

  // Step 1 of a two-step change (see ChangeEmailScreen) -- stages the
  // requested address server-side and emails a 6-digit code to IT, proving
  // this account actually controls that inbox before confirmEmailChange
  // below is allowed to write it as the account's contact email.
  suspend fun requestEmailChange(token: String, email: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("email", email).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/email")
        .header("Authorization", "Bearer $token")
        .post(payload)
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

  suspend fun confirmEmailChange(token: String, code: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("code", code).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/email")
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

  suspend fun unlinkEmail(token: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/email")
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

  suspend fun updatePhone(token: String, phone: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("phone", phone).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/profile/phone")
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

  // Idea #9: Digital Twin -- one synthesized narrative profile, separate
  // KV entry from profile/memory (see /api/twin), get/save mirrors
  // getProfile/saveProfile exactly.
  suspend fun getTwin(token: String): ApiResult<TwinData> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/twin")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val obj = JSONObject(text)
        ApiResult.Success(TwinData(obj.optString("summary", ""), obj.optLong("updatedAt", 0L)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun saveTwin(token: String, summary: String): ApiResult<TwinData> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("summary", summary).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/twin")
        .header("Authorization", "Bearer $token")
        .put(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val obj = JSONObject(text)
        ApiResult.Success(TwinData(obj.optString("summary", summary), obj.optLong("updatedAt", 0L)))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // Draft only -- caller decides whether to call saveTwin with the result.
  suspend fun synthesizeTwin(
    token: String,
    messages: List<ChatMessage>,
    existingTwin: String
  ): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val messagesJson = JSONArray()
      for (m in messages) {
        messagesJson.put(JSONObject().put("role", m.role).put("content", m.content))
      }
      val payload = JSONObject()
        .put("messages", messagesJson)
        .put("existingTwin", existingTwin)
        .toString()
        .toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/twin/synthesize")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        ApiResult.Success(JSONObject(text).optString("summary", existingTwin))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // Background, best-effort call -- fired occasionally (not per message)
  // after a conversation has enough back-and-forth. Returns 0-3 short
  // candidate memory strings for the user to accept/dismiss; nothing is
  // saved server-side by this call itself.
  suspend fun suggestMemory(
    token: String,
    messages: List<ChatMessage>,
    existingMemory: List<String>
  ): ApiResult<List<String>> = withContext(Dispatchers.IO) {
    try {
      val messagesJson = JSONArray()
      for (m in messages) {
        messagesJson.put(JSONObject().put("role", m.role).put("content", m.content))
      }
      val existingJson = JSONArray()
      for (m in existingMemory) existingJson.put(m)
      val payload = JSONObject()
        .put("messages", messagesJson)
        .put("existingMemory", existingJson)
        .toString()
        .toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/memory/extract")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val suggestionsArr = JSONObject(text).optJSONArray("suggestions") ?: JSONArray()
        val suggestions = (0 until suggestionsArr.length()).map { suggestionsArr.getString(it) }
        ApiResult.Success(suggestions)
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
            fired = t.optBoolean("fired", false),
            paused = t.optBoolean("paused", false),
            category = t.optString("category", "Chat"),
            title = t.optString("title", ""),
            pending = t.optBoolean("pending", false),
            recurrenceDays = t.optInt("recurrenceDays", 0),
            attachmentName = t.optString("attachmentName", ""),
            attachmentText = t.optString("attachmentText", ""),
            attachmentImageDataUrl = t.optString("attachmentImageDataUrl", "")
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
            .put("paused", t.paused)
            .put("category", t.category)
            .put("title", t.title)
            .put("pending", t.pending)
            .put("recurrenceDays", t.recurrenceDays)
            .put("attachmentName", t.attachmentName)
            .put("attachmentText", t.attachmentText)
            .put("attachmentImageDataUrl", t.attachmentImageDataUrl)
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

  /** Live, admin-approved ads targeting [country] (an ISO 3166-1 alpha-2
   * code) and [language] (an ISO 639-1 code, e.g. "sw" -- the backend
   * resolves it to the advertiser's stored full language name) for the
   * Events carousel. Decorative content -- callers should treat a failure
   * the same as "no ads right now", not surface an error. */
  suspend fun getActiveAds(token: String, country: String, language: String): ApiResult<List<ApiAd>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/ads/active?country=$country&language=$language")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val arr = JSONObject(text).optJSONArray("ads") ?: JSONArray()
        ApiResult.Success((0 until arr.length()).map { i ->
          val a = arr.getJSONObject(i)
          ApiAd(
            id = a.getString("id"),
            headline = a.optString("headline", ""),
            subtitle = a.optString("subtitle", ""),
            imageUrl = a.optString("imageUrl", ""),
            linkUrl = a.optString("linkUrl", "")
          )
        })
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  private fun collabSessionFromJson(obj: JSONObject): CollabSession {
    val participantsArr = obj.optJSONArray("participants") ?: JSONArray()
    val participants = (0 until participantsArr.length()).map { i ->
      val p = participantsArr.getJSONObject(i)
      CollabParticipant(p.getString("id"), p.optString("name", "Someone"))
    }
    val messagesArr = obj.optJSONArray("messages") ?: JSONArray()
    val messages = (0 until messagesArr.length()).map { i ->
      val m = messagesArr.getJSONObject(i)
      CollabMessage(
        id = m.optString("id", java.util.UUID.randomUUID().toString()),
        role = m.optString("role", "user"),
        content = m.optString("content", ""),
        authorName = if (m.has("authorName") && !m.isNull("authorName")) m.optString("authorName") else null,
        createdAt = m.optLong("createdAt", System.currentTimeMillis())
      )
    }
    return CollabSession(
      code = obj.getString("code"),
      createdBy = obj.optString("createdBy", ""),
      participants = participants,
      messages = messages
    )
  }

  suspend fun createCollabSession(token: String, displayName: String): ApiResult<CollabSession> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("displayName", displayName).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/collab")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(collabSessionFromJson(JSONObject(text).getJSONObject("session")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun joinCollabSession(token: String, code: String, displayName: String): ApiResult<CollabSession> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("displayName", displayName).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/collab/$code/join")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(collabSessionFromJson(JSONObject(text).getJSONObject("session")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getCollabSession(token: String, code: String): ApiResult<CollabSession> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/collab/$code")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(collabSessionFromJson(JSONObject(text).getJSONObject("session")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun postCollabMessage(token: String, code: String, content: String, displayName: String): ApiResult<CollabSession> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("content", content).put("displayName", displayName).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/collab/$code/message")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(collabSessionFromJson(JSONObject(text).getJSONObject("session")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  private fun communityMessagesFromJson(arr: JSONArray): List<CommunityMessage> {
    return (0 until arr.length()).map { i ->
      val m = arr.getJSONObject(i)
      CommunityMessage(
        id = m.optString("id", java.util.UUID.randomUUID().toString()),
        authorId = m.optString("authorId", ""),
        authorName = m.optString("authorName", "Someone"),
        content = m.optString("content", ""),
        createdAt = m.optLong("createdAt", System.currentTimeMillis())
      )
    }
  }

  suspend fun getCommunityMessages(token: String): ApiResult<List<CommunityMessage>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/community")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(communityMessagesFromJson(JSONObject(text).getJSONArray("messages")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun postCommunityMessage(token: String, content: String, displayName: String): ApiResult<List<CommunityMessage>> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("content", content).put("displayName", displayName).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/community")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(communityMessagesFromJson(JSONObject(text).getJSONArray("messages")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  data class SessionsResult(val sessions: List<DeviceSession>, val currentSessionId: String?)

  suspend fun getSessions(token: String): ApiResult<SessionsResult> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/sessions")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        val json = JSONObject(text)
        val arr = json.getJSONArray("sessions")
        val sessions = (0 until arr.length()).map { i ->
          val s = arr.getJSONObject(i)
          DeviceSession(
            id = s.optString("id", java.util.UUID.randomUUID().toString()),
            device = s.optString("device", "Unknown device"),
            os = s.optString("os", "Unknown OS"),
            signedInAt = s.optLong("signedInAt", System.currentTimeMillis()),
            ip = s.optString("ip", "unknown"),
            location = s.optString("location", "Unknown"),
            platform = s.optString("platform", "web")
          )
        }
        val currentSessionId = if (json.has("currentSessionId") && !json.isNull("currentSessionId")) json.optString("currentSessionId") else null
        ApiResult.Success(SessionsResult(sessions, currentSessionId))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun revokeSession(token: String, sessionId: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("sessionId", sessionId).toString().toRequestBody(JSON)
      val request = Request.Builder()
        .url("$BASE_URL/api/sessions/revoke")
        .header("Authorization", "Bearer $token")
        .post(payload)
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(Unit)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getConnectors(token: String): ApiResult<List<ConnectorInfo>> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/connectors")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        val arr = JSONObject(text).getJSONArray("connectors")
        val list = (0 until arr.length()).map { i ->
          val o = arr.getJSONObject(i)
          ConnectorInfo(
            id = o.getString("id"),
            name = o.getString("name"),
            category = o.optString("category", "Featured"),
            configured = o.optBoolean("configured", false),
            connected = o.optBoolean("connected", false)
          )
        }
        ApiResult.Success(list)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun startConnectorAuth(token: String, service: String): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/connectors/$service/start")
        .header("Authorization", "Bearer $token")
        .post("{}".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) return@withContext ApiResult.Failure(errorMessage(text, response.code))
        ApiResult.Success(JSONObject(text).getString("url"))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun disconnectConnector(token: String, service: String): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/connectors/$service")
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

  /** A real, pre-authorized Stripe Customer Portal URL -- unlike a plain
   * chatgiza.com link, this works standalone in a browser that was never
   * signed into the site (the app's own sign-in is a bearer token, not a
   * browser cookie, so a bare app-URL handoff previously landed on a blank,
   * signed-out page). */
  suspend fun startCheckout(token: String, tier: String): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val body = JSONObject().put("tier", tier).toString()
      val request = Request.Builder()
        .url("$BASE_URL/api/checkout")
        .header("Authorization", "Bearer $token")
        .post(body.toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val url = JSONObject(text).optString("url", "")
        if (url.isEmpty()) return@withContext ApiResult.Failure("No checkout URL returned")
        ApiResult.Success(url)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun getBillingPortalUrl(token: String): ApiResult<String> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/billing/portal")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val url = JSONObject(text).optString("url", "")
        if (url.isEmpty()) return@withContext ApiResult.Failure("No portal URL returned")
        ApiResult.Success(url)
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
    imageDataUrls: List<String>,
    videoUrl: String?,
    sentiment: String?,
    destination: String = "post"
  ): ApiResult<ApiMediaPost> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("text", text).put("destination", destination)
      if (imageDataUrls.isNotEmpty()) payload.put("imageDataUrls", JSONArray(imageDataUrls))
      if (videoUrl != null) payload.put("videoUrl", videoUrl)
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

  // Videos are too large to round-trip through our own JSON API, so they go
  // straight to Supabase Storage from the device: mint a short-lived signed
  // upload slot via our backend, PUT the bytes directly to Supabase, then
  // create the post referencing the resulting public URL (mirrors the web
  // app's upload flow, see src/components/ChatGizaMediaFeed.tsx).
  suspend fun createVideoUploadSlot(token: String, mime: String): ApiResult<VideoUploadSlot> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("mime", mime)
      val request = Request.Builder()
        .url("$BASE_URL/api/media/video-upload-url")
        .header("Authorization", "Bearer $token")
        .post(payload.toString().toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val obj = JSONObject(text)
        ApiResult.Success(VideoUploadSlot(signedUrl = obj.getString("signedUrl"), publicUrl = obj.getString("publicUrl")))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun uploadVideoBytes(signedUrl: String, mime: String, bytes: ByteArray): ApiResult<Unit> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url(signedUrl)
        .header("apikey", SUPABASE_PUBLISHABLE_KEY)
        .put(bytes.toRequestBody(mime.toMediaType()))
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

  data class MediaUserProfile(
    val followerCount: Int,
    val followingCount: Int,
    val isFollowedByMe: Boolean,
    val bio: String,
    val displayName: String = "",
    val occupation: String = "",
    val location: String = "",
    val link: String = "",
    val isVerified: Boolean = false,
    val joinedAt: Long? = null
  )
  data class FollowResult(val following: Boolean, val followerCount: Int)

  suspend fun getMediaUserProfile(token: String, userId: String): ApiResult<MediaUserProfile> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/users/$userId")
        .header("Authorization", "Bearer $token")
        .get()
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(
          MediaUserProfile(
            followerCount = json.optInt("followerCount", 0),
            followingCount = json.optInt("followingCount", 0),
            isFollowedByMe = json.optBoolean("isFollowedByMe", false),
            bio = json.optString("bio", ""),
            displayName = json.optString("displayName", ""),
            occupation = json.optString("occupation", ""),
            location = json.optString("location", ""),
            link = json.optString("link", ""),
            isVerified = json.optBoolean("isVerified", false),
            joinedAt = if (json.isNull("joinedAt")) null else json.optLong("joinedAt")
          )
        )
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  suspend fun toggleFollowMediaUser(token: String, userId: String): ApiResult<FollowResult> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("$BASE_URL/api/media/users/$userId/follow")
        .header("Authorization", "Bearer $token")
        .post("".toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        ApiResult.Success(FollowResult(json.getBoolean("following"), json.getInt("followerCount")))
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

  /** Real OpenAI TTS audio (MP3 bytes) for the Premium Voice setting --
   * same /api/tts endpoint the website uses, just returning raw bytes
   * instead of playing them via an <audio> element. */
  suspend fun getSpeechAudio(token: String, text: String, voice: String): ApiResult<ByteArray> = withContext(Dispatchers.IO) {
    try {
      val payload = JSONObject().put("text", text).put("voice", voice)
      val request = Request.Builder()
        .url("$BASE_URL/api/tts")
        .header("Authorization", "Bearer $token")
        .post(payload.toString().toRequestBody(JSON))
        .build()
      client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
          val text2 = response.body?.string().orEmpty()
          return@withContext ApiResult.Failure(errorMessage(text2, response.code))
        }
        val bytes = response.body?.bytes()
        if (bytes == null || bytes.isEmpty()) {
          return@withContext ApiResult.Failure("Empty audio response")
        }
        ApiResult.Success(bytes)
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }

  // org.json's optString(name, null) does NOT return null for a JSON field
  // that's explicitly `null` -- it stringifies JSONObject.NULL, returning
  // the literal 4-character string "null" instead. Every nullable string
  // field from our API (which always sends explicit `null`, not an omitted
  // key) has to go through this instead, or e.g. a photo-only post's
  // missing videoUrl gets parsed as the *string* "null" -- which is
  // non-null in Kotlin, so `post.videoUrl != null` was true and rendered a
  // broken video player under every single-media post.
  private fun JSONObject.optNullableString(name: String): String? = if (isNull(name)) null else optString(name)

  private fun mediaPostFromJson(obj: JSONObject): ApiMediaPost = ApiMediaPost(
    id = obj.getString("id"),
    authorId = obj.getString("authorId"),
    authorName = obj.optString("authorName", "GiZa user"),
    authorImage = obj.optNullableString("authorImage"),
    text = obj.optString("text", ""),
    imageDataUrl = obj.optNullableString("imageDataUrl"),
    imageUrls = obj.optJSONArray("imageUrls")?.let { arr -> (0 until arr.length()).map { arr.getString(it) } } ?: emptyList(),
    videoUrl = obj.optNullableString("videoUrl"),
    sentiment = obj.optNullableString("sentiment"),
    destination = obj.optString("destination", "post"),
    createdAt = obj.optLong("createdAt", 0L),
    likeCount = obj.optInt("likeCount", 0),
    likedByMe = obj.optBoolean("likedByMe", false),
    commentCount = obj.optInt("commentCount", 0)
  )

  private fun mediaCommentFromJson(obj: JSONObject): ApiMediaComment = ApiMediaComment(
    id = obj.getString("id"),
    authorId = obj.getString("authorId"),
    authorName = obj.optString("authorName", "GiZa user"),
    authorImage = obj.optNullableString("authorImage"),
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
        businessAssistant = pluginsObj.optBoolean("business_assistant", true),
        aiAgent = pluginsObj.optBoolean("ai_agent", true),
        digitalTwin = pluginsObj.optBoolean("digital_twin", true)
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
      .put("ai_agent", data.plugins.aiAgent)
      .put("digital_twin", data.plugins.digitalTwin)

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
        country = profileObj.optString("country", null),
        bio = profileObj.optString("bio", ""),
        displayName = profileObj.optString("displayName", ""),
        link = profileObj.optString("link", "")
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
      .put("bio", data.profile.bio)
      .put("displayName", data.profile.displayName)
      .put("link", data.profile.link)
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
        createdAt = if (m.has("createdAt") && !m.isNull("createdAt")) m.optLong("createdAt") else null,
        pairId = m.optString("pairId", "")
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
      if (m.pairId.isNotBlank()) mj.put("pairId", m.pairId)
      messagesArr.put(mj)
    }
    return JSONObject()
      .put("id", c.id)
      .put("title", c.title)
      .put("pinned", c.pinned)
      .put("messages", messagesArr)
  }

  // Shared across every API call in this file -- the server's own {"error":
  // "..."} message is used when present; this fallback only shows when the
  // response body isn't JSON at all (a raw error page, an empty body, a
  // proxy/edge failure) or has no "error" field. Was "Request failed
  // ($code)" -- a bare HTTP status number reads as a cryptic, technical
  // message to someone using the app, not something they can act on.
  private fun errorMessage(body: String, code: Int): String {
    return try {
      JSONObject(body).optString("error", "Something went wrong. Please try again.")
    } catch (e: Exception) {
      "Something went wrong. Please try again."
    }
  }

  // Sideloaded APKs (this app isn't on the Play Store) never auto-update --
  // this checks the same public GitHub Release the CI pipeline publishes to
  // and returns its build number (the release tag is "android-build-N")
  // so the caller can compare it against this install's own versionCode,
  // which is set to that same CI run number at build time.
  suspend fun checkLatestVersion(): ApiResult<LatestVersionInfo> = withContext(Dispatchers.IO) {
    try {
      val request = Request.Builder()
        .url("https://api.github.com/repos/WellXaiTech/WellXAI/releases/latest")
        .header("Accept", "application/vnd.github+json")
        .build()
      client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
          return@withContext ApiResult.Failure(errorMessage(text, response.code))
        }
        val json = JSONObject(text)
        val runNumber = json.optString("tag_name", "").substringAfterLast("-").toIntOrNull()
          ?: return@withContext ApiResult.Failure("Unrecognized release tag")
        val assets = json.optJSONArray("assets")
        val downloadUrl = (0 until (assets?.length() ?: 0))
          .map { assets!!.getJSONObject(it) }
          .firstOrNull { it.optString("name") == "app-release.apk" }
          ?.optString("browser_download_url")
          ?: "https://github.com/WellXaiTech/WellXAI/releases/latest/download/app-release.apk"
        ApiResult.Success(LatestVersionInfo(runNumber, downloadUrl))
      }
    } catch (e: Exception) {
      ApiResult.Failure(e.message ?: "Network error")
    }
  }
}
