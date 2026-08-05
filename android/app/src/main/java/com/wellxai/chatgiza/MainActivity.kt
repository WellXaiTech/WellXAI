package com.wellxai.chatgiza

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.material.icons.filled.AddToHomeScreen
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowBackIosNew
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Feedback
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicNone
import androidx.compose.material.icons.outlined.ModeEdit
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.RecordVoiceOver
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Vibration
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.io.ByteArrayOutputStream
import java.util.Locale
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

private const val GOOGLE_WEB_CLIENT_ID =
  "302265706031-imsr5i7elinlqkdcjfv3sgicuul1m39g.apps.googleusercontent.com"

class MainActivity : ComponentActivity() {
  private lateinit var viewModel: ChatViewModel

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
    )
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
            is AppScreen.Customize -> CustomizeScreen(viewModel)
            is AppScreen.EditProfile -> EditProfileScreen(viewModel)
            is AppScreen.AppLanguage -> AppLanguageScreen(viewModel)
            is AppScreen.Appearance -> AppearanceScreen(viewModel)
            is AppScreen.Voice -> VoiceScreen(viewModel)
            is AppScreen.ReportProblem -> ReportProblemScreen(viewModel)
            is AppScreen.Widgets -> WidgetsScreen(viewModel)
            is AppScreen.Haptics -> HapticsScreen(viewModel)
            is AppScreen.DataControls -> DataControlsScreen(viewModel)
            is AppScreen.ManageCloudStorage -> ManageCloudStorageScreen(viewModel)
            is AppScreen.Settings -> SettingsScreen(viewModel)
            is AppScreen.Projects -> ProjectsScreen(viewModel)
            is AppScreen.Scheduled -> ScheduledScreen(viewModel)
            is AppScreen.Billing -> BillingScreen(viewModel)
            is AppScreen.Imagine -> ImagineScreen(viewModel)
            is AppScreen.LiveVision -> LiveVisionScreen(viewModel)
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
  val appBackground = Color(0xFF262626)
  val colors = darkColorScheme(
    background = appBackground,
    surface = appBackground,
    surfaceVariant = appBackground,
    surfaceContainer = appBackground,
    surfaceContainerHigh = appBackground,
    surfaceContainerHighest = appBackground,
    surfaceContainerLow = appBackground,
    surfaceContainerLowest = appBackground,
    surfaceTint = appBackground,
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color.White,
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

/** A wide trash-can outline with two vertical lines inside — the classic
 * delete glyph, which isn't available under any name in the Material
 * icon set used here (DeleteOutline/DeleteForever draw different shapes). */
@Composable
private fun DeleteIcon(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier.size(22.dp)) {
    val w = size.width
    val h = size.height
    val strokeW = w * 0.08f
    drawLine(
      color = tint,
      start = Offset(w * 0.14f, h * 0.26f),
      end = Offset(w * 0.86f, h * 0.26f),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawLine(color = tint, start = Offset(w * 0.40f, h * 0.26f), end = Offset(w * 0.40f, h * 0.12f), strokeWidth = strokeW * 0.85f, cap = StrokeCap.Round)
    drawLine(color = tint, start = Offset(w * 0.60f, h * 0.26f), end = Offset(w * 0.60f, h * 0.12f), strokeWidth = strokeW * 0.85f, cap = StrokeCap.Round)
    drawLine(color = tint, start = Offset(w * 0.40f, h * 0.12f), end = Offset(w * 0.60f, h * 0.12f), strokeWidth = strokeW * 0.85f, cap = StrokeCap.Round)
    drawRoundRect(
      color = tint,
      topLeft = Offset(w * 0.20f, h * 0.30f),
      size = Size(w * 0.60f, h * 0.62f),
      cornerRadius = CornerRadius(w * 0.08f, w * 0.08f),
      style = Stroke(width = strokeW)
    )
    drawLine(color = tint, start = Offset(w * 0.40f, h * 0.42f), end = Offset(w * 0.40f, h * 0.80f), strokeWidth = strokeW, cap = StrokeCap.Round)
    drawLine(color = tint, start = Offset(w * 0.60f, h * 0.42f), end = Offset(w * 0.60f, h * 0.80f), strokeWidth = strokeW, cap = StrokeCap.Round)
  }
}

@Composable
private fun AskImagineTab(label: String, selected: Boolean, onClick: () -> Unit) {
  Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
    Text(
      label,
      fontSize = 20.sp,
      fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
      color = colorScheme.onBackground.copy(alpha = if (selected) 1f else 0.5f)
    )
    Spacer(modifier = Modifier.height(6.dp))
    Box(
      modifier = Modifier
        .width(20.dp)
        .height(3.dp)
        .clip(RoundedCornerShape(2.dp))
        .background(if (selected) colorScheme.onBackground.copy(alpha = 0.5f) else Color.Transparent)
    )
  }
}

