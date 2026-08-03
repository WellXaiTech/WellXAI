package com.wellxai.chatgiza

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme.colorScheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Send
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreenUi(viewModel: ChatViewModel) {
  val listState = rememberLazyListState()

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
          IconButton(onClick = { viewModel.newChat() }) {
            Icon(Icons.Filled.Add, contentDescription = "New chat", tint = colorScheme.onBackground)
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
        Box(
          modifier = Modifier.weight(1f).fillMaxWidth().padding(24.dp),
          contentAlignment = Alignment.Center
        ) {
          Text(
            "Ready when you are.",
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            color = colorScheme.onBackground.copy(alpha = 0.6f)
          )
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

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        OutlinedTextField(
          value = viewModel.input,
          onValueChange = viewModel::onInputChange,
          modifier = Modifier.weight(1f),
          placeholder = { Text("Ask anything") },
          shape = RoundedCornerShape(24.dp)
        )
        Spacer(modifier = Modifier.size(8.dp))
        IconButton(
          onClick = { viewModel.sendMessage() },
          enabled = viewModel.input.isNotBlank() && !viewModel.sending
        ) {
          Icon(Icons.Filled.Send, contentDescription = "Send", tint = colorScheme.onBackground)
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
