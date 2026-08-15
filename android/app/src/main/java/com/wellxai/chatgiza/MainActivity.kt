package com.wellxai.chatgiza

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.YuvImage
import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.widget.Toast
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
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.Crossfade
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.StartOffsetType
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsTopHeight
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
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.material.icons.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.KeyboardDoubleArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.automirrored.outlined.TrendingFlat
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.AddBox
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.AttachMoney
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.Autorenew
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.OpenInNew
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
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.Cameraswitch
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.FlashOff
import androidx.compose.material.icons.outlined.FlashOn
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicNone
import androidx.compose.material.icons.outlined.ModeEdit
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.Quiz
import androidx.compose.material.icons.outlined.NoAdultContent
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.Photo
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material.icons.outlined.Poll
import androidx.compose.material.icons.outlined.QueryStats
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material.icons.outlined.RecordVoiceOver
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.ScreenShare
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Vibration
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VolumeUp
import androidx.compose.material.icons.outlined.Whatshot
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.layout.ContentScale
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.items
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Locale
import kotlin.math.roundToInt
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val GOOGLE_WEB_CLIENT_ID =
  "302265706031-imsr5i7elinlqkdcjfv3sgicuul1m39g.apps.googleusercontent.com"

class MainActivity : ComponentActivity() {
  private lateinit var viewModel: ChatViewModel

  // Screenshot -> "Share a link to chat?" prompt (Android 14+ only).
  // Registered in onStart/unregistered in onStop per Android's own
  // guidance, rather than once in onCreate.
  private var screenCaptureCallback: Activity.ScreenCaptureCallback? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
    )
    super.onCreate(savedInstanceState)
    viewModel = ChatViewModel(TokenStore(applicationContext))

    // Makes Scheduled Tasks actually fire -- idempotent (KEEP policy), so
    // calling this on every launch is fine; WorkManager only schedules it
    // once and keeps it running in the background afterward.
    ScheduledTaskWorker.enqueuePeriodicWork(applicationContext)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      screenCaptureCallback = Activity.ScreenCaptureCallback {
        viewModel.onScreenshotTaken()
      }
    }

    setContent {
      ChatGizaTheme(themeMode = viewModel.themeMode) {
        // Wrapped in a Box so the screenshot-triggered "Share a link to
        // chat?" prompt can float above whichever screen is showing,
        // instead of being wired into every individual screen separately.
        Box(Modifier.fillMaxSize()) {
        // Android 13+ requires this to be asked for at runtime before a
        // Scheduled Task's firing notification can actually show -- asked
        // once, up front, rather than waiting for the first task to fire
        // (which would be a confusing moment to suddenly show a system
        // permission dialog).
        val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
        LaunchedEffect(Unit) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) ==
              PackageManager.PERMISSION_GRANTED
            if (!granted) notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
          }
        }
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
          val screensInsideHistoryDrawer = screen is AppScreen.Chat || screen is AppScreen.Media ||
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
                    (viewModel.screen is AppScreen.Chat || viewModel.screen is AppScreen.Media) ->
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
                DismissibleDrawerSheet(drawerContainerColor = Color.Black) {
                  HistoryScreen(viewModel)
                }
              }
            ) {
              when (screen) {
                is AppScreen.Media -> com.wellxai.chatgiza.ui.media.ChatGiZaMediaScreen(viewModel)
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
            is AppScreen.DataDashboard -> DataDashboardScreen(viewModel)
            is AppScreen.ManageCloudStorage -> ManageCloudStorageScreen(viewModel)
            is AppScreen.Settings -> SettingsScreen(viewModel)
            is AppScreen.Projects -> ProjectsScreen(viewModel)
            is AppScreen.Scheduled -> ScheduledScreen(viewModel)
            is AppScreen.Billing -> BillingScreen(viewModel)
            is AppScreen.Media -> com.wellxai.chatgiza.ui.media.ChatGiZaMediaScreen(viewModel)
            is AppScreen.LiveVision -> LiveVisionScreen(viewModel)
            is AppScreen.OpenSourceLicenses -> OpenSourceLicensesScreen(viewModel)
            is AppScreen.KidsMode -> KidsModeScreen(viewModel)
            is AppScreen.SharedConversations -> SharedConversationsScreen(viewModel)
            is AppScreen.CollabChat -> CollabChatScreen(viewModel)
            is AppScreen.NsfwPreferences -> NsfwPreferencesScreen(viewModel)
            is AppScreen.Connectors -> ConnectorsScreen(viewModel)
            is AppScreen.Profile -> {
              val uid = viewModel.userId
              if (uid != null) {
                com.wellxai.chatgiza.ui.media.MediaProfileScreen(
                  viewModel = viewModel,
                  target = com.wellxai.chatgiza.ui.media.ProfileTarget(uid, viewModel.userName ?: "You", viewModel.userImage),
                  onBack = { viewModel.closeMediaProfile() }
                )
              }
            }
            is AppScreen.ProfileHub -> ProfileHubScreen(viewModel)
          }
        }
        ScreenshotShareOverlay(viewModel)
        PreferenceWizardOverlay(viewModel)
        MemorySuggestionOverlay(viewModel)
        }
      }
    }
  }

  override fun onStart() {
    super.onStart()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      screenCaptureCallback?.let { callback ->
        runCatching { registerScreenCaptureCallback(mainExecutor, callback) }
      }
    }
  }

  override fun onStop() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      screenCaptureCallback?.let { callback ->
        runCatching { unregisterScreenCaptureCallback(callback) }
      }
    }
    super.onStop()
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

// Floats over whichever screen is showing when a screenshot is taken --
// same transcript-share action as the "Share" row in the "..." chat menu,
// just triggered automatically instead of tapped. Auto-dismisses after a
// few seconds if ignored.
@Composable
private fun BoxScope.ScreenshotShareOverlay(viewModel: ChatViewModel) {
  val context = LocalContext.current
  val visible = viewModel.showScreenshotSharePrompt
  LaunchedEffect(visible) {
    if (visible) {
      delay(6000)
      viewModel.dismissScreenshotSharePrompt()
    }
  }
  AnimatedVisibility(
    visible = visible,
    enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
    exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
    modifier = Modifier
      .align(Alignment.TopCenter)
      .statusBarsPadding()
      .padding(top = 8.dp, start = 16.dp, end = 16.dp)
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(18.dp))
        .background(Color(0xFF1C1C1C))
        .padding(16.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Text("Share a link to chat?", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Text(
          "This creates a copy that others can chat with",
          color = Color.White.copy(alpha = 0.55f),
          fontSize = 12.sp
        )
      }
      Spacer(modifier = Modifier.width(12.dp))
      IconButton(
        onClick = {
          viewModel.dismissScreenshotSharePrompt()
          val transcript = viewModel.messages.joinToString("\n\n") { m -> "${if (m.role == "user") "You" else "ChatGiZa"}: ${m.content}" }
          val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, transcript)
          }
          context.startActivity(Intent.createChooser(intent, null))
        },
        modifier = Modifier.size(40.dp).clip(CircleShape).background(Color.White)
      ) {
        Icon(Icons.Filled.Share, contentDescription = "Share", tint = Color.Black, modifier = Modifier.size(18.dp))
      }
    }
  }
}

// Floats over whichever screen is showing when the AI has picked up
// something durable worth remembering from the conversation -- shown
// one at a time (checked every few exchanges, not per message) so the
// user can accept or dismiss it; nothing is ever saved to memory
// without this explicit confirmation. Auto-dismisses if ignored, same
// as the screenshot-share prompt.
@Composable
private fun BoxScope.MemorySuggestionOverlay(viewModel: ChatViewModel) {
  val suggestion = viewModel.memorySuggestions.firstOrNull()
  val visible = suggestion != null
  LaunchedEffect(suggestion) {
    if (suggestion != null) {
      delay(8000)
      viewModel.dismissMemorySuggestion(suggestion)
    }
  }
  AnimatedVisibility(
    visible = visible,
    enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
    exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
    modifier = Modifier
      .align(Alignment.TopCenter)
      .statusBarsPadding()
      .padding(top = 8.dp, start = 16.dp, end = 16.dp)
  ) {
    if (suggestion != null) {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(18.dp))
          .background(Color(0xFF1C1C1C))
          .padding(16.dp)
      ) {
        Text("Remember this?", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(4.dp))
        Text("\"$suggestion\"", color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(12.dp))
              .background(Color.White.copy(alpha = 0.1f))
              .clickable { viewModel.dismissMemorySuggestion(suggestion) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text("Not now", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
          }
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(12.dp))
              .background(Color.White)
              .clickable { viewModel.acceptMemorySuggestion(suggestion) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text("Remember", color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Bold)
          }
        }
      }
    }
  }
}

// A short multi-select preference wizard, specific to whichever task
// example was tapped -- each task has its own questions (matching the
// reference: Sale monitor asks about stores/discount type, Concert
// alerts asks about artists/locations/tickets, Weekend ideas asks about
// activities/budget/distance). Finishing or skipping the last step turns
// the answers into a real scheduled task via the existing Scheduled
// backend, not just a one-off chat message.
private data class WizardStepDef(val question: String, val options: List<String>, val otherLabel: String)
private data class TaskWizardDef(val steps: List<WizardStepDef>)

private val TASK_WIZARDS: Map<String, TaskWizardDef> = mapOf(
  "Weekend ideas" to TaskWizardDef(
    listOf(
      WizardStepDef(
        "Ni shughuli gani ungependa nipendekeze zaidi?",
        listOf("Burudani & nightlife", "Michezo & outdoor", "Migahawa & food", "Matukio, concerts & shows"),
        "Ongeza aina nyingine ya shughuli"
      ),
      WizardStepDef(
        "Bajeti yako kwa shughuli ya weekend ni kiasi gani?",
        listOf("Chini ya TSh 20,000", "TSh 20,000–50,000", "TSh 50,000–100,000", "TSh 100,000+"),
        "Andika bajeti yako"
      ),
      WizardStepDef(
        "Unapendelea umbali gani kutoka ulipo?",
        listOf("Karibu sana (≤5 km)", "Hadi 10 km", "Hadi 25 km", "Popote jijini"),
        "Taja eneo unalopendelea"
      )
    )
  ),
  "Sale monitor" to TaskWizardDef(
    listOf(
      WizardStepDef(
        "Which stores should I watch for sales?",
        listOf("Amazon", "AliExpress", "Jumia", "Apple / Google / tech stores"),
        "Add your favorite stores"
      ),
      WizardStepDef(
        "What kind of sale should trigger an alert?",
        listOf("30%+ discount", "50%+ discount", "Lowest price in recent months", "Specific items only"),
        "Describe your sale standard"
      )
    )
  ),
  "Concert alerts" to TaskWizardDef(
    listOf(
      WizardStepDef(
        "Which artists or music genres should I watch for?",
        listOf("Specific artists", "A few favorite genres", "Any popular artists in my area"),
        "Add artist names or genres"
      ),
      WizardStepDef(
        "Which locations should count as nearby shows?",
        listOf("Dar es Salaam", "All Tanzania", "East Africa", "Other locations"),
        "Add cities or countries"
      ),
      WizardStepDef(
        "What ticket and show preferences should I use?",
        listOf("Any venue and date", "Only certain venues", "Budget limit matters"),
        "Add venues, dates, or budget"
      )
    )
  )
)

@Composable
private fun BoxScope.PreferenceWizardOverlay(viewModel: ChatViewModel) {
  val step = viewModel.preferenceWizardStep
  val wizard = TASK_WIZARDS[viewModel.wizardTaskTitle]
  // The wizard has no text field of its own, but it opens right after
  // sendMessage() while the composer below it may still hold focus with
  // the keyboard up -- without dismissing that, the keyboard sits on top
  // of (and hides) this bottom-anchored card.
  val keyboardController = LocalSoftwareKeyboardController.current
  val focusManager = LocalFocusManager.current
  LaunchedEffect(step >= 0) {
    if (step >= 0) {
      focusManager.clearFocus()
      keyboardController?.hide()
    }
  }
  AnimatedVisibility(
    visible = step >= 0 && wizard != null,
    enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
    exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
    modifier = Modifier
      .align(Alignment.BottomCenter)
      .imePadding()
      .navigationBarsPadding()
      .padding(16.dp)
  ) {
    if (wizard == null) return@AnimatedVisibility
    val lastStep = wizard.steps.size - 1
    val current = wizard.steps.getOrNull(step)
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(22.dp))
        .background(Color(0xFF1C1C1C))
        .padding(20.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = { viewModel.wizardBack() }, enabled = step > 0, modifier = Modifier.size(28.dp)) {
          Icon(
            Icons.Filled.ArrowBackIosNew,
            contentDescription = "Nyuma",
            tint = Color.White.copy(alpha = if (step > 0) 0.7f else 0.2f),
            modifier = Modifier.size(14.dp)
          )
        }
        Text(
          "${step + 1} of ${wizard.steps.size}",
          color = Color.White.copy(alpha = 0.6f),
          fontSize = 13.sp,
          modifier = Modifier.weight(1f),
          textAlign = TextAlign.Center
        )
        IconButton(onClick = { viewModel.wizardNext(lastStep) }, enabled = step < lastStep, modifier = Modifier.size(28.dp)) {
          Icon(
            Icons.Filled.ArrowForwardIos,
            contentDescription = "Mbele",
            tint = Color.White.copy(alpha = if (step < lastStep) 0.7f else 0.2f),
            modifier = Modifier.size(14.dp)
          )
        }
        Spacer(modifier = Modifier.width(6.dp))
        IconButton(onClick = { viewModel.dismissPreferenceWizard() }, modifier = Modifier.size(28.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Funga", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        }
      }
      Spacer(modifier = Modifier.height(14.dp))
      if (current != null) {
        Text(current.question, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Select all that apply", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(10.dp))
        val selections = viewModel.wizardSelections.getOrElse(step) { emptySet() }
        current.options.forEach { option ->
          WizardCheckboxRow(
            label = option,
            checked = option in selections,
            onClick = { viewModel.toggleWizardOption(step, option) }
          )
        }
        WizardSkipRow(label = current.otherLabel, onSkip = { viewModel.wizardNext(lastStep) })
      }
    }
  }
}

@Composable
private fun WizardCheckboxRow(label: String, checked: Boolean, onClick: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    WizardOptionCircle(filled = checked)
    Spacer(modifier = Modifier.width(12.dp))
    Text(label, color = Color.White, fontSize = 15.sp)
  }
  HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
}

// Plain circle indicator, matching the reference design used for every
// step regardless of task.
@Composable
private fun WizardOptionCircle(filled: Boolean) {
  Box(
    modifier = Modifier
      .size(20.dp)
      .clip(CircleShape)
      .background(if (filled) Color.White else Color.Transparent)
      .border(1.5.dp, Color.White.copy(alpha = 0.5f), CircleShape)
  )
}

// The "write your own" row is really just one more option in the same
// list -- it gets the same leading circle as every other row, plus a
// trailing Skip button since there's no real text field wired up yet.
@Composable
private fun WizardSkipRow(label: String, onSkip: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    WizardOptionCircle(filled = false)
    Spacer(modifier = Modifier.width(12.dp))
    Text(label, color = Color.White.copy(alpha = 0.7f), fontSize = 15.sp, modifier = Modifier.weight(1f))
    OutlinedButton(
      onClick = onSkip,
      colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
      border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
    ) {
      Text("Skip", fontSize = 13.sp)
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
  "deep_think" to "Deep Think",
  "document_writer" to "Document Writer",
  "sql_helper" to "SQL Helper",
  "python_helper" to "Python Helper",
  "business_assistant" to "Business Assistant",
  "ai_agent" to "AI Agent",
  "agent_team" to "Agent Team",
  "digital_twin" to "Digital Twin"
)

@Composable
private fun TwoLineMenuIcon(tint: Color) {
  // Small circular backdrop so the icon reads as a proper tappable button
  // rather than two bare lines floating on the top bar.
  Box(
    modifier = Modifier
      .size(34.dp)
      .clip(CircleShape)
      .background(tint.copy(alpha = 0.08f)),
    contentAlignment = Alignment.Center
  ) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Box(modifier = Modifier.width(20.dp).height(2.dp).background(tint))
      Box(modifier = Modifier.width(20.dp).height(2.dp).background(tint))
    }
  }
}

// Same lesson as the Gallery icon -- an evenOdd Path (even one built and
// typed correctly in code, not XML) doesn't reliably render its holes in
// this Compose version. Drawn as separate stroke/fill primitives instead:
// a lid line, a handle outline, a body outline, and two solid bars.
@Composable
private fun DeleteIcon(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier.size(22.dp)) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawLine(
      color = tint,
      start = Offset(4f * scale, 6f * scale),
      end = Offset(20f * scale, 6f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawRoundRect(
      color = tint,
      topLeft = Offset(9f * scale, 2.6f * scale),
      size = Size(6f * scale, 3.4f * scale),
      cornerRadius = CornerRadius(1.4f * scale, 1.4f * scale),
      style = Stroke(width = strokeW)
    )
    drawRoundRect(
      color = tint,
      topLeft = Offset(6.25f * scale, 6f * scale),
      size = Size(11.5f * scale, 15f * scale),
      cornerRadius = CornerRadius(2.2f * scale, 2.2f * scale),
      style = Stroke(width = strokeW)
    )
    drawLine(
      color = tint,
      start = Offset(10f * scale, 10.5f * scale),
      end = Offset(10f * scale, 17.5f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawLine(
      color = tint,
      start = Offset(14f * scale, 10.5f * scale),
      end = Offset(14f * scale, 17.5f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
  }
}

// Filter icon (pasted stroke SVG, viewBox 24x24) -- three horizontal
// lines of decreasing width and indent, the classic "filter list" glyph.
private val FILTER_LINES_PATH = PathParser().parsePathString("M3 6h18M6 12h12m-9 6h6").toPath()

@Composable
private fun FilterIconCustom(modifier: Modifier = Modifier, tint: Color = Color.White) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      drawPath(FILTER_LINES_PATH, color = tint, style = Stroke(width = 2f, cap = StrokeCap.Round))
    }
  }
}

// ic_settings.xml, ic_copy.xml, ic_extra_search.xml, ic_projects.xml,
// ic_rename.xml, ic_skills.xml and ic_speaker.xml all used
// fillType="evenOdd" to punch a hole/ring out of a filled shape, which
// doesn't reliably render as an Android VectorDrawable XML resource. The
// first pass here replaced the shapes with rough hand-drawn primitives
// instead, which lost too much fidelity to the original pasted icon and
// read as "a different icon" rather than a fix. This version instead
// parses the EXACT original path data with PathParser and draws it with
// Compose's own Path.fillType = EvenOdd -- a different rendering path
// (Skia via Canvas.drawPath) than the broken VectorDrawable XML resource
// pipeline, so it isn't guaranteed to inherit the same bug, and even if
// it does, the outer silhouette is still pixel-exact instead of guessed.
private val SETTINGS_RING_PATH = PathParser().parsePathString(
  "M11.9961,8.5C13.9289,8.5002 15.4961,10.0671 15.4961,12C15.4961,13.9329 13.9289,15.4998 11.9961,15.5C10.0631,15.5 8.49609,13.933 8.49609,12C8.49609,10.067 10.0631,8.5 11.9961,8.5ZM11.9961,10.5C11.1677,10.5 10.4961,11.1716 10.4961,12C10.4961,12.8284 11.1677,13.5 11.9961,13.5C12.8244,13.4998 13.4961,12.8283 13.4961,12C13.4961,11.1717 12.8244,10.5002 11.9961,10.5Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

private val SETTINGS_GEAR_PATH = PathParser().parsePathString(
  "M13.7529,2.19531C14.5841,3.44209 14.9507,3.84863 15.3105,4.0127C15.6318,4.1589 16.1309,4.18456 17.5527,3.85645L18.0928,3.73242L20.2637,5.90332L20.1396,6.44336C19.8114,7.86565 19.8371,8.36431 19.9834,8.68555C20.1475,9.04539 20.554,9.412 21.8008,10.2432L22.2461,10.54V13.46L21.8008,13.7568C20.554,14.588 20.1475,14.9546 19.9834,15.3145C19.8371,15.6357 19.8114,16.1344 20.1396,17.5566L20.2637,18.0967L18.0928,20.2676L17.5527,20.1436C16.1309,19.8154 15.6318,19.8411 15.3105,19.9873C14.9507,20.1514 14.5841,20.5579 13.7529,21.8047L13.4561,22.25H10.5361L10.2393,21.8047C9.40822,20.5581 9.04143,20.1515 8.68164,19.9873C8.36043,19.841 7.86148,19.8154 6.43945,20.1436L5.89941,20.2676L3.72852,18.0967L3.85254,17.5566C4.18069,16.1346 4.15505,15.6357 4.00879,15.3145C3.84473,14.9546 3.43811,14.588 2.19141,13.7568L1.74609,13.46V10.54L2.19141,10.2432C3.43811,9.41201 3.84473,9.04541 4.00879,8.68555C4.15505,8.36431 4.18069,7.86538 3.85254,6.44336L3.72852,5.90332L5.89941,3.73242L6.43945,3.85645C7.86148,4.18458 8.36043,4.15901 8.68164,4.0127C9.04143,3.84853 9.40822,3.44187 10.2393,2.19531L10.5361,1.75H13.4561L13.7529,2.19531ZM11.6035,3.75C10.967,4.68033 10.3546,5.44862 9.51172,5.83301C8.63612,6.23214 7.66631,6.15676 6.53418,5.9248L5.9209,6.53809C6.15289,7.67028 6.22819,8.63999 5.8291,9.51562C5.44486,10.3585 4.67622,10.97 3.74609,11.6064V12.3926C4.67643,13.0291 5.44479,13.6414 5.8291,14.4844C6.22808,15.3598 6.15274,16.3291 5.9209,17.4609L6.53418,18.0742C7.66623,17.8423 8.63617,17.7679 9.51172,18.167C10.3546,18.5514 10.967,19.3197 11.6035,20.25H12.3887C13.0252,19.3196 13.6375,18.5513 14.4805,18.167C15.3558,17.7681 16.3254,17.8424 17.457,18.0742L18.0703,17.4609C17.8385,16.3291 17.764,15.3598 18.1631,14.4844C18.5474,13.6414 19.3157,13.0291 20.2461,12.3926V11.6064C19.3159,10.97 18.5474,10.3585 18.1631,9.51562C17.7639,8.63999 17.8383,7.67029 18.0703,6.53809L17.457,5.9248C16.3253,6.15664 15.3558,6.23191 14.4805,5.83301C13.6375,5.44869 13.0252,4.68037 12.3887,3.75H11.6035Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

@Composable
private fun SettingsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      drawPath(SETTINGS_GEAR_PATH, color = tint)
      drawPath(SETTINGS_RING_PATH, color = tint)
    }
  }
}

// Back sheet's visible corner (top edge + rounded left corner + left
// edge) -- the front sheet below is drawn on top, so only this sliver
// needs to exist.
private val COPY_BACK_CORNER_PATH = PathParser().parsePathString("M15 3H9a4 4 0 0 0-4 4v8").toPath()

// Front sheet -- a full rounded-rect outline. The SVG built this via a
// <mask>+<use> so the back sheet's stroke wouldn't show through it, but
// masks aren't worth replicating in Canvas here since this path is
// stroke-only (no fill to mask) -- drawing it plain on top already fully
// covers that corner of the back sheet the same way.
private val COPY_FRONT_SHEET_PATH = PathParser().parsePathString(
  "M8 11.5c0-2.346 0-3.518.62-4.326a3 3 0 0 1 .554-.554C9.982 6 11.154 6 13.5 6s3.518 0 4.326.62a3 3 0 0 1 .554.554c.62.808.62 1.98.62 4.326v4c0 2.346 0 3.518-.62 4.326a3 3 0 0 1-.554.554c-.808.62-1.98.62-4.326.62s-3.518 0-4.326-.62a3 3 0 0 1-.554-.554C8 19.018 8 17.846 8 15.5z"
).toPath()

@Composable
private fun CopyIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      drawPath(COPY_BACK_CORNER_PATH, color = tint, style = Stroke(width = 2f))
      drawPath(COPY_FRONT_SHEET_PATH, color = tint, style = Stroke(width = 2f))
    }
  }
}

@Composable
fun SearchIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.8f * scale
    drawCircle(
      color = tint,
      radius = 6f * scale,
      center = Offset(10f * scale, 10f * scale),
      style = Stroke(width = strokeW)
    )
    drawLine(
      color = tint,
      start = Offset(14.6f * scale, 14.6f * scale),
      end = Offset(20f * scale, 20f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
  }
}

// Exact original path (folder outline built as fill-with-holes, nonZero)
// via PathParser -- same fix as SETTINGS_RING_PATH etc above.
private val PROJECTS_FOLDER_PATH = PathParser().parsePathString(
  "M8.33984,3.09961C9.12165,3.09969 9.88333,3.3478 10.5156,3.80762L11.793,4.73633C12.1176,4.97244 12.5087,5.09953 12.9102,5.09961H18.2002C20.2435,5.09971 21.9003,6.75651 21.9004,8.7998V17.2002C21.9003,19.2435 20.2435,20.9003 18.2002,20.9004H5.7998C3.75651,20.9003 2.09972,19.2435 2.09961,17.2002V6.7998C2.09972,4.75651 3.75651,3.09971 5.7998,3.09961H8.33984ZM3.90039,11.9004V17.2002C3.9005,18.2494 4.75062,19.0995 5.7998,19.0996H18.2002C19.2494,19.0995 20.0995,18.2494 20.0996,17.2002V11.9004H3.90039ZM5.7998,4.90039C4.75062,4.9005 3.9005,5.75062 3.90039,6.7998V10.0996H20.0996V8.7998C20.0995,7.75062 19.2494,6.9005 18.2002,6.90039H12.9102C12.1284,6.90031 11.3667,6.6522 10.7344,6.19238L9.45703,5.26367C9.13238,5.02756 8.74127,4.90047 8.33984,4.90039H5.7998Z"
).toPath()

@Composable
private fun ProjectsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      drawPath(PROJECTS_FOLDER_PATH, color = tint)
    }
  }
}

// Closer to the original two-path reference (a rounded-square document
// frame with a pencil signing across its top-right corner) than the
// first pass, which dropped the frame entirely down to a bare underline
// and read as unrecognizable.
@Composable
private fun RenameIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(2.5f * scale, 2.5f * scale),
      size = Size(16f * scale, 16f * scale),
      cornerRadius = CornerRadius(4f * scale, 4f * scale),
      style = Stroke(width = strokeW)
    )
    drawLine(
      color = tint,
      start = Offset(10.5f * scale, 13.5f * scale),
      end = Offset(18.6f * scale, 5.4f * scale),
      strokeWidth = 2.1f * scale,
      cap = StrokeCap.Round
    )
    val tip = Path().apply {
      moveTo(8.3f * scale, 15.7f * scale)
      lineTo(9.7f * scale, 11.9f * scale)
      lineTo(12.1f * scale, 14.3f * scale)
      close()
    }
    drawPath(tip, color = tint)
    drawCircle(color = tint, radius = 1.5f * scale, center = Offset(19.6f * scale, 4.4f * scale))
  }
}

// Photo frame (sun + mountain) with a pencil
// signing the top-right corner (like RenameIconCustom's pencil) -- the
// pasted reference SVG's pathData was cut off mid-coordinate with no
// closing Z, so this redraws the same "edit image" concept as primitives
// instead of using the broken/truncated path.
@Composable
private fun CreateImageIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(2.5f * scale, 4.5f * scale),
      size = Size(15.5f * scale, 15.5f * scale),
      cornerRadius = CornerRadius(3.6f * scale, 3.6f * scale),
      style = Stroke(width = strokeW)
    )
    drawCircle(color = tint, radius = 1.6f * scale, center = Offset(14.3f * scale, 8.3f * scale))
    val mountain = Path().apply {
      moveTo(5f * scale, 16f * scale)
      lineTo(9f * scale, 11.5f * scale)
      lineTo(13f * scale, 16f * scale)
      close()
    }
    drawPath(mountain, color = tint)
    // Thicker, round-capped -- the reference pencil is a rounded capsule
    // body, not a thin line; the earlier pass read as a bare stick.
    drawLine(
      color = tint,
      start = Offset(15f * scale, 15f * scale),
      end = Offset(21f * scale, 9f * scale),
      strokeWidth = 3.2f * scale,
      cap = StrokeCap.Round
    )
    val tip = Path().apply {
      moveTo(12.6f * scale, 17.4f * scale)
      lineTo(14f * scale, 13.8f * scale)
      lineTo(16.6f * scale, 16.4f * scale)
      close()
    }
    drawPath(tip, color = tint)
  }
}