@Composable
private fun AskImagineTabs(current: String, onAsk: () -> Unit, onImagine: () -> Unit) {
  Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
    AskImagineTab("Ask", current == "Ask", onAsk)
    AskImagineTab("Imagine", current == "Imagine", onImagine)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreenUi(viewModel: ChatViewModel) {
  val listState = rememberLazyListState()
  val context = LocalContext.current
  val tts = remember { TtsController(context) }
  val haptic = LocalHapticFeedback.current
  DisposableEffect(Unit) {
    onDispose { tts.shutdown() }
  }

  LaunchedEffect(viewModel.messages.size) {
    if (viewModel.messages.isNotEmpty()) {
      listState.animateScrollToItem(viewModel.messages.size - 1)
    }
  }

  LaunchedEffect(viewModel.sending, viewModel.autoSpeakNextReply) {
    if (!viewModel.sending && viewModel.autoSpeakNextReply) {
      val lastAssistant = viewModel.messages.lastOrNull { it.role == "assistant" }
      if (lastAssistant != null && lastAssistant.content.isNotBlank()) {
        tts.speak(lastAssistant.content)
      }
      viewModel.clearAutoSpeak()
    }
  }

  var wasSending by remember { mutableStateOf(false) }
  LaunchedEffect(viewModel.sending) {
    if (wasSending && !viewModel.sending && viewModel.hapticsEnabled && viewModel.hapticsOnResponse) {
      haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }
    wasSending = viewModel.sending
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
            Icon(Icons.Outlined.ModeEdit, contentDescription = "Account", tint = colorScheme.onBackground)
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
      )
    },
    containerColor = Color.Transparent,
    contentWindowInsets = WindowInsets(0, 0, 0, 0)
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .navigationBarsPadding()
        .imePadding()
    ) {
      if (viewModel.messages.isEmpty()) {
        Box(modifier = Modifier.weight(1f).fillMaxWidth())
      } else {
        LazyColumn(
          state = listState,
          modifier = Modifier.weight(1f).fillMaxWidth(),
          contentPadding = PaddingValues(16.dp),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          items(viewModel.messages, key = { it.id }) { message ->
            MessageBubble(message, onSpeak = { tts.speak(message.content) })
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

      ChatComposerCard(viewModel)
    }
  }
}

@Composable
private fun ChatComposerCard(viewModel: ChatViewModel) {
  var toolMenuOpen by remember { mutableStateOf(false) }
  var pendingAutoSend by remember { mutableStateOf(false) }
  val haptic = LocalHapticFeedback.current
  fun tapHaptic() {
    if (viewModel.hapticsEnabled && viewModel.hapticsOnPress) {
      haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }
  }

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
          viewModel.sendMessage(viaVoice = true)
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

  val focusRequester = remember { FocusRequester() }
  val keyboardController = LocalSoftwareKeyboardController.current
  LaunchedEffect(Unit) {
    focusRequester.requestFocus()
    keyboardController?.show()
  }

  Card(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 10.dp),
    shape = RoundedCornerShape(24.dp),
    colors = CardDefaults.cardColors(containerColor = colorScheme.onBackground.copy(alpha = 0.06f))
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) {
      TextField(
        value = viewModel.input,
        onValueChange = viewModel::onInputChange,
        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
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
            onClick = { tapHaptic(); viewModel.sendMessage() },
            enabled = !viewModel.sending
          ) {
            Icon(Icons.Filled.Send, contentDescription = "Send", tint = colorScheme.onBackground)
          }
        }
      } else {
        Box {
          Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            FilledIconButton(
              onClick = { toolMenuOpen = true },
              modifier = Modifier.size(36.dp),
              colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = colorScheme.onBackground.copy(alpha = 0.1f),
                contentColor = colorScheme.onBackground
              )
            ) {
              Icon(Icons.Filled.Add, contentDescription = "Tools", modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.size(6.dp))
            Row(
              verticalAlignment = Alignment.CenterVertically,
              modifier = Modifier
                .clip(RoundedCornerShape(18.dp))
                .background(colorScheme.onBackground.copy(alpha = 0.08f))
                .clickable(onClick = { toolMenuOpen = true })
                .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
              if (viewModel.activeTool == null) {
                Icon(Icons.Outlined.Bolt, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.size(4.dp))
              }
              Text(
                viewModel.activeTool?.let { TOOL_LABELS[it] } ?: "GiZa Pro",
                color = colorScheme.onBackground,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
              )
              Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = { launchSpeech(autoSend = false) }, modifier = Modifier.size(36.dp)) {
              Icon(Icons.Outlined.Mic, contentDescription = "Voice input", tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.size(6.dp))
            Button(
              onClick = { viewModel.openLiveVision() },
              shape = RoundedCornerShape(18.dp),
              colors = ButtonDefaults.buttonColors(
                containerColor = colorScheme.onBackground,
                contentColor = colorScheme.background
              ),
              contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
              Icon(Icons.Filled.GraphicEq, contentDescription = null, modifier = Modifier.size(18.dp))
              Spacer(modifier = Modifier.size(6.dp))
              Text("Speak", fontSize = 14.sp, maxLines = 1, softWrap = false)
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
            Icon(Icons.Outlined.ModeEdit, contentDescription = "Account", tint = colorScheme.onBackground)
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
private fun LiveVisionScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeLiveVision() }

  val context = LocalContext.current
  val lifecycleOwner = LocalLifecycleOwner.current
  val coroutineScope = rememberCoroutineScope()

  var hasMicPermission by remember {
    mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
  }
  var hasCameraPermission by remember {
    mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
  }
  var cameraEnabled by remember { mutableStateOf(false) }
  var speakerEnabled by remember { mutableStateOf(true) }
  var micMuted by remember { mutableStateOf(false) }
  var toolMenuOpen by remember { mutableStateOf(false) }
  var cameraProviderRef by remember { mutableStateOf<ProcessCameraProvider?>(null) }

  val micPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasMicPermission = granted
  }
  val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasCameraPermission = granted
    if (granted) cameraEnabled = true
  }

  LaunchedEffect(Unit) {
    if (!hasMicPermission) micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
  }

  val controller = remember { RealtimeVisionController(context, TokenStore(context.applicationContext), coroutineScope) }

  DisposableEffect(hasMicPermission) {
    if (hasMicPermission) controller.start(viewModel.profileData.language)
    onDispose {
      controller.stop()
      cameraProviderRef?.unbindAll()
    }
  }

  Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
    if (cameraEnabled && hasCameraPermission) {
      AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
          val previewView = PreviewView(ctx)
          val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
          cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            cameraProviderRef = cameraProvider
            val preview = Preview.Builder().build().also {
              it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
              .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
              .build()
            var lastSentAt = 0L
            analysis.setAnalyzer(ContextCompat.getMainExecutor(ctx)) { imageProxy ->
              val now = System.currentTimeMillis()
              if (now - lastSentAt >= 1200) {
                lastSentAt = now
                runCatching { controller.sendFrame(imageProxyToJpeg(imageProxy)) }
              }
              imageProxy.close()
            }
            try {
              cameraProvider.unbindAll()
              cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
            } catch (e: Exception) {
              controller.reportCameraError(e.message ?: "Camera failed to start")
            }
          }, ContextCompat.getMainExecutor(ctx))
          previewView
        }
      )
    }

    if (!hasMicPermission) {
      Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        Text(
          "Live Vision needs microphone access.",
          color = Color.White,
          fontSize = 15.sp,
          textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = { micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO) }) {
          Text("Grant access")
        }
      }
    } else {
      val statusText = when {
        controller.errorMessage != null -> controller.errorMessage ?: ""
        controller.isAiSpeaking -> "ChatGiZa is speaking…"
        else -> "Go ahead"
      }

      IconButton(
        onClick = { viewModel.closeLiveVision() },
        modifier = Modifier.align(Alignment.TopStart).padding(top = 48.dp, start = 12.dp)
      ) {
        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(32.dp))
      }

      Column(
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .imePadding()
          .navigationBarsPadding()
          .padding(bottom = 22.dp, start = 16.dp, end = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        if (statusText.isNotEmpty()) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
              .size(width = 150.dp, height = 50.dp)
              .clip(RoundedCornerShape(25.dp))
              .background(Color.White.copy(alpha = 0.12f))
          ) {
            Icon(Icons.Outlined.RecordVoiceOver, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.size(8.dp))
            Text(statusText, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          VoiceControlPill(icon = Icons.Outlined.Videocam, contentDescription = "Camera", active = cameraEnabled) {
            if (cameraEnabled) {
              cameraProviderRef?.unbindAll()
              cameraEnabled = false
            } else if (hasCameraPermission) {
              cameraEnabled = true
            } else {
              cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
          }
          VoiceControlPill(icon = Icons.Outlined.VolumeUp, contentDescription = "Speaker", active = speakerEnabled) {
            speakerEnabled = !speakerEnabled
            controller.setSpeakerEnabled(speakerEnabled)
          }
          VoiceControlPill(icon = Icons.Outlined.MicNone, contentDescription = "Microphone", active = !micMuted) {
            micMuted = !micMuted
            controller.setMicMuted(micMuted)
          }
          VoiceControlPill(icon = Icons.Outlined.Settings, contentDescription = "Settings") {
            viewModel.openSettings()
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box {
            Box(
              modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Color(0xFF1A1A1A))
                .clickable(onClick = { toolMenuOpen = true }),
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Filled.Add, contentDescription = "Tools", tint = Color.White, modifier = Modifier.size(22.dp))
            }
            DropdownMenu(expanded = toolMenuOpen, onDismissRequest = { toolMenuOpen = false }) {
              DropdownMenuItem(text = { Text("GiZa Pro") }, onClick = { viewModel.selectTool(null); toolMenuOpen = false })
              DropdownMenuItem(text = { Text("Web search") }, onClick = { viewModel.selectTool("web_search"); toolMenuOpen = false })
              DropdownMenuItem(text = { Text("Deep research") }, onClick = { viewModel.selectTool("deep_research"); toolMenuOpen = false })
              DropdownMenuItem(text = { Text("Deep Think") }, onClick = { viewModel.selectTool("deep_think"); toolMenuOpen = false })
            }
          }
          Spacer(modifier = Modifier.size(8.dp))
          Box(
            modifier = Modifier
              .weight(1f)
              .height(62.dp)
              .clip(RoundedCornerShape(31.dp))
              .background(Color(0xFF1A1A1A)),
            contentAlignment = Alignment.CenterStart
          ) {
            TextField(
              value = viewModel.input,
              onValueChange = viewModel::onInputChange,
              modifier = Modifier.fillMaxWidth(),
              placeholder = { Text("Ask anything", color = Color.White.copy(alpha = 0.38f)) },
              colors = TextFieldDefaults.colors(
                unfocusedContainerColor = Color.Transparent,
                focusedContainerColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                unfocusedTextColor = Color.White,
                focusedTextColor = Color.White
              )
            )
          }
          Spacer(modifier = Modifier.size(8.dp))
          Box(
            modifier = Modifier
              .size(width = 112.dp, height = 62.dp)
              .clip(RoundedCornerShape(31.dp))
              .background(Color.White)
              .clickable(onClick = {
                if (viewModel.input.isNotBlank()) {
                  controller.stop()
                  viewModel.closeLiveVision()
                  viewModel.sendMessage()
                } else {
                  controller.stop()
                  viewModel.closeLiveVision()
                }
              }),
            contentAlignment = Alignment.Center
          ) {
            Text("Stop", color = Color.Black, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
          }
        }
      }
    }
  }
}

