package com.wellxai.chatgiza

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme.colorScheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

private const val GOOGLE_WEB_CLIENT_ID =
  "302265706031-imsr5i7elinlqkdcjfv3sgicuul1m39g.apps.googleusercontent.com"

class MainActivity : ComponentActivity() {
  private lateinit var viewModel: ChatViewModel

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    viewModel = ChatViewModel(TokenStore(applicationContext))

    setContent {
      ChatGizaTheme {
        Surface {
          when (viewModel.screen) {
            is AppScreen.Loading -> LoadingScreen()
            is AppScreen.SignedOut -> SignedOutScreen(
              signingIn = viewModel.signingIn,
              error = viewModel.errorMessage,
              onSignIn = ::startGoogleSignIn
            )
            is AppScreen.Chat -> ChatScreenUi(viewModel)
            is AppScreen.History -> HistoryScreen(viewModel)
            is AppScreen.Account -> AccountScreen(viewModel)
            is AppScreen.Settings -> SettingsScreen(viewModel)
            is AppScreen.Projects -> ProjectsScreen(viewModel)
            is AppScreen.Scheduled -> ScheduledScreen(viewModel)
            is AppScreen.Billing -> BillingScreen(viewModel)
            is AppScreen.Imagine -> ImagineScreen(viewModel)
          }
        }
      }
    }
  }

  private fun startGoogleSignIn() {
    viewModel.onSignInStart()
    val googleIdOption = GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(false)
      .setServerClientId(GOOGLE_WEB_CLIENT_ID)
      .build()
    val request = GetCredentialRequest.Builder()
      .addCredentialOption(googleIdOption)
      .build()

    lifecycleScope.launch {
      try {
        val credentialManager = CredentialManager.create(this@MainActivity)
        val response = credentialManager.getCredential(this@MainActivity, request)
        val credential = response.credential
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
        viewModel.onGoogleIdToken(googleIdTokenCredential.idToken)
      } catch (e: GetCredentialException) {
        viewModel.onSignInFailed(e.message ?: "Sign-in was cancelled")
      } catch (e: Exception) {
        viewModel.onSignInFailed(e.message ?: "Sign-in failed")
      }
    }
  }
}

@Composable
private fun ChatGizaTheme(content: @Composable () -> Unit) {
  val colors = darkColorScheme(
    background = Color.Black,
    surface = Color(0xFF111111),
    onBackground = Color.White,
    onSurface = Color.White,
    primary = Color.White,
    onPrimary = Color.Black
  )
  MaterialTheme(colorScheme = colors, content = content)
}

@Composable
private fun Surface(content: @Composable () -> Unit) {
  Box(modifier = Modifier.fillMaxSize().background(colorScheme.background)) {
    content()
  }
}

@Composable
private fun LoadingScreen() {
  Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    CircularProgressIndicator(color = colorScheme.onBackground)
  }
}

@Composable
private fun SignedOutScreen(signingIn: Boolean, error: String?, onSignIn: () -> Unit) {
  Column(
    modifier = Modifier.fillMaxSize().padding(32.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text("ChatGiZa", fontSize = 40.sp, fontWeight = FontWeight.ExtraBold, color = colorScheme.onBackground)
    Spacer(modifier = Modifier.height(12.dp))
    Text(
      "Sign in to start chatting",
      fontSize = 15.sp,
      color = colorScheme.onBackground.copy(alpha = 0.7f)
    )
    Spacer(modifier = Modifier.height(32.dp))
    Button(
      onClick = onSignIn,
      enabled = !signingIn,
      shape = RoundedCornerShape(24.dp),
      modifier = Modifier.fillMaxWidth().height(52.dp)
    ) {
      Text(if (signingIn) "Signing in…" else "Continue with Google")
    }
    if (error != null) {
      Spacer(modifier = Modifier.height(16.dp))
      Text(error, color = Color(0xFFFF6B6B), fontSize = 13.sp)
    }
  }
}

private const val GREETING_TEXT = "Karibu sana! Nimefurahi kuwa na wewe leo. Naweza kukusaidia vipi?"

private val TOOL_LABELS = mapOf(
  "web_search" to "Web search",
  "deep_research" to "Deep research",
  "deep_think" to "Deep Think"
)

@Composable
private fun TwoLineMenuIcon(tint: Color) {
  Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Box(modifier = Modifier.width(20.dp).height(2.dp).background(tint))
    Box(modifier = Modifier.width(20.dp).height(2.dp).background(tint))
  }
}