// Exact original 92x92-viewport paths (2x2 grid: circle, rounded-square,
// triangle, circle, each a filled ring/donut via evenOdd) -- see the note
// above SETTINGS_RING_PATH for why this replaced the hand-drawn version.
private val SKILLS_CIRCLE_TL_PATH = PathParser().parsePathString(
  "M25.8834,10.5417C34.8811,10.5417 42.1751,17.8357 42.1751,26.8333C42.1751,35.831 34.8811,43.125 25.8834,43.125C16.8858,43.125 9.5918,35.831 9.5918,26.8333C9.5918,17.8357 16.8858,10.5417 25.8834,10.5417ZM25.8834,18.2083C21.12,18.2083 17.2584,22.0699 17.2584,26.8333C17.2584,31.5968 21.12,35.4583 25.8834,35.4583C30.6469,35.4583 34.5084,31.5968 34.5084,26.8333C34.5084,22.0699 30.6469,18.2083 25.8834,18.2083Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

private val SKILLS_SQUARE_BL_PATH = PathParser().parsePathString(
  "M30.0948,48.875C36.4458,48.8754 41.5948,54.024 41.5948,60.375V68.8091C41.5944,75.1598 36.4455,80.3087 30.0948,80.3091H21.6608C15.3097,80.3091 10.1612,75.16 10.1608,68.8091V60.375C10.1608,54.0237 15.3095,48.875 21.6608,48.875H30.0948ZM21.6608,56.5417C19.5437,56.5417 17.8274,58.2579 17.8274,60.375V68.8091C17.8278,70.9258 19.5439,72.6424 21.6608,72.6424H30.0948C32.2113,72.642 33.9278,70.9256 33.9282,68.8091V60.375C33.9282,58.2582 32.2116,56.5421 30.0948,56.5417Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

private val SKILLS_TRIANGLE_TR_PATH = PathParser().parsePathString(
  "M59.4101,14.8242C62.3208,9.5189 69.9461,9.5189 72.8567,14.8242L82.1481,31.771C84.9503,36.88 81.2554,43.1244 75.4285,43.125H56.8383C51.0115,43.1244 47.3165,36.88 50.1188,31.771L59.4101,14.8242ZM56.8383,35.4583H75.4285L66.1334,18.5116L56.8383,35.4583Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

private val SKILLS_CIRCLE_BR_PATH = PathParser().parsePathString(
  "M66.1334,48.875C75.1311,48.875 82.4251,56.169 82.4251,65.1667C82.4251,74.1643 75.1311,81.4583 66.1334,81.4583C57.1358,81.4583 49.8418,74.1643 49.8418,65.1667C49.8418,56.169 57.1358,48.875 66.1334,48.875ZM66.1334,56.5417C61.37,56.5417 57.5084,60.4032 57.5084,65.1667C57.5084,69.9301 61.37,73.7917 66.1334,73.7917C70.8969,73.7917 74.7584,69.9301 74.7584,65.1667C74.7584,60.4032 70.8969,56.5417 66.1334,56.5417Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

@Composable
private fun SkillsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 92f, pivot = Offset.Zero) {
      drawPath(SKILLS_CIRCLE_TL_PATH, color = tint)
      drawPath(SKILLS_SQUARE_BL_PATH, color = tint)
      drawPath(SKILLS_TRIANGLE_TR_PATH, color = tint)
      drawPath(SKILLS_CIRCLE_BR_PATH, color = tint)
    }
  }
}

// Exact original 91x91-viewport paths -- same lesson as SETTINGS_RING_PATH
// above: the hand-drawn version (box + stroked arcs) read as a different
// icon. The two sound-wave arcs turn out to each be a single closed loop
// (crescent band, start curve out - straight edge in - end curve back -
// straight edge close), so they need no special fillType at all despite
// being marked nonZero in the source; only the speaker body has a real
// hole (mic box + cone outline, via evenOdd).
private val SPEAKER_BODY_PATH = PathParser().parsePathString(
  "M53.6667,84.3333H44.6561L43.6042,83.4948L25.4857,69H17.25C9.84018,69 3.83334,62.9931 3.83334,55.5833V36.4167C3.83334,29.0068 9.84019,23 17.25,23H25.4857L43.6042,8.50521L44.6561,7.66666H53.6667V84.3333ZM29.2292,29.8281L28.1772,30.6667H17.25C14.0744,30.6667 11.5,33.241 11.5,36.4167V55.5833C11.5,58.759 14.0744,61.3333 17.25,61.3333H28.1772L29.2292,62.1719L46,75.5885V16.4115L29.2292,29.8281Z"
).toPath().apply { fillType = PathFillType.EvenOdd }

private val SPEAKER_ARC_OUTER_PATH = PathParser().parsePathString(
  "M79.8,19.541C85.0703,27.0251 88.1667,36.1576 88.1667,46C88.1667,55.8424 85.0703,64.9749 79.8,72.459L73.5334,68.0417C77.9229,61.8077 80.5,54.2106 80.5,46C80.5,37.7895 77.9229,30.1923 73.5334,23.9583L79.8,19.541Z"
).toPath()

private val SPEAKER_ARC_INNER_PATH = PathParser().parsePathString(
  "M67.3342,28.473C70.8,33.4418 72.8333,39.4895 72.8333,46C72.8333,52.5105 70.8,58.5582 67.3342,63.527L61.0451,59.1396C63.6425,55.4158 65.1667,50.8917 65.1667,46C65.1667,41.1083 63.6425,36.5842 61.0451,32.8603L67.3342,28.473Z"
).toPath()

@Composable
private fun SpeakerIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 91f, pivot = Offset.Zero) {
      drawPath(SPEAKER_BODY_PATH, color = tint)
      drawPath(SPEAKER_ARC_OUTER_PATH, color = tint)
      drawPath(SPEAKER_ARC_INNER_PATH, color = tint)
    }
  }
}

// Rewards gift-box icon (pasted stroke SVG, viewBox 24x24) -- a rounded
// rect for the lid band, a vertical stem, a U-shaped box body, and two
// curved ribbon loops, all stroked instead of filled.
private val REWARDS_STEM_PATH = PathParser().parsePathString("M12 8v13").toPath()
private val REWARDS_BODY_PATH = PathParser().parsePathString("M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7").toPath()
private val REWARDS_RIBBON_LEFT_PATH = PathParser().parsePathString("M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8").toPath()
private val REWARDS_RIBBON_RIGHT_PATH = PathParser().parsePathString("M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8").toPath()

@Composable
private fun RewardsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      val stroke = Stroke(width = 1.5f, cap = StrokeCap.Round, join = StrokeJoin.Round)
      drawRoundRect(
        color = tint,
        topLeft = Offset(3f, 8f),
        size = Size(18f, 4f),
        cornerRadius = CornerRadius(1f, 1f),
        style = stroke
      )
      drawPath(REWARDS_STEM_PATH, color = tint, style = stroke)
      drawPath(REWARDS_BODY_PATH, color = tint, style = stroke)
      drawPath(REWARDS_RIBBON_LEFT_PATH, color = tint, style = stroke)
      drawPath(REWARDS_RIBBON_RIGHT_PATH, color = tint, style = stroke)
    }
  }
}

// Profile Hub's own top-bar settings icon (pasted stroke SVG, viewBox
// 24x24) -- a hexagon "nut" outline with a center circle. Deliberately
// only used at this one call site, not a global replacement of every
// gear/settings icon elsewhere in the app.
private val SETTINGS_HEX_PATH = PathParser().parsePathString("M12 2l8.66 5v10L12 22l-8.66-5V7z").toPath()

@Composable
private fun SettingsHexIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      val stroke = Stroke(width = 1.5f, cap = StrokeCap.Round, join = StrokeJoin.Round)
      drawPath(SETTINGS_HEX_PATH, color = tint, style = stroke)
      drawCircle(color = tint, radius = 3f, center = Offset(12f, 12f), style = stroke)
    }
  }
}

// Profile Hub's top-bar "share" icon (pasted stroke SVG, viewBox
// 164x102) -- a person-badge bracket (open right side, head circle,
// shoulder curve) with a left/right double-arrow swap glyph, replacing
// the generic Share icon. The pasted viewBox has a lot of empty margin
// around the actual glyph (it only occupies roughly x:53-113, y:27-89),
// so this translates that content to the origin before scaling instead
// of scaling the full 164x102 box, or the glyph would render tiny and
// off-center.
private val SHARE_BRACKET_LEFT_PATH = PathParser().parsePathString("M78.5 27.5H67C58.7 27.5 53 33.2 53 42V70C53 78.8 58.7 84.5 67 84.5H78.5").toPath()
private val SHARE_BRACKET_RIGHT_PATH = PathParser().parsePathString("M109 59V42C109 33.2 103.3 27.5 95 27.5H78.5").toPath()
private val SHARE_SHOULDER_PATH = PathParser().parsePathString("M65.2 69.7C67.4 62.9 73.4 59.1 81.4 59.1C87.8 59.1 92.7 61.5 96.5 65.8").toPath()
private val SHARE_ARROW_RIGHT_LINE_PATH = PathParser().parsePathString("M89.2 66.2H112.7").toPath()
private val SHARE_ARROW_RIGHT_HEAD_PATH = PathParser().parsePathString("M103.3 57.5L112.7 66.2L103.3 74.9").toPath()
private val SHARE_ARROW_LEFT_LINE_PATH = PathParser().parsePathString("M112.7 80.1H89.2").toPath()
private val SHARE_ARROW_LEFT_HEAD_PATH = PathParser().parsePathString("M98.6 71.4L89.2 80.1L98.6 88.8").toPath()

@Composable
private fun ProfileSwitchIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 60f, pivot = Offset.Zero) {
      translate(left = -53f, top = -27.5f) {
        val strokeThin = Stroke(width = 5.8f, cap = StrokeCap.Round, join = StrokeJoin.Round)
        val strokeThick = Stroke(width = 6f, cap = StrokeCap.Round, join = StrokeJoin.Round)
        drawPath(SHARE_BRACKET_LEFT_PATH, color = tint, style = strokeThin)
        drawPath(SHARE_BRACKET_RIGHT_PATH, color = tint, style = strokeThin)
        drawCircle(color = tint, radius = 8.9f, center = Offset(81.5f, 48.8f), style = strokeThin)
        drawPath(SHARE_SHOULDER_PATH, color = tint, style = strokeThin)
        drawPath(SHARE_ARROW_RIGHT_LINE_PATH, color = tint, style = strokeThick)
        drawPath(SHARE_ARROW_RIGHT_HEAD_PATH, color = tint, style = strokeThick)
        drawPath(SHARE_ARROW_LEFT_LINE_PATH, color = tint, style = strokeThick)
        drawPath(SHARE_ARROW_LEFT_HEAD_PATH, color = tint, style = strokeThick)
      }
    }
  }
}

// Invite Friends icon (pasted stroke SVG, viewBox 24x24) -- one person
// (head circle + open shoulder arc) with a "+" cross and a "$" glyph
// near the bottom-right, matching the user's corrected reference (a
// single person, not two).
private val INVITE_BODY_PATH = PathParser().parsePathString("M2 21v-1a6 6 0 0 1 6-6h2").toPath()
private val INVITE_PLUS_V_PATH = PathParser().parsePathString("M20 15v6").toPath()
private val INVITE_PLUS_H_PATH = PathParser().parsePathString("M17 18h6").toPath()

@Composable
private fun InviteFriendsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      val stroke = Stroke(width = 1.5f, cap = StrokeCap.Round, join = StrokeJoin.Round)
      drawCircle(color = tint, radius = 4f, center = Offset(10f, 7f), style = stroke)
      drawPath(INVITE_BODY_PATH, color = tint, style = stroke)
      drawPath(INVITE_PLUS_V_PATH, color = tint, style = stroke)
      drawPath(INVITE_PLUS_H_PATH, color = tint, style = stroke)
      // The original SVG's "$" is a <text> glyph, not a path -- drawn
      // the same way here via the underlying native Canvas, at the
      // same raw viewBox coordinates, inside this same scale() block
      // so it scales together with everything else.
      drawContext.canvas.nativeCanvas.drawText(
        "$",
        17f,
        21f,
        Paint().apply {
          color = tint.toArgb()
          textSize = 8f
          isFakeBoldText = true
          isAntiAlias = true
        }
      )
    }
  }
}

// "Arranged" briefcase icon (pasted stroke SVG, viewBox 24x24) -- one
// combined path: a closed rounded-rect body, two short diagonal handle
// straps, and a horizontal divider line, all stroked rather than filled.
private val ARRANGED_PATH = PathParser().parsePathString(
  "M2 9.667C2 6.26 4.686 3.5 8 3.5h8c3.314 0 6 2.76 6 6.167v6.166C22 19.24 19.314 22 16 22H8c-3.314 0-6-2.76-6-6.167z" +
    "M8 5L7 2m9 3l1-3m4.5 7h-19"
).toPath()

@Composable
private fun ArrangedIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    scale(size.width / 24f, pivot = Offset.Zero) {
      drawPath(ARRANGED_PATH, color = tint, style = Stroke(width = 2f, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
  }
}

// ic_widgets.xml and ic_kids_mode.xml (both pasted by the user, both never
// visually confirmed) relied on a second subpath inside the same <path> to
// punch a hole -- the exact pattern that silently rendered solid instead of
// hollow for every other icon in this file that tried it, evenOdd or not.
// Redrawn as primitives so there's nothing left to trust blindly.
@Composable
private fun WidgetsIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.8f * scale
    drawRoundRect(
      color = tint,
      topLeft = Offset(2.5f * scale, 2.5f * scale),
      size = Size(19f * scale, 19f * scale),
      cornerRadius = CornerRadius(5.5f * scale, 5.5f * scale),
      style = Stroke(width = strokeW)
    )
    drawRoundRect(
      color = tint,
      topLeft = Offset(8f * scale, 8f * scale),
      size = Size(3.5f * scale, 3.5f * scale),
      cornerRadius = CornerRadius(1f * scale, 1f * scale)
    )
    drawRoundRect(
      color = tint,
      topLeft = Offset(8f * scale, 13.5f * scale),
      size = Size(8f * scale, 2.5f * scale),
      cornerRadius = CornerRadius(1f * scale, 1f * scale)
    )
  }
}

@Composable
private fun KidsModeIconCustom(tint: Color, modifier: Modifier = Modifier) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.7f * scale
    drawCircle(
      color = tint,
      radius = 9f * scale,
      center = Offset(12f * scale, 11.5f * scale),
      style = Stroke(width = strokeW)
    )
    drawCircle(color = tint, radius = 1.1f * scale, center = Offset(8.6f * scale, 10.5f * scale))
    drawCircle(color = tint, radius = 1.1f * scale, center = Offset(15.4f * scale, 10.5f * scale))
    drawArc(
      color = tint,
      startAngle = 20f,
      sweepAngle = 140f,
      useCenter = false,
      topLeft = Offset(7.5f * scale, 11.5f * scale),
      size = Size(9f * scale, 7f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round)
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
  val premiumTts = remember { PremiumTtsPlayer(context) }
  val haptic = LocalHapticFeedback.current
  var speakingMessageId by remember { mutableStateOf<String?>(null) }
  // Only Premium Voice's MediaPlayer-backed audio supports scrubbing -- the
  // free on-device engine has no seek API at all, so the floating now-
  // playing bar's slider only appears for a Premium Voice utterance.
  var speakingViaPremium by remember { mutableStateOf(false) }
  var speakingText by remember { mutableStateOf("") }
  var chatMenuOpen by remember { mutableStateOf(false) }
  var chatDeleteConfirm by remember { mutableStateOf(false) }
  var findInChatOpen by remember { mutableStateOf(false) }
  var findInChatQuery by remember { mutableStateOf("") }
  // Moved up from further down so the top bar's 3-dot icon (below) can
  // reference it directly -- the menu now anchors to that icon instead
  // of being a bottom sheet unrelated to where it was tapped from.
  val activeConversation = viewModel.conversations.find { it.id == viewModel.activeConversationId }
  DisposableEffect(Unit) {
    tts.onDone = { speakingMessageId = null }
    onDispose {
      tts.shutdown()
      premiumTts.stop()
    }
  }

  // Premium Voice (real OpenAI audio) falls back to the free on-device
  // engine on any failure -- network error, not signed in, etc. -- rather
  // than going silent, since the user still expects something to happen.
  fun speakMessage(id: String, text: String) {
    speakingMessageId = id
    speakingText = text
    speakingViaPremium = false
    if (viewModel.premiumChatVoiceEnabled) {
      viewModel.fetchPremiumSpeech(text) { bytes ->
        if (bytes != null) {
          speakingViaPremium = true
          premiumTts.play(
            bytes,
            onDone = { if (speakingMessageId == id) { speakingMessageId = null; speakingViaPremium = false } },
            onError = { speakingViaPremium = false; tts.speak(text) }
          )
        } else {
          tts.speak(text)
        }
      }
    } else {
      tts.speak(text)
    }
  }

  fun stopSpeakingNow() {
    tts.stop()
    premiumTts.stop()
    speakingMessageId = null
    speakingViaPremium = false
  }

  fun toggleSpeak(message: UiMessage) {
    if (speakingMessageId == message.id) {
      stopSpeakingNow()
    } else {
      speakMessage(message.id, stripSourceMarkers(message.content))
    }
  }

  // Keyed on the last message's own length too, not just the list size --
  // scrolling only on size change meant a streaming reply that grew past
  // the viewport stayed pinned to where it scrolled when the message was
  // still short, leaving its later lines below the fold looking like they
  // were being hidden behind the composer. scrollBy with a large value is
  // clamped to the true end of content, so it's a safe way to always
  // reach the real bottom regardless of how tall the message has grown.
  LaunchedEffect(viewModel.messages.size, viewModel.messages.lastOrNull()?.content?.length) {
    if (viewModel.messages.isNotEmpty()) {
      listState.scrollToItem(viewModel.messages.size - 1)
      listState.scrollBy(100000f)
    }
  }

  LaunchedEffect(viewModel.sending, viewModel.autoSpeakNextReply) {
    if (!viewModel.sending && viewModel.autoSpeakNextReply) {
      val lastAssistant = viewModel.messages.lastOrNull { it.role == "assistant" }
      if (lastAssistant != null && lastAssistant.content.isNotBlank()) {
        speakMessage(lastAssistant.id, lastAssistant.content)
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

  Box(modifier = Modifier.fillMaxSize()) {
  Scaffold(
    topBar = {
      // Fully transparent all the way up, including the true status-bar
      // strip (clock/battery) -- scrolled messages read crisply through
      // the entire top bar, with only the hamburger/Ask-Extra/New Chat/
      // dots icons and text sitting visibly on top of the passing content.
      CenterAlignedTopAppBar(
        modifier = Modifier.statusBarsPadding(),
        windowInsets = WindowInsets(0, 0, 0, 0),
        title = {
          // Blank home state has no tabs to switch between yet -- they
          // only make sense once an actual conversation is underway.
          if (viewModel.messages.isNotEmpty()) {
            AskImagineTabs(current = "Ask", onAsk = {}, onImagine = { viewModel.openChatGizaMedia() })
          }
        },
        navigationIcon = {
          IconButton(onClick = { viewModel.openHistory() }) {
            TwoLineMenuIcon(tint = colorScheme.onBackground)
          }
        },
        actions = {
          if (viewModel.messages.isEmpty()) {
            // Blank home state, before anything's been sent -- matches the
            // reference's single standalone icon instead of the New Chat +
            // menu pill, since there's no conversation yet to manage.
            Box(
              modifier = Modifier
                .padding(end = 12.dp)
                .size(40.dp)
                .clip(CircleShape)
                .background(colorScheme.onBackground.copy(alpha = 0.12f))
                .clickable(onClick = { viewModel.newChat() }),
              contentAlignment = Alignment.Center
            ) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_new_chat_bubble),
                contentDescription = "New chat",
                tint = colorScheme.onBackground,
                modifier = Modifier.size(20.dp)
              )
            }
          } else {
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
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_compose),
                contentDescription = null,
                tint = colorScheme.onBackground,
                modifier = Modifier.size(22.dp)
              )
            }
            Box(
              modifier = Modifier.size(40.dp).clickable(onClick = { chatMenuOpen = true }),
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Filled.MoreVert, contentDescription = "Conversation menu", tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
              if (chatMenuOpen) {
                ChatConversationMenuSheet(
                  title = activeConversation?.title ?: "New chat",
                  pinned = activeConversation?.pinned ?: false,
                  onDismiss = { chatMenuOpen = false },
                  onShare = {
                    val transcript = viewModel.messages.joinToString("\n\n") { m -> "${if (m.role == "user") "You" else "ChatGiZa"}: ${m.content}" }
                    val intent = Intent(Intent.ACTION_SEND).apply {
                      type = "text/plain"
                      putExtra(Intent.EXTRA_TEXT, transcript)
                    }
                    context.startActivity(Intent.createChooser(intent, null))
                  },
                  onTogglePin = { activeConversation?.let { viewModel.togglePin(it.id) } },
                  onFindInChat = { findInChatOpen = true },
                  onDelete = { chatDeleteConfirm = true },
                  onComingSoon = { label -> Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show() }
                )
              }
            }
          }
          }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
      )
    },
    containerColor = Color(0xFF000000),
    contentWindowInsets = WindowInsets(0, 0, 0, 0)
  ) { padding ->
    // A transparent top bar used to let scrolled-up message text show
    // through the empty space around its icons before the text ever
    // reached the bar's own edge -- an opaque bar (same solid color as
    // the screen) hides content exactly at its boundary, every time.
    Column(
      modifier = Modifier
        .fillMaxSize()
        .navigationBarsPadding()
        .imePadding()
    ) {
      // Reached via the top bar's "..." menu -- filters to matching
      // messages instead of scroll-to-highlight, same approach the History
      // and ChatGiZa Media search boxes already use elsewhere in the app.
      if (findInChatOpen) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .fillMaxWidth()
            .padding(top = padding.calculateTopPadding())
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .height(38.dp)
            .clip(RoundedCornerShape(19.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.08f))
            .padding(horizontal = 12.dp)
        ) {
          Icon(Icons.Outlined.Search, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Box(modifier = Modifier.weight(1f)) {
            if (findInChatQuery.isEmpty()) {
              Text("Find in chat", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
            }
            BasicTextField(
              value = findInChatQuery,
              onValueChange = { findInChatQuery = it },
              singleLine = true,
              textStyle = androidx.compose.ui.text.TextStyle(color = colorScheme.onBackground, fontSize = 13.sp),
              cursorBrush = SolidColor(colorScheme.onBackground),
              modifier = Modifier.fillMaxWidth()
            )
          }
          Icon(
            Icons.Outlined.Close,
            contentDescription = "Close search",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(16.dp).clickable { findInChatOpen = false; findInChatQuery = "" }
          )
        }
      }
      val displayedMessages = remember(viewModel.messages, findInChatOpen, findInChatQuery) {
        if (!findInChatOpen || findInChatQuery.isBlank()) viewModel.messages
        else viewModel.messages.filter { it.content.contains(findInChatQuery, ignoreCase = true) }
      }
      Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
        if (displayedMessages.isEmpty()) {
          Box(modifier = Modifier.fillMaxSize().padding(top = if (findInChatOpen) 0.dp else padding.calculateTopPadding())) {
            if (findInChatOpen && findInChatQuery.isNotBlank()) {
              Text(
                "No matches.",
                color = colorScheme.onBackground.copy(alpha = 0.5f),
                fontSize = 14.sp,
                modifier = Modifier.align(Alignment.Center)
              )
            }
          }
        } else {
          LazyColumn(
            state = listState,
            // A colored box painted on top made it look like a background
            // was covering the text (rejected) -- this instead masks the
            // list's own alpha with BlendMode.DstIn, so the text itself
            // becomes transparent as it nears the bar, with nothing
            // painted over it. The fade must not reach past the bar's own
            // real footprint (statusBar + app bar height) -- a fixed 420dp
            // faded a large chunk of visible chat content, reading as a
            // dark smear over legible text instead of a soft edge hugging
            // the transparent bar, so this now tracks the bar's actual
            // measured height instead of a guessed constant.
            modifier = Modifier
              .fillMaxSize()
              .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
              .drawWithContent {
                drawContent()
                drawRect(
                  brush = Brush.verticalGradient(
                    colors = listOf(Color.Transparent, Color.Black),
                    startY = 0f,
                    endY = padding.calculateTopPadding().toPx()
                  ),
                  blendMode = BlendMode.DstIn
                )
              },
            contentPadding = PaddingValues(
              start = 4.dp,
              end = 4.dp,
              // No extra buffer here -- same reasoning as the composer's
              // own bottom padding: content should scroll all the way up
              // to the bar's true edge, with the opaque bar itself (not
              // a padding gap) being what hides it from there.
              top = if (findInChatOpen) 12.dp else padding.calculateTopPadding(),
              // The composer now floats on top of this list instead of
              // sitting below it -- this reserves enough room for the
              // last message to scroll up from underneath it, the same
              // way the reference app's chat does.
              bottom = 110.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
          ) {
            items(displayedMessages, key = { it.id }) { message ->
              val isStreamingThis = viewModel.sending && message.id == viewModel.messages.lastOrNull()?.id
              MessageBubble(
                message = message,
                showActions = !isStreamingThis,
                isSpeaking = speakingMessageId == message.id,
                chatGizaMediaConnected = viewModel.chatGizaMediaConnected,
                extraAuthorName = viewModel.userName ?: "You",
                extraAuthorImage = viewModel.userImage,
                onSpeakToggle = { toggleSpeak(message) },
                onRegenerate = { viewModel.regenerateMessage(message.id) },
                onDelete = { viewModel.deleteMessage(message.id) },
                onPushToExtra = { caption, destination, onDone ->
                  val pushContent = stripSourceMarkers(message.content)
                  val finalText = if (caption.isNullOrBlank()) pushContent else "$pushContent\n\n$caption"
                  viewModel.pushReplyToExtraMedia(finalText, destination, onDone)
                }
              )
            }
          }
        }
        // The composer floats on top of this Box now instead of sitting
        // below the list as a separate sequential element -- the last
        // message scrolls up from underneath it, and the composer's own
        // low-alpha background lets that content show through rather than
        // stopping short in a gap above it. This wrapper itself must stay
        // transparent above the card -- an earlier pass put a solid
        // background on this whole Column, which also painted over the
        // card's own top inset and hid the last message right where it
        // should still be visible scrolling up to meet the composer.
        Column(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()) {
          if (viewModel.errorMessage != null) {
            Text(
              viewModel.errorMessage ?: "",
              color = Color(0xFFFF6B6B),
              fontSize = 12.sp,
              modifier = Modifier.padding(horizontal = 16.dp)
            )
          }
          // Sits directly above the composer instead of floating near the
          // status bar -- reads as part of the same input area the user is
          // already looking at, instead of a separate overlay competing
          // with the top bar and scrolled message content.
          if (speakingMessageId != null) {
            NowPlayingBar(
              isPremium = speakingViaPremium,
              player = premiumTts,
              onClose = { stopSpeakingNow() }
            )
          }
          ChatComposerCard(viewModel)
          // Only this strip below the card -- not the space above it --
          // needs to be opaque: it's the small gap down to the
          // keyboard/nav bar, and must hide the message list rather than
          // let it show through.
          Spacer(
            modifier = Modifier
              .fillMaxWidth()
              .height(6.dp)
              .background(Color(0xFF000000))
          )
        }
      }
    }
  }

  if (chatDeleteConfirm) {
    val target = activeConversation
    AlertDialog(
      onDismissRequest = { chatDeleteConfirm = false },
      title = { Text("Delete conversation?") },
      text = { Text("This conversation will be deleted from your account. This action can't be undone.") },
      confirmButton = {
        TextButton(onClick = {
          target?.let { viewModel.deleteConversation(it.id) }
          chatDeleteConfirm = false
        }) {
          Text("Delete", color = Color(0xFFFF6B6B), fontWeight = FontWeight.Bold)
        }
      },
      dismissButton = {
        TextButton(onClick = { chatDeleteConfirm = false }) {
          Text("Cancel", fontWeight = FontWeight.Bold)
        }
      }
    )
  }
  }
}

// Floating audio bar shown while a message is being read aloud, docked
// right above the composer: play/pause, -10s, +10s, a tap-to-cycle speed
// pill, and elapsed/total time. Rewind/forward/speed only appear for
// Premium Voice -- Android's on-device TextToSpeech has no seek or rate-
// while-speaking API at all, so the free-engine fallback just gets a
// static bar with play/pause and a stop (close) button.
private val PLAYBACK_SPEEDS = listOf(1f, 1.25f, 1.5f, 1.75f, 2f)