@Composable
private fun VoiceControlPill(icon: ImageVector, contentDescription: String, active: Boolean = true, onClick: () -> Unit) {
  Box(
    modifier = Modifier
      .size(width = 78.dp, height = 58.dp)
      .clip(RoundedCornerShape(18.dp))
      .background(Color(0xFF1F1F1F))
      .border(width = 1.dp, color = Color.White.copy(alpha = 0.1f), shape = RoundedCornerShape(18.dp))
      .clickable(onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(
      icon,
      contentDescription = contentDescription,
      tint = Color.White.copy(alpha = if (active) 1f else 0.35f),
      modifier = Modifier.size(24.dp)
    )
  }
}

private fun imageProxyToJpeg(image: ImageProxy): ByteArray {
  val yBuffer = image.planes[0].buffer
  val uBuffer = image.planes[1].buffer
  val vBuffer = image.planes[2].buffer
  val ySize = yBuffer.remaining()
  val uSize = uBuffer.remaining()
  val vSize = vBuffer.remaining()
  val nv21 = ByteArray(ySize + uSize + vSize)
  yBuffer.get(nv21, 0, ySize)
  vBuffer.get(nv21, ySize, vSize)
  uBuffer.get(nv21, ySize + vSize, uSize)
  val yuvImage = YuvImage(nv21, ImageFormat.NV21, image.width, image.height, null)
  val out = ByteArrayOutputStream()
  yuvImage.compressToJpeg(Rect(0, 0, image.width, image.height), 70, out)
  return out.toByteArray()
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

  var menuConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var deleteConfirmConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var renameConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var renameText by remember { mutableStateOf("") }

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
          Icon(Icons.Outlined.ModeEdit, contentDescription = "New chat")
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
          Icon(Icons.Outlined.Schedule, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(16.dp))
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
          Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
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
            HistoryRow(
              convo,
              onClick = { viewModel.selectConversation(convo.id) },
              onMenuClick = { menuConvo = convo }
            )
          }
        }
      }
    }
  }

  val sheetConvo = menuConvo
  if (sheetConvo != null) {
    ModalBottomSheet(onDismissRequest = { menuConvo = null }) {
      Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = {
              menuConvo = null
              deleteConfirmConvo = sheetConvo
            })
            .padding(vertical = 14.dp)
        ) {
          DeleteIcon(tint = Color(0xFFFF6B6B))
          Spacer(modifier = Modifier.size(16.dp))
          Text("Delete", color = Color(0xFFFF6B6B), fontSize = 16.sp)
        }
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = {
              renameText = sheetConvo.title
              menuConvo = null
              renameConvo = sheetConvo
            })
            .padding(vertical = 14.dp)
        ) {
          Icon(Icons.Outlined.ModeEdit, contentDescription = null, tint = colorScheme.onBackground)
          Spacer(modifier = Modifier.size(16.dp))
          Text("Rename", color = colorScheme.onBackground, fontSize = 16.sp)
        }
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = {
              viewModel.togglePin(sheetConvo.id)
              menuConvo = null
            })
            .padding(vertical = 14.dp)
        ) {
          Icon(Icons.Outlined.PushPin, contentDescription = null, tint = colorScheme.onBackground)
          Spacer(modifier = Modifier.size(16.dp))
          Text(if (sheetConvo.pinned) "Unpin" else "Pin", color = colorScheme.onBackground, fontSize = 16.sp)
        }
      }
    }
  }

  val toDelete = deleteConfirmConvo
  if (toDelete != null) {
    AlertDialog(
      onDismissRequest = { deleteConfirmConvo = null },
      title = { Text("Delete conversation?") },
      text = { Text("This conversation will be deleted from your account. This action can't be undone.") },
      confirmButton = {
        TextButton(onClick = {
          viewModel.deleteConversation(toDelete.id)
          deleteConfirmConvo = null
        }) {
          Text("Delete", color = Color(0xFFFF6B6B), fontWeight = FontWeight.Bold)
        }
      },
      dismissButton = {
        TextButton(onClick = { deleteConfirmConvo = null }) {
          Text("Cancel", fontWeight = FontWeight.Bold)
        }
      }
    )
  }

  val toRename = renameConvo
  if (toRename != null) {
    AlertDialog(
      onDismissRequest = { renameConvo = null },
      title = { Text("Rename conversation") },
      text = {
        OutlinedTextField(
          value = renameText,
          onValueChange = { renameText = it },
          singleLine = true,
          shape = RoundedCornerShape(12.dp)
        )
      },
      confirmButton = {
        TextButton(onClick = {
          viewModel.renameConversation(toRename.id, renameText)
          renameConvo = null
        }) {
          Text("Save", fontWeight = FontWeight.Bold)
        }
      },
      dismissButton = {
        TextButton(onClick = { renameConvo = null }) {
          Text("Cancel")
        }
      }
    )
  }
}

@Composable
private fun HistoryRow(convo: ApiConversation, onClick: () -> Unit, onMenuClick: () -> Unit) {
  val lastMessage = convo.messages.lastOrNull()
  val dateText = lastMessage?.createdAt?.let { formatDate(it) } ?: ""
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(horizontal = 8.dp, vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Column(modifier = Modifier.weight(1f).padding(horizontal = 8.dp, vertical = 8.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        if (convo.pinned) {
          Icon(
            Icons.Outlined.PushPin,
            contentDescription = "Pinned",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(14.dp)
          )
          Spacer(modifier = Modifier.size(6.dp))
        }
        Text(
          text = convo.title.ifBlank { "New chat" },
          color = colorScheme.onBackground,
          fontSize = 16.sp,
          fontWeight = FontWeight.Normal
        )
      }
      if (dateText.isNotEmpty()) {
        Text(dateText, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 12.sp)
      }
    }
    IconButton(onClick = onMenuClick) {
      Icon(
        Icons.Filled.MoreVert,
        contentDescription = "Options",
        tint = colorScheme.onBackground.copy(alpha = 0.6f),
        modifier = Modifier.size(18.dp)
      )
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomizeScreen(viewModel: ChatViewModel) {
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Customize ChatGiZa", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeCustomize() }) {
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
    }
  }
}

@Composable
private fun ProfileAvatar(imageUrl: String?, modifier: Modifier = Modifier) {
  Box(
    modifier = modifier
      .size(160.dp)
      .clip(CircleShape)
      .background(Color(0xFF2F2F2F)),
    contentAlignment = Alignment.Center
  ) {
    if (imageUrl != null) {
      AsyncImage(
        model = imageUrl,
        contentDescription = "Profile photo",
        modifier = Modifier.fillMaxSize().clip(CircleShape)
      )
    } else {
      Icon(
        Icons.Filled.Person,
        contentDescription = "Profile photo",
        tint = Color.White,
        modifier = Modifier.size(72.dp)
      )
    }
  }
}

@Composable
private fun BirthYearCard(icon: ImageVector, value: String, onValueChange: (String) -> Unit) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(22.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.White)
      Spacer(modifier = Modifier.width(16.dp))
      TextField(
        value = value,
        onValueChange = { new -> if (new.length <= 4 && new.all { it.isDigit() }) onValueChange(new) },
        placeholder = { Text("YYYY", color = Color(0xFFA8A8A8)) },
        colors = TextFieldDefaults.colors(
          unfocusedContainerColor = Color.Transparent,
          focusedContainerColor = Color.Transparent,
          unfocusedIndicatorColor = Color.Transparent,
          focusedIndicatorColor = Color.Transparent,
          unfocusedTextColor = Color.White,
          focusedTextColor = Color.White
        ),
        modifier = Modifier.fillMaxWidth()
      )
    }
  }
}