@Composable
private fun AskImagineTabs(current: String, onAsk: () -> Unit, onImagine: () -> Unit) {
  Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
    Text(
      "Ask",
      fontWeight = if (current == "Ask") FontWeight.Bold else FontWeight.Normal,
      color = colorScheme.onBackground.copy(alpha = if (current == "Ask") 1f else 0.5f),
      modifier = Modifier.clickable(onClick = onAsk)
    )
    Text(
      "Imagine",
      fontWeight = if (current == "Imagine") FontWeight.Bold else FontWeight.Normal,
      color = colorScheme.onBackground.copy(alpha = if (current == "Imagine") 1f else 0.5f),
      modifier = Modifier.clickable(onClick = onImagine)
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreenUi(viewModel: ChatViewModel) {
  val listState = rememberLazyListState()
  var showGreeting by remember { mutableStateOf(true) }

  LaunchedEffect(viewModel.messages.size) {
    if (viewModel.messages.isNotEmpty()) {
      listState.animateScrollToItem(viewModel.messages.size - 1)
    }
  }

  Scaffold(
    topBar = {
      CenterAlignedTopAppBar(
        title = { AskImagineTabs(current = "Ask", onAsk = {}, onImagine = { viewModel.openImagine() }) },
        navigationIcon = {
          IconButton(onClick = { viewModel.openHistory() }) {
            TwoLineMenuIcon(tint = colorScheme.onBackground)
          }
        },
        actions = {
          IconButton(onClick = { viewModel.openAccount() }) {
            Icon(Icons.Filled.Person, contentDescription = "Account", tint = colorScheme.onBackground)
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
      if (viewModel.messages.isEmpty()) {
        Column(
          modifier = Modifier.weight(1f).fillMaxWidth().padding(24.dp),
          verticalArrangement = Arrangement.Center,
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          Text(
            "Ready when you are.",
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            color = colorScheme.onBackground.copy(alpha = 0.6f)
          )
          if (showGreeting) {
            Spacer(modifier = Modifier.height(16.dp))
            Box(
              modifier = Modifier
                .background(colorScheme.onBackground.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
              Text(GREETING_TEXT, color = colorScheme.onBackground.copy(alpha = 0.85f), fontSize = 14.sp)
            }
          }
        }
      } else {
        LazyColumn(
          state = listState,
          modifier = Modifier.weight(1f).fillMaxWidth(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          items(viewModel.messages, key = { it.id }) { message ->
            MessageBubble(message)
          }
        }
      }

      if (viewModel.errorMessage != null) {
        Text(
          viewModel.errorMessage ?: "",
          color = Color(0xFFFF6B6B),
          fontSize = 12.sp,
          modifier = Modifier.padding(horizontal = 16.dp)
        )
      }

      ChatComposerCard(viewModel) { showGreeting = false }
    }
  }
}

@Composable
private fun ChatComposerCard(viewModel: ChatViewModel, onSend: () -> Unit) {
  var toolMenuOpen by remember { mutableStateOf(false) }
  var pendingAutoSend by remember { mutableStateOf(false) }

  val speechLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
    val autoSend = pendingAutoSend
    pendingAutoSend = false
    if (result.resultCode == Activity.RESULT_OK) {
      val transcript = result.data
        ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        ?.firstOrNull()
      if (!transcript.isNullOrBlank()) {
        val combined = if (viewModel.input.isBlank()) transcript else "${viewModel.input} $transcript"
        viewModel.onInputChange(combined)
        if (autoSend) {
          onSend()
          viewModel.sendMessage()
        }
      }
    }
  }

  fun launchSpeech(autoSend: Boolean) {
    pendingAutoSend = autoSend
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    }
    runCatching { speechLauncher.launch(intent) }
  }

  Card(
    modifier = Modifier.fillMaxWidth().padding(12.dp),
    shape = RoundedCornerShape(24.dp),
    colors = CardDefaults.cardColors(containerColor = colorScheme.onBackground.copy(alpha = 0.06f))
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
      TextField(
        value = viewModel.input,
        onValueChange = viewModel::onInputChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Ask anything") },
        colors = TextFieldDefaults.colors(
          unfocusedContainerColor = Color.Transparent,
          focusedContainerColor = Color.Transparent,
          unfocusedIndicatorColor = Color.Transparent,
          focusedIndicatorColor = Color.Transparent
        )
      )
      if (viewModel.input.isNotBlank()) {
        Row(
          horizontalArrangement = Arrangement.End,
          modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
        ) {
          IconButton(
            onClick = { onSend(); viewModel.sendMessage() },
            enabled = !viewModel.sending
          ) {
            Icon(Icons.Filled.Send, contentDescription = "Send", tint = colorScheme.onBackground)
          }
        }
      } else {
        Box {
          Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
            IconButton(onClick = { toolMenuOpen = true }) {
              Icon(Icons.Filled.Add, contentDescription = "Tools", tint = colorScheme.onBackground)
            }
            TextButton(onClick = { toolMenuOpen = true }) {
              Text(viewModel.activeTool?.let { TOOL_LABELS[it] } ?: "GiZa Pro")
              Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
            }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { launchSpeech(autoSend = false) }) {
              Text("🎙", fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.size(4.dp))
            Button(
              onClick = { launchSpeech(autoSend = true) },
              shape = RoundedCornerShape(20.dp),
              colors = ButtonDefaults.buttonColors(
                containerColor = colorScheme.onBackground,
                contentColor = colorScheme.background
              ),
              contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
            ) {
              Text("🔊", fontSize = 14.sp)
              Spacer(modifier = Modifier.size(6.dp))
              Text("Speak", fontSize = 13.sp)
            }
          }
          DropdownMenu(expanded = toolMenuOpen, onDismissRequest = { toolMenuOpen = false }) {
            DropdownMenuItem(text = { Text("GiZa Pro") }, onClick = { viewModel.selectTool(null); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Web search") }, onClick = { viewModel.selectTool("web_search"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep research") }, onClick = { viewModel.selectTool("deep_research"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep Think") }, onClick = { viewModel.selectTool("deep_think"); toolMenuOpen = false })
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImagineScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      CenterAlignedTopAppBar(
        title = { AskImagineTabs(current = "Imagine", onAsk = { viewModel.closeImagine() }, onImagine = {}) },
        navigationIcon = {
          IconButton(onClick = { viewModel.openHistory() }) {
            TwoLineMenuIcon(tint = colorScheme.onBackground)
          }
        },
        actions = {
          IconButton(onClick = { viewModel.openAccount() }) {
            Icon(Icons.Filled.Person, contentDescription = "Account", tint = colorScheme.onBackground)
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(
      modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
        when {
          viewModel.generatingImage -> CircularProgressIndicator(color = colorScheme.onBackground)
          viewModel.generatedImageUrl != null -> AsyncImage(
            model = viewModel.generatedImageUrl,
            contentDescription = viewModel.imaginePrompt,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
          )
          else -> Text(
            "Describe what you'd like to see.",
            color = colorScheme.onBackground.copy(alpha = 0.5f),
            fontSize = 15.sp
          )
        }
      }
      if (viewModel.imagineError != null) {
        Text(viewModel.imagineError ?: "", color = Color(0xFFFF6B6B), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(8.dp))
      }
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
          value = viewModel.imaginePrompt,
          onValueChange = viewModel::onImaginePromptChange,
          modifier = Modifier.weight(1f),
          placeholder = { Text("A logo for a coffee shop…") },
          shape = RoundedCornerShape(24.dp)
        )
        Spacer(modifier = Modifier.size(8.dp))
        IconButton(
          onClick = { viewModel.generateImage() },
          enabled = viewModel.imaginePrompt.isNotBlank() && !viewModel.generatingImage
        ) {
          Icon(Icons.Filled.Send, contentDescription = "Generate", tint = colorScheme.onBackground)
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistoryScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeHistory() }

  val query = viewModel.historySearchQuery.trim()
  val visibleConversations = if (query.isEmpty()) {
    viewModel.conversations
  } else {
    viewModel.conversations.filter { it.title.contains(query, ignoreCase = true) }
  }

  Scaffold(
    containerColor = Color.Transparent,
    bottomBar = {
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(24.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.08f))
            .padding(horizontal = 16.dp)
        ) {
          Icon(Icons.Filled.Search, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(24.dp))
          Spacer(modifier = Modifier.size(8.dp))
          TextField(
            value = viewModel.historySearchQuery,
            onValueChange = viewModel::onHistorySearchQueryChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text("Search", color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 17.sp) },
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 17.sp, color = colorScheme.onBackground),
            singleLine = true,
            colors = TextFieldDefaults.colors(
              unfocusedContainerColor = Color.Transparent,
              focusedContainerColor = Color.Transparent,
              unfocusedIndicatorColor = Color.Transparent,
              focusedIndicatorColor = Color.Transparent
            )
          )
        }
        Spacer(modifier = Modifier.size(12.dp))
        FilledIconButton(
          onClick = { viewModel.openSettings() },
          colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = colorScheme.onBackground.copy(alpha = 0.12f),
            contentColor = colorScheme.onBackground
          )
        ) {
          Icon(Icons.Filled.Settings, contentDescription = "Settings")
        }
        Spacer(modifier = Modifier.size(8.dp))
        FilledIconButton(
          onClick = { viewModel.newChat() },
          colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = colorScheme.onBackground.copy(alpha = 0.12f),
            contentColor = colorScheme.onBackground
          )
        ) {
          Icon(Icons.Filled.Edit, contentDescription = "New chat")
        }
      }
    }
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable(onClick = { viewModel.openAccount() })
          .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        if (viewModel.userImage != null) {
          AsyncImage(
            model = viewModel.userImage,
            contentDescription = "Profile",
            modifier = Modifier.size(72.dp).clip(CircleShape)
          )
        } else {
          Icon(
            Icons.Filled.Person,
            contentDescription = "Profile",
            tint = colorScheme.onBackground,
            modifier = Modifier.size(72.dp)
          )
        }
        Spacer(modifier = Modifier.size(14.dp))
        Column {
          Text(viewModel.userName ?: "", color = colorScheme.onBackground, fontSize = 19.sp, fontWeight = FontWeight.Bold)
          if (viewModel.userEmail != null) {
            Text(viewModel.userEmail ?: "", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
          }
        }
      }

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 16.dp, vertical = 6.dp)
          .clip(RoundedCornerShape(16.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.08f))
          .clickable(onClick = { viewModel.openScheduled() })
          .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .size(28.dp)
            .clip(CircleShape)
            .background(colorScheme.onBackground.copy(alpha = 0.1f)),
          contentAlignment = Alignment.Center
        ) {
          Text("🕐", fontSize = 14.sp)
        }
        Spacer(modifier = Modifier.size(12.dp))
        Text("Automations", color = colorScheme.onBackground, fontSize = 15.sp)
      }

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 16.dp, vertical = 4.dp)
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFF2563EB))
          .clickable(onClick = { viewModel.openBilling() })
          .padding(horizontal = 12.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .size(22.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.2f)),
          contentAlignment = Alignment.Center
        ) {
          Text("✨", fontSize = 14.sp)
        }
        Spacer(modifier = Modifier.size(10.dp))
        Column(modifier = Modifier.weight(1f)) {
          Text("Save 66% on GiZa Pro", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
          Text("Early access to new features", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
        }
        Spacer(modifier = Modifier.size(8.dp))
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
          Text("Claim Offer", color = Color(0xFF2563EB), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
      }

      Text(
        "Conversations",
        color = colorScheme.onBackground.copy(alpha = 0.5f),
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
      )

      if (viewModel.loadingHistory) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = colorScheme.onBackground)
        }
      } else if (visibleConversations.isEmpty()) {
        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
          Text(
            if (query.isEmpty()) "No conversations yet." else "No matches.",
            color = colorScheme.onBackground.copy(alpha = 0.6f),
            fontSize = 16.sp
          )
        }
      } else {
        LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(vertical = 8.dp)) {
          items(visibleConversations, key = { it.id }) { convo ->
            HistoryRow(convo) { viewModel.selectConversation(convo.id) }
          }
        }
      }
    }
  }
}