@Composable
private fun NowPlayingBar(isPremium: Boolean, player: PremiumTtsPlayer, onClose: () -> Unit) {
  var positionMs by remember { mutableStateOf(0) }
  var durationMs by remember { mutableStateOf(0) }
  var playing by remember { mutableStateOf(true) }
  var speedIndex by remember { mutableStateOf(0) }

  LaunchedEffect(isPremium) {
    if (!isPremium) return@LaunchedEffect
    while (true) {
      positionMs = player.currentPositionMs()
      durationMs = player.durationMs()
      playing = player.isCurrentlyPlaying()
      delay(200)
    }
  }

  fun formatTime(ms: Int): String {
    val totalSeconds = ms / 1000
    val m = totalSeconds / 60
    val s = totalSeconds % 60
    return "%d:%02d".format(m, s)
  }

  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(horizontal = 16.dp)
      .padding(bottom = 8.dp)
      .height(52.dp)
      .clip(RoundedCornerShape(percent = 50))
      .background(Color(0xFF1F1F1F))
      .padding(horizontal = 10.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier
        .size(36.dp)
        .clip(CircleShape)
        .background(Color.White)
        .let {
          if (isPremium) it.clickable {
            if (playing) player.pause() else player.resume()
            playing = !playing
          } else it
        },
      contentAlignment = Alignment.Center
    ) {
      Icon(
        if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
        contentDescription = if (playing) "Pause" else "Play",
        tint = Color.Black,
        modifier = Modifier.size(18.dp)
      )
    }
    if (isPremium) {
      Spacer(modifier = Modifier.width(4.dp))
      Icon(
        Icons.Filled.Replay10,
        contentDescription = "Rewind 10 seconds",
        tint = Color.White,
        modifier = Modifier
          .size(28.dp)
          .clickable { player.seekTo((positionMs - 10_000).coerceAtLeast(0)) }
      )
      Spacer(modifier = Modifier.width(2.dp))
      Icon(
        Icons.Filled.Forward10,
        contentDescription = "Forward 10 seconds",
        tint = Color.White,
        modifier = Modifier
          .size(28.dp)
          .clickable { player.seekTo((positionMs + 10_000).coerceAtMost(durationMs)) }
      )
      Spacer(modifier = Modifier.width(6.dp))
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(percent = 50))
          .background(Color.White.copy(alpha = 0.12f))
          .clickable {
            speedIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.size
            player.setSpeed(PLAYBACK_SPEEDS[speedIndex])
          }
          .padding(horizontal = 8.dp, vertical = 4.dp)
      ) {
        Text("${PLAYBACK_SPEEDS[speedIndex]}x", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
      }
    }
    Spacer(modifier = Modifier.weight(1f))
    Text(
      if (durationMs > 0) "${formatTime(positionMs)} / ${formatTime(durationMs)}" else formatTime(positionMs),
      color = Color.White,
      fontSize = 12.sp
    )
    Spacer(modifier = Modifier.width(10.dp))
    Icon(
      Icons.Filled.Close,
      contentDescription = "Stop",
      tint = Color.White.copy(alpha = 0.7f),
      modifier = Modifier.size(20.dp).clickable(onClick = onClose)
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatConversationMenuSheet(
  title: String,
  pinned: Boolean,
  onDismiss: () -> Unit,
  onShare: () -> Unit,
  onTogglePin: () -> Unit,
  onFindInChat: () -> Unit,
  onDelete: () -> Unit,
  onComingSoon: (String) -> Unit
) {
  // A DropdownMenu anchored at the 3-dot icon itself instead of a
  // ModalBottomSheet -- a bottom sheet is a separate full-width surface
  // that always slides up from the bottom of the screen regardless of
  // where you tapped; this now opens right where the icon is, at the
  // top, sized to its content instead of stretching edge to edge.
  // Fixed width -- without one, the popup auto-sized to its widest
  // child's intrinsic width, and the only child without fillMaxWidth()
  // was the conversation title, so a short title opened a small menu
  // and a long one opened a much wider menu.
  DropdownMenu(
    expanded = true,
    onDismissRequest = onDismiss,
    modifier = Modifier.width(240.dp),
    shape = RoundedCornerShape(24.dp),
    containerColor = Color(0xFF202020),
    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2A2A2A))
  ) {
    Text(
      title,
      color = Color.White.copy(alpha = 0.5f),
      fontSize = 13.sp,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
    )
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_share), contentDescription = null, tint = Color.White) }, label = "Share") {
      onDismiss(); onShare()
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_pin), contentDescription = null, tint = Color.White) }, label = if (pinned) "Unpin" else "Pin") {
      onDismiss(); onTogglePin()
    }
    ChatMenuRow(
      icon = { ProjectsIconCustom(tint = Color.White, modifier = Modifier.size(20.dp)) },
      label = "Add to project",
      trailing = { Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White.copy(alpha = 0.4f), modifier = Modifier.size(20.dp)) }
    ) { onDismiss(); onComingSoon("Add to project") }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_find_in_chat), contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }, label = "Find in chat") {
      onDismiss(); onFindInChat()
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_home), contentDescription = null, tint = Color.White) }, label = "Add to home") {
      onDismiss(); onComingSoon("Add to home")
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_archive), contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }, label = "Archive") {
      onDismiss(); onComingSoon("Archive")
    }
    ChatMenuRow(icon = { DeleteIcon(tint = Color(0xFFFF6B6B)) }, label = "Delete", tint = Color(0xFFFF6B6B)) {
      onDismiss(); onDelete()
    }
  }
}

@Composable
private fun ChatMenuRow(
  icon: @Composable () -> Unit,
  label: String,
  tint: Color = Color.White,
  trailing: (@Composable () -> Unit)? = null,
  onClick: () -> Unit
) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp)
  ) {
    // 16dp matches the title row's own inset above -- the reference
    // menu keeps a small, consistent gap between the card edge and the
    // icon column, not flush against it.
    Box(modifier = Modifier.offset(y = 3.dp)) { icon() }
    Spacer(modifier = Modifier.size(16.dp))
    Text(label, color = tint, fontSize = 16.sp, modifier = Modifier.weight(1f))
    trailing?.invoke()
  }
}

@Composable
private fun ChatComposerCard(viewModel: ChatViewModel) {
  var toolMenuOpen by remember { mutableStateOf(false) }
  val haptic = LocalHapticFeedback.current
  fun tapHaptic() {
    if (viewModel.hapticsEnabled && viewModel.hapticsOnPress) {
      haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }
  }

  // Reuses the same URI->data-URL helper ChatGiZa Media's post composer
  // already relies on (bounds-first decode + downscale, see
  // uriToPostImageDataUrl) rather than a second copy of that logic.
  val context = LocalContext.current
  val composerScope = rememberCoroutineScope()
  var attachError by remember { mutableStateOf(false) }
  var attachMenuOpen by remember { mutableStateOf(false) }

  fun attachPickedImage(uri: Uri) {
    attachError = false
    composerScope.launch {
      val dataUrl = withContext(Dispatchers.IO) { uriToPostImageDataUrl(context, uri) }
      if (dataUrl != null) {
        viewModel.setAttachedImage(uri, dataUrl)
      } else {
        attachError = true
      }
    }
  }

  val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) attachPickedImage(uri)
  }

  fun attachPickedFile(uri: Uri) {
    attachError = false
    composerScope.launch {
      val name = withContext(Dispatchers.IO) { queryFileDisplayName(context, uri) }
      val file = withContext(Dispatchers.IO) { readAttachedFile(context, uri, name) }
      if (file != null) {
        viewModel.updateAttachedFile(file)
      } else {
        attachError = true
      }
    }
  }

  val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) attachPickedFile(uri)
  }

  var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
  val cameraCapture = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
    val uri = pendingCameraUri
    if (success && uri != null) attachPickedImage(uri)
  }
  var hasCameraPermission by remember {
    mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
  }
  fun launchCamera() {
    val photoFile = File(context.cacheDir, "composer_camera_${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", photoFile)
    pendingCameraUri = uri
    cameraCapture.launch(uri)
  }
  val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasCameraPermission = granted
    if (granted) launchCamera()
  }

  // In-app voice typing -- SpeechRecognizer.startListening(), not the
  // ACTION_RECOGNIZE_SPEECH Activity (a separate full-screen dialog that
  // didn't match what was wanted). Live partial results stream into the
  // composer as the user talks, with an X to cancel and a check to stop
  // and keep what was heard -- the same shape as the keyboard's own
  // inline voice row, just driven by the app's own mic button.
  var isListening by remember { mutableStateOf(false) }
  var listeningPreview by remember { mutableStateOf("") }
  val inputBeforeListening = remember { mutableStateOf("") }
  var hasMicPermission by remember {
    mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
  }
  val speechRecognizer = remember {
    if (SpeechRecognizer.isRecognitionAvailable(context)) SpeechRecognizer.createSpeechRecognizer(context) else null
  }
  DisposableEffect(speechRecognizer) {
    onDispose { speechRecognizer?.destroy() }
  }

  fun applyTranscript(text: String) {
    if (text.isNotBlank()) {
      val base = inputBeforeListening.value
      viewModel.onInputChange(if (base.isBlank()) text else "$base $text")
    }
  }

  fun stopListening(keepResult: Boolean) {
    isListening = false
    listeningPreview = ""
    runCatching { if (keepResult) speechRecognizer?.stopListening() else speechRecognizer?.cancel() }
  }

  fun startListening() {
    val recognizer = speechRecognizer ?: return
    inputBeforeListening.value = viewModel.input
    listeningPreview = ""
    recognizer.setRecognitionListener(object : RecognitionListener {
      override fun onReadyForSpeech(params: Bundle?) {}
      override fun onBeginningOfSpeech() {}
      override fun onRmsChanged(rmsdB: Float) {}
      override fun onBufferReceived(buffer: ByteArray?) {}
      override fun onEndOfSpeech() {}
      override fun onError(error: Int) { isListening = false; listeningPreview = "" }
      override fun onPartialResults(partialResults: Bundle?) {
        val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
        if (text != null) listeningPreview = text
      }
      override fun onResults(results: Bundle?) {
        val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
        if (text != null) applyTranscript(text)
        isListening = false
        listeningPreview = ""
      }
      override fun onEvent(eventType: Int, params: Bundle?) {}
    })
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
    }
    isListening = true
    runCatching { recognizer.startListening(intent) }.onFailure { isListening = false }
  }

  val micPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasMicPermission = granted
    if (granted) startListening()
  }

  fun launchSpeech() {
    if (hasMicPermission) startListening() else micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
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

  Column(modifier = Modifier.fillMaxWidth()) {
  // Only shown on the blank home state (no messages yet, not mid-search) --
  // matches the reference's quick-action chip row that sits above the
  // input box and disappears once a conversation actually starts.
  if (viewModel.messages.isEmpty()) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .horizontalScroll(rememberScrollState())
        .padding(horizontal = 6.dp, vertical = 8.dp),
      horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      QuickActionChip(icon = { Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "GiZa Extra") {
        viewModel.openChatGizaMedia()
      }
      QuickActionChip(icon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_create_video), contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Create Video") {
        viewModel.onInputChange("Create a video of ")
        focusRequester.requestFocus()
      }
      QuickActionChip(icon = { CreateImageIconCustom(tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Create an image") {
        viewModel.onInputChange("Create an image of ")
        focusRequester.requestFocus()
      }
      QuickActionChip(icon = { Icon(Icons.Outlined.Description, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Analyze Doc") {
        filePicker.launch("*/*")
      }
      QuickActionChip(icon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_waveform_speak), contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Voice Mode") {
        viewModel.openLiveVision()
      }
      QuickActionChip(icon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_camera), contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Open Camera") {
        if (hasCameraPermission) launchCamera() else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
      }
      QuickActionChip(icon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_customize_sparkle), contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Customize GiZa") {
        viewModel.openCustomize()
      }
    }
  }
  val composerBackground = colorScheme.onBackground.copy(alpha = 0.06f).compositeOver(colorScheme.background)
  Box(
    // A plain (unrounded) backing rectangle, sitting directly behind the
    // rounded Card below. A rounded Card only paints its own rounded-rect
    // outline -- the four little corners of its bounding box, just
    // outside that curve, are left fully unpainted, so with a
    // transparent parent (this whole composer floats over the scrolling
    // message list) the last message's text showed straight through
    // those corner slivers.
    //
    // This backing rectangle is painted the screen's own solid black --
    // NOT the card's own lighter tint. Using the card's own color here
    // erased the rounded corners entirely (a flat-colored square behind
    // a same-colored rounded shape reads as just a square, since there's
    // no contrast at the curve). Black matches the true app background
    // outside the card, so the notch just reads as background peeking
    // around a rounded corner -- correct either way, and it still blocks
    // the message list from showing through.
    modifier = Modifier
      .fillMaxWidth()
      .padding(start = 6.dp, end = 6.dp, top = 10.dp)
      .background(Color(0xFF000000))
  ) {
  Card(
    // No bottom padding -- the outer Column already carries
    // navigationBarsPadding()/imePadding(), so extra padding here just
    // left a gap between the card and the keyboard/nav bar with the
    // message list visible (and readable) through it.
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(24.dp),
    // Flattened to an opaque color instead of a low-alpha tint -- now
    // that the composer floats over the scrolling message list, a
    // translucent background let that content stay fully legible right
    // through it. compositeOver bakes in the exact same tint the low
    // alpha used to produce over a plain background, just opaque now.
    colors = CardDefaults.cardColors(containerColor = composerBackground)
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) {
      if (viewModel.attachedImageUri != null) {
        Box(
          modifier = Modifier.padding(top = 10.dp),
          contentAlignment = Alignment.TopEnd
        ) {
          AsyncImage(
            model = viewModel.attachedImageUri,
            contentDescription = "Attached photo",
            modifier = Modifier
              .size(64.dp)
              .clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Crop
          )
          Box(
            modifier = Modifier
              .padding(3.dp)
              .size(18.dp)
              .clip(CircleShape)
              .background(Color.Black.copy(alpha = 0.6f))
              .clickable(onClick = { viewModel.clearAttachedImage() }),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Remove photo", tint = Color.White, modifier = Modifier.size(12.dp))
          }
        }
      }
      val attachedFile = viewModel.attachedFile
      if (attachedFile != null && attachedFile.imageDataUrls.isNotEmpty()) {
        // PDF -- a real thumbnail of the first rendered page, with a small
        // "PDF" label overlay, instead of just a filename chip, so you can
        // actually see what you're about to send before you send it.
        Box(
          modifier = Modifier.padding(top = 10.dp),
          contentAlignment = Alignment.TopEnd
        ) {
          Box(
            modifier = Modifier
              .size(96.dp)
              .clip(RoundedCornerShape(12.dp))
              .background(Color.White)
          ) {
            // Coil's AsyncImage can't decode a data:...;base64 string
            // directly (it needs a real content:// / http(s) source), so
            // this uses the actual in-memory Bitmap from render time
            // instead of the data URL meant for the API request.
            val preview = attachedFile.previewBitmap
            if (preview != null) {
              Image(
                bitmap = preview.asImageBitmap(),
                contentDescription = attachedFile.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
              )
            } else {
              // Visibly different from "blank" -- if rendering the page
              // itself ever fails, this shows instead of a plain white box
              // that looks broken/half-loaded.
              Box(modifier = Modifier.fillMaxSize().background(Color(0xFFEDEDED)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Description, contentDescription = null, tint = Color(0xFF9A9A9A), modifier = Modifier.size(28.dp))
              }
            }
            Box(
              modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.75f))
                .padding(vertical = 4.dp),
              contentAlignment = Alignment.Center
            ) {
              Text("PDF", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
          }
          Box(
            modifier = Modifier
              .padding(3.dp)
              .size(18.dp)
              .clip(CircleShape)
              .background(Color.Black.copy(alpha = 0.6f))
              .clickable(onClick = { viewModel.clearAttachedFile() }),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Remove file", tint = Color.White, modifier = Modifier.size(12.dp))
          }
        }
      } else if (attachedFile != null) {
        // Plain text file (.txt/.md/.csv) -- no page image to preview, so
        // the compact name+icon chip is the best we can show.
        Row(
          modifier = Modifier
            .padding(top = 10.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.08f))
            .padding(horizontal = 10.dp, vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Outlined.Description, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            attachedFile.name,
            color = colorScheme.onBackground,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.widthIn(max = 220.dp)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Icon(
            Icons.Outlined.Close,
            contentDescription = "Remove file",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(16.dp).clickable(onClick = { viewModel.clearAttachedFile() })
          )
        }
      }
      if (attachError) {
        Text(
          "Couldn't attach that — try a different file",
          color = Color(0xFFFF6B6B),
          fontSize = 12.sp,
          modifier = Modifier.padding(top = 6.dp)
        )
      }
      TextField(
        value = viewModel.input,
        onValueChange = viewModel::onInputChange,
        modifier = Modifier
          .fillMaxWidth()
          // A long pasted message (e.g. a copied SMS) used to grow this
          // field without bound, pushing the mic/send row below it clean
          // off the bottom of the screen -- capped here so it scrolls
          // internally instead, and Send always stays reachable.
          .heightIn(max = 140.dp)
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
      if (isListening) {
        // Replaces the whole button row while recording -- live partial
        // transcript in place of the input, X cancels without keeping
        // anything heard, the check stops and keeps the transcript.
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.fillMaxWidth().padding(top = 2.dp, bottom = 6.dp)
        ) {
          Box(
            modifier = Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFFF6B6B)),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
              contentDescription = "Listening",
              tint = Color.White,
              modifier = Modifier.size(18.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Text(
            text = listeningPreview.ifBlank { "Listening…" },
            color = colorScheme.onBackground.copy(alpha = if (listeningPreview.isBlank()) 0.5f else 1f),
            fontSize = 15.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(colorScheme.onBackground.copy(alpha = 0.1f))
              .clickable { stopListening(keepResult = false) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Cancel", tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
          }
          Spacer(modifier = Modifier.width(8.dp))
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFFE0E0E0))
              .clickable { stopListening(keepResult = true) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Filled.Check, contentDescription = "Done", tint = Color.Black, modifier = Modifier.size(18.dp))
          }
        }
      } else {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        // A touch of breathing room off the very bottom edge of the card --
        // it used to sit flush against it.
        modifier = Modifier.fillMaxWidth().padding(top = 2.dp, bottom = 6.dp)
      ) {
        // Its own anchored menu (Camera/Gallery/Files/Skills/Connectors) --
        // this used to open the same dropdown as the GiZa Pro pill below,
        // which was two unrelated menus (attachments vs. model tools)
        // merged into one list.
        Box {
          FilledIconButton(
            onClick = { attachMenuOpen = true },
            modifier = Modifier.size(36.dp),
            colors = IconButtonDefaults.filledIconButtonColors(
              containerColor = colorScheme.onBackground.copy(alpha = 0.1f),
              contentColor = colorScheme.onBackground
            )
          ) {
            Icon(Icons.Filled.Add, contentDescription = "Attach", modifier = Modifier.size(18.dp))
          }
          DropdownMenu(
            expanded = attachMenuOpen,
            onDismissRequest = { attachMenuOpen = false },
            shape = RoundedCornerShape(32.dp),
            containerColor = Color(0xFF202020),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2A2A2A))
          ) {
            AttachMenuRow(
              iconRes = R.drawable.ic_camera,
              label = "Camera",
              onClick = {
                attachMenuOpen = false
                if (hasCameraPermission) launchCamera() else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
              }
            )
            AttachMenuRow(
              iconRes = R.drawable.ic_gallery,
              label = "Gallery",
              onClick = {
                attachMenuOpen = false
                imagePicker.launch("image/*")
              }
            )
            AttachMenuRow(
              iconRes = R.drawable.ic_files,
              label = "Files",
              onClick = {
                attachMenuOpen = false
                filePicker.launch("*/*")
              }
            )
            HorizontalDivider(color = Color(0xFF262626), thickness = 1.dp)
            AttachMenuRow(
              icon = { SkillsIconCustom(tint = Color.White, modifier = Modifier.size(24.dp)) },
              label = "Skills",
              onClick = { attachMenuOpen = false }
            )
            AttachMenuRow(
              iconRes = R.drawable.ic_connectors,
              label = "Connectors",
              onClick = { attachMenuOpen = false }
            )
          }
        }
        Spacer(modifier = Modifier.size(6.dp))
        Box {
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
              Icon(Icons.Outlined.WorkspacePremium, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(16.dp))
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
          DropdownMenu(expanded = toolMenuOpen, onDismissRequest = { toolMenuOpen = false }) {
            DropdownMenuItem(text = { Text("GiZa Pro") }, onClick = { viewModel.selectTool(null); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Web search") }, onClick = { viewModel.selectTool("web_search"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep research") }, onClick = { viewModel.selectTool("deep_research"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Deep Think") }, onClick = { viewModel.selectTool("deep_think"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Document Writer") }, onClick = { viewModel.selectTool("document_writer"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("SQL Helper") }, onClick = { viewModel.selectTool("sql_helper"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Python Helper") }, onClick = { viewModel.selectTool("python_helper"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Business Assistant") }, onClick = { viewModel.selectTool("business_assistant"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("AI Agent") }, onClick = { viewModel.selectTool("ai_agent"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Agent Team") }, onClick = { viewModel.selectTool("agent_team"); toolMenuOpen = false })
            DropdownMenuItem(text = { Text("Digital Twin") }, onClick = { viewModel.selectTool("digital_twin"); toolMenuOpen = false })
          }
        }
        Spacer(modifier = Modifier.weight(1f))

        // MIC BUTTON -- starts real in-app voice typing (SpeechRecognizer),
        // replacing this whole row with a listening bar until the user
        // cancels or confirms.
        Box(
          modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(Color(0xFF333333))
            .clickable { launchSpeech() },
          contentAlignment = Alignment.Center
        ) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
            contentDescription = "Voice input",
            tint = Color.White,
            modifier = Modifier.size(18.dp)
          )
        }

        Spacer(modifier = Modifier.width(8.dp))

        val hasSendableContent = viewModel.input.isNotBlank() || viewModel.attachedImageUri != null || viewModel.attachedFile != null
        if (hasSendableContent) {
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
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_waveform_speak),
              contentDescription = null,
              tint = Color.Black,
              modifier = Modifier.size(16.dp)
            )
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
      }
    }
  }
  }
  }
}

@Composable
private fun QuickActionChip(icon: @Composable () -> Unit, label: String, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .height(52.dp)
      .clip(RoundedCornerShape(26.dp))
      .background(colorScheme.onBackground.copy(alpha = 0.08f))
      .clickable(onClick = onClick)
      .padding(horizontal = 20.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    icon()
    Spacer(modifier = Modifier.width(9.dp))
    Text(label, color = colorScheme.onBackground, fontSize = 16.sp, fontWeight = FontWeight.Medium, maxLines = 1, softWrap = false)
  }
}