@Composable
private fun EmailCard(icon: ImageVector, title: String, subtitle: String) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(22.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.White)
      Spacer(modifier = Modifier.width(16.dp))
      Column {
        Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium)
        Text(subtitle, color = Color(0xFFA8A8A8), fontSize = 13.sp)
      }
    }
  }
}

@Composable
private fun XAccountCard(icon: ImageVector, title: String, onClick: () -> Unit) {
  Card(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    shape = RoundedCornerShape(22.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.White)
      Spacer(modifier = Modifier.width(16.dp))
      Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeEditProfile() }
  var xNote by remember { mutableStateOf(false) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF262626))
      .verticalScroll(rememberScrollState())
      .padding(horizontal = 20.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeEditProfile() }) {
        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Text(
        "Edit Profile",
        color = Color.White,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.weight(1f)
      )
      Button(
        onClick = { viewModel.saveEditProfile() },
        enabled = !viewModel.savingProfile,
        colors = ButtonDefaults.buttonColors(disabledContainerColor = Color(0xFF3A3A3A)),
        shape = RoundedCornerShape(22.dp)
      ) {
        Text(if (viewModel.savingProfile) "Saving…" else "Save")
      }
    }

    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
      ProfileAvatar(imageUrl = viewModel.userImage)
      FilledIconButton(
        onClick = { xNote = true },
        modifier = Modifier
          .size(52.dp)
          .align(Alignment.BottomEnd)
          .offset(x = (-8).dp),
        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.White)
      ) {
        Icon(Icons.Outlined.Edit, contentDescription = "Change photo", tint = Color.Black)
      }
    }

    Spacer(modifier = Modifier.height(28.dp))

    Text("Name", color = Color(0xFFA8A8A8), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    Spacer(modifier = Modifier.height(10.dp))
    OutlinedTextField(
      value = viewModel.firstNameInput,
      onValueChange = viewModel::onFirstNameChange,
      modifier = Modifier.fillMaxWidth(),
      placeholder = { Text("First name") },
      shape = RoundedCornerShape(22.dp)
    )
    Spacer(modifier = Modifier.height(10.dp))
    OutlinedTextField(
      value = viewModel.lastNameInput,
      onValueChange = viewModel::onLastNameChange,
      modifier = Modifier.fillMaxWidth(),
      placeholder = { Text("Last name") },
      shape = RoundedCornerShape(22.dp)
    )

    Spacer(modifier = Modifier.height(28.dp))

    Text("Birth Year", color = Color(0xFFA8A8A8), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    Spacer(modifier = Modifier.height(10.dp))
    BirthYearCard(
      icon = Icons.Outlined.CalendarMonth,
      value = viewModel.birthYearInput,
      onValueChange = viewModel::onBirthYearChange
    )

    Spacer(modifier = Modifier.height(28.dp))

    Text("Account", color = Color(0xFFA8A8A8), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    Spacer(modifier = Modifier.height(10.dp))
    EmailCard(
      icon = Icons.Outlined.Email,
      title = "Email",
      subtitle = viewModel.userEmail ?: ""
    )
    Spacer(modifier = Modifier.height(10.dp))
    XAccountCard(
      icon = Icons.Outlined.Link,
      title = "Connect with X",
      onClick = { xNote = true }
    )

    if (xNote) {
      Spacer(modifier = Modifier.height(10.dp))
      Text("Coming soon", color = Color(0xFFA8A8A8), fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))
  }
}

private enum class AppTheme(val label: String, val icon: ImageVector) {
  LIGHT("Light", Icons.Filled.LightMode),
  DARK("Dark", Icons.Filled.DarkMode),
  SYSTEM("System", Icons.Filled.SettingsBrightness)
}

@Composable
private fun ThemeCard(theme: AppTheme, selected: Boolean, onClick: () -> Unit) {
  val bg by animateColorAsState(
    targetValue = if (selected) Color.White else Color(0xFF2F2F2F),
    animationSpec = tween(250),
    label = "themeCardBg"
  )
  val iconTint by animateColorAsState(
    targetValue = if (selected) Color.Black else Color(0xFFA0A0A0),
    animationSpec = tween(250),
    label = "themeCardIcon"
  )
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Box(
      modifier = Modifier
        .size(88.dp)
        .clip(RoundedCornerShape(22.dp))
        .background(bg)
        .clickable(onClick = onClick),
      contentAlignment = Alignment.Center
    ) {
      Icon(theme.icon, contentDescription = theme.label, tint = iconTint, modifier = Modifier.size(30.dp))
    }
    Spacer(modifier = Modifier.height(10.dp))
    Text(
      theme.label,
      color = colorScheme.onBackground,
      fontSize = 16.sp,
      fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
    )
  }
}

@Composable
private fun PreviewSlider(value: Float, onValueChange: (Float) -> Unit, modifier: Modifier = Modifier) {
  val density = LocalDensity.current
  BoxWithConstraints(modifier = modifier.height(18.dp)) {
    val trackWidthPx = with(density) { maxWidth.toPx() }
    val thumbPx = with(density) { 18.dp.toPx() }
    val usableWidth = (trackWidthPx - thumbPx).coerceAtLeast(0f)
    val thumbOffsetPx = value.coerceIn(0f, 1f) * usableWidth

    Box(
      modifier = Modifier
        .align(Alignment.CenterStart)
        .fillMaxWidth()
        .height(6.dp)
        .clip(RoundedCornerShape(999.dp))
        .background(Color.White.copy(alpha = 0.12f))
    ) {
      Box(
        modifier = Modifier
          .fillMaxHeight()
          .width(with(density) { (thumbOffsetPx + thumbPx / 2f).toDp() })
          .clip(RoundedCornerShape(999.dp))
          .background(Color.White)
      )
    }

    Box(
      modifier = Modifier
        .align(Alignment.CenterStart)
        .offset { IntOffset(thumbOffsetPx.roundToInt(), 0) }
        .size(18.dp)
        .clip(CircleShape)
        .background(Color.White)
        .draggable(
          orientation = Orientation.Horizontal,
          state = rememberDraggableState { delta ->
            if (usableWidth > 0f) {
              val newOffset = (thumbOffsetPx + delta).coerceIn(0f, usableWidth)
              onValueChange(newOffset / usableWidth)
            }
          }
        )
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppearanceScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAppearance() }
  var selectedTheme by remember { mutableStateOf(AppTheme.DARK) }
  var textSize by remember { mutableStateOf(0.5f) }
  val previewFontSize = (14f + 8f * textSize).sp

  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp)
        .padding(top = 20.dp, bottom = 24.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { viewModel.closeAppearance() }, modifier = Modifier.size(28.dp)) {
          Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.width(20.dp))
        Text("Appearance", color = colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      }

      Spacer(modifier = Modifier.height(24.dp))
      Text("Theme", color = colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        AppTheme.entries.forEach { theme ->
          ThemeCard(theme = theme, selected = selectedTheme == theme, onClick = { selectedTheme = theme })
        }
      }

      Spacer(modifier = Modifier.height(24.dp))
      Text("Text Size", color = colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .height(320.dp)
          .clip(RoundedCornerShape(28.dp))
          .background(Color(0xFF2F2F2F))
          .padding(24.dp)
      ) {
        Column(modifier = Modifier.fillMaxSize()) {
          PreviewSlider(
            value = textSize,
            onValueChange = { textSize = it },
            modifier = Modifier.fillMaxWidth()
          )

          Spacer(modifier = Modifier.height(24.dp))

          Box(
            modifier = Modifier
              .height(48.dp)
              .clip(RoundedCornerShape(24.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.12f))
              .padding(horizontal = 18.dp, vertical = 12.dp),
            contentAlignment = Alignment.CenterStart
          ) {
            Text("Hi! This is how your messages will look.", color = colorScheme.onBackground, fontSize = 16.sp)
          }

          Spacer(modifier = Modifier.height(20.dp))

          Text(
            "This is a preview of how ChatGiZa text will appear in your conversations.",
            color = colorScheme.onBackground,
            fontSize = previewFontSize,
            lineHeight = 28.sp
          )

          Spacer(modifier = Modifier.weight(1f))

          Text(
            "PREVIEW",
            color = Color(0xFF8A8A8A),
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
          )
        }
      }
    }
  }
}

