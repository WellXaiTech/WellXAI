package com.wellxai.chatgiza

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme.colorScheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
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
      TopAppBar(
        title = { Text("ChatGiZa", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.openHistory() }) {
            Icon(Icons.Filled.Menu, contentDescription = "History", tint = colorScheme.onBackground)
          }
        },
        actions = {
          IconButton(onClick = { viewModel.openAccount() }) {
            Icon(Icons.Filled.Person, contentDescription = "Account", tint = colorScheme.onBackground)
          }
          IconButton(onClick = { showGreeting = true; viewModel.newChat() }) {
            Icon(Icons.Filled.Edit, contentDescription = "New chat", tint = colorScheme.onBackground)
          }
          TextButton(onClick = { viewModel.signOut() }) {
            Text("Sign out")
          }
        }
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

  val speechLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
    if (result.resultCode == Activity.RESULT_OK) {
      val transcript = result.data
        ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        ?.firstOrNull()
      if (!transcript.isNullOrBlank()) {
        viewModel.onInputChange(if (viewModel.input.isBlank()) transcript else "${viewModel.input} $transcript")
      }
    }
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
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
        Box {
          TextButton(onClick = { toolMenuOpen = true }) {
            Text(viewModel.activeTool?.let { TOOL_LABELS[it] } ?: "GiZa 5.6")
            Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
          }
          DropdownMenu(expanded = toolMenuOpen, onDismissRequest = { toolMenuOpen = false }) {
            DropdownMenuItem(text = { Text("GiZa 5.6") }, onClick = { viewModel.setActiveTool(null); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Web search") }, onClick = { viewModel.setActiveTool("web_search"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep research") }, onClick = { viewModel.setActiveTool("deep_research"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep Think") }, onClick = { viewModel.setActiveTool("deep_think"); toolMenuOpen = false })
          }
        }
        Spacer(modifier = Modifier.weight(1f))
        if (viewModel.input.isNotBlank()) {
          IconButton(
            onClick = { onSend(); viewModel.sendMessage() },
            enabled = !viewModel.sending
          ) {
            Icon(Icons.Filled.Send, contentDescription = "Send", tint = colorScheme.onBackground)
          }
        } else {
          IconButton(onClick = {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
              putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            }
            runCatching { speechLauncher.launch(intent) }
          }) {
            Icon(Icons.Filled.Mic, contentDescription = "Voice input", tint = colorScheme.onBackground)
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistoryScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("History", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeHistory() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
          }
        }
      )
    },
    containerColor = Color.Transparent
  ) { padding ->
    Column(modifier = Modifier.fillMaxSize().padding(padding)) {
      if (viewModel.loadingHistory) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = colorScheme.onBackground)
        }
      } else if (viewModel.conversations.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
          Text(
            "No conversations yet.",
            color = colorScheme.onBackground.copy(alpha = 0.6f),
            fontSize = 16.sp
          )
        }
      } else {
        LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 8.dp)) {
          items(viewModel.conversations, key = { it.id }) { convo ->
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