// ChatGiZa Media's feed screen itself now lives in
// ui/media/ChatGiZaMediaScreen.kt (own file/package) -- these helpers
// (composer, create sheet, comment sheet, video player) stay here and are
// exposed as internal so that file can call them.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LiveVisionScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeLiveVision() }

  val context = LocalContext.current
  val lifecycleOwner = LocalLifecycleOwner.current
  val coroutineScope = rememberCoroutineScope()

  // Lets the voice picker actually speak a sample when a card is tapped,
  // instead of only changing the selection silently.
  val previewTts = remember { PremiumTtsPlayer(context) }
  DisposableEffect(Unit) { onDispose { previewTts.stop() } }

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
      // Transient network errors (e.g. a dropped WebSocket surfacing as
      // "Broken pipe") used to print straight through here -- a raw
      // socket exception message isn't something a user should ever see,
      // so the status now always reads "Go ahead" outside of the
      // AI-speaking state, regardless of what controller.errorMessage says.
      val isConnecting = controller.connectionState == RealtimeVisionController.ConnectionState.Connecting
      val statusText = if (controller.isAiSpeaking) "ChatGiZa is speaking…" else "Go ahead"

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
          if (cameraEnabled) {
            LiveCornerButton(
              icon = if (torchOn) Icons.Outlined.FlashOn else Icons.Outlined.FlashOff,
              contentDescription = "Flash",
              enabled = !useFrontCamera,
              modifier = Modifier.align(Alignment.CenterStart)
            ) {
              val next = !torchOn
              runCatching { boundCamera?.cameraControl?.enableTorch(next) }
              torchOn = next
            }
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
            if (isConnecting) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connecting_spinner),
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(22.dp)
              )
              Spacer(modifier = Modifier.size(8.dp))
              Text("Connecting…", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            } else {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_talking),
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp)
              )
              Spacer(modifier = Modifier.size(6.dp))
              Text(statusText, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
          }
          if (cameraEnabled) {
            LiveCornerButton(
              icon = Icons.Outlined.Cameraswitch,
              contentDescription = "Flip camera",
              modifier = Modifier.align(Alignment.CenterEnd)
            ) {
              useFrontCamera = !useFrontCamera
            }
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
            VoiceControlPill(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video), contentDescription = "Camera", active = cameraEnabled, enabled = !isConnecting) {
              cameraMenuOpen = true
            }
            DropdownMenu(
              expanded = cameraMenuOpen,
              onDismissRequest = { cameraMenuOpen = false },
              shape = RoundedCornerShape(16.dp),
              containerColor = Color(0xFF202020),
              border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2A2A2A))
            ) {
              Column(
                modifier = Modifier
                  .size(width = 210.dp, height = 140.dp)
                  .padding(start = 18.dp, end = 12.dp, top = 11.dp, bottom = 9.dp)
              ) {
                CameraMenuRow(
                  iconRes = R.drawable.ic_video,
                  label = "Camera",
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
                CameraMenuRow(
                  iconRes = R.drawable.ic_screen_share,
                  label = "Share Screen",
                  onClick = {
                    cameraMenuOpen = false
                    shareScreenComingSoon = true
                  }
                )
              }
            }
          }
          VoiceControlPillShell(
            contentDescription = "Speaker",
            active = speakerEnabled,
            enabled = !isConnecting,
            onClick = {
              speakerEnabled = !speakerEnabled
              controller.setSpeakerEnabled(speakerEnabled)
            }
          ) { tint -> SpeakerIconCustom(tint = tint, modifier = Modifier.size(20.dp)) }
          if (viewModel.voiceActivationMode == "push_to_talk") {
            PushToTalkPill(
              enabled = !isConnecting,
              onPress = { controller.beginPushToTalk() },
              onRelease = { controller.endPushToTalk() }
            )
          } else {
            VoiceControlPill(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic), contentDescription = "Microphone", active = !micMuted, enabled = !isConnecting) {
              micMuted = !micMuted
              controller.setMicMuted(micMuted)
            }
          }
          Box {
            VoiceControlPillShell(
              contentDescription = "Settings",
              active = true,
              enabled = !isConnecting,
              onClick = { voiceSettingsOpen = true }
            ) { tint -> SettingsIconCustom(tint = tint, modifier = Modifier.size(20.dp)) }
            // Small badge showing the active personality's own icon (e.g.
            // Story Time) on top of the Settings pill, so which mode is
            // live is visible without opening the sheet.
            val activePersonality = remember(viewModel.personality) {
              PERSONALITY_OPTIONS.find { it.id == viewModel.personality }
            }
            if (activePersonality != null && (activePersonality.iconRes != null || activePersonality.icon != null)) {
              Box(
                modifier = Modifier
                  .align(Alignment.TopEnd)
                  .offset(x = 4.dp, y = (-4).dp)
                  .size(18.dp)
                  .clip(CircleShape)
                  .background(Color(0xFFFF9800))
                  .border(width = 1.dp, color = Color.Black, shape = CircleShape),
                contentAlignment = Alignment.Center
              ) {
                if (activePersonality.iconRes != null) {
                  Icon(
                    painter = androidx.compose.ui.res.painterResource(activePersonality.iconRes),
                    contentDescription = activePersonality.label,
                    tint = Color.Black,
                    modifier = Modifier.size(11.dp)
                  )
                } else {
                  Icon(
                    activePersonality.icon!!,
                    contentDescription = activePersonality.label,
                    tint = Color.Black,
                    modifier = Modifier.size(11.dp)
                  )
                }
              }
            }
          }
        }

        Spacer(modifier = Modifier.height(8.dp))

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
              .height(46.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(Color(0xFF1A1A1A))
          ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxHeight()) {
              Box {
                Box(
                  modifier = Modifier
                    .padding(start = 5.dp)
                    .size(width = 40.dp, height = 38.dp)
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
                  DropdownMenuItem(text = { Text("Document Writer") }, onClick = { viewModel.selectTool("document_writer"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("SQL Helper") }, onClick = { viewModel.selectTool("sql_helper"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("Python Helper") }, onClick = { viewModel.selectTool("python_helper"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("Business Assistant") }, onClick = { viewModel.selectTool("business_assistant"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("AI Agent") }, onClick = { viewModel.selectTool("ai_agent"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("Agent Team") }, onClick = { viewModel.selectTool("agent_team"); toolMenuOpen = false })
                  DropdownMenuItem(text = { Text("Digital Twin") }, onClick = { viewModel.selectTool("digital_twin"); toolMenuOpen = false })
                }
              }
              // Material3 TextField's own vertical padding is sized for a
              // 56dp+ default height -- inside this pill's fixed 46dp it
              // squashed the text against the top/bottom edges instead of
              // centering it. A BasicTextField gives full control over
              // that padding so the text actually sits centered and legible.
              Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (viewModel.input.isEmpty()) {
                  Text("Ask anything", color = Color.White.copy(alpha = 0.38f), fontSize = 15.sp)
                }
                BasicTextField(
                  value = viewModel.input,
                  onValueChange = viewModel::onInputChange,
                  modifier = Modifier.fillMaxWidth(),
                  singleLine = true,
                  textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 15.sp),
                  cursorBrush = SolidColor(Color.White)
                )
              }
            }
          }
          Spacer(modifier = Modifier.size(8.dp))
          Box(
            modifier = Modifier
              .size(width = 100.dp, height = 46.dp)
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
            Row(verticalAlignment = Alignment.CenterVertically) {
              LiveDotsIndicator(dotColor = Color.Black, animated = false, count = 5, dotSize = 4.dp)
              Spacer(modifier = Modifier.size(8.dp))
              Text("Stop", color = Color.Black, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            }
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
        onPreviewVoice = { id ->
          previewTts.stop()
          viewModel.fetchVoicePreview(id, "Hi, this is how I sound.") { bytes ->
            if (bytes != null) {
              previewTts.play(bytes, onDone = {}, onError = {})
            }
          }
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
private fun VoiceControlPill(icon: ImageVector, contentDescription: String, active: Boolean = true, enabled: Boolean = true, onClick: () -> Unit) {
  VoiceControlPillShell(contentDescription, active, enabled, onClick) { tint ->
    Icon(icon, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun VoiceControlPill(painter: androidx.compose.ui.graphics.painter.Painter, contentDescription: String, active: Boolean = true, enabled: Boolean = true, onClick: () -> Unit) {
  VoiceControlPillShell(contentDescription, active, enabled, onClick) { tint ->
    Icon(painter, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun VoiceControlPillShell(contentDescription: String, active: Boolean, enabled: Boolean = true, onClick: () -> Unit, icon: @Composable (Color) -> Unit) {
  Box(
    modifier = Modifier
      .size(width = 84.dp, height = 46.dp)
      .alpha(if (enabled) 1f else 0.4f)
      .clip(RoundedCornerShape(percent = 50))
      .background(Color(0xFF1F1F1F))
      .border(width = 1.dp, color = Color.White.copy(alpha = 0.1f), shape = RoundedCornerShape(percent = 50))
      .clickable(enabled = enabled, onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    // 0.35 read as "the icon vanished into the dark pill" when a control
    // (most noticeably Camera, off by default until permission is
    // granted) starts in its inactive state -- still visibly dimmer than
    // active, but no longer hard to make out.
    icon(Color.White.copy(alpha = if (active) 1f else 0.7f))
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
private fun PushToTalkPill(enabled: Boolean = true, onPress: () -> Unit, onRelease: () -> Unit) {
  var pressed by remember { mutableStateOf(false) }
  Box(
    modifier = Modifier
      .size(72.dp)
      .alpha(if (enabled) 1f else 0.4f)
      .clip(CircleShape)
      .background(if (pressed) Color.White else Color(0xFF1F1F1F))
      .border(width = 1.dp, color = Color.White.copy(alpha = 0.1f), shape = CircleShape)
      .pointerInput(enabled) {
        if (!enabled) return@pointerInput
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
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
      contentDescription = "Hold to talk",
      tint = if (pressed) Color.Black else Color.White,
      modifier = Modifier.size(26.dp)
    )
  }
}

// Three dots -- static on the Stop button (just a "live" marker, not meant
// to move), pulsing out of phase when used for the Connecting spinner
// instead of a spinning ring.
@Composable
private fun LiveDotsIndicator(dotColor: Color, animated: Boolean = true, count: Int = 3, dotSize: Dp = 5.dp) {
  val transition = rememberInfiniteTransition(label = "liveDots")
  Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
    (0 until count).forEach { i ->
      val delayMs = i * 120
      val scale = if (animated) {
        val animatedScale by transition.animateFloat(
          initialValue = 0.4f,
          targetValue = 1f,
          animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 360, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(delayMs, StartOffsetType.Delay)
          ),
          label = "dot"
        )
        animatedScale
      } else {
        1f
      }
      Box(
        modifier = Modifier
          .size(dotSize)
          .scale(scale)
          .clip(CircleShape)
          .background(dotColor)
      )
    }
  }
}

// Dots arranged in a ring with a rotating "comet" brightness sweep, used
// for the Connecting status instead of a plain spinning circle.
@Composable
private fun ConnectingDotsSpinner(dotColor: Color, size: Dp = 16.dp) {
  val transition = rememberInfiniteTransition(label = "connectingSpin")
  val rotation by transition.animateFloat(
    initialValue = 0f,
    targetValue = 360f,
    animationSpec = infiniteRepeatable(animation = tween(durationMillis = 550, easing = LinearEasing)),
    label = "spin"
  )
  val dotCount = 8
  Box(modifier = Modifier.size(size)) {
    for (i in 0 until dotCount) {
      val angleDeg = i * (360f / dotCount)
      val diff = ((angleDeg - rotation) % 360f + 360f) % 360f
      val alpha = (1f - diff / 360f).coerceIn(0.15f, 1f)
      Box(
        modifier = Modifier
          .align(Alignment.Center)
          .offset {
            val radiusPx = size.toPx() / 2f * 0.78f
            val rad = Math.toRadians(angleDeg.toDouble())
            IntOffset((radiusPx * cos(rad)).roundToInt(), (radiusPx * sin(rad)).roundToInt())
          }
          .size(size * 0.2f)
          .clip(CircleShape)
          .background(dotColor.copy(alpha = alpha))
      )
    }
  }
}

@Composable
private fun SpinningIcon(painter: androidx.compose.ui.graphics.painter.Painter, tint: Color, size: Dp) {
  val transition = rememberInfiniteTransition(label = "iconSpin")
  val rotation by transition.animateFloat(
    initialValue = 0f,
    targetValue = 360f,
    animationSpec = infiniteRepeatable(animation = tween(durationMillis = 900, easing = LinearEasing)),
    label = "iconSpinAngle"
  )
  Icon(
    painter = painter,
    contentDescription = null,
    tint = tint,
    modifier = Modifier.size(size).graphicsLayer { rotationZ = rotation }
  )
}

// Fixed cumulus-style puff layout (position/size/opacity as fractions of
// the card) -- a hand-placed cluster reads as one coherent cloud shape
// instead of random circles.
private data class VoiceCloudPuff(val cx: Float, val cy: Float, val scale: Float, val alpha: Float, val phase: Float)

private val VOICE_CLOUD_PUFFS = listOf(
  VoiceCloudPuff(0.30f, 0.55f, 0.85f, 0.55f, 0f),
  VoiceCloudPuff(0.42f, 0.35f, 1.05f, 0.6f, 45f),
  VoiceCloudPuff(0.55f, 0.50f, 0.95f, 0.5f, 90f),
  VoiceCloudPuff(0.66f, 0.32f, 0.8f, 0.55f, 135f),
  VoiceCloudPuff(0.75f, 0.55f, 0.9f, 0.45f, 180f),
  VoiceCloudPuff(0.48f, 0.68f, 0.75f, 0.4f, 225f),
  VoiceCloudPuff(0.62f, 0.68f, 0.7f, 0.4f, 270f)
)

@Composable
private fun VoiceGradientCard(option: VoiceOption, selected: Boolean, onClick: () -> Unit) {
  val cardWidth = 188.dp
  val cardHeight = 64.dp
  val density = LocalDensity.current
  val widthPx = with(density) { cardWidth.toPx() }
  val heightPx = with(density) { cardHeight.toPx() }

  val isOrin = option.name == "Orin"

  // Reference design: the selected card becomes a full pill and its
  // background reads as a soft, shifting cloud of color rather than a flat
  // swatch or a crisp geometric gradient -- three overlapping, independently
  // drifting radial blobs (each a color fading to transparent) blended over
  // a dark base, instead of one hard-edged brush.
  val infiniteTransition = rememberInfiniteTransition(label = "voiceCloud")
  val t by infiniteTransition.animateFloat(
    initialValue = 0f,
    targetValue = 360f,
    animationSpec = infiniteRepeatable(animation = tween(5000, easing = LinearEasing), repeatMode = RepeatMode.Restart),
    label = "voiceCloudAngle"
  )
  val blobSize = with(density) { (kotlin.math.max(widthPx, heightPx) * 0.95f).toDp() }
  val midColor = lerp(option.gradientStart, option.gradientEnd, 0.5f)

  Box(
    modifier = Modifier
      .width(cardWidth)
      .height(cardHeight)
      .clip(RoundedCornerShape(percent = 50))
      .clickable(onClick = onClick)
  ) {
    if (selected) {
      Box(modifier = Modifier.matchParentSize().background(Color(0xFF1C1C1C)))
      listOf(
        Triple(option.gradientStart, 0f, 0.85f),
        Triple(option.gradientEnd, 130f, 0.8f),
        Triple(midColor, 250f, 0.7f)
      ).forEach { (color, phase, alpha) ->
        val rad = Math.toRadians((t + phase).toDouble())
        val ox = (kotlin.math.cos(rad) * widthPx * 0.2f).toFloat()
        val oy = (kotlin.math.sin(rad) * heightPx * 0.35f).toFloat()
        Box(
          modifier = Modifier
            .size(blobSize)
            .align(Alignment.Center)
            .offset { IntOffset(ox.roundToInt(), oy.roundToInt()) }
            .graphicsLayer { this.alpha = alpha }
            .background(Brush.radialGradient(listOf(color, Color.Transparent)))
        )
      }
      // A cluster of small white puffs drifting over the color blobs --
      // reads as an actual fluffy cloud silhouette (per the literal cloud
      // photo reference) rather than smooth color blur alone.
      VOICE_CLOUD_PUFFS.forEach { puff ->
        val rad = Math.toRadians((t * 0.6f + puff.phase).toDouble())
        val ox = (kotlin.math.cos(rad) * widthPx * 0.03f).toFloat()
        val oy = (kotlin.math.sin(rad) * heightPx * 0.06f).toFloat()
        val puffSizeDp = with(density) { (heightPx * puff.scale).toDp() }
        Box(
          modifier = Modifier
            .size(puffSizeDp)
            .offset {
              IntOffset(
                (widthPx * puff.cx - heightPx * puff.scale / 2f + ox).roundToInt(),
                (heightPx * puff.cy - heightPx * puff.scale / 2f + oy).roundToInt()
              )
            }
            .graphicsLayer { this.alpha = puff.alpha }
            .background(Brush.radialGradient(listOf(Color.White, Color.White.copy(alpha = 0f))))
        )
      }
    } else {
      Box(modifier = Modifier.matchParentSize().background(Color.White.copy(alpha = 0.08f)))
    }
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text(option.name, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        // Orin specifically, not every voice -- next to the name rather than
        // a corner badge.
        if (isOrin) {
          Spacer(modifier = Modifier.width(6.dp))
          OrinVoiceBadge(
            tint = Color.White.copy(alpha = if (selected) 0.9f else 0.5f),
            modifier = Modifier.size(15.dp)
          )
        }
      }
      Spacer(modifier = Modifier.height(2.dp))
      Text(option.description, color = Color.White.copy(alpha = if (selected) 0.85f else 0.55f), fontSize = 12.sp)
    }
  }
}

private data class PersonalityOption(
  val id: String,
  val label: String,
  val icon: ImageVector?,
  val tag: String? = null,
  val adultOnly: Boolean = false,
  val iconRes: Int? = null
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
  PersonalityOption("therapist", "\"Therapist\"", null, iconRes = R.drawable.ic_therapist),
  PersonalityOption("storyteller", "Storyteller", Icons.AutoMirrored.Outlined.MenuBook),
  PersonalityOption("story_time", "Story Time", null, tag = "Kids", iconRes = R.drawable.ic_story_time),
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
    if (option.iconRes != null) {
      Icon(androidx.compose.ui.res.painterResource(option.iconRes), contentDescription = null, tint = if (selected) Color.Black else Color.White, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    } else if (option.icon != null) {
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
  onPreviewVoice: (String) -> Unit,
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
            onClick = {
              onVoiceChange(option.id)
              onPreviewVoice(option.id)
            }
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
            if (id == "speaker") {
              SpeakerIconCustom(
                tint = if (selected) Color.Black else Color.White,
                modifier = Modifier.size(18.dp)
              )
            } else {
              Icon(icon, contentDescription = null, tint = if (selected) Color.Black else Color.White, modifier = Modifier.size(18.dp))
            }
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

// Events is a real, swipeable full-page carousel (per the reference: plain
// black card, "Events" label, bold headline + a short subtitle line, and a
// "current/total" counter badge) -- no icons, just text on black.
private data class ChatGizaAnnouncement(
  val headline: String,
  val subtitle: String,
  val isAd: Boolean = false,
  val linkUrl: String? = null
)

private val CHATGIZA_ANNOUNCEMENTS = listOf(
  ChatGizaAnnouncement(
    "Live Vision — talk to GiZa face to face",
    "Talk to GiZa in real time using your camera and voice."
  ),
  ChatGizaAnnouncement(
    "See GiZa. Talk naturally.",
    "Turn on your camera and start a natural conversation with GiZa."
  ),
  ChatGizaAnnouncement(
    "Real-time AI responses",
    "GiZa listens, understands, and responds instantly."
  ),
  ChatGizaAnnouncement(
    "More than just a chat",
    "Ask questions, learn, get ideas, plan, or simply talk with GiZa."
  ),
  ChatGizaAnnouncement(
    "Fast, private & secure",
    "Your conversations are designed with your privacy and security in mind."
  ),
  ChatGizaAnnouncement(
    "Experience GiZa Live Vision",
    "Start your first face-to-face AI conversation today."
  )
)

@Composable
private fun ChatGizaEventsCard(viewModel: ChatViewModel) {
  val context = LocalContext.current
  LaunchedEffect(Unit) { viewModel.loadActiveAds() }
  // Paid, admin-approved ads targeting this device's country slot in
  // alongside ChatGiZa's own onboarding pages -- same pager, same rotation,
  // just tagged "Ad" so they're never mistaken for ChatGiZa's own content.
  val items = remember(viewModel.activeAds) {
    CHATGIZA_ANNOUNCEMENTS + viewModel.activeAds.map { ad ->
      ChatGizaAnnouncement(ad.headline, ad.subtitle, isAd = true, linkUrl = ad.linkUrl.ifBlank { null })
    }
  }
  val pagerState = rememberPagerState(pageCount = { items.size })
  LaunchedEffect(pagerState, items.size) {
    while (true) {
      delay(4000)
      val next = (pagerState.currentPage + 1) % items.size
      pagerState.animateScrollToPage(next)
    }
  }
  Box(
    modifier = Modifier
      .fillMaxWidth()
      .padding(horizontal = 10.dp, vertical = 2.dp)
      .clip(RoundedCornerShape(16.dp))
      .background(Color(0xFF262626))
      .padding(horizontal = 10.dp, vertical = 6.dp)
  ) {
    // A real swipeable page for every announcement -- not just a crossfading
    // headline -- so the user can flick through all six at their own pace,
    // on top of the same auto-advance timer.
    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth()) { page ->
      val item = items[page]
      Column(
        modifier = Modifier
          .heightIn(min = 36.dp)
          .let {
            if (item.isAd && item.linkUrl != null) {
              it.clickable {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(item.linkUrl))) }
              }
            } else it
          }
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("Events", color = Color.White.copy(alpha = 0.5f), fontSize = 10.sp)
          if (item.isAd) {
            Spacer(modifier = Modifier.width(6.dp))
            Box(
              modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(Color.White.copy(alpha = 0.15f))
                .padding(horizontal = 4.dp, vertical = 1.dp)
            ) {
              Text("Ad", color = Color.White.copy(alpha = 0.7f), fontSize = 8.sp, fontWeight = FontWeight.Medium)
            }
          }
        }
        Spacer(modifier = Modifier.height(1.dp))
        Text(
          item.headline,
          color = Color.White,
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold
        )
        Text(
          item.subtitle,
          color = Color.White.copy(alpha = 0.6f),
          fontSize = 10.sp,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
      }
    }
    Box(
      modifier = Modifier
        .align(Alignment.TopEnd)
        .clip(RoundedCornerShape(8.dp))
        .background(Color.White.copy(alpha = 0.12f))
        .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
      Text(
        "${pagerState.currentPage + 1}/${items.size}",
        color = Color.White.copy(alpha = 0.7f),
        fontSize = 9.sp,
        fontWeight = FontWeight.Medium
      )
    }
  }
}

// A second, static promo tile below Events -- same card language (rounded,
// dark) but much shorter than Events, linking straight to the existing
// Scheduled feature.
@Composable
private fun ChatGizaArrangedCard(onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(horizontal = 10.dp, vertical = 4.dp)
      .clip(RoundedCornerShape(16.dp))
      .background(Color(0xFF1E2B26))
      .clickable(onClick = onClick)
      .padding(horizontal = 14.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier.size(26.dp).clip(RoundedCornerShape(9.dp)).background(Color(0xFF1EBE7E)),
      contentAlignment = Alignment.Center
    ) {
      ArrangedIconCustom(tint = Color.White, modifier = Modifier.size(15.dp))
    }
    Spacer(modifier = Modifier.width(10.dp))
    Text("Arranged", color = colorScheme.onBackground, fontSize = 14.sp, fontWeight = FontWeight.Bold)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HistoryScreen(viewModel: ChatViewModel) {
  // HistoryScreen is now always kept mounted inside the drawer (so it can be
  // swiped in/out), so this must only intercept back-press while it's
  // actually the active screen — otherwise it'd steal back navigation from
  // Chat/Imagine while the drawer is closed.
  BackHandler(enabled = viewModel.screen is AppScreen.History) { viewModel.closeHistory() }
  val context = LocalContext.current

  // The account-plan banner below needs this, but Billing is otherwise only
  // loaded when the user actually opens the Billing screen -- fetch it once
  // here too so the banner shows the real plan name instead of just "Free"
  // the whole time.
  LaunchedEffect(Unit) {
    if (viewModel.billingSummary == null) viewModel.loadBilling()
  }

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

  Scaffold(
    containerColor = Color.Transparent
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
            modifier = Modifier
              .clickable(onClick = { viewModel.openProfileHub() })
              .border(1.dp, colorScheme.onBackground.copy(alpha = 0.35f), CircleShape)
              .padding(2.dp)
          ) {
            val selectedPreset = AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
            if (selectedPreset != null) {
              AvatarPresetThumbnail(selectedPreset, 36.dp)
            } else if (viewModel.userImage != null) {
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

        // A big account-plan banner instead of an empty gap -- shows which
        // package the account is actually on. Every real tier already has
        // its own name from the backend (Starter/Growth/Enterprise via
        // PLAN_DETAILS); no active subscription just means the free tier,
        // shown here as "Free" rather than leaving it blank or generic.
        val planName = viewModel.billingSummary?.subscription?.planName?.takeIf { it != "ChatGiZa" } ?: "Free"
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .height(150.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF3A2E6B), Color(0xFF1B1430))))
            .clickable { viewModel.openBilling() }
            .padding(20.dp)
        ) {
          Icon(
            Icons.Outlined.WorkspacePremium,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.14f),
            modifier = Modifier.align(Alignment.TopEnd).size(72.dp)
          )
          Column(modifier = Modifier.align(Alignment.BottomStart)) {
            Text("Your account", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(planName, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold)
          }
        }

        // Events is a rotating promo carousel, not an Automations shortcut
        // -- that was the wrong call earlier; Automations/Scheduled already
        // has its own dedicated tab in the bottom nav below, so nothing is
        // lost by decoupling this card from it.
        ChatGizaEventsCard(viewModel)

        Spacer(modifier = Modifier.height(10.dp))
        ChatGizaArrangedCard(onClick = { viewModel.openScheduled() })

        Spacer(modifier = Modifier.height(14.dp))
      }

      // History tab + the whole conversation list share ONE background —
      // a single rounded card, not a per-row layer or a floating tab —
      // matching the reference's tabs+list grouped inside one container.
      item {
        Column(
          modifier = Modifier
            .padding(horizontal = 10.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF23252B))
            .padding(vertical = 10.dp)
        ) {
          // Tab row — only "History" has a real dataset behind it; the
          // other three are visual-only until there's an actual GiZa/
          // Private/V2 concept to filter into. Wrapped in its own pill
          // background (instead of sitting bare on the card) so it reads
          // as one dedicated control, with a second highlight pill behind
          // whichever tab is selected.
          Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier
              .padding(horizontal = 14.dp)
              .clip(RoundedCornerShape(20.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.06f))
              .horizontalScroll(rememberScrollState())
              .padding(6.dp)
          ) {
            listOf("History", "GiZa", "Private", "V2").forEach { tab ->
              val selected = selectedHistoryTab == tab
              Text(
                tab,
                color = if (selected) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.4f),
                fontSize = 14.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                modifier = Modifier
                  .clip(RoundedCornerShape(16.dp))
                  .background(if (selected) colorScheme.onBackground.copy(alpha = 0.12f) else Color.Transparent)
                  .clickable { selectedHistoryTab = tab }
                  .padding(horizontal = 12.dp, vertical = 6.dp)
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
                  isVoice = viewModel.voiceConversationIds.contains(convo.id),
                  hapticsEnabled = viewModel.hapticsEnabled && viewModel.hapticsOnPress,
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
          RenameIconCustom(tint = colorScheme.onBackground, modifier = Modifier.size(20.dp))
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
          Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_pin), contentDescription = null, tint = colorScheme.onBackground)
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

// --- ChatGiZa Media --------------------------------------------------------
// Reached via the "Extra" tab at the top of the Chat screen now (see
// ChatGizaMediaScreen). A real shared feed backed by /api/media/posts:
// posting, liking, and commenting all round-trip to the backend, so any
// signed-in user sees any other user's posts here.

internal fun formatMediaPostTimeAgo(createdAt: Long): String {
  val minutes = (System.currentTimeMillis() - createdAt).coerceAtLeast(0) / 60000
  return when {
    minutes < 1 -> "now"
    minutes < 60 -> "${minutes}m"
    minutes < 24 * 60 -> "${minutes / 60}h"
    else -> "${minutes / (24 * 60)}d"
  }
}

// Long posts show only the first stretch of text with a tappable "... more"
// tail instead of dumping the whole message into the feed -- matches how
// every real social feed handles long text, and keeps the feed scannable.
internal const val MEDIA_POST_TEXT_PREVIEW_LENGTH = 180

// Free-tier caption cap in the composer -- writing past this needs an active
// GiZa Pro subscription (any tier). Only gates NEW posts; it isn't retroactive
// against older, already-published captions longer than this.
internal const val MEDIA_POST_FREE_CAPTION_LIMIT = 150

// Matches the web composer's cap (ChatGizaMediaFeed.tsx) so both clients
// enforce the same limit rather than one silently accepting more than the
// other can render.
private const val MEDIA_MAX_IMAGES_PER_POST = 10

@Composable
internal fun MediaPostComments(comments: List<ApiMediaComment>?, isDark: Boolean = true, onOpenComposer: () -> Unit) {
  val fg = if (isDark) Color.White else Color.Black
  val overlay = fg.copy(alpha = 0.04f)
  val dividerOverlay = fg.copy(alpha = 0.06f)
  val composerBg = fg.copy(alpha = 0.06f)
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .padding(top = 10.dp)
      .clip(RoundedCornerShape(14.dp))
      .background(overlay)
      .padding(12.dp)
  ) {
    when {
      comments == null -> Text(
        "Loading comments…",
        color = Color(0xFF8A8A8A),
        fontSize = 12.sp,
        modifier = Modifier.padding(vertical = 4.dp)
      )
      comments.isEmpty() -> Text(
        "No comments yet — say something!",
        color = Color(0xFF8A8A8A),
        fontSize = 12.sp,
        modifier = Modifier.padding(vertical = 4.dp)
      )
      else -> {
        comments.forEachIndexed { index, comment ->
          Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
            if (comment.authorImage != null) {
              AsyncImage(
                model = comment.authorImage,
                contentDescription = "Profile",
                modifier = Modifier.size(24.dp).clip(CircleShape)
              )
            } else {
              Icon(
                Icons.Outlined.AccountCircle,
                contentDescription = "Profile",
                tint = fg,
                modifier = Modifier.size(24.dp)
              )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text(comment.authorName, color = fg, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
              Spacer(modifier = Modifier.height(2.dp))
              Text(comment.text, color = fg.copy(alpha = 0.85f), fontSize = 13.sp, lineHeight = 17.sp)
            }
          }
          if (index < comments.lastIndex) {
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(dividerOverlay))
          }
        }
      }
    }
    Spacer(modifier = Modifier.height(10.dp))
    // Opens the full "Replying to @author" composer sheet instead of an
    // inline field -- just a tappable trigger row here.
    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(20.dp))
        .background(composerBg)
        .clickable(onClick = onOpenComposer)
        .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
      Text("Write a comment…", color = Color(0xFF7A7A7A), fontSize = 13.sp)
    }
  }
}

// The account-hub screen opened by tapping the avatar at the top of
// History, matching a reference layout the user provided (their own
// name as the big bold header, a UID/site row, a VIP-style upgrade
// card, and quick-link/trending rows below). Deliberately a static
// shell for now -- every row past the profile header itself is a stub
// tap ("coming soon"); wiring these up for real is a later pass.
@Composable
private fun ProfileHubScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeProfileHub() }
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  // No real backend UID field exists yet -- this derives a stable
  // 8-digit number from the account's own id, so the same account
  // always shows the same "UID" without needing a schema change.
  val uid = remember(viewModel.userId) {
    val id = viewModel.userId.orEmpty()
    (kotlin.math.abs(id.hashCode().toLong()) % 100_000_000L).toString().padStart(8, '0')
  }
  fun comingSoon(label: String) {
    Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show()
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF000000))
      .statusBarsPadding()
  ) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      // Bottom padding reserves room so scrolled content never sits
      // behind the pinned footer below -- that footer is deliberately
      // outside this scrolling Column, not just the last item in it.
      .padding(bottom = 54.dp)
      .verticalScroll(rememberScrollState())
      .padding(horizontal = 16.dp)
  ) {
    Spacer(modifier = Modifier.height(8.dp))
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
      IconButton(onClick = { viewModel.closeProfileHub() }, modifier = Modifier.size(30.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(modifier = Modifier.weight(1f))
      IconButton(onClick = { comingSoon("Support") }, modifier = Modifier.size(36.dp)) {
        Icon(Icons.Outlined.Headset, contentDescription = "Support", tint = Color.White)
      }
      IconButton(onClick = { viewModel.openAccountTabs() }, modifier = Modifier.size(36.dp)) {
        SettingsHexIconCustom(tint = Color.White, modifier = Modifier.size(24.dp))
      }
      IconButton(onClick = { comingSoon("Share profile") }, modifier = Modifier.size(36.dp)) {
        ProfileSwitchIconCustom(tint = Color.White, modifier = Modifier.size(24.dp))
      }
    }

    Spacer(modifier = Modifier.height(8.dp))

    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
      val selectedPreset = AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
      Box(modifier = Modifier.clickable { viewModel.openAvatarPicker() }) {
        if (selectedPreset != null) {
          AvatarPresetThumbnail(selectedPreset, 52.dp, name = viewModel.avatarName)
        } else if (viewModel.userImage != null) {
          AsyncImage(
            model = viewModel.userImage,
            contentDescription = "Profile",
            modifier = Modifier.size(52.dp).clip(CircleShape)
          )
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = "Profile", tint = Color.White, modifier = Modifier.size(52.dp))
        }
      }
      Spacer(modifier = Modifier.width(12.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text(
          viewModel.userName?.takeIf { it.isNotBlank() } ?: "You",
          color = Color.White,
          fontSize = 21.sp,
          fontWeight = FontWeight.Bold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(3.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("UID: $uid", color = Color.White.copy(alpha = 0.5f), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
          Spacer(modifier = Modifier.width(6.dp))
          Icon(
            Icons.Outlined.ContentCopy,
            contentDescription = "Copy UID",
            tint = Color.White.copy(alpha = 0.5f),
            modifier = Modifier.size(12.dp).clickable {
              clipboard.setText(AnnotatedString(uid))
              Toast.makeText(context, "UID copied", Toast.LENGTH_SHORT).show()
            }
          )
          Spacer(modifier = Modifier.width(8.dp))
          Text("|", color = Color.White.copy(alpha = 0.25f), fontSize = 11.sp)
          Spacer(modifier = Modifier.width(8.dp))
          Text("Site: GiZa Glo...", color = Color.White.copy(alpha = 0.5f), fontSize = 11.sp)
        }
      }
      Icon(
        Icons.Filled.ChevronRight,
        contentDescription = null,
        tint = Color.White.copy(alpha = 0.4f),
        modifier = Modifier.clickable { viewModel.openAccountTabs() }
      )
    }

    Spacer(modifier = Modifier.height(12.dp))

    Row {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .background(Color.White.copy(alpha = 0.1f))
          .padding(horizontal = 10.dp, vertical = 5.dp)
      ) {
        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text("Verified", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
      }
      Spacer(modifier = Modifier.width(8.dp))
      Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .background(Color.White.copy(alpha = 0.1f))
          .clickable { comingSoon("Plan") }
          .padding(horizontal = 10.dp, vertical = 5.dp)
      ) {
        Text("Free plan", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(13.dp))
      }
    }

    Spacer(modifier = Modifier.height(8.dp))

    // Every background/padding value below is deliberately fixed and
    // small -- this whole screen must fit one viewport with no scrolling
    // on a normal phone; letting any one piece grow past what it needs
    // is what pushed the page taller than the screen before.
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(18.dp))
        .background(Color(0xFF141414))
        .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
      Text("Unlock GiZa Pro Perks", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(
        "Upgrade to GiZa Pro for unlimited chats, priority responses, and exclusive perks!",
        color = Color.White.copy(alpha = 0.5f),
        fontSize = 11.sp,
        lineHeight = 14.sp
      )
      Spacer(modifier = Modifier.height(8.dp))
      HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
      Spacer(modifier = Modifier.height(6.dp))
      Text("Current plan: Free", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp)
      Spacer(modifier = Modifier.height(8.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
          "Pro Benefits ›",
          color = Color.White.copy(alpha = 0.6f),
          fontSize = 11.sp,
          fontWeight = FontWeight.Medium,
          modifier = Modifier.weight(1f).clickable { comingSoon("Pro Benefits") }
        )
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color(0xFFFF9D2E))
            .clickable { comingSoon("Enter GiZa Max") }
            .padding(horizontal = 20.dp, vertical = 7.dp)
        ) {
          Text("Enter GiZa Max", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
      }
    }

    Spacer(modifier = Modifier.height(10.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
      ProfileHubQuickCard(title = "GiZa Card", subtitle = "Coming soon", modifier = Modifier.weight(1f), onClick = { comingSoon("GiZa Card") }) { tint ->
        Icon(Icons.Outlined.WorkspacePremium, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
      }
      ProfileHubQuickCard(title = "Rewards", subtitle = "Check now", modifier = Modifier.weight(1f), onClick = { comingSoon("Rewards") }) { tint ->
        RewardsIconCustom(tint = tint, modifier = Modifier.size(20.dp))
      }
    }
    Spacer(modifier = Modifier.height(10.dp))
    ProfileHubQuickCard(title = "Invite Friends", subtitle = "Invite now", modifier = Modifier.fillMaxWidth(), onClick = { comingSoon("Invite Friends") }) { tint ->
      InviteFriendsIconCustom(tint = tint, modifier = Modifier.size(20.dp))
    }

    Spacer(modifier = Modifier.height(14.dp))
    Text("Trending services", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
    Spacer(modifier = Modifier.height(10.dp))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      ProfileHubTrendingItem(label = "Automations", onClick = { comingSoon("Automations") }) { tint ->
        Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_automations), contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
      }
      ProfileHubTrendingItem(label = "Connectors", onClick = { comingSoon("Connectors") }) { tint ->
        Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connectors), contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
      }
      ProfileHubTrendingItem(label = "Language", onClick = { viewModel.openAppLanguage() }) { tint ->
        Icon(Icons.Outlined.Language, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
      }
    }

    Spacer(modifier = Modifier.height(12.dp))
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(50))
          .clickable { comingSoon("All Services") }
          .padding(horizontal = 20.dp, vertical = 7.dp)
      ) {
        Text("All Services", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
      }
    }
  }

  // Pinned to the very bottom of the screen instead of just flowing
  // after everything else -- visually set apart from the rest of the
  // page by its own divider, the way the reference footer sits.
  Column(
    modifier = Modifier
      .align(Alignment.BottomCenter)
      .fillMaxWidth()
      .background(Color(0xFF000000))
      .navigationBarsPadding()
      .padding(horizontal = 16.dp)
  ) {
    HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
    Spacer(modifier = Modifier.height(10.dp))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text("GiZa Lite", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable { comingSoon("GiZa Lite") })
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { viewModel.openAboutUs() }) {
        Text("About Us", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
      }
    }
    Spacer(modifier = Modifier.height(10.dp))
  }
  }

  if (viewModel.showAvatarPicker) {
    AvatarPickerDialog(viewModel)
  }
  if (viewModel.showAboutUs) {
    AboutUsDialog(viewModel)
  }
  if (viewModel.showAccountTabs) {
    AccountTabsDialog(viewModel)
  }
}