private data class VoiceOption(val id: String, val name: String, val description: String)

private val VOICE_OPTIONS = listOf(
  VoiceOption("default", "Default", "Balanced and natural"),
  VoiceOption("warm", "Warm", "Warm and steady"),
  VoiceOption("calm", "Calm", "Calm and clear"),
  VoiceOption("bright", "Bright", "Bright and energetic"),
  VoiceOption("deep", "Deep", "Deep and confident")
)

@Composable
private fun VoiceCard(option: VoiceOption, selected: Boolean, onClick: () -> Unit) {
  val checkAlpha by animateFloatAsState(
    targetValue = if (selected) 1f else 0f,
    animationSpec = tween(250),
    label = "voiceCheckAlpha"
  )
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .height(78.dp)
      .clip(RoundedCornerShape(18.dp))
      .background(Color(0xFF2F2F2F))
      .clickable(onClick = onClick)
      .padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 16.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Column(modifier = Modifier.weight(1f)) {
      Text(option.name, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(option.description, color = Color(0xFFA8A8A8), fontSize = 15.sp, fontWeight = FontWeight.Normal)
    }
    if (checkAlpha > 0f) {
      Icon(
        Icons.Filled.Check,
        contentDescription = "Selected",
        tint = Color.White.copy(alpha = checkAlpha),
        modifier = Modifier.size(28.dp).padding(end = 8.dp)
      )
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VoiceScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeVoice() }
  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(20.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { viewModel.closeVoice() }, modifier = Modifier.size(28.dp)) {
          Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.width(20.dp))
        Text("Voice", color = colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      }

      Spacer(modifier = Modifier.height(24.dp))

      Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        VOICE_OPTIONS.forEach { option ->
          VoiceCard(
            option = option,
            selected = viewModel.selectedVoiceId == option.id,
            onClick = { viewModel.selectVoice(option.id) }
          )
        }
      }
    }
  }
}

private enum class FeedbackType(val label: String, val icon: ImageVector) {
  GENERAL("General Feedback", Icons.Outlined.ChatBubbleOutline),
  BUG("Report an issue / bug", Icons.Outlined.BugReport),
  RESPONSE("Response feedback", Icons.Outlined.Feedback)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportProblemScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeReportProblem() }
  var selectedType by remember { mutableStateOf(FeedbackType.GENERAL) }
  var typeMenuOpen by remember { mutableStateOf(false) }
  var description by remember { mutableStateOf("") }
  var attachedImageUri by remember { mutableStateOf<Uri?>(null) }
  var submitted by remember { mutableStateOf(false) }

  val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) attachedImageUri = uri
  }

  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(20.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        Text("Send Feedback", color = colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        IconButton(onClick = { viewModel.closeReportProblem() }, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(30.dp))
        }
      }

      Spacer(modifier = Modifier.height(24.dp))

      Box {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF2F2F2F))
            .clickable { typeMenuOpen = true }
            .padding(horizontal = 16.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(selectedType.icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(30.dp))
          Spacer(modifier = Modifier.width(16.dp))
          Text(selectedType.label, color = colorScheme.onBackground, fontSize = 16.sp, modifier = Modifier.weight(1f))
          Icon(
            Icons.Outlined.KeyboardArrowDown,
            contentDescription = "Choose feedback type",
            tint = Color(0xFFBDBDBD),
            modifier = Modifier.size(24.dp)
          )
        }
        DropdownMenu(expanded = typeMenuOpen, onDismissRequest = { typeMenuOpen = false }) {
          FeedbackType.entries.forEach { type ->
            val isSelected = type == selectedType
            DropdownMenuItem(
              text = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                  Icon(
                    type.icon,
                    contentDescription = null,
                    tint = if (isSelected) Color.White else Color(0xFFBDBDBD),
                    modifier = Modifier.size(30.dp)
                  )
                  Spacer(modifier = Modifier.width(16.dp))
                  Text(type.label, modifier = Modifier.weight(1f))
                  if (isSelected) {
                    Spacer(modifier = Modifier.width(16.dp))
                    Icon(Icons.Filled.Check, contentDescription = "Selected", tint = Color.White, modifier = Modifier.size(28.dp))
                  }
                }
              },
              onClick = {
                selectedType = type
                typeMenuOpen = false
              }
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      OutlinedTextField(
        value = description,
        onValueChange = { description = it },
        modifier = Modifier.fillMaxWidth().height(140.dp),
        placeholder = { Text("Describe the issue…") },
        shape = RoundedCornerShape(14.dp)
      )

      Spacer(modifier = Modifier.height(16.dp))

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { imagePicker.launch("image/*") },
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(Icons.Outlined.Image, contentDescription = "Attach images", tint = Color.White, modifier = Modifier.size(28.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(
          if (attachedImageUri != null) "1 image attached" else "Attach Images",
          color = colorScheme.onBackground,
          fontSize = 16.sp
        )
      }

      Spacer(modifier = Modifier.height(24.dp))

      Button(
        onClick = { submitted = true },
        enabled = description.isNotBlank() && !submitted,
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth().height(48.dp)
      ) {
        Text(if (submitted) "Sent — thank you!" else "Submit")
      }
    }
  }
}

@Composable
private fun DataControlsAppBar(title: String, onBack: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 20.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    IconButton(onClick = onBack, modifier = Modifier.size(28.dp)) {
      Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
    }
    Spacer(modifier = Modifier.width(20.dp))
    Text(title, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
  }
}

@Composable
private fun DataControlToggleRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
  Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
    Column(modifier = Modifier.weight(1f)) {
      Text(title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(subtitle, color = Color(0xFFA8A8A8), fontSize = 16.sp, fontWeight = FontWeight.Normal)
    }
    Spacer(modifier = Modifier.width(12.dp))
    Switch(checked = checked, onCheckedChange = onCheckedChange)
  }
}

@Composable
private fun DangerRow(label: String, onClick: () -> Unit) {
  Text(
    label,
    color = Color(0xFFFF3B30),
    fontSize = 18.sp,
    fontWeight = FontWeight.Bold,
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
  )
}