@Composable
private fun HistoryRow(convo: ApiConversation, onClick: () -> Unit) {
  val lastMessage = convo.messages.lastOrNull()
  val dateText = lastMessage?.createdAt?.let { formatDate(it) } ?: ""
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(horizontal = 16.dp, vertical = 12.dp)
  ) {
    Text(
      text = convo.title.ifBlank { "New chat" },
      color = colorScheme.onBackground,
      fontSize = 16.sp,
      fontWeight = FontWeight.Medium
    )
    if (dateText.isNotEmpty()) {
      Text(dateText, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 12.sp)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Account", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeAccount() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .padding(20.dp)
    ) {
      Text(
        "What should ChatGiZa call you?",
        fontSize = 13.sp,
        color = colorScheme.onBackground.copy(alpha = 0.6f)
      )
      Spacer(modifier = Modifier.height(6.dp))
      OutlinedTextField(
        value = viewModel.nicknameInput,
        onValueChange = viewModel::onNicknameChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Nickname") },
        shape = RoundedCornerShape(12.dp)
      )

      Spacer(modifier = Modifier.height(20.dp))

      Text(
        "Anything ChatGiZa should know about you?",
        fontSize = 13.sp,
        color = colorScheme.onBackground.copy(alpha = 0.6f)
      )
      Spacer(modifier = Modifier.height(6.dp))
      OutlinedTextField(
        value = viewModel.aboutInput,
        onValueChange = viewModel::onAboutChange,
        modifier = Modifier.fillMaxWidth().height(140.dp),
        placeholder = { Text("e.g. I run a bakery and prefer short, direct answers.") },
        shape = RoundedCornerShape(12.dp)
      )

      if (viewModel.errorMessage != null) {
        Spacer(modifier = Modifier.height(12.dp))
        Text(viewModel.errorMessage ?: "", color = Color(0xFFFF6B6B), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(20.dp))

      Button(
        onClick = { viewModel.saveProfile() },
        enabled = !viewModel.savingProfile,
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth().height(48.dp)
      ) {
        Text(if (viewModel.savingProfile) "Saving…" else "Save")
      }

      Spacer(modifier = Modifier.height(28.dp))
      HorizontalDivider(color = colorScheme.onBackground.copy(alpha = 0.1f))
      Spacer(modifier = Modifier.height(8.dp))

      AccountLinkRow("Settings", "Plugins, notifications, privacy, location") { viewModel.openSettings() }
      AccountLinkRow("Projects") { viewModel.openProjects() }
      AccountLinkRow("Automations", "Scheduled messages") { viewModel.openScheduled() }
      AccountLinkRow("Billing", "Plan and payment") { viewModel.openBilling() }

      Spacer(modifier = Modifier.height(12.dp))
      HorizontalDivider(color = colorScheme.onBackground.copy(alpha = 0.1f))
      Spacer(modifier = Modifier.height(8.dp))
      TextButton(onClick = { viewModel.signOut() }) {
        Text("Sign out", color = Color(0xFFFF6B6B))
      }
    }
  }
}