// Opened by tapping the chevron next to the Site row -- the
// My info/Security/Preference/General tabs live in here instead of
// inline on the main Profile Hub screen. Only "My info" is real (it
// just points back at the profile fields already shown on the main
// screen); the rest are stub taps.
@Composable
private fun AccountTabsDialog(viewModel: ChatViewModel) {
  var activeTab by remember { mutableStateOf("My info") }
  var showNicknameEditor by remember { mutableStateOf(false) }
  var nicknameText by remember(viewModel.userName) { mutableStateOf(viewModel.userName ?: "") }
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  val uid = remember(viewModel.userId) {
    val id = viewModel.userId.orEmpty()
    (kotlin.math.abs(id.hashCode().toLong()) % 100_000_000L).toString().padStart(8, '0')
  }
  fun comingSoon(label: String) {
    Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show()
  }
  Dialog(
    onDismissRequest = { viewModel.closeAccountTabs() },
    properties = DialogProperties(usePlatformDefaultWidth = false)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF000000))
        .statusBarsPadding()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp)
    ) {
      Spacer(modifier = Modifier.height(12.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        // "User Center" is centered across the whole header width (between
        // the back button and the world icon), not just after the back
        // button -- a Box overlay since Row's SpaceBetween alone can't
        // center against the full width while the end icons take unequal
        // space.
        Box(modifier = Modifier.fillMaxWidth()) {
          Text(
            "User Center",
            color = Color.White,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Center)
          )
          Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = { viewModel.closeAccountTabs() }, modifier = Modifier.size(32.dp)) {
              Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Spacer(modifier = Modifier.weight(1f))
            // Quick dark-mode toggle -- flips between the two ends of the
            // same theme system Color Theme/Appearance use
            // (updateThemeMode), not a separate setting of its own.
            IconButton(
              onClick = { viewModel.updateThemeMode(if (viewModel.themeMode == "light") "dark" else "light") },
              modifier = Modifier.size(32.dp)
            ) {
              Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_moon), contentDescription = "Toggle dark mode", tint = Color.White, modifier = Modifier.size(24.dp))
            }
            IconButton(
              onClick = { viewModel.closeAccountTabs(); viewModel.openAppLanguage() },
              modifier = Modifier.size(32.dp)
            ) {
              Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_world), contentDescription = "Language", tint = Color.White, modifier = Modifier.size(23.dp))
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Persistent identity row -- same avatar/name shown lower down on
      // the "My info" tab, surfaced here too so it's visible no matter
      // which tab is open, matching the reference layout. The pill under
      // the name mirrors the reference's "Site: Bybit Global" tag.
      Row(verticalAlignment = Alignment.CenterVertically) {
        val headerPreset = AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
        if (headerPreset != null) {
          AvatarPresetThumbnail(headerPreset, 50.dp, name = null)
        } else if (viewModel.userImage != null) {
          AsyncImage(model = viewModel.userImage, contentDescription = "Profile", modifier = Modifier.size(50.dp).clip(CircleShape))
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = "Profile", tint = Color.White, modifier = Modifier.size(50.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
          Text(
            (viewModel.avatarName ?: viewModel.userName ?: "You").uppercase(),
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.padding(top = 3.dp)
          )
          Spacer(modifier = Modifier.height(4.dp))
          Box(
            modifier = Modifier
              .background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(3.dp))
              .padding(horizontal = 4.dp, vertical = 1.dp)
          ) {
            Text("Site: ChatGiZa Global", color = Color.White.copy(alpha = 0.6f), fontSize = 8.sp)
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(26.dp)
      ) {
        listOf("My info", "Security", "Preference", "General").forEach { tab ->
          Column(
            modifier = Modifier.clickable {
              activeTab = tab
            }
          ) {
            Text(
              tab,
              color = if (activeTab == tab) Color.White else Color.White.copy(alpha = 0.4f),
              fontSize = 15.sp,
              fontWeight = if (activeTab == tab) FontWeight.Bold else FontWeight.Normal
            )
            Spacer(modifier = Modifier.height(6.dp))
            if (activeTab == tab) {
              Box(modifier = Modifier.width(28.dp).height(2.dp).background(Color.White))
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(24.dp))

      if (activeTab == "My info") {
        // Matches the reference list -- real where it's just displaying
        // data already on hand (Profile Picture opens the picker we
        // already built; UID shows/copies the same derived id used on
        // the main screen), a stub everywhere else. Nickname is shown
        // read-only for now -- actual editing is a later pass.
        val selectedPreset = AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(
            icon = Icons.Outlined.AccountCircle,
            label = "Profile Picture",
            // AvatarPickerDialog only ever renders from within
            // ProfileHubScreen's own composition (see its showAvatarPicker
            // check) -- opening it straight from here, still inside this
            // separate AccountTabsDialog, set the flag but never actually
            // showed anything. Closing this dialog first (same fix already
            // used for "About Us" below) hands control back to
            // ProfileHubScreen so the check actually runs.
            onClick = {
              viewModel.closeAccountTabs()
              viewModel.openAvatarPicker()
            }
          ) {
            if (selectedPreset != null) {
              AvatarPresetThumbnail(selectedPreset, 40.dp)
            } else if (viewModel.userImage != null) {
              AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(40.dp).clip(CircleShape))
            } else {
              Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.White.copy(alpha = 0.5f), modifier = Modifier.size(40.dp))
            }
          }
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_id_lines), label = "Nickname", onClick = { showNicknameEditor = true }) {
            Text(viewModel.userName?.takeIf { it.isNotBlank() } ?: "-", color = Color.White.copy(alpha = 0.5f), fontSize = 14.sp)
          }
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_id_rounded), iconSize = 26.dp, label = "UID", showChevron = false, onClick = {}) {
            Text(uid, color = Color.White.copy(alpha = 0.5f), fontSize = 14.sp, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.width(6.dp))
            Icon(
              Icons.Outlined.ContentCopy,
              contentDescription = "Copy UID",
              tint = Color.White.copy(alpha = 0.5f),
              modifier = Modifier.size(15.dp).clickable {
                clipboard.setText(AnnotatedString(uid))
                Toast.makeText(context, "UID copied", Toast.LENGTH_SHORT).show()
              }
            )
          }
          // Moved here from Settings -> Data & Information/Business,
          // replacing "My Fee Rates"/"Additional Verification" (crypto-
          // exchange placeholders that never applied to ChatGiZa).
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share_link),
            label = "Collaborative Chat",
            onClick = { viewModel.closeAccountTabs(); viewModel.openSharedConversations() }
          ) {}
          MyInfoRow(
            icon = Icons.Outlined.Business,
            label = "Advertise on ChatGiZa",
            onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/advertise"))) }
          ) {}
          MyInfoRow(icon = Icons.Filled.Person, label = "Subaccount", onClick = { comingSoon("Subaccount") }) {}
        }

        Spacer(modifier = Modifier.height(14.dp))

        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(icon = Icons.Outlined.AlternateEmail, label = "Link Account", onClick = { comingSoon("Link Account") }) {}
          MyInfoRow(icon = Icons.Outlined.Business, label = "Affiliate's community", onClick = { comingSoon("Affiliate's community") }) {
            Text("Joined", color = Color.White.copy(alpha = 0.5f), fontSize = 14.sp)
          }
          MyInfoRow(icon = Icons.Outlined.SupportAgent, label = "Join Our Community", onClick = { comingSoon("Join Our Community") }) {}
        }

        Spacer(modifier = Modifier.height(20.dp))

        Box(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(50))
            .clickable {
              viewModel.closeAccountTabs()
              viewModel.signOut()
            }
            .padding(vertical = 14.dp),
          contentAlignment = Alignment.Center
        ) {
          Text("Log Out", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(20.dp))
      } else if (activeTab == "Security") {
        // Matches the reference list exactly -- entirely mock data and
        // stub taps (nothing here connects to a real 2FA/password/device
        // backend yet), same "don't go deeper" scope as My info.
        var mockGoogle2fa by remember { mutableStateOf(true) }

        SecurityGroupHeader("Basic Protect", "Essential protection for everyday account activity.")
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(icon = Icons.Outlined.Email, label = "Email", onClick = { comingSoon("Email") }) {
            Text("nic***@****", color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
          }
          MyInfoRow(icon = Icons.Outlined.Smartphone, label = "Mobile", onClick = { comingSoon("Mobile") }) {
            Text("75****182", color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
          }
          MyInfoRow(icon = Icons.Outlined.Lock, label = "Google 2FA Authentication", showChevron = false, onClick = {}) {
            Switch(checked = mockGoogle2fa, onCheckedChange = { mockGoogle2fa = it })
          }
          MyInfoRow(icon = Icons.Outlined.Tag, label = "Passkeys", onClick = { comingSoon("Passkeys") }) {}
        }

        Spacer(modifier = Modifier.height(18.dp))

        SecurityGroupHeader("Advanced Protect", "Additional protection for key fund actions.")
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(icon = Icons.Outlined.Lock, label = "Fund Password", onClick = { comingSoon("Fund Password") }) {
            Text("Not Setup", color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        SecurityGroupHeader("Account access and management")
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(icon = Icons.Outlined.Lock, label = "Change Password", onClick = { comingSoon("Change Password") }) {}
          MyInfoRow(icon = Icons.Outlined.ScreenShare, label = "Trusted Devices", onClick = { comingSoon("Trusted Devices") }) {}
          // Moved here from Settings -> Data & Information.
          MyInfoRow(
            icon = Icons.Outlined.QueryStats,
            label = "Data Dashboard",
            onClick = { viewModel.closeAccountTabs(); viewModel.openDataDashboard() }
          ) {}
          MyInfoRow(icon = Icons.Outlined.Lock, label = "App Lock", onClick = { comingSoon("App Lock") }) {}
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Last login time 2026-08-06 22:06:13", color = Color.White.copy(alpha = 0.35f), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("Login device ", color = Color.White.copy(alpha = 0.35f), fontSize = 12.sp)
          Icon(Icons.Outlined.Smartphone, contentDescription = null, tint = Color.White.copy(alpha = 0.35f), modifier = Modifier.size(12.dp))
          Text(" android", color = Color.White.copy(alpha = 0.35f), fontSize = 12.sp)
        }
        Spacer(modifier = Modifier.height(20.dp))
      } else if (activeTab == "Preference") {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          // Moved here from Settings -> App, replacing the crypto-exchange
          // placeholder rows (Withdrawal Address/Manage Crypto Withdrawal
          // Limits/Route Deposits To) that never applied to ChatGiZa.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_haptics),
            label = "Haptics",
            onClick = { viewModel.closeAccountTabs(); viewModel.openHaptics() }
          ) {}
          MyInfoRow(
            iconContent = { c -> WidgetsIconCustom(tint = c, modifier = Modifier.size(20.dp)) },
            label = "Widgets",
            onClick = { viewModel.closeAccountTabs(); viewModel.openWidgets() }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_advanced),
            label = "Advanced",
            onClick = { viewModel.closeAccountTabs(); viewModel.openAdvanced() }
          ) {}
          // Moved here from Settings -> GiZa, which is being retired.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_customize_sparkle),
            label = "Customize GiZa",
            onClick = { viewModel.closeAccountTabs(); viewModel.openCustomize() }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connectors),
            label = "Connectors",
            onClick = { viewModel.closeAccountTabs(); viewModel.openConnectors() }
          ) {}
          MyInfoRow(icon = Icons.Outlined.Notifications, label = "Notification Settings", onClick = { comingSoon("Notification Settings") }) {}
          MyInfoRow(icon = Icons.Outlined.Email, label = "Email Subscriptions", onClick = { comingSoon("Email Subscriptions") }) {}
        }
        Spacer(modifier = Modifier.height(20.dp))
      } else if (activeTab == "General") {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(icon = Icons.Outlined.Language, label = "Language", onClick = { viewModel.closeAccountTabs(); viewModel.openAppLanguage() }) {
            Text("English", color = Color.White.copy(alpha = 0.4f), fontSize = 13.sp)
          }
          // Moved here from Settings -> Voice, which is being retired.
          MyInfoRow(
            icon = Icons.Outlined.GraphicEq,
            label = "Voice",
            onClick = { viewModel.closeAccountTabs(); viewModel.openVoice() }
          ) {}
          MyInfoRow(
            icon = Icons.Filled.LightMode,
            label = "Color Theme",
            // Opens AppearanceScreen's Theme section (a 2x2 grid of mini
            // previews). This was the "Appearance" row's duplicate entry
            // point too -- that one was dropped, this stays since it also
            // shows the current selection. Closes this dialog first, same
            // fix as Profile Picture above.
            onClick = {
              viewModel.closeAccountTabs()
              viewModel.openAppearance()
            }
          ) {
            Text(AppTheme.fromKey(viewModel.themeMode).label, color = Color.White.copy(alpha = 0.4f), fontSize = 13.sp)
          }
          // Help Center/User feedback/About Us/Terms of Use/Privacy Policy
          // all collapsed into the single "About Us" entry point (Profile
          // Hub's footer link), which now also lists Help Center and User
          // feedback alongside Terms/Privacy/Report a Problem -- see
          // AboutUsDialog.
          MyInfoRow(
            icon = Icons.AutoMirrored.Outlined.Article,
            label = "Open Source Licenses",
            onClick = { viewModel.closeAccountTabs(); viewModel.openOpenSourceLicenses() }
          ) {}
          MyInfoRow(
            icon = Icons.Outlined.Archive,
            label = "Storage management",
            // Data Controls now lives here instead of its own Settings row --
            // DataControlsScreen is rendered from the root screen switch, not
            // from within this dialog, so it has to close first (same fix as
            // Profile Picture/Appearance above).
            onClick = {
              viewModel.closeAccountTabs()
              viewModel.openDataControls()
            }
          ) {}
          MyInfoRow(icon = Icons.Outlined.ThumbUp, label = "Rate Our App", onClick = { comingSoon("Rate Our App") }) {}
        }
        Spacer(modifier = Modifier.height(20.dp))
      }
    }
    if (showNicknameEditor) {
      AlertDialog(
        onDismissRequest = { showNicknameEditor = false },
        title = { Text("Nickname") },
        text = {
          Column {
            OutlinedTextField(
              value = nicknameText,
              onValueChange = { nicknameText = it },
              singleLine = true,
              shape = RoundedCornerShape(12.dp)
            )
            // This becomes the account's real display name -- shown
            // everywhere userName is, ChatGiZa Media posts/profile
            // included, not just here.
            Text(
              "This is the name shown across your whole account.",
              color = Color.White.copy(alpha = 0.5f),
              fontSize = 12.sp,
              modifier = Modifier.padding(top = 8.dp)
            )
          }
        },
        confirmButton = {
          TextButton(onClick = {
            viewModel.updateUserName(nicknameText)
            showNicknameEditor = false
          }) {
            Text("Save", fontWeight = FontWeight.Bold)
          }
        },
        dismissButton = {
          TextButton(onClick = { showNicknameEditor = false }) {
            Text("Cancel")
          }
        }
      )
    }
  }
}

@Composable
private fun SecurityGroupHeader(title: String, subtitle: String? = null) {
  Column(modifier = Modifier.padding(bottom = 10.dp)) {
    Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    if (subtitle != null) {
      Spacer(modifier = Modifier.height(2.dp))
      Text(subtitle, color = Color.White.copy(alpha = 0.4f), fontSize = 12.sp)
    }
  }
}

@Composable
private fun MyInfoRow(
  icon: ImageVector? = null,
  painter: androidx.compose.ui.graphics.painter.Painter? = null,
  iconContent: (@Composable (Color) -> Unit)? = null,
  iconSize: androidx.compose.ui.unit.Dp = 20.dp,
  label: String,
  showChevron: Boolean = true,
  onClick: () -> Unit,
  trailing: @Composable RowScope.() -> Unit
) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    val tint = Color.White.copy(alpha = 0.8f)
    if (iconContent != null) {
      iconContent(tint)
    } else if (painter != null) {
      Icon(painter, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
    } else if (icon != null) {
      Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
    }
    Spacer(modifier = Modifier.width(14.dp))
    Text(label, color = Color.White, fontSize = 17.sp, modifier = Modifier.weight(1f))
    trailing()
    if (showChevron) {
      Spacer(modifier = Modifier.width(4.dp))
      Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White.copy(alpha = 0.4f), modifier = Modifier.size(18.dp))
    }
  }
}

@Composable
private fun MyInfoDivider() {
  HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
}

// Terms of Use / Privacy Policy / Report a Problem / Help Center / User
// feedback, all consolidated here -- the single "About Us" entry point
// (Profile Hub footer link) they're all reachable from now that the
// separate rows for each of these were removed from Account -> General.
@Composable
private fun AboutUsDialog(viewModel: ChatViewModel) {
  val context = LocalContext.current
  fun comingSoon(label: String) {
    Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show()
  }
  Dialog(
    onDismissRequest = { viewModel.closeAboutUs() },
    properties = DialogProperties(usePlatformDefaultWidth = false)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF000000))
        .statusBarsPadding()
        .padding(horizontal = 16.dp)
    ) {
      Spacer(modifier = Modifier.height(12.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { viewModel.closeAboutUs() }, modifier = Modifier.size(32.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
        }
        Spacer(modifier = Modifier.width(20.dp))
        Text("About Us", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      }

      Spacer(modifier = Modifier.height(28.dp))

      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(18.dp))
          .background(Color.White.copy(alpha = 0.06f))
          .padding(horizontal = 14.dp)
      ) {
        AboutUsRow(icon = Icons.AutoMirrored.Outlined.Article, label = "Terms of Use") {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/terms")))
        }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.Lock, label = "Privacy Policy") {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/privacy")))
        }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.ReportProblem, label = "Report a Problem") {
          viewModel.closeAboutUs()
          viewModel.openReportProblem()
        }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.HelpOutline, label = "Help Center") { comingSoon("Help Center") }
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.EditNote, label = "User feedback") { comingSoon("User feedback") }
      }
    }
  }
}

@Composable
private fun AboutUsRow(icon: ImageVector, label: String, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
    Spacer(modifier = Modifier.width(16.dp))
    Text(label, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
  }
}

// A curated set of simple black-circle + emoji avatars, standing in for
// full custom illustrations -- there's no art pipeline for those in
// this project, so this is a real (if visually simpler) equivalent: a
// genuinely pickable, saved-per-device set of distinct avatars rather
// than a single fixed photo. All people (not animals/fantasy
// characters) -- a broad, respectable, everyone-can-use-one set.
private data class AvatarPreset(val id: String, val emoji: String)

private val AVATAR_PRESETS = listOf(
  AvatarPreset("man", "👨"),
  AvatarPreset("woman", "👩"),
  AvatarPreset("person", "🧑"),
  AvatarPreset("old_man", "👴"),
  AvatarPreset("old_woman", "👵"),
  AvatarPreset("redhead_man", "👨‍🦰"),
  AvatarPreset("redhead_woman", "👩‍🦰"),
  AvatarPreset("curly_man", "👨‍🦱"),
  AvatarPreset("curly_woman", "👩‍🦱"),
  AvatarPreset("white_haired_man", "👨‍🦳"),
  AvatarPreset("white_haired_woman", "👩‍🦳"),
  AvatarPreset("bald_man", "👨‍🦲"),
  AvatarPreset("bald_woman", "👩‍🦲"),
  AvatarPreset("headscarf", "🧕"),
  AvatarPreset("turban_man", "👳‍♂️"),
  AvatarPreset("turban_woman", "👳‍♀️"),
  AvatarPreset("exec_man", "👨‍💼"),
  AvatarPreset("exec_woman", "👩‍💼"),
  AvatarPreset("grad_man", "👨‍🎓"),
  AvatarPreset("grad_woman", "👩‍🎓"),
  AvatarPreset("teacher", "🧑‍🏫"),
  AvatarPreset("doctor_man", "👨‍⚕️"),
  AvatarPreset("doctor_woman", "👩‍⚕️"),
  AvatarPreset("scientist", "🧑‍🔬"),
  AvatarPreset("farmer_man", "👨‍🌾"),
  AvatarPreset("farmer_woman", "👩‍🌾"),
  AvatarPreset("astronaut", "🧑‍🚀"),
  AvatarPreset("coder", "🧑‍💻")
)

@Composable
private fun AvatarPresetThumbnail(preset: AvatarPreset, size: Dp, modifier: Modifier = Modifier, name: String? = null) {
  Box(
    modifier = modifier
      .size(size)
      .clip(CircleShape)
      .background(Color(0xFF000000))
      .border(1.dp, Color.White.copy(alpha = 0.18f), CircleShape),
    contentAlignment = Alignment.Center
  ) {
    Text(preset.emoji, fontSize = (size.value * 0.6f).sp)
    // The custom avatar name, shown as a small label near the bottom of
    // the circle itself -- only worth showing at sizes big enough to
    // actually read it.
    if (!name.isNullOrBlank() && size >= 40.dp) {
      Text(
        name,
        color = Color.White,
        fontSize = (size.value * 0.16f).sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        textAlign = TextAlign.Center,
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .background(Color.Black.copy(alpha = 0.55f))
          .padding(vertical = 1.dp)
      )
    }
  }
}

@Composable
private fun AvatarPickerDialog(viewModel: ChatViewModel) {
  var selected by remember { mutableStateOf(viewModel.avatarPresetId ?: AVATAR_PRESETS.first().id) }
  var activeTab by remember { mutableStateOf("Default") }
  var nameInput by remember { mutableStateOf(viewModel.avatarName ?: "") }
  val context = LocalContext.current
  Dialog(
    onDismissRequest = { viewModel.closeAvatarPicker() },
    properties = DialogProperties(usePlatformDefaultWidth = false)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFF000000))
        .statusBarsPadding()
        .padding(horizontal = 16.dp)
    ) {
      Spacer(modifier = Modifier.height(12.dp))
      Box(modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = { viewModel.closeAvatarPicker() }, modifier = Modifier.align(Alignment.CenterStart).size(32.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
        }
        Text("Profile Picture", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
      }

      Spacer(modifier = Modifier.height(20.dp))
      val previewPreset = AVATAR_PRESETS.find { it.id == selected }
      Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        if (previewPreset != null) {
          AvatarPresetThumbnail(previewPreset, 88.dp, name = nameInput)
        } else if (viewModel.userImage != null) {
          AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(88.dp).clip(CircleShape))
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(88.dp))
        }
      }

      Spacer(modifier = Modifier.height(16.dp))
      // Shown on top of the avatar itself wherever it renders, e.g. "Boss".
      OutlinedTextField(
        value = nameInput,
        onValueChange = { if (it.length <= 20) nameInput = it },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Name your avatar (optional)", color = Color.White.copy(alpha = 0.4f)) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.White,
          unfocusedTextColor = Color.White,
          focusedBorderColor = Color.White.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
          cursorColor = Color.White
        )
      )

      Spacer(modifier = Modifier.height(20.dp))
      Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(24.dp)
      ) {
        // "Default" and "Animated" both use the same preset set for real
        // (Animated just plays a gentle bounce on them) -- "Animal
        // Avatar" and "bbSOL" are shown for the same reason a reference
        // tab row would have them, but there's no separate preset set
        // behind them yet.
        listOf("Default", "Animated 🔥", "Animal Avatar", "bbSOL").forEach { tab ->
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.clickable {
              if (tab == "Default" || tab == "Animated 🔥") activeTab = tab
              else Toast.makeText(context, "$tab — coming soon", Toast.LENGTH_SHORT).show()
            }
          ) {
            Text(
              tab,
              color = if (activeTab == tab) Color.White else Color.White.copy(alpha = 0.4f),
              fontSize = 15.sp,
              fontWeight = if (activeTab == tab) FontWeight.Bold else FontWeight.Normal
            )
            Spacer(modifier = Modifier.height(6.dp))
            if (activeTab == tab) {
              Box(modifier = Modifier.width(28.dp).height(2.dp).background(Color.White))
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.weight(1f).fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        items(AVATAR_PRESETS, key = { it.id }) { preset ->
          Box(contentAlignment = Alignment.BottomEnd) {
            val thumbModifier = (
              if (selected == preset.id) Modifier.border(2.dp, Color(0xFFFF9800), CircleShape).padding(3.dp)
              else Modifier
            ).clickable { selected = preset.id }
            if (activeTab == "Animated 🔥") {
              BouncingAvatarThumbnail(preset, 64.dp, thumbModifier)
            } else {
              AvatarPresetThumbnail(preset, 64.dp, thumbModifier)
            }
            if (selected == preset.id) {
              Box(
                modifier = Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFFF9800)),
                contentAlignment = Alignment.Center
              ) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(12.dp))
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(12.dp))
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(50))
          .background(Color(0xFFB8862E))
          .clickable {
            viewModel.updateAvatarPreset(selected, AVATAR_PRESETS.find { it.id == selected }?.emoji)
            viewModel.updateAvatarName(nameInput.trim().ifBlank { null })
            viewModel.closeAvatarPicker()
          }
          .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center
      ) {
        Text("Save", color = Color.Black, fontSize = 16.sp, fontWeight = FontWeight.Bold)
      }
      Spacer(modifier = Modifier.height(20.dp))
    }
  }
}