@Composable
private fun ConfirmDangerDialog(title: String, message: String, onConfirm: () -> Unit, onDismiss: () -> Unit) {
  AlertDialog(
    onDismissRequest = onDismiss,
    title = { Text(title) },
    text = { Text(message) },
    confirmButton = {
      TextButton(onClick = { onConfirm(); onDismiss() }) {
        Text("Delete", color = Color(0xFFFF3B30))
      }
    },
    dismissButton = {
      TextButton(onClick = onDismiss) { Text("Cancel") }
    }
  )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DataControlsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeDataControls() }
  var confirmDeleteConversations by remember { mutableStateOf(false) }
  var confirmDeleteMedia by remember { mutableStateOf(false) }
  var confirmDeleteAccount by remember { mutableStateOf(false) }

  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp)
    ) {
      DataControlsAppBar("Data Controls") { viewModel.closeDataControls() }

      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { viewModel.openManageCloudStorage() }
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Column(modifier = Modifier.weight(1f)) {
            Text("Manage Cloud Storage", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              "See all the files and assets you have uploaded to ChatGiZa. You can also delete them here.",
              color = Color(0xFFA8A8A8),
              fontSize = 16.sp
            )
          }
          Spacer(modifier = Modifier.width(12.dp))
          Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFFA8A8A8), modifier = Modifier.size(24.dp))
        }
      }
      Spacer(modifier = Modifier.height(32.dp))

      DataControlToggleRow(
        title = "Personalize with memories",
        subtitle = "Allow ChatGiZa to remember details from your previous conversations. Private chats are never stored.",
        checked = viewModel.profileData.memoryEnabled,
        onCheckedChange = { viewModel.setMemoryEnabled(it) }
      )
      Spacer(modifier = Modifier.height(32.dp))

      DataControlToggleRow(
        title = "Improve the Model",
        subtitle = "Allow ChatGiZa to use conversation data to improve future AI responses while protecting user privacy.",
        checked = viewModel.settingsData.privacy.improveModel,
        onCheckedChange = { value -> viewModel.setPrivacyPref { it.copy(improveModel = value) } }
      )
      Spacer(modifier = Modifier.height(32.dp))

      DataControlToggleRow(
        title = "Personalize ChatGiZa",
        subtitle = "Allow your account preferences and usage to personalize your ChatGiZa experience.",
        checked = viewModel.personalizeChatGizaEnabled,
        onCheckedChange = { viewModel.setPersonalizeChatGiza(it) }
      )
      Spacer(modifier = Modifier.height(32.dp))

      DataControlToggleRow(
        title = "Allow Chat Link Sharing",
        subtitle = "Allow sharing conversations using secure public links.",
        checked = viewModel.chatLinkSharingEnabled,
        onCheckedChange = { viewModel.setChatLinkSharing(it) }
      )
      Spacer(modifier = Modifier.height(40.dp))

      DangerRow("Delete All Conversations") { confirmDeleteConversations = true }
      Spacer(modifier = Modifier.height(32.dp))
      DangerRow("Delete All Images & Media") { confirmDeleteMedia = true }
      Spacer(modifier = Modifier.height(32.dp))
      DangerRow("Delete Account") { confirmDeleteAccount = true }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }

  if (confirmDeleteConversations) {
    ConfirmDangerDialog(
      title = "Delete all conversations?",
      message = "This permanently deletes every conversation in your ChatGiZa history. This can't be undone.",
      onConfirm = { viewModel.deleteAllConversations() },
      onDismiss = { confirmDeleteConversations = false }
    )
  }
  if (confirmDeleteMedia) {
    ConfirmDangerDialog(
      title = "Delete all images & media?",
      message = "This can't be undone.",
      onConfirm = {},
      onDismiss = { confirmDeleteMedia = false }
    )
  }
  if (confirmDeleteAccount) {
    ConfirmDangerDialog(
      title = "Delete account?",
      message = "This permanently deletes your ChatGiZa account and all associated data. This can't be undone.",
      onConfirm = { viewModel.deleteAccount() },
      onDismiss = { confirmDeleteAccount = false }
    )
  }
}

@Composable
private fun ManageCloudStorageScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeManageCloudStorage() }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 20.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeManageCloudStorage() }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
      }
      Spacer(modifier = Modifier.width(20.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text("0 B", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("0% used", color = Color(0xFFA8A8A8), fontSize = 16.sp)
      }
      Icon(Icons.Filled.Tune, contentDescription = "Filter", tint = Color.White, modifier = Modifier.size(26.dp))
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Outlined.Image, contentDescription = null, tint = Color(0xFFA8A8A8), modifier = Modifier.size(40.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text("No files yet", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
          "Images, videos, and documents you upload to ChatGiZa will show up here.",
          color = Color(0xFFA8A8A8),
          fontSize = 15.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 32.dp)
        )
      }
    }
  }
}

/** Drawn mockup of the ChatGiZa home-screen widget — there's no real
 * AppWidgetProvider yet, so this stands in for the widget_preview /
 * widget_large drawables a real implementation would render. */
@Composable
private fun WidgetMockPreview(modifier: Modifier = Modifier) {
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(18.dp))
      .background(Color(0xFF1A1A1A))
      .padding(16.dp)
  ) {
    Column {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
          modifier = Modifier.size(28.dp).clip(CircleShape).background(Color.White),
          contentAlignment = Alignment.Center
        ) {
          Text("G", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text("ChatGiZa", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(14.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        WidgetMockAction(Icons.Outlined.ModeEdit, "Chat", Modifier.weight(1f))
        WidgetMockAction(Icons.Filled.AutoAwesome, "Imagine", Modifier.weight(1f))
        WidgetMockAction(Icons.Filled.GraphicEq, "Voice", Modifier.weight(1f))
      }
    }
  }
}

@Composable
private fun WidgetMockAction(icon: ImageVector, label: String, modifier: Modifier = Modifier) {
  Column(
    modifier = modifier
      .clip(RoundedCornerShape(12.dp))
      .background(Color.White.copy(alpha = 0.08f))
      .padding(vertical = 10.dp),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
    Spacer(modifier = Modifier.height(4.dp))
    Text(label, color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WidgetsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeWidgets() }
  var showBottomSheet by remember { mutableStateOf(false) }
  var addedMessage by remember { mutableStateOf(false) }

  Scaffold(
    containerColor = Color(0xFF262626),
    topBar = {
      TopAppBar(
        title = { Text("Widget") },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeWidgets() }) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF262626))
      )
    }
  ) { padding ->
    Column(
      modifier = Modifier
        .padding(padding)
        .padding(20.dp)
    ) {
      Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
      ) {
        WidgetMockPreview(
          modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp)
            .height(140.dp)
        )

        Text(
          text = "Get quick access to chat, imagine and voice with ChatGiZa",
          color = Color.White,
          fontSize = 18.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth().padding(20.dp)
        )
      }

      Spacer(modifier = Modifier.height(12.dp))

      Card(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { showBottomSheet = true },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
      ) {
        Row(
          modifier = Modifier.padding(20.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Filled.AddToHomeScreen, contentDescription = null, tint = Color.White)
          Spacer(modifier = Modifier.width(16.dp))
          Text("Add Widget", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
      }

      if (addedMessage) {
        Spacer(modifier = Modifier.height(12.dp))
        Text(
          "Home-screen widgets are coming soon — this preview shows what it'll look like.",
          color = Color(0xFFA8A8A8),
          fontSize = 13.sp
        )
      }
    }
  }

  if (showBottomSheet) {
    ModalBottomSheet(
      onDismissRequest = { showBottomSheet = false },
      containerColor = Color(0xFF2F2F2F)
    ) {
      Text(
        "Add to Desktop",
        color = Color.White,
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(24.dp)
      )

      Text(
        "ChatGiZa",
        color = Color.White,
        fontSize = 24.sp,
        modifier = Modifier.align(Alignment.CenterHorizontally)
      )

      Text(
        "Quick access to ChatGiZa features",
        color = Color(0xFFA8A8A8),
        modifier = Modifier.align(Alignment.CenterHorizontally)
      )

      WidgetMockPreview(
        modifier = Modifier
          .fillMaxWidth()
          .padding(24.dp)
          .height(220.dp)
      )

      Button(
        onClick = {
          showBottomSheet = false
          addedMessage = true
        },
        modifier = Modifier
          .fillMaxWidth()
          .padding(24.dp)
          .height(56.dp),
        shape = RoundedCornerShape(28.dp)
      ) {
        Text("Add")
      }
    }
  }
}

@Composable
private fun HapticCard(icon: ImageVector, title: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(22.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(imageVector = icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(30.dp))
      Spacer(Modifier.width(18.dp))
      Text(text = title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
      Spacer(Modifier.weight(1f))
      Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
  }
}

@Composable
private fun ToggleCard(title: String, checked: Boolean, enabled: Boolean, onCheckedChange: (Boolean) -> Unit) {
  Card(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(18.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = title,
        color = if (enabled) Color.White else Color.White.copy(alpha = 0.4f),
        fontSize = 19.sp,
        fontWeight = FontWeight.Bold
      )
      Spacer(Modifier.weight(1f))
      Switch(checked = checked, onCheckedChange = onCheckedChange, enabled = enabled)
    }
  }
}

@Composable
private fun HapticsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeHaptics() }
  val haptic = LocalHapticFeedback.current

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF262626))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeHaptics() }) {
        Icon(imageVector = Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Haptics", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(Modifier.height(28.dp))

    HapticCard(
      icon = Icons.Outlined.Vibration,
      title = "Haptics",
      checked = viewModel.hapticsEnabled,
      onCheckedChange = { value ->
        viewModel.updateHapticsEnabled(value)
        if (value) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
      }
    )

    Spacer(Modifier.height(28.dp))

    Text(
      text = "When is haptic needed",
      color = Color.Gray,
      fontSize = 17.sp,
      fontWeight = FontWeight.SemiBold
    )

    Spacer(Modifier.height(18.dp))

    ToggleCard(
      "Pressing buttons",
      checked = viewModel.hapticsOnPress,
      enabled = viewModel.hapticsEnabled,
      onCheckedChange = { value ->
        viewModel.updateHapticsOnPress(value)
        if (value) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
      }
    )

    Spacer(Modifier.height(2.dp))

    ToggleCard(
      "ChatGiZa is responding",
      checked = viewModel.hapticsOnResponse,
      enabled = viewModel.hapticsEnabled,
      onCheckedChange = { value ->
        viewModel.updateHapticsOnResponse(value)
        if (value) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
      }
    )
  }
}