@Composable
private fun AccountLinkRow(title: String, subtitle: String? = null, onClick: () -> Unit) {
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp)
  ) {
    Text(title, color = colorScheme.onBackground, fontSize = 16.sp, fontWeight = FontWeight.Medium)
    if (subtitle != null) {
      Text(subtitle, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 12.sp)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(viewModel: ChatViewModel) {
  val data = viewModel.settingsData
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Settings", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeSettings() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp, vertical = 8.dp)
    ) {
      SettingsSectionTitle("Plugins")
      SettingsSwitchRow("Web search", data.plugins.webSearch) { viewModel.togglePlugin("web_search") }
      SettingsSwitchRow("Deep research", data.plugins.deepResearch) { viewModel.togglePlugin("deep_research") }
      SettingsSwitchRow("Deep think", data.plugins.deepThink) { viewModel.togglePlugin("deep_think") }
      SettingsSwitchRow("Image generation", data.plugins.image) { viewModel.togglePlugin("image") }
      SettingsSwitchRow("Video generation", data.plugins.video) { viewModel.togglePlugin("video") }

      Spacer(modifier = Modifier.height(20.dp))
      SettingsSectionTitle("Notifications")
      SettingsSwitchRow("All notifications", data.allNotificationsEnabled) {
        viewModel.setAllNotificationsEnabled(!data.allNotificationsEnabled)
      }
      SettingsSwitchRow("Notify when a reply finishes", data.notifyOnComplete) {
        viewModel.setNotifyOnComplete(!data.notifyOnComplete)
      }
      SettingsSwitchRow("Notify on image/video generation", data.notifyImageGen) {
        viewModel.setNotifyImageGen(!data.notifyImageGen)
      }

      Spacer(modifier = Modifier.height(20.dp))
      SettingsSectionTitle("Privacy")
      SettingsSwitchRow("Improve the model with my chats", data.privacy.improveModel) {
        viewModel.setPrivacyPref { it.copy(improveModel = !it.improveModel) }
      }
      SettingsSwitchRow("Include audio recordings", data.privacy.includeAudioRecordings) {
        viewModel.setPrivacyPref { it.copy(includeAudioRecordings = !it.includeAudioRecordings) }
      }
      SettingsSwitchRow("Include video recordings", data.privacy.includeVideoRecordings) {
        viewModel.setPrivacyPref { it.copy(includeVideoRecordings = !it.includeVideoRecordings) }
      }
      SettingsSwitchRow("Marketing measurement", data.privacy.marketingMeasurement) {
        viewModel.setPrivacyPref { it.copy(marketingMeasurement = !it.marketingMeasurement) }
      }
      SettingsSwitchRow("Personalized marketing", data.privacy.personalizedMarketing) {
        viewModel.setPrivacyPref { it.copy(personalizedMarketing = !it.personalizedMarketing) }
      }

      Spacer(modifier = Modifier.height(20.dp))
      SettingsSectionTitle("Location")
      var locationInput by remember(data.location) { mutableStateOf(data.location) }
      Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
          value = locationInput,
          onValueChange = { locationInput = it },
          modifier = Modifier.weight(1f),
          placeholder = { Text("City, Country") },
          shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.size(8.dp))
        TextButton(onClick = { viewModel.setLocation(locationInput) }) {
          Text("Save")
        }
      }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

@Composable
private fun SettingsSectionTitle(title: String) {
  Text(
    title,
    color = colorScheme.onBackground.copy(alpha = 0.5f),
    fontSize = 12.sp,
    fontWeight = FontWeight.SemiBold,
    modifier = Modifier.padding(bottom = 4.dp)
  )
}

@Composable
private fun SettingsSwitchRow(label: String, checked: Boolean, onToggle: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(label, color = colorScheme.onBackground, fontSize = 14.sp, modifier = Modifier.weight(1f))
    Switch(checked = checked, onCheckedChange = { onToggle() })
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectsScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Projects", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeProjects() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp, vertical = 12.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
          value = viewModel.newProjectName,
          onValueChange = viewModel::onNewProjectNameChange,
          modifier = Modifier.weight(1f),
          placeholder = { Text("New project name") },
          shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.size(8.dp))
        IconButton(onClick = { viewModel.addProject() }) {
          Icon(Icons.Filled.Add, contentDescription = "Add project", tint = colorScheme.onBackground)
        }
      }
      Spacer(modifier = Modifier.height(12.dp))
      if (viewModel.loadingProjects) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = colorScheme.onBackground)
        }
      } else if (viewModel.projects.isEmpty()) {
        Text("No projects yet.", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 14.sp)
      } else {
        LazyColumn {
          items(viewModel.projects, key = { it.id }) { project ->
            Row(
              modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Text(project.name, color = colorScheme.onBackground, fontSize = 15.sp)
              IconButton(onClick = { viewModel.deleteProject(project.id) }) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = colorScheme.onBackground.copy(alpha = 0.6f))
              }
            }
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduledScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Automations", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeScheduled() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp, vertical = 12.dp)) {
      OutlinedTextField(
        value = viewModel.newTaskPrompt,
        onValueChange = viewModel::onNewTaskPromptChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("What should ChatGiZa do?") },
        shape = RoundedCornerShape(12.dp)
      )
      Spacer(modifier = Modifier.height(8.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
          value = viewModel.newTaskRunAt,
          onValueChange = viewModel::onNewTaskRunAtChange,
          modifier = Modifier.weight(1f),
          placeholder = { Text("YYYY-MM-DD HH:mm") },
          shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.size(8.dp))
        IconButton(onClick = { viewModel.addScheduledTask() }) {
          Icon(Icons.Filled.Add, contentDescription = "Add task", tint = colorScheme.onBackground)
        }
      }
      Spacer(modifier = Modifier.height(16.dp))
      if (viewModel.loadingScheduled) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = colorScheme.onBackground)
        }
      } else if (viewModel.scheduledTasks.isEmpty()) {
        Text("No scheduled tasks yet.", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 14.sp)
      } else {
        LazyColumn {
          items(viewModel.scheduledTasks, key = { it.id }) { task ->
            Row(
              modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Column(modifier = Modifier.weight(1f)) {
                Text(task.prompt, color = colorScheme.onBackground, fontSize = 15.sp)
                Text(
                  if (task.fired) "${task.runAt} · done" else task.runAt,
                  color = colorScheme.onBackground.copy(alpha = 0.5f),
                  fontSize = 12.sp
                )
              }
              IconButton(onClick = { viewModel.deleteScheduledTask(task.id) }) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = colorScheme.onBackground.copy(alpha = 0.6f))
              }
            }
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BillingScreen(viewModel: ChatViewModel) {
  val context = LocalContext.current
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Billing", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeBilling() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp)) {
      if (viewModel.loadingBilling) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = colorScheme.onBackground)
        }
      } else {
        val subscription = viewModel.billingSummary?.subscription
        if (subscription == null) {
          Text("No active subscription.", color = colorScheme.onBackground, fontSize = 16.sp)
        } else {
          Text(subscription.planName, color = colorScheme.onBackground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
          Spacer(modifier = Modifier.height(6.dp))
          val statusText = if (subscription.cancelAtPeriodEnd) "Cancels" else "Renews"
          val dateText = subscription.currentPeriodEnd?.let { formatDate(it) }
          if (dateText != null) {
            Text("$statusText $dateText", color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 13.sp)
          }
        }
        Spacer(modifier = Modifier.height(24.dp))
        Button(
          onClick = {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/chatgiza"))
            context.startActivity(intent)
          },
          shape = RoundedCornerShape(24.dp),
          modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
          Text("Manage billing")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          "Opens ChatGiZa in your browser to change plan, cards, or cancel.",
          color = colorScheme.onBackground.copy(alpha = 0.5f),
          fontSize = 12.sp
        )
      }
    }
  }
}

private fun formatDate(millis: Long): String {
  val fmt = java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
  return fmt.format(java.util.Date(millis))
}

@Composable
private fun MessageBubble(message: UiMessage) {
  val isUser = message.role == "user"
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
  ) {
    Box(
      modifier = Modifier
        .background(
          color = if (isUser) colorScheme.onBackground.copy(alpha = 0.12f) else Color.Transparent,
          shape = RoundedCornerShape(16.dp)
        )
        .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
      Text(
        text = message.content.ifEmpty { "…" },
        color = colorScheme.onBackground,
        fontSize = 15.sp
      )
    }
  }
}