// Gently scales an avatar up and down forever -- used only for the
// "Animated" tab, which otherwise reuses the exact same preset set as
// "Default".
@Composable
private fun BouncingAvatarThumbnail(preset: AvatarPreset, size: Dp, modifier: Modifier = Modifier) {
  val transition = rememberInfiniteTransition(label = "avatarBounce")
  val scale by transition.animateFloat(
    initialValue = 0.9f,
    targetValue = 1.1f,
    animationSpec = infiniteRepeatable(
      animation = tween(850, easing = LinearEasing),
      repeatMode = RepeatMode.Reverse
    ),
    label = "scale"
  )
  AvatarPresetThumbnail(preset, size, modifier.graphicsLayer(scaleX = scale, scaleY = scale))
}

@Composable
private fun ProfileHubQuickCard(
  title: String,
  subtitle: String,
  modifier: Modifier = Modifier,
  onClick: () -> Unit,
  icon: @Composable (Color) -> Unit
) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = modifier
      .clip(RoundedCornerShape(16.dp))
      .background(Color(0xFF141414))
      .clickable(onClick = onClick)
      .padding(horizontal = 12.dp, vertical = 8.dp)
  ) {
    icon(Color.White)
    Spacer(modifier = Modifier.width(10.dp))
    Column {
      Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Text(subtitle, color = Color.White.copy(alpha = 0.5f), fontSize = 11.sp)
    }
  }
}

@Composable
private fun ProfileHubTrendingItem(label: String, onClick: () -> Unit, icon: @Composable (Color) -> Unit) {
  Column(
    horizontalAlignment = Alignment.CenterHorizontally,
    modifier = Modifier.clickable(onClick = onClick)
  ) {
    Box(
      modifier = Modifier.size(40.dp),
      contentAlignment = Alignment.Center
    ) {
      icon(Color.White)
    }
    Spacer(modifier = Modifier.height(4.dp))
    Text(label, color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
  }
}

@Composable
private fun MediaExpandGlyph(modifier: Modifier = Modifier, tint: Color = Color.White) {
  // Small diagonal-arrows "expand" cue -- hand-drawn since no Material
  // Icons entry was verified to exist in this project's bundled set and
  // guessing wrong here means another failed CI build.
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    val topArrow = Path().apply {
      moveTo(9f * scale, 4f * scale)
      lineTo(4f * scale, 4f * scale)
      lineTo(4f * scale, 9f * scale)
    }
    drawPath(topArrow, color = tint, style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round))
    drawLine(color = tint, start = Offset(5f * scale, 5f * scale), end = Offset(10.5f * scale, 10.5f * scale), strokeWidth = strokeW, cap = StrokeCap.Round)
    val bottomArrow = Path().apply {
      moveTo(15f * scale, 20f * scale)
      lineTo(20f * scale, 20f * scale)
      lineTo(20f * scale, 15f * scale)
    }
    drawPath(bottomArrow, color = tint, style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round))
    drawLine(color = tint, start = Offset(19f * scale, 19f * scale), end = Offset(13.5f * scale, 13.5f * scale), strokeWidth = strokeW, cap = StrokeCap.Round)
  }
}

// Matches the reference's reply composer: "Replying to @author", a
// multi-line field, and a row of icons (emoji/photo/AI are decorative
// placeholders for now -- foundation only, same as the rest of ChatGiZa
// Media's create menu) plus a working Reply button.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun MediaCommentComposerSheet(authorName: String, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
  var text by remember { mutableStateOf("") }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 28.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text("Replying to ", color = Color(0xFF8A8A8A), fontSize = 14.sp)
        Text("@$authorName", color = Color(0xFFFFC94A), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(12.dp))
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .heightIn(min = 100.dp)
          .clip(RoundedCornerShape(14.dp))
          .background(Color.White.copy(alpha = 0.05f))
          .padding(14.dp)
      ) {
        BasicTextField(
          value = text,
          onValueChange = { text = it },
          textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 15.sp, lineHeight = 20.sp),
          cursorBrush = SolidColor(Color(0xFFFFC94A)),
          modifier = Modifier.fillMaxSize(),
          decorationBox = { inner ->
            if (text.isEmpty()) {
              Text("Post your reply", color = Color(0xFF6E6E6E), fontSize = 15.sp)
            }
            inner()
          }
        )
        MediaExpandGlyph(
          modifier = Modifier.align(Alignment.TopEnd).size(18.dp),
          tint = Color.White.copy(alpha = 0.4f)
        )
      }
      Spacer(modifier = Modifier.height(16.dp))
      Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.08f)))
      Spacer(modifier = Modifier.height(14.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Outlined.EmojiEmotions, contentDescription = null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(18.dp))
        Icon(Icons.Outlined.Photo, contentDescription = null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(18.dp))
        Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.weight(1f))
        Button(
          onClick = {
            if (text.isNotBlank()) {
              onSubmit(text.trim())
              onDismiss()
            }
          },
          enabled = text.isNotBlank(),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFFFC94A),
            disabledContainerColor = Color(0xFFFFC94A).copy(alpha = 0.35f)
          ),
          shape = RoundedCornerShape(18.dp),
          contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp)
        ) {
          Text("Reply", color = Color.Black, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
      }
    }
  }
}

// ExoPlayer, not the platform VideoView/MediaPlayer -- the plain
// MediaPlayer frequently refuses phone-recorded MP4s whose moov atom sits
// at the end of the file with "Can't play this video", which ExoPlayer's
// own MP4 extractor handles fine via range-request seeking.
@Composable
internal fun MediaPostVideoPlayer(url: String, modifier: Modifier = Modifier) {
  val context = LocalContext.current
  val player = remember(url) {
    ExoPlayer.Builder(context).build().apply {
      setMediaItem(MediaItem.fromUri(url))
      prepare()
    }
  }
  DisposableEffect(player) {
    onDispose { player.release() }
  }
  AndroidView(
    modifier = modifier.background(Color.Black),
    factory = { ctx ->
      PlayerView(ctx).apply {
        this.player = player
        useController = true
        // Default RESIZE_MODE_FIT letterboxes with hard black bars whenever
        // the video's own aspect ratio doesn't match the post card's --
        // ZOOM crops to fill instead, matching how post images already
        // behave with ContentScale.Crop.
        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
      }
    }
  )
}

// "+" in ChatGiZa Media now opens this instead of a Post/Article/Video
// menu -- it's the permission gate for the Chat<->Extra Media bridge.
// Connecting only flips a local flag (ChatViewModel.chatGizaMediaConnected)
// that unlocks the "Push to Extra" action under substantial ChatGiZa
// replies in Chat (see MESSAGE_PUSH_TO_EXTRA_MIN_LENGTH) -- nothing is
// posted automatically just from connecting.
@Composable
private fun ConnectFeatureRow(icon: ImageVector, title: String, body: String) {
  ConnectFeatureRowShell(title, body) {
    Icon(icon, contentDescription = null, tint = Color(0xFFFFC94A), modifier = Modifier.size(18.dp))
  }
}

@Composable
private fun ConnectFeatureRow(painter: androidx.compose.ui.graphics.painter.Painter, title: String, body: String) {
  ConnectFeatureRowShell(title, body) {
    Icon(painter, contentDescription = null, tint = Color(0xFFFFC94A), modifier = Modifier.size(18.dp))
  }
}

@Composable
private fun ConnectFeatureRowShell(title: String, body: String, icon: @Composable () -> Unit) {
  Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
    Box(
      modifier = Modifier
        .size(36.dp)
        .clip(RoundedCornerShape(11.dp))
        .background(Color(0xFFFFC94A).copy(alpha = 0.14f)),
      contentAlignment = Alignment.Center
    ) {
      icon()
    }
    Spacer(modifier = Modifier.width(12.dp))
    Column {
      Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(body, color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp, lineHeight = 18.sp)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ConnectWithChatGizaSheet(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Box(
        modifier = Modifier
          .size(52.dp)
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFFFFC94A).copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share_link),
          contentDescription = null,
          tint = Color(0xFFFFC94A),
          modifier = Modifier.size(24.dp)
        )
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text("Connect With ChatGiZa", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "Ruhusu akaunti yako ya Extra kuingiliana moja kwa moja na ChatGiZa. Ukishaunganisha, " +
          "utaona chaguo la \"Extra\" chini ya majibu marefu ya ChatGiZa kwenye chat.",
        color = Color.White.copy(alpha = 0.75f),
        fontSize = 14.sp,
        lineHeight = 20.sp
      )
      Spacer(modifier = Modifier.height(6.dp))
      Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.08f)))
      ConnectFeatureRow(
        icon = Icons.Filled.Send,
        title = "Post",
        body = "Tuma barua, makala, au maandishi marefu moja kwa moja kwenye Extra Media -- ukitaka tu."
      )
      ConnectFeatureRow(
        icon = Icons.Outlined.Description,
        title = "Caption",
        body = "Ongeza maneno yako mwenyewe chini ya post kabla ya kutuma."
      )
      ConnectFeatureRow(
        icon = Icons.Outlined.Lock,
        title = "Hii ni hiari",
        body = "Maongezi ya kawaida (kama \"Habari\" au \"Mambo vipi\") hayapewi chaguo hili -- hakuna kinachotumwa bila wewe kubonyeza."
      )
      Spacer(modifier = Modifier.height(20.dp))
      if (viewModel.chatGizaMediaConnected) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(Icons.Filled.Check, contentDescription = null, tint = Color(0xFF16C784), modifier = Modifier.size(20.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text("Connected", color = Color(0xFF16C784), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedButton(
          onClick = { viewModel.updateChatGizaMediaConnected(false) },
          modifier = Modifier.fillMaxWidth().height(52.dp),
          shape = RoundedCornerShape(24.dp)
        ) {
          Text("Disconnect")
        }
      } else {
        Button(
          onClick = { viewModel.updateChatGizaMediaConnected(true) },
          modifier = Modifier.fillMaxWidth().height(52.dp),
          colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFC94A)),
          shape = RoundedCornerShape(24.dp)
        ) {
          Text("Connect", color = Color.Black, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Downscales/compresses a picked photo into a small base64 data URL --
// posts go through /api/media/posts as plain JSON (no blob storage
// provisioned yet), so a full-resolution photo would both blow past the
// request size the backend accepts and bloat every other user's feed load.
internal fun uriToPostImageDataUrl(context: android.content.Context, uri: Uri): String? {
  return try {
    val maxDim = 1080
    // Decoding a full camera-resolution photo straight to a Bitmap before
    // downscaling it could allocate a huge buffer and OOM before the
    // resize below ever ran. Reading the bounds first (no pixel data) to
    // pick an inSampleSize keeps the actual decode close to the target
    // size from the start.
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    var sampleSize = 1
    while (bounds.outWidth / (sampleSize * 2) >= maxDim || bounds.outHeight / (sampleSize * 2) >= maxDim) {
      sampleSize *= 2
    }
    val sampled = context.contentResolver.openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sampleSize })
    } ?: return null

    val scale = (maxDim.toFloat() / maxOf(sampled.width, sampled.height)).coerceAtMost(1f)
    val resized = if (scale < 1f) {
      Bitmap.createScaledBitmap(sampled, (sampled.width * scale).toInt(), (sampled.height * scale).toInt(), true)
    } else {
      sampled
    }
    val out = ByteArrayOutputStream()
    resized.compress(Bitmap.CompressFormat.JPEG, 80, out)
    val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    "data:image/jpeg;base64,$base64"
  } catch (e: Exception) {
    null
  } catch (e: OutOfMemoryError) {
    null
  }
}

// Composer's "Files" option. PDFs are rasterized to page images via the
// platform's built-in PdfRenderer (no extra PDF-parsing dependency) and
// sent as vision image parts -- the same path the backend already uses
// for scanned/image-only PDFs on the web -- rather than extracting an
// actual text layer, which would need a much heavier library.
private const val MAX_ATTACHED_FILE_PDF_PAGES = 8
private const val MAX_ATTACHED_FILE_TEXT_CHARS = 8000

private fun queryFileDisplayName(context: android.content.Context, uri: Uri): String {
  var name = "file"
  context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
    val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
    if (nameIndex >= 0 && cursor.moveToFirst()) {
      cursor.getString(nameIndex)?.let { name = it }
    }
  }
  return name
}

private fun readAttachedFile(context: android.content.Context, uri: Uri, displayName: String): AttachedFile? {
  val mime = context.contentResolver.getType(uri).orEmpty()
  val lowerName = displayName.lowercase()
  return when {
    mime == "application/pdf" || lowerName.endsWith(".pdf") -> renderPdfPagesAsAttachment(context, uri, displayName)
    mime.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv") -> {
      val raw = context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: return null
      val text = if (raw.length > MAX_ATTACHED_FILE_TEXT_CHARS) {
        raw.take(MAX_ATTACHED_FILE_TEXT_CHARS) + "\n[...truncated]"
      } else {
        raw
      }
      AttachedFile(name = displayName, text = text)
    }
    else -> null
  }
}

private fun renderPdfPagesAsAttachment(context: android.content.Context, uri: Uri, displayName: String): AttachedFile? {
  return try {
    context.contentResolver.openFileDescriptor(uri, "r")?.use { descriptor ->
      android.graphics.pdf.PdfRenderer(descriptor).use { renderer ->
        val dataUrls = mutableListOf<String>()
        var firstPageBitmap: Bitmap? = null
        val pageCount = minOf(renderer.pageCount, MAX_ATTACHED_FILE_PDF_PAGES)
        for (i in 0 until pageCount) {
          renderer.openPage(i).use { page ->
            val scale = 2
            val bitmap = Bitmap.createBitmap(
              (page.width * scale).coerceAtLeast(1),
              (page.height * scale).coerceAtLeast(1),
              Bitmap.Config.ARGB_8888
            )
            bitmap.eraseColor(android.graphics.Color.WHITE)
            page.render(bitmap, null, null, android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, out)
            dataUrls.add("data:image/jpeg;base64,${Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)}")
            if (i == 0) firstPageBitmap = bitmap
          }
        }
        if (dataUrls.isEmpty()) null else AttachedFile(name = displayName, imageDataUrls = dataUrls, previewBitmap = firstPageBitmap)
      }
    }
  } catch (e: Exception) {
    null
  } catch (e: OutOfMemoryError) {
    null
  }
}

// Reached via ChatGiZa Media's "+" -> Post. A real public post: text, an
// optional photo, and a bullish/neutral/bearish sentiment tag, submitted to
// /api/media/posts so it shows up in anyone's feed, not just this device's.
@Composable
internal fun ChatGizaMediaPostComposerScreen(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  BackHandler { onDismiss() }
  val context = LocalContext.current
  val composerScope = rememberCoroutineScope()
  var text by remember { mutableStateOf("") }
  var imageUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
  var videoUri by remember { mutableStateOf<Uri?>(null) }
  var sentiment by remember { mutableStateOf<String?>(null) }
  var posting by remember { mutableStateOf(false) }
  var openingCheckout by remember { mutableStateOf(false) }
  // A failed post used to fail completely silently -- the button just went
  // back to "Post" with nothing else happening, which read as "stuck" or
  // "not doing anything" rather than "failed, here's why."
  LaunchedEffect(Unit) {
    viewModel.clearMediaError()
    if (viewModel.billingSummary == null) viewModel.loadBilling()
  }
  val hasGizaPro = viewModel.billingSummary?.subscription != null
  val overFreeCaptionLimit = !hasGizaPro && text.length > MEDIA_POST_FREE_CAPTION_LIMIT

  val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
    if (uris.isNotEmpty()) {
      videoUri = null
      imageUris = (imageUris + uris).take(MEDIA_MAX_IMAGES_PER_POST)
    }
  }
  val videoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) {
      composerScope.launch {
        // Checked at pick time, not just at Post -- faster feedback than
        // silently uploading 40MB first and rejecting it after the fact.
        val durationMs = withContext(Dispatchers.IO) {
          val retriever = MediaMetadataRetriever()
          try {
            retriever.setDataSource(context, uri)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
          } catch (e: Exception) {
            null
          } finally {
            retriever.release()
          }
        }
        if (durationMs != null && durationMs > 60_000L) {
          viewModel.reportMediaError("Video must be 1 minute or shorter")
        } else {
          imageUris = emptyList()
          videoUri = uri
        }
      }
    }
  }

  val canPost = (text.isNotBlank() || imageUris.isNotEmpty() || videoUri != null) &&
    !posting && !viewModel.uploadingMediaVideo && !overFreeCaptionLimit

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
            posting = true
            composerScope.launch {
              val pickedImageUris = imageUris
              val dataUrls = withContext(Dispatchers.IO) {
                pickedImageUris.map { uri -> uriToPostImageDataUrl(context, uri) }
              }
              // A picked photo that failed to decode used to just vanish --
              // the post still went through without it, so it looked like
              // posting worked but the picture was silently dropped. Now a
              // decode failure blocks the post instead.
              if (pickedImageUris.isNotEmpty() && dataUrls.any { it == null }) {
                posting = false
                viewModel.reportMediaError("Couldn't attach one of those photos — try again")
                return@launch
              }
              val imageDataUrls = dataUrls.filterNotNull()

              val pickedVideoUri = videoUri
              var videoBytes: ByteArray? = null
              var videoMime: String? = null
              if (pickedVideoUri != null) {
                val mime = context.contentResolver.getType(pickedVideoUri) ?: "video/mp4"
                if (mime !in setOf("video/mp4", "video/webm", "video/quicktime")) {
                  posting = false
                  viewModel.reportMediaError("Video must be MP4, WebM, or MOV")
                  return@launch
                }
                val bytes = withContext(Dispatchers.IO) {
                  runCatching { context.contentResolver.openInputStream(pickedVideoUri)?.use { it.readBytes() } }.getOrNull()
                }
                if (bytes == null || bytes.size > 50 * 1024 * 1024) {
                  posting = false
                  viewModel.reportMediaError(if (bytes == null) "Couldn't read that video" else "Video must be under 50MB")
                  return@launch
                }
                videoBytes = bytes
                videoMime = mime
              }

              viewModel.createMediaPost(text.trim(), imageDataUrls, videoBytes, videoMime, sentiment) { success ->
                posting = false
                if (success) onDismiss()
              }
            }
          },
          enabled = canPost,
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFFFC94A),
            disabledContainerColor = Color(0xFFFFC94A).copy(alpha = 0.35f)
          ),
          shape = RoundedCornerShape(20.dp),
          contentPadding = PaddingValues(horizontal = 22.dp, vertical = 8.dp)
        ) {
          Text(
            if (viewModel.uploadingMediaVideo) "Uploading…" else if (posting) "Posting…" else "Post",
            color = Color.Black,
            fontWeight = FontWeight.SemiBold
          )
        }
      }
      if (viewModel.mediaError != null) {
        Text(
          viewModel.mediaError.orEmpty(),
          color = Color(0xFFEA3943),
          fontSize = 13.sp,
          modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
        )
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

        if (text.isNotEmpty()) {
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            "${text.length}/$MEDIA_POST_FREE_CAPTION_LIMIT",
            color = if (overFreeCaptionLimit) Color(0xFFEA3943) else Color(0xFF7A7A7A),
            fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth()
          )
        }

        if (overFreeCaptionLimit) {
          Spacer(modifier = Modifier.height(8.dp))
          Column(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(12.dp))
              .background(Color(0xFFFFC94A).copy(alpha = 0.1f))
              .padding(14.dp)
          ) {
            Text(
              "Captions over $MEDIA_POST_FREE_CAPTION_LIMIT characters need GiZa Pro.",
              color = Color.White,
              fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Button(
              onClick = {
                openingCheckout = true
                viewModel.startCheckout("starter") { url ->
                  openingCheckout = false
                  if (url != null) {
                    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                  } else {
                    viewModel.reportMediaError("Couldn't start checkout — try again")
                  }
                }
              },
              enabled = !openingCheckout,
              colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFC94A)),
              shape = RoundedCornerShape(20.dp),
              contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp)
            ) {
              Text(if (openingCheckout) "Opening…" else "Upgrade to GiZa Pro", color = Color.Black, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
          }
        }

        if (imageUris.isNotEmpty()) {
          Spacer(modifier = Modifier.height(16.dp))
          Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
          ) {
            imageUris.forEachIndexed { index, uri ->
              Box(modifier = Modifier.size(96.dp).clip(RoundedCornerShape(12.dp))) {
                AsyncImage(
                  model = uri,
                  contentDescription = "Attached photo ${index + 1}",
                  modifier = Modifier.fillMaxSize(),
                  contentScale = ContentScale.Crop
                )
                IconButton(
                  onClick = { imageUris = imageUris.toMutableList().also { it.removeAt(index) } },
                  modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.55f))
                ) {
                  Icon(Icons.Outlined.Close, contentDescription = "Remove photo", tint = Color.White, modifier = Modifier.size(14.dp))
                }
              }
            }
          }
        }

        if (videoUri != null) {
          Spacer(modifier = Modifier.height(16.dp))
          Box(
            modifier = Modifier
              .fillMaxWidth()
              .height(180.dp)
              .clip(RoundedCornerShape(16.dp))
              .background(Color.White.copy(alpha = 0.06f)),
            contentAlignment = Alignment.Center
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video),
                contentDescription = null,
                tint = Color(0xFFFFC94A),
                modifier = Modifier.size(20.dp)
              )
              Spacer(modifier = Modifier.width(8.dp))
              Text("Video attached", color = Color.White, fontSize = 14.sp)
            }
            IconButton(
              onClick = { videoUri = null },
              modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .size(30.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.55f))
            ) {
              Icon(Icons.Outlined.Close, contentDescription = "Remove video", tint = Color.White, modifier = Modifier.size(18.dp))
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
        IconButton(onClick = { videoPicker.launch("video/*") }, modifier = Modifier.size(30.dp)) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video),
            contentDescription = null,
            tint = Color(0xFFA8A8A8),
            modifier = Modifier.size(20.dp)
          )
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

// Built by hand instead of DropdownMenuItem -- its internal padding/
// icon-text spacing isn't exposed as configurable params, and this
// menu's spec calls for exact values (56dp row height, 24dp horizontal
// padding, 24dp icon-to-label gap) that don't match M3's defaults.
@Composable
private fun AttachMenuRow(iconRes: Int = 0, icon: (@Composable () -> Unit)? = null, label: String, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .height(56.dp)
      .clickable(onClick = onClick)
      .padding(horizontal = 24.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    if (icon != null) {
      icon()
    } else {
      Icon(
        painter = androidx.compose.ui.res.painterResource(iconRes),
        contentDescription = null,
        tint = Color.White,
        modifier = Modifier.size(24.dp)
      )
    }
    Spacer(modifier = Modifier.width(24.dp))
    Text(label, color = Color.White, fontSize = 15.sp)
  }
}

// Live Vision's Camera dropdown -- exact spec (72dp row height, 24dp
// icon, 28dp icon-to-label gap, 18sp label), same reasoning as
// AttachMenuRow for why this is hand-built instead of DropdownMenuItem.
@Composable
private fun CameraMenuRow(iconRes: Int, label: String, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .height(44.dp)
      .clickable(onClick = onClick),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(iconRes),
      contentDescription = null,
      tint = Color.White,
      modifier = Modifier.size(19.dp)
    )
    Spacer(modifier = Modifier.width(16.dp))
    Text(label, color = Color.White, fontSize = 16.sp)
  }
}

// One consistent gradient for every avatar now, not a different color per
// conversation -- a different color per row read as visually noisy/random
// rather than meaningful, and made the list harder to scan at a glance.
private val AVATAR_GRADIENT = listOf(Color(0xFF4A4D57), Color(0xFF2C2E35))

private fun avatarGradient(seed: String): List<Color> = AVATAR_GRADIENT

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

// Inbox-style: bold all-caps title, a short reply preview underneath, and
// a compact day+month date at top-right -- matches the SMS-inbox reference
// (name/number bold, message preview below, "14 May" at top-right) rather
// than the previous title-then-full-date layout.
@Composable
private fun HistoryRow(
  convo: ApiConversation,
  isVoice: Boolean,
  hapticsEnabled: Boolean,
  onClick: () -> Unit,
  onMenuClick: () -> Unit
) {
  val lastMessage = convo.messages.lastOrNull()
  val dateText = lastMessage?.createdAt?.let { formatHistoryRowDate(it) } ?: ""
  val lastReply = convo.messages.lastOrNull { it.role == "assistant" }?.content?.trim().orEmpty()
  val title = truncateTitle(convo.title.ifBlank { "New chat" })
  val displayTitle = if (isVoice) "VOICE" else title.uppercase()

  // Presses lift the row (translate up + a soft shadow) and settle back
  // down on release, instead of the row just sitting flat with no tactile
  // feedback before the options menu (or opening the conversation) fires.
  // The lift is deliberately large (not a subtle 2-3dp nudge) plus a real
  // vibration on press-down, so it reads as a clear physical response
  // rather than something easy to miss.
  val interactionSource = remember { MutableInteractionSource() }
  val isPressed by interactionSource.collectIsPressedAsState()
  val liftOffset by animateDpAsState(if (isPressed) (-14).dp else 0.dp, label = "historyRowLift")
  val liftElevation by animateDpAsState(if (isPressed) 18.dp else 0.dp, label = "historyRowElevation")
  val haptic = LocalHapticFeedback.current
  LaunchedEffect(isPressed) {
    if (isPressed && hapticsEnabled) {
      haptic.performHapticFeedback(HapticFeedbackType.LongPress)
    }
  }

  // No card background here by design — rows sit directly on the plain
  // background, matching the reference's BTC/CORE/MNT rows (no per-row
  // layer, just the content itself).
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .offset(y = liftOffset)
      .shadow(liftElevation, RoundedCornerShape(12.dp), clip = false)
      .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
      .padding(horizontal = 10.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier
        .size(34.dp)
        .border(1.dp, colorScheme.onBackground.copy(alpha = 0.35f), CircleShape)
        .padding(2.dp)
        .clip(CircleShape)
        .background(Brush.linearGradient(avatarGradient(convo.id))),
      contentAlignment = Alignment.Center
    ) {
      if (isVoice) {
        Icon(Icons.Outlined.Mic, contentDescription = "Voice", tint = Color.White, modifier = Modifier.size(16.dp))
      } else {
        Text(
          title.trim().take(1).uppercase(),
          color = Color.White,
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold
        )
      }
    }
    Spacer(modifier = Modifier.width(10.dp))
    Column(modifier = Modifier.weight(1f)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        if (convo.pinned) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_pin),
            contentDescription = "Pinned",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(12.dp)
          )
          Spacer(modifier = Modifier.size(5.dp))
        }
        Text(
          text = displayTitle,
          color = colorScheme.onBackground,
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
      }
      if (lastReply.isNotEmpty()) {
        Spacer(modifier = Modifier.height(2.dp))
        Text(
          lastReply,
          color = colorScheme.onBackground.copy(alpha = 0.55f),
          fontSize = 12.sp,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
      }
    }
    Spacer(modifier = Modifier.width(2.dp))
    Column(horizontalAlignment = Alignment.End) {
      if (dateText.isNotEmpty()) {
        Text(dateText, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 11.sp)
      }
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
}

// A "Your Agents" list (matches the reference screenshot: back/title,
// section label, a rounded "GiZa" row with an enable toggle, and a
// "Create" row below it). Deliberately just the outer shell for now --
// tapping either row is a stub (no per-agent editor screen yet, that's
// a later pass) -- the old nickname/display name/bio/about form that
// used to live on this screen is meant to move into that future
// per-agent editor; its ViewModel/API plumbing (nicknameInput,
// saveProfile(), etc.) is left untouched so nothing is lost, it's just
// not shown here anymore.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomizeScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeCustomize() }
  val context = LocalContext.current
  var giZaAgentEnabled by remember { mutableStateOf(true) }
  fun comingSoon(label: String) {
    Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show()
  }
  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("Customize", fontWeight = FontWeight.Bold) },
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
        "Your Agents",
        fontSize = 15.sp,
        color = colorScheme.onBackground.copy(alpha = 0.55f),
        modifier = Modifier.padding(bottom = 10.dp)
      )

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(18.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.06f))
          .clickable { comingSoon("GiZa") }
          .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(
              Brush.linearGradient(
                listOf(Color(0xFFB8452F), Color(0xFFE0A93A), Color(0xFF7A3B8A))
              )
            )
        )
        Spacer(modifier = Modifier.width(14.dp))
        Text(
          "GiZa",
          color = colorScheme.onBackground,
          fontSize = 16.sp,
          fontWeight = FontWeight.SemiBold,
          modifier = Modifier.weight(1f)
        )
        Switch(checked = giZaAgentEnabled, onCheckedChange = { giZaAgentEnabled = it })
      }

      Spacer(modifier = Modifier.height(12.dp))

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(18.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.06f))
          .clickable { comingSoon("Create agent") }
          .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(Icons.Filled.Add, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(14.dp))
        Text("Create", color = colorScheme.onBackground, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
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
        Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_logout), contentDescription = null, tint = Color(0xFFFF6B6B))
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

