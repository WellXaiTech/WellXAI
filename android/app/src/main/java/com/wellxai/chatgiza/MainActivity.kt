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
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.material3.DismissibleDrawerSheet
import androidx.compose.material3.DismissibleNavigationDrawer
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.rememberDrawerState
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
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme.colorScheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddToHomeScreen
import androidx.compose.material.icons.filled.ArrowBackIosNew
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.KeyboardDoubleArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.TrendingFlat
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.AddBox
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.AttachMoney
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Autorenew
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.ChildCare
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.EmojiEmotions
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Feedback
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.Headset
import androidx.compose.material.icons.outlined.Hearing
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.Cameraswitch
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.FlashOff
import androidx.compose.material.icons.outlined.FlashOn
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicNone
import androidx.compose.material.icons.outlined.ModeEdit
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.Quiz
import androidx.compose.material.icons.outlined.NoAdultContent
import androidx.compose.material.icons.outlined.Photo
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material.icons.outlined.Poll
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material.icons.outlined.RecordVoiceOver
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.ScreenShare
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Storage
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Vibration
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VolumeOff
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material.icons.outlined.Whatshot
import androidx.compose.material.icons.outlined.Widgets
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.io.ByteArrayOutputStream
import java.util.Locale
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
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
      ChatGizaTheme(themeMode = viewModel.themeMode) {
        Surface {
          val screen = viewModel.screen
          // Account/Settings/Projects/Scheduled/LiveVision are reachable by
          // tapping a tab under History, and must stay INSIDE this same drawer wrapper
          // rather than tearing it down and rebuilding it fresh — tearing it
          // down raced the drawer's own close animation (drawerState still
          // briefly read "Open" a frame after the screen changed) against the
          // sync effect below, which kept reading that stale Open value as
          // "the user must have swiped History open" and snapped straight
          // back to History before the tap's destination ever became visible.
          // Keeping the drawer mounted continuously across all of these
          // avoids that race entirely instead of just narrowing it.
          val screensInsideHistoryDrawer = screen is AppScreen.Chat || screen is AppScreen.Imagine ||
            screen is AppScreen.History || screen is AppScreen.Account || screen is AppScreen.Settings ||
            screen is AppScreen.Projects || screen is AppScreen.Scheduled || screen is AppScreen.LiveVision
          if (screensInsideHistoryDrawer) {
            // Lets History be reached by swiping in from the left edge of Chat/
            // Imagine (and swiped back out), instead of only via the hamburger
            // tap — drawer open/close state stays a mirror of viewModel.screen
            // so system back, the hamburger icon, and gesture swipes all agree.
            val drawerState = rememberDrawerState(
              initialValue = if (screen is AppScreen.History) DrawerValue.Open else DrawerValue.Closed
            )
            LaunchedEffect(screen) {
              if (screen is AppScreen.History) drawerState.open() else drawerState.close()
            }
            // Two-way sync: whichever side changes first (a tap on the
            // hamburger icon vs. a manual swipe) drives the other, so they
            // can never end up disagreeing about whether History is open.
            // Narrowed to Chat/Imagine — the only screens a manual edge-swipe
            // can happen from — so it can't fight a tap that just navigated
            // to one of the other screens above.
            LaunchedEffect(drawerState) {
              snapshotFlow { drawerState.currentValue }.collect { value ->
                when {
                  value == DrawerValue.Open &&
                    (viewModel.screen is AppScreen.Chat || viewModel.screen is AppScreen.Imagine) ->
                    viewModel.openHistory()
                  value == DrawerValue.Closed && viewModel.screen is AppScreen.History -> viewModel.closeHistory()
                }
              }
            }
            // The keyboard used to stay open (sitting uselessly behind the
            // drawer) if the user swiped History open mid-typing — watch
            // targetValue (not currentValue) so it dismisses the instant the
            // swipe commits to opening, not only once the animation finishes.
            val keyboardController = LocalSoftwareKeyboardController.current
            val focusManager = LocalFocusManager.current
            LaunchedEffect(drawerState) {
              snapshotFlow { drawerState.targetValue }.collect { target ->
                if (target == DrawerValue.Open) {
                  focusManager.clearFocus()
                  keyboardController?.hide()
                }
              }
            }
            // Dismissible (not Modal) — the reference behavior is the chat
            // content, composer included, physically sliding aside as
            // History opens, not a scrim-covered overlay sitting on top of
            // a frozen composer underneath.
            DismissibleNavigationDrawer(
              drawerState = drawerState,
              // No custom width here on purpose — Material3's own default
              // drawer width is what its swipe-gesture math (the distance a
              // drag needs to cover to fully open) is built around; overriding
              // it made the swipe stop short of fully open.
              drawerContent = {
                DismissibleDrawerSheet(drawerContainerColor = colorScheme.background) {
                  HistoryScreen(viewModel)
                }
              }
            ) {
              when (screen) {
                is AppScreen.Imagine -> ImagineScreen(viewModel)
                is AppScreen.Account -> AccountScreen(viewModel)
                is AppScreen.Settings -> SettingsScreen(viewModel)
                is AppScreen.Projects -> ProjectsScreen(viewModel)
                is AppScreen.Scheduled -> ScheduledScreen(viewModel)
                is AppScreen.LiveVision -> LiveVisionScreen(viewModel)
                else -> ChatScreenUi(viewModel)
              }
            }
            return@Surface
          }
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
            is AppScreen.Advanced -> AdvancedScreen(viewModel)
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
private fun ChatGizaTheme(themeMode: String, content: @Composable () -> Unit) {
  val useDark = when (themeMode) {
    "light" -> false
    "dark", "for_you" -> true
    else -> isSystemInDarkTheme()
  }

  val colors = if (themeMode == "for_you") {
    val appBackground = Color(0xFF181A26)
    darkColorScheme(
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
  } else if (useDark) {
    val appBackground = Color(0xFF181818)
    darkColorScheme(
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
  } else {
    val appBackground = Color(0xFFF2F2F2)
    lightColorScheme(
      background = appBackground,
      surface = appBackground,
      surfaceVariant = appBackground,
      surfaceContainer = Color(0xFFF2F2F2),
      surfaceContainerHigh = Color(0xFFE8E8E8),
      surfaceContainerHighest = Color(0xFFDFDFDF),
      surfaceContainerLow = Color(0xFFF7F7F7),
      surfaceContainerLowest = appBackground,
      surfaceTint = appBackground,
      onBackground = Color.Black,
      onSurface = Color.Black,
      onSurfaceVariant = Color.Black,
      primary = Color.Black,
      onPrimary = Color.White
    )
  }
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

/** Matches the exact custom mic glyph the user supplied (24x24 viewBox:
 * rounded capsule body, bottom semicircle bracket, stand line). */
@Composable
private fun MicIconCustom(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 2f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(9f * scale, 2f * scale),
      size = Size(6f * scale, 11f * scale),
      cornerRadius = CornerRadius(3f * scale, 3f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
    )
    drawArc(
      color = tint,
      startAngle = 0f,
      sweepAngle = 180f,
      useCenter = false,
      topLeft = Offset(5f * scale, 3f * scale),
      size = Size(14f * scale, 14f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
    )
    drawLine(
      color = tint,
      start = Offset(12f * scale, 17f * scale),
      end = Offset(12f * scale, 21f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
  }
}

/** Matches the exact custom waveform glyph the user supplied (24x24
 * viewBox, 5 filled rounded bars of varying height). */
@Composable
private fun FilterIconCustom(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 2f * scale
    drawLine(
      color = tint,
      start = Offset(3f * scale, 8f * scale),
      end = Offset(21f * scale, 8f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawLine(
      color = tint,
      start = Offset(3f * scale, 16f * scale),
      end = Offset(21f * scale, 16f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawCircle(color = tint, radius = 2.5f * scale, center = Offset(9f * scale, 8f * scale))
    drawCircle(color = tint, radius = 2.5f * scale, center = Offset(15f * scale, 16f * scale))
  }
}

@Composable
private fun WaveformIconCustom(modifier: Modifier = Modifier, tint: Color = Color.Black) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val bars = listOf(
      Triple(2f, 9f, 6f),
      Triple(6.5f, 4f, 16f),
      Triple(11f, 7f, 10f),
      Triple(15.5f, 2f, 20f),
      Triple(20f, 6f, 12f)
    )
    for ((x, y, h) in bars) {
      drawRoundRect(
        color = tint,
        topLeft = Offset(x * scale, y * scale),
        size = Size(2.5f * scale, h * scale),
        cornerRadius = CornerRadius(1.25f * scale, 1.25f * scale)
      )
    }
  }
}

/** Hand-drawn "new chat" glyph — a rounded-square note outline with a
 * pencil poking diagonally past its top-right corner. Not in the Material
 * icon set under any name (ModeEdit/EditNote/BorderColor all draw a
 * visibly different shape), so drawn to match the reference exactly. */
@Composable
private fun ComposeSquareIcon(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    drawRoundRect(
      color = tint,
      topLeft = Offset(3.5f * scale, 5.5f * scale),
      size = Size(14f * scale, 14f * scale),
      cornerRadius = CornerRadius(4f * scale, 4f * scale),
      style = Stroke(width = 1.7f * scale, cap = StrokeCap.Round)
    )
    // Pencil, diagonal, tip poking past the square's top-right corner.
    drawLine(
      color = tint,
      start = Offset(10f * scale, 13.5f * scale),
      end = Offset(19.5f * scale, 4f * scale),
      strokeWidth = 2.6f * scale,
      cap = StrokeCap.Round
    )
  }
}

@Composable
private fun AskImagineTab(label: String, selected: Boolean, onClick: () -> Unit) {
  Box(
    modifier = Modifier
      .clip(RoundedCornerShape(16.dp))
      .background(if (selected) colorScheme.background else Color.Transparent)
      .clickable(onClick = onClick)
      .padding(horizontal = 14.dp, vertical = 6.dp),
    contentAlignment = Alignment.Center
  ) {
    Text(
      label,
      fontSize = 14.sp,
      fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
      color = colorScheme.onBackground.copy(alpha = if (selected) 1f else 0.5f)
    )
  }
}

// Ask / Extra segmented tabs: a narrow pill container, with the selected
// word getting its own tight background pill (not just an underline).
@Composable
private fun AskImagineTabs(current: String, onAsk: () -> Unit, onImagine: () -> Unit) {
  Row(
    modifier = Modifier
      .clip(RoundedCornerShape(20.dp))
      .background(colorScheme.onBackground.copy(alpha = 0.06f))
      .padding(4.dp),
    horizontalArrangement = Arrangement.spacedBy(2.dp)
  ) {
    AskImagineTab("Ask", current == "Ask", onAsk)
    AskImagineTab("Extra", current == "Imagine", onImagine)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreenUi(viewModel: ChatViewModel) {
  val listState = rememberLazyListState()
  val context = LocalContext.current
  val tts = remember { TtsController(context) }
  val haptic = LocalHapticFeedback.current
  var speakingMessageId by remember { mutableStateOf<String?>(null) }
  DisposableEffect(Unit) {
    tts.onDone = { speakingMessageId = null }
    onDispose { tts.shutdown() }
  }

  fun toggleSpeak(message: UiMessage) {
    if (speakingMessageId == message.id) {
      tts.stop()
      speakingMessageId = null
    } else {
      tts.speak(message.content)
      speakingMessageId = message.id
    }
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
        speakingMessageId = lastAssistant.id
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
          // Pill with two separate icons — new chat and account/more —
          // instead of one icon that was labeled "Account" but drew a
          // pencil and actually opened Account (New Chat had no icon here).
          Row(
            modifier = Modifier
              .padding(end = 12.dp)
              .height(40.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(colorScheme.onBackground.copy(alpha = 0.12f)),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier.size(40.dp).clickable(onClick = { viewModel.newChat() }),
              contentAlignment = Alignment.Center
            ) {
              ComposeSquareIcon(modifier = Modifier.size(22.dp), tint = colorScheme.onBackground)
            }
            Box(
              modifier = Modifier.size(40.dp).clickable(onClick = { viewModel.openAccount() }),
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Filled.MoreVert, contentDescription = "Account", tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
            }
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
      )
    },
    containerColor = colorScheme.background,
    contentWindowInsets = WindowInsets(0, 0, 0, 0)
  ) { padding ->
    // No top padding here on purpose — the LazyColumn below spans the full
    // screen (behind the transparent-background top bar) and gets its top
    // inset via contentPadding instead, so scrolling carries the last
    // message up underneath the bar instead of hard-clipping at its edge.
    Column(
      modifier = Modifier
        .fillMaxSize()
        .navigationBarsPadding()
        .imePadding()
    ) {
      if (viewModel.messages.isEmpty()) {
        Box(modifier = Modifier.weight(1f).fillMaxWidth().padding(top = padding.calculateTopPadding()))
      } else {
        LazyColumn(
          state = listState,
          modifier = Modifier.weight(1f).fillMaxWidth(),
          contentPadding = PaddingValues(
            start = 10.dp,
            end = 10.dp,
            top = padding.calculateTopPadding() + 16.dp,
            bottom = 16.dp
          ),
          verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
          items(viewModel.messages, key = { it.id }) { message ->
            val isStreamingThis = viewModel.sending && message.id == viewModel.messages.lastOrNull()?.id
            MessageBubble(
              message = message,
              showActions = !isStreamingThis,
              isSpeaking = speakingMessageId == message.id,
              onSpeakToggle = { toggleSpeak(message) },
              onRegenerate = { viewModel.regenerateMessage(message.id) },
              onDelete = { viewModel.deleteMessage(message.id) }
            )
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
  val focusManager = LocalFocusManager.current
  var keyboardVisible by remember { mutableStateOf(true) }
  LaunchedEffect(Unit) {
    focusRequester.requestFocus()
    keyboardController?.show()
  }
  fun toggleKeyboard() {
    if (keyboardVisible) {
      keyboardController?.hide()
      focusManager.clearFocus()
      keyboardVisible = false
    } else {
      focusRequester.requestFocus()
      keyboardController?.show()
      keyboardVisible = true
    }
  }

  // Watches presses via the field's own interactionSource instead of adding
  // a competing pointerInput — TextField consumes tap gestures internally
  // for cursor placement, so anything trying to intercept the raw pointer
  // events never reliably sees them. Interactions are reported regardless,
  // so this fires every time without touching TextField's own handling.
  val composerInteractionSource = remember { MutableInteractionSource() }
  var lastComposerTapAt by remember { mutableStateOf(0L) }
  LaunchedEffect(composerInteractionSource) {
    composerInteractionSource.interactions.collect { interaction ->
      if (interaction is PressInteraction.Press) {
        val now = System.currentTimeMillis()
        if (now - lastComposerTapAt < 300L) {
          toggleKeyboard()
          lastComposerTapAt = 0L
        } else {
          lastComposerTapAt = now
        }
      }
    }
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
        modifier = Modifier
          .fillMaxWidth()
          .focusRequester(focusRequester),
        interactionSource = composerInteractionSource,
        placeholder = { Text("Ask anything") },
        colors = TextFieldDefaults.colors(
          unfocusedContainerColor = Color.Transparent,
          focusedContainerColor = Color.Transparent,
          unfocusedIndicatorColor = Color.Transparent,
          focusedIndicatorColor = Color.Transparent
        )
      )
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
              .height(36.dp)
              .clip(RoundedCornerShape(18.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.08f))
              .clickable(onClick = { toolMenuOpen = true })
              .padding(horizontal = 10.dp)
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

          // MIC BUTTON
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFF333333))
              .clickable { launchSpeech(autoSend = false) },
            contentAlignment = Alignment.Center
          ) {
            MicIconCustom(modifier = Modifier.size(18.dp), tint = Color.White)
          }

          Spacer(modifier = Modifier.width(8.dp))

          if (viewModel.input.isNotBlank()) {
            // SEND BUTTON
            Box(
              modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(if (viewModel.sending) Color(0xFF555555) else Color(0xFFE0E0E0))
                .clickable(enabled = !viewModel.sending) { tapHaptic(); viewModel.sendMessage() },
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.Black, modifier = Modifier.size(18.dp))
            }
          } else {
            // SPEAK BUTTON (waveform icon + label)
            Row(
              modifier = Modifier
                .height(36.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .clickable { viewModel.openLiveVision() }
                .padding(horizontal = 12.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              WaveformIconCustom(modifier = Modifier.size(16.dp), tint = Color.Black)
              Spacer(modifier = Modifier.width(6.dp))
              Text(
                text = "Speak",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black,
                maxLines = 1,
                softWrap = false
              )
            }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImagineScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeImagine() }
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
          // Pill with two separate icons — new chat and account/more —
          // instead of one icon that was labeled "Account" but drew a
          // pencil and actually opened Account (New Chat had no icon here).
          Row(
            modifier = Modifier
              .padding(end = 12.dp)
              .height(40.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(colorScheme.onBackground.copy(alpha = 0.12f)),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier.size(40.dp).clickable(onClick = { viewModel.newChat() }),
              contentAlignment = Alignment.Center
            ) {
              ComposeSquareIcon(modifier = Modifier.size(22.dp), tint = colorScheme.onBackground)
            }
            Box(
              modifier = Modifier.size(40.dp).clickable(onClick = { viewModel.openAccount() }),
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Filled.MoreVert, contentDescription = "Account", tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
            }
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
  var useFrontCamera by remember { mutableStateOf(false) }
  var torchOn by remember { mutableStateOf(false) }
  var speakerEnabled by remember { mutableStateOf(true) }
  var micMuted by remember { mutableStateOf(false) }
  var toolMenuOpen by remember { mutableStateOf(false) }
  var cameraMenuOpen by remember { mutableStateOf(false) }
  var shareScreenComingSoon by remember { mutableStateOf(false) }
  var voiceSettingsOpen by remember { mutableStateOf(false) }
  var pendingPersonalityId by remember { mutableStateOf<String?>(null) }
  var customPersonalityDialogOpen by remember { mutableStateOf(false) }
  var customPersonalityDraft by remember { mutableStateOf(viewModel.customPersonalityText) }
  var cameraProviderRef by remember { mutableStateOf<ProcessCameraProvider?>(null) }
  var boundCamera by remember { mutableStateOf<Camera?>(null) }

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

  val tokenStore = remember { TokenStore(context.applicationContext) }
  val controller = remember { RealtimeVisionController(context, tokenStore, coroutineScope) }

  fun startLiveSession() {
    controller.start(
      language = viewModel.profileData.language,
      voice = viewModel.selectedVoiceId,
      pushToTalk = viewModel.voiceActivationMode == "push_to_talk",
      outputDevice = viewModel.voiceOutputDevice,
      speed = viewModel.voiceSpeed,
      personality = viewModel.personality,
      ageConfirmed = viewModel.ageConfirmed18Plus,
      customPersonalityText = viewModel.customPersonalityText
    )
  }

  DisposableEffect(hasMicPermission) {
    if (hasMicPermission) startLiveSession()
    onDispose {
      controller.stop()
      cameraProviderRef?.unbindAll()
    }
  }

  Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
    if (cameraEnabled && hasCameraPermission) {
      // Keyed on useFrontCamera so flipping the camera fully disposes and
      // recreates this AndroidView — factory() below already unbinds the
      // provider before rebinding, so a fresh factory run cleanly swaps to
      // the other CameraSelector rather than needing manual rebind logic.
      key(useFrontCamera) {
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
              val selector = if (useFrontCamera) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
              boundCamera = cameraProvider.bindToLifecycle(lifecycleOwner, selector, preview, analysis)
              torchOn = false
            } catch (e: Exception) {
              controller.reportCameraError(e.message ?: "Camera failed to start")
            }
          }, ContextCompat.getMainExecutor(ctx))
          previewView
        }
      )
      }
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

      // No back arrow here by design — exiting Live Vision happens via the
      // system back gesture (BackHandler above) or the Stop button below.
      Column(
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .imePadding()
          .navigationBarsPadding()
          .padding(bottom = 22.dp, start = 16.dp, end = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        // Flash and flip-camera sit level with the status pill (not pinned
        // to the very top of the screen) — one on each side of it.
        Box(modifier = Modifier.fillMaxWidth()) {
          LiveCornerButton(
            icon = if (torchOn) Icons.Outlined.FlashOn else Icons.Outlined.FlashOff,
            contentDescription = "Flash",
            enabled = cameraEnabled && !useFrontCamera,
            modifier = Modifier.align(Alignment.CenterStart)
          ) {
            val next = !torchOn
            runCatching { boundCamera?.cameraControl?.enableTorch(next) }
            torchOn = next
          }
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
              .align(Alignment.Center)
              .height(36.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(Color.White.copy(alpha = 0.12f))
              .padding(horizontal = 14.dp)
          ) {
            Icon(Icons.Outlined.RecordVoiceOver, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.size(6.dp))
            Text(statusText, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
          }
          LiveCornerButton(
            icon = Icons.Outlined.Cameraswitch,
            contentDescription = "Flip camera",
            enabled = cameraEnabled,
            modifier = Modifier.align(Alignment.CenterEnd)
          ) {
            useFrontCamera = !useFrontCamera
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        if (shareScreenComingSoon) {
          LaunchedEffect(Unit) {
            delay(2000)
            shareScreenComingSoon = false
          }
          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(percent = 50))
              .background(Color.White.copy(alpha = 0.15f))
              .padding(horizontal = 16.dp, vertical = 8.dp)
          ) {
            Text("Share Screen — coming soon", color = Color.White, fontSize = 12.sp)
          }
          Spacer(modifier = Modifier.height(10.dp))
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Box {
            VoiceControlPill(icon = Icons.Outlined.Videocam, contentDescription = "Camera", active = cameraEnabled) {
              cameraMenuOpen = true
            }
            DropdownMenu(expanded = cameraMenuOpen, onDismissRequest = { cameraMenuOpen = false }) {
              DropdownMenuItem(
                text = { Text("Camera") },
                leadingIcon = { Icon(Icons.Outlined.Videocam, contentDescription = null) },
                onClick = {
                  cameraMenuOpen = false
                  if (cameraEnabled) {
                    cameraProviderRef?.unbindAll()
                    cameraEnabled = false
                  } else if (hasCameraPermission) {
                    cameraEnabled = true
                  } else {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                  }
                }
              )
              DropdownMenuItem(
                text = { Text("Share Screen") },
                leadingIcon = { Icon(Icons.Outlined.ScreenShare, contentDescription = null) },
                onClick = {
                  cameraMenuOpen = false
                  shareScreenComingSoon = true
                }
              )
            }
          }
          VoiceControlPill(icon = Icons.Outlined.VolumeUp, contentDescription = "Speaker", active = speakerEnabled) {
            speakerEnabled = !speakerEnabled
            controller.setSpeakerEnabled(speakerEnabled)
          }
          if (viewModel.voiceActivationMode == "push_to_talk") {
            PushToTalkPill(
              onPress = { controller.beginPushToTalk() },
              onRelease = { controller.endPushToTalk() }
            )
          } else {
            VoiceControlPill(icon = Icons.Outlined.MicNone, contentDescription = "Microphone", active = !micMuted) {
              micMuted = !micMuted
              controller.setMicMuted(micMuted)
            }
          }
          VoiceControlPill(icon = Icons.Outlined.Settings, contentDescription = "Settings") {
            voiceSettingsOpen = true
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically
        ) {
          // "+" and the text field share one outer pill — "+" still reads
          // as its own control via a wide inner plate, not a fully separate
          // button, matching the merged composer bar in the reference.
          Box(
            modifier = Modifier
              .weight(1f)
              .height(58.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(Color(0xFF1A1A1A))
          ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxHeight()) {
              Box {
                Box(
                  modifier = Modifier
                    .padding(start = 5.dp)
                    .size(width = 50.dp, height = 48.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(Color.White.copy(alpha = 0.10f))
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
              TextField(
                value = viewModel.input,
                onValueChange = viewModel::onInputChange,
                modifier = Modifier.weight(1f),
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
          }
          Spacer(modifier = Modifier.size(8.dp))
          Box(
            modifier = Modifier
              .size(width = 100.dp, height = 58.dp)
              .clip(RoundedCornerShape(percent = 50))
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

    if (voiceSettingsOpen) {
      LiveVoiceSettingsSheet(
        selectedVoiceId = viewModel.selectedVoiceId,
        onVoiceChange = { id ->
          viewModel.selectVoice(id)
          controller.stop()
          startLiveSession()
        },
        personality = viewModel.personality,
        onPersonalityRequest = { option ->
          when {
            option.id == "custom" -> {
              customPersonalityDraft = viewModel.customPersonalityText
              customPersonalityDialogOpen = true
            }
            option.adultOnly && !viewModel.ageConfirmed18Plus -> {
              pendingPersonalityId = option.id
            }
            else -> {
              viewModel.selectPersonality(option.id)
              controller.stop()
              startLiveSession()
            }
          }
        },
        activationMode = viewModel.voiceActivationMode,
        onActivationModeChange = { mode ->
          viewModel.selectVoiceActivationMode(mode)
          micMuted = false
          controller.stop()
          startLiveSession()
        },
        speed = viewModel.voiceSpeed,
        onSpeedChange = { speed ->
          viewModel.updateVoiceSpeed(speed)
          controller.setPlaybackSpeed(speed)
        },
        outputDevice = viewModel.voiceOutputDevice,
        onOutputDeviceChange = { device ->
          viewModel.selectVoiceOutputDevice(device)
          controller.setOutputDevice(device)
        },
        onDismiss = { voiceSettingsOpen = false }
      )
    }

    val requestedPersonality = pendingPersonalityId
    if (requestedPersonality != null) {
      AlertDialog(
        onDismissRequest = { pendingPersonalityId = null },
        title = { Text("Confirm your age") },
        text = {
          Text(
            "This personality mode includes flirtatious or contrarian AI roleplay conversation intended for " +
              "adults — it's a fictional AI persona, not a real relationship or a real person's opinion. " +
              "Confirm you are 18 years or older to continue."
          )
        },
        confirmButton = {
          TextButton(onClick = {
            viewModel.confirmAge18PlusAndSelectPersonality(requestedPersonality)
            controller.stop()
            startLiveSession()
            pendingPersonalityId = null
          }) {
            Text("I'm 18+, Continue")
          }
        },
        dismissButton = {
          TextButton(onClick = { pendingPersonalityId = null }) {
            Text("Cancel")
          }
        }
      )
    }

    if (customPersonalityDialogOpen) {
      AlertDialog(
        onDismissRequest = { customPersonalityDialogOpen = false },
        title = { Text("Custom personality") },
        text = {
          Column {
            Text(
              "Describe the tone or persona you'd like ChatGiZa to use — for example \"a cheerful sports coach\" " +
                "or \"a dry, deadpan detective.\" This adds flavor on top of ChatGiZa's normal behavior; it can't " +
                "remove its safety guidelines.",
              fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
              value = customPersonalityDraft,
              onValueChange = { if (it.length <= 300) customPersonalityDraft = it },
              modifier = Modifier.fillMaxWidth(),
              placeholder = { Text("e.g. a cheerful sports coach") }
            )
          }
        },
        confirmButton = {
          TextButton(
            enabled = customPersonalityDraft.isNotBlank(),
            onClick = {
              viewModel.setCustomPersonality(customPersonalityDraft)
              controller.stop()
              startLiveSession()
              customPersonalityDialogOpen = false
            }
          ) {
            Text("Save")
          }
        },
        dismissButton = {
          TextButton(onClick = { customPersonalityDialogOpen = false }) {
            Text("Cancel")
          }
        }
      )
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

/** Circular, semi-transparent icon button used for the two Live Vision
 * top-corner controls (flash, flip camera) — sits directly over the camera
 * preview rather than in the bottom control row. */
@Composable
private fun LiveCornerButton(
  icon: ImageVector,
  contentDescription: String,
  enabled: Boolean = true,
  modifier: Modifier = Modifier,
  onClick: () -> Unit
) {
  Box(
    modifier = modifier
      .size(44.dp)
      .clip(CircleShape)
      .background(Color.Black.copy(alpha = 0.35f))
      .clickable(enabled = enabled, onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(
      icon,
      contentDescription = contentDescription,
      tint = Color.White.copy(alpha = if (enabled) 1f else 0.35f),
      modifier = Modifier.size(20.dp)
    )
  }
}

/** Press-and-hold mic control for push-to-talk mode: streams audio only
 * while the user's finger is down, unlike [VoiceControlPill]'s tap-toggle. */
@Composable
private fun PushToTalkPill(onPress: () -> Unit, onRelease: () -> Unit) {
  var pressed by remember { mutableStateOf(false) }
  Box(
    modifier = Modifier
      .size(72.dp)
      .clip(CircleShape)
      .background(if (pressed) Color.White else Color(0xFF1F1F1F))
      .border(width = 1.dp, color = Color.White.copy(alpha = 0.1f), shape = CircleShape)
      .pointerInput(Unit) {
        awaitEachGesture {
          awaitFirstDown(requireUnconsumed = false)
          pressed = true
          onPress()
          waitForUpOrCancellation()
          pressed = false
          onRelease()
        }
      },
    contentAlignment = Alignment.Center
  ) {
    Icon(
      Icons.Outlined.MicNone,
      contentDescription = "Hold to talk",
      tint = if (pressed) Color.Black else Color.White,
      modifier = Modifier.size(26.dp)
    )
  }
}

@Composable
private fun VoiceGradientCard(option: VoiceOption, selected: Boolean, onClick: () -> Unit) {
  val cardWidth = 140.dp
  val cardHeight = 96.dp
  val density = LocalDensity.current
  val widthPx = with(density) { cardWidth.toPx() }
  val heightPx = with(density) { cardHeight.toPx() }

  // A slow angle sweep on the gradient so the selected card reads as
  // "alive" (evoking a waveform) rather than a flat color swatch.
  val infiniteTransition = rememberInfiniteTransition(label = "voiceGradient")
  val angle by infiniteTransition.animateFloat(
    initialValue = 0f,
    targetValue = 360f,
    animationSpec = infiniteRepeatable(animation = tween(6000, easing = LinearEasing), repeatMode = RepeatMode.Restart),
    label = "voiceGradientAngle"
  )
  val brush = if (selected) {
    val radians = Math.toRadians(angle.toDouble())
    val dx = kotlin.math.cos(radians).toFloat()
    val dy = kotlin.math.sin(radians).toFloat()
    val cx = widthPx / 2f
    val cy = heightPx / 2f
    val radius = kotlin.math.max(widthPx, heightPx) / 2f
    Brush.linearGradient(
      colors = listOf(option.gradientStart, option.gradientEnd),
      start = Offset(cx - dx * radius, cy - dy * radius),
      end = Offset(cx + dx * radius, cy + dy * radius)
    )
  } else {
    Brush.linearGradient(colors = listOf(Color.White.copy(alpha = 0.08f), Color.White.copy(alpha = 0.08f)))
  }

  Column(
    modifier = Modifier
      .width(cardWidth)
      .height(cardHeight)
      .clip(RoundedCornerShape(20.dp))
      .background(brush)
      .clickable(onClick = onClick)
      .padding(16.dp)
  ) {
    Text(option.name, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
    Spacer(modifier = Modifier.height(2.dp))
    Text(option.description, color = Color.White.copy(alpha = if (selected) 0.85f else 0.55f), fontSize = 12.sp)
  }
}

private data class PersonalityOption(
  val id: String,
  val label: String,
  val icon: ImageVector?,
  val tag: String? = null,
  val adultOnly: Boolean = false
)

// "sexy"/explicit personas are intentionally not offered — this app has no
// real content-rating or age-verification infrastructure beyond a device-
// level self-attestation, and generating explicit sexual content risks
// violating OpenAI's usage policies outright. "unhinged"/"conspiracy" are
// present but scoped to blunt humor / clearly-labeled speculation rather
// than dropping safety guardrails or asserting misinformation as fact.
private val PERSONALITY_OPTIONS = listOf(
  PersonalityOption("custom", "Custom", null),
  PersonalityOption("assistant", "Assistant", Icons.Outlined.SupportAgent),
  PersonalityOption("therapist", "Therapist", Icons.Outlined.Psychology),
  PersonalityOption("storyteller", "Storyteller", Icons.AutoMirrored.Outlined.MenuBook),
  PersonalityOption("story_time", "Story Time", Icons.Outlined.AutoStories, tag = "Kids"),
  PersonalityOption("trivia_game", "Trivia Game", Icons.Outlined.Quiz, tag = "Kids"),
  PersonalityOption("giza_doc", "GiZa Doc", Icons.Outlined.MedicalServices),
  PersonalityOption("unhinged", "Unhinged", Icons.Outlined.Whatshot, tag = "18+", adultOnly = true),
  PersonalityOption("motivation", "Motivation", Icons.Outlined.EmojiEvents),
  PersonalityOption("conspiracy", "Conspiracy", Icons.Outlined.Visibility, tag = "18+", adultOnly = true),
  PersonalityOption("romantic", "Romantic", Icons.Filled.Favorite, tag = "18+", adultOnly = true),
  PersonalityOption("argumentative", "Argumentative", Icons.Outlined.Bolt, tag = "18+", adultOnly = true)
)

@Composable
private fun PersonalityPill(option: PersonalityOption, selected: Boolean, onClick: () -> Unit) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier
      .clip(RoundedCornerShape(28.dp))
      .background(if (selected) Color.White else Color.White.copy(alpha = 0.08f))
      .clickable(onClick = onClick)
      .padding(horizontal = 18.dp, vertical = 14.dp)
  ) {
    if (option.icon != null) {
      Icon(option.icon, contentDescription = null, tint = if (selected) Color.Black else Color.White, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    } else {
      Icon(Icons.Filled.Add, contentDescription = null, tint = if (selected) Color.Black else Color.White, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    }
    Text(option.label, color = if (selected) Color.Black else Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    if (option.tag != null) {
      Spacer(modifier = Modifier.width(6.dp))
      Text(option.tag, color = if (selected) Color.Black.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.4f), fontSize = 13.sp)
    }
  }
}

/** Voice Settings sheet for Live Vision — Voice, Personality, Voice
 * Activation, Voice Speed, and Output Device, all applied to the live
 * session immediately. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LiveVoiceSettingsSheet(
  selectedVoiceId: String,
  onVoiceChange: (String) -> Unit,
  personality: String,
  onPersonalityRequest: (PersonalityOption) -> Unit,
  activationMode: String,
  onActivationModeChange: (String) -> Unit,
  speed: Float,
  onSpeedChange: (Float) -> Unit,
  outputDevice: String,
  onOutputDeviceChange: (String) -> Unit,
  onDismiss: () -> Unit
) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 32.dp)
    ) {
      Text(
        "Voice Settings",
        color = Color.White,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.fillMaxWidth(),
        textAlign = TextAlign.Center
      )

      Spacer(modifier = Modifier.height(28.dp))
      Text("Voice", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        VOICE_OPTIONS.forEach { option ->
          VoiceGradientCard(
            option = option,
            selected = selectedVoiceId == option.id,
            onClick = { onVoiceChange(option.id) }
          )
        }
      }

      Spacer(modifier = Modifier.height(26.dp))
      Text("Personality", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        PERSONALITY_OPTIONS.forEach { option ->
          PersonalityPill(
            option = option,
            selected = personality == option.id,
            onClick = { onPersonalityRequest(option) }
          )
        }
      }

      Spacer(modifier = Modifier.height(26.dp))
      Text("Voice Activation", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(24.dp))
          .background(Color.White.copy(alpha = 0.08f))
          .padding(4.dp)
      ) {
        listOf("default" to "Default", "push_to_talk" to "Push to Talk").forEach { (id, label) ->
          val selected = activationMode == id
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(20.dp))
              .background(if (selected) Color.White else Color.Transparent)
              .clickable { onActivationModeChange(id) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text(
              label,
              color = if (selected) Color.Black else Color.White,
              fontSize = 14.sp,
              fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(26.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("Voice Speed", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        Text(String.format("%.1fx", speed), color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(12.dp))
      PreviewSlider(
        value = ((speed - 0.5f) / 1.5f).coerceIn(0f, 1f),
        onValueChange = { fraction -> onSpeedChange(0.5f + fraction * 1.5f) },
        modifier = Modifier.fillMaxWidth()
      )

      Spacer(modifier = Modifier.height(26.dp))
      Text("Output Device", color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(24.dp))
          .background(Color.White.copy(alpha = 0.08f))
          .padding(4.dp)
      ) {
        listOf(
          Triple("headset", "Headset", Icons.Outlined.Headset),
          Triple("speaker", "Speaker", Icons.Outlined.VolumeUp),
          Triple("earpiece", "Earpiece", Icons.Outlined.Hearing)
        ).forEach { (id, label, icon) ->
          val selected = outputDevice == id
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(20.dp))
              .background(if (selected) Color.White else Color.Transparent)
              .clickable { onOutputDeviceChange(id) }
              .padding(vertical = 10.dp)
          ) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.Black else Color.White, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              label,
              color = if (selected) Color.Black else Color.White,
              fontSize = 12.sp,
              fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
            )
          }
        }
      }
    }
  }
}

private fun imageProxyToJpeg(image: ImageProxy): ByteArray {
  // A straight sequential copy of the plane buffers only produces a
  // correct NV21 image when the U/V planes happen to be tightly packed
  // (pixelStride == 1); on most real devices YUV_420_888's chroma planes
  // are interleaved (pixelStride == 2, plus row padding), so that copy
  // silently scrambled every frame sent to the model during a Live Vision
  // call. This walks each plane by its actual pixelStride/rowStride.
  val width = image.width
  val height = image.height
  val nv21 = ByteArray(width * height * 3 / 2)

  val yPlane = image.planes[0]
  var pos = 0
  for (row in 0 until height) {
    val rowStart = row * yPlane.rowStride
    for (col in 0 until width) {
      nv21[pos++] = yPlane.buffer.get(rowStart + col * yPlane.pixelStride)
    }
  }

  val uPlane = image.planes[1]
  val vPlane = image.planes[2]
  val uvHeight = height / 2
  val uvWidth = width / 2
  for (row in 0 until uvHeight) {
    val vRowStart = row * vPlane.rowStride
    val uRowStart = row * uPlane.rowStride
    for (col in 0 until uvWidth) {
      nv21[pos++] = vPlane.buffer.get(vRowStart + col * vPlane.pixelStride)
      nv21[pos++] = uPlane.buffer.get(uRowStart + col * uPlane.pixelStride)
    }
  }

  val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
  val out = ByteArrayOutputStream()
  yuvImage.compressToJpeg(Rect(0, 0, width, height), 70, out)
  return out.toByteArray()
}

@Composable
private fun HistoryNavTab(icon: ImageVector, label: String, onClick: () -> Unit) {
  Column(
    horizontalAlignment = Alignment.CenterHorizontally,
    modifier = Modifier.clickable(onClick = onClick).padding(horizontal = 10.dp, vertical = 2.dp)
  ) {
    Icon(icon, contentDescription = label, tint = colorScheme.onBackground.copy(alpha = 0.85f), modifier = Modifier.size(24.dp))
    Spacer(modifier = Modifier.height(2.dp))
    Text(label, color = colorScheme.onBackground.copy(alpha = 0.85f), fontSize = 10.sp)
  }
}

// A fast enough flick commits the ChatGiZa Media panel open/closed on its
// own, regardless of how far it had actually been dragged — px/s, not
// dp/s, since this is compared directly against raw pointer deltas summed
// over time rather than a density-converted value.
private const val MEDIA_FLING_VELOCITY_THRESHOLD = 1000f

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistoryScreen(viewModel: ChatViewModel) {
  // HistoryScreen is now always kept mounted inside the drawer (so it can be
  // swiped in/out), so this must only intercept back-press while it's
  // actually the active screen — otherwise it'd steal back navigation from
  // Chat/Imagine while the drawer is closed.
  BackHandler(enabled = viewModel.screen is AppScreen.History) { viewModel.closeHistory() }

  val query = viewModel.historySearchQuery.trim()
  val visibleConversations = viewModel.conversations
    .filter { query.isEmpty() || it.title.contains(query, ignoreCase = true) }

  var menuConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var deleteConfirmConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var renameConvo by remember { mutableStateOf<ApiConversation?>(null) }
  var renameText by remember { mutableStateOf("") }
  // Only "History" has real data behind it — the others are visual-only
  // for now (see the "Coming soon" state below), matching the reference's
  // tab row without pretending there are three more distinct datasets.
  var selectedHistoryTab by remember { mutableStateOf("History") }

  var showChatGizaMedia by remember { mutableStateOf(false) }
  var showChatGizaMediaCreate by remember { mutableStateOf(false) }
  var showChatGizaMediaPostComposer by remember { mutableStateOf(false) }
  // Fully finger-driven, no auto-animation and no resting "peek" floor —
  // 0 = closed (no height at all), 1 = fully open. The only animation is
  // the spring on release, and only in one of two directions: if the drag
  // crossed the "committed" threshold it finishes opening to 1, otherwise
  // it always springs all the way back to 0 (fully dismissed).
  val mediaProgress = remember { Animatable(0f) }
  // The live value WHILE a finger is down is tracked here, as a plain
  // synchronous var — not by calling Animatable.snapTo from a freshly
  // launched coroutine on every single pointer-move callback. That
  // per-event "launch a coroutine, read .value, write .value" pattern is
  // exactly what was causing the drag to stutter, stick halfway, or stop
  // responding entirely: bursts of drag events during a fast swipe would
  // spawn overlapping coroutines that each read a stale mediaProgress.value
  // (because an earlier launched snapTo hadn't actually applied yet), so
  // most of a fast drag's motion got silently discarded out of order.
  // Reading/writing a plain Compose state var has no such race.
  var mediaDragValue by remember { mutableStateOf(0f) }
  var isDraggingMedia by remember { mutableStateOf(false) }
  val mediaHeightFraction = if (isDraggingMedia) mediaDragValue else mediaProgress.value
  // Measured from a container that's always present (not gated behind
  // showChatGizaMedia), so the very first drag of the session already has
  // an accurate range instead of a stale/zero value on the first frame.
  var bottomBarHeight by remember { mutableStateOf(0.dp) }
  var totalContentHeightPx by remember { mutableStateOf(0) }
  val density = LocalDensity.current
  val mediaScope = rememberCoroutineScope()
  val mediaAvailableHeightPx = (totalContentHeightPx - with(density) { bottomBarHeight.toPx() }).toInt().coerceAtLeast(1)

  fun startMediaDrag() {
    if (!showChatGizaMedia) showChatGizaMedia = true
    mediaDragValue = mediaHeightFraction
    isDraggingMedia = true
  }

  fun updateMediaDrag(dragAmount: Float) {
    mediaDragValue = (mediaDragValue - dragAmount / mediaAvailableHeightPx).coerceIn(0f, 1f)
  }

  // Two ways to commit, not one — the position rule (halfway) is untouched
  // from before; a fast fling now OVERRIDES it in either direction, so a
  // quick flick up commits to fully open even from low progress, and a
  // quick flick down commits closed even from high progress. A slow/no-
  // velocity release still falls through to the original halfway check.
  fun settleMediaDrag(flingVelocityY: Float = 0f) {
    val dragValueAtRelease = mediaDragValue
    isDraggingMedia = false
    mediaScope.launch {
      mediaProgress.snapTo(dragValueAtRelease)
      val shouldOpen = when {
        flingVelocityY <= -MEDIA_FLING_VELOCITY_THRESHOLD -> true
        flingVelocityY >= MEDIA_FLING_VELOCITY_THRESHOLD -> false
        else -> mediaProgress.value >= 0.5f
      }
      if (shouldOpen) {
        mediaProgress.animateTo(1f, animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy, stiffness = Spring.StiffnessMedium))
      } else {
        mediaProgress.animateTo(0f, animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy, stiffness = Spring.StiffnessMedium))
        showChatGizaMedia = false
      }
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .onGloballyPositioned { coords -> totalContentHeightPx = coords.size.height }
  ) {
  Scaffold(
    containerColor = Color.Transparent,
    bottomBar = {
      // Rounded top corners on its own background — "carved" into the
      // screen rather than a flat full-width bar — matching the reference.
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .onGloballyPositioned { coords -> bottomBarHeight = with(density) { coords.size.height.toDp() } }
          .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
          .background(Color(0xFF23252B))
          .navigationBarsPadding()
      ) {
        // ChatGiZa Media drag handle — sits above the tab row. The panel
        // height now follows this same continuous gesture 1:1 from the
        // very first pixel of movement (like a real bottom sheet / an
        // Instagram-style swipe-up), rather than just flipping a boolean
        // after a small threshold and leaving the rest of the motion to a
        // separate, disconnected detector inside the panel itself.
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .pointerInput(mediaAvailableHeightPx) {
              var velocityTracker = VelocityTracker()
              detectVerticalDragGestures(
                onDragStart = {
                  startMediaDrag()
                  velocityTracker = VelocityTracker()
                },
                onVerticalDrag = { change, dragAmount ->
                  change.consume()
                  velocityTracker.addPosition(change.uptimeMillis, change.position)
                  updateMediaDrag(dragAmount)
                },
                onDragEnd = { settleMediaDrag(velocityTracker.calculateVelocity().y) },
                onDragCancel = { settleMediaDrag() }
              )
            }
            .clickable(onClick = {
              showChatGizaMedia = true
              mediaScope.launch { mediaProgress.snapTo(1f) }
            })
            .padding(top = 10.dp, bottom = 8.dp),
          contentAlignment = Alignment.Center
        ) {
          // Only draw this pill while the panel is closed — once it's open,
          // the panel has its own handle at its top edge, and showing both
          // at once read as two disconnected controls rather than one.
          if (!showChatGizaMedia) {
            Box(
              modifier = Modifier
                .width(36.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(colorScheme.onBackground.copy(alpha = 0.35f))
            )
          }
        }
        // Five-tab bottom nav, same slot layout as the reference's
        // Home/Markets/Trade/Earn/Assets bar, re-purposed for ChatGiZa.
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .padding(top = 2.dp, bottom = 4.dp),
          horizontalArrangement = Arrangement.SpaceEvenly
        ) {
          HistoryNavTab(Icons.Outlined.Settings, "Settings", onClick = { viewModel.openAccount() })
          HistoryNavTab(Icons.Outlined.Folder, "Projects", onClick = { viewModel.openProjects() })
          HistoryNavTab(Icons.Outlined.Schedule, "Scheduled", onClick = { viewModel.openScheduled() })
          HistoryNavTab(Icons.Outlined.GraphicEq, "Speak", onClick = { viewModel.openLiveVision() })
          HistoryNavTab(Icons.Filled.Home, "Home", onClick = { viewModel.closeHistory() })
        }
      }
    }
  ) { padding ->
    // Everything — search, Events, the History label, and the conversation
    // list — is one scrollable column now, so the top section scrolls away
    // with the list and comes back when you scroll back up, instead of
    // being pinned above a separately-scrolling list.
    LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
      item {
        Spacer(modifier = Modifier.height(6.dp))

        Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier.clickable(onClick = { viewModel.openEditProfile() })
          ) {
            if (viewModel.userImage != null) {
              AsyncImage(
                model = viewModel.userImage,
                contentDescription = "Profile",
                modifier = Modifier.size(36.dp).clip(CircleShape)
              )
            } else {
              Icon(
                Icons.Outlined.AccountCircle,
                contentDescription = "Profile",
                tint = colorScheme.onBackground,
                modifier = Modifier.size(36.dp)
              )
            }
          }
          Spacer(modifier = Modifier.size(10.dp))
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .weight(1f)
              .height(38.dp)
              .clip(RoundedCornerShape(19.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.08f))
              .padding(horizontal = 12.dp)
          ) {
            Icon(Icons.Outlined.Search, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.size(6.dp))
            // BasicTextField instead of Material3's TextField — the latter
            // carries a built-in minimum content height taller than this
            // 38dp pill, so it was clipping the tops/bottoms of typed
            // characters. BasicTextField has no such minimum.
            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
              if (viewModel.historySearchQuery.isEmpty()) {
                Text("Search", color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 13.sp)
              }
              BasicTextField(
                value = viewModel.historySearchQuery,
                onValueChange = viewModel::onHistorySearchQueryChange,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = colorScheme.onBackground),
                cursorBrush = SolidColor(colorScheme.onBackground)
              )
            }
          }
        }

        // Big empty gap between Search and Events, matching the reference's
        // large open space above its promo card.
        Spacer(modifier = Modifier.height(120.dp))

        // "Events" card — bigger now, same charcoal as the History card
        // below for a consistent palette across the screen. "Events" is
        // just the small label; the bold line is what it actually is.
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xFF23252B))
            .clickable(onClick = { viewModel.openScheduled() })
            .padding(horizontal = 16.dp, vertical = 26.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier
              .size(52.dp)
              .clip(RoundedCornerShape(14.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Schedule, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(24.dp))
          }
          Spacer(modifier = Modifier.size(14.dp))
          Column(modifier = Modifier.weight(1f)) {
            Text("Events", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 11.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text("Automations & scheduled tasks", color = colorScheme.onBackground, fontSize = 16.sp, fontWeight = FontWeight.Bold)
          }
        }

        // Small gap — Events and History should sit close together, not
        // far apart like before.
        Spacer(modifier = Modifier.height(10.dp))
      }

      // History tab + the whole conversation list share ONE background —
      // a single rounded card, not a per-row layer or a floating tab —
      // matching the reference's tabs+list grouped inside one container.
      item {
        Column(
          modifier = Modifier
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF23252B))
            .padding(vertical = 10.dp)
        ) {
          // Tab row — only "History" has a real dataset behind it; the
          // other three are visual-only until there's an actual GiZa/
          // Private/V2 concept to filter into.
          Row(
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            modifier = Modifier
              .horizontalScroll(rememberScrollState())
              .padding(horizontal = 14.dp)
          ) {
            listOf("History", "GiZa", "Private", "V2").forEach { tab ->
              val selected = selectedHistoryTab == tab
              Text(
                tab,
                color = if (selected) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.4f),
                fontSize = 15.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                modifier = Modifier.clickable { selectedHistoryTab = tab }
              )
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          if (selectedHistoryTab != "History") {
            Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
              Text("Coming soon", color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 16.sp)
            }
          } else if (viewModel.loadingHistory) {
            Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
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
            visibleConversations.forEach { convo ->
              Box(modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)) {
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

  // ChatGiZa Media panel — an in-layout panel (not a system
  // ModalBottomSheet), so it stops right above the bottom nav instead of
  // covering the whole screen: the nav row stays visible and tappable
  // the entire time the panel is open.
  if (showChatGizaMedia) {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .padding(bottom = bottomBarHeight)
    ) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color.Black.copy(alpha = 0.55f))
          .clickable(
            indication = null,
            interactionSource = remember { MutableInteractionSource() },
            onClick = { showChatGizaMedia = false }
          )
      )
      ChatGizaMediaPanel(
        viewModel = viewModel,
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .fillMaxHeight(mediaHeightFraction),
        onDismiss = { showChatGizaMedia = false },
        onCreateClick = { showChatGizaMediaCreate = true },
        onDragStart = ::startMediaDrag,
        onDrag = ::updateMediaDrag,
        onDragEnd = { settleMediaDrag(it) },
        onDragCancel = { settleMediaDrag() }
      )
    }
  }
  if (showChatGizaMediaCreate) {
    ChatGizaMediaCreateSheet(
      viewModel,
      onDismiss = { showChatGizaMediaCreate = false },
      onPostClick = {
        showChatGizaMediaCreate = false
        showChatGizaMediaPostComposer = true
      }
    )
  }
  if (showChatGizaMediaPostComposer) {
    ChatGizaMediaPostComposerScreen(viewModel, onDismiss = { showChatGizaMediaPostComposer = false })
  }
  }
}

// --- ChatGiZa Media (foundation only) -------------------------------------
// Reached by dragging/tapping the small handle above the History screen's
// bottom nav. This is intentionally a skeleton: an empty feed placeholder
// plus a "+" that opens a create-type menu, matching the reference layout
// the user provided. No real posting/feed functionality yet — that comes
// in a later pass.

@Composable
private fun ChatGizaMediaPanel(
  viewModel: ChatViewModel,
  modifier: Modifier = Modifier,
  onDismiss: () -> Unit,
  onCreateClick: () -> Unit,
  onDragStart: () -> Unit,
  onDrag: (Float) -> Unit,
  onDragEnd: (Float) -> Unit,
  onDragCancel: () -> Unit
) {
  // A plain in-layout panel rather than a system ModalBottomSheet — a
  // modal sheet is a separate window that always covers the full screen
  // height (including whatever sits behind it), which was hiding the
  // Settings/Projects/... nav row underneath. This panel's height is
  // capped by the caller (fillMaxHeight fraction, positioned above the
  // measured bottom-bar height), so that row stays visible and tappable.
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
      .background(Color(0xFF161616))
  ) {
    Column(modifier = Modifier.fillMaxSize()) {
      // Live drag tracking and settle-on-release both live in the parent
      // (HistoryScreen) now, shared with the outer handle below the nav bar
      // — this handle just forwards raw gesture events up via callbacks
      // instead of keeping its own separate Animatable/settle logic, which
      // used to race the outer handle's (see the comment on mediaDragValue
      // in HistoryScreen for what that race actually broke).
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .pointerInput(Unit) {
            var velocityTracker = VelocityTracker()
            detectVerticalDragGestures(
              onDragStart = {
                onDragStart()
                velocityTracker = VelocityTracker()
              },
              onDragEnd = { onDragEnd(velocityTracker.calculateVelocity().y) },
              onDragCancel = { onDragCancel() },
              onVerticalDrag = { change, dragAmount ->
                change.consume()
                velocityTracker.addPosition(change.uptimeMillis, change.position)
                onDrag(dragAmount)
              }
            )
          }
          .clickable(onClick = onDismiss)
          .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
      ) {
        Box(
          modifier = Modifier
            .width(36.dp)
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(Color.White.copy(alpha = 0.35f))
        )
      }
      // Reference feed's own tab row (Discover/Following/Campaign/Smart) in
      // place of a plain "ChatGiZa Media" title — these tabs are visual-only
      // for now since there's still just one local post list behind them,
      // same as History's own tab row before it had real per-tab data.
      var selectedFeedTab by remember { mutableStateOf("Discover") }
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          modifier = Modifier.weight(1f).horizontalScroll(rememberScrollState()),
          horizontalArrangement = Arrangement.spacedBy(18.dp)
        ) {
          listOf("Discover", "Following", "Campaign", "Smart").forEach { tab ->
            Text(
              tab,
              color = if (tab == selectedFeedTab) Color.White else Color.White.copy(alpha = 0.45f),
              fontSize = 15.sp,
              fontWeight = if (tab == selectedFeedTab) FontWeight.Bold else FontWeight.Medium,
              modifier = Modifier.clickable { selectedFeedTab = tab }
            )
          }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Icon(Icons.Outlined.Menu, contentDescription = "Menu", tint = Color.White, modifier = Modifier.size(22.dp))
      }
      if (viewModel.mediaPosts.isEmpty()) {
        // Left empty on purpose — no placeholder icon/text here anymore.
        Box(modifier = Modifier.weight(1f).fillMaxWidth())
      } else {
        LazyColumn(
          modifier = Modifier.weight(1f).fillMaxWidth(),
          contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          items(viewModel.mediaPosts, key = { it.id }) { post ->
            MediaPostRow(
              post,
              userImage = viewModel.userImage,
              userName = viewModel.userName,
              onLikeClick = { viewModel.toggleMediaPostLike(post.id) },
              onDismissClick = { viewModel.removeMediaPost(post.id) }
            )
          }
        }
      }
    }
    Box(
      modifier = Modifier
        .align(Alignment.BottomEnd)
        .padding(20.dp)
        .size(56.dp)
        .clip(CircleShape)
        .background(Color(0xFFFFC94A))
        .clickable(onClick = onCreateClick),
      contentAlignment = Alignment.Center
    ) {
      Icon(Icons.Filled.Add, contentDescription = "Unda", tint = Color.Black, modifier = Modifier.size(26.dp))
    }
  }
}

private fun formatMediaPostTimeAgo(createdAt: Long): String {
  val minutes = (System.currentTimeMillis() - createdAt).coerceAtLeast(0) / 60000
  return when {
    minutes < 1 -> "now"
    minutes < 60 -> "${minutes}m"
    minutes < 24 * 60 -> "${minutes / 60}h"
    else -> "${minutes / (24 * 60)}d"
  }
}

@Composable
private fun MediaPostRow(
  post: MediaPost,
  userImage: String?,
  userName: String?,
  onLikeClick: () -> Unit,
  onDismissClick: () -> Unit
) {
  val context = LocalContext.current
  // Starts collapsed to a short strip and expands on tap -- a full-size
  // image immediately for every post made the feed mostly scrolling past
  // pictures rather than reading posts, same complaint as a feed that's
  // all thumbnails would draw the opposite way.
  var imageExpanded by remember(post.id) { mutableStateOf(false) }

  Column(modifier = Modifier.fillMaxWidth()) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
      if (userImage != null) {
        AsyncImage(
          model = userImage,
          contentDescription = "Profile",
          modifier = Modifier.size(36.dp).clip(CircleShape)
        )
      } else {
        Icon(
          Icons.Outlined.AccountCircle,
          contentDescription = "Profile",
          tint = Color.White,
          modifier = Modifier.size(36.dp)
        )
      }
      Spacer(modifier = Modifier.width(10.dp))
      Column(modifier = Modifier.weight(1f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(userName ?: "You", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
          Spacer(modifier = Modifier.width(6.dp))
          Text("• ${formatMediaPostTimeAgo(post.createdAt)}", color = Color(0xFF8A8A8A), fontSize = 12.sp)
          if (post.sentiment != null) {
            Spacer(modifier = Modifier.width(8.dp))
            val (tint, label) = when (post.sentiment) {
              "bullish" -> Color(0xFF16C784) to "Bullish"
              "bearish" -> Color(0xFFEA3943) to "Bearish"
              else -> Color(0xFFA8A8A8) to "Neutral"
            }
            Text(label, color = tint, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
          }
        }
        if (post.text.isNotEmpty()) {
          Spacer(modifier = Modifier.height(4.dp))
          Text(post.text, color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
        }
        if (post.imageUri != null) {
          Spacer(modifier = Modifier.height(8.dp))
          AsyncImage(
            model = post.imageUri,
            contentDescription = "Post photo",
            modifier = Modifier
              .fillMaxWidth()
              .heightIn(max = if (imageExpanded) 260.dp else 90.dp)
              .clip(RoundedCornerShape(14.dp))
              .clickable { imageExpanded = !imageExpanded },
            contentScale = ContentScale.Crop
          )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          MediaPostActionButton(icon = Icons.Outlined.Comment, count = 0, tint = Color(0xFF8A8A8A), onClick = {})
          Spacer(modifier = Modifier.width(18.dp))
          MediaPostActionButton(icon = Icons.Outlined.Repeat, count = 0, tint = Color(0xFF8A8A8A), onClick = {})
          Spacer(modifier = Modifier.width(18.dp))
          MediaPostActionButton(
            icon = Icons.Outlined.ThumbUp,
            count = post.likeCount,
            tint = if (post.liked) Color(0xFFFFC94A) else Color(0xFF8A8A8A),
            onClick = onLikeClick
          )
          Spacer(modifier = Modifier.width(18.dp))
          MediaPostActionButton(
            icon = Icons.Outlined.Share,
            count = null,
            tint = Color(0xFF8A8A8A),
            onClick = {
              val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, post.text)
              }
              context.startActivity(Intent.createChooser(sendIntent, "Share post"))
            }
          )
        }
      }
      IconButton(onClick = onDismissClick, modifier = Modifier.size(22.dp)) {
        Icon(Icons.Outlined.Close, contentDescription = "Dismiss", tint = Color(0xFF6E6E6E), modifier = Modifier.size(16.dp))
      }
    }
    Spacer(modifier = Modifier.height(14.dp))
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.08f)))
  }
}

@Composable
private fun MediaPostActionButton(icon: ImageVector, count: Int?, tint: Color, onClick: () -> Unit) {
  Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable(onClick = onClick)) {
    Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
    if (count != null) {
      Spacer(modifier = Modifier.width(4.dp))
      Text("$count", color = tint, fontSize = 12.sp)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatGizaMediaCreateSheet(viewModel: ChatViewModel, onDismiss: () -> Unit, onPostClick: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 32.dp)
    ) {
      // "My Profile" + the signed-in user's own avatar, matching the
      // reference — this sheet is about posting as yourself, not a
      // ChatGiZa-branded header.
      Row(verticalAlignment = Alignment.CenterVertically) {
        if (viewModel.userImage != null) {
          AsyncImage(
            model = viewModel.userImage,
            contentDescription = "Profile",
            modifier = Modifier.size(32.dp).clip(CircleShape)
          )
        } else {
          Icon(
            Icons.Outlined.AccountCircle,
            contentDescription = "Profile",
            tint = Color.White,
            modifier = Modifier.size(32.dp)
          )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text("My Profile", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.weight(1f))
        Icon(Icons.Outlined.Notifications, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
      }
      Spacer(modifier = Modifier.height(20.dp))
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MediaCreateOption("Post", Modifier.weight(1f), onPostClick) {
          Icon(Icons.Filled.Edit, contentDescription = "Post", tint = Color(0xFFFFC94A), modifier = Modifier.size(26.dp))
        }
        MediaCreateOption("Article", Modifier.weight(1f), onDismiss) {
          Icon(Icons.Outlined.Description, contentDescription = "Article", tint = Color(0xFFFFC94A), modifier = Modifier.size(24.dp))
        }
        MediaCreateOption("Video", Modifier.weight(1f), onDismiss) {
          MediaVideoIcon(modifier = Modifier.size(24.dp), tint = Color(0xFFFFC94A))
        }
      }
      Spacer(modifier = Modifier.height(10.dp))
      // Side by side under Post/Video (not stacked full-width rows) --
      // matches the sketch: Creator Center sits under Post, CreatorPad
      // sits under Video.
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MediaCreateWideRow("Creator Center", Modifier.weight(1f), onDismiss) {
          Icon(Icons.Outlined.Widgets, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        MediaCreateWideRow("CreatorPad", Modifier.weight(1f), onDismiss) {
          MediaCreatorPadIcon(modifier = Modifier.size(20.dp), tint = Color.White)
        }
      }
    }
  }
}

// Reached via ChatGiZa Media's "+" -> Post. Local-only for now (see
// MediaPost) -- text, an optional photo, and a bullish/neutral/bearish
// sentiment tag, all wired to actually work rather than just closing the
// sheet, since there's no backend feed to post to yet.
@Composable
private fun ChatGizaMediaPostComposerScreen(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  BackHandler { onDismiss() }
  var text by remember { mutableStateOf("") }
  var imageUri by remember { mutableStateOf<Uri?>(null) }
  var sentiment by remember { mutableStateOf<String?>(null) }

  val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) imageUri = uri
  }

  val canPost = text.isNotBlank() || imageUri != null

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF161616))
      .statusBarsPadding()
  ) {
    Column(modifier = Modifier.fillMaxSize()) {
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(onClick = onDismiss, modifier = Modifier.size(26.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(26.dp))
        }
        Spacer(modifier = Modifier.weight(1f))
        Button(
          onClick = {
            viewModel.addMediaPost(text.trim(), imageUri?.toString(), sentiment)
            onDismiss()
          },
          enabled = canPost,
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFFFC94A),
            disabledContainerColor = Color(0xFFFFC94A).copy(alpha = 0.35f)
          ),
          shape = RoundedCornerShape(20.dp),
          contentPadding = PaddingValues(horizontal = 22.dp, vertical = 8.dp)
        ) {
          Text("Post", color = Color.Black, fontWeight = FontWeight.SemiBold)
        }
      }

      Column(
        modifier = Modifier
          .weight(1f)
          .fillMaxWidth()
          .verticalScroll(rememberScrollState())
          .padding(horizontal = 16.dp)
      ) {
        Row(modifier = Modifier.fillMaxWidth()) {
          if (viewModel.userImage != null) {
            AsyncImage(
              model = viewModel.userImage,
              contentDescription = "Profile",
              modifier = Modifier.size(36.dp).clip(CircleShape)
            )
          } else {
            Icon(
              Icons.Outlined.AccountCircle,
              contentDescription = "Profile",
              tint = Color.White,
              modifier = Modifier.size(36.dp)
            )
          }
          Spacer(modifier = Modifier.width(12.dp))
          Box(modifier = Modifier.weight(1f).padding(top = 6.dp)) {
            if (text.isEmpty()) {
              Text("Share your thoughts!", color = Color(0xFF7A7A7A), fontSize = 17.sp)
            }
            BasicTextField(
              value = text,
              onValueChange = { text = it },
              textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 17.sp),
              cursorBrush = SolidColor(Color(0xFFFFC94A)),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }

        if (imageUri != null) {
          Spacer(modifier = Modifier.height(16.dp))
          Box(
            modifier = Modifier
              .fillMaxWidth()
              .heightIn(max = 260.dp)
              .clip(RoundedCornerShape(16.dp))
          ) {
            AsyncImage(
              model = imageUri,
              contentDescription = "Attached photo",
              modifier = Modifier.fillMaxWidth(),
              contentScale = ContentScale.Crop
            )
            IconButton(
              onClick = { imageUri = null },
              modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .size(30.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.55f))
            ) {
              Icon(Icons.Outlined.Close, contentDescription = "Remove photo", tint = Color.White, modifier = Modifier.size(18.dp))
            }
          }
        }
      }

      // Left cluster is content-insert affordances; the right cluster is a
      // bullish/neutral/bearish sentiment tag for the post -- common in
      // crypto-social composers, and matches the reference screenshot.
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .imePadding()
          .navigationBarsPadding()
          .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(onClick = { text += "😀" }, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.EmojiEmotions, contentDescription = "Emoji", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = { imagePicker.launch("image/*") }, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.Image, contentDescription = "Add photo", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = { text += "#" }, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.Tag, contentDescription = "Hashtag", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = { text += "$" }, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.AttachMoney, contentDescription = "Cashtag", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = {}, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.Poll, contentDescription = "Poll", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = {}, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.CardGiftcard, contentDescription = "Gift", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        IconButton(onClick = {}, modifier = Modifier.size(30.dp)) {
          Icon(Icons.Outlined.MoreHoriz, contentDescription = "More", tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
        }
        Spacer(modifier = Modifier.weight(1f))
        SentimentToggle(selected = sentiment, onSelect = { sentiment = if (sentiment == it) null else it })
      }
    }
  }
}

@Composable
private fun SentimentToggle(selected: String?, onSelect: (String) -> Unit) {
  Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
    SentimentToggleIcon(
      icon = Icons.Outlined.TrendingUp,
      tint = Color(0xFF16C784),
      active = selected == "bullish",
      onClick = { onSelect("bullish") }
    )
    SentimentToggleIcon(
      icon = Icons.AutoMirrored.Outlined.TrendingFlat,
      tint = Color.White,
      active = selected == "neutral",
      onClick = { onSelect("neutral") }
    )
    SentimentToggleIcon(
      icon = Icons.Outlined.TrendingDown,
      tint = Color(0xFFEA3943),
      active = selected == "bearish",
      onClick = { onSelect("bearish") }
    )
  }
}

@Composable
private fun SentimentToggleIcon(icon: ImageVector, tint: Color, active: Boolean, onClick: () -> Unit) {
  Box(
    modifier = Modifier
      .size(30.dp)
      .clip(RoundedCornerShape(8.dp))
      .background(tint.copy(alpha = if (active) 0.28f else 0.12f))
      .clickable(onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
  }
}

@Composable
private fun MediaCreateOption(label: String, modifier: Modifier = Modifier, onClick: () -> Unit, icon: @Composable () -> Unit) {
  Column(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .background(Color.White.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(vertical = 16.dp),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    icon()
    Spacer(modifier = Modifier.height(8.dp))
    Text(label, color = Color.White, fontSize = 13.sp)
  }
}

@Composable
private fun MediaCreateWideRow(label: String, modifier: Modifier = Modifier, onClick: () -> Unit, icon: @Composable () -> Unit) {
  Row(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .background(Color.White.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(horizontal = 12.dp, vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    icon()
    Spacer(modifier = Modifier.width(10.dp))
    Text(
      label,
      color = Color.White,
      fontSize = 13.sp,
      fontWeight = FontWeight.Medium,
      maxLines = 1,
      softWrap = false,
      overflow = TextOverflow.Clip
    )
  }
}

// Hand-drawn to match the reference's clapperboard-with-play-triangle
// glyph — no Material Icons entry has that exact silhouette.
@Composable
private fun MediaVideoIcon(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(3f * scale, 5f * scale),
      size = Size(18f * scale, 15f * scale),
      cornerRadius = CornerRadius(3f * scale, 3f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
    )
    drawLine(
      color = tint,
      start = Offset(3f * scale, 9.5f * scale),
      end = Offset(21f * scale, 9.5f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    listOf(6.5f, 10.5f, 14.5f, 18f).forEach { x ->
      drawLine(
        color = tint,
        start = Offset(x * scale, 5f * scale),
        end = Offset((x - 2f) * scale, 9.5f * scale),
        strokeWidth = strokeW * 0.85f,
        cap = StrokeCap.Round
      )
    }
    val playTriangle = Path().apply {
      moveTo(10f * scale, 12.2f * scale)
      lineTo(16f * scale, 15.3f * scale)
      lineTo(10f * scale, 18.4f * scale)
      close()
    }
    drawPath(playTriangle, color = tint)
  }
}

// Hand-drawn to match the reference's ascending-steps + diamond glyph —
// no Material Icons entry has that exact silhouette.
@Composable
private fun MediaCreatorPadIcon(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(3f * scale, 15f * scale),
      size = Size(6.5f * scale, 6f * scale),
      cornerRadius = CornerRadius(1.4f * scale, 1.4f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
    )
    drawRoundRect(
      color = tint,
      topLeft = Offset(11f * scale, 8f * scale),
      size = Size(6.5f * scale, 13f * scale),
      cornerRadius = CornerRadius(1.4f * scale, 1.4f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
    )
    val cx = 14.25f * scale
    val cy = 4.4f * scale
    val r = 2.3f * scale
    val diamond = Path().apply {
      moveTo(cx, cy - r)
      lineTo(cx + r, cy)
      lineTo(cx, cy + r)
      lineTo(cx - r, cy)
      close()
    }
    drawPath(diamond, color = tint, style = Stroke(width = strokeW))
  }
}

private val AVATAR_GRADIENTS = listOf(
  listOf(Color(0xFF6D5DF6), Color(0xFF2979FF)),
  listOf(Color(0xFFFF6B6B), Color(0xFFFF9F43)),
  listOf(Color(0xFF11998E), Color(0xFF38EF7D)),
  listOf(Color(0xFFF7971E), Color(0xFFFFD200)),
  listOf(Color(0xFFEE0979), Color(0xFFFF6A00)),
  listOf(Color(0xFF00C6FF), Color(0xFF0072FF))
)

private fun avatarGradient(seed: String): List<Color> =
  AVATAR_GRADIENTS[Math.floorMod(seed.hashCode(), AVATAR_GRADIENTS.size)]

/** Truncates a conversation title to a sane max length, breaking on a word
 * boundary when there is one close enough to the cutoff so the preview
 * reads as a clean phrase instead of a word sliced in half — e.g. a long
 * question gets cut after a whole word, not mid-word. Compose's ellipsis
 * still handles the common single-line overflow case; this is the
 * backstop for when a title is long enough to need it. */
private fun truncateTitle(title: String, maxChars: Int = 36): String {
  val trimmed = title.trim()
  if (trimmed.length <= maxChars) return trimmed
  val cut = trimmed.take(maxChars)
  val lastSpace = cut.lastIndexOf(' ')
  val safeCut = if (lastSpace >= (maxChars * 0.6).toInt()) cut.take(lastSpace) else cut
  return safeCut.trimEnd() + "…"
}

@Composable
private fun HistoryRow(convo: ApiConversation, onClick: () -> Unit, onMenuClick: () -> Unit) {
  val lastMessage = convo.messages.lastOrNull()
  val dateText = lastMessage?.createdAt?.let { formatDate(it) } ?: ""
  val title = truncateTitle(convo.title.ifBlank { "New chat" })

  // No card background here by design — rows sit directly on the plain
  // background, matching the reference's BTC/CORE/MNT rows (no per-row
  // layer, just the content itself).
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(horizontal = 10.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier
        .size(34.dp)
        .clip(CircleShape)
        .background(Brush.linearGradient(avatarGradient(convo.id))),
      contentAlignment = Alignment.Center
    ) {
      Text(
        title.trim().take(1).uppercase(),
        color = Color.White,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold
      )
    }
    Spacer(modifier = Modifier.width(10.dp))
    Column(modifier = Modifier.weight(1f)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        if (convo.pinned) {
          Icon(
            Icons.Outlined.PushPin,
            contentDescription = "Pinned",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(12.dp)
          )
          Spacer(modifier = Modifier.size(5.dp))
        }
        Text(
          text = title,
          color = colorScheme.onBackground,
          fontSize = 15.sp,
          fontWeight = FontWeight.Medium,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
      }
      if (dateText.isNotEmpty()) {
        Spacer(modifier = Modifier.height(1.dp))
        Text(dateText, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 11.sp)
      }
    }
    Spacer(modifier = Modifier.width(2.dp))
    IconButton(onClick = onMenuClick, modifier = Modifier.size(28.dp)) {
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
  BackHandler { viewModel.closeCustomize() }
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Customize ChatGiZa", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeCustomize() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
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
private fun ProfileAvatar(imageUrl: String?, modifier: Modifier = Modifier, size: Dp = 160.dp) {
  Box(
    modifier = modifier
      .size(size)
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
        Icons.Outlined.AccountCircle,
        contentDescription = "Profile photo",
        tint = Color.White,
        modifier = Modifier.size(size * 0.45f)
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
      .background(Color(0xFF181818))
      .verticalScroll(rememberScrollState())
      .padding(horizontal = 20.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 32.dp, bottom = 20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      // No back arrow — closing happens via the system back gesture
      // (BackHandler above), same as the other settings sub-screens.
      Text(
        "Profile",
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
      ProfileAvatar(imageUrl = viewModel.userImage, size = 120.dp)
      FilledIconButton(
        onClick = { xNote = true },
        modifier = Modifier
          .size(40.dp)
          .align(Alignment.BottomEnd)
          .offset(x = (-4).dp)
          .border(2.dp, Color(0xFF181818), CircleShape),
        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.White)
      ) {
        Icon(Icons.Outlined.Edit, contentDescription = "Change photo", tint = Color.Black, modifier = Modifier.size(18.dp))
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
      icon = Icons.Outlined.AlternateEmail,
      title = "Connect with X",
      onClick = { xNote = true }
    )

    if (xNote) {
      Spacer(modifier = Modifier.height(10.dp))
      Text("Coming soon", color = Color(0xFFA8A8A8), fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(10.dp))
    Card(
      modifier = Modifier.fillMaxWidth().clickable(onClick = { viewModel.signOut() }),
      shape = RoundedCornerShape(22.dp),
      colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
    ) {
      Row(
        modifier = Modifier.padding(20.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, tint = Color(0xFFFF6B6B))
        Spacer(modifier = Modifier.width(16.dp))
        Text("Sign out", color = Color(0xFFFF6B6B), fontSize = 16.sp, fontWeight = FontWeight.Medium)
      }
    }

    Spacer(modifier = Modifier.height(24.dp))
  }
}

private enum class AppTheme(val key: String, val label: String, val icon: ImageVector) {
  SYSTEM("system", "System", Icons.Filled.SettingsBrightness),
  FOR_YOU("for_you", "For You", Icons.Filled.Favorite),
  DARK("dark", "Dark", Icons.Filled.DarkMode),
  LIGHT("light", "Light", Icons.Filled.LightMode);

  companion object {
    fun fromKey(key: String): AppTheme = entries.find { it.key == key } ?: DARK
  }
}

@Composable
private fun ThemeCard(theme: AppTheme, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
  val bg by animateColorAsState(
    targetValue = if (selected) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.10f),
    animationSpec = tween(250),
    label = "themeCardBg"
  )
  val iconTint by animateColorAsState(
    targetValue = if (selected) colorScheme.background else colorScheme.onBackground.copy(alpha = 0.55f),
    animationSpec = tween(250),
    label = "themeCardIcon"
  )
  Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .aspectRatio(1.6f)
        .clip(RoundedCornerShape(24.dp))
        .background(bg)
        .clickable(onClick = onClick),
      contentAlignment = Alignment.Center
    ) {
      Icon(theme.icon, contentDescription = theme.label, tint = iconTint, modifier = Modifier.size(22.dp))
    }
    Spacer(modifier = Modifier.height(10.dp))
    Text(
      theme.label,
      color = colorScheme.onBackground,
      fontSize = 14.sp,
      fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
      maxLines = 1
    )
  }
}

@Composable
private fun PreviewSlider(value: Float, onValueChange: (Float) -> Unit, modifier: Modifier = Modifier) {
  val density = LocalDensity.current
  val thumbSize = 22.dp
  val trackHeight = 14.dp
  BoxWithConstraints(modifier = modifier.height(thumbSize)) {
    val trackWidthPx = with(density) { maxWidth.toPx() }
    val thumbPx = with(density) { thumbSize.toPx() }
    val usableWidth = (trackWidthPx - thumbPx).coerceAtLeast(0f)
    val thumbOffsetPx = value.coerceIn(0f, 1f) * usableWidth

    Box(
      modifier = Modifier
        .align(Alignment.CenterStart)
        .fillMaxWidth()
        .height(trackHeight)
        .clip(RoundedCornerShape(999.dp))
        .background(colorScheme.onBackground.copy(alpha = 0.15f))
    ) {
      Box(
        modifier = Modifier
          .fillMaxHeight()
          .width(with(density) { (thumbOffsetPx + thumbPx / 2f).toDp() })
          .clip(RoundedCornerShape(999.dp))
          .background(colorScheme.onBackground)
      )
    }

    Box(
      modifier = Modifier
        .align(Alignment.CenterStart)
        .offset { IntOffset(thumbOffsetPx.roundToInt(), 0) }
        .size(thumbSize)
        .clip(CircleShape)
        .background(colorScheme.onBackground)
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
  val selectedTheme = AppTheme.fromKey(viewModel.themeMode)
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
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.width(20.dp))
        Text("Appearance", color = colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      }

      Spacer(modifier = Modifier.height(24.dp))
      Text("Theme", color = colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AppTheme.entries.forEach { theme ->
          ThemeCard(
            theme = theme,
            selected = selectedTheme == theme,
            onClick = { viewModel.updateThemeMode(theme.key) },
            modifier = Modifier.weight(1f)
          )
        }
      }

      Spacer(modifier = Modifier.height(24.dp))
      Text("Text Size", color = colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      val showReset = kotlin.math.abs(textSize - 0.5f) > 0.001f
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .height(280.dp)
          .clip(RoundedCornerShape(28.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.06f))
      ) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
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
            if (showReset) "Reset" else "PREVIEW",
            color = if (showReset) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.5f),
            fontSize = 15.sp,
            fontWeight = if (showReset) FontWeight.Bold else FontWeight.SemiBold,
            modifier = Modifier
              .align(Alignment.CenterHorizontally)
              .let { if (showReset) it.clickable { textSize = 0.5f } else it }
          )
        }
      }
    }
  }
}

private data class VoiceOption(
  val id: String,
  val name: String,
  val description: String,
  val gradientStart: Color,
  val gradientEnd: Color
)

// id = the actual voice name OpenAI's Realtime API accepts (passed straight
// through to the live session); name/description are just the friendly
// label shown in the picker — each gets its own gradient so the selected
// card reads as "this voice" at a glance, not just a checkmark.
private val VOICE_OPTIONS = listOf(
  VoiceOption("cedar", "Orin", "Wise Male", Color(0xFFF59E0B), Color(0xFFEF4444)),
  VoiceOption("alloy", "Lyra", "Calm Female", Color(0xFF14B8A6), Color(0xFF06B6D4)),
  VoiceOption("ballad", "Kael", "Bold Male", Color(0xFF8B5CF6), Color(0xFFEC4899)),
  VoiceOption("coral", "Elia", "Warm Female", Color(0xFF10B981), Color(0xFF84CC16)),
  VoiceOption("sage", "Leo", "Smart Male", Color(0xFF3B82F6), Color(0xFF14B8A6)),
  // The signature/default ChatGiZa voice — no "18+" tag here: unlike
  // Personality, voice choice has no real content-gating behind it, and
  // this is also the app's default, so tagging it adult-only would be
  // both meaningless and contradict it being what new users hear by default.
  VoiceOption("marin", "GiZa", "Playful", Color(0xFF4F46E5), Color(0xFFEC4899))
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
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
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
  GENERAL("General Feedback", Icons.Outlined.Comment),
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

  val canSubmit = description.isNotBlank() && !submitted

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
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(onClick = { viewModel.closeReportProblem() }, modifier = Modifier.size(26.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Close", tint = colorScheme.onBackground, modifier = Modifier.size(26.dp))
        }
        Text(
          "Report a Problem",
          color = colorScheme.onBackground,
          fontSize = 19.sp,
          fontWeight = FontWeight.Bold,
          textAlign = TextAlign.Center,
          modifier = Modifier.weight(1f)
        )
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(
              if (canSubmit) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.15f)
            )
            .clickable(enabled = canSubmit) { submitted = true }
            .padding(horizontal = 18.dp, vertical = 8.dp)
        ) {
          Text(
            "Submit",
            color = if (canSubmit) colorScheme.background else colorScheme.onBackground.copy(alpha = 0.4f),
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
          )
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      Box {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.08f))
            .clickable { typeMenuOpen = true }
            .padding(horizontal = 14.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(selectedType.icon, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
          Spacer(modifier = Modifier.width(12.dp))
          Text(selectedType.label, color = colorScheme.onBackground, fontSize = 15.sp, modifier = Modifier.weight(1f))
          Icon(
            Icons.Outlined.KeyboardArrowDown,
            contentDescription = "Choose feedback type",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(20.dp)
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
                    tint = if (isSelected) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.6f),
                    modifier = Modifier.size(20.dp)
                  )
                  Spacer(modifier = Modifier.width(12.dp))
                  Text(type.label, fontSize = 15.sp, modifier = Modifier.weight(1f))
                  if (isSelected) {
                    Spacer(modifier = Modifier.width(12.dp))
                    Icon(Icons.Filled.Check, contentDescription = "Selected", tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
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

      Spacer(modifier = Modifier.height(14.dp))

      OutlinedTextField(
        value = description,
        onValueChange = { description = it },
        modifier = Modifier.fillMaxWidth().height(140.dp),
        placeholder = { Text("Describe what went wrong", fontSize = 15.sp) },
        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 15.sp, color = colorScheme.onBackground),
        shape = RoundedCornerShape(14.dp)
      )

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier
          .clip(RoundedCornerShape(percent = 50))
          .background(colorScheme.onBackground.copy(alpha = 0.08f))
          .clickable { imagePicker.launch("image/*") }
          .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .size(24.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(colorScheme.onBackground),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Outlined.Photo, contentDescription = null, tint = colorScheme.background, modifier = Modifier.size(14.dp))
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
          if (attachedImageUri != null) "1 image attached" else "Attach images",
          color = colorScheme.onBackground,
          fontSize = 14.sp
        )
      }

      if (submitted) {
        Spacer(modifier = Modifier.height(14.dp))
        Text("Sent — thank you!", color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 13.sp)
      }
    }
  }
}

@Composable
private fun DataControlsAppBar(title: String, onBack: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 26.dp, bottom = 20.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    IconButton(onClick = onBack, modifier = Modifier.size(24.dp)) {
      Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(24.dp))
    }
    Spacer(modifier = Modifier.width(20.dp))
    Text(
      title,
      color = Color.White,
      fontSize = 22.sp,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.padding(top = 2.dp)
    )
  }
}

@Composable
private fun DataControlToggleRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
  Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
    Column(modifier = Modifier.weight(1f)) {
      Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(3.dp))
      Text(subtitle, color = Color(0xFFA8A8A8), fontSize = 12.sp, lineHeight = 15.sp, fontWeight = FontWeight.Normal)
    }
    Spacer(modifier = Modifier.width(12.dp))
    Switch(
      checked = checked,
      onCheckedChange = onCheckedChange,
      modifier = Modifier.scale(0.75f)
    )
  }
}

@Composable
private fun DangerRow(label: String, onClick: () -> Unit) {
  Text(
    label,
    color = Color(0xFFFF3B30),
    fontSize = 14.sp,
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
  var mediaDeleteNote by remember { mutableStateOf(false) }

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
            Text("Manage Cloud Storage", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(3.dp))
            Text(
              "See all the files and assets you have uploaded to ChatGiZa. You can also delete them here.",
              color = Color(0xFFA8A8A8),
              fontSize = 12.sp,
              lineHeight = 15.sp
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
      if (mediaDeleteNote) {
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          "Not available yet — ChatGiZa doesn't have separate media storage to clear.",
          color = Color(0xFFA8A8A8),
          fontSize = 13.sp
        )
      }
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
      onConfirm = { mediaDeleteNote = true },
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

private val CLOUD_STORAGE_FILTERS = listOf("All", "Images", "Videos", "Documents", "Audio")
private val CLOUD_STORAGE_SORTS = listOf("Last used", "Date created", "Name", "Size")

@Composable
private fun CloudStorageFilterMenuItem(label: String, selected: Boolean, onClick: () -> Unit) {
  DropdownMenuItem(
    text = {
      Text(label, color = Color.White, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, fontSize = 15.sp)
    },
    leadingIcon = {
      if (selected) {
        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
      } else {
        Spacer(modifier = Modifier.size(18.dp))
      }
    },
    onClick = onClick
  )
}

@Composable
private fun ManageCloudStorageScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeManageCloudStorage() }
  var filterMenuOpen by remember { mutableStateOf(false) }
  var selectedFilter by remember { mutableStateOf("All") }
  var selectedSort by remember { mutableStateOf("Last used") }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 20.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 44.dp, bottom = 20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeManageCloudStorage() }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
      }
      Spacer(modifier = Modifier.width(20.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text("0 B", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text("0% used", color = Color(0xFFA8A8A8), fontSize = 13.sp)
      }
      Box {
        Box(
          modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .clickable { filterMenuOpen = true },
          contentAlignment = Alignment.Center
        ) {
          FilterIconCustom(tint = Color.White, modifier = Modifier.size(24.dp))
        }
        DropdownMenu(
          expanded = filterMenuOpen,
          onDismissRequest = { filterMenuOpen = false },
          modifier = Modifier.background(Color(0xFF1F1F1F))
        ) {
          Text(
            "Filter by",
            color = Color(0xFFA8A8A8),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
          )
          CLOUD_STORAGE_FILTERS.forEach { option ->
            CloudStorageFilterMenuItem(option, selected = option == selectedFilter) {
              selectedFilter = option
              filterMenuOpen = false
            }
          }
          HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
          Text(
            "Sort by",
            color = Color(0xFFA8A8A8),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
          )
          CLOUD_STORAGE_SORTS.forEach { option ->
            CloudStorageFilterMenuItem(option, selected = option == selectedSort) {
              selectedSort = option
              filterMenuOpen = false
            }
          }
        }
      }
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
      Text("No files yet", color = Color(0xFFA8A8A8), fontSize = 12.sp, fontWeight = FontWeight.Normal)
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
    containerColor = Color(0xFF181818),
    topBar = {
      TopAppBar(
        title = { Text("Widget") },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeWidgets() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF181818))
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
          Icon(Icons.Outlined.AddBox, contentDescription = null, tint = Color.White)
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
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeHaptics() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
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
      .background(Color(0xFF181818))
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
        Icon(Icons.Outlined.Search, contentDescription = "Search languages", tint = Color.White, modifier = Modifier.size(28.dp))
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

private fun pasteAsFileModeLabel(mode: String): String = when (mode) {
  "always_file" -> "Always Attach as File"
  "always_text" -> "Always Paste as Text"
  else -> "Always Ask"
}

@Composable
private fun RadioIcon(selected: Boolean) {
  Icon(
    if (selected) Icons.Outlined.RadioButtonChecked else Icons.Outlined.RadioButtonUnchecked,
    contentDescription = null,
    tint = if (selected) Color.White else Color(0xFFA8A8A8)
  )
}

@Composable
private fun AdvancedScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAdvanced() }
  var showDialog by remember { mutableStateOf(false) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeAdvanced() }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(28.dp))
      }
      Spacer(Modifier.width(20.dp))
      Text(text = "Advanced", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(Modifier.height(28.dp))

    Card(
      modifier = Modifier
        .fillMaxWidth()
        .clickable { showDialog = true },
      shape = RoundedCornerShape(22.dp),
      colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
    ) {
      Column(modifier = Modifier.padding(20.dp)) {
        Text(text = "Paste as File", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Spacer(Modifier.height(6.dp))
        Text(text = pasteAsFileModeLabel(viewModel.pasteAsFileMode), color = Color.Gray, fontSize = 17.sp)
      }
    }

    Spacer(Modifier.height(18.dp))

    Text(
      text = "When pasting large text, choose whether to attach it as a file or paste it directly.",
      color = Color.Gray,
      fontSize = 16.sp
    )
  }

  if (showDialog) {
    Dialog(onDismissRequest = { showDialog = false }) {
      Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
      ) {
        Column(modifier = Modifier.padding(24.dp)) {
          Text("Paste as File", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)

          Spacer(Modifier.height(30.dp))

          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .clickable {
                viewModel.updatePasteAsFileMode("always_ask")
                showDialog = false
              }
          ) {
            RadioIcon(selected = viewModel.pasteAsFileMode == "always_ask")
            Spacer(Modifier.width(12.dp))
            Text("Always Ask", color = Color.White, fontSize = 19.sp)
          }

          Spacer(Modifier.height(22.dp))

          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .clickable {
                viewModel.updatePasteAsFileMode("always_file")
                showDialog = false
              }
          ) {
            RadioIcon(selected = viewModel.pasteAsFileMode == "always_file")
            Spacer(Modifier.width(12.dp))
            Text("Always Attach as File", color = Color.White, fontSize = 19.sp)
          }

          Spacer(Modifier.height(22.dp))

          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .clickable {
                viewModel.updatePasteAsFileMode("always_text")
                showDialog = false
              }
          ) {
            RadioIcon(selected = viewModel.pasteAsFileMode == "always_text")
            Spacer(Modifier.width(12.dp))
            Text("Always Paste as Text", color = Color.White, fontSize = 19.sp)
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
  val context = LocalContext.current
  Scaffold(
    containerColor = Color.Transparent
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Settings", color = colorScheme.onBackground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      }

      // No profile card and no GiZa Pro banner here anymore — the avatar in
      // History now opens Edit Profile directly, so this screen is a plain
      // settings list. Closing happens via the system back gesture
      // (BackHandler above), not a dedicated close button.
      SettingsSectionHeader("App")
      SettingsSection {
        SettingsMenuRow("Appearance", icon = Icons.Outlined.DarkMode) { viewModel.openAppearance() }
        SettingsDivider()
        SettingsMenuRow("Haptics", icon = Icons.Outlined.Vibration) { viewModel.openHaptics() }
        SettingsDivider()
        SettingsMenuRow("Widgets", icon = Icons.Outlined.Widgets) { viewModel.openWidgets() }
        SettingsDivider()
        SettingsMenuRow("App Language", icon = Icons.Outlined.Language) { viewModel.openAppLanguage() }
        SettingsDivider()
        SettingsMenuRow("Advanced", icon = Icons.Outlined.AutoAwesome) { viewModel.openAdvanced() }
      }

      SettingsSectionHeader("GiZa")
      SettingsSection {
        SettingsMenuRow("Customize GiZa", icon = Icons.Outlined.Tune) { viewModel.openCustomize() }
        SettingsDivider()
        SettingsMenuRow("Connectors", icon = Icons.Outlined.Hub)
        SettingsDivider()
        SettingsMenuRow("Kids Mode", icon = Icons.Outlined.ChildCare)
        SettingsDivider()
        SettingsMenuRow("NSFW Preferences", icon = Icons.Outlined.NoAdultContent)
      }

      SettingsSectionHeader("Voice")
      SettingsSection {
        SettingsMenuRow("Voice", icon = Icons.Outlined.GraphicEq) { viewModel.openVoice() }
      }

      SettingsSectionHeader("Data & Information")
      SettingsSection {
        SettingsMenuRow("Shared Conversations", icon = Icons.Outlined.Link)
        SettingsDivider()
        SettingsMenuRow("Data Controls", icon = Icons.Outlined.Storage) { viewModel.openDataControls() }
        SettingsDivider()
        SettingsMenuRow("Open Source Licenses", icon = Icons.Outlined.Description)
        SettingsDivider()
        SettingsMenuRow("Terms of Use", icon = Icons.AutoMirrored.Outlined.Article) {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/terms")))
        }
        SettingsDivider()
        SettingsMenuRow("Privacy Policy", icon = Icons.Outlined.Lock) {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/privacy")))
        }
      }

      SettingsSectionHeader("Support")
      SettingsSection {
        SettingsMenuRow("Report a Problem", icon = Icons.Outlined.ReportProblem) { viewModel.openReportProblem() }
      }

      // Sign out moved to the Edit Profile screen, below "Connect with X".
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

/** Groups settings rows into a single rounded, layered card — matches the
 * grouped-list style (rows on their own background, not floating on the
 * screen background). */
@Composable
private fun SettingsSection(content: @Composable ColumnScope.() -> Unit) {
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(18.dp))
      .background(colorScheme.onBackground.copy(alpha = 0.06f))
      .padding(horizontal = 14.dp),
    content = content
  )
}

@Composable
private fun SettingsDivider() {
  HorizontalDivider(color = colorScheme.onBackground.copy(alpha = 0.08f), thickness = 1.dp)
}

/** A settings row — real and clickable when [onClick] is given, otherwise a
 * plain (dimmed) label reserving its place in the menu until it's wired up. */
@Composable
private fun SettingsMenuRow(
  title: String,
  icon: ImageVector? = null,
  textColor: Color? = null,
  onClick: (() -> Unit)? = null
) {
  val contentColor = textColor ?: colorScheme.onBackground.copy(alpha = if (onClick != null) 1f else 0.4f)
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .let { if (onClick != null) it.clickable(onClick = onClick) else it }
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    if (icon != null) {
      Icon(icon, contentDescription = null, tint = contentColor, modifier = Modifier.size(22.dp))
      Spacer(modifier = Modifier.width(16.dp))
    }
    Text(
      title,
      color = contentColor,
      fontSize = 16.sp,
      fontWeight = FontWeight.Medium
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeSettings() }
  val data = viewModel.settingsData
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Settings", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeSettings() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
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
  BackHandler { viewModel.closeProjects() }
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Projects", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeProjects() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
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
  BackHandler { viewModel.closeScheduled() }
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Automations", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeScheduled() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
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
  BackHandler { viewModel.closeBilling() }
  val context = LocalContext.current
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Billing", fontWeight = FontWeight.Bold) },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeBilling() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
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
private fun MessageBubble(
  message: UiMessage,
  showActions: Boolean,
  isSpeaking: Boolean,
  onSpeakToggle: () -> Unit,
  onRegenerate: () -> Unit,
  onDelete: () -> Unit
) {
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
          .padding(horizontal = 12.dp, vertical = 10.dp)
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
    if (!isUser && message.content.isNotBlank() && showActions) {
      Spacer(modifier = Modifier.height(4.dp))
      MessageActionBar(
        message = message,
        isSpeaking = isSpeaking,
        onSpeakToggle = onSpeakToggle,
        onRegenerate = onRegenerate,
        onDelete = onDelete
      )
    }
  }
}

@Composable
private fun ActionBarItem(icon: ImageVector, label: String, tint: Color = colorScheme.onBackground, onClick: () -> Unit) {
  Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(60.dp)) {
    Box(
      modifier = Modifier
        .size(48.dp)
        .clip(RoundedCornerShape(14.dp))
        .background(colorScheme.onBackground.copy(alpha = 0.06f))
        .clickable(onClick = onClick),
      contentAlignment = Alignment.Center
    ) {
      Icon(icon, contentDescription = label, tint = tint, modifier = Modifier.size(20.dp))
    }
    Spacer(modifier = Modifier.height(4.dp))
    Text(label, color = colorScheme.onBackground.copy(alpha = 0.6f), fontSize = 10.sp, maxLines = 1, softWrap = false)
  }
}

@Composable
private fun MessageActionBar(
  message: UiMessage,
  isSpeaking: Boolean,
  onSpeakToggle: () -> Unit,
  onRegenerate: () -> Unit,
  onDelete: () -> Unit
) {
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  var reaction by remember(message.id) { mutableStateOf<String?>(null) }
  var moreOpen by remember { mutableStateOf(false) }
  val accent = Color(0xFF2979FF)

  Row(
    modifier = Modifier.horizontalScroll(rememberScrollState()),
    horizontalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    ActionBarItem(Icons.Outlined.ContentCopy, "Copy") {
      clipboard.setText(AnnotatedString(message.content))
    }
    ActionBarItem(
      Icons.Outlined.ThumbUp,
      "Like",
      tint = if (reaction == "up") accent else colorScheme.onBackground
    ) { reaction = if (reaction == "up") null else "up" }
    ActionBarItem(
      Icons.Outlined.ThumbDown,
      "Dislike",
      tint = if (reaction == "down") accent else colorScheme.onBackground
    ) { reaction = if (reaction == "down") null else "down" }
    ActionBarItem(Icons.Outlined.Share, "Share") {
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, message.content)
      }
      context.startActivity(Intent.createChooser(intent, null))
    }
    ActionBarItem(Icons.Outlined.PictureAsPdf, "PDF") {
      runCatching {
        val file = generateReplyPdf(context, "ChatGiZa reply", message.content)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
          type = "application/pdf"
          putExtra(Intent.EXTRA_STREAM, uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, null))
      }
    }
    ActionBarItem(
      icon = if (isSpeaking) Icons.Outlined.VolumeOff else Icons.Outlined.VolumeUp,
      label = if (isSpeaking) "Stop" else "Read Aloud",
      tint = if (isSpeaking) accent else colorScheme.onBackground,
      onClick = onSpeakToggle
    )
    ActionBarItem(Icons.Outlined.Autorenew, "Regenerate", onClick = onRegenerate)
    Box {
      ActionBarItem(Icons.Outlined.MoreHoriz, "More") { moreOpen = true }
      DropdownMenu(expanded = moreOpen, onDismissRequest = { moreOpen = false }) {
        DropdownMenuItem(
          text = { Text("Delete", color = Color(0xFFFF3B30)) },
          onClick = { moreOpen = false; onDelete() }
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