private data class LangEntry(
  val locale: Locale,
  val nativeName: String,
  val englishName: String,
  val iso2: String,
  val iso3: String
)

/** Every language Android itself knows about, deduplicated by ISO-639
 * language code (not full locale/country) — matches the "orodha kamili
 * ya languages" requirement via Locale.getAvailableLocales() rather than
 * a hand-picked subset. */
private fun buildLanguageEntries(): List<LangEntry> {
  val seen = mutableSetOf<String>()
  val entries = mutableListOf<LangEntry>()
  for (locale in Locale.getAvailableLocales()) {
    val lang = locale.language
    if (lang.isBlank() || !seen.add(lang)) continue
    val base = Locale(lang)
    val native = base.getDisplayName(base).replaceFirstChar { it.uppercase() }
    val english = base.getDisplayName(Locale.ENGLISH).replaceFirstChar { it.uppercase() }
    if (native.isBlank() || native == lang) continue
    val iso3 = runCatching { base.isO3Language }.getOrDefault("")
    entries.add(LangEntry(base, native, english, lang, iso3))
  }
  return entries.sortedBy { it.nativeName }
}

private val SUGGESTED_LANGUAGE_CODES = listOf("en", "sw", "fr", "ar", "es", "pt", "de", "zh", "hi", "am", "so", "ha", "ig")

@Composable
private fun LanguageRow(label: String, selected: Boolean, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(label, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
    if (selected) {
      Icon(Icons.Filled.Check, contentDescription = "Selected", tint = Color(0xFF2979FF), modifier = Modifier.size(22.dp))
    }
  }
}