// Mini mockup of what the app roughly looks like under each theme --
// header bar, a row of icon dots, a search-style pill, a couple of text
// lines, then a small list where the last column carries the red/green
// accent colors the app itself uses (matching the reference design).
@Composable
private fun ThemeMockupPreview(bg: Color, panel: Color, modifier: Modifier = Modifier) {
  Box(
    modifier = modifier
      .aspectRatio(0.82f)
      .clip(RoundedCornerShape(18.dp))
      .background(bg)
      .padding(10.dp)
  ) {
    Column(modifier = Modifier.fillMaxSize()) {
      Box(modifier = Modifier.fillMaxWidth().height(22.dp).clip(RoundedCornerShape(6.dp)).background(panel))
      Spacer(modifier = Modifier.height(8.dp))
      Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(4) { Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(panel)) }
      }
      Spacer(modifier = Modifier.height(8.dp))
      Box(modifier = Modifier.fillMaxWidth().height(14.dp).clip(RoundedCornerShape(999.dp)).background(panel))
      Spacer(modifier = Modifier.height(6.dp))
      Box(modifier = Modifier.fillMaxWidth(0.55f).height(3.dp).clip(RoundedCornerShape(2.dp)).background(panel))
      Spacer(modifier = Modifier.weight(1f))
      val rowColors = listOf(Color(0xFFE0345C), Color(0xFF2ECC71), Color(0xFFE0345C))
      Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        rowColors.forEach { accent ->
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Box(modifier = Modifier.weight(1f).height(12.dp).clip(RoundedCornerShape(3.dp)).background(panel))
            Box(modifier = Modifier.weight(1f).height(12.dp).clip(RoundedCornerShape(3.dp)).background(panel))
            Box(modifier = Modifier.weight(1f).height(12.dp).clip(RoundedCornerShape(3.dp)).background(accent))
          }
        }
      }
    }
  }
}

@Composable
private fun ThemeCard(theme: AppTheme, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
  val borderColor by animateColorAsState(
    targetValue = if (selected) colorScheme.onBackground else Color.Transparent,
    animationSpec = tween(250),
    label = "themeCardBorder"
  )
  Column(
    modifier = modifier.clickable(onClick = onClick),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(20.dp))
        .border(2.dp, borderColor, RoundedCornerShape(20.dp))
        .background(colorScheme.onBackground.copy(alpha = 0.05f))
        .padding(6.dp)
    ) {
      when (theme) {
        AppTheme.LIGHT -> ThemeMockupPreview(bg = Color.White, panel = Color(0xFFEDEDED), modifier = Modifier.fillMaxWidth())
        AppTheme.DARK -> ThemeMockupPreview(bg = Color(0xFF161616), panel = Color(0xFF2E2E2E), modifier = Modifier.fillMaxWidth())
        AppTheme.FOR_YOU -> ThemeMockupPreview(bg = Color(0xFF2A2A2A), panel = Color(0xFF3F3F3F), modifier = Modifier.fillMaxWidth())
        AppTheme.SYSTEM ->
          Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp))) {
            ThemeMockupPreview(bg = Color.White, panel = Color(0xFFEDEDED), modifier = Modifier.weight(1f))
            ThemeMockupPreview(bg = Color(0xFF161616), panel = Color(0xFF2E2E2E), modifier = Modifier.weight(1f))
          }
      }
    }
    Spacer(modifier = Modifier.height(10.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
      Icon(theme.icon, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.7f), modifier = Modifier.size(15.dp))
      Spacer(modifier = Modifier.width(5.dp))
      Text(
        theme.label,
        color = colorScheme.onBackground,
        fontSize = 14.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        maxLines = 1
      )
    }
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
      Spacer(modifier = Modifier.height(14.dp))
      // Reference layout: a 2x2 grid of mini app-preview cards instead of
      // a single row of plain icon chips -- same 4 AppTheme entries and
      // the same updateThemeMode(theme.key) underneath, just a richer
      // preview of what each one actually looks like.
      val themeOrder = listOf(AppTheme.LIGHT, AppTheme.DARK, AppTheme.FOR_YOU, AppTheme.SYSTEM)
      Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        themeOrder.chunked(2).forEach { rowThemes ->
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            rowThemes.forEach { theme ->
              ThemeCard(
                theme = theme,
                selected = selectedTheme == theme,
                onClick = { viewModel.updateThemeMode(theme.key) },
                modifier = Modifier.weight(1f)
              )
            }
          }
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

      SettingsSwitchRow("Premium Voice for chat replies", viewModel.premiumChatVoiceEnabled) {
        viewModel.updatePremiumChatVoiceEnabled(!viewModel.premiumChatVoiceEnabled)
      }
      Text(
        "Real AI-generated speech (the voice picked below) instead of your device's built-in voice, when you tap " +
          "the speak icon on a reply.",
        color = colorScheme.onBackground.copy(alpha = 0.6f),
        fontSize = 12.sp,
        modifier = Modifier.padding(bottom = 16.dp)
      )

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

@Composable
private fun DashboardStatTile(label: String, value: String, modifier: Modifier = Modifier) {
  Column(
    modifier = modifier
      .clip(RoundedCornerShape(12.dp))
      .background(Color.White.copy(alpha = 0.06f))
      .padding(12.dp)
  ) {
    Text(value, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
    Spacer(modifier = Modifier.height(2.dp))
    Text(label, color = Color(0xFFA8A8A8), fontSize = 11.sp)
  }
}

// Idea #10: a personal data dashboard -- computed entirely from data
// already loaded on-device (conversations, memory, digital twin), no
// extra network call needed just to view it. Mirrors the web's
// Settings > Dashboard tab.
@Composable
private fun DataDashboardScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeDataDashboard() }
  val allMessages = remember(viewModel.conversations) { viewModel.conversations.flatMap { it.messages } }
  val userMessages = remember(allMessages) { allMessages.filter { it.role == "user" } }
  val assistantMessages = remember(allMessages) { allMessages.filter { it.role == "assistant" } }
  val wordsWritten = remember(userMessages) {
    userMessages.sumOf { m -> m.content.trim().split(Regex("\\s+")).count { it.isNotBlank() } }
  }
  val timestamps = remember(allMessages) { allMessages.mapNotNull { it.createdAt } }
  val firstMessageAt = timestamps.minOrNull()
  val lastMessageAt = timestamps.maxOrNull()
  val activeDayCount = remember(timestamps) {
    val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
    timestamps.map { fmt.format(java.util.Date(it)) }.toSet().size
  }
  val dateFmt = remember { java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault()) }

  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp)
    ) {
      DataControlsAppBar("Data Dashboard") { viewModel.closeDataDashboard() }
      Text(
        "A transparent look at what ChatGiZa actually holds about you.",
        color = Color(0xFFA8A8A8),
        fontSize = 13.sp,
        lineHeight = 18.sp,
        modifier = Modifier.padding(bottom = 20.dp)
      )

      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        DashboardStatTile("Conversations", viewModel.conversations.size.toString(), modifier = Modifier.weight(1f))
        DashboardStatTile("Messages sent", userMessages.size.toString(), modifier = Modifier.weight(1f))
        DashboardStatTile("Replies received", assistantMessages.size.toString(), modifier = Modifier.weight(1f))
      }
      Spacer(modifier = Modifier.height(10.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        DashboardStatTile("Words written", wordsWritten.toString(), modifier = Modifier.weight(1f))
        DashboardStatTile("Active days", activeDayCount.toString(), modifier = Modifier.weight(1f))
        DashboardStatTile("Memory facts", viewModel.profileData.memory.size.toString(), modifier = Modifier.weight(1f))
      }

      Spacer(modifier = Modifier.height(24.dp))
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(12.dp))
          .background(Color.White.copy(alpha = 0.06f))
          .padding(14.dp)
      ) {
        DashboardInfoRow("First message", firstMessageAt?.let { dateFmt.format(java.util.Date(it)) } ?: "—")
        Spacer(modifier = Modifier.height(10.dp))
        DashboardInfoRow("Most recent message", lastMessageAt?.let { dateFmt.format(java.util.Date(it)) } ?: "—")
        Spacer(modifier = Modifier.height(10.dp))
        DashboardInfoRow(
          "Digital Twin profile",
          if (viewModel.digitalTwin.isNotBlank()) "Generated · ${dateFmt.format(java.util.Date(viewModel.digitalTwinUpdatedAt))}" else "Not generated yet"
        )
      }

      Spacer(modifier = Modifier.height(24.dp))
      Text("Manage your data", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { viewModel.openDataControls() },
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Data controls & delete account", color = Color.White, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color(0xFFA8A8A8), modifier = Modifier.size(22.dp))
      }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

@Composable
private fun DashboardInfoRow(label: String, value: String) {
  Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
    Text(label, color = Color(0xFFA8A8A8), fontSize = 13.sp)
    Text(value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
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

// Every third-party library this build actually links against, taken
// straight from android/app/build.gradle -- kept as a plain hand list
// rather than a build-time license-scanning plugin (Google's
// oss-licenses-plugin) so this doesn't introduce a new Gradle plugin and
// its own failure mode into CI.
private data class OssLicenseEntry(val name: String, val license: String, val licenseUrl: String)

private val OSS_LICENSES = listOf(
  OssLicenseEntry("Kotlin Standard Library", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Kotlin Coroutines", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX AppCompat", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX CoordinatorLayout", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX Core SplashScreen", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Jetpack Compose UI & Graphics", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Jetpack Compose Material 3", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Material Icons (Core & Extended)", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX Activity Compose", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX Lifecycle (ViewModel, Runtime)", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX Security Crypto", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX Credentials", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Google Identity Services (Sign-In)", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("AndroidX CameraX (Core, Camera2, Lifecycle, View)", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("OkHttp", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Coil", "Apache License 2.0", "https://www.apache.org/licenses/LICENSE-2.0"),
  OssLicenseEntry("Capacitor Android", "MIT License", "https://opensource.org/licenses/MIT"),
  OssLicenseEntry("Capacitor Cordova Plugins", "MIT License", "https://opensource.org/licenses/MIT"),
  OssLicenseEntry("Google Play Services", "Google APIs Terms of Service", "https://developers.google.com/terms")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OpenSourceLicensesScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeOpenSourceLicenses() }
  val context = LocalContext.current
  Scaffold(
    containerColor = Color(0xFF181818),
    topBar = {
      TopAppBar(
        title = { Text("Open Source Licenses") },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeOpenSourceLicenses() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF181818))
      )
    }
  ) { padding ->
    LazyColumn(
      modifier = Modifier.fillMaxSize().padding(padding),
      contentPadding = PaddingValues(20.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      item {
        Text(
          "ChatGiZa is built with the following open source software.",
          color = Color(0xFFA8A8A8),
          fontSize = 13.sp,
          modifier = Modifier.padding(bottom = 6.dp)
        )
      }
      items(OSS_LICENSES) { entry ->
        Card(
          modifier = Modifier
            .fillMaxWidth()
            .clickable { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(entry.licenseUrl))) },
          shape = RoundedCornerShape(16.dp),
          colors = CardDefaults.cardColors(containerColor = Color(0xFF2F2F2F))
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Text(entry.name, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(entry.license, color = Color(0xFFA8A8A8), fontSize = 13.sp)
          }
        }
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

@Composable
private fun KidsModeScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeKidsMode() }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeKidsMode() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Kids Mode", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
    Spacer(Modifier.height(28.dp))
    HapticCard(
      icon = Icons.Outlined.ChildCare,
      title = "Enable Kids Mode",
      checked = viewModel.kidsModeEnabled,
      onCheckedChange = { viewModel.updateKidsModeEnabled(it) }
    )
  }
}

// Idea #7: real-time(ish) collaborative AI sessions -- this screen used
// to be a static "no shared links yet" placeholder with nothing behind
// it; it's now the entry point for starting or joining one.
@Composable
private fun SharedConversationsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeSharedConversations() }
  val context = LocalContext.current
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeSharedConversations() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Collaborative Chat", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
    Spacer(Modifier.height(20.dp))
    Text(
      text = "Chat with GiZa together with other people, live -- everyone in the session sees the same conversation and each other's messages.",
      color = Color(0xFFA8A8A8),
      fontSize = 13.sp,
      lineHeight = 18.sp
    )

    Spacer(Modifier.height(24.dp))
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(16.dp))
        .background(Color.White)
        .clickable { viewModel.startCollabSession() }
        .padding(vertical = 16.dp),
      contentAlignment = Alignment.Center
    ) {
      Text("Start a Collaborative Chat", color = Color.Black, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(Modifier.height(28.dp))
    Text("Join with a code", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(10.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
      OutlinedTextField(
        value = viewModel.collabJoinCodeInput,
        onValueChange = { viewModel.onCollabJoinCodeChange(it) },
        modifier = Modifier.weight(1f),
        placeholder = { Text("ABC123", color = Color.White.copy(alpha = 0.35f)) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.White,
          unfocusedTextColor = Color.White,
          focusedBorderColor = Color.White.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
          cursorColor = Color.White
        )
      )
      Spacer(Modifier.width(10.dp))
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(12.dp))
          .background(if (viewModel.collabJoinCodeInput.length >= 4) Color.White else Color.White.copy(alpha = 0.15f))
          .clickable(enabled = viewModel.collabJoinCodeInput.length >= 4) { viewModel.joinCollabSession() }
          .padding(horizontal = 20.dp, vertical = 14.dp)
      ) {
        Text(
          "Join",
          color = if (viewModel.collabJoinCodeInput.length >= 4) Color.Black else Color.White.copy(alpha = 0.4f),
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold
        )
      }
    }

    val error = viewModel.collabError
    if (error != null) {
      Spacer(Modifier.height(10.dp))
      Text(error, color = Color(0xFFFF6B6B), fontSize = 12.sp)
    }
  }
  // Fires the OS share sheet the moment a session is created, so the
  // code doesn't just sit unseen in a corner of the chat screen -- the
  // whole point of a code is to hand it to someone else.
  LaunchedEffect(viewModel.collabSession?.code) {
    val code = viewModel.collabSession?.code
    if (code != null && viewModel.screen is AppScreen.CollabChat) {
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, "Join my ChatGiZa collaborative chat — open the app, go to Collaborative Chat, and enter code: $code")
      }
      runCatching { context.startActivity(Intent.createChooser(intent, "Share join code")) }
    }
  }
}

@Composable
private fun CollabChatScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeCollabChat() }
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  val session = viewModel.collabSession
  val listState = rememberLazyListState()

  LaunchedEffect(session?.messages?.size) {
    val count = session?.messages?.size ?: 0
    if (count > 0) listState.animateScrollToItem(count - 1)
  }

  Column(modifier = Modifier.fillMaxSize().background(Color(0xFF000000)).statusBarsPadding()) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeCollabChat() }, modifier = Modifier.size(32.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(12.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text("Collaborative Chat", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        if (session != null) {
          Text(
            "${session.participants.size} in this chat",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 12.sp
          )
        }
      }
      if (session != null) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.White.copy(alpha = 0.1f))
            .clickable {
              clipboard.setText(AnnotatedString(session.code))
              Toast.makeText(context, "Code copied", Toast.LENGTH_SHORT).show()
            }
            .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
          Text(session.code, color = Color.White, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
          Spacer(Modifier.width(6.dp))
          Icon(Icons.Outlined.ContentCopy, contentDescription = "Copy code", tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
        }
      }
    }

    if (session != null && session.participants.size > 1) {
      Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
      ) {
        session.participants.forEach { p ->
          Text(
            p.name,
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 11.sp,
            modifier = Modifier
              .clip(RoundedCornerShape(50))
              .background(Color.White.copy(alpha = 0.06f))
              .padding(horizontal = 10.dp, vertical = 4.dp)
          )
        }
      }
      Spacer(Modifier.height(8.dp))
    }

    LazyColumn(
      state = listState,
      modifier = Modifier.weight(1f).fillMaxWidth(),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
      val myName = viewModel.userName?.takeIf { it.isNotBlank() } ?: "Someone"
      items(session?.messages.orEmpty(), key = { it.id }) { msg ->
        if (msg.role == "user") {
          Column(horizontalAlignment = Alignment.End, modifier = Modifier.fillMaxWidth()) {
            Text(
              if (msg.authorName == myName) "You" else (msg.authorName ?: "Someone"),
              color = Color.White.copy(alpha = 0.4f),
              fontSize = 11.sp,
              modifier = Modifier.padding(bottom = 2.dp, end = 4.dp)
            )
            Box(
              modifier = Modifier
                .clip(RoundedCornerShape(18.dp))
                .background(colorScheme.onBackground.copy(alpha = 0.1f))
                .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
              Text(msg.content, color = Color.White, fontSize = 15.sp)
            }
          }
        } else {
          Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp)) {
            MarkdownText(text = msg.content, baseColor = Color.White, fontSize = 15.sp)
          }
        }
      }
      if (viewModel.collabSending) {
        item {
          Text("GiZa is replying…", color = Color.White.copy(alpha = 0.4f), fontSize = 13.sp)
        }
      }
    }

    Row(
      modifier = Modifier
        .fillMaxWidth()
        .navigationBarsPadding()
        .imePadding()
        .padding(horizontal = 12.dp, vertical = 10.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      OutlinedTextField(
        value = viewModel.collabInput,
        onValueChange = { viewModel.onCollabInputChange(it) },
        modifier = Modifier.weight(1f),
        placeholder = { Text("Message the group…", color = Color.White.copy(alpha = 0.35f)) },
        shape = RoundedCornerShape(20.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.White,
          unfocusedTextColor = Color.White,
          focusedBorderColor = Color.White.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
          cursorColor = Color.White
        )
      )
      Spacer(Modifier.width(8.dp))
      Box(
        modifier = Modifier
          .size(44.dp)
          .clip(CircleShape)
          .background(if (viewModel.collabInput.isNotBlank() && !viewModel.collabSending) Color.White else Color.White.copy(alpha = 0.15f))
          .clickable(enabled = viewModel.collabInput.isNotBlank() && !viewModel.collabSending) { viewModel.sendCollabMessage() },
        contentAlignment = Alignment.Center
      ) {
        Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.Black, modifier = Modifier.size(18.dp))
      }
    }
  }
}

@Composable
private fun NsfwPreferencesScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeNsfwPreferences() }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeNsfwPreferences() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "NSFW Preferences", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
    Spacer(Modifier.height(10.dp))
    Text(
      text = "Control how ChatGiZa handles mature content.",
      color = Color(0xFFA8A8A8),
      fontSize = 13.sp
    )
    Spacer(Modifier.height(24.dp))
    HapticCard(
      icon = Icons.Outlined.NoAdultContent,
      title = "Blur mature images and video",
      checked = viewModel.blurMatureContentEnabled,
      onCheckedChange = { viewModel.updateBlurMatureContentEnabled(it) }
    )
  }
}

@Composable
private fun ConnectorsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeConnectors() }
  var query by remember { mutableStateOf("") }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF181818))
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeConnectors() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Connectors", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
    Spacer(Modifier.height(10.dp))
    Text(
      text = "Connectors let GiZa use external tools and data sources.",
      color = Color(0xFFA8A8A8),
      fontSize = 13.sp
    )
    Spacer(Modifier.height(20.dp))
    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .fillMaxWidth()
        .height(42.dp)
        .clip(RoundedCornerShape(21.dp))
        .background(Color.White.copy(alpha = 0.08f))
        .padding(horizontal = 14.dp)
    ) {
      Icon(Icons.Outlined.Search, contentDescription = null, tint = Color(0xFFA8A8A8), modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(8.dp))
      Box(modifier = Modifier.weight(1f)) {
        if (query.isEmpty()) {
          Text("Search connectors", color = Color(0xFF7A7A7A), fontSize = 14.sp)
        }
        BasicTextField(
          value = query,
          onValueChange = { query = it },
          singleLine = true,
          textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 14.sp),
          cursorBrush = SolidColor(Color.White),
          modifier = Modifier.fillMaxWidth()
        )
      }
    }
    Spacer(Modifier.height(24.dp))
    Text(text = "Featured", color = Color(0xFFA8A8A8), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
      Text("Coming soon", color = Color(0xFFA8A8A8), fontSize = 14.sp)
    }
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
      .statusBarsPadding()
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
      colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f))
    ) {
      Column(modifier = Modifier.padding(20.dp)) {
        Text(text = "Paste as File", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 16.sp)
        Spacer(Modifier.height(6.dp))
        Text(text = pasteAsFileModeLabel(viewModel.pasteAsFileMode), color = Color.Gray, fontSize = 13.sp)
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
      // This screen is retired -- every row it used to have (Edit Profile,
      // Customize GiZa, Connectors, Voice, Advertise/Collaborative Chat/
      // Data Dashboard, Data Controls, Open Source Licenses/Terms/Privacy,
      // Sign out, and everything moved before that) now lives in the
      // Account tabs dialog instead (Kids Mode and NSFW Preferences were
      // dropped outright, not moved). Nothing navigates to openAccount()
      // anymore -- the gear icon and the "Customize GiZa" quick action
      // both go elsewhere now -- so this is unreachable; kept only so
      // AppScreen.Account/openAccount/closeAccount don't need to be torn
      // out of the sealed class and back-stack logic elsewhere.
      Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Settings", color = colorScheme.onBackground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(40.dp))
      SettingsVersionFooter(viewModel)
      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

// Sideloaded (not Play Store), so there's no store page nudging people
// onto new builds -- this silently checks the same public GitHub Release
// the CI pipeline publishes, and only shows the "Update" link when it's
// actually ahead of this install's own versionCode.
@Composable
private fun SettingsVersionFooter(viewModel: ChatViewModel) {
  val context = LocalContext.current
  LaunchedEffect(Unit) { viewModel.checkForUpdate() }
  val latest = viewModel.latestVersionInfo
  val updateAvailable = latest != null && latest.runNumber > BuildConfig.VERSION_CODE
  Column(
    modifier = Modifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_chatgiza_logo),
        contentDescription = null,
        tint = Color.Unspecified,
        modifier = Modifier.size(18.dp)
      )
      Spacer(modifier = Modifier.width(8.dp))
      Text(
        "v${BuildConfig.VERSION_NAME}",
        color = colorScheme.onBackground.copy(alpha = 0.4f),
        fontSize = 13.sp,
        fontFamily = FontFamily.Monospace
      )
    }
    if (updateAvailable) {
      Spacer(modifier = Modifier.height(6.dp))
      Row {
        Text("New Version is Available: ", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
        Text(
          "Update",
          color = colorScheme.onBackground.copy(alpha = 0.85f),
          fontSize = 13.sp,
          textDecoration = TextDecoration.Underline,
          modifier = Modifier.clickable {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(latest!!.downloadUrl)))
          }
        )
      }
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
  painter: androidx.compose.ui.graphics.painter.Painter? = null,
  iconContent: (@Composable (Color) -> Unit)? = null,
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
    if (iconContent != null) {
      iconContent(contentColor)
      Spacer(modifier = Modifier.width(16.dp))
    } else if (painter != null) {
      Icon(painter, contentDescription = null, tint = contentColor, modifier = Modifier.size(22.dp))
      Spacer(modifier = Modifier.width(16.dp))
    } else if (icon != null) {
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
      SettingsSwitchRow("Document Writer", data.plugins.documentWriter) { viewModel.togglePlugin("document_writer") }
      SettingsSwitchRow("SQL Helper", data.plugins.sqlHelper) { viewModel.togglePlugin("sql_helper") }
      SettingsSwitchRow("Python Helper", data.plugins.pythonHelper) { viewModel.togglePlugin("python_helper") }
      SettingsSwitchRow("Business Assistant", data.plugins.businessAssistant) { viewModel.togglePlugin("business_assistant") }
      SettingsSwitchRow("AI Agent", data.plugins.aiAgent) { viewModel.togglePlugin("ai_agent") }
      SettingsSwitchRow("Digital Twin", data.plugins.digitalTwin) { viewModel.togglePlugin("digital_twin") }

      Spacer(modifier = Modifier.height(20.dp))
      SettingsSectionTitle("Digital Twin profile")
      Text(
        "A synthesized profile of your voice, interests, and values -- used by Digital Twin mode to answer as you.",
        color = colorScheme.onBackground.copy(alpha = 0.5f),
        fontSize = 12.sp,
        modifier = Modifier.padding(bottom = 8.dp)
      )
      OutlinedTextField(
        value = viewModel.digitalTwinInput,
        onValueChange = viewModel::onDigitalTwinInputChange,
        placeholder = { Text("Nothing generated yet -- tap Regenerate, or write your own.") },
        minLines = 4,
        maxLines = 8,
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.White,
          unfocusedTextColor = Color.White,
          focusedBorderColor = Color.White.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
          cursorColor = Color.White
        )
      )
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          if (viewModel.digitalTwinUpdatedAt > 0) {
            "Last updated " + java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
              .format(java.util.Date(viewModel.digitalTwinUpdatedAt))
          } else "Never generated",
          color = colorScheme.onBackground.copy(alpha = 0.4f),
          fontSize = 11.sp,
          modifier = Modifier.weight(1f)
        )
        TextButton(onClick = { viewModel.saveDigitalTwin() }, enabled = !viewModel.savingDigitalTwin) {
          Text(if (viewModel.savingDigitalTwin) "Saving…" else "Save")
        }
        TextButton(onClick = { viewModel.regenerateDigitalTwin() }, enabled = !viewModel.digitalTwinRegenerating) {
          Text(if (viewModel.digitalTwinRegenerating) "Generating…" else "Regenerate from my chats")
        }
      }

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

private data class MockTaskCard(val emoji: String, val title: String, val description: String)

private val MOCK_TASK_CARDS = listOf(
  MockTaskCard("📖", "Weekend long read", "Every Saturday, find me an exceptional recent long read based on my interests"),
  MockTaskCard("🏷️", "Sale monitor", "Watch my favorite stores and let me know when there's a good sale"),
  MockTaskCard("🎵", "Concert alerts", "Let me know when artists I like announce concerts near me"),
  MockTaskCard("🎉", "Weekend ideas", "Every Thursday, send me ideas for things to do nearby this weekend")
)

private fun Modifier.dashedBorder(color: Color, cornerRadius: Dp, strokeWidth: Dp = 1.dp): Modifier = this.drawBehind {
  drawRoundRect(
    color = color,
    cornerRadius = CornerRadius(cornerRadius.toPx(), cornerRadius.toPx()),
    style = Stroke(
      width = strokeWidth.toPx(),
      pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 7f), 0f)
    )
  )
}

// Static mockup matching the reference screenshot (top bar with
// back/title/"Chat" subtitle/filter, dashed task cards, bottom "Create a
// task" bar) -- tapping a card sends its prompt as a real chat message
// and, for the tasks with one, opens that task's own preference wizard.
// It deliberately does NOT create a Scheduled-tasks entry or remove the
// card from the list -- an earlier pass added that and it was reverted
// per explicit correction, this is simpler on purpose.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduledScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeScheduled() }
  Scaffold(
    containerColor = Color.Transparent,
    topBar = {
      Row(
        modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(
          onClick = { viewModel.closeScheduled() },
          modifier = Modifier.size(44.dp).clip(CircleShape).background(colorScheme.onBackground.copy(alpha = 0.08f))
        ) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground)
        }
        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
          Text("Tasks", color = colorScheme.onBackground, fontSize = 17.sp, fontWeight = FontWeight.Bold)
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Chat", color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
            Icon(
              Icons.Outlined.KeyboardArrowDown,
              contentDescription = null,
              tint = colorScheme.onBackground.copy(alpha = 0.5f),
              modifier = Modifier.size(16.dp)
            )
          }
        }
        IconButton(
          onClick = {},
          modifier = Modifier.size(44.dp).clip(CircleShape).background(colorScheme.onBackground.copy(alpha = 0.08f))
        ) {
          FilterIconCustom(tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
        }
      }
    },
    bottomBar = {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .navigationBarsPadding()
          .padding(16.dp)
          .height(52.dp)
          .clip(RoundedCornerShape(26.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.08f))
          .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          "Create a task",
          color = colorScheme.onBackground.copy(alpha = 0.5f),
          fontSize = 15.sp,
          modifier = Modifier.weight(1f)
        )
        Icon(Icons.Filled.Mic, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f))
      }
    }
  ) { padding ->
    // Dismiss the keyboard the instant any task is tapped -- it must not
    // linger open (and cover the wizard) just because the composer below
    // happened to have focus from earlier typing.
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    LazyColumn(
      modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp),
      contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp)
    ) {
      items(MOCK_TASK_CARDS) { task ->
        // The whole card is clickable, not just the small "+" -- a
        // much easier target to hit than a 28dp icon button alone.
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .dashedBorder(colorScheme.onBackground.copy(alpha = 0.25f), cornerRadius = 20.dp)
            .clickable {
              focusManager.clearFocus()
              keyboardController?.hide()
              viewModel.closeScheduled()
              viewModel.startTaskExample(task.title, task.description, hasWizard = task.title in TASK_WIZARDS)
            }
            .padding(16.dp)
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(task.emoji, fontSize = 17.sp)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              task.title,
              color = colorScheme.onBackground,
              fontSize = 16.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier.weight(1f)
            )
            Icon(Icons.Filled.Add, contentDescription = "Use this task", tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
          }
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            task.description,
            color = colorScheme.onBackground.copy(alpha = 0.6f),
            fontSize = 14.sp,
            lineHeight = 20.sp
          )
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
        var openingPortal by remember { mutableStateOf(false) }
        Button(
          onClick = {
            openingPortal = true
            viewModel.fetchBillingPortalUrl { url ->
              openingPortal = false
              if (url != null) {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
              }
            }
          },
          enabled = !openingPortal,
          shape = RoundedCornerShape(24.dp),
          modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
          Text(if (openingPortal) "Opening..." else "Manage billing")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          "Opens Stripe's secure billing portal in your browser to change plan, cards, or cancel.",
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

// Compact "14 May" form for the History row's top-right date, matching the
// reference inbox layout -- formatDate's "MMM d, yyyy" is used elsewhere
// (e.g. billing) where the year actually matters.
private fun formatHistoryRowDate(millis: Long): String {
  val fmt = java.text.SimpleDateFormat("d MMM", java.util.Locale.getDefault())
  return fmt.format(java.util.Date(millis))
}

private data class QuickAction(val type: String, val value: String, val label: String)

// android.util.Patterns' regexes are the same ones Android's own Linkify
// uses -- well-tested, not hand-rolled. Capped and deduplicated so a
// message with lots of numbers doesn't turn into a wall of chips.
private fun extractQuickActions(text: String): List<QuickAction> {
  if (text.isBlank()) return emptyList()
  val actions = mutableListOf<QuickAction>()

  val phoneMatcher = android.util.Patterns.PHONE.matcher(text)
  while (phoneMatcher.find() && actions.count { it.type == "call" } < 2) {
    val raw = phoneMatcher.group()
    val digits = raw.filter { it.isDigit() }
    if (digits.length in 7..15) {
      actions.add(QuickAction("call", raw.trim(), raw.trim()))
    }
  }

  val emailMatcher = android.util.Patterns.EMAIL_ADDRESS.matcher(text)
  while (emailMatcher.find() && actions.count { it.type == "email" } < 2) {
    actions.add(QuickAction("email", emailMatcher.group(), emailMatcher.group()))
  }

  val urlMatcher = android.util.Patterns.WEB_URL.matcher(text)
  while (urlMatcher.find() && actions.count { it.type == "url" } < 2) {
    val raw = urlMatcher.group()
    actions.add(QuickAction("url", raw, raw.removePrefix("https://").removePrefix("http://").take(28)))
  }

  return actions.take(4)
}

@Composable
private fun MessageQuickActionChip(action: QuickAction) {
  val context = LocalContext.current
  val (icon, prefix) = when (action.type) {
    "call" -> Icons.Outlined.Call to "Call"
    "email" -> Icons.Outlined.Email to "Email"
    else -> Icons.Outlined.OpenInNew to "Open"
  }
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier
      .clip(RoundedCornerShape(50))
      .background(colorScheme.onBackground.copy(alpha = 0.08f))
      .clickable {
        val intent = when (action.type) {
          "call" -> Intent(Intent.ACTION_DIAL, Uri.parse("tel:${action.value}"))
          "email" -> Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${action.value}"))
          else -> Intent(Intent.ACTION_VIEW, Uri.parse(if (action.value.startsWith("http")) action.value else "https://${action.value}"))
        }
        runCatching { context.startActivity(intent) }
      }
      .padding(horizontal = 12.dp, vertical = 7.dp)
  ) {
    Icon(icon, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.7f), modifier = Modifier.size(14.dp))
    Spacer(modifier = Modifier.width(6.dp))
    Text("$prefix ${action.label}", color = colorScheme.onBackground.copy(alpha = 0.8f), fontSize = 12.sp, maxLines = 1)
  }
}

// Idea #8: a "Verified Source Trail" -- structured url_citation data the
// backend pulls from OpenAI's search-preview model (real pages it actually
// searched) rather than links the model typed into its own prose, which it
// can invent. The backend appends it as a [[SOURCES_START]]...[[SOURCES_END]]
// JSON marker block at the very end of the stream (mirrors the web client's
// src/lib/sourceMarkers.ts and the pre-existing [[PDF_START]] convention).
private data class VerifiedSource(val url: String, val title: String)

private val SOURCES_BLOCK_RE = Regex("\\[\\[SOURCES_START]]([\\s\\S]*?)\\[\\[SOURCES_END]]")
private val SOURCES_PARTIAL_RE = Regex("\\n?\\[\\[SOURCES_START]][\\s\\S]*$")

private fun extractSources(text: String): List<VerifiedSource> {
  val match = SOURCES_BLOCK_RE.find(text) ?: return emptyList()
  return runCatching {
    val arr = org.json.JSONArray(match.groupValues[1])
    (0 until arr.length()).mapNotNull { i ->
      val obj = arr.optJSONObject(i) ?: return@mapNotNull null
      val url = obj.optString("url", "")
      val title = obj.optString("title", "")
      if (url.isNotBlank() && title.isNotBlank()) VerifiedSource(url, title) else null
    }
  }.getOrDefault(emptyList())
}

// Strips the marker block whether it's already closed, or still streaming
// in (opened but no closing tag yet) -- it's always appended last, so
// there's nothing worth keeping after the opening tag either way.
private fun stripSourceMarkers(text: String): String {
  return text.replace(SOURCES_BLOCK_RE, "").replace(SOURCES_PARTIAL_RE, "")
}

private fun sourceDomain(url: String): String {
  return runCatching { Uri.parse(url).host?.removePrefix("www.") ?: url }.getOrDefault(url)
}

@Composable
private fun SourceTrail(sources: List<VerifiedSource>) {
  val context = LocalContext.current
  var expanded by remember(sources) { mutableStateOf(sources.size <= 3) }
  val shown = if (expanded) sources else sources.take(3)
  Column(
    modifier = Modifier
      .padding(horizontal = 12.dp, vertical = 4.dp)
      .widthIn(max = 320.dp)
      .clip(RoundedCornerShape(14.dp))
      .background(colorScheme.onBackground.copy(alpha = 0.06f))
      .padding(12.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
      Icon(Icons.Outlined.Verified, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
      Spacer(modifier = Modifier.width(6.dp))
      Text(
        "Verified source trail",
        color = colorScheme.onBackground.copy(alpha = 0.85f),
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.weight(1f)
      )
      Text(
        "${sources.size} ${if (sources.size == 1) "source" else "sources"}",
        color = colorScheme.onBackground.copy(alpha = 0.4f),
        fontSize = 11.sp
      )
    }
    Spacer(modifier = Modifier.height(6.dp))
    shown.forEach { source ->
      Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(8.dp))
          .clickable {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(source.url))) }
          }
          .padding(vertical = 5.dp)
      ) {
        AsyncImage(
          model = "https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(source.url)}",
          contentDescription = null,
          modifier = Modifier.size(16.dp).clip(RoundedCornerShape(3.dp))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          source.title,
          color = colorScheme.onBackground.copy(alpha = 0.9f),
          fontSize = 12.sp,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
          sourceDomain(source.url),
          color = colorScheme.onBackground.copy(alpha = 0.35f),
          fontSize = 10.sp,
          maxLines = 1
        )
      }
    }
    if (sources.size > 3) {
      Text(
        if (expanded) "Show fewer" else "Show all ${sources.size}",
        color = colorScheme.onBackground.copy(alpha = 0.45f),
        fontSize = 11.sp,
        modifier = Modifier
          .fillMaxWidth()
          .clickable { expanded = !expanded }
          .padding(top = 4.dp)
      )
    }
  }
}

@Composable
private fun MessageBubble(
  message: UiMessage,
  showActions: Boolean,
  isSpeaking: Boolean,
  chatGizaMediaConnected: Boolean,
  extraAuthorName: String,
  extraAuthorImage: String?,
  onSpeakToggle: () -> Unit,
  onRegenerate: () -> Unit,
  onDelete: () -> Unit,
  onPushToExtra: (caption: String?, destination: String, onDone: (Boolean) -> Unit) -> Unit
) {
  val isUser = message.role == "user"
  // Idea #8: the model's own content may end with a [[SOURCES_START]]...
  // [[SOURCES_END]] marker block (see extractSources/stripSourceMarkers
  // above) -- keep the parsed sources and the display text derived from
  // the same snapshot of message.content so they never disagree.
  val cleanContent = remember(message.content) { stripSourceMarkers(message.content) }
  val verifiedSources = remember(message.content) { extractSources(message.content) }
  Column(modifier = Modifier.fillMaxWidth()) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
      if (isUser) {
        Box(
          modifier = Modifier
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.1f))
            .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
          Text(
            text = cleanContent.ifEmpty { "…" },
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium
          )
        }
      } else {
        Box(
          modifier = Modifier
            .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
          MarkdownText(
            text = cleanContent.ifEmpty { "…" },
            baseColor = Color.White,
            fontSize = 15.sp
          )
        }
      }
    }
    if (!isUser && verifiedSources.isNotEmpty()) {
      SourceTrail(verifiedSources)
    }
    // Idea #5, the safe version: real device automation without an
    // AccessibilityService reading/tapping arbitrary screens (that class
    // of "AI controls your phone" tool is the same mechanism spyware
    // uses to steal credentials, and Google Play restricts it heavily).
    // Instead, phone numbers/emails/links found in the message become
    // one-tap buttons that open the correct native app (Dialer, Email,
    // Browser) with the target already filled in -- the AI takes the
    // real action of finding and preparing it, the human still presses
    // the final call/send/confirm in that app.
    // Idea #6: a short, shared, copyable ID for this question/answer pair
    // -- falls back to deriving one from the message's own id for
    // messages saved before this existed, so every message shows one.
    val displayPairId = message.pairId.ifBlank { "Q-" + message.id.replace("-", "").take(6).uppercase() }
    val pairIdClipboard = LocalClipboardManager.current
    val pairIdContext = LocalContext.current
    Text(
      "ID: $displayPairId",
      color = colorScheme.onBackground.copy(alpha = 0.3f),
      fontSize = 10.sp,
      fontFamily = FontFamily.Monospace,
      modifier = Modifier
        .padding(horizontal = 12.dp)
        .clickable {
          pairIdClipboard.setText(AnnotatedString(displayPairId))
          Toast.makeText(pairIdContext, "Copied $displayPairId", Toast.LENGTH_SHORT).show()
        }
    )
    val quickActions = remember(cleanContent) { extractQuickActions(cleanContent) }
    if (quickActions.isNotEmpty()) {
      Row(
        modifier = Modifier
          .padding(horizontal = 12.dp, vertical = 4.dp)
          .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        quickActions.forEach { action -> MessageQuickActionChip(action) }
      }
    }
    // On-device translation (idea #4) -- kept separate from the message's
    // own content so the original is never edited/lost, just shown or
    // hidden alongside it. Detects Swahili vs English and flips to the
    // other one, running entirely on the phone.
    var translatedText by remember(message.id) { mutableStateOf<String?>(null) }
    var translating by remember(message.id) { mutableStateOf(false) }
    var translateError by remember(message.id) { mutableStateOf(false) }
    val translateScope = rememberCoroutineScope()
    if (translatedText != null || translating || translateError) {
      Box(modifier = Modifier.padding(horizontal = 12.dp)) {
        Column(
          modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.06f))
            .padding(12.dp)
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Language, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.5f), modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              if (translating) "Translating on-device…" else if (translateError) "Translation failed" else "On-device translation",
              color = colorScheme.onBackground.copy(alpha = 0.5f),
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium
            )
          }
          if (translatedText != null) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(translatedText ?: "", color = colorScheme.onBackground, fontSize = 14.sp)
          }
        }
      }
    }
    if (message.content.isNotBlank() && showActions) {
      Spacer(modifier = Modifier.height(4.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        MessageActionBar(
          message = message,
          isUser = isUser,
          isSpeaking = isSpeaking,
          chatGizaMediaConnected = chatGizaMediaConnected,
          extraAuthorName = extraAuthorName,
          extraAuthorImage = extraAuthorImage,
          onSpeakToggle = onSpeakToggle,
          onRegenerate = onRegenerate,
          onDelete = onDelete,
          onPushToExtra = onPushToExtra,
          onTranslate = {
            if (translatedText != null) {
              translatedText = null
            } else if (!translating) {
              translating = true
              translateError = false
              translateScope.launch {
                val result = OnDeviceTranslator.translate(cleanContent)
                translating = false
                result.onSuccess { translatedText = it }.onFailure { translateError = true }
              }
            }
          }
        )
      }
    }
  }
}

@Composable
private fun ActionBarItem(icon: ImageVector, label: String, tint: Color = Color(0xFFA8A8A8), onClick: () -> Unit) {
  ActionBarItemShell(label, tint, onClick) { iconTint ->
    Icon(icon, contentDescription = label, tint = iconTint, modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun ActionBarItem(
  painter: androidx.compose.ui.graphics.painter.Painter,
  label: String,
  tint: Color = Color(0xFFA8A8A8),
  rotation: Float = 0f,
  size: Dp = 20.dp,
  onClick: () -> Unit
) {
  ActionBarItemShell(label, tint, onClick) { iconTint ->
    Icon(painter, contentDescription = label, tint = iconTint, modifier = Modifier.size(size).rotate(rotation))
  }
}

@Composable
private fun ActionBarItemShell(label: String, tint: Color, onClick: () -> Unit, icon: @Composable (Color) -> Unit) {
  // label is kept as the icon's accessibility contentDescription even
  // though it's no longer shown as visible text underneath.
  Box(
    modifier = Modifier
      .size(34.dp)
      .clip(RoundedCornerShape(10.dp))
      .clickable(onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    icon(tint)
  }
}

// Below this length a reply reads as ordinary conversation ("Habari",
// "Mambo vipi", a quick answer) rather than something worth publishing --
// "Extra" only shows up for replies that look like an actual generated
// document/letter/article, not every back-and-forth line.
private const val MESSAGE_PUSH_TO_EXTRA_MIN_LENGTH = 150

@Composable
private fun MessageActionBar(
  message: UiMessage,
  isUser: Boolean,
  isSpeaking: Boolean,
  chatGizaMediaConnected: Boolean,
  extraAuthorName: String,
  extraAuthorImage: String?,
  onSpeakToggle: () -> Unit,
  onRegenerate: () -> Unit,
  onDelete: () -> Unit,
  onPushToExtra: (caption: String?, destination: String, onDone: (Boolean) -> Unit) -> Unit,
  onTranslate: () -> Unit
) {
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  // Copy/Share/PDF/Extra all deal in reader-facing text -- never leak the
  // raw [[SOURCES_START]] JSON marker block into any of them.
  val cleanContent = remember(message.content) { stripSourceMarkers(message.content) }
  var reaction by remember(message.id) { mutableStateOf<String?>(null) }
  var moreOpen by remember { mutableStateOf(false) }
  var pushState by remember(message.id) { mutableStateOf("idle") } // idle | pushing | pushed
  // none -> "options" (Post/Caption choice) -> either straight to "preview"
  // (Post) or via "caption" (write one, then preview) -- Post always shows
  // the preview before it actually goes out, so a wrong-looking reply can
  // be caught before it's public instead of after.
  var extraStage by remember(message.id) { mutableStateOf("none") }
  var pendingCaption by remember(message.id) { mutableStateOf<String?>(null) }
  val accent = Color(0xFF2979FF)

  fun push(caption: String?, destination: String) {
    if (pushState == "idle") {
      pushState = "pushing"
      onPushToExtra(caption, destination) { success ->
        pushState = if (success) "pushed" else "idle"
        Toast.makeText(
          context,
          if (success) "Sent to Extra Media" else "Couldn't send — try again",
          Toast.LENGTH_SHORT
        ).show()
        if (success) extraStage = "none"
      }
    }
  }

  Row(
    modifier = Modifier.horizontalScroll(rememberScrollState()),
    horizontalArrangement = Arrangement.spacedBy(2.dp)
  ) {
    ActionBarItemShell("Copy", Color(0xFFA8A8A8), onClick = {
      clipboard.setText(AnnotatedString(cleanContent))
    }) { tint -> CopyIconCustom(tint = tint, modifier = Modifier.size(22.dp)) }
    ActionBarItem(Icons.Outlined.Language, "Translate on-device", onClick = onTranslate)
    if (cleanContent.length >= MESSAGE_PUSH_TO_EXTRA_MIN_LENGTH) {
      ActionBarExtraItem(
        label = if (pushState == "pushed") "Sent" else "Extra",
        tint = if (pushState == "pushed") accent else Color(0xFFA8A8A8),
        connected = chatGizaMediaConnected,
        onNotConnected = {
          Toast.makeText(
            context,
            "Connect ChatGiZa with Extra Media first — Extra > + > Connect With ChatGiZa",
            Toast.LENGTH_LONG
          ).show()
        },
        onOpen = { extraStage = "options" }
      )
    }
    // Read Aloud/Stop is available on the user's own messages too (not just
    // AI replies) -- lets them hear a message spoken back in the selected
    // voice to check pronunciation, e.g. for Kiswahili/Sheng.
    if (isSpeaking) {
      ActionBarItem(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_stop),
        label = "Stop",
        tint = accent,
        onClick = onSpeakToggle
      )
    } else {
      ActionBarItemShell("Read Aloud", Color(0xFFA8A8A8), onClick = onSpeakToggle) { tint ->
        SpeakerIconCustom(tint = tint, modifier = Modifier.size(20.dp))
      }
    }
    if (!isUser) {
      ActionBarItem(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_thumbs_up),
        label = "Like",
        tint = if (reaction == "up") accent else Color(0xFFA8A8A8)
      ) { reaction = if (reaction == "up") null else "up" }
      ActionBarItem(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_thumbs_up),
        label = "Dislike",
        tint = if (reaction == "down") accent else Color(0xFFA8A8A8),
        rotation = 180f
      ) { reaction = if (reaction == "down") null else "down" }
      ActionBarItem(androidx.compose.ui.res.painterResource(R.drawable.ic_share), "Share") {
        val intent = Intent(Intent.ACTION_SEND).apply {
          type = "text/plain"
          putExtra(Intent.EXTRA_TEXT, cleanContent)
        }
        context.startActivity(Intent.createChooser(intent, null))
      }
      ActionBarItem(Icons.Outlined.PictureAsPdf, "PDF") {
        runCatching {
          val file = generateReplyPdf(context, "ChatGiZa reply", cleanContent)
          val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
          val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
          context.startActivity(Intent.createChooser(intent, null))
        }
      }
      ActionBarItem(androidx.compose.ui.res.painterResource(R.drawable.ic_regenerate), "Regenerate", size = 18.dp, onClick = onRegenerate)
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

  when (extraStage) {
    "options" -> ExtraOptionsSheet(
      onDismiss = { extraStage = "none" },
      onPost = { pendingCaption = null; extraStage = "preview" },
      onCaption = { extraStage = "caption" }
    )
    "caption" -> CaptionComposerSheet(
      onDismiss = { extraStage = "none" },
      onSubmit = { caption -> pendingCaption = caption; extraStage = "preview" }
    )
    "preview" -> ExtraPostPreviewSheet(
      authorName = extraAuthorName,
      authorImage = extraAuthorImage,
      bodyText = cleanContent,
      caption = pendingCaption,
      posting = pushState == "pushing",
      onDismiss = { extraStage = "none" },
      onEdit = { extraStage = if (pendingCaption != null) "caption" else "options" },
      onConfirm = { destination -> push(pendingCaption, destination) }
    )
  }
}

// "Extra" between Copy and Like. A single icon with a small dropdown-arrow
// badge in the corner (instead of two icons crammed side by side) opens
// the full-size ExtraOptionsSheet below -- tapping while not connected
// skips it entirely and tells the user to connect first, rather than the
// option silently not being there.
@Composable
private fun ActionBarExtraItem(label: String, tint: Color, connected: Boolean, onNotConnected: () -> Unit, onOpen: () -> Unit) {
  Box(
    modifier = Modifier
      .size(48.dp)
      .clip(RoundedCornerShape(14.dp))
      .clickable { if (connected) onOpen() else onNotConnected() },
    contentAlignment = Alignment.Center
  ) {
    Icon(Icons.Filled.Send, contentDescription = label, tint = tint, modifier = Modifier.size(20.dp))
    Box(
      modifier = Modifier
        .align(Alignment.BottomEnd)
        .padding(2.dp)
        .size(14.dp)
        .clip(CircleShape)
        .background(colorScheme.background),
      contentAlignment = Alignment.Center
    ) {
      Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = tint, modifier = Modifier.size(14.dp))
    }
  }
}

// Reached via the "Extra" icon -- a bigger, full-weight sheet (matching
// the size of a real share sheet) instead of a cramped dropdown, offering
// the same two choices: "Post" goes straight to the preview step, straight
// through preview before it actually posts; "Caption" collects a caption
// first, then also lands on the preview.
@Composable
private fun ExtraOptionRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
  ExtraOptionRowShell(title, subtitle, onClick) {
    Icon(icon, contentDescription = null, tint = Color(0xFFFFC94A), modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun ExtraOptionRow(painter: androidx.compose.ui.graphics.painter.Painter, title: String, subtitle: String, onClick: () -> Unit) {
  ExtraOptionRowShell(title, subtitle, onClick) {
    Icon(painter, contentDescription = null, tint = Color(0xFFFFC94A), modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun ExtraOptionRowShell(title: String, subtitle: String, onClick: () -> Unit, icon: @Composable () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(18.dp))
      .background(Color.White.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(16.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(Color(0xFFFFC94A).copy(alpha = 0.14f)),
      contentAlignment = Alignment.Center
    ) {
      icon()
    }
    Spacer(modifier = Modifier.width(14.dp))
    Column(modifier = Modifier.weight(1f)) {
      Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(subtitle, color = Color.White.copy(alpha = 0.55f), fontSize = 13.sp, lineHeight = 17.sp)
    }
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraOptionsSheet(onDismiss: () -> Unit, onPost: () -> Unit, onCaption: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Text("Send to Extra Media", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "Choose how this reply goes to your Extra profile. You'll see exactly how it looks before it's sent.",
        color = Color.White.copy(alpha = 0.6f),
        fontSize = 14.sp,
        lineHeight = 19.sp
      )
      Spacer(modifier = Modifier.height(20.dp))
      ExtraOptionRow(
        icon = Icons.Filled.Send,
        title = "Post",
        subtitle = "Send this reply to Extra Media as-is.",
        onClick = onPost
      )
      Spacer(modifier = Modifier.height(10.dp))
      ExtraOptionRow(
        icon = Icons.Outlined.Description,
        title = "Caption",
        subtitle = "Write your own caption first, then review together.",
        onClick = onCaption
      )
    }
  }
}

// The step that actually matters: shows the reply (and caption, if any)
// laid out the way it'll actually appear on Extra Media -- avatar, name,
// body text -- so something that reads wrong can be caught with "Edit"
// instead of only being noticed after it's already public.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraDestinationChip(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .background(if (selected) Color(0xFFFFC94A) else Color.White.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(vertical = 12.dp),
    contentAlignment = Alignment.Center
  ) {
    Text(
      label,
      color = if (selected) Color.Black else Color.White.copy(alpha = 0.8f),
      fontSize = 13.sp,
      fontWeight = FontWeight.SemiBold
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraPostPreviewSheet(
  authorName: String,
  authorImage: String?,
  bodyText: String,
  caption: String?,
  posting: Boolean,
  onDismiss: () -> Unit,
  onEdit: () -> Unit,
  onConfirm: (destination: String) -> Unit
) {
  // Some people only ever want this in Status, others only want it kept in
  // their permanent History, others want both -- so every push asks,
  // rather than guessing one behavior for everyone. "post" here means
  // History/the main feed, matching the backend's `destination` column.
  var destination by remember { mutableStateOf("post") }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Text("Preview", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(
        "This is how it'll look on Extra Media.",
        color = Color.White.copy(alpha = 0.6f),
        fontSize = 14.sp
      )
      Spacer(modifier = Modifier.height(18.dp))
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(20.dp))
          .background(Color.White.copy(alpha = 0.05f))
          .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(20.dp))
          .padding(18.dp)
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          if (authorImage != null) {
            AsyncImage(
              model = authorImage,
              contentDescription = "Profile",
              modifier = Modifier.size(38.dp).clip(CircleShape),
              contentScale = ContentScale.Crop
            )
          } else {
            Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(38.dp))
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(authorName, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text("Just now", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
          }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
          if (bodyText.length > 400) bodyText.take(400) + "…" else bodyText,
          color = Color.White.copy(alpha = 0.9f),
          fontSize = 14.sp,
          lineHeight = 20.sp
        )
        if (!caption.isNullOrBlank()) {
          Spacer(modifier = Modifier.height(10.dp))
          Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.08f)))
          Spacer(modifier = Modifier.height(10.dp))
          Text(
            caption,
            color = Color.White.copy(alpha = 0.75f),
            fontSize = 14.sp,
            lineHeight = 20.sp,
            fontStyle = FontStyle.Italic
          )
        }
      }
      Spacer(modifier = Modifier.height(20.dp))
      Text("Where should this go?", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ExtraDestinationChip("History", destination == "post", Modifier.weight(1f)) { destination = "post" }
        ExtraDestinationChip("Both", destination == "both", Modifier.weight(1f)) { destination = "both" }
        ExtraDestinationChip("Status", destination == "status", Modifier.weight(1f)) { destination = "status" }
      }
      Spacer(modifier = Modifier.height(20.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedButton(
          onClick = onEdit,
          enabled = !posting,
          modifier = Modifier.weight(1f).height(52.dp),
          shape = RoundedCornerShape(24.dp)
        ) {
          Text("Edit")
        }
        Button(
          onClick = { onConfirm(destination) },
          enabled = !posting,
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFFFC94A),
            disabledContainerColor = Color(0xFFFFC94A).copy(alpha = 0.5f)
          ),
          shape = RoundedCornerShape(24.dp),
          modifier = Modifier.weight(1f).height(52.dp)
        ) {
          Text(if (posting) "Posting…" else "Post to Extra", color = Color.Black, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Reached via "Extra" -> "Caption": a short caption the user writes
// themselves, which lands under the reply's own text when posted to
// Extra Media (ChatViewModel.pushReplyToExtraMedia builds the combined
// text; this sheet only collects the caption itself). Bigger and more
// explanatory than a bare text box -- an icon badge, a heading, and a
// line explaining what happens on submit, closer to the rest of the
// app's sheets (e.g. ConnectWithChatGizaSheet) than the plain composer
// this replaced.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CaptionComposerSheet(onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
  var text by remember { mutableStateOf("") }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Color(0xFF161616)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Box(
        modifier = Modifier
          .size(52.dp)
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFFFFC94A).copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(Icons.Filled.Send, contentDescription = null, tint = Color(0xFFFFC94A), modifier = Modifier.size(24.dp))
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text("Add a caption", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "This reply becomes the post; what you write below is added underneath it on your Extra Media profile.",
        color = Color.White.copy(alpha = 0.6f),
        fontSize = 14.sp,
        lineHeight = 19.sp
      )
      Spacer(modifier = Modifier.height(18.dp))
      Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(
          modifier = Modifier
            .weight(1f)
            .heightIn(min = 56.dp, max = 110.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
          if (text.isEmpty()) {
            Text("Write a caption for this post…", color = Color(0xFF6E6E6E), fontSize = 15.sp)
          }
          BasicTextField(
            value = text,
            onValueChange = { text = it },
            textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 15.sp, lineHeight = 20.sp),
            cursorBrush = SolidColor(Color(0xFFFFC94A)),
            modifier = Modifier.fillMaxWidth()
          )
        }
        IconButton(
          onClick = { if (text.isNotBlank()) onSubmit(text.trim()) },
          enabled = text.isNotBlank(),
          modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(if (text.isNotBlank()) Color(0xFFFFC94A) else Color(0xFFFFC94A).copy(alpha = 0.35f))
        ) {
          Icon(Icons.Filled.Send, contentDescription = "Send", tint = Color.Black, modifier = Modifier.size(22.dp))
        }
      }
      Spacer(modifier = Modifier.height(14.dp))
      OutlinedButton(
        onClick = onDismiss,
        modifier = Modifier.fillMaxWidth().height(46.dp),
        shape = RoundedCornerShape(24.dp)
      ) {
        Text("Cancel")
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
        is MdBlock.Paragraph -> Text(text = inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium)
        is MdBlock.Bullet -> Row {
          Text("•  ", color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        }
        is MdBlock.Numbered -> Row {
          Text("${block.index}.  ", color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
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