@Composable
private fun AppLanguageScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAppLanguage() }
  var query by remember { mutableStateOf("") }
  var searchOpen by remember { mutableStateOf(false) }
  val allEntries = remember { buildLanguageEntries() }
  val suggested = remember(allEntries) {
    allEntries.filter { it.iso2 in SUGGESTED_LANGUAGE_CODES }.sortedBy { SUGGESTED_LANGUAGE_CODES.indexOf(it.iso2) }
  }
  val filtered = remember(query, allEntries) {
    val q = query.trim()
    if (q.isEmpty()) null
    else allEntries.filter { e ->
      e.nativeName.contains(q, ignoreCase = true) ||
        e.englishName.contains(q, ignoreCase = true) ||
        e.iso2.startsWith(q, ignoreCase = true) ||
        (e.iso3.isNotEmpty() && e.iso3.startsWith(q, ignoreCase = true))
    }
  }

  val isAutoDetect = viewModel.profileData.language.isBlank() ||
    viewModel.profileData.language.equals("Auto-detect", ignoreCase = true)
  val currentLabel = if (isAutoDetect) "Auto-detect" else viewModel.profileData.language

  fun applyLocale(entry: LangEntry?) {
    // Applies the OS-level per-app locale (affects the keyboard, share
    // sheets, date/number formatting) without recreating the Activity —
    // this app's own screens aren't localized yet, so a forced recreate
    // would just reset navigation back to Chat for no visible benefit.
    if (entry == null) {
      viewModel.setAppLanguage("Auto-detect")
      AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
    } else {
      viewModel.setAppLanguage(entry.englishName)
      AppCompatDelegate.setApplicationLocales(LocaleListCompat.create(entry.locale))
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF262626))
      .padding(horizontal = 20.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 16.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeAppLanguage() }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
      }
      Spacer(modifier = Modifier.width(18.dp))
      Text("App Language", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
      IconButton(onClick = { searchOpen = !searchOpen }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Filled.Search, contentDescription = "Search languages", tint = Color.White, modifier = Modifier.size(28.dp))
      }
    }

    if (searchOpen) {
      OutlinedTextField(
        value = query,
        onValueChange = { query = it },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Search languages") },
        singleLine = true,
        shape = RoundedCornerShape(16.dp)
      )
      Spacer(modifier = Modifier.height(12.dp))
    }

    if (query.isBlank()) {
      Card(
        modifier = Modifier.fillMaxWidth().height(120.dp),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
      ) {
        Row(modifier = Modifier.fillMaxSize().padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier.size(48.dp).clip(CircleShape).background(Color.White),
            contentAlignment = Alignment.Center
          ) {
            Text("G", color = Color.Black, fontSize = 20.sp, fontWeight = FontWeight.Bold)
          }
          Spacer(modifier = Modifier.width(16.dp))
          Column {
            Text("Current Language", color = Color(0xFFA8A8A8), fontSize = 13.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(currentLabel, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))
      Text("Suggested", color = Color(0xFF2979FF), fontSize = 18.sp, fontWeight = FontWeight.Bold)
      LanguageRow("System Default", selected = isAutoDetect) { applyLocale(null) }
      suggested.forEach { e ->
        LanguageRow(e.nativeName, selected = !isAutoDetect && currentLabel.equals(e.englishName, ignoreCase = true)) {
          applyLocale(e)
        }
      }

      Spacer(modifier = Modifier.height(12.dp))
      Text("All Languages", color = Color(0xFF2979FF), fontSize = 18.sp, fontWeight = FontWeight.Bold)
      LazyColumn(modifier = Modifier.weight(1f)) {
        items(allEntries, key = { it.iso2 }) { e ->
          LanguageRow(e.nativeName, selected = !isAutoDetect && currentLabel.equals(e.englishName, ignoreCase = true)) {
            applyLocale(e)
          }
        }
      }
    } else {
      LazyColumn(modifier = Modifier.weight(1f)) {
        val results = filtered.orEmpty()
        if (results.isEmpty()) {
          item {
            Text(
              "No matches.",
              color = Color(0xFFA8A8A8),
              fontSize = 14.sp,
              modifier = Modifier.fillMaxWidth().padding(top = 32.dp),
              textAlign = TextAlign.Center
            )
          }
        }
        items(results, key = { it.iso2 }) { e ->
          LanguageRow(e.nativeName, selected = !isAutoDetect && currentLabel.equals(e.englishName, ignoreCase = true)) {
            applyLocale(e)
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAccount() }
  Scaffold(
    containerColor = Color.Transparent
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp, vertical = 8.dp)
    ) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { viewModel.openEditProfile() }
          .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        if (viewModel.userImage != null) {
          AsyncImage(
            model = viewModel.userImage,
            contentDescription = "Profile",
            modifier = Modifier.size(52.dp).clip(CircleShape)
          )
        } else {
          Icon(
            Icons.Filled.Person,
            contentDescription = "Profile",
            tint = colorScheme.onBackground,
            modifier = Modifier.size(52.dp)
          )
        }
        Spacer(modifier = Modifier.size(12.dp))
        Column {
          Text(viewModel.userName ?: "", color = colorScheme.onBackground, fontSize = 16.sp, fontWeight = FontWeight.Medium)
          if (viewModel.userEmail != null) {
            Text(viewModel.userEmail ?: "", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
          }
        }
      }

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(vertical = 4.dp)
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFF2563EB))
          .clickable(onClick = { viewModel.openBilling() })
          .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column(modifier = Modifier.weight(1f)) {
          Text("Save 66% on GiZa Pro", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
          Text("Upgrade for higher limits", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
        }
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
          Text("Claim Offer", color = Color(0xFF2563EB), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
      }

      SettingsSectionHeader("App")
      SettingsMenuRow("Appearance") { viewModel.openAppearance() }
      SettingsMenuRow("Haptics") { viewModel.openHaptics() }
      SettingsMenuRow("Widgets") { viewModel.openWidgets() }
      SettingsMenuRow("App Language") { viewModel.openAppLanguage() }
      SettingsMenuRow("Advanced")

      SettingsSectionHeader("GiZa")
      SettingsMenuRow("Customize GiZa") { viewModel.openCustomize() }
      SettingsMenuRow("Connectors")
      SettingsMenuRow("NSFW Preferences")

      SettingsSectionHeader("Voice")
      SettingsMenuRow("Voice") { viewModel.openVoice() }

      SettingsSectionHeader("Data & Information")
      SettingsMenuRow("Shared Conversations")
      SettingsMenuRow("Data Controls") { viewModel.openDataControls() }
      SettingsMenuRow("Open Source Licenses")
      SettingsMenuRow("Terms of Use")
      SettingsMenuRow("Privacy Policy")

      SettingsSectionHeader("Support")
      SettingsMenuRow("Report a Problem") { viewModel.openReportProblem() }

      SettingsSectionHeader("Account")
      SettingsMenuRow("Sign out", textColor = Color(0xFFFF6B6B)) { viewModel.signOut() }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

@Composable
private fun SettingsSectionHeader(title: String) {
  Text(
    title,
    color = colorScheme.onBackground.copy(alpha = 0.5f),
    fontSize = 12.sp,
    fontWeight = FontWeight.SemiBold,
    modifier = Modifier.padding(top = 20.dp, bottom = 6.dp)
  )
}

/** A settings row — real and clickable when [onClick] is given, otherwise a
 * plain (dimmed) label reserving its place in the menu until it's wired up. */
@Composable
private fun SettingsMenuRow(
  title: String,
  textColor: Color? = null,
  onClick: (() -> Unit)? = null
) {
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .let { if (onClick != null) it.clickable(onClick = onClick) else it }
      .padding(vertical = 14.dp)
  ) {
    Text(
      title,
      color = textColor ?: colorScheme.onBackground.copy(alpha = if (onClick != null) 1f else 0.4f),
      fontSize = 16.sp,
      fontWeight = FontWeight.Medium
    )
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
                DeleteIcon(tint = colorScheme.onBackground.copy(alpha = 0.6f))
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
                DeleteIcon(tint = colorScheme.onBackground.copy(alpha = 0.6f))
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
private fun MessageBubble(message: UiMessage, onSpeak: () -> Unit) {
  val isUser = message.role == "user"
  Column(modifier = Modifier.fillMaxWidth()) {
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
        if (isUser) {
          Text(
            text = message.content.ifEmpty { "…" },
            color = colorScheme.onBackground,
            fontSize = 15.sp
          )
        } else {
          MarkdownText(
            text = message.content.ifEmpty { "…" },
            baseColor = colorScheme.onBackground,
            fontSize = 15.sp
          )
        }
      }
    }
    if (!isUser && message.content.isNotBlank()) {
      IconButton(onClick = onSpeak, modifier = Modifier.size(32.dp)) {
        Icon(
          Icons.Outlined.VolumeUp,
          contentDescription = "Read aloud",
          tint = colorScheme.onBackground.copy(alpha = 0.5f),
          modifier = Modifier.size(18.dp)
        )
      }
    }
  }
}

// Lightweight Markdown renderer matching the subset the website's
// react-markdown + remark-gfm renders for assistant replies (headings,
// bold/italic, inline code, bullet/numbered lists, fenced code blocks) so
// AI output looks the same on both surfaces instead of showing raw syntax.
private sealed class MdBlock {
  data class Heading(val level: Int, val text: String) : MdBlock()
  data class Paragraph(val text: String) : MdBlock()
  data class Bullet(val text: String) : MdBlock()
  data class Numbered(val index: String, val text: String) : MdBlock()
  data class CodeBlock(val code: String) : MdBlock()
}

private fun parseMarkdownBlocks(source: String): List<MdBlock> {
  val blocks = mutableListOf<MdBlock>()
  val lines = source.split("\n")
  val paragraphBuffer = StringBuilder()
  fun flushParagraph() {
    if (paragraphBuffer.isNotBlank()) blocks.add(MdBlock.Paragraph(paragraphBuffer.toString().trim()))
    paragraphBuffer.clear()
  }
  var i = 0
  val numberedRegex = Regex("^(\\d+)\\.\\s+(.*)$")
  while (i < lines.size) {
    val trimmed = lines[i].trim()
    val numberedMatch = numberedRegex.find(trimmed)
    when {
      trimmed.startsWith("```") -> {
        flushParagraph()
        val code = StringBuilder()
        i++
        while (i < lines.size && !lines[i].trim().startsWith("```")) {
          code.append(lines[i]).append("\n")
          i++
        }
        blocks.add(MdBlock.CodeBlock(code.toString().trimEnd()))
      }
      trimmed.startsWith("### ") -> { flushParagraph(); blocks.add(MdBlock.Heading(3, trimmed.removePrefix("### "))) }
      trimmed.startsWith("## ") -> { flushParagraph(); blocks.add(MdBlock.Heading(2, trimmed.removePrefix("## "))) }
      trimmed.startsWith("# ") -> { flushParagraph(); blocks.add(MdBlock.Heading(1, trimmed.removePrefix("# "))) }
      trimmed.startsWith("- ") || trimmed.startsWith("* ") -> { flushParagraph(); blocks.add(MdBlock.Bullet(trimmed.drop(2))) }
      numberedMatch != null -> {
        flushParagraph()
        blocks.add(MdBlock.Numbered(numberedMatch.groupValues[1], numberedMatch.groupValues[2]))
      }
      trimmed.isEmpty() -> flushParagraph()
      else -> {
        if (paragraphBuffer.isNotEmpty()) paragraphBuffer.append(" ")
        paragraphBuffer.append(trimmed)
      }
    }
    i++
  }
  flushParagraph()
  return blocks
}

private fun inlineMarkdown(raw: String) = buildAnnotatedString {
  var idx = 0
  val len = raw.length
  while (idx < len) {
    when {
      raw.startsWith("**", idx) -> {
        val end = raw.indexOf("**", idx + 2)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(raw.substring(idx + 2, end)) }
          idx = end + 2
        }
      }
      raw.startsWith("`", idx) -> {
        val end = raw.indexOf("`", idx + 1)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          withStyle(
            SpanStyle(fontFamily = FontFamily.Monospace, background = Color.White.copy(alpha = 0.1f))
          ) { append(raw.substring(idx + 1, end)) }
          idx = end + 1
        }
      }
      raw.startsWith("*", idx) -> {
        val end = raw.indexOf("*", idx + 1)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(raw.substring(idx + 1, end)) }
          idx = end + 1
        }
      }
      else -> {
        append(raw[idx]); idx++
      }
    }
  }
}

@Composable
private fun MarkdownText(
  text: String,
  baseColor: Color,
  fontSize: TextUnit,
  modifier: Modifier = Modifier
) {
  val blocks = remember(text) { parseMarkdownBlocks(text) }
  Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
    for (block in blocks) {
      when (block) {
        is MdBlock.Heading -> Text(
          text = inlineMarkdown(block.text),
          color = baseColor,
          fontWeight = FontWeight.Bold,
          fontSize = when (block.level) {
            1 -> fontSize * 1.3f
            2 -> fontSize * 1.2f
            else -> fontSize * 1.1f
          }
        )
        is MdBlock.Paragraph -> Text(text = inlineMarkdown(block.text), color = baseColor, fontSize = fontSize)
        is MdBlock.Bullet -> Row {
          Text("•  ", color = baseColor, fontSize = fontSize)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, modifier = Modifier.weight(1f))
        }
        is MdBlock.Numbered -> Row {
          Text("${block.index}.  ", color = baseColor, fontSize = fontSize)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, modifier = Modifier.weight(1f))
        }
        is MdBlock.CodeBlock -> Box(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(10.dp)
        ) {
          Text(block.code, color = baseColor, fontFamily = FontFamily.Monospace, fontSize = fontSize * 0.9f)
        }
      }
    }
  }
}
