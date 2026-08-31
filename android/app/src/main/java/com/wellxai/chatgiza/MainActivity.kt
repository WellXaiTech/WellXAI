package com.wellxai.chatgiza

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.MediaMetadataRetriever
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
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
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.Crossfade
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
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
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
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
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.gestures.detectTransformGestures
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
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Typography
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.outlined.Computer
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
import androidx.compose.material.icons.outlined.Phone
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
import androidx.compose.material.icons.outlined.TextFields
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.SideEffect
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
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.Velocity
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
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.items
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialException
import coil.compose.AsyncImage
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Locale
import kotlin.math.roundToInt
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

private const val GOOGLE_WEB_CLIENT_ID =
  "302265706031-imsr5i7elinlqkdcjfv3sgicuul1m39g.apps.googleusercontent.com"

// AppCompatActivity instead of the plain ComponentActivity this used to be
// -- needed for supportFragmentManager, which MaterialDatePicker/
// MaterialTimePicker (DialogFragments) require to show. Matches the app's
// own manifest theme (AppTheme already descends from Theme.AppCompat), so
// this doesn't change how the window itself is themed; Compose's setContent
// works the same on any ComponentActivity subclass.
class MainActivity : AppCompatActivity() {
  private lateinit var viewModel: ChatViewModel

  // Screenshot -> "Share a link to chat?" prompt (Android 14+ only).
  // Registered in onStart/unregistered in onStop per Android's own
  // guidance, rather than once in onCreate.
  private var screenCaptureCallback: Activity.ScreenCaptureCallback? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Was .dark(...) (light icons for a dark app background) from when the
    // whole app was dark-themed. Now that everything is forced to the
    // light scheme, dark-style icons on a light background made the system
    // fall back to a protective gray scrim behind the status bar instead
    // of blending with the app's own white -- that's the visible "seam" at
    // the top of every screen. .light(...) matches dark icons to the light
    // background so the transparent bar actually reads as transparent.
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
    )
    super.onCreate(savedInstanceState)
    viewModel = ChatViewModel(TokenStore(applicationContext))
    handleShareIntent(intent)

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
      ChatGizaTheme(themeMode = viewModel.themeMode, fontChoice = viewModel.fontChoice) {
        // Wrapped in a Box so the screenshot-triggered "Share a link to
        // chat?" prompt can float above whichever screen is showing,
        // instead of being wired into every individual screen separately.
        // Same Box also owns the app-wide tap-to-dismiss-keyboard behavior:
        // a tap anywhere that isn't consumed by a child first (a button, a
        // text field's own click-to-focus, a scroll drag, a bottom sheet in
        // its own window) reaches here and clears focus, which closes the
        // keyboard -- covers every screen from one place instead of the
        // per-screen pointerInput this used to need.
        val rootFocusManager = LocalFocusManager.current
        Box(
          Modifier
            .fillMaxSize()
            .pointerInput(Unit) { detectTapGestures(onTap = { rootFocusManager.clearFocus() }) }
        ) {
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
            screen is AppScreen.History || screen is AppScreen.Settings ||
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
                DismissibleDrawerSheet(drawerContainerColor = Color(0xFFFFF3E5)) {
                  HistoryScreen(viewModel)
                }
              }
            ) {
              when (screen) {
                is AppScreen.Media -> com.wellxai.chatgiza.ui.media.ChatGiZaMediaScreen(viewModel)
                is AppScreen.Settings -> SettingsScreen(viewModel)
                is AppScreen.Projects -> ProjectsScreen(viewModel)
                is AppScreen.Scheduled -> ScheduledScreen(viewModel)
                is AppScreen.LiveVision -> LiveVisionScreen(viewModel)
                is AppScreen.PrivateChat -> PrivateChatScreen(viewModel)
                else -> ChatScreenUi(viewModel)
              }
            }
            return@Surface
          }
          // Fade instead of the instant swap this used to be -- every screen
          // routed through here (Appearance/"Color Theme" included) used to
          // pop in/out with no transition at all, which read as an abrupt
          // flash rather than a normal back navigation. tween(220) matches
          // Android's own default activity-transition length.
          //
          // BUT: any row inside User Center (Mobile, Email, Nickname,
          // Language, Color Theme, ...) leaves ProfileHub via
          // leaveAccountTabsFor(), which sets screen to the sub-screen AND
          // closes AccountTabsDialog (now a plain root-level composable,
          // not a real Dialog -- see its own comment) in the very same call.
          // The dialog vanishes on the SAME frame the fade starts, so an
          // animated transition OUT of ProfileHub has nothing left covering
          // it for the ~200ms the fade is still running, and ProfileHub's
          // "Unlock GiZa Pro Perks" banner flashes through underneath. The
          // reverse direction (sub-screen closing back to ProfileHub) has no
          // such gap -- returnToAccountTabsIfPending() reopens the dialog
          // BEFORE screen changes, so it's already covering the animation
          // from frame one. So: only transitions LEAVING ProfileHub skip
          // the animation; everything else, including the return trip, still
          // fades normally.
          AnimatedContent(
            targetState = viewModel.screen,
            transitionSpec = {
              if (initialState is AppScreen.ProfileHub) {
                EnterTransition.None togetherWith ExitTransition.None
              } else {
                fadeIn(tween(220)) togetherWith fadeOut(tween(180))
              }
            },
            label = "screenTransition"
          ) { screen ->
          when (screen) {
            is AppScreen.Loading -> LoadingScreen()
            is AppScreen.SignedOut -> SignedOutScreen(
              viewModel = viewModel,
              onSignIn = ::startGoogleSignIn
            )
            is AppScreen.Chat -> ChatScreenUi(viewModel)
            is AppScreen.History -> HistoryScreen(viewModel)
            is AppScreen.PrivateChat -> PrivateChatScreen(viewModel)
            is AppScreen.Customize -> CustomizeScreen(viewModel)
            is AppScreen.EditProfile -> EditProfileScreen(viewModel)
            is AppScreen.AppLanguage -> AppLanguageScreen(viewModel)
            is AppScreen.Advanced -> AdvancedScreen(viewModel)
            is AppScreen.Appearance -> AppearanceScreen(viewModel)
            is AppScreen.FontChoice -> FontChoiceScreen(viewModel)
            is AppScreen.Voice -> VoiceScreen(viewModel)
            is AppScreen.ReportProblem -> ReportProblemScreen(viewModel)
            is AppScreen.Widgets -> WidgetsScreen(viewModel)
            is AppScreen.Haptics -> HapticsScreen(viewModel)
            is AppScreen.DataControls -> DataControlsScreen(viewModel)
            is AppScreen.DataDashboard -> DataDashboardScreen(viewModel)
            is AppScreen.AccountSettings -> AccountSettingsScreen(viewModel)
            is AppScreen.SwitchAccount -> SwitchAccountScreen(viewModel)
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
            is AppScreen.Community -> CommunityScreen(viewModel)
            is AppScreen.TrustedDevices -> TrustedDevicesScreen(viewModel)
            is AppScreen.StorageManagement -> StorageManagementScreen(viewModel)
            is AppScreen.ChangePassword -> ChangePasswordScreen(viewModel)
            is AppScreen.MobileNumber -> MobileNumberScreen(viewModel)
            is AppScreen.ChangeEmail -> ChangeEmailScreen(viewModel)
            is AppScreen.Nickname -> NicknameScreen(viewModel)
            is AppScreen.TwoFactorSetup -> TwoFactorSetupScreen(viewModel)
            is AppScreen.TotpLoginVerify -> TotpLoginVerifyScreen(viewModel)
            is AppScreen.PasskeyLoginConfirm -> PasskeyLoginConfirmScreen(viewModel, onConfirm = ::confirmPasskeyLogin)
            is AppScreen.AppLockSetup -> AppLockSetupScreen(viewModel)
            is AppScreen.PasskeysManage -> PasskeysManageScreen(viewModel, onAddPasskey = ::startPasskeyRegistration)
            is AppScreen.SubaccountSettings -> SubaccountSettingsScreen(viewModel)
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
            is AppScreen.ShareTarget -> ShareTargetPickerScreen(viewModel)
          }
          }
        }
        // Root-level, not screen-gated -- see the comment on
        // AccountTabsDialog's definition for why (avoids a Dialog-window-
        // creation flash of whatever's behind it on every return trip).
        if (viewModel.showAccountTabs) {
          AccountTabsDialog(viewModel)
        }
        ScreenshotShareOverlay(viewModel)
        PreferenceWizardOverlay(viewModel)
        MemorySuggestionOverlay(viewModel)
        // Drawn last so it's on top of literally everything else -- blocks
        // the whole app behind a PIN prompt regardless of which screen was
        // showing when armAppLockIfEnabled() re-armed it.
        if (viewModel.appLockGateActive) {
          AppLockGateScreen(viewModel)
        }
        }
      }
    }
  }

  // MainActivity is singleTask, so a share arriving while the app is
  // already running comes through here instead of a fresh onCreate.
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleShareIntent(intent)
  }

  // Picks up "Share" from another app's system Share sheet (an image or a
  // PDF/text file via ACTION_SEND) and hands it to the ViewModel, which
  // opens ShareTargetPickerScreen so the user chooses which conversation
  // it lands in. Ignored while signed out -- there's no conversation list
  // to pick from yet, and forcing the picker open would strand them there.
  private fun handleShareIntent(intent: Intent?) {
    if (intent == null || intent.action != Intent.ACTION_SEND) return
    if (viewModel.userId == null) return
    val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
    }
    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
    viewModel.receiveShareIntent(uri, text)
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
    // Re-arms App Lock every time the app leaves the foreground (not just
    // on cold start), so anyone else picking up an already-open phone
    // still hits the PIN gate on return.
    viewModel.armAppLockIfEnabled()
    super.onStop()
  }

  // One combined Credential Manager request instead of Google and passkey
  // sign-in being two separate buttons/flows -- Credential Manager's own
  // picker offers a saved passkey (if this account registered one under
  // Security > Passkeys) alongside Google accounts in the same sheet, so a
  // single "Google" tap surfaces whichever the person actually has.
  private fun startGoogleSignIn() {
    viewModel.onSignInStart()
    val googleIdOption = GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(false)
      .setServerClientId(GOOGLE_WEB_CLIENT_ID)
      .build()

    lifecycleScope.launch {
      // Fetching passkey options needs a network round trip; Google's
      // option doesn't. If that fetch fails for any reason, sign-in still
      // proceeds with Google alone rather than blocking on it.
      val passkeyOptions = ChatGizaApi.passkeyLoginOptions()
      val requestBuilder = GetCredentialRequest.Builder().addCredentialOption(googleIdOption)
      var passkeyRequestId: String? = null
      if (passkeyOptions is ApiResult.Success) {
        passkeyRequestId = passkeyOptions.value.requestId
        requestBuilder.addCredentialOption(GetPublicKeyCredentialOption(requestJson = passkeyOptions.value.optionsJson))
      }
      val request = requestBuilder.build()

      try {
        val credentialManager = CredentialManager.create(this@MainActivity)
        val response = credentialManager.getCredential(this@MainActivity, request)
        when (val credential = response.credential) {
          is PublicKeyCredential -> {
            val reqId = passkeyRequestId
            if (reqId == null) {
              viewModel.onSignInFailed("Couldn't complete passkey sign-in")
            } else {
              when (val verifyResult = ChatGizaApi.passkeyLoginVerify(reqId, credential.authenticationResponseJson, Build.MODEL ?: "")) {
                is ApiResult.Success -> viewModel.onPasskeySignedIn(verifyResult.value)
                is ApiResult.Failure -> viewModel.onSignInFailed(verifyResult.message)
              }
            }
          }
          else -> {
            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            viewModel.onGoogleIdToken(googleIdTokenCredential.idToken)
          }
        }
      } catch (e: GetCredentialException) {
        viewModel.onSignInFailed(e.message ?: "Sign-in was cancelled")
      } catch (e: Exception) {
        viewModel.onSignInFailed(e.message ?: "Sign-in failed")
      }
    }
  }

  // Reached when mobileAuth()/authWithPassword() report passkeyRequired --
  // this account has no TOTP but does have a registered passkey, so it's
  // the required second factor instead of a mandatory emailed code. A
  // passkey-only request (no Google option, unlike startGoogleSignIn's
  // combined one above) since the point here is confirming a specific
  // already-known identity, not picking one. Reuses the exact same
  // discoverable-credential passkey-verify flow startGoogleSignIn already
  // has -- it identifies the account from the credential itself, so
  // whichever account's passkey gets used is who actually signs in.
  private fun confirmPasskeyLogin() {
    viewModel.onSignInStart()
    lifecycleScope.launch {
      val passkeyOptions = ChatGizaApi.passkeyLoginOptions()
      if (passkeyOptions !is ApiResult.Success) {
        viewModel.onSignInFailed("Couldn't start passkey sign-in -- try again")
        return@launch
      }
      val request = GetCredentialRequest.Builder()
        .addCredentialOption(GetPublicKeyCredentialOption(requestJson = passkeyOptions.value.optionsJson))
        .build()
      try {
        val credentialManager = CredentialManager.create(this@MainActivity)
        val response = credentialManager.getCredential(this@MainActivity, request)
        val credential = response.credential
        if (credential !is PublicKeyCredential) {
          viewModel.onSignInFailed("Couldn't complete passkey sign-in")
          return@launch
        }
        when (val verifyResult = ChatGizaApi.passkeyLoginVerify(passkeyOptions.value.requestId, credential.authenticationResponseJson, Build.MODEL ?: "")) {
          is ApiResult.Success -> viewModel.onPasskeySignedIn(verifyResult.value)
          is ApiResult.Failure -> viewModel.onSignInFailed(verifyResult.message)
        }
      } catch (e: GetCredentialException) {
        viewModel.onSignInFailed(e.message ?: "Passkey sign-in was cancelled")
      } catch (e: Exception) {
        viewModel.onSignInFailed(e.message ?: "Passkey sign-in failed")
      }
    }
  }

  // Fetches a fresh registration challenge, runs the actual passkey
  // creation ceremony (needs an Activity, unlike everything else this
  // touches), then hands the attestation to the backend to verify and
  // store. Mirrors startGoogleSignIn's shape: this function owns the whole
  // flow end to end rather than splitting it across ViewModel callbacks.
  private fun startPasskeyRegistration() {
    val token = viewModel.currentToken() ?: return
    viewModel.updatePasskeyRegisterBusy(true)
    viewModel.updatePasskeyError(null)
    lifecycleScope.launch {
      when (val optionsResult = ChatGizaApi.passkeyRegisterOptions(token)) {
        is ApiResult.Success -> {
          try {
            val credentialManager = CredentialManager.create(this@MainActivity)
            val createRequest = CreatePublicKeyCredentialRequest(requestJson = optionsResult.value)
            val response = credentialManager.createCredential(this@MainActivity, createRequest) as CreatePublicKeyCredentialResponse
            when (val verifyResult = ChatGizaApi.passkeyRegisterVerify(token, response.registrationResponseJson, Build.MODEL)) {
              is ApiResult.Success -> viewModel.onPasskeyRegistered()
              is ApiResult.Failure -> viewModel.updatePasskeyError(verifyResult.message)
            }
          } catch (e: CreateCredentialException) {
            // Full exception class name + message + cause chain, not just
            // .message -- "[50152] RP ID cannot be validated" alone hasn't
            // been enough to pin down the real failure after multiple
            // rounds of server-side verification all coming back clean.
            val detail = buildString {
              append(e.javaClass.simpleName)
              append(": ")
              append(e.message ?: "no message")
              var cause = e.cause
              while (cause != null) {
                append(" | caused by ")
                append(cause.javaClass.simpleName)
                append(": ")
                append(cause.message ?: "no message")
                cause = cause.cause
              }
            }
            viewModel.updatePasskeyError(detail)
          } catch (e: Exception) {
            viewModel.updatePasskeyError("${e.javaClass.simpleName}: ${e.message ?: "Couldn't create a passkey"}")
          }
        }
        is ApiResult.Failure -> viewModel.updatePasskeyError(optionsResult.message)
      }
      viewModel.updatePasskeyRegisterBusy(false)
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
        .background(Color.White)
        .padding(16.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Text("Share a link to chat?", color = APP_TEXT_COLOR, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(
          "This creates a copy that others can chat with",
          color = APP_TEXT_COLOR.copy(alpha = 0.5f),
          fontSize = 13.sp
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
        modifier = Modifier.size(40.dp).clip(CircleShape).background(Color.Black)
      ) {
        Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share), contentDescription = "Share", tint = Color.White, modifier = Modifier.size(18.dp))
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
          .background(Color.White)
          .padding(16.dp)
      ) {
        Text("Remember this?", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(4.dp))
        Text("\"$suggestion\"", color = APP_TEXT_COLOR.copy(alpha = 0.7f), fontSize = 13.sp)
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(12.dp))
              .background(Color.Black.copy(alpha = 0.1f))
              .clickable { viewModel.dismissMemorySuggestion(suggestion) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text("Not now", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
          }
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(12.dp))
              .background(Color.Black)
              .clickable { viewModel.acceptMemorySuggestion(suggestion) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text("Remember", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
  // Was just a white card floating with nothing behind it -- whatever was
  // on the Chat screen underneath (including any error banner) stayed
  // fully sharp and readable, which is what made this read as messy/
  // unfinished rather than a real dialog. A dimming scrim (tap outside to
  // dismiss, same as every other bottom-sheet-style overlay in the app)
  // is what actually fixes that.
  AnimatedVisibility(
    visible = step >= 0 && wizard != null,
    enter = fadeIn(),
    exit = fadeOut(),
    modifier = Modifier.fillMaxSize()
  ) {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(Color.Black.copy(alpha = 0.5f))
        .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) {
          viewModel.dismissPreferenceWizard()
        }
    )
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
        .background(Color.White)
        .padding(20.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = { viewModel.wizardBack() }, enabled = step > 0, modifier = Modifier.size(28.dp)) {
          Icon(
            Icons.Filled.ArrowBackIosNew,
            contentDescription = "Nyuma",
            tint = Color.Black.copy(alpha = if (step > 0) 0.7f else 0.2f),
            modifier = Modifier.size(14.dp)
          )
        }
        Text(
          "${step + 1} of ${wizard.steps.size}",
          color = APP_TEXT_COLOR.copy(alpha = 0.6f),
          fontSize = 13.sp,
          modifier = Modifier.weight(1f),
          textAlign = TextAlign.Center
        )
        IconButton(onClick = { viewModel.wizardNext(lastStep) }, enabled = step < lastStep, modifier = Modifier.size(28.dp)) {
          Icon(
            Icons.Filled.ArrowForwardIos,
            contentDescription = "Mbele",
            tint = Color.Black.copy(alpha = if (step < lastStep) 0.7f else 0.2f),
            modifier = Modifier.size(14.dp)
          )
        }
        Spacer(modifier = Modifier.width(6.dp))
        IconButton(onClick = { viewModel.dismissPreferenceWizard() }, modifier = Modifier.size(28.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Funga", tint = Color.Black.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        }
      }
      Spacer(modifier = Modifier.height(14.dp))
      if (current != null) {
        Text(current.question, color = APP_TEXT_COLOR, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Select all that apply", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 12.sp)
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
    Text(label, color = APP_TEXT_COLOR, fontSize = 15.sp)
  }
  HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
}

// Plain circle indicator, matching the reference design used for every
// step regardless of task.
@Composable
private fun WizardOptionCircle(filled: Boolean) {
  Box(
    modifier = Modifier
      .size(20.dp)
      .clip(CircleShape)
      .background(if (filled) Color.Black else Color.Transparent)
      .border(1.5.dp, Color.Black.copy(alpha = 0.5f), CircleShape)
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
    Text(label, color = APP_TEXT_COLOR.copy(alpha = 0.7f), fontSize = 15.sp, modifier = Modifier.weight(1f))
    OutlinedButton(
      onClick = onSkip,
      colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Black),
      border = androidx.compose.foundation.BorderStroke(1.dp, Color.Black.copy(alpha = 0.3f)),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
    ) {
      Text("Skip", fontSize = 13.sp)
    }
  }
}

// Plus Jakarta Sans (SIL Open Font License, see PLUS_JAKARTA_SANS_OFL.txt) --
// a free geometric/rounded sans, the closest good-quality open alternative
// to commercial rounded fonts like Circular or Google Sans that this app's
// UI text was compared against.
//
// These are proper static single-weight files (fetched from Google Fonts'
// own CSS2 API, which instances a static TTF per weight even for families
// whose source is a variable font), not the variable file itself. Two
// earlier attempts both had real problems: build #964 registered one
// variable file five times via FontVariation and that broke the release
// build outright; the plain single-entry fallback that followed it
// compiled fine but rendered with visibly warped/curved letterforms
// ("zimepinda") since nothing was telling Android which named instance of
// the variable font's weight axis to actually draw. Static per-weight
// files sidestep variable-font instancing on-device entirely.
private val PlusJakartaSans = FontFamily(
  Font(R.font.plus_jakarta_sans_regular, FontWeight.Normal),
  Font(R.font.plus_jakarta_sans_medium, FontWeight.Medium),
  Font(R.font.plus_jakarta_sans_semibold, FontWeight.SemiBold),
  Font(R.font.plus_jakarta_sans_bold, FontWeight.Bold),
  Font(R.font.plus_jakarta_sans_extrabold, FontWeight.ExtraBold)
)

// Manrope (SIL Open Font License, see MANROPE_OFL.txt) -- second free
// option in the font picker (User Center > General > Font), same static
// per-weight approach as Plus Jakarta Sans above. A bit more neutral/less
// rounded than Plus Jakarta Sans, for anyone who wants a plainer look.
private val Manrope = FontFamily(
  Font(R.font.manrope_regular, FontWeight.Normal),
  Font(R.font.manrope_medium, FontWeight.Medium),
  Font(R.font.manrope_semibold, FontWeight.SemiBold),
  Font(R.font.manrope_bold, FontWeight.Bold),
  Font(R.font.manrope_extrabold, FontWeight.ExtraBold)
)

// Inter (SIL Open Font License, see ../INTER_OFL.txt) -- third free option
// in the font picker. Static per-weight files at the 24pt optical size (the
// full family also ships 18pt/28pt instances plus a single variable file),
// same reasoning as Plus Jakarta Sans/Manrope above: static files sidestep
// on-device variable-font instancing, which previously broke a release
// build (see the comment on PlusJakartaSans).
private val Inter = FontFamily(
  Font(R.font.inter_regular, FontWeight.Normal),
  Font(R.font.inter_medium, FontWeight.Medium),
  Font(R.font.inter_semibold, FontWeight.SemiBold),
  Font(R.font.inter_bold, FontWeight.Bold),
  Font(R.font.inter_extrabold, FontWeight.ExtraBold)
)

// General Sans (Fontshare's ITF Free Font License, see
// ../GENERAL_SANS_FFL.txt -- explicitly permits commercial mobile-app use
// free of charge) -- fourth font option. No ExtraBold weight exists for
// this family, so this FontFamily only goes up to Bold, unlike the others.
private val GeneralSans = FontFamily(
  Font(R.font.general_sans_regular, FontWeight.Normal),
  Font(R.font.general_sans_medium, FontWeight.Medium),
  Font(R.font.general_sans_semibold, FontWeight.SemiBold),
  Font(R.font.general_sans_bold, FontWeight.Bold)
)

private data class FontOption(val id: String, val label: String, val description: String, val family: FontFamily)

// "system" uses FontFamily.Default (Roboto, the platform font) rather than
// bundling it -- it's already always available, unlike the other two.
private val FONT_OPTIONS = listOf(
  FontOption("plus_jakarta_sans", "Plus Jakarta Sans", "Rounded, geometric — the app's default", PlusJakartaSans),
  FontOption("manrope", "Manrope", "Modern, slightly more neutral", Manrope),
  FontOption("inter", "Inter", "Clean and highly legible on screens", Inter),
  FontOption("general_sans", "General Sans", "Contemporary, grotesque-inspired", GeneralSans),
  FontOption("system", "System Default", "Your device's own font (Roboto)", FontFamily.Default)
)

// Every Material3 Typography slot rebound to the chosen font -- Text()
// calls that don't set their own fontFamily explicitly (the vast majority
// in this file) inherit it from whichever of these slots LocalTextStyle
// resolves to, so this alone changes the font app-wide without needing to
// touch each individual Text() call.
private fun chatGizaTypography(family: FontFamily): Typography {
  val base = Typography()
  return Typography(
    displayLarge = base.displayLarge.copy(fontFamily = family),
    displayMedium = base.displayMedium.copy(fontFamily = family),
    displaySmall = base.displaySmall.copy(fontFamily = family),
    headlineLarge = base.headlineLarge.copy(fontFamily = family),
    headlineMedium = base.headlineMedium.copy(fontFamily = family),
    headlineSmall = base.headlineSmall.copy(fontFamily = family),
    titleLarge = base.titleLarge.copy(fontFamily = family),
    titleMedium = base.titleMedium.copy(fontFamily = family),
    titleSmall = base.titleSmall.copy(fontFamily = family),
    bodyLarge = base.bodyLarge.copy(fontFamily = family),
    bodyMedium = base.bodyMedium.copy(fontFamily = family),
    bodySmall = base.bodySmall.copy(fontFamily = family),
    labelLarge = base.labelLarge.copy(fontFamily = family),
    labelMedium = base.labelMedium.copy(fontFamily = family),
    labelSmall = base.labelSmall.copy(fontFamily = family)
  )
}

// The app's one main background color -- #FCFCFC everywhere instead of
// pure white, per feedback. Single source of truth so every screen that
// still hardcodes a background color (rather than reading it off
// colorScheme.background) stays in sync with the theme below instead of
// drifting back to plain white piecemeal.
val APP_BACKGROUND = Color(0xFFFCFCFC)

// The app's one main text color -- #0D0D0D (a soft near-black) instead of
// pure Color.Black, per feedback. Every `color = Color.Black` in a Text()/
// TextStyle call was swapped to this constant in one pass, so it stays a
// single source of truth the same way APP_BACKGROUND is above.
val APP_TEXT_COLOR = Color(0xFF0D0D0D)

@Composable
private fun ChatGizaTheme(themeMode: String, fontChoice: String, content: @Composable () -> Unit) {
  // Forced to the light scheme everywhere while colors are being rebuilt
  // from a single flat background -- shadows the stored setting instead of
  // touching the Appearance picker or updateThemeMode, so flipping this
  // back to `themeMode` later restores the switcher with no other changes.
  @Suppress("NAME_SHADOWING") val themeMode = "light"
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
    val appBackground = APP_BACKGROUND
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
  val fontFamily = FONT_OPTIONS.find { it.id == fontChoice }?.family ?: PlusJakartaSans
  MaterialTheme(colorScheme = colors, typography = chatGizaTypography(fontFamily), content = content)
}

// A Dialog(...) opens its own separate Android Window, so the
// enableEdgeToEdge()/light-status-bar setup done once for the main
// Activity in onCreate never reaches it -- every full-screen Dialog
// (usePlatformDefaultWidth = false) needs this call itself, or its status
// bar area falls back to the platform's default dim scrim instead of
// blending with the dialog's own white content, showing up as a dark seam
// across the top of the screen. Call once at the top of the Dialog's
// content lambda.
@Composable
private fun EdgeToEdgeDialogWindow() {
  val view = LocalView.current
  SideEffect {
    // Walking one level up (view.parent as DialogWindowProvider) assumed a
    // fixed hierarchy that didn't actually match at runtime -- the seam
    // stayed even with that in place. Walking the full ancestor chain
    // instead is the same technique with no assumption about how many
    // wrapper views Compose's Dialog puts between the content and the
    // DialogWindowProvider.
    var ancestor: android.view.View? = view
    var provider: DialogWindowProvider? = null
    while (ancestor != null) {
      if (ancestor is DialogWindowProvider) {
        provider = ancestor
        break
      }
      ancestor = ancestor.parent as? android.view.View
    }
    val window = provider?.window ?: return@SideEffect
    WindowCompat.setDecorFitsSystemWindows(window, false)
    // This app targets SDK 36 (Android 15+), where Window.statusBarColor /
    // navigationBarColor are deprecated no-ops -- the platform now forces
    // transparent bars unconditionally, so setting these does nothing and
    // was never the actual fix. What a Dialog() DOES still add on its own,
    // independent of edge-to-edge, is the standard modal dim/scrim behind
    // it (WindowManager's own dim, not anything this file draws) -- with
    // the window now told to draw full-bleed but the dim still covering
    // the whole window including the status-bar strip the Compose content
    // hasn't visually claimed yet, that scrim is what was reading as a
    // seam across every full-screen Dialog. Clearing it here removes that
    // layer entirely.
    window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    // Window.setDimAmount(Float) only exists from API 30 -- this app's
    // minSdk is 24, so setting attributes.dimAmount directly and
    // reassigning it is the version-safe way to do the same thing.
    window.attributes = window.attributes.apply { dimAmount = 0f }
    window.setBackgroundDrawableResource(android.R.color.transparent)
    val controller = WindowCompat.getInsetsController(window, view)
    controller.isAppearanceLightStatusBars = true
    controller.isAppearanceLightNavigationBars = true
  }
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

// Bybit-style layout: brand on a plain field up top, a white rounded-top
// card below holding an Email/Mobile tab switch, identifier + password
// fields, and "Or go with" social buttons. The Email/Mobile password
// sign-in is real (see ChatViewModel.submitPasswordSignIn/authWithPassword)
// but only works for accounts that have set an in-app password from
// Security > Change Password -- Google (and the existing passkey option)
// stay as the only way in for accounts that haven't.
@Composable
private fun SignedOutScreen(viewModel: ChatViewModel, onSignIn: () -> Unit) {
  val focusManager = LocalFocusManager.current
  val signingIn = viewModel.signingIn
  // null = "Log in or sign up" opens with just method buttons (Google,
  // phone, email) -- no Email/Password visible until one is picked,
  // matching the Welcome Back screen's clean button-only list.
  var authMethodChosen by remember { mutableStateOf<String?>(null) }
  // Title box keeps weight(1f) -- with the keyboard closed that's what
  // pushes the white card flush to the bottom, no gap underneath it. The
  // trick for the keyboard is imePadding() on this outer Column: that
  // shrinks the TOTAL space available, so the weighted title box is what
  // shrinks first (down to 0 if needed), leaving the white card -- which
  // still has its own verticalScroll below -- genuinely bounded to
  // whatever's left. Once it's bounded like that, Compose's own focused-
  // field-into-view behavior scrolls the card up until the field being
  // typed into clears the keyboard, without needing a fixed-height title
  // that leaves an empty gap when the keyboard is closed.
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFFF4F4F4))
      .imePadding()
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    // Empty on purpose now -- the card below carries its own branding
    // (the small gradient-mark logo on "Log in or sign up", the account
    // avatar on "Welcome back"), so a second big "ChatGiZa" wordmark up
    // here just duplicated it. The weight(1f) itself still matters, see
    // the comment above: it's what makes room for the keyboard.
    Box(modifier = Modifier.fillMaxWidth().weight(1f))

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
        .background(Color.White)
        .navigationBarsPadding()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
      // viewModel.errorMessage is set correctly on every Google/Passkey
      // sign-in failure (see onSignInFailed/onGoogleIdToken in
      // ChatViewModel.kt, called from startGoogleSignIn's catch blocks in
      // this file) -- but until now nothing on this screen ever rendered
      // it, so the button just reverted from "Signing in…" back to its
      // normal label with zero explanation for what went wrong. Shown above
      // both the "Welcome back" and full-form branches below so it's
      // visible no matter which one is active when a sign-in attempt fails.
      if (viewModel.errorMessage != null) {
        Text(
          viewModel.errorMessage ?: "",
          color = Color(0xFFE14050),
          fontSize = 13.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        )
      }
      if (viewModel.rememberedAccountEmail != null && !viewModel.signInShowFullForm) {
        // Returning-user shortcut -- the last account that signed in on
        // this device, one tap to continue instead of retyping/re-picking.
        // "Continue with this account" and "Continue with Google" both
        // just call onSignIn (our Google flow already shows the system
        // account picker) -- differentiating which specific account gets
        // silently pre-selected is exactly the "log in another way" depth
        // explicitly deferred for later.
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
          Box(
            modifier = Modifier
              .size(72.dp)
              .clip(CircleShape)
              .background(Color.Black.copy(alpha = 0.06f)),
            contentAlignment = Alignment.Center
          ) {
            if (viewModel.rememberedAccountImage != null) {
              AsyncImage(
                model = viewModel.rememberedAccountImage,
                contentDescription = null,
                modifier = Modifier.fillMaxSize().clip(CircleShape),
                contentScale = ContentScale.Crop
              )
            } else {
              Text(
                (viewModel.rememberedAccountName ?: viewModel.rememberedAccountEmail ?: "?").take(1).uppercase(),
                color = APP_TEXT_COLOR,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
              )
            }
          }
          Spacer(modifier = Modifier.height(16.dp))
          Text(
            if (viewModel.rememberedAccountName.isNullOrBlank()) "Welcome back" else "Welcome back, ${viewModel.rememberedAccountName}",
            color = APP_TEXT_COLOR,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
          )
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            "Continue to pick up right where you left off.",
            color = APP_TEXT_COLOR.copy(alpha = 0.5f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center
          )
          Spacer(modifier = Modifier.height(28.dp))

          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(50))
              .background(Color.Black)
              .clickable(enabled = !signingIn, onClick = onSignIn)
              .padding(horizontal = 18.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.15f)),
              contentAlignment = Alignment.Center
            ) {
              if (viewModel.rememberedAccountImage != null) {
                AsyncImage(
                  model = viewModel.rememberedAccountImage,
                  contentDescription = null,
                  modifier = Modifier.fillMaxSize().clip(CircleShape),
                  contentScale = ContentScale.Crop
                )
              } else {
                Text(
                  (viewModel.rememberedAccountName ?: viewModel.rememberedAccountEmail ?: "?").take(1).uppercase(),
                  color = Color.White,
                  fontSize = 13.sp,
                  fontWeight = FontWeight.Bold
                )
              }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text(
                if (signingIn) "Signing in…" else "Continue with this account",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
              )
              if (!viewModel.rememberedAccountEmail.isNullOrBlank()) {
                Text(
                  viewModel.rememberedAccountEmail!!,
                  color = Color.White.copy(alpha = 0.6f),
                  fontSize = 12.sp
                )
              }
            }
          }

          Spacer(modifier = Modifier.height(12.dp))

          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(50))
              .background(Color.Black.copy(alpha = 0.05f))
              .clickable(enabled = !signingIn, onClick = onSignIn)
              .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_google_logo_color),
              contentDescription = null,
              tint = Color.Unspecified,
              modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Continue with Google", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
          }

          Spacer(modifier = Modifier.height(12.dp))

          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(50))
              .border(1.dp, Color.Black.copy(alpha = 0.15f), RoundedCornerShape(50))
              .clickable { viewModel.showFullSignInForm() }
              .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center
          ) {
            Text("Log in another way", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
          }
          Spacer(modifier = Modifier.height(8.dp))
        }
      } else {
      if (viewModel.rememberedAccountEmail != null) {
        IconButton(onClick = { viewModel.hideFullSignInForm() }, modifier = Modifier.size(32.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
        }
        Spacer(modifier = Modifier.height(4.dp))
      }

      Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Image(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_chatgiza_logo),
          contentDescription = null,
          modifier = Modifier.size(48.dp)
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text("Log in or sign up", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          "You'll get smarter responses and can upload files, images and more.",
          color = APP_TEXT_COLOR.copy(alpha = 0.5f),
          fontSize = 14.sp,
          textAlign = TextAlign.Center
        )
      }

      Spacer(modifier = Modifier.height(28.dp))

      if (authMethodChosen == null) {
        // Buttons only, no visible fields yet -- matching the "Welcome
        // back" reference's clean button list rather than dumping Email +
        // Password on screen immediately. Picking a method below is what
        // reveals its actual fields.
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.04f))
            .clickable(enabled = !signingIn, onClick = onSignIn)
            .padding(vertical = 14.dp),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_google_logo_color),
            contentDescription = null,
            tint = Color.Unspecified,
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Text(if (signingIn) "Signing in…" else "Continue with Google", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.04f))
            .clickable {
              viewModel.onSignInTabChange("mobile")
              authMethodChosen = "mobile"
            }
            .padding(vertical = 14.dp),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Outlined.Phone, contentDescription = null, tint = Color.Black.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text("Continue with phone", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.04f))
            .clickable {
              viewModel.onSignInTabChange("email")
              authMethodChosen = "email"
            }
            .padding(vertical = 14.dp),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Outlined.Email, contentDescription = null, tint = Color.Black.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text("Continue with email", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        }

        Spacer(modifier = Modifier.height(24.dp))

        val menuFooterContext = LocalContext.current
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
          Text(
            "Terms of Use",
            color = APP_TEXT_COLOR.copy(alpha = 0.4f),
            fontSize = 12.sp,
            modifier = Modifier.clickable {
              menuFooterContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
            }
          )
          Text(" · ", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 12.sp)
          Text(
            "Privacy Policy",
            color = APP_TEXT_COLOR.copy(alpha = 0.4f),
            fontSize = 12.sp,
            modifier = Modifier.clickable {
              menuFooterContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
            }
          )
        }
        Spacer(modifier = Modifier.height(8.dp))
      } else {

      IconButton(onClick = { authMethodChosen = null }, modifier = Modifier.size(32.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(modifier = Modifier.height(12.dp))

      if (viewModel.signInTab == "mobile") {
        // Two stacked full-width labeled fields (Country/Region, then Phone
        // number), matching the reference -- not the old compact side-by-
        // side flag+code pill next to a cramped number field.
        Text(
          "Country/Region",
          color = APP_TEXT_COLOR.copy(alpha = 0.5f),
          fontSize = 13.sp,
          fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .clickable { viewModel.openSignInCountryPicker() }
            .padding(horizontal = 16.dp, vertical = 15.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(viewModel.signInCountry.flag, fontSize = 16.sp)
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            "${viewModel.signInCountry.name} (${viewModel.signInCountry.dialCode})",
            color = APP_TEXT_COLOR,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f)
          )
          Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "Choose country", tint = Color.Black.copy(alpha = 0.5f), modifier = Modifier.size(18.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
          "Phone number",
          color = APP_TEXT_COLOR.copy(alpha = 0.5f),
          fontSize = 13.sp,
          fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .padding(horizontal = 16.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
            BasicTextField(
              value = viewModel.signInIdentifierInput,
              onValueChange = { new -> if (new.length <= 20) viewModel.onSignInIdentifierChange(new) },
              singleLine = true,
              textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
              cursorBrush = SolidColor(Color.Black),
              keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }
      } else {
      Text(
        "Email",
        color = APP_TEXT_COLOR.copy(alpha = 0.5f),
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium
      )
      Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .padding(horizontal = 16.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mail_outline),
            contentDescription = null,
            tint = Color.Black.copy(alpha = 0.4f),
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.width(12.dp))
          Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
            BasicTextField(
              value = viewModel.signInIdentifierInput,
              onValueChange = { new -> viewModel.onSignInIdentifierChange(new) },
              singleLine = true,
              textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
              cursorBrush = SolidColor(Color.Black),
              keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Email),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(12.dp))

      PasswordField(
        value = viewModel.signInPasswordInput,
        onValueChange = viewModel::onSignInPasswordChange,
        placeholder = "Password"
      )

      if (viewModel.signInError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.signInError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(20.dp))

      Button(
        onClick = { viewModel.submitPasswordSignIn() },
        enabled = !viewModel.signInBusy,
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.signInBusy) {
          CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Continue", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      Row(verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = APP_TEXT_COLOR.copy(alpha = 0.1f))
        Text(
          "OR",
          color = APP_TEXT_COLOR.copy(alpha = 0.4f),
          fontSize = 12.sp,
          fontWeight = FontWeight.Medium,
          modifier = Modifier.padding(horizontal = 10.dp)
        )
        HorizontalDivider(modifier = Modifier.weight(1f), color = APP_TEXT_COLOR.copy(alpha = 0.1f))
      }

      Spacer(modifier = Modifier.height(20.dp))

      // One button, not two -- Credential Manager's own picker offers a
      // saved passkey alongside Google accounts in the same sheet (see
      // startGoogleSignIn), so this single tap covers both instead of a
      // separate "Sign in with a passkey" button underneath it.
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.04f))
          .clickable(enabled = !signingIn, onClick = onSignIn)
          .padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_google_logo_color),
          contentDescription = null,
          tint = Color.Unspecified,
          modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(if (signingIn) "Signing in…" else "Continue with Google", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
      }

      Spacer(modifier = Modifier.height(12.dp))

      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.04f))
          .clickable {
            viewModel.onSignInTabChange(if (viewModel.signInTab == "mobile") "email" else "mobile")
          }
          .padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(
          if (viewModel.signInTab == "mobile") Icons.Outlined.Email else Icons.Outlined.Phone,
          contentDescription = null,
          tint = Color.Black.copy(alpha = 0.7f),
          modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          if (viewModel.signInTab == "mobile") "Continue with email" else "Continue with phone",
          color = APP_TEXT_COLOR,
          fontSize = 15.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(24.dp))

      val footerContext = LocalContext.current
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        Text(
          "Terms of Use",
          color = APP_TEXT_COLOR.copy(alpha = 0.4f),
          fontSize = 12.sp,
          modifier = Modifier.clickable {
            footerContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
          }
        )
        Text(" · ", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 12.sp)
        Text(
          "Privacy Policy",
          color = APP_TEXT_COLOR.copy(alpha = 0.4f),
          fontSize = 12.sp,
          modifier = Modifier.clickable {
            footerContext.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
          }
        )
      }

      Spacer(modifier = Modifier.height(8.dp))
      }
      }
    }
  }

  if (viewModel.signInCountryPickerOpen) {
    CountryPickerSheet(
      onDismiss = { viewModel.closeSignInCountryPicker() },
      onSelect = { viewModel.selectSignInCountry(it) }
    )
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

// One-line subtitle shown under each tool in ToolSelectSheet -- null key is
// the default "GiZa Pro" row (no tool selected).
private val TOOL_DESCRIPTIONS = mapOf<String?, String>(
  null to "Chat, create images, and more",
  "web_search" to "Search the web for current information",
  "deep_research" to "In-depth reports on complex topics",
  "deep_think" to "Extra reasoning for harder problems",
  "document_writer" to "Draft and edit long documents",
  "sql_helper" to "Write and debug SQL queries",
  "python_helper" to "Write and debug Python code",
  "business_assistant" to "Plans, memos, and business tasks",
  "ai_agent" to "Completes multi-step tasks for you",
  "agent_team" to "Multiple agents working together",
  "digital_twin" to "An assistant trained on your data"
)

// Iteration order for ToolSelectSheet -- null (GiZa Pro) first, then every
// TOOL_LABELS entry in the same order the old DropdownMenu listed them.
private val TOOL_SELECT_ORDER: List<String?> = listOf(null) + TOOL_LABELS.keys.toList()

// Replaces the old plain DropdownMenu for tool selection with a proper
// bottom sheet -- title + close button, one row per tool with a subtitle
// and a checkmark on whichever one is active, matching the rest of the
// app's own bottom-sheet pickers (see e.g. the voice/output-device sheets
// just above) instead of a bare Material dropdown popup.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ToolSelectSheet(activeTool: String?, onSelect: (String?) -> Unit, onDismiss: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
      Box(modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = onDismiss, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
          Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.Black, modifier = Modifier.size(24.dp))
        }
        Text(
          "Select tool",
          color = APP_TEXT_COLOR,
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier.align(Alignment.Center)
        )
      }
      Spacer(modifier = Modifier.height(12.dp))
      // Each row is its own raised white card against the sheet's slightly
      // off-white APP_BACKGROUND (a flat divided list read as one flat
      // gray field instead of distinct, tappable options).
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TOOL_SELECT_ORDER.forEach { tool ->
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(14.dp))
              .background(Color.White)
              .border(1.dp, Color.Black.copy(alpha = 0.06f), RoundedCornerShape(14.dp))
              .clickable { onSelect(tool); onDismiss() }
              .padding(horizontal = 14.dp, vertical = 14.dp)
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text(
                tool?.let { TOOL_LABELS[it] } ?: "GiZa Pro",
                color = if (activeTool == tool) Color(0xFF0A84FF) else Color.Black,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
              )
              TOOL_DESCRIPTIONS[tool]?.let {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                  it,
                  color = if (activeTool == tool) Color(0xFF0A84FF) else Color.Black.copy(alpha = 0.5f),
                  fontSize = 13.sp
                )
              }
            }
            if (activeTool == tool) {
              Icon(Icons.Filled.Check, contentDescription = "Selected", tint = Color(0xFF0A84FF), modifier = Modifier.size(20.dp))
            }
          }
        }
      }
    }
  }
}

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
private fun DeleteIcon(tint: Color, modifier: Modifier = Modifier, strokeScale: Float = 1.6f) {
  Canvas(modifier = modifier.size(22.dp)) {
    val scale = size.width / 24f
    val strokeW = strokeScale * scale
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
private fun FilterIconCustom(modifier: Modifier = Modifier, tint: Color = Color.Black) {
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

// Ask / Quantara segmented tabs: a narrow pill container, with the selected
// word getting its own tight background pill (not just an underline).
@Composable
private fun AskImagineTabs(current: String, onAsk: () -> Unit, onImagine: () -> Unit) {
  Row(
    modifier = Modifier
      .clip(RoundedCornerShape(20.dp))
      // Was 0.06f -- nearly invisible against scrolled message text behind
      // the (deliberately transparent, see ChatScreenUi's own top bar
      // comment) top bar, so both this pill and the "Quantara" label inside
      // it read as illegible clutter rather than a real control. Solid
      // enough to stay legible over any background without losing the
      // rounded-pill look.
      .background(colorScheme.background)
      .padding(4.dp),
    horizontalArrangement = Arrangement.spacedBy(2.dp)
  ) {
    AskImagineTab("Ask", current == "Ask", onAsk)
    AskImagineTab("Quantara", current == "Imagine", onImagine)
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
      // the entire top bar, with only the hamburger/Ask-Quantara/New Chat/
      // dots icons and text sitting visibly on top of the passing content.
      CenterAlignedTopAppBar(
        modifier = Modifier.statusBarsPadding(),
        windowInsets = WindowInsets(0, 0, 0, 0),
        // Ask/Quantara tabs removed from here -- Quantara (ChatGiZa Media) now
        // has its own entry in the Events carousel instead (see
        // CHATGIZA_ANNOUNCEMENTS' isFeatureLink item / ChatGizaEventsCard).
        title = {},
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
                // Was 0.12f -- too faint to stay legible once real message
                // text scrolls behind this (deliberately transparent) top
                // bar; a solid circle keeps the icon readable regardless
                // of what's underneath.
                .background(colorScheme.background)
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
              // Was 0.12f -- see the new-chat circle above for why a
              // solid background replaced it here too.
              .background(colorScheme.background),
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
    containerColor = APP_BACKGROUND,
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
          // Pull-up-to-new-chat -- fires when the user keeps dragging upward
          // past the very bottom of the chat (where it naturally rests on
          // the newest message), not the usual top-of-list pull-DOWN
          // direction. Material3's PullToRefreshBox only supports that top
          // edge (drag down while already scrolled to the start), so this
          // hand-rolls the same nested-scroll-interception technique it
          // uses internally, mirrored to the bottom: once the list can't
          // scroll forward any further, additional upward drag is captured
          // here instead of being dropped by the list, and releasing past a
          // threshold starts a new chat -- releasing short of it springs
          // back.
          val pullUpOffsetPx = remember { Animatable(0f) }
          val pullThresholdPx = with(LocalDensity.current) { 64.dp.toPx() }
          var pullTriggered by remember { mutableStateOf(false) }
          val pullScope = rememberCoroutineScope()
          val pullNestedScrollConnection = remember(pullThresholdPx) {
            object : NestedScrollConnection {
              override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                // While already pulled out, absorb the release drag
                // ourselves first so it collapses the pull instead of
                // scrolling the list underneath it.
                if (pullUpOffsetPx.value < 0f && available.y > 0f) {
                  val consume = minOf(-pullUpOffsetPx.value, available.y)
                  pullScope.launch { pullUpOffsetPx.snapTo(pullUpOffsetPx.value + consume) }
                  return Offset(0f, consume)
                }
                return Offset.Zero
              }

              override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                // available.y < 0 is an upward drag the list had nothing
                // left to consume -- i.e. we're already at the very bottom.
                if (source == NestedScrollSource.UserInput && available.y < 0f && !listState.canScrollForward) {
                  val next = (pullUpOffsetPx.value + available.y).coerceAtLeast(-pullThresholdPx * 1.6f)
                  pullScope.launch { pullUpOffsetPx.snapTo(next) }
                  return Offset(0f, available.y)
                }
                return Offset.Zero
              }

              override suspend fun onPreFling(available: Velocity): Velocity {
                if (pullUpOffsetPx.value < 0f) {
                  val springBack = spring<Float>(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
                  if (pullUpOffsetPx.value <= -pullThresholdPx && !pullTriggered) {
                    pullTriggered = true
                    viewModel.newChat()
                    pullUpOffsetPx.animateTo(0f, springBack)
                    pullTriggered = false
                  } else {
                    pullUpOffsetPx.animateTo(0f, springBack)
                  }
                  return Velocity(available.x, 0f)
                }
                return Velocity.Zero
              }
            }
          }
          Box(modifier = Modifier.fillMaxSize().nestedScroll(pullNestedScrollConnection)) {
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
                    colors = listOf(Color.Transparent, Color.White),
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
            // Scrolls with the chat instead of sitting fixed in the
            // composer area -- a real list item after the last message, the
            // same way it moves up out of view as older turns replace it at
            // the bottom, rather than staying pinned on screen.
            if (displayedMessages.isNotEmpty()) {
              item(key = "ai-disclaimer") {
                Text(
                  "ChatGiZa is AI and can make mistakes. Please double-check responses.",
                  color = APP_TEXT_COLOR.copy(alpha = 0.4f),
                  fontSize = 11.sp,
                  textAlign = TextAlign.Center,
                  modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 8.dp)
                )
              }
            }
          }
          val pullProgress = (-pullUpOffsetPx.value / pullThresholdPx).coerceIn(0f, 1f)
          if (pullProgress > 0f || pullTriggered) {
            Column(
              horizontalAlignment = Alignment.CenterHorizontally,
              modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 96.dp)
                .graphicsLayer { alpha = pullProgress }
            ) {
              Box(
                modifier = Modifier
                  .size(32.dp)
                  .clip(CircleShape)
                  .background(APP_BACKGROUND)
                  .border(1.dp, Color(0xFF0A84FF), CircleShape),
                contentAlignment = Alignment.Center
              ) {
                if (pullTriggered) {
                  CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color(0xFF0A84FF), strokeWidth = 2.dp)
                } else {
                  CircularProgressIndicator(
                    progress = { pullProgress },
                    modifier = Modifier.size(20.dp),
                    color = Color(0xFF0A84FF),
                    strokeWidth = 2.dp,
                    trackColor = Color(0xFF0A84FF).copy(alpha = 0.15f)
                  )
                }
              }
              Spacer(modifier = Modifier.height(4.dp))
              Text("New chat", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
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
              color = APP_TEXT_COLOR,
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
              .background(Color.White)
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
          Text("Delete", color = APP_TEXT_COLOR, fontWeight = FontWeight.Bold)
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
      .background(Color.White)
      .padding(horizontal = 10.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier
        .size(36.dp)
        .clip(CircleShape)
        .background(Color.Black)
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
        tint = Color.White,
        modifier = Modifier.size(18.dp)
      )
    }
    if (isPremium) {
      Spacer(modifier = Modifier.width(4.dp))
      Icon(
        Icons.Filled.Replay10,
        contentDescription = "Rewind 10 seconds",
        tint = Color.Black,
        modifier = Modifier
          .size(28.dp)
          .clickable { player.seekTo((positionMs - 10_000).coerceAtLeast(0)) }
      )
      Spacer(modifier = Modifier.width(2.dp))
      Icon(
        Icons.Filled.Forward10,
        contentDescription = "Forward 10 seconds",
        tint = Color.Black,
        modifier = Modifier
          .size(28.dp)
          .clickable { player.seekTo((positionMs + 10_000).coerceAtMost(durationMs)) }
      )
      Spacer(modifier = Modifier.width(6.dp))
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(percent = 50))
          .background(Color.Black.copy(alpha = 0.12f))
          .clickable {
            speedIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.size
            player.setSpeed(PLAYBACK_SPEEDS[speedIndex])
          }
          .padding(horizontal = 8.dp, vertical = 4.dp)
      ) {
        Text("${PLAYBACK_SPEEDS[speedIndex]}x", color = APP_TEXT_COLOR, fontSize = 11.sp, fontWeight = FontWeight.Medium)
      }
    }
    Spacer(modifier = Modifier.weight(1f))
    Text(
      if (durationMs > 0) "${formatTime(positionMs)} / ${formatTime(durationMs)}" else formatTime(positionMs),
      color = APP_TEXT_COLOR,
      fontSize = 12.sp
    )
    Spacer(modifier = Modifier.width(10.dp))
    Icon(
      Icons.Filled.Close,
      contentDescription = "Stop",
      tint = Color.Black.copy(alpha = 0.7f),
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
    containerColor = APP_BACKGROUND,
    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2A2A2A))
  ) {
    Text(
      title,
      color = APP_TEXT_COLOR.copy(alpha = 0.5f),
      fontSize = 13.sp,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
    )
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_share), contentDescription = null, tint = Color.Black) }, label = "Share") {
      onDismiss(); onShare()
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_pin), contentDescription = null, tint = Color.Black) }, label = if (pinned) "Unpin" else "Pin") {
      onDismiss(); onTogglePin()
    }
    ChatMenuRow(
      icon = { ProjectsIconCustom(tint = Color.Black, modifier = Modifier.size(20.dp)) },
      label = "Add to project",
      trailing = { Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp)) }
    ) { onDismiss(); onComingSoon("Add to project") }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_find_in_chat), contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp)) }, label = "Find in chat") {
      onDismiss(); onFindInChat()
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_home), contentDescription = null, tint = Color.Black) }, label = "Add to home") {
      onDismiss(); onComingSoon("Add to home")
    }
    ChatMenuRow(icon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_archive), contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp)) }, label = "Archive") {
      onDismiss(); onComingSoon("Archive")
    }
    ChatMenuRow(icon = { DeleteIcon(tint = Color.Black) }, label = "Delete", tint = Color.Black) {
      onDismiss(); onDelete()
    }
  }
}

@Composable
private fun ChatMenuRow(
  icon: @Composable () -> Unit,
  label: String,
  tint: Color = Color.Black,
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
      QuickActionChip(icon = { Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Quantara") {
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
      QuickActionChip(icon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_files), contentDescription = null, tint = colorScheme.onBackground, modifier = Modifier.size(22.dp)) }, label = "Analyze Doc") {
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
  // White, matching the page background exactly -- told apart from it by
  // a thin border only, not by elevation. A non-zero Card elevation asks
  // Material3's Surface to blend a tonal (surfaceTint) overlay into
  // whatever containerColor is passed, even an explicit opaque one, which
  // was quietly turning this back into a visible gray instead of the flat
  // one-color-only look asked for. Elevation is 0 below for exactly that
  // reason -- the border is the only thing drawing the edge now.
  val composerBackground = colorScheme.background
  Box(
    // A plain (unrounded) backing rectangle, sitting directly behind the
    // rounded Card below. A rounded Card only paints its own rounded-rect
    // outline -- the four little corners of its bounding box, just
    // outside that curve, are left fully unpainted, so with a
    // transparent parent (this whole composer floats over the scrolling
    // message list) the last message's text showed straight through
    // those corner slivers.
    //
    // This backing rectangle is painted the screen's own solid white --
    // matches the true app background outside the card, so the notch
    // just reads as background peeking around a rounded corner, and it
    // still blocks the message list from showing through.
    modifier = Modifier
      .fillMaxWidth()
      .padding(start = 6.dp, end = 6.dp, top = 10.dp)
      .background(Color.White)
  ) {
  Card(
    // No bottom padding -- the outer Column already carries
    // navigationBarsPadding()/imePadding(), so extra padding here just
    // left a gap between the card and the keyboard/nav bar with the
    // message list visible (and readable) through it.
    // Modifier.shadow was tried at three different elevation/color
    // combinations (3dp default, 1dp dimmed, 4dp default with the
    // fillMaxWidth-before-shadow ordering fix) and NONE of them ever
    // rendered visibly, including the one that should have been a normal,
    // clearly-visible Material shadow. That's not a tuning problem --
    // RenderNode-based shadows are known to silently not render in some
    // environments (older emulators, software-rendered/hardware-
    // acceleration-off devices) regardless of elevation. A border is a
    // plain canvas stroke draw with no such dependency, and it DID
    // visibly render the one time it was tried (just too strong, at 8%
    // alpha, reading as a harsh line) -- back to a border, softened to
    // 5%, since it's the one approach actually proven to show up here.
    modifier = Modifier
      .fillMaxWidth()
      .border(1.dp, Color.Black.copy(alpha = 0.05f), RoundedCornerShape(24.dp)),
    shape = RoundedCornerShape(24.dp),
    colors = CardDefaults.cardColors(containerColor = composerBackground),
    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) {
      // Unified attachment preview -- was three different ad hoc treatments
      // (a bare thumbnail with a corner badge for photos, a bigger bare
      // thumbnail with a different corner badge for PDFs, a separate chip
      // style only for plain text files), so a picked photo or PDF looked
      // like it was floating loose above the input with no real container
      // of its own. Every attachment type now sits in the same bordered,
      // labeled row so it reads as one deliberate "here's what you're
      // about to send" area instead of a leftover thumbnail.
      val attachedFile = viewModel.attachedFile
      val hasPhoto = viewModel.attachedImageUri != null
      if (hasPhoto || attachedFile != null) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .padding(top = 10.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.05f))
            .border(1.dp, colorScheme.onBackground.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
            .padding(8.dp)
        ) {
          val previewBitmap = attachedFile?.previewBitmap
          Box(
            modifier = Modifier
              .size(48.dp)
              .clip(RoundedCornerShape(11.dp))
              .background(Color(0xFFEDEDED))
          ) {
            when {
              hasPhoto -> AsyncImage(
                model = viewModel.attachedImageUri,
                contentDescription = "Attached photo",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
              )
              previewBitmap != null -> Image(
                bitmap = previewBitmap.asImageBitmap(),
                contentDescription = attachedFile?.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
              )
              else -> Icon(
                Icons.Outlined.Description,
                contentDescription = null,
                tint = Color(0xFF9A9A9A),
                modifier = Modifier.align(Alignment.Center).size(22.dp)
              )
            }
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column(modifier = Modifier.weight(1f)) {
            Text(
              if (hasPhoto) "Photo" else attachedFile?.name.orEmpty(),
              color = colorScheme.onBackground,
              fontSize = 14.sp,
              fontWeight = FontWeight.SemiBold,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
            Text(
              when {
                hasPhoto -> "Ready to send"
                attachedFile != null && attachedFile.imageDataUrls.isNotEmpty() -> "PDF · ready to send"
                else -> "Text file · ready to send"
              },
              color = colorScheme.onBackground.copy(alpha = 0.5f),
              fontSize = 12.sp
            )
          }
          Spacer(modifier = Modifier.width(8.dp))
          Box(
            modifier = Modifier
              .size(26.dp)
              .clip(CircleShape)
              .background(colorScheme.onBackground.copy(alpha = 0.08f))
              .clickable(onClick = { if (hasPhoto) viewModel.clearAttachedImage() else viewModel.clearAttachedFile() }),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Remove attachment", tint = colorScheme.onBackground, modifier = Modifier.size(14.dp))
          }
        }
      }
      if (attachError) {
        Text(
          "Couldn't attach that — try a different file",
          color = APP_TEXT_COLOR,
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
            modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black),
            contentAlignment = Alignment.Center
          ) {
            // Was tint = Color.Black on a Color.Black circle -- invisible.
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
            Icon(Icons.Filled.Check, contentDescription = "Done", tint = Color.White, modifier = Modifier.size(18.dp))
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
          if (attachMenuOpen) {
            AttachMenuSheet(
              onDismiss = { attachMenuOpen = false },
              onCamera = {
                attachMenuOpen = false
                if (hasCameraPermission) launchCamera() else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
              },
              onGallery = {
                attachMenuOpen = false
                imagePicker.launch("image/*")
              },
              onFiles = {
                attachMenuOpen = false
                filePicker.launch("*/*")
              },
              onSkills = { attachMenuOpen = false },
              onConnectors = { attachMenuOpen = false }
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
          if (toolMenuOpen) {
            ToolSelectSheet(
              activeTool = viewModel.activeTool,
              onSelect = { viewModel.selectTool(it) },
              onDismiss = { toolMenuOpen = false }
            )
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
            .background(Color.White)
            .clickable { launchSpeech() },
          contentAlignment = Alignment.Center
        ) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
            contentDescription = "Voice input",
            tint = Color.Black,
            modifier = Modifier.size(18.dp)
          )
        }

        Spacer(modifier = Modifier.width(8.dp))

        val hasSendableContent = viewModel.input.isNotBlank() || viewModel.attachedImageUri != null || viewModel.attachedFile != null
        // sending is checked first, before hasSendableContent -- input (and
        // any attachment) is cleared the instant sendMessage() fires, so
        // hasSendableContent alone would flip straight back to the Speak
        // pill for the whole reply instead of showing a Stop state.
        if (viewModel.sending) {
          // STOP BUTTON -- same shape/role as Private Chat's own Stop,
          // black glyph on the same light circle the Send button uses,
          // keeping whatever the reply has streamed in so far.
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFFE0E0E0))
              .clickable { viewModel.stopSendingMessage() },
            contentAlignment = Alignment.Center
          ) {
            Box(modifier = Modifier.size(12.dp).clip(RoundedCornerShape(3.dp)).background(Color.Black))
          }
        } else if (hasSendableContent) {
          // SEND BUTTON
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFFE0E0E0))
              .clickable { tapHaptic(); viewModel.sendMessage() },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.Black, modifier = Modifier.size(18.dp))
          }
        } else {
          // SPEAK BUTTON (waveform icon + label) -- icon and text sized up
          // per feedback; since ic_waveform_speak is a solid-fill vector,
          // scaling its dp size grows the bars' length and thickness
          // together (not just length), and the button itself grew to match
          // instead of the bigger content getting cramped inside the old size.
          Row(
            modifier = Modifier
              .height(44.dp)
              .clip(RoundedCornerShape(22.dp))
              .background(Color.Black)
              .clickable { tapHaptic(); viewModel.openLiveVision() }
              .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_waveform_speak),
              contentDescription = null,
              tint = Color.White,
              modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              text = "Speak",
              fontSize = 17.sp,
              fontWeight = FontWeight.ExtraBold,
              color = Color.White,
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
      // Fixed + equal width across every chip in the row (was auto-sized
      // to each label, so "Quantara" ended up noticeably narrower than
      // "Customize GiZa") -- wide enough to fit the longest label
      // ("Create an image") without clipping. Corner radius down from
      // 26.dp (half the height, a full stadium pill) to 16.dp, matching
      // the reference's more moderate rounded-rect chips instead of fully
      // circular ends.
      .width(215.dp)
      .clip(RoundedCornerShape(16.dp))
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
  var voiceSettingsOpen by remember { mutableStateOf(false) }
  var pendingPersonalityId by remember { mutableStateOf<String?>(null) }
  var customPersonalityDialogOpen by remember { mutableStateOf(false) }
  var customPersonalityDraft by remember { mutableStateOf(viewModel.customPersonalityText) }
  var cameraProviderRef by remember { mutableStateOf<ProcessCameraProvider?>(null) }
  var boundCamera by remember { mutableStateOf<Camera?>(null) }

  // Screen sharing -- mirrors the camera's on/off + frame-sending pattern,
  // just capturing the display instead of a camera sensor. Android 14+
  // requires a foreground service of type "mediaProjection" to already be
  // running before getMediaProjection() is called, hence ScreenCaptureService.
  var screenShareEnabled by remember { mutableStateOf(false) }
  var mediaProjection by remember { mutableStateOf<MediaProjection?>(null) }
  var virtualDisplay by remember { mutableStateOf<VirtualDisplay?>(null) }
  var screenImageReader by remember { mutableStateOf<ImageReader?>(null) }
  // Typed getSystemService (nullable) instead of the string-key + `as` cast
  // this used to be -- the old form threw a hard TypeCastException on every
  // single Live Vision open if that lookup ever came back null for any
  // reason, crashing the whole screen ("keeps stopping") before the user
  // ever touched Share Screen. This just disables the feature instead.
  val mediaProjectionManager = remember {
    runCatching { context.getSystemService(MediaProjectionManager::class.java) }.getOrNull()
  }

  fun stopScreenShare() {
    runCatching { virtualDisplay?.release() }
    virtualDisplay = null
    runCatching { screenImageReader?.close() }
    screenImageReader = null
    runCatching { mediaProjection?.stop() }
    mediaProjection = null
    screenShareEnabled = false
    LiveVisionCallBridge.onHangUp = null
    LiveVisionCallBridge.onToggleMute = null
    ScreenCaptureService.onForegroundStarted = null
    runCatching { context.stopService(Intent(context, ScreenCaptureService::class.java)) }
  }

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

  val screenCaptureLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
    val data = result.data
    if (result.resultCode != Activity.RESULT_OK || data == null) return@rememberLauncherForActivityResult
    // Flips the pill to the sharing icon the instant control returns from
    // the system's own screen-capture consent dialog, instead of waiting
    // on startForegroundService/getMediaProjection/registerCallback below
    // to all finish first -- rolled back via stopScreenShare() in
    // onFailure if any of that actually fails, so the pill never gets
    // stuck showing "sharing" when nothing is really being captured.
    screenShareEnabled = true
    ChatGizaApplication.breadcrumb(context, "launcher: got RESULT_OK from system dialog")
    // Breadcrumbs from a real device crash proved startForegroundService()
    // is async: getMediaProjection() used to run on the very next line and
    // threw immediately (service not foreground yet), and by the time the
    // failure handler's stopService() call landed, the service's own
    // onCreate() had already been queued and went on to call
    // startForeground() successfully on a service already told to stop --
    // which the OS then killed the whole process over. Now this actually
    // waits for ScreenCaptureService to confirm startForeground() before
    // touching getMediaProjection() at all.
    coroutineScope.launch {
      runCatching {
        val manager = mediaProjectionManager ?: error("Screen sharing isn't available on this device")
        val foregroundStarted = CompletableDeferred<Unit>()
        ScreenCaptureService.onForegroundStarted = { foregroundStarted.complete(Unit) }
        ChatGizaApplication.breadcrumb(context, "launcher: calling startForegroundService")
        ContextCompat.startForegroundService(context, Intent(context, ScreenCaptureService::class.java))
        withTimeout(4000) { foregroundStarted.await() }
        ChatGizaApplication.breadcrumb(context, "launcher: service confirmed foreground, calling getMediaProjection")
        val projection = manager.getMediaProjection(result.resultCode, data)
          ?: error("Screen sharing isn't available on this device")
        ChatGizaApplication.breadcrumb(context, "launcher: got projection, registering callback")
        projection.registerCallback(object : MediaProjection.Callback() {
        // Fires when the system revokes the projection itself (screen off,
        // user stops it from the system share-notification, etc.) -- not
        // just when stopScreenShare() asks for it, so this has to release
        // the VirtualDisplay/ImageReader here too rather than assume
        // stopScreenShare() already did it. Skips mediaProjection.stop()
        // itself since the projection is already stopping/stopped by
        // whatever triggered this callback.
        override fun onStop() {
          runCatching { virtualDisplay?.release() }
          virtualDisplay = null
          runCatching { screenImageReader?.close() }
          screenImageReader = null
          mediaProjection = null
          screenShareEnabled = false
          LiveVisionCallBridge.onHangUp = null
          LiveVisionCallBridge.onToggleMute = null
          runCatching { context.stopService(Intent(context, ScreenCaptureService::class.java)) }
        }
      }, Handler(Looper.getMainLooper()))
      mediaProjection = projection
      // Lets the ongoing-share notification's Hang Up/Mute buttons reach
      // back into this exact call -- see LiveVisionCallBridge's own doc
      // comment for why this is a plain callback bridge, not a broadcast
      // carrying state.
      LiveVisionCallBridge.onHangUp = {
        if (viewModel.hapticsEnabled) playLiveStopCue(context, coroutineScope)
        stopScreenShare()
        controller.stop()
        viewModel.closeLiveVision()
      }
      LiveVisionCallBridge.onToggleMute = {
        micMuted = !micMuted
        controller.setMicMuted(micMuted)
      }
      }.onFailure {
        ChatGizaApplication.breadcrumb(context, "launcher: setup FAILED: $it")
        stopScreenShare()
        controller.reportCameraError(it.message ?: "Screen sharing failed to start")
      }
    }
  }

  // Keeps the notification's "Mute"/"Unmute" label matching reality
  // whenever mute state changes (from the in-app pill or the notification
  // itself), while a share is actually active.
  LaunchedEffect(micMuted, screenShareEnabled) {
    if (screenShareEnabled) ScreenCaptureService.instance?.setMuted(micMuted)
  }
  LaunchedEffect(micMuted) {
    LiveCallService.instance?.setMuted(micMuted)
  }

  // Sets up the VirtualDisplay/ImageReader once a MediaProjection exists,
  // and tears it down when sharing stops -- same throttled-frame cadence
  // (1200ms) as the camera's ImageAnalysis.Analyzer above.
  LaunchedEffect(mediaProjection) {
    val projection = mediaProjection ?: return@LaunchedEffect
    runCatching {
      val metrics = context.resources.displayMetrics
      val width = metrics.widthPixels
      val height = metrics.heightPixels
      val density = metrics.densityDpi
      val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
      screenImageReader = reader
      var lastSentAt = 0L
      reader.setOnImageAvailableListener({ r ->
        val image = runCatching { r.acquireLatestImage() }.getOrNull() ?: return@setOnImageAvailableListener
        val now = System.currentTimeMillis()
        if (now - lastSentAt >= 1200) {
          lastSentAt = now
          runCatching { controller.sendFrame(screenImageToJpeg(image, width, height)) }
        }
        runCatching { image.close() }
      }, Handler(Looper.getMainLooper()))

      virtualDisplay = projection.createVirtualDisplay(
        "ChatGiZaScreenShare",
        width,
        height,
        density,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        reader.surface,
        null,
        null
      )
    }.onFailure {
      controller.reportCameraError(it.message ?: "Screen sharing failed to start")
      stopScreenShare()
    }
  }

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
      stopScreenShare()
      LiveVisionCallBridge.onHangUp = null
      LiveVisionCallBridge.onToggleMute = null
      runCatching { context.stopService(Intent(context, LiveCallService::class.java)) }
    }
  }

  Box(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND)) {
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
          color = APP_TEXT_COLOR,
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
      // so the status never shows controller.errorMessage's raw text.
      //
      // connectionState alone can't tell "genuinely live" apart from "just
      // failed/dropped back to Idle" -- both used to render the exact same
      // "Go ahead" status, so a lost connection looked identical to a
      // healthy one and the user could keep talking to nothing with no
      // indication anything was wrong. hasStartedConnecting distinguishes
      // real disconnects (Idle reached *after* Connecting/Listening) from
      // the harmless pre-start Idle frame before startLiveSession() fires.
      var hasStartedConnecting by remember { mutableStateOf(false) }
      var connectionLost by remember { mutableStateOf(false) }
      val isConnecting = controller.connectionState == RealtimeVisionController.ConnectionState.Connecting
      val statusText = when {
        connectionLost -> "Connection lost — tap to retry"
        controller.isAiSpeaking -> "ChatGiZa is speaking…"
        else -> "Go ahead"
      }

      // One cue (vibration + chime) the instant the session finishes
      // connecting and the mic actually opens -- not a repeating buzz
      // through the wait itself, which read as impatient rather than
      // helpful. Also brings up the ongoing-call notification (Hang Up,
      // Mute) for this voice session, matching how the equivalent Share
      // Screen notification already looks.
      LaunchedEffect(controller.connectionState) {
        when (controller.connectionState) {
          RealtimeVisionController.ConnectionState.Connecting -> {
            hasStartedConnecting = true
            connectionLost = false
          }
          RealtimeVisionController.ConnectionState.Listening -> {
            hasStartedConnecting = true
            connectionLost = false
            if (viewModel.hapticsEnabled) playLiveStartCue(context, coroutineScope)
            LiveVisionCallBridge.onHangUp = {
              if (viewModel.hapticsEnabled) playLiveStopCue(context, coroutineScope)
              stopScreenShare()
              controller.stop()
              viewModel.closeLiveVision()
            }
            LiveVisionCallBridge.onToggleMute = {
              micMuted = !micMuted
              controller.setMicMuted(micMuted)
            }
            runCatching { ContextCompat.startForegroundService(context, Intent(context, LiveCallService::class.java)) }
          }
          RealtimeVisionController.ConnectionState.Idle -> {
            if (hasStartedConnecting) connectionLost = true
          }
        }
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
              .background(if (connectionLost) Color(0xFFE53935).copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.12f))
              .then(
                if (connectionLost) {
                  Modifier.clickable {
                    connectionLost = false
                    hasStartedConnecting = false
                    startLiveSession()
                  }
                } else Modifier
              )
              .padding(horizontal = 14.dp)
          ) {
            if (isConnecting) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connecting_spinner),
                contentDescription = null,
                tint = Color.Black,
                modifier = Modifier.size(22.dp)
              )
              Spacer(modifier = Modifier.size(8.dp))
              Text("Connecting…", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            } else if (connectionLost) {
              Icon(
                imageVector = Icons.Filled.Refresh,
                contentDescription = null,
                tint = Color(0xFFB71C1C),
                modifier = Modifier.size(20.dp)
              )
              Spacer(modifier = Modifier.size(6.dp))
              Text(statusText, color = Color(0xFFB71C1C), fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            } else {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_talking),
                contentDescription = null,
                tint = Color.Black,
                modifier = Modifier.size(20.dp)
              )
              Spacer(modifier = Modifier.size(6.dp))
              Text(statusText, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
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

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Box {
            if (screenShareEnabled) {
              ScreenSharingPill(enabled = !isConnecting) { cameraMenuOpen = true }
            } else {
              VoiceControlPill(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video), contentDescription = "Camera", active = cameraEnabled, enabled = !isConnecting) {
                cameraMenuOpen = true
              }
            }
            DropdownMenu(
              expanded = cameraMenuOpen,
              onDismissRequest = { cameraMenuOpen = false },
              shape = RoundedCornerShape(16.dp),
              containerColor = APP_BACKGROUND,
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
                  label = if (screenShareEnabled) "Stop Sharing" else "Share Screen",
                  onClick = {
                    cameraMenuOpen = false
                    if (screenShareEnabled) {
                      stopScreenShare()
                    } else {
                      val manager = mediaProjectionManager
                      if (manager != null) {
                        ChatGizaApplication.breadcrumb(context, "menu: launching system capture dialog")
                        runCatching { screenCaptureLauncher.launch(manager.createScreenCaptureIntent()) }
                          .onFailure { controller.reportCameraError(it.message ?: "Screen sharing isn't available on this device") }
                      } else {
                        controller.reportCameraError("Screen sharing isn't available on this device")
                      }
                    }
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
                  .background(Color.Black)
                  .border(width = 1.dp, color = Color.White, shape = CircleShape),
                contentAlignment = Alignment.Center
              ) {
                if (activePersonality.iconRes != null) {
                  Icon(
                    painter = androidx.compose.ui.res.painterResource(activePersonality.iconRes),
                    contentDescription = activePersonality.label,
                    tint = Color.White,
                    modifier = Modifier.size(11.dp)
                  )
                } else {
                  Icon(
                    activePersonality.icon!!,
                    contentDescription = activePersonality.label,
                    tint = Color.White,
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
              .background(Color.White)
          ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxHeight()) {
              Box {
                Box(
                  modifier = Modifier
                    .padding(start = 5.dp)
                    .size(width = 40.dp, height = 38.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(Color.Black.copy(alpha = 0.10f))
                    .clickable(onClick = { toolMenuOpen = true }),
                  contentAlignment = Alignment.Center
                ) {
                  Icon(Icons.Filled.Add, contentDescription = "Tools", tint = Color.Black, modifier = Modifier.size(22.dp))
                }
                if (toolMenuOpen) {
                  ToolSelectSheet(
                    activeTool = viewModel.activeTool,
                    onSelect = { viewModel.selectTool(it) },
                    onDismiss = { toolMenuOpen = false }
                  )
                }
              }
              // Material3 TextField's own vertical padding is sized for a
              // 56dp+ default height -- inside this pill's fixed 46dp it
              // squashed the text against the top/bottom edges instead of
              // centering it. A BasicTextField gives full control over
              // that padding so the text actually sits centered and legible.
              Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (viewModel.input.isEmpty()) {
                  Text("Ask anything", color = APP_TEXT_COLOR.copy(alpha = 0.38f), fontSize = 15.sp)
                }
                BasicTextField(
                  value = viewModel.input,
                  onValueChange = viewModel::onInputChange,
                  modifier = Modifier.fillMaxWidth(),
                  singleLine = true,
                  textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 15.sp),
                  cursorBrush = SolidColor(Color.Black)
                )
              }
            }
          }
          Spacer(modifier = Modifier.size(8.dp))
          Box(
            modifier = Modifier
              .size(width = 100.dp, height = 46.dp)
              .clip(RoundedCornerShape(percent = 50))
              .background(Color.Black)
              .clickable(onClick = {
                if (viewModel.hapticsEnabled) playLiveStopCue(context, coroutineScope)
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
              LiveDotsIndicator(dotColor = Color.White, animated = false, count = 5, dotSize = 4.dp)
              Spacer(modifier = Modifier.size(8.dp))
              Text("Stop", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
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

// A distinct filled/colored pill (not just a dimmer icon like the other
// toggles) for when screen sharing is actively on -- matches how other
// apps (e.g. Grok) swap the camera icon for a highlighted share icon the
// moment sharing starts, so it's obvious at a glance without opening the
// menu. Same tap target as the plain camera pill it replaces.
@Composable
private fun ScreenSharingPill(enabled: Boolean, onClick: () -> Unit) {
  Box(
    modifier = Modifier
      .size(width = 84.dp, height = 46.dp)
      .alpha(if (enabled) 1f else 0.4f)
      .clip(RoundedCornerShape(percent = 50))
      .background(Color(0xFFFF9C2D))
      .clickable(enabled = enabled, onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_screen_share),
      contentDescription = "Sharing screen",
      tint = Color.White,
      modifier = Modifier.size(20.dp)
    )
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
      .background(Color.White)
      // Was 10% -- barely visible on its own, and now that the page
      // background moved from #F2F2F2 to #FCFCFC (much closer to this
      // pill's own white fill), the contrast that alpha relied on almost
      // entirely disappeared. Bumped to restore a clearly visible edge.
      .border(width = 1.dp, color = APP_TEXT_COLOR.copy(alpha = 0.18f), shape = RoundedCornerShape(percent = 50))
      .clickable(enabled = enabled, onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    // 0.35 read as "the icon vanished into the dark pill" when a control
    // (most noticeably Camera, off by default until permission is
    // granted) starts in its inactive state -- still visibly dimmer than
    // active, but no longer hard to make out.
    icon(Color.Black.copy(alpha = if (active) 1f else 0.7f))
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
      .background(Color.White.copy(alpha = 0.35f))
      .clickable(enabled = enabled, onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(
      icon,
      contentDescription = contentDescription,
      tint = Color.Black.copy(alpha = if (enabled) 1f else 0.35f),
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
      .background(if (pressed) Color.Black else Color.White)
      .border(width = 1.dp, color = APP_TEXT_COLOR.copy(alpha = 0.1f), shape = CircleShape)
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
      tint = if (pressed) Color.White else Color.Black,
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
  PersonalityOption("assistant", "Assistant", null, iconRes = R.drawable.ic_advanced),
  PersonalityOption("therapist", "\"Therapist\"", null, iconRes = R.drawable.ic_therapist),
  PersonalityOption("storyteller", "Storyteller", null, iconRes = R.drawable.ic_storyteller),
  PersonalityOption("story_time", "Story Time", null, tag = "Kids", iconRes = R.drawable.ic_story_time),
  PersonalityOption("trivia_game", "Trivia Game", null, tag = "Kids", iconRes = R.drawable.ic_trivia_game),
  PersonalityOption("giza_doc", "GiZa Doc", null, iconRes = R.drawable.ic_giza_doc),
  PersonalityOption("unhinged", "Unhinged", null, tag = "18+", adultOnly = true, iconRes = R.drawable.ic_unhinged),
  PersonalityOption("meditation", "Meditation", null, iconRes = R.drawable.ic_meditation),
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
      .background(if (selected) Color.Black else Color.Black.copy(alpha = 0.08f))
      .clickable(onClick = onClick)
      .padding(horizontal = 18.dp, vertical = 14.dp)
  ) {
    if (option.iconRes != null) {
      Icon(androidx.compose.ui.res.painterResource(option.iconRes), contentDescription = null, tint = if (selected) Color.White else Color.Black, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    } else if (option.icon != null) {
      Icon(option.icon, contentDescription = null, tint = if (selected) Color.White else Color.Black, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    } else {
      Icon(Icons.Filled.Add, contentDescription = null, tint = if (selected) Color.White else Color.Black, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(10.dp))
    }
    Text(option.label, color = if (selected) Color.White else Color.Black, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    if (option.tag != null) {
      Spacer(modifier = Modifier.width(6.dp))
      Text(option.tag, color = if (selected) Color.White.copy(alpha = 0.5f) else Color.Black.copy(alpha = 0.4f), fontSize = 13.sp)
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
  var showVoiceLibrary by remember { mutableStateOf(false) }
  var outputDeviceDialogOpen by remember { mutableStateOf(false) }
  val outputDeviceOptions = remember {
    listOf(
      Triple("headset", "Headset", Icons.Outlined.Headset),
      Triple("speaker", "Speaker", Icons.Outlined.VolumeUp),
      Triple("earpiece", "Earpiece", Icons.Outlined.Hearing)
    )
  }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    if (showVoiceLibrary) {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 20.dp)
          .padding(bottom = 32.dp)
      ) {
        Box(modifier = Modifier.fillMaxWidth()) {
          IconButton(onClick = { showVoiceLibrary = false }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(28.dp))
          }
          Text(
            "Voice Library",
            color = APP_TEXT_COLOR,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Center)
          )
        }
        Spacer(modifier = Modifier.height(20.dp))

        // Same hero orb as Settings > Voice, above the list there too --
        // requested so this sheet's Voice Library matches that screen, not
        // just its list rows.
        val liveHeartbeatScale = remember { Animatable(1f) }
        val liveHeartbeatScope = rememberCoroutineScope()
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
          VoiceLibraryHeroOrb(
            modifier = Modifier
              .size(110.dp)
              .graphicsLayer {
                scaleX = liveHeartbeatScale.value
                scaleY = liveHeartbeatScale.value
              }
              .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
              ) {
                liveHeartbeatScope.launch {
                  liveHeartbeatScale.animateTo(1.18f, tween(140, easing = FastOutSlowInEasing))
                  liveHeartbeatScale.animateTo(1f, tween(160, easing = FastOutSlowInEasing))
                  liveHeartbeatScale.animateTo(1.1f, tween(120, easing = FastOutSlowInEasing))
                  liveHeartbeatScale.animateTo(1f, tween(180, easing = FastOutSlowInEasing))
                }
              },
            tint = Color.Black
          )
        }

        Spacer(modifier = Modifier.height(24.dp))
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          VOICE_OPTIONS.forEach { option ->
            VoiceCard(
              option = option,
              selected = selectedVoiceId == option.id,
              onClick = {
                onVoiceChange(option.id)
                onPreviewVoice(option.id)
              }
            )
          }
        }
      }
      return@ModalBottomSheet
    }
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 32.dp)
    ) {
      Text(
        "Voice Settings",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.fillMaxWidth(),
        textAlign = TextAlign.Center
      )

      Spacer(modifier = Modifier.height(28.dp))
      Text("Voice", color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFFF4F4F4))
          .clickable { showVoiceLibrary = true }
          .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Voice", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(
            VOICE_OPTIONS.find { it.id == selectedVoiceId }?.name ?: selectedVoiceId,
            color = APP_TEXT_COLOR.copy(alpha = 0.5f),
            fontSize = 15.sp
          )
          Spacer(modifier = Modifier.width(4.dp))
          Icon(
            Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = Color.Black.copy(alpha = 0.4f),
            modifier = Modifier.size(20.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(26.dp))
      Text("Personality", color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
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
      Text("Voice Activation", color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(24.dp))
          .background(Color.Black.copy(alpha = 0.08f))
          .padding(4.dp)
      ) {
        listOf("default" to "Default", "push_to_talk" to "Push to Talk").forEach { (id, label) ->
          val selected = activationMode == id
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(20.dp))
              .background(if (selected) Color.Black else Color.Transparent)
              .clickable { onActivationModeChange(id) }
              .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
          ) {
            Text(
              label,
              color = if (selected) Color.White else Color.Black,
              fontSize = 14.sp,
              fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(26.dp))
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("Voice Speed", color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        Text(String.format("%.1fx", speed), color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(12.dp))
      PreviewSlider(
        value = ((speed - 0.5f) / 1.5f).coerceIn(0f, 1f),
        onValueChange = { fraction -> onSpeedChange(0.5f + fraction * 1.5f) },
        modifier = Modifier.fillMaxWidth()
      )

      Spacer(modifier = Modifier.height(26.dp))
      Text("Output Device", color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFFF4F4F4))
          .clickable { outputDeviceDialogOpen = true }
          .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Output Device", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(
            outputDeviceOptions.find { it.first == outputDevice }?.second ?: outputDevice,
            color = APP_TEXT_COLOR.copy(alpha = 0.5f),
            fontSize = 15.sp
          )
          Spacer(modifier = Modifier.width(4.dp))
          Icon(
            Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = Color.Black.copy(alpha = 0.4f),
            modifier = Modifier.size(20.dp)
          )
        }
      }
    }
  }

  if (outputDeviceDialogOpen) {
    Dialog(onDismissRequest = { outputDeviceDialogOpen = false }) {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(24.dp))
          .background(Color.White)
          .padding(20.dp)
      ) {
        Text("Output Device", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        outputDeviceOptions.forEach { (id, label, icon) ->
          val selected = outputDevice == id
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clickable {
                onOutputDeviceChange(id)
                outputDeviceDialogOpen = false
              }
              .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .border(2.dp, if (selected) Color.Black else Color.Black.copy(alpha = 0.3f), CircleShape),
              contentAlignment = Alignment.Center
            ) {
              if (selected) {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Color.Black))
              }
            }
            Spacer(modifier = Modifier.width(12.dp))
            if (id == "speaker") {
              SpeakerIconCustom(tint = Color.Black, modifier = Modifier.size(18.dp))
            } else {
              Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text(label, color = APP_TEXT_COLOR, fontSize = 16.sp)
          }
        }
      }
    }
  }
}

private fun liveVibrator(context: android.content.Context): Vibrator {
  return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    val manager = context.getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
    manager.defaultVibrator
  } else {
    @Suppress("DEPRECATION")
    context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as Vibrator
  }
}

// A single short pulse + a short upbeat two-tone chime the instant the
// session actually goes live -- deliberately distinct from
// [playLiveStopCue] so start and end feel different, not just present.
// Uses STREAM_VOICE_CALL, not STREAM_NOTIFICATION: by this point
// RealtimeVisionController.start() has already switched the device into
// MODE_IN_COMMUNICATION, and a notification-stream tone is frequently
// inaudible in that mode (silent notification volume, or the stream just
// not being the one actually routed to the active output) -- confirmed
// on-device: no sound played at all until this changed.
private fun playLiveStartCue(context: android.content.Context, scope: CoroutineScope) {
  runCatching {
    val vibrator = liveVibrator(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createOneShot(60, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
      @Suppress("DEPRECATION") vibrator.vibrate(60)
    }
  }
  scope.launch {
    runCatching {
      val tone = ToneGenerator(AudioManager.STREAM_VOICE_CALL, 100)
      tone.startTone(ToneGenerator.TONE_PROP_BEEP2, 150)
      delay(250)
      tone.release()
    }
  }
}

// A double-pulse + a lower/duller single tone on hang-up -- reads as
// "ended", not a repeat of the start cue.
private fun playLiveStopCue(context: android.content.Context, scope: CoroutineScope) {
  runCatching {
    val vibrator = liveVibrator(context)
    val pattern = longArrayOf(0, 50, 70, 50)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
    } else {
      @Suppress("DEPRECATION") vibrator.vibrate(pattern, -1)
    }
  }
  scope.launch {
    runCatching {
      val tone = ToneGenerator(AudioManager.STREAM_VOICE_CALL, 100)
      tone.startTone(ToneGenerator.TONE_PROP_NACK, 180)
      delay(280)
      tone.release()
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

// Screen-share equivalent of imageProxyToJpeg above -- an ImageReader in
// RGBA_8888 format hands back a row-padded buffer (rowStride is often
// wider than width*4), so the bitmap is built at the padded width first
// and then cropped down to the real screen width before compressing.
private fun screenImageToJpeg(image: Image, width: Int, height: Int): ByteArray {
  val plane = image.planes[0]
  val pixelStride = plane.pixelStride
  val rowStride = plane.rowStride
  val rowPadding = rowStride - pixelStride * width
  val paddedBitmap = Bitmap.createBitmap(width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888)
  paddedBitmap.copyPixelsFromBuffer(plane.buffer)
  val bitmap = Bitmap.createBitmap(paddedBitmap, 0, 0, width, height)
  paddedBitmap.recycle()
  val out = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.JPEG, 70, out)
  bitmap.recycle()
  return out.toByteArray()
}

// Events is a real, swipeable full-page carousel (per the reference: plain
// black card, "Events" label, bold headline + a short subtitle line, and a
// "current/total" counter badge) -- no icons, just text on black.
private data class ChatGizaAnnouncement(
  val headline: String,
  val subtitle: String,
  val isAd: Boolean = false,
  val linkUrl: String? = null,
  // Was the standalone "Quantara" tab next to "Ask" in the chat top bar --
  // folded into this rotation instead of its own always-visible control.
  // Handled separately from linkUrl since it opens an in-app screen
  // (viewModel.openChatGizaMedia()), not a browser Intent.
  val isFeatureLink: Boolean = false
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
  ),
  ChatGizaAnnouncement(
    "Explore ChatGiZa Media",
    "Discover posts, images, and more from the community.",
    isFeatureLink = true
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
      .background(Color(0xFFF4F4F4))
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
            if (item.isFeatureLink) {
              it.clickable { viewModel.openChatGizaMedia() }
            } else if (item.isAd && item.linkUrl != null) {
              it.clickable {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(item.linkUrl))) }
              }
            } else it
          }
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("Events", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 10.sp)
          if (item.isAd) {
            Spacer(modifier = Modifier.width(6.dp))
            Box(
              modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Black.copy(alpha = 0.15f))
                .padding(horizontal = 4.dp, vertical = 1.dp)
            ) {
              Text("Ad", color = APP_TEXT_COLOR.copy(alpha = 0.7f), fontSize = 8.sp, fontWeight = FontWeight.Medium)
            }
          }
        }
        Spacer(modifier = Modifier.height(1.dp))
        Text(
          item.headline,
          color = APP_TEXT_COLOR,
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold
        )
        Text(
          item.subtitle,
          color = APP_TEXT_COLOR.copy(alpha = 0.6f),
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
        .background(Color.Black.copy(alpha = 0.12f))
        .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
      Text(
        "${pagerState.currentPage + 1}/${items.size}",
        color = APP_TEXT_COLOR.copy(alpha = 0.7f),
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
      .background(Color.White)
      .clickable(onClick = onClick)
      .padding(horizontal = 14.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier.size(26.dp).clip(RoundedCornerShape(9.dp)).background(Color.Black),
      contentAlignment = Alignment.Center
    ) {
      // Was tint = Color.Black on a Color.Black box -- invisible, a
      // black icon drawn on a black background. White is what actually
      // shows up against the dark square.
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

  // Billing is hidden for now (see the "Your account" banner below and
  // ChatViewModel.openBilling's callers) while the server-side payment
  // system is being rebuilt -- no point prefetching it here, and doing so
  // used to fail silently in the background and stomp viewModel.errorMessage
  // (a single field shared across unrelated screens) with a stray billing
  // error that could then show up on a completely different screen.

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

        // A big account-plan banner instead of an empty gap. Shows the free
        // tier only -- Billing is hidden while the payment system is being
        // rebuilt (see ChatViewModel.openBilling's now-nonexistent callers),
        // so this is a static display, not a tap target, until that's back.
        val planName = "Free"
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .height(150.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(Color.White, Color(0xFFE0E0E0))))
            .padding(20.dp)
        ) {
          Icon(
            Icons.Outlined.WorkspacePremium,
            contentDescription = null,
            tint = Color.Black.copy(alpha = 0.14f),
            modifier = Modifier.align(Alignment.TopEnd).size(72.dp)
          )
          Column(modifier = Modifier.align(Alignment.BottomStart)) {
            Text("Your account", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(planName, color = APP_TEXT_COLOR, fontSize = 30.sp, fontWeight = FontWeight.Bold)
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
            .background(Color.White)
            .padding(vertical = 10.dp)
        ) {
          // Tab row — only "History" has a real dataset behind it; "Private"
          // is visual-only until there's an actual Private concept to
          // filter into (see "Coming soon" below). GiZa/V2 were dropped
          // per feedback. Wrapped in its own pill background (instead of
          // sitting bare on the card) so it reads as one dedicated
          // control, with a second highlight pill behind whichever tab is
          // selected.
          Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier
              .padding(horizontal = 14.dp)
              .clip(RoundedCornerShape(20.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.06f))
              .horizontalScroll(rememberScrollState())
              .padding(6.dp)
          ) {
            listOf("History", "Private").forEach { tab ->
              val selected = selectedHistoryTab == tab
              Text(
                tab,
                color = if (selected) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.4f),
                fontSize = 14.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                modifier = Modifier
                  .clip(RoundedCornerShape(16.dp))
                  .background(if (selected) colorScheme.onBackground.copy(alpha = 0.12f) else Color.Transparent)
                  .clickable {
                    // "Private" is a real, separate full-screen space now
                    // (see PrivateChatScreen) rather than an inline filter
                    // of this same list, so it navigates away instead of
                    // just flipping selectedHistoryTab.
                    if (tab == "Private") viewModel.openPrivateChat() else selectedHistoryTab = tab
                  }
                  .padding(horizontal = 12.dp, vertical = 6.dp)
              )
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          // "Private" navigates to its own screen now instead of setting
          // selectedHistoryTab (see the tab row above), so this list is
          // always the real History content -- no more "Coming soon" branch
          // for it to fall into.
          if (viewModel.loadingHistory) {
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
          DeleteIcon(tint = Color.Black)
          Spacer(modifier = Modifier.size(16.dp))
          Text("Delete", color = APP_TEXT_COLOR, fontSize = 16.sp)
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
          Text("Delete", color = APP_TEXT_COLOR, fontWeight = FontWeight.Bold)
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

// A real, separate thread -- not a filtered view of regular History. Its own
// dark background deliberately breaks from the rest of this (pinned-light)
// app, reading as a distinct "different mode" the way the reference for this
// screen did, and messages here never touch ChatGizaApi.saveHistory or the
// synced conversation list; see ChatViewModel's privateMessages/
// sendPrivateMessage for the actual on-device-only persistence.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrivateChatScreen(viewModel: ChatViewModel) {
  BackHandler {
    if (viewModel.privateHistoryOpen) viewModel.closePrivateHistory() else viewModel.closePrivateChat()
  }
  val context = LocalContext.current
  // Photo attachment -- reuses uriToPostImageDataUrl (the same URI->data-
  // URL helper the main composer and Quantara's post composer already
  // rely on) rather than a third copy of that decode/downscale logic.
  val privateComposerScope = rememberCoroutineScope()
  var attachPrivateMenuOpen by remember { mutableStateOf(false) }
  var attachPrivateError by remember { mutableStateOf(false) }
  fun attachPrivatePickedImage(uri: Uri) {
    attachPrivateError = false
    privateComposerScope.launch {
      val dataUrl = withContext(Dispatchers.IO) { uriToPostImageDataUrl(context, uri) }
      if (dataUrl != null) {
        viewModel.setAttachedPrivateImage(uri, dataUrl)
      } else {
        attachPrivateError = true
      }
    }
  }
  val privateGalleryPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) attachPrivatePickedImage(uri)
  }
  var pendingPrivateCameraUri by remember { mutableStateOf<Uri?>(null) }
  val privateCameraCapture = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
    val uri = pendingPrivateCameraUri
    if (success && uri != null) attachPrivatePickedImage(uri)
  }
  var hasPrivateCameraPermission by remember {
    mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
  }
  fun launchPrivateCamera() {
    val photoFile = File(context.cacheDir, "private_composer_camera_${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", photoFile)
    pendingPrivateCameraUri = uri
    privateCameraCapture.launch(uri)
  }
  val privateCameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasPrivateCameraPermission = granted
    if (granted) launchPrivateCamera()
  }
  // The app is set to light system-bar icons app-wide (see onCreate's
  // enableEdgeToEdge comment) because every other screen has a white
  // background. This is the one screen with a black background, so those
  // same dark icons render invisible against it -- reads as the status bar
  // (clock/signal/battery) having vanished entirely. Switch to light
  // (white) icons only while this screen is up, and always restore dark
  // icons on the way out regardless of which of the several ways there are
  // to leave (back button, closePrivateChat, process death).
  val view = LocalView.current
  DisposableEffect(Unit) {
    val window = (context as? Activity)?.window
    val controller = window?.let { WindowCompat.getInsetsController(it, view) }
    controller?.isAppearanceLightStatusBars = false
    controller?.isAppearanceLightNavigationBars = false
    onDispose {
      controller?.isAppearanceLightStatusBars = true
      controller?.isAppearanceLightNavigationBars = true
    }
  }
  val listState = rememberLazyListState()
  LaunchedEffect(viewModel.privateMessages.size) {
    if (viewModel.privateMessages.isNotEmpty()) {
      listState.animateScrollToItem(viewModel.privateMessages.lastIndex)
    }
  }

  // Same in-app voice typing as the main Chat composer (SpeechRecognizer,
  // not the full-screen ACTION_RECOGNIZE_SPEECH dialog) -- live partial
  // transcript fills the private input as the user talks, kept fully
  // on-device same as everything else in this screen.
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
      viewModel.onPrivateInputChange(if (base.isBlank()) text else "$base $text")
    }
  }
  fun stopListening(keepResult: Boolean) {
    isListening = false
    listeningPreview = ""
    runCatching { if (keepResult) speechRecognizer?.stopListening() else speechRecognizer?.cancel() }
  }
  fun startListening() {
    val recognizer = speechRecognizer ?: return
    inputBeforeListening.value = viewModel.privateInput
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

  // No Scaffold/topBar here anymore -- that reserved a fixed strip of
  // layout space for the header, which is what every earlier "gap at the
  // top" attempt was really fighting against. The header now floats on
  // top of the message list instead (a real overlay, like the ChatGPT
  // reference this was compared against), so content scrolls all the way
  // under it, fading out as it goes via the gradient scrim below --
  // there's no reserved "layer" between the background and the content
  // anymore because there's no separate layer at all.
  Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
    when {
      !viewModel.privateChatUnlocked -> PrivateChatLockScreen(viewModel)
      viewModel.privateHistoryOpen -> Box(modifier = Modifier.fillMaxSize().padding(top = 84.dp)) {
        PrivateHistoryList(viewModel)
      }
      // No Column/weight() wrapper anymore -- the composer used to be a
      // sibling of this list inside a weighted Column, which is exactly
      // what forced a gap to exist SOMEWHERE (top or bottom depending on
      // which anchoring was tried) whenever a short conversation didn't
      // fill that reserved space. The composer is now a floating overlay
      // too (further down, alongside the header), so this list just fills
      // the whole screen like the header's content already does, with
      // bottom contentPadding standing in for where the composer usually
      // sits rather than an empty Column slot forcing a real gap to exist.
      else -> if (viewModel.privateMessages.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          Text(
            "A separate space for anything you'd rather not have in your regular history.\nNothing here is saved to your account — it stays only on this device.",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 40.dp)
          )
        }
      } else {
        LazyColumn(
          state = listState,
          modifier = Modifier.fillMaxSize(),
          // Top clears the floating header at rest (84dp); bottom clears
          // the floating composer at rest (90dp) -- scrolling can still
          // carry content further behind either one, same as the header.
          contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 84.dp, bottom = 90.dp),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          items(viewModel.privateMessages, key = { it.id }) { msg ->
            if (msg.role == "user") {
              Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Box(
                  modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White.copy(alpha = 0.12f))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                  Text(msg.content, color = Color.White, fontSize = 15.sp)
                }
              }
            } else {
              Box(modifier = Modifier.fillMaxWidth()) {
                MarkdownText(text = msg.content.ifEmpty { "…" }, baseColor = Color.White, fontSize = 15.sp)
              }
            }
          }
        }
      }
    }

    // Gradient scrim -- opaque black at the very top fading to fully
    // transparent, sitting between the scrolling content and the floating
    // header below. This is what actually produces the "text fades out as
    // it reaches the header" look from the reference screenshot: the text
    // itself doesn't change, it's just covered by an increasingly opaque
    // black overlay the closer it gets to the top.
    if (viewModel.privateChatUnlocked && !viewModel.privateHistoryOpen) {
      Box(
        modifier = Modifier
          .align(Alignment.TopCenter)
          .fillMaxWidth()
          .height(110.dp)
          .background(Brush.verticalGradient(listOf(Color.Black, Color.Black.copy(alpha = 0f))))
      )
    }

    // Floating header -- drawn last (on top of the content and the scrim
    // above), and reserves no layout space of its own, which is what lets
    // the message list scroll all the way up behind it instead of always
    // stopping short of it.
    Row(
      modifier = Modifier
        .align(Alignment.TopCenter)
        .fillMaxWidth()
        .statusBarsPadding()
        .padding(horizontal = 12.dp, vertical = 3.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(
        onClick = { viewModel.closePrivateChat() },
        modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f))
      ) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.White)
      }
      Spacer(modifier = Modifier.weight(1f))
      // Only once unlocked -- these aren't reachable from the PIN screen
      // itself, same as the rest of the thread underneath it.
      if (viewModel.privateChatUnlocked) {
        IconButton(
          onClick = { viewModel.openPrivateHistory() },
          modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f))
        ) {
          // Icons.Outlined.History doesn't actually exist in this
          // project's icon set (build failure: "Unresolved reference
          // 'History'") -- Schedule is already used elsewhere in this
          // same file and known to resolve.
          Icon(Icons.Outlined.Schedule, contentDescription = "Private history", tint = Color.White, modifier = Modifier.size(22.dp))
        }
        Spacer(modifier = Modifier.width(8.dp))
        IconButton(
          onClick = { viewModel.startNewPrivateChat() },
          modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f))
        ) {
          // ic_new_chat_bubble (the same icon the main Ask/Chat screen
          // uses) turned out too easy to mistake for just another circle
          // next to the clock icon, twice, even after switching to it
          // specifically for consistency -- AddBox (a square with a plus)
          // is unambiguous at this size even alone, trading strict
          // consistency with the main screen for actually being legible.
          Icon(Icons.Outlined.AddBox, contentDescription = "New private chat", tint = Color.White, modifier = Modifier.size(22.dp))
        }
      } else {
        Spacer(modifier = Modifier.size(44.dp))
      }
    }

    // Bottom scrim + floating composer, symmetric to the header above --
    // same reasoning: a Row sitting inside the Column as a sibling of the
    // message list reserved its own fixed slot, which is what kept
    // producing a gap somewhere no matter which direction the list's
    // content was anchored. Floating it here instead means it always sits
    // at the screen's true bottom edge (Box alignment, not content-
    // relative position), with the message list free to fill the rest of
    // the screen behind it exactly like it does behind the header.
    if (viewModel.privateChatUnlocked && !viewModel.privateHistoryOpen) {
      Box(
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .height(110.dp)
          .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0f), Color.Black)))
      )
      Column(
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .navigationBarsPadding()
          .imePadding()
          .padding(10.dp)
      ) {
        // Attachment preview -- a small thumbnail + remove button above the
        // pill, matching the main composer's own attachment preview shape,
        // shown whenever a photo is picked but not sent yet.
        val attachedUri = viewModel.attachedPrivateImageUri
        if (attachedUri != null) {
          Row(
            modifier = Modifier
              .padding(bottom = 8.dp)
              .clip(RoundedCornerShape(16.dp))
              .background(Color.White.copy(alpha = 0.1f))
              .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            AsyncImage(
              model = attachedUri,
              contentDescription = "Attached photo",
              contentScale = ContentScale.Crop,
              modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp))
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text("Photo · ready to send", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp, modifier = Modifier.weight(1f))
            Box(
              modifier = Modifier
                .size(26.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.15f))
                .clickable { viewModel.clearAttachedPrivateImage() },
              contentAlignment = Alignment.Center
            ) {
              Icon(Icons.Outlined.Close, contentDescription = "Remove attachment", tint = Color.White, modifier = Modifier.size(14.dp))
            }
          }
        }
        if (attachPrivateError) {
          Text(
            "Couldn't attach that — try a different photo",
            color = Color.White.copy(alpha = 0.6f),
            fontSize = 12.sp,
            modifier = Modifier.padding(bottom = 6.dp)
          )
        }
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(22.dp))
          .background(Color.White.copy(alpha = 0.1f))
          .padding(horizontal = 14.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        if (isListening) {
          Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
              contentDescription = "Listening",
              tint = Color.White,
              modifier = Modifier.size(20.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Text(
            text = listeningPreview.ifBlank { "Listening…" },
            color = Color.White.copy(alpha = if (listeningPreview.isBlank()) 0.5f else 1f),
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(Color.White.copy(alpha = 0.1f))
              .clickable { stopListening(keepResult = false) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Cancel", tint = Color.White, modifier = Modifier.size(20.dp))
          }
          Spacer(modifier = Modifier.width(6.dp))
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(Color.White)
              .clickable { stopListening(keepResult = true) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Filled.Check, contentDescription = "Done", tint = Color.Black, modifier = Modifier.size(20.dp))
          }
        } else {
          Box {
            IconButton(
              onClick = { attachPrivateMenuOpen = true },
              modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.15f))
            ) {
              Icon(Icons.Filled.Add, contentDescription = "Attach photo", tint = Color.White, modifier = Modifier.size(20.dp))
            }
            DropdownMenu(
              expanded = attachPrivateMenuOpen,
              onDismissRequest = { attachPrivateMenuOpen = false },
              shape = RoundedCornerShape(16.dp)
            ) {
              DropdownMenuItem(
                text = { Text("Photo Library") },
                leadingIcon = { Icon(Icons.Outlined.Image, contentDescription = null) },
                onClick = {
                  attachPrivateMenuOpen = false
                  privateGalleryPicker.launch("image/*")
                }
              )
              DropdownMenuItem(
                text = { Text("Camera") },
                // Icons.Outlined.PhotoCamera isn't verified to exist in this
                // project's icon set (the History icon wasn't, despite
                // looking equally standard) -- ic_camera is the same proven
                // drawable the main composer's own Camera row already uses.
                leadingIcon = { Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_camera), contentDescription = null) },
                onClick = {
                  attachPrivateMenuOpen = false
                  if (hasPrivateCameraPermission) launchPrivateCamera() else privateCameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
              )
            }
          }
          Spacer(modifier = Modifier.width(6.dp))
          Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (viewModel.privateInput.isEmpty()) {
              Text("Message privately", color = Color.White, fontSize = 14.sp)
            }
            BasicTextField(
              value = viewModel.privateInput,
              onValueChange = { viewModel.onPrivateInputChange(it) },
              modifier = Modifier.fillMaxWidth(),
              textStyle = androidx.compose.ui.text.TextStyle(fontSize = 14.sp, color = Color.White),
              cursorBrush = SolidColor(Color.White)
            )
          }
          Spacer(modifier = Modifier.width(6.dp))
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(Color.White.copy(alpha = 0.15f))
              .clickable { launchSpeech() },
            contentAlignment = Alignment.Center
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
              contentDescription = "Voice input",
              tint = Color.White,
              modifier = Modifier.size(20.dp)
            )
          }
          Spacer(modifier = Modifier.width(6.dp))
          // Three states in this one spot: waveform (idle, nothing typed
          // yet) -> up-arrow (there's text to send) -> white square (a
          // reply is streaming in, tap to stop and keep whatever's there
          // so far) -- same shape as ChatGPT's own composer button.
          val privateHasSendableContent = viewModel.privateInput.isNotBlank() || viewModel.attachedPrivateImageUri != null
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(Color(0xFF0A84FF))
              .clickable {
                when {
                  viewModel.privateSending -> viewModel.stopPrivateMessage()
                  privateHasSendableContent -> viewModel.sendPrivateMessage()
                }
              },
            contentAlignment = Alignment.Center
          ) {
            when {
              viewModel.privateSending -> {
                Box(modifier = Modifier.size(14.dp).clip(RoundedCornerShape(4.dp)).background(Color.White))
              }
              privateHasSendableContent -> {
                Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(22.dp))
              }
              else -> {
                Icon(
                  painter = androidx.compose.ui.res.painterResource(R.drawable.ic_waveform_speak),
                  contentDescription = "Send",
                  tint = Color.White,
                  modifier = Modifier.size(22.dp)
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

// Shown in place of the thread whenever privateChatUnlocked is false --
// either first-time PIN creation (no hash stored yet) or the unlock prompt
// (a hash already exists). Both share this one screen/dark styling; which
// mode is active is driven entirely by whether viewModel.privateChatPinHash
// is null, same split App Lock's own setup screen uses.
@Composable
private fun PrivateChatLockScreen(viewModel: ChatViewModel) {
  var confirmReset by remember { mutableStateOf(false) }
  val hasPin = viewModel.privateChatPinHash != null
  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded),
      contentDescription = null,
      tint = Color.White,
      modifier = Modifier.size(36.dp)
    )
    Spacer(modifier = Modifier.height(16.dp))
    Text(
      if (!hasPin) "Set a PIN for Private" else "Enter Your Private PIN",
      color = Color.White,
      fontSize = 20.sp,
      fontWeight = FontWeight.Bold,
      textAlign = TextAlign.Center
    )
    Spacer(modifier = Modifier.height(6.dp))
    Text(
      if (!hasPin) {
        if (viewModel.privateChatSetupStep == "enter") "Choose a 4-6 digit PIN. This screen won't open without it." else "Enter the same PIN again to confirm"
      } else {
        "This PIN stays on this device only -- it isn't part of your account password."
      },
      color = Color.White.copy(alpha = 0.5f),
      fontSize = 13.sp,
      textAlign = TextAlign.Center
    )
    Spacer(modifier = Modifier.height(28.dp))
    if (!hasPin) {
      PrivateChatCodeField(value = viewModel.privateChatPinInput, onValueChange = viewModel::onPrivateChatPinChange)
    } else {
      PrivateChatCodeField(value = viewModel.privateChatGateInput, onValueChange = viewModel::onPrivateChatGateInputChange)
    }
    if (viewModel.privateChatError != null) {
      Spacer(modifier = Modifier.height(10.dp))
      Text(viewModel.privateChatError!!, color = Color(0xFFFF6B6B), fontSize = 13.sp)
    }
    Spacer(modifier = Modifier.height(20.dp))
    Button(
      onClick = { if (!hasPin) viewModel.submitPrivateChatSetupStep() else viewModel.submitPrivateChatUnlock() },
      shape = RoundedCornerShape(24.dp),
      colors = ButtonDefaults.buttonColors(containerColor = APP_BACKGROUND),
      modifier = Modifier.fillMaxWidth().height(50.dp)
    ) {
      Text(
        if (!hasPin) (if (viewModel.privateChatSetupStep == "enter") "Continue" else "Confirm") else "Unlock",
        color = APP_TEXT_COLOR,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold
      )
    }
    if (hasPin) {
      Spacer(modifier = Modifier.height(16.dp))
      Text(
        "Forgot PIN?",
        color = Color.White.copy(alpha = 0.5f),
        fontSize = 13.sp,
        textDecoration = TextDecoration.Underline,
        modifier = Modifier.clickable { confirmReset = true }
      )
    }
  }
  if (confirmReset) {
    ConfirmDangerDialog(
      title = "Forgot your PIN?",
      message = "There's no way to recover it. Resetting will also permanently delete everything currently in Private, since it can't be unlocked without it.",
      onConfirm = {
        viewModel.resetPrivateChatPin()
        confirmReset = false
      },
      onDismiss = { confirmReset = false }
    )
  }
}

// Dark-themed twin of the light CodeField further down this file -- that
// one is hardcoded to a light background for its other call sites (App
// Lock, password change), which would clash with Private's black screen.
@Composable
private fun PrivateChatCodeField(value: String, onValueChange: (String) -> Unit) {
  var focused by remember { mutableStateOf(false) }
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .background(Color.White.copy(alpha = 0.08f))
      .border(1.dp, if (focused) Color.White else Color.Transparent, RoundedCornerShape(14.dp))
      .padding(horizontal = 16.dp, vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded),
      contentDescription = null,
      tint = Color.White.copy(alpha = 0.4f),
      modifier = Modifier.size(20.dp)
    )
    Spacer(modifier = Modifier.width(12.dp))
    Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
      if (value.isEmpty()) {
        Text("Enter PIN", color = Color.White.copy(alpha = 0.35f), fontSize = 16.sp)
      }
      BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 16.sp, letterSpacing = 4.sp),
        cursorBrush = SolidColor(Color.White),
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
        modifier = Modifier
          .fillMaxWidth()
          .onFocusChanged { state -> focused = state.isFocused }
      )
    }
  }
}

// Shown in place of the thread when privateHistoryOpen is true -- every past
// private thread (see ChatViewModel.privateConversations), newest first.
// Tapping one loads it into the active thread; New Chat in the header is
// what starts a fresh one instead of ever landing here automatically.
@Composable
private fun PrivateHistoryList(viewModel: ChatViewModel) {
  var pendingDeleteId by remember { mutableStateOf<String?>(null) }
  val conversations = viewModel.privateConversations.sortedByDescending { it.lastActivity }
  if (conversations.isEmpty()) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
      Text(
        "No past private chats yet.",
        color = Color.White.copy(alpha = 0.5f),
        fontSize = 14.sp,
        modifier = Modifier.padding(horizontal = 40.dp)
      )
    }
  } else {
    LazyColumn(
      modifier = Modifier.fillMaxSize(),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
      verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
      items(conversations, key = { it.id }) { conversation ->
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { viewModel.selectPrivateConversation(conversation.id) }
            .padding(horizontal = 8.dp, vertical = 14.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Column(modifier = Modifier.weight(1f)) {
            Text(
              conversation.title,
              color = Color.White,
              fontSize = 15.sp,
              fontWeight = FontWeight.Medium,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              formatMediaPostTimeAgo(conversation.lastActivity),
              color = Color.White.copy(alpha = 0.4f),
              fontSize = 12.sp
            )
          }
          IconButton(onClick = { pendingDeleteId = conversation.id }, modifier = Modifier.size(36.dp)) {
            DeleteIcon(tint = Color.White.copy(alpha = 0.5f))
          }
        }
      }
    }
  }
  if (pendingDeleteId != null) {
    ConfirmDangerDialog(
      title = "Delete this chat?",
      message = "This private chat will be deleted from this device. This can't be undone.",
      onConfirm = {
        viewModel.deletePrivateConversation(pendingDeleteId!!)
        pendingDeleteId = null
      },
      onDismiss = { pendingDeleteId = null }
    )
  }
}

// --- ChatGiZa Media --------------------------------------------------------
// Reached via the "Quantara" tab at the top of the Chat screen now (see
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
  // Loaded so the header below can show the active subaccount's own name
  // and UID instead of always freezing on the main account's -- switching
  // accounts (Switch Account, this screen's top-right icon) previously had
  // no visible effect anywhere the profile itself is shown.
  LaunchedEffect(Unit) { viewModel.loadSubaccounts() }
  val activeSubaccount = viewModel.subaccounts.find { it.id == viewModel.activeSubaccountId }
  val headerName = if (viewModel.activeSubaccountId != null) {
    viewModel.activeSubaccountName ?: activeSubaccount?.name ?: "Subaccount"
  } else {
    viewModel.userName?.takeIf { it.isNotBlank() } ?: "You"
  }
  val headerUid = if (viewModel.activeSubaccountId != null) derivedUid(viewModel.activeSubaccountId!!) else uid

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
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
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(modifier = Modifier.weight(1f))
      IconButton(onClick = { comingSoon("Support") }, modifier = Modifier.size(36.dp)) {
        Icon(Icons.Outlined.Headset, contentDescription = "Support", tint = Color.Black)
      }
      IconButton(onClick = { viewModel.openAccountTabs() }, modifier = Modifier.size(36.dp)) {
        SettingsHexIconCustom(tint = Color.Black, modifier = Modifier.size(24.dp))
      }
      IconButton(onClick = { viewModel.openSwitchAccount() }, modifier = Modifier.size(36.dp)) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_switch_account),
          contentDescription = "Subaccount",
          tint = Color.Black,
          modifier = Modifier.size(24.dp)
        )
      }
    }

    Spacer(modifier = Modifier.height(8.dp))

    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
      // Subaccounts have no photo of their own -- only a preset/initials
      // avatar (see SwitchAccountRow) -- so once one is active this only
      // ever shows a preset or initials, never the main account's photo.
      val subaccountPreset = activeSubaccount?.avatarPresetId?.let { id -> AVATAR_PRESETS.find { it.id == id } }
      val selectedPreset = if (viewModel.activeSubaccountId != null) subaccountPreset else AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
      Box(modifier = Modifier.clickable { if (viewModel.activeSubaccountId == null) viewModel.openAvatarPicker() }) {
        if (selectedPreset != null) {
          AvatarPresetThumbnail(selectedPreset, 52.dp, name = if (viewModel.activeSubaccountId != null) headerName else viewModel.avatarName)
        } else if (viewModel.activeSubaccountId != null) {
          Box(
            modifier = Modifier.size(52.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
          ) {
            Text(headerName.take(1).uppercase(), color = APP_TEXT_COLOR, fontSize = 20.sp, fontWeight = FontWeight.Bold)
          }
        } else if (viewModel.userImage != null) {
          AsyncImage(
            model = viewModel.userImage,
            contentDescription = "Profile",
            modifier = Modifier.size(52.dp).clip(CircleShape)
          )
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = "Profile", tint = Color.Black, modifier = Modifier.size(52.dp))
        }
      }
      Spacer(modifier = Modifier.width(12.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text(
          headerName,
          color = APP_TEXT_COLOR,
          fontSize = 21.sp,
          fontWeight = FontWeight.Bold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(3.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("UID: $headerUid", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
          Spacer(modifier = Modifier.width(6.dp))
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy),
            contentDescription = "Copy UID",
            tint = Color.Black.copy(alpha = 0.5f),
            modifier = Modifier.size(12.dp).clickable {
              clipboard.setText(AnnotatedString(headerUid))
              Toast.makeText(context, "UID copied", Toast.LENGTH_SHORT).show()
            }
          )
          Spacer(modifier = Modifier.width(8.dp))
          Text("|", color = APP_TEXT_COLOR.copy(alpha = 0.25f), fontSize = 11.sp)
          Spacer(modifier = Modifier.width(8.dp))
          Text("Site: GiZa Glo...", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 11.sp)
        }
      }
      Icon(
        Icons.Filled.ChevronRight,
        contentDescription = null,
        tint = Color.Black.copy(alpha = 0.4f),
        modifier = Modifier.clickable { viewModel.openAccountTabs() }
      )
    }

    Spacer(modifier = Modifier.height(12.dp))

    Row {
      Row(
        verticalAlignment = Alignment.CenterVertically,
        // A fixed height, not just small padding, is what actually
        // controls how tall this looks -- Text's own line box (font
        // ascent/descent) is taller than its visible glyphs, so shrinking
        // vertical padding alone left the background just as tall.
        modifier = Modifier
          .height(20.dp)
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.1f))
          .padding(horizontal = 4.dp)
      ) {
        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(13.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text("Verified", color = APP_TEXT_COLOR, fontSize = 11.sp, fontWeight = FontWeight.Medium)
      }
      Spacer(modifier = Modifier.width(8.dp))
      Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
          .height(20.dp)
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.1f))
          .clickable { comingSoon("Plan") }
          .padding(horizontal = 4.dp)
      ) {
        Text("Free plan", color = APP_TEXT_COLOR, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(13.dp))
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
        .background(Color(0xFFF4F4F4))
        .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
      Text("Unlock GiZa Pro Perks", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(
        "Upgrade to GiZa Pro for unlimited chats, priority responses, and exclusive perks!",
        color = APP_TEXT_COLOR.copy(alpha = 0.5f),
        fontSize = 11.sp,
        lineHeight = 14.sp
      )
      Spacer(modifier = Modifier.height(8.dp))
      HorizontalDivider(modifier = Modifier.fillMaxWidth(0.45f), color = Color(0xFFE0E0E0), thickness = 3.dp)
      Spacer(modifier = Modifier.height(6.dp))
      Text("Current plan: Free", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 11.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(8.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
          "Pro Benefits ›",
          color = APP_TEXT_COLOR.copy(alpha = 0.6f),
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier.weight(1f).clickable { comingSoon("Pro Benefits") }
        )
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color(0xFFFF9C2D))
            .clickable { comingSoon("Enter GiZa Max") }
            .padding(horizontal = 12.dp, vertical = 4.dp)
        ) {
          Text("Enter GiZa Max", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
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
      .background(Color.White)
      .navigationBarsPadding()
      .padding(horizontal = 16.dp)
  ) {
    HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
    Spacer(modifier = Modifier.height(10.dp))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text("GiZa Lite", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable { comingSoon("GiZa Lite") })
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { viewModel.openAboutUs() }) {
        Text("About Us", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
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
  // AccountTabsDialog itself moved to the root level (see the comment on
  // its definition) so it no longer mounts here.
}

// Opened by tapping the chevron next to the Site row -- the
// My info/Security/Preference/General tabs live in here instead of
// inline on the main Profile Hub screen. Only "My info" is real (it
// just points back at the profile fields already shown on the main
// screen); the rest are stub taps.
//
// Mounted at the root level (setContent, alongside the screen router),
// NOT nested inside ProfileHubScreen, and rendered as a plain full-size
// Box instead of a platform Dialog(). It used to be a Dialog opened
// conditionally from inside ProfileHubScreen, which meant every close-a-
// sub-screen-and-return-here path (Mobile Number, Change Email,
// Nickname, ...) required ProfileHubScreen -- with its "Unlock GiZa Pro
// Perks" banner -- to mount for the very first time in the SAME frame
// the dialog was supposed to cover it. Creating a real Android Dialog
// window is never instant, so that banner was visible for a frame or
// two before the dialog's window actually drew on top of it -- the
// flash the user kept hitting on every single return trip. Being a
// normal composable now, drawn after the screen router in the same
// window/frame, removes that window-creation lag entirely.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountTabsDialog(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAccountTabs() }
  var showRateDialog by remember { mutableStateOf(false) }
  var showEmailOptions by remember { mutableStateOf(false) }
  var confirmUnlinkEmail by remember { mutableStateOf(false) }
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  val uid = remember(viewModel.userId) {
    val id = viewModel.userId.orEmpty()
    (kotlin.math.abs(id.hashCode().toLong()) % 100_000_000L).toString().padStart(8, '0')
  }
  fun comingSoon(label: String) {
    Toast.makeText(context, "$label — coming soon", Toast.LENGTH_SHORT).show()
  }
  LaunchedEffect(Unit) { viewModel.loadTotpStatus() }
  // Billing prefetch removed -- see the comment on HistoryScreen's old
  // billing LaunchedEffect for why.
  val accountTabsOrder = listOf("My info", "Security", "Preference", "General")
  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
  ) {
    // HorizontalPager instead of a hand-rolled offset -- the two earlier
    // manual Animatable attempts could only ever move the CURRENT tab's
    // content, never render the neighboring tab underneath during the drag
    // itself, which is why dragging left a blank gap instead of the next
    // tab's content sliding into view. The pager also brings its own
    // well-tuned fling/snap physics, replacing the separate hand-tuned
    // "spring" from before.
    val pagerState = rememberPagerState(
      initialPage = accountTabsOrder.indexOf(viewModel.activeAccountTab).coerceAtLeast(0)
    ) { accountTabsOrder.size }
    val tabPagerScope = rememberCoroutineScope()
    LaunchedEffect(pagerState.currentPage) {
      viewModel.activeAccountTab = accountTabsOrder[pagerState.currentPage]
    }
    Column(
      modifier = Modifier
        .fillMaxSize()
        .statusBarsPadding()
    ) {
      Column(modifier = Modifier.padding(horizontal = 16.dp)) {
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
            color = APP_TEXT_COLOR,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Center)
          )
          Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = { viewModel.closeAccountTabs() }, modifier = Modifier.size(32.dp)) {
              Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
            }
            Spacer(modifier = Modifier.weight(1f))
            // Quick dark-mode toggle -- flips between the two ends of the
            // same theme system Color Theme/Appearance use
            // (updateThemeMode), not a separate setting of its own.
            IconButton(
              onClick = { viewModel.updateThemeMode(if (viewModel.themeMode == "light") "dark" else "light") },
              modifier = Modifier.size(32.dp)
            ) {
              Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_moon), contentDescription = "Toggle dark mode", tint = Color.Black, modifier = Modifier.size(24.dp))
            }
            IconButton(
              onClick = { viewModel.leaveAccountTabsFor { viewModel.openAppLanguage() } },
              modifier = Modifier.size(32.dp)
            ) {
              Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_world), contentDescription = "Language", tint = Color.Black, modifier = Modifier.size(23.dp))
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
          Icon(Icons.Outlined.AccountCircle, contentDescription = "Profile", tint = Color.Black, modifier = Modifier.size(50.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
          Text(
            (viewModel.avatarName ?: viewModel.userName ?: "You").uppercase(),
            color = APP_TEXT_COLOR,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 3.dp)
          )
          Spacer(modifier = Modifier.height(4.dp))
          Box(
            modifier = Modifier
              .background(Color.Black.copy(alpha = 0.1f), RoundedCornerShape(3.dp))
              .padding(horizontal = 3.dp, vertical = 1.dp)
          ) {
            Text("Site: ChatGiZa Global", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 10.sp)
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Real payment nudge, not a security one -- shown only once
      // loadBilling() (below) has actually come back with no active
      // subscription, same "hasn't paid" signal Billing itself uses.
      // Opens the same real Stripe checkout the Media caption paywall
      // already uses (startCheckout("starter")), not a stub.
      var openingProCheckout by remember { mutableStateOf(false) }
      val hasNoSubscription = viewModel.billingSummary != null && viewModel.billingSummary?.subscription == null
      if (hasNoSubscription) {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, Color.Black.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
            .padding(12.dp)
        ) {
          Text("Upgrade to GiZa Pro", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.Medium)
          Spacer(modifier = Modifier.height(4.dp))
          Text(
            "Unlimited chats, priority responses, and exclusive perks.",
            color = APP_TEXT_COLOR.copy(alpha = 0.55f),
            fontSize = 12.sp,
            lineHeight = 16.sp
          )
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            if (openingProCheckout) "Opening…" else "Upgrade now →",
            color = Color(0xFFFF9C2D),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.clickable(enabled = !openingProCheckout) {
              openingProCheckout = true
              viewModel.startCheckout("starter") { url ->
                openingProCheckout = false
                if (url != null) {
                  runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                }
              }
            }
          )
        }
        Spacer(modifier = Modifier.height(14.dp))
      }

      // Per-tab offset/width in px, measured live via onGloballyPositioned/
      // onTextLayout below -- fillMaxWidth() on the underline used to
      // stretch it way beyond the tab's own label (the earlier "thick
      // black bar" bug) because this Row scrolls horizontally, which
      // hands its children an effectively unbounded max width; fillMaxWidth
      // has nothing sane to resolve against in that context. Measuring the
      // label's actual rendered size sidesteps that entirely.
      val density = LocalDensity.current
      val tabOffsetsPx = remember { mutableStateListOf(0f, 0f, 0f, 0f) }
      val tabWidthsPx = remember { mutableStateListOf(0f, 0f, 0f, 0f) }
      var tabTextHeightPx by remember { mutableStateOf(0f) }
      Box(modifier = Modifier.fillMaxWidth()) {
        Row(
          modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
          horizontalArrangement = Arrangement.spacedBy(26.dp)
        ) {
          accountTabsOrder.forEachIndexed { index, tab ->
            Column(
              modifier = Modifier
                .onGloballyPositioned { coords -> tabOffsetsPx[index] = coords.positionInParent().x }
                .clickable {
                  viewModel.activeAccountTab = tab
                  tabPagerScope.launch { pagerState.animateScrollToPage(index) }
                }
            ) {
              Text(
                tab,
                color = if (viewModel.activeAccountTab == tab) Color.Black else Color.Black.copy(alpha = 0.4f),
                fontSize = 15.sp,
                fontWeight = if (viewModel.activeAccountTab == tab) FontWeight.SemiBold else FontWeight.Normal,
                onTextLayout = { result ->
                  tabWidthsPx[index] = result.size.width.toFloat()
                  tabTextHeightPx = result.size.height.toFloat()
                }
              )
              Spacer(modifier = Modifier.height(6.dp))
              Spacer(modifier = Modifier.height(2.dp))
            }
          }
        }
        // Slides continuously between tabs using the pager's own live
        // scroll fraction (not just a discrete jump once the active tab
        // changes), so it visually follows a swipe the same way the
        // content underneath does.
        if (tabWidthsPx.all { it > 0f }) {
          val rawPage = (pagerState.currentPage + pagerState.currentPageOffsetFraction)
            .coerceIn(0f, (accountTabsOrder.lastIndex).toFloat())
          val fromIdx = rawPage.toInt().coerceIn(0, accountTabsOrder.lastIndex)
          val toIdx = (fromIdx + 1).coerceAtMost(accountTabsOrder.lastIndex)
          val frac = (rawPage - fromIdx).coerceIn(0f, 1f)
          val indicatorX = tabOffsetsPx[fromIdx] + (tabOffsetsPx[toIdx] - tabOffsetsPx[fromIdx]) * frac
          val indicatorW = tabWidthsPx[fromIdx] + (tabWidthsPx[toIdx] - tabWidthsPx[fromIdx]) * frac
          val indicatorY = with(density) { tabTextHeightPx.toDp() } + 6.dp
          Box(
            modifier = Modifier
              .offset { IntOffset(indicatorX.roundToInt(), 0) }
              .padding(top = indicatorY)
              .width(with(density) { indicatorW.toDp() })
              .height(2.dp)
              .background(Color.Black)
          )
        }
      }

      Spacer(modifier = Modifier.height(24.dp))
      }

      HorizontalPager(
        state = pagerState,
        modifier = Modifier.fillMaxWidth().weight(1f)
      ) { page ->
      val tabForPage = accountTabsOrder[page]
      Column(
        modifier = Modifier
          .fillMaxSize()
          .verticalScroll(rememberScrollState())
          .padding(horizontal = 16.dp)
          .padding(bottom = if (tabForPage == "My info") 76.dp else 0.dp)
      ) {
      if (tabForPage == "My info") {
        // Identity only -- who you are, not app behavior or account
        // security, which now live in Preference/Security respectively
        // (see the reorganization pass that moved Advertise/Affiliate's
        // community/Join Our Community/Link Account/Collaborative Chat
        // out of here into where they actually belong).
        val selectedPreset = AVATAR_PRESETS.find { it.id == viewModel.avatarPresetId }
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_profile_circle_outline),
            label = "Profile Picture",
            // AvatarPickerDialog only ever renders from within
            // ProfileHubScreen's own composition (see its showAvatarPicker
            // check) -- opening it straight from here, still inside this
            // separate AccountTabsDialog, set the flag but never actually
            // showed anything. Closing this dialog first (same fix already
            // used for "About Us" below) hands control back to
            // ProfileHubScreen so the check actually runs.
            onClick = {
              viewModel.leaveAccountTabsFor { viewModel.openAvatarPicker() }
            }
          ) {
            if (selectedPreset != null) {
              AvatarPresetThumbnail(selectedPreset, 40.dp)
            } else if (viewModel.userImage != null) {
              AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(40.dp).clip(CircleShape))
            } else {
              Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.Black.copy(alpha = 0.5f), modifier = Modifier.size(40.dp))
            }
          }
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_id_lines), iconSize = 24.dp, label = "Nickname", onClick = { viewModel.leaveAccountTabsFor { viewModel.openNickname() } }) {
            Text(viewModel.userName?.takeIf { it.isNotBlank() } ?: "-", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 14.sp)
          }
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_id_rounded), iconSize = 26.dp, label = "UID", showChevron = false, onClick = {}) {
            Text(uid, color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 14.sp, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.width(6.dp))
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy),
              contentDescription = "Copy UID",
              tint = Color.Black.copy(alpha = 0.5f),
              modifier = Modifier.size(15.dp).clickable {
                clipboard.setText(AnnotatedString(uid))
                Toast.makeText(context, "UID copied", Toast.LENGTH_SHORT).show()
              }
            )
          }
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_switch_account),
            label = "Subaccount",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openSwitchAccount() } }
          ) {}
        }

        // Log Out itself is pinned to the very bottom of the screen (see
        // the Box wrapper below), not flowing right after this content.
        Spacer(modifier = Modifier.height(20.dp))
      } else if (tabForPage == "Security") {
        // Account safety and access only. "Fund Password" (a crypto-
        // exchange wallet concept -- ChatGiZa has no funds/wallet) was
        // dropped outright rather than forced into any tab.

        SecurityGroupHeader("Basic Protect", "Essential protection for everyday account activity.")
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mail_outline),
            iconSize = 26.dp,
            label = "Email",
            onClick = { showEmailOptions = true }
          ) {
            Text(maskEmail(viewModel.userEmail), color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 13.sp)
          }
          // Real, self-reported phone number (users.phone) -- linked/changed
          // from MobileNumberScreen. No SMS provider is wired up here, so
          // this isn't OTP-verified, same trust level as the in-app
          // password.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mobile_outline),
            iconSize = 26.dp,
            label = "Mobile",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openMobileNumber() } }
          ) {
            Text(
              viewModel.userPhone?.takeIf { it.isNotBlank() } ?: "Not linked",
              color = APP_TEXT_COLOR.copy(alpha = 0.5f),
              fontSize = 13.sp
            )
          }
          // Real in-app Authenticator App (TOTP) 2FA -- ChatGiZa's own
          // second factor on top of Google sign-in, not a hand-off to
          // Google's account settings (which this row used to just open a
          // browser tab to, since ChatGiZa itself had no 2FA of its own
          // yet).
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_google_g),
            iconSize = 19.dp,
            label = "Google 2FA Authentication",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openTwoFactorSetup() } }
          ) {
            Text(
              if (viewModel.totpEnabled == true) "On" else "Off",
              color = APP_TEXT_COLOR.copy(alpha = 0.5f),
              fontSize = 13.sp
            )
          }
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_passkey),
            iconSize = 23.dp,
            label = "Passkeys",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openPasskeysScreen() } }
          ) {}
          // Moved here from My info -- linking another account is an
          // access/security action, not identity.
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_at_circle), label = "Link Account", onClick = { comingSoon("Link Account") }) {}
        }

        Spacer(modifier = Modifier.height(18.dp))

        SecurityGroupHeader("Account access and management", titleSize = 11.sp)
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          // This is now a real, separate in-app password (see
          // ChangePasswordScreen) -- independent of the Google sign-in
          // itself, which is unaffected by whatever gets set here.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded),
            label = "Change Password",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openChangePassword() } }
          ) {}
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_trusted_device), iconSize = 23.dp, label = "Trusted Devices", onClick = { viewModel.leaveAccountTabsFor { viewModel.openTrustedDevices() } }) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_dashboard_grid),
            label = "Data Dashboard",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openDataDashboard() } }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded),
            iconSize = 23.dp,
            label = "App Lock",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openAppLockSetup() } }
          ) {
            Text(if (viewModel.appLockEnabled) "On" else "Off", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 13.sp)
          }
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_account_settings),
            iconSize = 19.dp,
            label = "Account Settings",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openAccountSettings() } }
          ) {}
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Last login time 2026-08-06 22:06:13", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 12.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text("Login device ", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 12.sp)
          Icon(Icons.Outlined.Smartphone, contentDescription = null, tint = Color.Black.copy(alpha = 0.35f), modifier = Modifier.size(12.dp))
          Text(" android", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 12.sp)
        }
        Spacer(modifier = Modifier.height(20.dp))
      } else if (tabForPage == "Preference") {
        // How the app behaves/feels for you -- AI persona and voice
        // alongside the device-feel/notification settings that were
        // already here.
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_customize_sparkle),
            label = "Customize GiZa",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openCustomize() } }
          ) {}
          // Moved here from General -- how ChatGiZa sounds is a
          // preference, alongside how it behaves (Customize GiZa above).
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_voice_bars),
            label = "Voice",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openVoice() } }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_haptics),
            label = "Haptics",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openHaptics() } }
          ) {}
          MyInfoRow(
            iconContent = { c -> WidgetsIconCustom(tint = c, modifier = Modifier.size(20.dp)) },
            label = "Widgets",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openWidgets() } }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connectors),
            label = "Connectors",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openConnectors() } }
          ) {}
          // Automations used to be here as its own row, but it opened the
          // exact same Scheduled screen the "Arranged" card on the main
          // screen already links to -- a duplicate entry point for the
          // same feature, so it's gone rather than kept as a second path
          // to the same place.
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_bell_outline), label = "Notification Settings", onClick = { comingSoon("Notification Settings") }) {}
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mail_outline), label = "Email Subscriptions", onClick = { comingSoon("Email Subscriptions") }) {}
        }
        Spacer(modifier = Modifier.height(20.dp))
      } else if (tabForPage == "General") {
        // App-wide/about -- display settings, storage, legal, and the
        // business/community links that don't belong under personal
        // identity (My info) or account security (Security).
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_world), label = "Language", onClick = { viewModel.leaveAccountTabsFor { viewModel.openAppLanguage() } }) {
            Text("English", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp)
          }
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_theme_sun_outline),
            label = "Color Theme",
            // Opens AppearanceScreen's Theme section (a 2x2 grid of mini
            // previews). This was the "Appearance" row's duplicate entry
            // point too -- that one was dropped, this stays since it also
            // shows the current selection. Closes this dialog first, same
            // fix as Profile Picture above.
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openAppearance() } }
          ) {
            Text(AppTheme.fromKey(viewModel.themeMode).label, color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp)
          }
          MyInfoRow(
            icon = Icons.Outlined.TextFields,
            label = "Font",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openFontChoice() } }
          ) {
            Text(FONT_OPTIONS.find { it.id == viewModel.fontChoice }?.label ?: "System", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp)
          }
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_advanced),
            label = "Advanced",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openAdvanced() } }
          ) {}
          // Help Center/User feedback/About Us/Terms of Use/Privacy Policy
          // all collapsed into the single "About Us" entry point (Profile
          // Hub's footer link), which now also lists Help Center and User
          // feedback alongside Terms/Privacy/Report a Problem -- see
          // AboutUsDialog.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_folder_outline),
            label = "Open Source Licenses",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openOpenSourceLicenses() } }
          ) {}
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_inbox_tray),
            label = "Storage management",
            // Real on-device cache/storage breakdown, not the privacy/
            // delete-account controls (those moved to Data Dashboard's
            // "Data controls & delete account" row, where they actually
            // belong -- this row's label was always about storage, not
            // privacy).
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openStorageManagement() } }
          ) {}
          MyInfoRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_thumb_up), label = "Rate Our App", onClick = { showRateDialog = true }) {}
        }

        Spacer(modifier = Modifier.height(14.dp))

        Column(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
        ) {
          // Moved here from My info -- a feature entry point, not identity.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share_link),
            label = "Collaborative Chat",
            onClick = { viewModel.leaveAccountTabsFor { viewModel.openSharedConversations() } }
          ) {}
          // Moved here from My info -- business/community links, not identity.
          MyInfoRow(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_briefcase),
            label = "Advertise on ChatGiZa",
            onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.chatgiza.com/advertise"))) }
          ) {}
        }
        Spacer(modifier = Modifier.height(20.dp))
      }
      }
      }
    }

    if (viewModel.activeAccountTab == "My info") {
      Box(
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .background(Color.White)
          .navigationBarsPadding()
          .padding(horizontal = 16.dp, vertical = 10.dp)
      ) {
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(50))
            .border(1.dp, Color.Black.copy(alpha = 0.25f), RoundedCornerShape(50))
            .clickable {
              viewModel.closeAccountTabs()
              viewModel.signOut()
            }
            .padding(vertical = 10.dp),
          contentAlignment = Alignment.Center
        ) {
          Text("Log Out", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
      }
    }
    // Dialog() opens its own separate Android window -- the ScreenshotShareOverlay
    // living in MainActivity's main window (below setContent) is invisible while
    // this dialog is on top, so the "Share a link to chat?" prompt never showed
    // up while User Center was open. A second copy here, layered inside this
    // dialog's own window, makes the screenshot on-taken state visible here too.
    ScreenshotShareOverlay(viewModel)
    }
    if (showRateDialog) {
      AlertDialog(
        onDismissRequest = { showRateDialog = false },
        title = { Text("Enjoying ChatGiZa?", textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) },
        text = { Text("Rate us on Google Play Store.", textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) },
        confirmButton = {
          TextButton(onClick = {
            showRateDialog = false
            val uri = Uri.parse("market://details?id=${context.packageName}")
            val playStoreIntent = Intent(Intent.ACTION_VIEW, uri).apply {
              setPackage("com.android.vending")
            }
            runCatching { context.startActivity(playStoreIntent) }.onFailure {
              val webUri = Uri.parse("https://play.google.com/store/apps/details?id=${context.packageName}")
              runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, webUri)) }
            }
          }) {
            Text("Rate Now", color = APP_TEXT_COLOR, fontWeight = FontWeight.Bold)
          }
        },
        dismissButton = {
          TextButton(onClick = { showRateDialog = false }) {
            Text("Later")
          }
        }
      )
    }

    // Reference-matched "Please Select" sheet -- Change is the real,
    // already-existing flow; Unlink is real too (clears users.email
    // server-side, see ChatViewModel.unlinkEmail), gated behind a plain-
    // language confirm since sign-in via email+password stops working
    // for the account until an email is set again.
    if (showEmailOptions) {
      ModalBottomSheet(
        onDismissRequest = { showEmailOptions = false },
        dragHandle = null,
        containerColor = Color.Transparent,
        scrimColor = Color.Black.copy(alpha = 0.6f)
      ) {
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
          Column(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(16.dp))
              .background(Color.White)
          ) {
            Text(
              "Please Select",
              color = APP_TEXT_COLOR.copy(alpha = 0.5f),
              fontSize = 14.sp,
              textAlign = TextAlign.Center,
              modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)
            )
            HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))
            Text(
              "Unlink my Registered Email",
              color = APP_TEXT_COLOR,
              fontWeight = FontWeight.Normal,
              fontSize = 16.sp,
              textAlign = TextAlign.Center,
              modifier = Modifier
                .fillMaxWidth()
                .clickable { showEmailOptions = false; confirmUnlinkEmail = true }
                .padding(vertical = 16.dp)
            )
            Text(
              "Change my Registered Email",
              color = APP_TEXT_COLOR,
              fontWeight = FontWeight.Normal,
              fontSize = 16.sp,
              textAlign = TextAlign.Center,
              modifier = Modifier
                .fillMaxWidth()
                .clickable {
                  showEmailOptions = false
                  viewModel.leaveAccountTabsFor { viewModel.openChangeEmail() }
                }
                .padding(vertical = 16.dp)
            )
          }
          Spacer(modifier = Modifier.height(8.dp))
          Text(
            "Cancel",
            color = APP_TEXT_COLOR,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(16.dp))
              .background(Color.White)
              .clickable { showEmailOptions = false }
              .padding(vertical = 16.dp)
          )
        }
      }
    }

    if (confirmUnlinkEmail) {
      AlertDialog(
        onDismissRequest = { confirmUnlinkEmail = false },
        title = { Text("Unlink your email?") },
        text = { Text("You won't be able to sign in with email + password until you set an email again. Google sign-in and passkeys keep working.") },
        confirmButton = {
          TextButton(onClick = {
            viewModel.unlinkEmail()
            confirmUnlinkEmail = false
          }) {
            Text("Unlink", color = APP_TEXT_COLOR, fontWeight = FontWeight.Bold)
          }
        },
        dismissButton = {
          TextButton(onClick = { confirmUnlinkEmail = false }) { Text("Cancel") }
        }
      )
    }

    val emailUnlinkError = viewModel.emailUnlinkError
    if (emailUnlinkError != null) {
      LaunchedEffect(emailUnlinkError) {
        Toast.makeText(context, emailUnlinkError, Toast.LENGTH_SHORT).show()
      }
    }
}

@Composable
private fun SecurityGroupHeader(title: String, subtitle: String? = null, titleSize: androidx.compose.ui.unit.TextUnit = 16.sp) {
  Column(modifier = Modifier.padding(bottom = 10.dp)) {
    Text(title, color = APP_TEXT_COLOR, fontSize = titleSize, fontWeight = FontWeight.SemiBold)
    if (subtitle != null) {
      Spacer(modifier = Modifier.height(2.dp))
      Text(subtitle, color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.sp)
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
    val tint = Color.Black.copy(alpha = 0.8f)
    if (iconContent != null) {
      iconContent(tint)
    } else if (painter != null) {
      Icon(painter, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
    } else if (icon != null) {
      Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
    }
    Spacer(modifier = Modifier.width(14.dp))
    Text(label, color = APP_TEXT_COLOR, fontSize = 17.sp, modifier = Modifier.weight(1f))
    trailing()
    if (showChevron) {
      Spacer(modifier = Modifier.width(4.dp))
      Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(18.dp))
    }
  }
}

@Composable
private fun MyInfoDivider() {
  HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
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
    EdgeToEdgeDialogWindow()
    // Dialog() is its own window, so ScreenshotShareOverlay needs its own
    // copy here too -- see the matching comment in AccountTabsDialog.
    Box(modifier = Modifier.fillMaxSize()) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(APP_BACKGROUND)
        .statusBarsPadding()
        .padding(horizontal = 16.dp)
    ) {
      Spacer(modifier = Modifier.height(12.dp))
      Box(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(
          "About Us",
          color = APP_TEXT_COLOR,
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier.align(Alignment.Center)
        )
        IconButton(onClick = { viewModel.closeAboutUs() }, modifier = Modifier.align(Alignment.CenterStart).size(32.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
        }
      }

      Spacer(modifier = Modifier.height(28.dp))

      Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Image(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_chatgiza_logo),
          contentDescription = null,
          modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text("ChatGiZa", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(3.dp))
        Text("Version ${BuildConfig.VERSION_NAME}", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 12.sp)
      }

      Spacer(modifier = Modifier.height(24.dp))
      HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)

      // Same real update check the (unreachable) old Settings footer used --
      // silently compares against the public GitHub Release the CI pipeline
      // already publishes, no App Store to defer to since this is sideloaded.
      LaunchedEffect(Unit) { viewModel.checkForUpdate() }
      val latestVersion = viewModel.latestVersionInfo
      val updateAvailable = latestVersion != null && latestVersion.runNumber > BuildConfig.VERSION_CODE
      AboutUsRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_refresh_thin), label = if (updateAvailable) "Update Available" else "Check for Updates") {
        if (updateAvailable) {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(latestVersion!!.downloadUrl)))
        } else {
          Toast.makeText(context, "You're on the latest version", Toast.LENGTH_SHORT).show()
        }
      }
      HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)

      Spacer(modifier = Modifier.height(24.dp))

      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(18.dp))
          .background(Color(0xFFF4F4F4))
          .padding(horizontal = 14.dp)
      ) {
        AboutUsRow(icon = Icons.AutoMirrored.Outlined.Article, label = "Terms of Use") {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
        }
        HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_solid), label = "Privacy Policy") {
          context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://support.wellxai.world")))
        }
        HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_report_problem), label = "Report a Problem") {
          // openReportProblem() now handles closing About Us itself (and
          // remembers to reopen it) -- calling closeAboutUs() here first
          // used to lose that context entirely, see the comment on
          // reportProblemReturnToAboutUs in ChatViewModel.
          viewModel.openReportProblem()
        }
        HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.HelpOutline, label = "Help Center") { comingSoon("Help Center") }
        HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_compose), label = "User feedback") { comingSoon("User feedback") }
        HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f), thickness = 1.dp)
        AboutUsRow(icon = Icons.Outlined.BugReport, label = "Crash Log") {
          val crash = ChatGizaApplication.lastCrash(context)
          if (crash == null) {
            Toast.makeText(context, "No crash recorded on this device yet", Toast.LENGTH_SHORT).show()
          } else {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
              type = "text/plain"
              putExtra(Intent.EXTRA_TEXT, crash)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Share crash log"))
          }
        }
      }
    }
    ScreenshotShareOverlay(viewModel)
    }
  }
}

@Composable
private fun AboutUsRow(icon: ImageVector, label: String, onClick: () -> Unit) {
  AboutUsRowShell(label = label, onClick = onClick) {
    Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(22.dp))
  }
}

@Composable
private fun AboutUsRow(painter: androidx.compose.ui.graphics.painter.Painter, label: String, onClick: () -> Unit) {
  AboutUsRowShell(label = label, onClick = onClick) {
    Icon(painter, contentDescription = null, tint = Color.Black, modifier = Modifier.size(22.dp))
  }
}

@Composable
private fun AboutUsRowShell(label: String, onClick: () -> Unit, icon: @Composable () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    icon()
    Spacer(modifier = Modifier.width(16.dp))
    Text(label, color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Normal, modifier = Modifier.weight(1f))
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
  }
}

// A curated set of simple black-circle + emoji avatars, standing in for
// full custom illustrations -- there's no art pipeline for those in
// this project, so this is a real (if visually simpler) equivalent: a
// genuinely pickable, saved-per-device set of distinct avatars rather
// than a single fixed photo. All people (not animals/fantasy
// characters) -- a broad, respectable, everyone-can-use-one set.
// `variant` drives AvatarGraphic's hand-drawn silhouette+accessory look
// (see below) -- a from-scratch flat interpretation of the pasted
// reference grid (business/glasses, hoodie, caps, sunglasses variants,
// keffiyeh, kimono, veiled/long-hair women, etc.), not a literal
// reproduction (no image-generation tool or file access to the source
// image was available). `emoji` stays empty for these -- there's no
// Twemoji URL to sync server-side for a hand-drawn icon, so
// updateAvatarPreset's existing "emoji == null -> stay device-local"
// path is used deliberately (see the Save button below).
private data class AvatarPreset(val id: String, val emoji: String = "", val variant: String? = null)

private val AVATAR_PRESETS = listOf(
  AvatarPreset("biz_glasses", variant = "biz_glasses"),
  AvatarPreset("blank", variant = "blank"),
  AvatarPreset("hoodie", variant = "hoodie"),
  AvatarPreset("cap_orange", variant = "cap_orange"),
  AvatarPreset("miner", variant = "miner"),
  AvatarPreset("hawaiian_orange", variant = "hawaiian_orange"),
  AvatarPreset("hawaiian_green", variant = "hawaiian_green"),
  AvatarPreset("sunglasses_plain", variant = "sunglasses_plain"),
  AvatarPreset("sunglasses_chain", variant = "sunglasses_chain"),
  AvatarPreset("afro_sunglasses", variant = "afro_sunglasses"),
  AvatarPreset("mohawk_blue", variant = "mohawk_blue"),
  AvatarPreset("spiky_blue", variant = "spiky_blue"),
  AvatarPreset("blonde_hair", variant = "blonde_hair"),
  AvatarPreset("beard_sunglasses_plain", variant = "beard_sunglasses_plain"),
  AvatarPreset("beard_sunglasses_zigzag", variant = "beard_sunglasses_zigzag"),
  AvatarPreset("vr_headset", variant = "vr_headset"),
  AvatarPreset("keffiyeh", variant = "keffiyeh"),
  AvatarPreset("red_cap", variant = "red_cap"),
  AvatarPreset("kimono", variant = "kimono"),
  AvatarPreset("gray_hood", variant = "gray_hood"),
  AvatarPreset("veil_woman", variant = "veil_woman"),
  AvatarPreset("glasses_woman", variant = "glasses_woman"),
  AvatarPreset("necklace_woman", variant = "necklace_woman"),
  AvatarPreset("curly_sunglasses_woman", variant = "curly_sunglasses_woman")
)

@Composable
private fun AvatarPresetThumbnail(preset: AvatarPreset, size: Dp, modifier: Modifier = Modifier, name: String? = null) {
  Box(
    modifier = modifier
      .size(size)
      .clip(CircleShape)
      .background(Color.White)
      .border(1.dp, Color.Black.copy(alpha = 0.18f), CircleShape),
    contentAlignment = Alignment.Center
  ) {
    if (preset.variant != null) {
      AvatarGraphic(preset.variant, modifier = Modifier.fillMaxSize())
    } else {
      Text(preset.emoji, fontSize = (size.value * 0.6f).sp)
    }
    // The custom avatar name, shown as a small label near the bottom of
    // the circle itself -- only worth showing at sizes big enough to
    // actually read it.
    if (!name.isNullOrBlank() && size >= 40.dp) {
      Text(
        name,
        color = APP_TEXT_COLOR,
        fontSize = (size.value * 0.16f).sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        textAlign = TextAlign.Center,
        modifier = Modifier
          .align(Alignment.BottomCenter)
          .fillMaxWidth()
          .background(Color.White.copy(alpha = 0.55f))
          .padding(vertical = 1.dp)
      )
    }
  }
}

// Hand-drawn (Canvas, not a raster image) flat silhouette-plus-accessory
// avatar, keyed by `variant`. Every variant shares the same base head+
// shoulders silhouette; the `when` block below layers 1-3 extra shapes on
// top per style (glasses, headwear, hair, etc.) using only simple
// primitives (circles/arcs/rounded rects/polylines) -- no attempt at
// matching the pasted reference's photorealistic 3D-render look, which
// would need an actual image-generation tool this environment doesn't have.
@Composable
private fun AvatarGraphic(variant: String, modifier: Modifier = Modifier) {
  val silver = Color(0xFFE7E7E7)
  val gold = Color.White
  val dark = Color(0xFF2A2A2A)
  Canvas(modifier = modifier) {
    val w = size.width
    val h = size.height
    val headR = w * 0.20f
    val headCx = w * 0.5f
    val headCy = h * 0.36f
    val strokeW = (w * 0.028f).coerceAtLeast(1f)

    fun body() {
      val body = Path().apply {
        moveTo(w * 0.20f, h * 0.98f)
        lineTo(w * 0.20f, h * 0.74f)
        cubicTo(w * 0.20f, h * 0.58f, w * 0.32f, h * 0.50f, w * 0.5f, h * 0.50f)
        cubicTo(w * 0.68f, h * 0.50f, w * 0.80f, h * 0.58f, w * 0.80f, h * 0.74f)
        lineTo(w * 0.80f, h * 0.98f)
        close()
      }
      drawPath(body, color = silver)
      drawPath(body, color = gold, style = Stroke(width = strokeW))
    }
    fun head() {
      drawCircle(color = silver, radius = headR, center = Offset(headCx, headCy))
      drawCircle(color = gold, radius = headR, center = Offset(headCx, headCy), style = Stroke(width = strokeW))
    }
    fun glasses(color: Color = Color(0xFF1A1A1A)) {
      val lensR = headR * 0.32f
      val lensY = headCy - headR * 0.02f
      val lx = headCx - headR * 0.42f
      val rx = headCx + headR * 0.42f
      drawCircle(color = color, radius = lensR, center = Offset(lx, lensY))
      drawCircle(color = color, radius = lensR, center = Offset(rx, lensY))
      drawLine(color = color, start = Offset(lx + lensR, lensY), end = Offset(rx - lensR, lensY), strokeWidth = strokeW)
    }
    fun beard(color: Color = Color(0xFF1A1A1A)) {
      val beard = Path().apply {
        moveTo(headCx - headR * 0.85f, headCy + headR * 0.15f)
        cubicTo(headCx - headR * 0.7f, headCy + headR * 1.15f, headCx - headR * 0.25f, headCy + headR * 1.35f, headCx, headCy + headR * 1.3f)
        cubicTo(headCx + headR * 0.25f, headCy + headR * 1.35f, headCx + headR * 0.7f, headCy + headR * 1.15f, headCx + headR * 0.85f, headCy + headR * 0.15f)
        lineTo(headCx + headR * 0.6f, headCy + headR * 0.05f)
        cubicTo(headCx + headR * 0.3f, headCy + headR * 0.4f, headCx - headR * 0.3f, headCy + headR * 0.4f, headCx - headR * 0.6f, headCy + headR * 0.05f)
        close()
      }
      drawPath(beard, color = color)
    }
    fun cap(color: Color, brim: Boolean = true) {
      drawArc(
        color = color,
        startAngle = 180f,
        sweepAngle = 180f,
        useCenter = true,
        topLeft = Offset(headCx - headR * 1.08f, headCy - headR * 1.15f),
        size = Size(headR * 2.16f, headR * 1.7f)
      )
      if (brim) {
        drawOval(
          color = color,
          topLeft = Offset(headCx - headR * 0.15f, headCy - headR * 0.35f),
          size = Size(headR * 1.35f, headR * 0.4f)
        )
      }
    }
    fun necklace(color: Color = gold, count: Int = 5) {
      for (i in 0 until count) {
        val t = i / (count - 1f)
        val x = headCx - headR * 0.55f + t * headR * 1.1f
        val y = headCy + headR * 1.15f + kotlin.math.sin(t * Math.PI).toFloat() * headR * 0.18f
        drawCircle(color = color, radius = w * 0.02f, center = Offset(x, y))
      }
    }

    body()
    head()

    when (variant) {
      "blank" -> {}
      "biz_glasses" -> {
        glasses()
        val tie = Path().apply {
          moveTo(headCx - headR * 0.12f, headCy + headR * 1.05f)
          lineTo(headCx + headR * 0.12f, headCy + headR * 1.05f)
          lineTo(headCx, headCy + headR * 1.8f)
          close()
        }
        drawPath(tie, color = dark)
      }
      "hoodie" -> cap(dark, brim = false)
      "cap_orange" -> cap(Color.White)
      "red_cap" -> cap(Color.White)
      "miner" -> {
        cap(Color(0xFF3A3A3A), brim = true)
        drawCircle(color = Color.White, radius = w * 0.035f, center = Offset(headCx, headCy - headR * 1.1f))
      }
      "hawaiian_orange", "hawaiian_green" -> {
        val shirtColor = if (variant == "hawaiian_orange") Color.White else Color.White
        val shirt = Path().apply {
          moveTo(w * 0.22f, h * 0.98f)
          lineTo(w * 0.22f, h * 0.78f)
          cubicTo(w * 0.22f, h * 0.66f, w * 0.32f, h * 0.60f, w * 0.5f, h * 0.60f)
          cubicTo(w * 0.68f, h * 0.60f, w * 0.78f, h * 0.66f, w * 0.78f, h * 0.78f)
          lineTo(w * 0.78f, h * 0.98f)
          close()
        }
        drawPath(shirt, color = shirtColor)
        for (i in 0..2) {
          val yy = h * (0.82f + i * 0.06f)
          drawCircle(color = silver, radius = w * 0.02f, center = Offset(w * 0.38f, yy))
          drawCircle(color = silver, radius = w * 0.02f, center = Offset(w * 0.62f, yy))
        }
      }
      "sunglasses_plain" -> glasses()
      "sunglasses_chain" -> {
        glasses()
        necklace(gold, 6)
      }
      "afro_sunglasses" -> {
        drawCircle(color = dark, radius = headR * 1.25f, center = Offset(headCx, headCy - headR * 0.35f))
        drawCircle(color = silver, radius = headR, center = Offset(headCx, headCy))
        glasses()
      }
      "mohawk_blue" -> {
        val mohawk = Path().apply {
          moveTo(headCx - headR * 0.15f, headCy - headR * 0.95f)
          lineTo(headCx + headR * 0.15f, headCy - headR * 0.95f)
          lineTo(headCx + headR * 0.08f, headCy - headR * 1.6f)
          lineTo(headCx - headR * 0.08f, headCy - headR * 1.6f)
          close()
        }
        drawPath(mohawk, color = Color.White)
        glasses(gold.copy(alpha = 0.9f))
      }
      "spiky_blue" -> {
        val blue = Color.White
        for (i in -2..2) {
          val baseX = headCx + i * headR * 0.35f
          val spike = Path().apply {
            moveTo(baseX - headR * 0.14f, headCy - headR * 0.75f)
            lineTo(baseX + headR * 0.14f, headCy - headR * 0.75f)
            lineTo(baseX, headCy - headR * 1.35f)
            close()
          }
          drawPath(spike, color = blue)
        }
        glasses(gold.copy(alpha = 0.9f))
      }
      "blonde_hair" -> {
        val hair = Path().apply {
          moveTo(headCx - headR * 0.95f, headCy - headR * 0.1f)
          cubicTo(headCx - headR * 1.05f, headCy - headR * 0.9f, headCx - headR * 0.3f, headCy - headR * 1.25f, headCx + headR * 0.1f, headCy - headR * 1.0f)
          cubicTo(headCx + headR * 0.5f, headCy - headR * 1.15f, headCx + headR * 1.0f, headCy - headR * 0.7f, headCx + headR * 0.95f, headCy - headR * 0.1f)
          cubicTo(headCx + headR * 0.6f, headCy - headR * 0.5f, headCx - headR * 0.6f, headCy - headR * 0.5f, headCx - headR * 0.95f, headCy - headR * 0.1f)
          close()
        }
        drawPath(hair, color = Color.White)
      }
      "beard_sunglasses_plain" -> {
        glasses()
        beard()
      }
      "beard_sunglasses_zigzag" -> {
        glasses()
        beard()
        val zig = Path().apply {
          moveTo(w * 0.28f, h * 0.86f)
          var x = w * 0.28f
          var up = true
          while (x < w * 0.72f) {
            x += w * 0.07f
            lineTo(x, if (up) h * 0.80f else h * 0.86f)
            up = !up
          }
        }
        drawPath(zig, color = Color.Transparent, style = Stroke(width = strokeW * 1.4f))
        drawPath(zig, color = Color.White, style = Stroke(width = strokeW * 1.4f))
      }
      "vr_headset" -> {
        drawRoundRect(
          color = dark,
          topLeft = Offset(headCx - headR * 0.95f, headCy - headR * 0.25f),
          size = Size(headR * 1.9f, headR * 0.7f),
          cornerRadius = CornerRadius(headR * 0.2f, headR * 0.2f)
        )
        drawRoundRect(
          color = Color.White,
          topLeft = Offset(headCx - headR * 0.85f, headCy - headR * 0.15f),
          size = Size(headR * 1.7f, headR * 0.5f),
          cornerRadius = CornerRadius(headR * 0.15f, headR * 0.15f),
          style = Stroke(width = strokeW)
        )
      }
      "keffiyeh" -> {
        val scarf = Path().apply {
          moveTo(headCx - headR * 1.15f, headCy - headR * 0.3f)
          lineTo(headCx + headR * 1.15f, headCy - headR * 0.3f)
          lineTo(headCx + headR * 0.7f, headCy + headR * 1.4f)
          lineTo(headCx, headCy + headR * 0.7f)
          lineTo(headCx - headR * 0.7f, headCy + headR * 1.4f)
          close()
        }
        drawPath(scarf, color = Color(0xFFF2F2F2))
        drawPath(scarf, color = gold, style = Stroke(width = strokeW))
        val band = Path().apply {
          moveTo(headCx - headR * 1.05f, headCy - headR * 0.55f)
          lineTo(headCx + headR * 1.05f, headCy - headR * 0.55f)
          lineTo(headCx + headR * 0.9f, headCy - headR * 0.85f)
          lineTo(headCx - headR * 0.9f, headCy - headR * 0.85f)
          close()
        }
        drawPath(band, color = dark)
      }
      "kimono" -> {
        val collar = Path().apply {
          moveTo(headCx - headR * 0.55f, headCy + headR * 0.55f)
          lineTo(headCx, headCy + headR * 1.5f)
          lineTo(headCx + headR * 0.55f, headCy + headR * 0.55f)
        }
        drawPath(collar, color = Color.White, style = Stroke(width = strokeW * 2.2f))
      }
      "gray_hood" -> {
        drawArc(
          color = Color(0xFFBFBFBF),
          startAngle = 180f,
          sweepAngle = 180f,
          useCenter = true,
          topLeft = Offset(headCx - headR * 1.15f, headCy - headR * 1.3f),
          size = Size(headR * 2.3f, headR * 1.9f)
        )
        drawLine(
          color = dark,
          start = Offset(headCx - headR * 1.15f, headCy - headR * 0.35f),
          end = Offset(headCx + headR * 1.15f, headCy - headR * 0.35f),
          strokeWidth = strokeW
        )
      }
      "veil_woman" -> {
        val veil = Path().apply {
          moveTo(headCx - headR * 1.1f, headCy - headR * 0.5f)
          cubicTo(headCx - headR * 1.3f, headCy + headR * 0.9f, headCx - headR * 0.8f, headCy + headR * 1.6f, headCx - headR * 0.3f, headCy + headR * 1.3f)
          lineTo(headCx, headCy + headR * 0.9f)
          lineTo(headCx + headR * 0.3f, headCy + headR * 1.3f)
          cubicTo(headCx + headR * 0.8f, headCy + headR * 1.6f, headCx + headR * 1.3f, headCy + headR * 0.9f, headCx + headR * 1.1f, headCy - headR * 0.5f)
          cubicTo(headCx + headR * 0.9f, headCy - headR * 1.15f, headCx - headR * 0.9f, headCy - headR * 1.15f, headCx - headR * 1.1f, headCy - headR * 0.5f)
          close()
        }
        drawPath(veil, color = Color(0xFFF2F2F2))
        drawPath(veil, color = gold, style = Stroke(width = strokeW))
      }
      "glasses_woman" -> {
        val hair = Path().apply {
          moveTo(headCx - headR * 1.02f, headCy - headR * 0.2f)
          cubicTo(headCx - headR * 1.05f, headCy - headR * 1.05f, headCx + headR * 1.05f, headCy - headR * 1.05f, headCx + headR * 1.02f, headCy - headR * 0.2f)
          lineTo(headCx + headR * 0.9f, headCy - headR * 0.3f)
          cubicTo(headCx + headR * 0.6f, headCy - headR * 0.75f, headCx - headR * 0.6f, headCy - headR * 0.75f, headCx - headR * 0.9f, headCy - headR * 0.3f)
          close()
        }
        drawPath(hair, color = Color(0xFF3A3A3A))
        val lensR = headR * 0.3f
        val lensY = headCy
        drawCircle(color = Color.Transparent, radius = lensR, center = Offset(headCx - headR * 0.4f, lensY))
        drawCircle(color = gold, radius = lensR, center = Offset(headCx - headR * 0.4f, lensY), style = Stroke(width = strokeW))
        drawCircle(color = gold, radius = lensR, center = Offset(headCx + headR * 0.4f, lensY), style = Stroke(width = strokeW))
      }
      "necklace_woman" -> {
        val hair = Path().apply {
          moveTo(headCx - headR * 1.05f, headCy + headR * 0.9f)
          cubicTo(headCx - headR * 1.2f, headCy - headR * 0.5f, headCx - headR * 0.5f, headCy - headR * 1.2f, headCx, headCy - headR * 1.1f)
          cubicTo(headCx + headR * 0.5f, headCy - headR * 1.2f, headCx + headR * 1.2f, headCy - headR * 0.5f, headCx + headR * 1.05f, headCy + headR * 0.9f)
          lineTo(headCx + headR * 0.85f, headCy + headR * 0.5f)
          cubicTo(headCx + headR * 0.6f, headCy - headR * 0.55f, headCx - headR * 0.6f, headCy - headR * 0.55f, headCx - headR * 0.85f, headCy + headR * 0.5f)
          close()
        }
        drawPath(hair, color = Color(0xFF4A4A4A))
        necklace(silver, 5)
      }
      "curly_sunglasses_woman" -> {
        for (i in -3..3) {
          val ang = i * 0.28f
          val cx = headCx + kotlin.math.sin(ang) * headR * 1.05f
          val cy = headCy - headR * 0.4f + kotlin.math.cos(ang) * headR * 0.15f - headR * 0.35f
          drawCircle(color = Color(0xFF3A3A3A), radius = headR * 0.3f, center = Offset(cx, cy))
        }
        val lensR = headR * 0.34f
        val lensY = headCy
        drawOval(
          color = dark,
          topLeft = Offset(headCx - headR * 0.75f, lensY - lensR * 0.7f),
          size = Size(lensR * 1.3f, lensR * 1.1f)
        )
        drawOval(
          color = dark,
          topLeft = Offset(headCx + headR * 0.15f, lensY - lensR * 0.7f),
          size = Size(lensR * 1.3f, lensR * 1.1f)
        )
      }
    }
  }
}

@Composable
private fun AvatarPickerDialog(viewModel: ChatViewModel) {
  var selected by remember { mutableStateOf(viewModel.avatarPresetId ?: AVATAR_PRESETS.first().id) }
  var activeTab by remember { mutableStateOf("Default") }
  var nameInput by remember { mutableStateOf(viewModel.avatarName ?: "") }
  val context = LocalContext.current
  // This dialog used to be preset-emoji-only -- no way to actually set your
  // own real photo from here, only from EditProfileScreen or the Quantara
  // Media profile screen. "Choose from gallery" below fixes that gap.
  var cropPhotoUri by remember { mutableStateOf<Uri?>(null) }
  val galleryPhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) cropPhotoUri = uri
  }
  cropPhotoUri?.let { pickedUri ->
    ProfilePhotoCropDialog(
      uri = pickedUri,
      onCancel = { cropPhotoUri = null },
      onConfirm = { dataUrl ->
        cropPhotoUri = null
        viewModel.updateProfilePhoto(dataUrl)
        viewModel.closeAvatarPicker()
      }
    )
  }
  Dialog(
    onDismissRequest = { viewModel.closeAvatarPicker() },
    properties = DialogProperties(usePlatformDefaultWidth = false)
  ) {
    EdgeToEdgeDialogWindow()
    // Dialog() is its own window, so ScreenshotShareOverlay needs its own
    // copy here too -- see the matching comment in AccountTabsDialog.
    Box(modifier = Modifier.fillMaxSize()) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .background(APP_BACKGROUND)
        .statusBarsPadding()
        .padding(horizontal = 16.dp)
    ) {
      Spacer(modifier = Modifier.height(12.dp))
      Box(modifier = Modifier.fillMaxWidth()) {
        IconButton(onClick = { viewModel.closeAvatarPicker() }, modifier = Modifier.align(Alignment.CenterStart).size(32.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
        }
        Text("Profile Picture", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
      }

      Spacer(modifier = Modifier.height(20.dp))
      val previewPreset = AVATAR_PRESETS.find { it.id == selected }
      Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        if (previewPreset != null) {
          AvatarPresetThumbnail(previewPreset, 88.dp, name = nameInput)
        } else if (viewModel.userImage != null) {
          AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(88.dp).clip(CircleShape))
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.Black, modifier = Modifier.size(88.dp))
        }
      }

      Spacer(modifier = Modifier.height(10.dp))
      Text(
        "Choose from gallery",
        color = APP_TEXT_COLOR,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
        modifier = Modifier.align(Alignment.CenterHorizontally).clickable { galleryPhotoPicker.launch("image/*") }
      )

      Spacer(modifier = Modifier.height(16.dp))
      // Shown on top of the avatar itself wherever it renders, e.g. "Boss".
      OutlinedTextField(
        value = nameInput,
        onValueChange = { if (it.length <= 20) nameInput = it },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Name your avatar (optional)", color = APP_TEXT_COLOR.copy(alpha = 0.4f)) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.Black,
          unfocusedTextColor = Color.Black,
          focusedBorderColor = Color.Black.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
          cursorColor = Color.Black
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
              color = if (activeTab == tab) Color.Black else Color.Black.copy(alpha = 0.4f),
              fontSize = 15.sp,
              fontWeight = if (activeTab == tab) FontWeight.Bold else FontWeight.Normal
            )
            Spacer(modifier = Modifier.height(6.dp))
            if (activeTab == tab) {
              Box(modifier = Modifier.width(28.dp).height(2.dp).background(Color.Black))
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
              if (selected == preset.id) Modifier.border(2.dp, Color.Black, CircleShape).padding(3.dp)
              else Modifier
            ).clickable { selected = preset.id }
            if (activeTab == "Animated 🔥") {
              BouncingAvatarThumbnail(preset, 64.dp, thumbModifier)
            } else {
              AvatarPresetThumbnail(preset, 64.dp, thumbModifier)
            }
            if (selected == preset.id) {
              Box(
                modifier = Modifier.size(20.dp).clip(CircleShape).background(Color.Black),
                contentAlignment = Alignment.Center
              ) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
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
          .background(Color.Black)
          .clickable {
            viewModel.updateAvatarPreset(selected, AVATAR_PRESETS.find { it.id == selected }?.emoji?.ifBlank { null })
            viewModel.updateAvatarName(nameInput.trim().ifBlank { null })
            viewModel.closeAvatarPicker()
          }
          .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center
      ) {
        Text("Save", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
      }
      Spacer(modifier = Modifier.height(20.dp))
    }
    ScreenshotShareOverlay(viewModel)
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
private fun MediaExpandGlyph(modifier: Modifier = Modifier, tint: Color = Color.Black) {
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
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 28.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text("Replying to ", color = Color(0xFF8A8A8A), fontSize = 14.sp)
        Text("@$authorName", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }
      Spacer(modifier = Modifier.height(12.dp))
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .heightIn(min = 100.dp)
          .clip(RoundedCornerShape(14.dp))
          .background(Color.Black.copy(alpha = 0.05f))
          .padding(14.dp)
      ) {
        BasicTextField(
          value = text,
          onValueChange = { text = it },
          textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 15.sp, lineHeight = 20.sp),
          cursorBrush = SolidColor(Color.Black),
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
          tint = Color.Black.copy(alpha = 0.4f)
        )
      }
      Spacer(modifier = Modifier.height(16.dp))
      Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.Black.copy(alpha = 0.08f)))
      Spacer(modifier = Modifier.height(14.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Outlined.EmojiEmotions, contentDescription = null, tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(18.dp))
        Icon(Icons.Outlined.Photo, contentDescription = null, tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
        Spacer(modifier = Modifier.width(18.dp))
        Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(22.dp))
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
            containerColor = Color.Black,
            disabledContainerColor = Color.Black.copy(alpha = 0.35f)
          ),
          shape = RoundedCornerShape(18.dp),
          contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp)
        ) {
          Text("Reply", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
      }
    }
  }
}

// ExoPlayer, not the platform VideoView/MediaPlayer -- the plain
// MediaPlayer frequently refuses phone-recorded MP4s whose moov atom sits
// at the end of the file with "Can't play this video", which ExoPlayer's
// own MP4 extractor handles fine via range-request seeking.
// Was ExoPlayer's default useController = true -- a full transport bar
// (skip/rewind-5/pause/forward-15/skip, scrubber, timestamp, settings
// gear) cluttering every video in the feed. Reddit-style instead: tap
// the video to play/pause, a single small mute toggle in the corner,
// nothing else on top of the video.
@Composable
internal fun MediaPostVideoPlayer(url: String, modifier: Modifier = Modifier) {
  val context = LocalContext.current
  val player = remember(url) {
    ExoPlayer.Builder(context).build().apply {
      setMediaItem(MediaItem.fromUri(url))
      volume = 0f
      prepare()
      playWhenReady = true
    }
  }
  var muted by remember(url) { mutableStateOf(true) }
  var playing by remember(url) { mutableStateOf(true) }
  DisposableEffect(player) {
    onDispose { player.release() }
  }
  Box(modifier = modifier) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .background(Color.White)
        .clickable {
          playing = !playing
          player.playWhenReady = playing
        },
      factory = { ctx ->
        PlayerView(ctx).apply {
          this.player = player
          useController = false
          // Default RESIZE_MODE_FIT letterboxes with hard black bars
          // whenever the video's own aspect ratio doesn't match the post
          // card's -- ZOOM crops to fill instead, matching how post images
          // already behave with ContentScale.Crop.
          resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
        }
      }
    )
    IconButton(
      onClick = {
        muted = !muted
        player.volume = if (muted) 0f else 1f
      },
      modifier = Modifier
        .align(Alignment.BottomEnd)
        .padding(10.dp)
        .size(32.dp)
        .clip(CircleShape)
        .background(Color.Black.copy(alpha = 0.45f))
    ) {
      if (muted) {
        Icon(Icons.Filled.VolumeOff, contentDescription = "Unmute", tint = Color.White, modifier = Modifier.size(18.dp))
      } else {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video_volume_up),
          contentDescription = "Mute",
          tint = Color.White,
          modifier = Modifier.size(18.dp)
        )
      }
    }
  }
}

// "+" in ChatGiZa Media now opens this instead of a Post/Article/Video
// menu -- it's the permission gate for the Chat<->Quantara bridge.
// Connecting only flips a local flag (ChatViewModel.chatGizaMediaConnected)
// that unlocks the "Push to Quantara" action under substantial ChatGiZa
// replies in Chat (see MESSAGE_PUSH_TO_EXTRA_MIN_LENGTH) -- nothing is
// posted automatically just from connecting.
@Composable
private fun ConnectFeatureRow(icon: ImageVector, title: String, body: String) {
  ConnectFeatureRowShell(title, body) {
    Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
  }
}

@Composable
private fun ConnectFeatureRow(painter: androidx.compose.ui.graphics.painter.Painter, title: String, body: String) {
  ConnectFeatureRowShell(title, body) {
    Icon(painter, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
  }
}

@Composable
private fun ConnectFeatureRowShell(title: String, body: String, icon: @Composable () -> Unit) {
  Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
    Box(
      modifier = Modifier
        .size(36.dp)
        .clip(RoundedCornerShape(11.dp))
        .background(Color.Black.copy(alpha = 0.14f)),
      contentAlignment = Alignment.Center
    ) {
      icon()
    }
    Spacer(modifier = Modifier.width(12.dp))
    Column {
      Text(title, color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(body, color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 13.sp, lineHeight = 18.sp)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ConnectWithChatGizaSheet(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
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
          .background(Color.Black.copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share_link),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(24.dp)
        )
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text("Connect With ChatGiZa", color = APP_TEXT_COLOR, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "Ruhusu akaunti yako ya Quantara kuingiliana moja kwa moja na ChatGiZa. Ukishaunganisha, " +
          "utaona chaguo la \"Quantara\" chini ya majibu marefu ya ChatGiZa kwenye chat.",
        color = APP_TEXT_COLOR.copy(alpha = 0.75f),
        fontSize = 14.sp,
        lineHeight = 20.sp
      )
      Spacer(modifier = Modifier.height(6.dp))
      Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.Black.copy(alpha = 0.08f)))
      ConnectFeatureRow(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connect_post),
        title = "Post",
        body = "Tuma barua, makala, au maandishi marefu moja kwa moja kwenye Quantara -- ukitaka tu."
      )
      ConnectFeatureRow(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connect_caption),
        title = "Caption",
        body = "Ongeza maneno yako mwenyewe chini ya post kabla ya kutuma."
      )
      // Its own full-color icon (not the shared tint = Black used by the
      // two rows above) -- ConnectFeatureRowShell called directly instead
      // of the ImageVector/Painter wrappers so tint can be Unspecified and
      // the drawable's own colors show through untouched.
      ConnectFeatureRowShell(
        title = "Hii ni hiari",
        body = "Maongezi ya kawaida (kama \"Habari\" au \"Mambo vipi\") hayapewi chaguo hili -- hakuna kinachotumwa bila wewe kubonyeza."
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connect_optional),
          contentDescription = null,
          tint = Color.Unspecified,
          modifier = Modifier.size(18.dp)
        )
      }
      Spacer(modifier = Modifier.height(20.dp))
      if (viewModel.chatGizaMediaConnected) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(Icons.Filled.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text("Connected", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
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
          colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
          shape = RoundedCornerShape(24.dp)
        ) {
          Text("Connect", color = Color.White, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Bounds-first decode of a picked photo, downsampled close to [maxDim] so a
// full camera-resolution image never gets fully decoded into memory --
// shared by the profile-photo crop dialog below (which needs real pixels to
// crop, unlike uriToPostImageDataUrl's already-final small JPEG).
private fun decodeBitmapCapped(context: android.content.Context, uri: Uri, maxDim: Int): Bitmap? {
  return try {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sampleSize = 1
    while (bounds.outWidth / (sampleSize * 2) >= maxDim || bounds.outHeight / (sampleSize * 2) >= maxDim) {
      sampleSize *= 2
    }
    context.contentResolver.openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sampleSize })
    }
  } catch (e: Exception) {
    null
  } catch (e: OutOfMemoryError) {
    null
  }
}

// A round, pinch-to-zoom/drag-to-pan crop step for the profile photo --
// opened between picking a photo and actually uploading it. Outputs a
// small fixed 480x480 JPEG regardless of the source photo's resolution,
// which also fixes uploads stalling/spinning for a long time on a slow
// connection (a full-resolution picked photo was going out over the wire
// with no size cap of its own, unlike post photos which already went
// through uriToPostImageDataUrl's downscale).
private const val PROFILE_PHOTO_CROP_OUTPUT_SIZE = 480

@Composable
internal fun ProfilePhotoCropDialog(uri: Uri, onCancel: () -> Unit, onConfirm: (String) -> Unit) {
  val context = LocalContext.current
  val density = LocalDensity.current
  var srcBitmap by remember(uri) { mutableStateOf<Bitmap?>(null) }
  var loadFailed by remember(uri) { mutableStateOf(false) }
  LaunchedEffect(uri) {
    val bmp = withContext(Dispatchers.IO) { decodeBitmapCapped(context, uri, 1600) }
    if (bmp == null) loadFailed = true else srcBitmap = bmp
  }
  LaunchedEffect(loadFailed) { if (loadFailed) onCancel() }

  var zoomFactor by remember(uri) { mutableStateOf(1f) }
  var offset by remember(uri) { mutableStateOf(Offset.Zero) }
  val viewportDp = 280.dp
  val viewportPx = with(density) { viewportDp.toPx() }

  Dialog(onDismissRequest = onCancel, properties = DialogProperties(usePlatformDefaultWidth = false)) {
    EdgeToEdgeDialogWindow()
    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
      Column(modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
        Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text("Cancel", color = Color.White, fontSize = 16.sp, modifier = Modifier.clickable(onClick = onCancel))
          Text("Move and Scale", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
          val bitmapNow = srcBitmap
          Text(
            "Done",
            color = if (bitmapNow != null) Color(0xFF4DA6FF) else Color.White.copy(alpha = 0.3f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.clickable(enabled = bitmapNow != null) {
              val bmp = bitmapNow ?: return@clickable
              val baseScale = maxOf(viewportPx / bmp.width, viewportPx / bmp.height)
              val totalScale = baseScale * zoomFactor
              val srcLeft = ((-offset.x) / totalScale).roundToInt().coerceIn(0, bmp.width - 1)
              val srcTop = ((-offset.y) / totalScale).roundToInt().coerceIn(0, bmp.height - 1)
              val cropSize = (viewportPx / totalScale).roundToInt()
                .coerceAtMost(minOf(bmp.width - srcLeft, bmp.height - srcTop))
                .coerceAtLeast(1)
              val cropped = Bitmap.createBitmap(bmp, srcLeft, srcTop, cropSize, cropSize)
              val output = Bitmap.createScaledBitmap(cropped, PROFILE_PHOTO_CROP_OUTPUT_SIZE, PROFILE_PHOTO_CROP_OUTPUT_SIZE, true)
              val out = ByteArrayOutputStream()
              output.compress(Bitmap.CompressFormat.JPEG, 85, out)
              val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
              onConfirm("data:image/jpeg;base64,$base64")
            }
          )
        }

        Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
          val bmp = srcBitmap
          if (bmp == null) {
            CircularProgressIndicator(color = Color.White)
          } else {
            val baseScale = maxOf(viewportPx / bmp.width, viewportPx / bmp.height)
            Box(
              modifier = Modifier
                .size(viewportDp)
                .clip(CircleShape)
                .background(Color(0xFF1A1A1A))
                .pointerInput(bmp) {
                  detectTransformGestures { _, pan, gestureZoom, _ ->
                    val oldScale = baseScale * zoomFactor
                    val newZoom = (zoomFactor * gestureZoom).coerceIn(1f, 4f)
                    val newScale = baseScale * newZoom
                    val center = viewportPx / 2f
                    val imgX = (center - offset.x) / oldScale
                    val imgY = (center - offset.y) / oldScale
                    var newX = center - imgX * newScale + pan.x
                    var newY = center - imgY * newScale + pan.y
                    val dw = bmp.width * newScale
                    val dh = bmp.height * newScale
                    newX = newX.coerceIn((viewportPx - dw).coerceAtMost(0f), 0f)
                    newY = newY.coerceIn((viewportPx - dh).coerceAtMost(0f), 0f)
                    zoomFactor = newZoom
                    offset = Offset(newX, newY)
                  }
                }
            ) {
              val totalScale = baseScale * zoomFactor
              Image(
                bitmap = bmp.asImageBitmap(),
                contentDescription = null,
                modifier = Modifier
                  .size(with(density) { (bmp.width * totalScale).toDp() }, with(density) { (bmp.height * totalScale).toDp() })
                  .graphicsLayer { translationX = offset.x; translationY = offset.y }
              )
            }
          }
        }

        Text(
          "Pinch to zoom, drag to reposition",
          color = Color.White.copy(alpha = 0.6f),
          fontSize = 13.sp,
          modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 20.dp)
        )
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
internal fun ChatGizaMediaPostComposerScreen(viewModel: ChatViewModel, onDismiss: () -> Unit, destination: String = "post") {
  BackHandler { onDismiss() }
  val context = LocalContext.current
  val composerScope = rememberCoroutineScope()
  var text by remember { mutableStateOf("") }
  var imageUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
  var videoUri by remember { mutableStateOf<Uri?>(null) }
  var sentiment by remember { mutableStateOf<String?>(null) }
  var posting by remember { mutableStateOf(false) }
  // A failed post used to fail completely silently -- the button just went
  // back to "Post" with nothing else happening, which read as "stuck" or
  // "not doing anything" rather than "failed, here's why."
  LaunchedEffect(Unit) {
    viewModel.clearMediaError()
  }
  // Billing prefetch removed -- see the comment on HistoryScreen's old
  // billing LaunchedEffect for why. hasGizaPro just stays false while
  // billingSummary is never populated, same net effect on the caption
  // paywall below as before.
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
      .background(APP_BACKGROUND)
      .statusBarsPadding()
  ) {
    Column(modifier = Modifier.fillMaxSize()) {
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(onClick = onDismiss, modifier = Modifier.size(26.dp)) {
          Icon(Icons.Outlined.Close, contentDescription = "Close", tint = Color.Black, modifier = Modifier.size(26.dp))
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

              viewModel.createMediaPost(text.trim(), imageDataUrls, videoBytes, videoMime, sentiment, destination) { success ->
                posting = false
                if (success) onDismiss()
              }
            }
          },
          enabled = canPost,
          colors = ButtonDefaults.buttonColors(
            containerColor = Color.Black,
            disabledContainerColor = Color.Black.copy(alpha = 0.35f)
          ),
          shape = RoundedCornerShape(20.dp),
          contentPadding = PaddingValues(horizontal = 22.dp, vertical = 8.dp)
        ) {
          Text(
            if (viewModel.uploadingMediaVideo) "Uploading…" else if (posting) "Posting…" else "Post",
            color = Color.White,
            fontWeight = FontWeight.SemiBold
          )
        }
      }
      if (viewModel.mediaError != null) {
        Text(
          viewModel.mediaError.orEmpty(),
          color = APP_TEXT_COLOR,
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
              tint = Color.Black,
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
              textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 17.sp),
              cursorBrush = SolidColor(Color.Black),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }

        if (text.isNotEmpty()) {
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            "${text.length}/$MEDIA_POST_FREE_CAPTION_LIMIT",
            color = if (overFreeCaptionLimit) Color.Black else Color(0xFF7A7A7A),
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
              .background(Color.Black.copy(alpha = 0.1f))
              .padding(14.dp)
          ) {
            Text(
              "Captions over $MEDIA_POST_FREE_CAPTION_LIMIT characters need GiZa Pro.",
              color = APP_TEXT_COLOR,
              fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            // GiZa Pro checkout is offline while the payment system is being
            // rebuilt -- this used to call viewModel.startCheckout("starter"),
            // which now always fails server-side and surfaced a dead-end
            // "Couldn't start checkout" error. Trim the caption instead of
            // dangling a broken upgrade path in front of someone who can't
            // actually complete it.
            Button(
              onClick = { viewModel.reportMediaError("GiZa Pro upgrades aren't available right now -- please shorten your caption.") },
              colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
              shape = RoundedCornerShape(20.dp),
              contentPadding = PaddingValues(horizontal = 18.dp, vertical = 8.dp)
            ) {
              Text("Not available right now", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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
                    .background(Color.White.copy(alpha = 0.55f))
                ) {
                  Icon(Icons.Outlined.Close, contentDescription = "Remove photo", tint = Color.Black, modifier = Modifier.size(14.dp))
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
              .background(Color.Black.copy(alpha = 0.06f)),
            contentAlignment = Alignment.Center
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_video),
                contentDescription = null,
                tint = Color.Black,
                modifier = Modifier.size(20.dp)
              )
              Spacer(modifier = Modifier.width(8.dp))
              Text("Video attached", color = APP_TEXT_COLOR, fontSize = 14.sp)
            }
            IconButton(
              onClick = { videoUri = null },
              modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .size(30.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.55f))
            ) {
              Icon(Icons.Outlined.Close, contentDescription = "Remove video", tint = Color.Black, modifier = Modifier.size(18.dp))
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
        // Hashtag/cashtag/poll/gift/more and the bullish/neutral/bearish
        // sentiment toggle removed from here -- just emoji/photo/video now.
      }
    }
  }
}

@Composable
private fun SentimentToggle(selected: String?, onSelect: (String) -> Unit) {
  Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
    SentimentToggleIcon(
      icon = Icons.Outlined.TrendingUp,
      tint = Color.Black,
      active = selected == "bullish",
      onClick = { onSelect("bullish") }
    )
    SentimentToggleIcon(
      icon = Icons.AutoMirrored.Outlined.TrendingFlat,
      tint = Color.Black,
      active = selected == "neutral",
      onClick = { onSelect("neutral") }
    )
    SentimentToggleIcon(
      icon = Icons.Outlined.TrendingDown,
      tint = Color.Black,
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
        tint = Color.Black,
        modifier = Modifier.size(24.dp)
      )
    }
    Spacer(modifier = Modifier.width(24.dp))
    Text(label, color = APP_TEXT_COLOR, fontSize = 15.sp)
  }
}

// One of the three square quick-action cards (Camera/Gallery/Files) across
// the top of AttachMenuSheet -- icon over label, evenly spaced in a row.
@Composable
private fun AttachQuickAction(iconRes: Int, label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
  Column(
    horizontalAlignment = Alignment.CenterHorizontally,
    modifier = modifier
      .clip(RoundedCornerShape(16.dp))
      .background(Color.White)
      .border(1.dp, Color.Black.copy(alpha = 0.06f), RoundedCornerShape(16.dp))
      .clickable(onClick = onClick)
      .padding(vertical = 16.dp)
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(iconRes),
      contentDescription = null,
      tint = Color.Black,
      modifier = Modifier.size(24.dp)
    )
    Spacer(modifier = Modifier.height(8.dp))
    Text(label, color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium, maxLines = 1)
  }
}

// A Skills/Connectors row below the quick-action grid -- icon, title +
// one-line description, and a trailing chevron, matching the app's other
// "opens a bigger picker" rows (see MyInfoRow) rather than the plain
// icon+label-only AttachMenuRow above.
@Composable
private fun AttachMenuDetailRow(icon: @Composable () -> Unit, label: String, description: String, onClick: () -> Unit) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .background(Color.White)
      .border(1.dp, Color.Black.copy(alpha = 0.06f), RoundedCornerShape(14.dp))
      .clickable(onClick = onClick)
      .padding(horizontal = 14.dp, vertical = 12.dp)
  ) {
    Box(modifier = Modifier.size(24.dp), contentAlignment = Alignment.Center) { icon() }
    Spacer(modifier = Modifier.width(16.dp))
    Column(modifier = Modifier.weight(1f)) {
      Text(label, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
      Spacer(modifier = Modifier.height(2.dp))
      Text(description, color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 13.sp)
    }
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.35f), modifier = Modifier.size(20.dp))
  }
}

// Replaces the old bare DropdownMenu (Camera/Gallery/Files/Skills/
// Connectors as plain rows) with a bottom sheet: Camera/Gallery/Files as
// a row of square quick-action cards up top, Skills/Connectors below as
// description+chevron rows, matching the reference layout the user asked
// to copy.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AttachMenuSheet(
  onDismiss: () -> Unit,
  onCamera: () -> Unit,
  onGallery: () -> Unit,
  onFiles: () -> Unit,
  onSkills: () -> Unit,
  onConnectors: () -> Unit
) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        AttachQuickAction(iconRes = R.drawable.ic_camera, label = "Camera", onClick = onCamera, modifier = Modifier.weight(1f))
        AttachQuickAction(iconRes = R.drawable.ic_gallery, label = "Gallery", onClick = onGallery, modifier = Modifier.weight(1f))
        AttachQuickAction(iconRes = R.drawable.ic_files, label = "Files", onClick = onFiles, modifier = Modifier.weight(1f))
      }
      Spacer(modifier = Modifier.height(16.dp))
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AttachMenuDetailRow(
          icon = { SkillsIconCustom(tint = Color.Black, modifier = Modifier.size(24.dp)) },
          label = "Skills",
          description = "Reuse specialized skills to handle specific tasks reliably",
          onClick = onSkills
        )
        AttachMenuDetailRow(
          icon = {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_connectors),
              contentDescription = null,
              tint = Color.Black,
              modifier = Modifier.size(24.dp)
            )
          },
          label = "Connectors",
          description = "Connect apps and databases to automate actions for you",
          onClick = onConnectors
        )
      }
    }
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
      tint = Color.Black,
      modifier = Modifier.size(19.dp)
    )
    Spacer(modifier = Modifier.width(16.dp))
    Text(label, color = APP_TEXT_COLOR, fontSize = 16.sp)
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
        Icon(Icons.Outlined.Mic, contentDescription = "Voice", tint = Color.Black, modifier = Modifier.size(16.dp))
      } else {
        Text(
          title.trim().take(1).uppercase(),
          color = APP_TEXT_COLOR,
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
                listOf(Color.Black, Color.Black, Color.Black)
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
      .background(Color.White),
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
        tint = Color.Black,
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
    colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.Black)
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
          unfocusedTextColor = Color.Black,
          focusedTextColor = Color.Black
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
    colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.Black)
      Spacer(modifier = Modifier.width(16.dp))
      Column {
        Text(title, color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Medium)
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
    colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(icon, contentDescription = null, tint = Color.Black)
      Spacer(modifier = Modifier.width(16.dp))
      Text(title, color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Medium)
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditProfileScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeEditProfile() }
  var xNote by remember { mutableStateOf(false) }

  var cropPhotoUri by remember { mutableStateOf<Uri?>(null) }
  val profilePhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) cropPhotoUri = uri
  }
  if (cropPhotoUri != null) {
    ProfilePhotoCropDialog(
      uri = cropPhotoUri!!,
      onCancel = { cropPhotoUri = null },
      onConfirm = { dataUrl ->
        cropPhotoUri = null
        viewModel.updateProfilePhoto(dataUrl)
      }
    )
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
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
        color = APP_TEXT_COLOR,
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
        onClick = { profilePhotoPicker.launch("image/*") },
        modifier = Modifier
          .size(40.dp)
          .align(Alignment.BottomEnd)
          .offset(x = (-4).dp)
          .border(2.dp, Color(0xFF181818), CircleShape),
        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black)
      ) {
        if (viewModel.savingProfilePhoto) {
          CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
          Icon(Icons.Outlined.Edit, contentDescription = "Change photo", tint = Color.White, modifier = Modifier.size(18.dp))
        }
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
      colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
    ) {
      Row(
        modifier = Modifier.padding(20.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_logout), contentDescription = null, tint = Color.Black)
        Spacer(modifier = Modifier.width(16.dp))
        Text("Sign out", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Medium)
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
      .fillMaxSize()
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
      val rowColors = listOf(Color.White, Color.White, Color.White)
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
    modifier = modifier.clickable(onClick = onClick).fillMaxHeight(),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .weight(1f)
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
          Row(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(18.dp))) {
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

  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
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
      // preview of what each one actually looks like. The grid fills all
      // remaining space down to the bottom of the screen (equally split
      // between the two rows) instead of sizing itself off the mockup's
      // own aspect ratio, so all 4 cards stay the same height and the
      // screen never needs to scroll.
      val themeOrder = listOf(AppTheme.LIGHT, AppTheme.DARK, AppTheme.FOR_YOU, AppTheme.SYSTEM)
      Column(modifier = Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        themeOrder.chunked(2).forEach { rowThemes ->
          Row(modifier = Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            rowThemes.forEach { theme ->
              Box(modifier = Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                ThemeCard(
                  theme = theme,
                  selected = selectedTheme == theme,
                  onClick = { viewModel.updateThemeMode(theme.key) },
                  modifier = Modifier.fillMaxWidth(0.88f)
                )
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
private fun FontChoiceScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeFontChoice() }
  Scaffold(containerColor = Color.Transparent) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .padding(horizontal = 20.dp)
        .padding(top = 20.dp, bottom = 24.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { viewModel.closeFontChoice() }, modifier = Modifier.size(28.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.width(20.dp))
        Text("Font", color = colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
      }
      Spacer(modifier = Modifier.height(24.dp))
      Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FONT_OPTIONS.forEach { option ->
          FontCard(
            option = option,
            selected = viewModel.fontChoice == option.id,
            onClick = { viewModel.updateFontChoice(option.id) }
          )
        }
      }
    }
  }
}

@Composable
private fun FontCard(option: FontOption, selected: Boolean, onClick: () -> Unit) {
  val checkAlpha by animateFloatAsState(
    targetValue = if (selected) 1f else 0f,
    animationSpec = tween(250),
    label = "fontCheckAlpha"
  )
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(18.dp))
      .background(Color.White)
      .clickable(onClick = onClick)
      .padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 16.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Column(modifier = Modifier.weight(1f)) {
      // Preview text rendered IN the option's own font -- the whole point
      // of this card is to show what each one actually looks like, not
      // just name it.
      Text(option.label, color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = option.family)
      Spacer(modifier = Modifier.height(2.dp))
      Text(option.description, color = Color(0xFFA8A8A8), fontSize = 14.sp, fontWeight = FontWeight.Normal, fontFamily = option.family)
    }
    if (checkAlpha > 0f) {
      Icon(
        Icons.Filled.Check,
        contentDescription = "Selected",
        tint = Color.Black.copy(alpha = checkAlpha),
        modifier = Modifier.size(28.dp).padding(end = 8.dp)
      )
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
  VoiceOption("cedar", "Orin", "Wise Male", Color.Black, Color.Black),
  VoiceOption("alloy", "Lyra", "Calm Female", Color.Black, Color.Black),
  VoiceOption("ballad", "Kael", "Bold Male", Color.Black, Color.Black),
  VoiceOption("coral", "Elia", "Warm Female", Color.Black, Color.Black),
  VoiceOption("sage", "Leo", "Smart Male", Color.Black, Color.Black),
  // The signature/default ChatGiZa voice — no "18+" tag here: unlike
  // Personality, voice choice has no real content-gating behind it, and
  // this is also the app's default, so tagging it adult-only would be
  // both meaningless and contradict it being what new users hear by default.
  VoiceOption("marin", "GiZa", "Playful", Color.Black, Color.Black)
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
      .background(Color.White)
      .clickable(onClick = onClick)
      .padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 16.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Column(modifier = Modifier.weight(1f)) {
      Text(option.name, color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(option.description, color = Color(0xFFA8A8A8), fontSize = 15.sp, fontWeight = FontWeight.Normal)
    }
    if (checkAlpha > 0f) {
      Icon(
        Icons.Filled.Check,
        contentDescription = "Selected",
        tint = Color.Black.copy(alpha = checkAlpha),
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
      // Centered "Voice Library" title across the full width (matching the
      // reference), not left-aligned next to the back button.
      Box(modifier = Modifier.fillMaxWidth()) {
        Text(
          "Voice Library",
          color = colorScheme.onBackground,
          fontSize = 20.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier.align(Alignment.Center)
        )
        IconButton(onClick = { viewModel.closeVoice() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = colorScheme.onBackground, modifier = Modifier.size(28.dp))
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Richer-palette orb, sized up as the screen's hero avatar -- see
      // VoiceLibraryHeroOrb's own doc comment for why it isn't just
      // OrinVoiceBadge reused directly.
      val heartbeatScale = remember { Animatable(1f) }
      val heartbeatScope = rememberCoroutineScope()
      Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        VoiceLibraryHeroOrb(
          modifier = Modifier
            .size(110.dp)
            .graphicsLayer {
              scaleX = heartbeatScale.value
              scaleY = heartbeatScale.value
            }
            .clickable(
              indication = null,
              interactionSource = remember { MutableInteractionSource() }
            ) {
              heartbeatScope.launch {
                // Two-beat "lub-dub" heartbeat pulse on tap.
                heartbeatScale.animateTo(1.18f, tween(140, easing = FastOutSlowInEasing))
                heartbeatScale.animateTo(1f, tween(160, easing = FastOutSlowInEasing))
                heartbeatScale.animateTo(1.1f, tween(120, easing = FastOutSlowInEasing))
                heartbeatScale.animateTo(1f, tween(180, easing = FastOutSlowInEasing))
              }
            },
          tint = Color.Black
        )
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
private fun DataControlsAppBar(
  title: String,
  // Account Settings wants a smaller, centered title with the long-arrow
  // back icon (matching its own reference); Data Controls/Data Dashboard
  // keep the original left-aligned, larger-title layout untouched.
  centered: Boolean = false,
  titleFontSize: androidx.compose.ui.unit.TextUnit = 22.sp,
  onBack: () -> Unit
) {
  if (centered) {
    Box(modifier = Modifier.fillMaxWidth().padding(top = 26.dp, bottom = 20.dp)) {
      IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).size(24.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(22.dp))
      }
      Text(
        title,
        color = APP_TEXT_COLOR,
        fontSize = titleFontSize,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
    }
  } else {
    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 26.dp, bottom = 20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = onBack, modifier = Modifier.size(24.dp)) {
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
      Spacer(modifier = Modifier.width(20.dp))
      Text(
        title,
        color = APP_TEXT_COLOR,
        fontSize = titleFontSize,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 2.dp)
      )
    }
  }
}

@Composable
private fun DataControlToggleRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
  Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
    Column(modifier = Modifier.weight(1f)) {
      Text(title, color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.Bold)
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
    color = APP_TEXT_COLOR,
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
        Text("Delete", color = APP_TEXT_COLOR)
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
            Text("Manage Cloud Storage", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.Bold)
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
private fun AccountSettingsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAccountSettings() }
  var confirmDeleteAccount by remember { mutableStateOf(false) }
  var showDeactivateDialog by remember { mutableStateOf(false) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .padding(horizontal = 16.dp)
  ) {
    DataControlsAppBar("Account Settings", centered = true, titleFontSize = 18.sp) { viewModel.closeAccountSettings() }
    AccountSettingsRow(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_solid),
      title = "Deactivate an Account",
      description = "Something wrong with your account? Temporarily deactivate it while keeping your data intact.",
      onClick = { showDeactivateDialog = true }
    )
    Spacer(modifier = Modifier.height(14.dp))
    AccountSettingsRow(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_power_off),
      title = "Delete account",
      description = "Permanently delete the current Main Account and all associated Subaccounts",
      onClick = { confirmDeleteAccount = true }
    )
  }

  if (confirmDeleteAccount) {
    DeleteAccountDialog(viewModel = viewModel, onDismiss = { confirmDeleteAccount = false })
  }
  if (showDeactivateDialog) {
    DeactivateAccountDialog(viewModel = viewModel, onDismiss = { showDeactivateDialog = false })
  }
}

// A rounded rect with the bottom-left corner cut into a diagonal --
// matches the "folded page corner" look on the reference's document
// illustration instead of a plain rounded corner there. GenericShape's
// builder only gets (size, layoutDirection), not density, so the Dp->px
// conversion has to happen before the shape is built, not inside it.
@Composable
private fun rememberFoldedCornerShape(cornerRadius: Dp, foldSize: Dp): Shape {
  val density = LocalDensity.current
  return remember(cornerRadius, foldSize, density) {
    val r = with(density) { cornerRadius.toPx() }
    val fold = with(density) { foldSize.toPx() }
    GenericShape { size: Size, _: LayoutDirection ->
      val w = size.width
      val h = size.height
      moveTo(r, 0f)
      lineTo(w - r, 0f)
      quadraticBezierTo(w, 0f, w, r)
      lineTo(w, h - r)
      quadraticBezierTo(w, h, w - r, h)
      lineTo(fold, h)
      lineTo(0f, h - fold)
      lineTo(0f, r)
      quadraticBezierTo(0f, 0f, r, 0f)
      close()
    }
  }
}

@Composable
private fun DeactivateAccountIllustration() {
  val cardShape = rememberFoldedCornerShape(12.dp, 16.dp)
  Box(modifier = Modifier.size(width = 140.dp, height = 128.dp)) {
    // Less tilt and tucked further under the front card so its corner
    // doesn't poke out messily at the bottom-left.
    Box(
      modifier = Modifier
        .size(width = 84.dp, height = 100.dp)
        .align(Alignment.TopStart)
        .offset(x = 9.dp, y = 13.dp)
        .graphicsLayer { rotationZ = -5f }
        .border(0.5.dp, Color.Black.copy(alpha = 0.6f), cardShape)
    )
    Column(
      modifier = Modifier
        .size(width = 84.dp, height = 100.dp)
        .align(Alignment.TopStart)
        .offset(x = 29.dp, y = 0.dp)
        .clip(cardShape)
        .background(Color.White)
        .border(0.5.dp, Color.Black, cardShape)
        .padding(14.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_account_face),
        contentDescription = null,
        tint = Color.Black,
        modifier = Modifier.size(38.dp)
      )
      Spacer(modifier = Modifier.height(13.dp))
      Box(modifier = Modifier.fillMaxWidth().height(0.75.dp).background(Color.Black))
      Spacer(modifier = Modifier.height(5.dp))
      Box(modifier = Modifier.fillMaxWidth().height(0.75.dp).background(Color.Black))
      Spacer(modifier = Modifier.height(5.dp))
      Box(modifier = Modifier.fillMaxWidth(0.65f).height(0.75.dp).background(Color.Black))
    }
    // Pulled up and inward (instead of hanging fully outside the corner)
    // so it reads as sitting on the card, not floating separately below it.
    // Smaller than before too -- it's a solid-fill icon, not a stroke, so
    // shrinking it is what makes it read as thinner/lighter.
    Icon(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_padlock_outline),
      contentDescription = null,
      tint = Color.Black,
      modifier = Modifier
        .size(22.dp)
        .align(Alignment.BottomEnd)
        .offset(x = (-16).dp, y = (-18).dp)
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DeactivateAccountDialog(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  val mainUid = remember(viewModel.userId) { derivedUid(viewModel.userId.orEmpty()) }
  var subaccountsExpanded by remember { mutableStateOf(true) }
  LaunchedEffect(Unit) { viewModel.loadSubaccounts() }

  // Tapping Deactivate on the first screen doesn't act right away -- it
  // opens this second, harder-to-miss confirmation matching the reference:
  // consequences spelled out, a checkbox, and the button itself disabled
  // behind a few seconds' countdown so it can't be tapped on reflex.
  var deactivateConfirmStep by remember { mutableStateOf(false) }
  var agreedToConsequences by remember(deactivateConfirmStep) { mutableStateOf(false) }
  var confirmCountdown by remember(deactivateConfirmStep) { mutableStateOf(5) }
  LaunchedEffect(deactivateConfirmStep) {
    if (deactivateConfirmStep) {
      confirmCountdown = 5
      while (confirmCountdown > 0) {
        delay(1000)
        confirmCountdown -= 1
      }
    }
  }

  fun copyUid(uid: String) {
    clipboard.setText(AnnotatedString(uid))
    Toast.makeText(context, "UID copied", Toast.LENGTH_SHORT).show()
  }

  // skipPartiallyExpanded -- without it a sheet this tall opens sitting
  // halfway up the screen, needing a drag before the Deactivate button
  // down at the bottom is even visible.
  val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

  ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = APP_BACKGROUND, dragHandle = null, scrimColor = Color.Black.copy(alpha = 0.75f)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        // Full screen height instead of sizing to content -- content-driven
        // sizing meant collapsing Subaccount visibly shrank the whole sheet
        // (its top edge, and the scrim above it, slid down). A constant
        // fraction never changes regardless of what's toggled inside it.
        // 0.88f closes the gap that was left below the "Account Settings"
        // header at 0.85f, without going all the way to 1f -- that covered
        // the header itself, which was never the ask; only the leftover
        // empty scrim gap below it needed to go.
        .fillMaxHeight(0.88f)
        .padding(horizontal = 20.dp)
        .padding(top = 20.dp, bottom = 28.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        if (deactivateConfirmStep) {
          Icon(
            Icons.AutoMirrored.Outlined.ArrowBack,
            contentDescription = "Back",
            tint = Color.Black,
            modifier = Modifier.size(22.dp).clickable { deactivateConfirmStep = false }
          )
        }
        Spacer(modifier = Modifier.weight(1f))
        Icon(
          Icons.Filled.Close,
          contentDescription = "Close",
          tint = Color.Black,
          modifier = Modifier.size(22.dp).clickable(onClick = onDismiss)
        )
      }
      Spacer(modifier = Modifier.height(20.dp))
      // weight(1f) + its own scroll, instead of scrolling the whole sheet --
      // this is what actually pins the button/Cancel to the bottom of the
      // fixed-height sheet. Scrolling the outer Column let short content
      // just leave a gap below Cancel instead of the button sitting at the
      // true bottom like the reference. Only step 1 gets the weight though
      // -- its illustration+box naturally fill most of the space anyway, so
      // pinning works well there. Step 2's content (a few bullets + a
      // checkbox) is much shorter, and weighting it the same way left a
      // large empty gap between the checkbox and the button instead of
      // them sitting close together.
      if (!deactivateConfirmStep) {
      Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState())) {
      Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        DeactivateAccountIllustration()
      }
      Spacer(modifier = Modifier.height(20.dp))
      Text(
        "Are you sure you want to deactivate your account?",
        color = APP_TEXT_COLOR,
        fontSize = 17.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth()
      )
      Spacer(modifier = Modifier.height(20.dp))
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .border(1.dp, Color.Black.copy(alpha = 0.1f), RoundedCornerShape(14.dp))
          .padding(16.dp)
      ) {
        Text("Account to be deactivated", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(modifier = Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
          if (viewModel.userImage != null) {
            AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(36.dp).clip(CircleShape))
          } else {
            Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.Black, modifier = Modifier.size(36.dp))
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(
              viewModel.userName?.takeIf { it.isNotBlank() } ?: "You",
              color = APP_TEXT_COLOR,
              fontSize = 15.sp,
              fontWeight = FontWeight.SemiBold,
              fontFamily = FontFamily.Monospace
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text("UID: $mainUid", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.sp, fontFamily = FontFamily.Monospace)
              Spacer(modifier = Modifier.width(4.dp))
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy),
                contentDescription = "Copy UID",
                tint = Color.Black.copy(alpha = 0.4f),
                modifier = Modifier.size(11.dp).clickable { copyUid(mainUid) }
              )
            }
          }
        }
        if (viewModel.subaccounts.isNotEmpty()) {
          Spacer(modifier = Modifier.height(14.dp))
          HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))
          Spacer(modifier = Modifier.height(14.dp))
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clickable { subaccountsExpanded = !subaccountsExpanded },
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text("Subaccount", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.weight(1f))
            Text("${viewModel.subaccounts.size}", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Monospace)
            Icon(
              Icons.Outlined.KeyboardArrowDown,
              contentDescription = if (subaccountsExpanded) "Collapse" else "Expand",
              tint = Color.Black,
              modifier = Modifier
                .size(18.dp)
                .graphicsLayer { rotationZ = if (subaccountsExpanded) 180f else 0f }
            )
          }
          // AnimatedVisibility instead of a plain `if` -- collapsing the
          // list used to remove this content in one recomposition frame,
          // yanking the sheet's whole height (and everything below it)
          // down instantly, which read as the sheet itself slamming shut.
          // Animating the height/fade change smooths that out to just the
          // list opening and closing in place.
          AnimatedVisibility(
            visible = subaccountsExpanded,
            enter = expandVertically(animationSpec = tween(200)) + fadeIn(animationSpec = tween(200)),
            exit = shrinkVertically(animationSpec = tween(200)) + fadeOut(animationSpec = tween(150))
          ) {
            Column {
              Spacer(modifier = Modifier.height(10.dp))
              viewModel.subaccounts.forEach { sub ->
                val subUid = derivedUid(sub.id)
                Row(
                  modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically
                ) {
                  Text(sub.name, color = APP_TEXT_COLOR, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                  Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("UID: $subUid", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy),
                      contentDescription = "Copy UID",
                      tint = Color.Black.copy(alpha = 0.4f),
                      modifier = Modifier.size(11.dp).clickable { copyUid(subUid) }
                    )
                  }
                }
              }
            }
          }
        }
      }
      }
      } else {
        // weight(1f), default top arrangement -- the text/bullets sit
        // flush at the top (right after the header) like step 1's content
        // does, and a weighted Spacer below them (not Arrangement.Bottom on
        // the whole column) is what pushes just the checkbox down to sit
        // right above the button, instead of dragging the text down too.
        Column(modifier = Modifier.weight(1f)) {
        // Second, harder-to-miss step -- the actual deactivateAccount()
        // call only happens from here, gated behind reading the checkbox
        // and a few seconds' countdown so it can't be tapped on reflex.
        Text(
          "Deactivating your account will result in the following:",
          color = APP_TEXT_COLOR,
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold,
          fontFamily = FontFamily.Monospace,
          lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(18.dp))
        listOf(
          "You'll be signed out of this account and all Subaccounts.",
          "You won't be able to use ChatGiZa until you sign back in.",
          "Your conversations and data stay intact -- nothing is deleted."
        ).forEach { line ->
          Row(modifier = Modifier.padding(vertical = 10.dp)) {
            Text("• ", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 13.sp, fontFamily = FontFamily.Monospace)
            Text(line, color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 13.sp, fontFamily = FontFamily.Monospace, lineHeight = 18.sp)
          }
        }
        Spacer(modifier = Modifier.weight(1f))
        Row(
          modifier = Modifier.fillMaxWidth().clickable { agreedToConsequences = !agreedToConsequences },
          verticalAlignment = Alignment.Top
        ) {
          Checkbox(
            checked = agreedToConsequences,
            onCheckedChange = { agreedToConsequences = it },
            colors = CheckboxDefaults.colors(checkedColor = Color.Black, uncheckedColor = Color.Black.copy(alpha = 0.4f))
          )
          Spacer(modifier = Modifier.width(4.dp))
          Text(
            "I have read, understood, and agree to the above.",
            color = APP_TEXT_COLOR,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            lineHeight = 18.sp,
            modifier = Modifier.padding(top = 14.dp)
          )
        }
        }
      }
      Spacer(modifier = Modifier.height(24.dp))
      if (!deactivateConfirmStep) {
        Button(
          onClick = { deactivateConfirmStep = true },
          shape = RoundedCornerShape(28.dp),
          colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
          modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
          Text("Deactivate", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Monospace)
        }
      } else {
        val readyToConfirm = agreedToConsequences && confirmCountdown <= 0
        Button(
          onClick = { viewModel.deactivateAccount() },
          enabled = readyToConfirm && !viewModel.deactivatingAccount,
          shape = RoundedCornerShape(28.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFFF9C2D),
            disabledContainerColor = Color(0xFFFF9C2D).copy(alpha = 0.4f)
          ),
          modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
          if (viewModel.deactivatingAccount) {
            CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
          } else {
            Text(
              if (confirmCountdown > 0) "I Understand (${confirmCountdown}s)" else "I Understand",
              color = APP_TEXT_COLOR,
              fontSize = 16.sp,
              fontWeight = FontWeight.SemiBold,
              fontFamily = FontFamily.Monospace
            )
          }
        }
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text(
        "Cancel",
        color = APP_TEXT_COLOR,
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold,
        fontFamily = FontFamily.Monospace,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onDismiss)
      )
    }
  }
}

// Same two-card illustration as DeactivateAccountIllustration but with a
// trash badge instead of a lock, so Delete and Deactivate read as a
// matched pair instead of reusing the exact same graphic for two
// different actions.
@Composable
private fun DeleteAccountIllustration() {
  val cardShape = rememberFoldedCornerShape(12.dp, 16.dp)
  Box(modifier = Modifier.size(width = 140.dp, height = 128.dp)) {
    Box(
      modifier = Modifier
        .size(width = 84.dp, height = 100.dp)
        .align(Alignment.TopStart)
        .offset(x = 9.dp, y = 13.dp)
        .graphicsLayer { rotationZ = -5f }
        .border(0.5.dp, Color.Black.copy(alpha = 0.6f), cardShape)
    )
    Column(
      modifier = Modifier
        .size(width = 84.dp, height = 100.dp)
        .align(Alignment.TopStart)
        .offset(x = 29.dp, y = 0.dp)
        .clip(cardShape)
        .background(Color.White)
        .border(0.5.dp, Color.Black, cardShape)
        .padding(14.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_account_face),
        contentDescription = null,
        tint = Color.Black,
        modifier = Modifier.size(38.dp)
      )
      Spacer(modifier = Modifier.height(13.dp))
      Box(modifier = Modifier.fillMaxWidth().height(0.75.dp).background(Color.Black))
      Spacer(modifier = Modifier.height(5.dp))
      Box(modifier = Modifier.fillMaxWidth().height(0.75.dp).background(Color.Black))
      Spacer(modifier = Modifier.height(5.dp))
      Box(modifier = Modifier.fillMaxWidth(0.65f).height(0.75.dp).background(Color.Black))
    }
    DeleteIcon(
      tint = Color.Black,
      strokeScale = 1.1f,
      modifier = Modifier
        .size(30.dp)
        .align(Alignment.BottomEnd)
        .offset(x = (-8).dp, y = (-10).dp)
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DeleteAccountDialog(viewModel: ChatViewModel, onDismiss: () -> Unit) {
  val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

  ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = APP_BACKGROUND, dragHandle = null, scrimColor = Color.Black.copy(alpha = 0.75f)) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(top = 20.dp, bottom = 28.dp)
    ) {
      Box(modifier = Modifier.fillMaxWidth()) {
        Icon(
          Icons.Filled.Close,
          contentDescription = "Close",
          tint = Color.Black,
          modifier = Modifier.size(22.dp).align(Alignment.CenterEnd).clickable(onClick = onDismiss)
        )
      }
      Spacer(modifier = Modifier.height(20.dp))
      Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        DeleteAccountIllustration()
      }
      Spacer(modifier = Modifier.height(20.dp))
      Text(
        "Are you sure you want to delete your account?",
        color = APP_TEXT_COLOR,
        fontSize = 17.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth()
      )
      Spacer(modifier = Modifier.height(8.dp))
      Text(
        "This permanently deletes your account and all its data.",
        color = APP_TEXT_COLOR.copy(alpha = 0.5f),
        fontSize = 13.sp,
        fontFamily = FontFamily.Monospace,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth()
      )
      Spacer(modifier = Modifier.height(20.dp))
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFF4F4F4))
          .padding(16.dp)
      ) {
        Text(
          "Applies to this Main Account and all Subaccounts",
          color = APP_TEXT_COLOR,
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold,
          fontFamily = FontFamily.Monospace
        )
        Spacer(modifier = Modifier.height(10.dp))
        listOf(
          "All conversations, media, and subaccounts are permanently erased",
          "This action cannot be undone"
        ).forEach { line ->
          Row(modifier = Modifier.padding(vertical = 3.dp)) {
            Text("• ", color = APP_TEXT_COLOR, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
            Text(line, color = APP_TEXT_COLOR, fontSize = 13.sp, fontFamily = FontFamily.Monospace, lineHeight = 18.sp)
          }
        }
      }
      if (viewModel.errorMessage != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.errorMessage!!, color = Color(0xFFE14050), fontSize = 13.sp, fontFamily = FontFamily.Monospace)
      }
      Spacer(modifier = Modifier.height(24.dp))
      Button(
        onClick = { viewModel.deleteAccount() },
        enabled = !viewModel.deletingAccount,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE14050)),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.deletingAccount) {
          CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("I Understand", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Monospace)
        }
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text(
        "Cancel",
        color = APP_TEXT_COLOR,
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold,
        fontFamily = FontFamily.Monospace,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onDismiss)
      )
    }
  }
}

@Composable
private fun AccountSettingsRow(
  icon: ImageVector? = null,
  painter: androidx.compose.ui.graphics.painter.Painter? = null,
  title: String,
  description: String,
  onClick: () -> Unit
) {
  Column(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(16.dp))
      .background(Color(0xFFF4F4F4))
      .clickable(onClick = onClick)
      .padding(16.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      if (painter != null) {
        Icon(painter, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
      } else if (icon != null) {
        Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(22.dp))
      }
      Spacer(modifier = Modifier.width(14.dp))
      Text(title, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
      Icon(Icons.Filled.ArrowForwardIos, contentDescription = null, tint = Color.Black.copy(alpha = 0.45f), modifier = Modifier.size(14.dp))
    }
    Spacer(modifier = Modifier.height(10.dp))
    Text(description, color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.5.sp, lineHeight = 18.sp)
  }
}

private fun derivedUid(id: String): String =
  (kotlin.math.abs(id.hashCode().toLong()) % 100_000_000L).toString().padStart(8, '0')

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwitchAccountScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeSwitchAccount() }
  var showCreateDialog by remember { mutableStateOf(false) }
  var moreSheetTarget by remember { mutableStateOf<ApiSubaccount?>(null) }
  LaunchedEffect(Unit) { viewModel.loadSubaccounts() }

  val mainUid = remember(viewModel.userId) { derivedUid(viewModel.userId.orEmpty()) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .padding(horizontal = 16.dp)
      .verticalScroll(rememberScrollState())
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(top = 26.dp, bottom = 20.dp)) {
      Text(
        "Subaccount",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeSwitchAccount() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Text("Main Account", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 13.sp)
    Spacer(modifier = Modifier.height(8.dp))
    SwitchAccountRow(
      name = (viewModel.userName ?: "You").uppercase(),
      uid = mainUid,
      selected = viewModel.activeSubaccountId == null,
      onClick = { if (viewModel.activeSubaccountId != null) viewModel.switchToMainAccount() }
    ) { tint ->
      if (viewModel.userImage != null) {
        AsyncImage(model = viewModel.userImage, contentDescription = null, modifier = Modifier.size(40.dp).clip(CircleShape))
      } else {
        Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = tint, modifier = Modifier.size(40.dp))
      }
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Everything subaccount-related (rules, create, list) grouped together
    // below Main Account, instead of the Create button sitting between the
    // two sections.
    Text("Subaccounts", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 13.sp)
    Spacer(modifier = Modifier.height(8.dp))
    Text(
      "You can create up to 5 subaccounts. Each one has its own separate chat history.",
      color = APP_TEXT_COLOR.copy(alpha = 0.4f),
      fontSize = 12.sp,
      lineHeight = 16.sp,
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(12.dp))
        .background(Color.Black.copy(alpha = 0.05f))
        .padding(12.dp)
    )
    Spacer(modifier = Modifier.height(12.dp))

    Box(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(50))
        .background(Color.Black)
        .clickable {
          if (viewModel.subaccounts.size >= 5) return@clickable
          showCreateDialog = true
        }
        .padding(vertical = 14.dp),
      contentAlignment = Alignment.Center
    ) {
      Text("Create Subaccount", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(modifier = Modifier.height(16.dp))

    if (viewModel.loadingSubaccounts && viewModel.subaccounts.isEmpty()) {
      Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(22.dp))
      }
    } else if (viewModel.subaccounts.isEmpty()) {
      Text(
        "You haven't created any subaccounts yet.",
        color = APP_TEXT_COLOR.copy(alpha = 0.4f),
        fontSize = 13.sp,
        modifier = Modifier.padding(vertical = 16.dp)
      )
    } else {
      Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        viewModel.subaccounts.forEach { sub ->
          SwitchAccountRow(
            name = sub.name.uppercase(),
            uid = derivedUid(sub.id),
            selected = viewModel.activeSubaccountId == sub.id,
            onClick = { viewModel.switchToSubaccount(sub) },
            onMore = { moreSheetTarget = sub }
          ) { tint ->
            val preset = AVATAR_PRESETS.find { it.id == sub.avatarPresetId }
            if (preset != null) {
              AvatarPresetThumbnail(preset, 40.dp, name = null)
            } else {
              Box(
                modifier = Modifier.size(40.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
              ) {
                Text(sub.name.take(1).uppercase(), color = tint, fontSize = 15.sp, fontWeight = FontWeight.Bold)
              }
            }
          }
        }
      }
    }

    viewModel.subaccountError?.let {
      Spacer(modifier = Modifier.height(8.dp))
      Text(it, color = APP_TEXT_COLOR, fontSize = 12.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))
  }

  if (showCreateDialog) {
    var nameInput by remember { mutableStateOf("") }
    AlertDialog(
      onDismissRequest = { showCreateDialog = false },
      title = { Text("Create Subaccount") },
      text = {
        OutlinedTextField(
          value = nameInput,
          onValueChange = { nameInput = it },
          singleLine = true,
          placeholder = { Text("Name") },
          shape = RoundedCornerShape(12.dp)
        )
      },
      confirmButton = {
        TextButton(onClick = {
          viewModel.createSubaccount(nameInput)
          showCreateDialog = false
        }) { Text("Create", fontWeight = FontWeight.Bold) }
      },
      dismissButton = {
        TextButton(onClick = { showCreateDialog = false }) { Text("Cancel") }
      }
    )
  }

  val moreTarget = moreSheetTarget
  if (moreTarget != null) {
    ModalBottomSheet(onDismissRequest = { moreSheetTarget = null }, containerColor = APP_BACKGROUND) {
      Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
          Text("More", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
          IconButton(onClick = { moreSheetTarget = null }, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.Black)
          }
        }
        SubaccountMoreRow("Settings") {
          moreSheetTarget = null
          viewModel.openSubaccountSettings(moreTarget)
        }
        SubaccountMoreRow("Account Switch") {
          moreSheetTarget = null
          viewModel.switchToSubaccount(moreTarget)
        }
      }
    }
  }
}

@Composable
private fun SwitchAccountRow(
  name: String,
  uid: String,
  selected: Boolean,
  onClick: () -> Unit,
  onMore: (() -> Unit)? = null,
  avatar: @Composable (Color) -> Unit
) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .background(Color.Black.copy(alpha = 0.06f))
      .border(
        if (selected) 1.5.dp else 0.dp,
        if (selected) Color.Black else Color.Transparent,
        RoundedCornerShape(14.dp)
      )
      .clickable(onClick = onClick)
      .padding(14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    avatar(Color.Black.copy(alpha = 0.7f))
    Spacer(modifier = Modifier.width(12.dp))
    Column(modifier = Modifier.weight(1f)) {
      Text(name, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      Text("UID: $uid", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 12.sp)
    }
    if (selected) {
      Icon(Icons.Filled.Check, contentDescription = "Active", tint = Color.Black, modifier = Modifier.size(20.dp))
    }
    if (onMore != null) {
      IconButton(onClick = onMore, modifier = Modifier.size(28.dp)) {
        Icon(Icons.Outlined.MoreHoriz, contentDescription = "More", tint = Color.Black.copy(alpha = 0.5f), modifier = Modifier.size(20.dp))
      }
    }
  }
}

@Composable
private fun SubaccountMoreRow(label: String, onClick: () -> Unit) {
  Row(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(label, color = APP_TEXT_COLOR, fontSize = 16.sp, modifier = Modifier.weight(1f))
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
  }
}

// Reached via SwitchAccountScreen's "More > Settings" -- only real, backed
// actions: rename (PATCH /api/subaccounts/[id]) and delete. No Freeze/
// Login Management/Forced Log Out rows -- those are Bybit-specific
// security features with no ChatGiZa equivalent, and this app doesn't
// ship fake toggles that don't do anything.
@Composable
private fun SubaccountSettingsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeSubaccountSettings() }
  val sub = viewModel.subaccountSettingsTarget
  var showRename by remember { mutableStateOf(false) }
  var renameText by remember(sub?.name) { mutableStateOf(sub?.name ?: "") }
  var confirmDelete by remember { mutableStateOf(false) }

  if (sub == null) {
    LaunchedEffect(Unit) { viewModel.closeSubaccountSettings() }
    return
  }

  Column(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND).statusBarsPadding()) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        sub.name,
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeSubaccountSettings() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { renameText = sub.name; showRename = true }
          .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Nickname", color = APP_TEXT_COLOR, fontSize = 16.sp, modifier = Modifier.weight(1f))
        Text(sub.name, color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 14.sp)
        Spacer(Modifier.width(6.dp))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
      }
      HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { confirmDelete = true }
          .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Delete Subaccount", color = APP_TEXT_COLOR, fontSize = 16.sp, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
      }
    }
  }

  if (showRename) {
    AlertDialog(
      onDismissRequest = { showRename = false },
      title = { Text("Nickname") },
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
          viewModel.renameSubaccount(sub.id, renameText)
          showRename = false
        }) { Text("Save", fontWeight = FontWeight.Bold) }
      },
      dismissButton = {
        TextButton(onClick = { showRename = false }) { Text("Cancel") }
      }
    )
  }

  if (confirmDelete) {
    ConfirmDangerDialog(
      title = "Delete ${sub.name}?",
      message = "This removes the subaccount and its separate chat history. This can't be undone.",
      onConfirm = {
        viewModel.deleteSubaccount(sub.id)
        viewModel.closeSubaccountSettings()
      },
      onDismiss = { confirmDelete = false }
    )
  }
}

@Composable
private fun DashboardStatTile(label: String, value: String, modifier: Modifier = Modifier) {
  Column(
    modifier = modifier
      .clip(RoundedCornerShape(12.dp))
      .background(Color.Black.copy(alpha = 0.06f))
      .padding(12.dp)
  ) {
    Text(value, color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
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
          .background(Color.Black.copy(alpha = 0.06f))
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
      Text("Manage your data", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 10.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clickable { viewModel.openDataControls() },
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text("Data controls & delete account", color = APP_TEXT_COLOR, fontSize = 14.sp, modifier = Modifier.weight(1f))
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
    Text(value, color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
  }
}

private val CLOUD_STORAGE_FILTERS = listOf("All", "Images", "Videos", "Documents", "Audio")
private val CLOUD_STORAGE_SORTS = listOf("Last used", "Date created", "Name", "Size")

@Composable
private fun CloudStorageFilterMenuItem(label: String, selected: Boolean, onClick: () -> Unit) {
  DropdownMenuItem(
    text = {
      Text(label, color = APP_TEXT_COLOR, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, fontSize = 15.sp)
    },
    leadingIcon = {
      if (selected) {
        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
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
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(28.dp))
      }
      Spacer(modifier = Modifier.width(20.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text("0 B", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
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
          FilterIconCustom(tint = Color.Black, modifier = Modifier.size(24.dp))
        }
        DropdownMenu(
          expanded = filterMenuOpen,
          onDismissRequest = { filterMenuOpen = false },
          modifier = Modifier.background(Color.White)
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
          HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.1f))
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
      .background(Color.White)
      .padding(16.dp)
  ) {
    Column {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
          modifier = Modifier.size(28.dp).clip(CircleShape).background(Color.Black),
          contentAlignment = Alignment.Center
        ) {
          Text("G", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text("ChatGiZa", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
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
      .background(Color.Black.copy(alpha = 0.08f))
      .padding(vertical = 10.dp),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
    Spacer(modifier = Modifier.height(4.dp))
    Text(label, color = APP_TEXT_COLOR.copy(alpha = 0.8f), fontSize = 11.sp)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WidgetsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeWidgets() }
  var showBottomSheet by remember { mutableStateOf(false) }
  var addedMessage by remember { mutableStateOf(false) }

  Scaffold(
    containerColor = APP_BACKGROUND,
    topBar = {
      TopAppBar(
        title = { Text("Widget") },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeWidgets() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = APP_BACKGROUND)
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
        colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
      ) {
        WidgetMockPreview(
          modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp)
            .height(140.dp)
        )

        Text(
          text = "Get quick access to chat, imagine and voice with ChatGiZa",
          color = APP_TEXT_COLOR,
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
        colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
      ) {
        Row(
          modifier = Modifier.padding(20.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Outlined.AddBox, contentDescription = null, tint = Color.Black)
          Spacer(modifier = Modifier.width(16.dp))
          Text("Add Widget", color = APP_TEXT_COLOR, fontSize = 20.sp, fontWeight = FontWeight.Bold)
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
      containerColor = APP_BACKGROUND
    ) {
      Text(
        "Add to Desktop",
        color = APP_TEXT_COLOR,
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(24.dp)
      )

      Text(
        "ChatGiZa",
        color = APP_TEXT_COLOR,
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
    containerColor = APP_BACKGROUND,
    topBar = {
      TopAppBar(
        title = { Text("Open Source Licenses") },
        navigationIcon = {
          IconButton(onClick = { viewModel.closeOpenSourceLicenses() }) {
            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = APP_BACKGROUND)
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
          colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Text(entry.name, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(entry.license, color = Color(0xFFA8A8A8), fontSize = 13.sp)
          }
        }
      }
    }
  }
}

// Reached when another app shares a file or text to ChatGiZa (system Share
// sheet -> MainActivity's ACTION_SEND handling -> viewModel.pendingShare).
// Lets the user pick which existing conversation it lands in, instead of it
// silently dropping into whatever chat happened to be open or always
// starting a fresh one -- same as any real chat app's share target.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ShareTargetPickerScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.cancelPendingShare() }
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val share = viewModel.pendingShare
  var working by remember { mutableStateOf(false) }

  fun openInto(conversationId: String?) {
    if (working) return
    working = true
    scope.launch {
      var decodedImageUri: Uri? = null
      var decodedImageDataUrl: String? = null
      var decodedFile: AttachedFile? = null
      var attachFailed = false

      val uri = share?.uri
      if (uri != null) {
        val mime = context.contentResolver.getType(uri).orEmpty()
        if (mime.startsWith("image/")) {
          decodedImageDataUrl = withContext(Dispatchers.IO) { uriToPostImageDataUrl(context, uri) }
          if (decodedImageDataUrl != null) decodedImageUri = uri else attachFailed = true
        } else {
          val name = withContext(Dispatchers.IO) { queryFileDisplayName(context, uri) }
          decodedFile = withContext(Dispatchers.IO) { readAttachedFile(context, uri, name) }
          if (decodedFile == null) attachFailed = true
        }
      }

      // Navigate first -- selectConversation/newChat don't touch the input
      // text or attached-image/file state, but newChat() does reset `input`
      // to "", so the shared text has to be set after, not before.
      if (conversationId != null) viewModel.selectConversation(conversationId) else viewModel.newChat()

      val text = share?.text
      if (!text.isNullOrBlank()) viewModel.onInputChange(text)
      val finalImageUri = decodedImageUri
      val finalImageDataUrl = decodedImageDataUrl
      if (finalImageUri != null && finalImageDataUrl != null) viewModel.setAttachedImage(finalImageUri, finalImageDataUrl)
      decodedFile?.let { viewModel.updateAttachedFile(it) }

      viewModel.clearPendingShare()
      working = false
      if (attachFailed) Toast.makeText(context, "Couldn't attach that file", Toast.LENGTH_SHORT).show()
    }
  }

  Scaffold(
    containerColor = APP_BACKGROUND,
    topBar = {
      TopAppBar(
        title = { Text("Open in which conversation?") },
        navigationIcon = {
          IconButton(onClick = { viewModel.cancelPendingShare() }) {
            Icon(Icons.Outlined.Close, contentDescription = "Cancel", tint = Color.Black)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = APP_BACKGROUND)
      )
    }
  ) { padding ->
    Box(modifier = Modifier.fillMaxSize().padding(padding)) {
      LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        item {
          Card(
            modifier = Modifier.fillMaxWidth().clickable { openInto(null) },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
          ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
              Icon(Icons.Filled.Add, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
              Spacer(modifier = Modifier.width(12.dp))
              Text("New chat", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
          }
        }
        items(viewModel.conversations, key = { it.id }) { convo ->
          Card(
            modifier = Modifier.fillMaxWidth().clickable { openInto(convo.id) },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
          ) {
            Text(
              convo.title.ifBlank { "Untitled" },
              color = APP_TEXT_COLOR,
              fontSize = 15.sp,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis,
              modifier = Modifier.padding(16.dp)
            )
          }
        }
      }
      if (working) {
        Box(
          modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.4f)),
          contentAlignment = Alignment.Center
        ) {
          CircularProgressIndicator(color = APP_TEXT_COLOR)
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
    colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(imageVector = icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(30.dp))
      Spacer(Modifier.width(18.dp))
      Text(text = title, color = APP_TEXT_COLOR, fontSize = 20.sp, fontWeight = FontWeight.Bold)
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
    colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
  ) {
    Row(
      modifier = Modifier.padding(20.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = title,
        color = if (enabled) Color.Black else Color.Black.copy(alpha = 0.4f),
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
      .background(APP_BACKGROUND)
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeHaptics() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Haptics", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
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
      .background(APP_BACKGROUND)
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeKidsMode() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Kids Mode", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
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
      .background(APP_BACKGROUND)
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeSharedConversations() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Collaborative Chat", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
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
        .background(Color.Black)
        .clickable { viewModel.startCollabSession() }
        .padding(vertical = 16.dp),
      contentAlignment = Alignment.Center
    ) {
      Text("Start a Collaborative Chat", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(Modifier.height(28.dp))
    Text("Join with a code", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(10.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
      OutlinedTextField(
        value = viewModel.collabJoinCodeInput,
        onValueChange = { viewModel.onCollabJoinCodeChange(it) },
        modifier = Modifier.weight(1f),
        placeholder = { Text("ABC123", color = APP_TEXT_COLOR.copy(alpha = 0.35f)) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.Black,
          unfocusedTextColor = Color.Black,
          focusedBorderColor = Color.Black.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
          cursorColor = Color.Black
        )
      )
      Spacer(Modifier.width(10.dp))
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(12.dp))
          .background(if (viewModel.collabJoinCodeInput.length >= 4) Color.Black else Color.Black.copy(alpha = 0.15f))
          .clickable(enabled = viewModel.collabJoinCodeInput.length >= 4) { viewModel.joinCollabSession() }
          .padding(horizontal = 20.dp, vertical = 14.dp)
      ) {
        Text(
          "Join",
          color = if (viewModel.collabJoinCodeInput.length >= 4) Color.White else Color.Black.copy(alpha = 0.4f),
          fontSize = 14.sp,
          fontWeight = FontWeight.Bold
        )
      }
    }

    val error = viewModel.collabError
    if (error != null) {
      Spacer(Modifier.height(10.dp))
      Text(error, color = APP_TEXT_COLOR, fontSize = 12.sp)
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

  Column(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND).statusBarsPadding()) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeCollabChat() }, modifier = Modifier.size(32.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(12.dp))
      Column(modifier = Modifier.weight(1f)) {
        Text("Collaborative Chat", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        if (session != null) {
          Text(
            "${session.participants.size} in this chat",
            color = APP_TEXT_COLOR.copy(alpha = 0.5f),
            fontSize = 12.sp
          )
        }
      }
      if (session != null) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.1f))
            .clickable {
              clipboard.setText(AnnotatedString(session.code))
              Toast.makeText(context, "Code copied", Toast.LENGTH_SHORT).show()
            }
            .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
          Text(session.code, color = APP_TEXT_COLOR, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
          Spacer(Modifier.width(6.dp))
          Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy), contentDescription = "Copy code", tint = Color.Black.copy(alpha = 0.6f), modifier = Modifier.size(14.dp))
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
            color = APP_TEXT_COLOR.copy(alpha = 0.5f),
            fontSize = 11.sp,
            modifier = Modifier
              .clip(RoundedCornerShape(50))
              .background(Color.Black.copy(alpha = 0.06f))
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
              color = APP_TEXT_COLOR.copy(alpha = 0.4f),
              fontSize = 11.sp,
              modifier = Modifier.padding(bottom = 2.dp, end = 4.dp)
            )
            Box(
              modifier = Modifier
                .clip(RoundedCornerShape(18.dp))
                .background(colorScheme.onBackground.copy(alpha = 0.1f))
                .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
              Text(msg.content, color = APP_TEXT_COLOR, fontSize = 15.sp)
            }
          }
        } else {
          Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp)) {
            MarkdownText(text = msg.content, baseColor = Color.Black, fontSize = 15.sp)
          }
        }
      }
      if (viewModel.collabSending) {
        item {
          Text("GiZa is replying…", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp)
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
        placeholder = { Text("Message the group…", color = APP_TEXT_COLOR.copy(alpha = 0.35f)) },
        shape = RoundedCornerShape(20.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.Black,
          unfocusedTextColor = Color.Black,
          focusedBorderColor = Color.Black.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
          cursorColor = Color.Black
        )
      )
      Spacer(Modifier.width(8.dp))
      Box(
        modifier = Modifier
          .size(44.dp)
          .clip(CircleShape)
          .background(if (viewModel.collabInput.isNotBlank() && !viewModel.collabSending) Color.Black else Color.Black.copy(alpha = 0.15f))
          .clickable(enabled = viewModel.collabInput.isNotBlank() && !viewModel.collabSending) { viewModel.sendCollabMessage() },
        contentAlignment = Alignment.Center
      ) {
        Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(18.dp))
      }
    }
  }
}

// One global room every ChatGiZa user lands in via "Join Our Community"
// -- unlike CollabChatScreen there's no join code or AI reply, just a
// shared human group chat everyone polls the same message list for.
@Composable
private fun CommunityScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeCommunity() }
  val listState = rememberLazyListState()
  val myName = viewModel.userName?.takeIf { it.isNotBlank() } ?: "Someone"

  LaunchedEffect(viewModel.communityMessages.size) {
    val count = viewModel.communityMessages.size
    if (count > 0) listState.animateScrollToItem(count - 1)
  }

  Column(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND).statusBarsPadding()) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = { viewModel.closeCommunity() }, modifier = Modifier.size(32.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(12.dp))
      Text("ChatGiZa Community", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    }

    LazyColumn(
      state = listState,
      modifier = Modifier.weight(1f).fillMaxWidth(),
      contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
      items(viewModel.communityMessages, key = { it.id }) { msg ->
        val isMe = msg.authorName == myName
        Column(
          horizontalAlignment = if (isMe) Alignment.End else Alignment.Start,
          modifier = Modifier.fillMaxWidth()
        ) {
          Text(
            if (isMe) "You" else msg.authorName,
            color = APP_TEXT_COLOR.copy(alpha = 0.4f),
            fontSize = 11.sp,
            modifier = Modifier.padding(start = 4.dp, end = 4.dp, bottom = 2.dp)
          )
          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(18.dp))
              .background(if (isMe) colorScheme.onBackground.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.06f))
              .padding(horizontal = 14.dp, vertical = 10.dp)
          ) {
            Text(msg.content, color = APP_TEXT_COLOR, fontSize = 15.sp)
          }
        }
      }
    }

    val error = viewModel.communityError
    if (error != null) {
      Text(error, color = APP_TEXT_COLOR, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 16.dp))
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
        value = viewModel.communityInput,
        onValueChange = { viewModel.onCommunityInputChange(it) },
        modifier = Modifier.weight(1f),
        placeholder = { Text("Message the community…", color = APP_TEXT_COLOR.copy(alpha = 0.35f)) },
        shape = RoundedCornerShape(20.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedTextColor = Color.Black,
          unfocusedTextColor = Color.Black,
          focusedBorderColor = Color.Black.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
          cursorColor = Color.Black
        )
      )
      Spacer(Modifier.width(8.dp))
      Box(
        modifier = Modifier
          .size(44.dp)
          .clip(CircleShape)
          .background(if (viewModel.communityInput.isNotBlank() && !viewModel.communitySending) Color.Black else Color.Black.copy(alpha = 0.15f))
          .clickable(enabled = viewModel.communityInput.isNotBlank() && !viewModel.communitySending) { viewModel.sendCommunityMessage() },
        contentAlignment = Alignment.Center
      ) {
        Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(18.dp))
      }
    }
  }
}

private fun formatSessionTime(epochMillis: Long): String {
  val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US)
  sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
  return "${sdf.format(java.util.Date(epochMillis))} +0000 UTC"
}

// Real Security > Trusted Devices list, replacing what used to be a
// "coming soon" row -- backed by src/lib/sessions.ts, which every web
// and native sign-in now writes an entry into (see ChatGizaApi.mobileAuth
// and src/auth.ts). Deleting a row here calls /api/sessions/revoke,
// which also kills that device's live token/cookie server-side, not
// just this list.
@Composable
private fun TrustedDevicesScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeTrustedDevices() }
  var confirmRevoke by remember { mutableStateOf<DeviceSession?>(null) }

  Column(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND).statusBarsPadding()) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Trusted Devices",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeTrustedDevices() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Text(
      "These devices have been authorized to allow logging into your account.",
      color = APP_TEXT_COLOR.copy(alpha = 0.5f),
      fontSize = 13.sp,
      modifier = Modifier.padding(horizontal = 16.dp)
    )
    Spacer(Modifier.height(8.dp))
    HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))

    val error = viewModel.trustedDevicesError
    if (error != null) {
      Text(error, color = APP_TEXT_COLOR, fontSize = 12.sp, modifier = Modifier.padding(16.dp))
    }

    if (viewModel.trustedDevicesLoading && viewModel.trustedDevices.isEmpty()) {
      Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(28.dp))
      }
    } else if (viewModel.trustedDevices.isEmpty()) {
      Text(
        "No sign-ins recorded yet.",
        color = APP_TEXT_COLOR.copy(alpha = 0.4f),
        fontSize = 13.sp,
        modifier = Modifier.padding(16.dp)
      )
    } else {
      LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
      ) {
        items(viewModel.trustedDevices, key = { it.id }) { device ->
          val isCurrent = device.id == viewModel.trustedDevicesCurrentId
          Column(modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              if (device.platform == "mobile") {
                Icon(
                  painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mobile_outline),
                  contentDescription = null,
                  tint = Color.Black.copy(alpha = 0.8f),
                  modifier = Modifier.size(20.dp)
                )
              } else {
                Icon(
                  painter = androidx.compose.ui.res.painterResource(R.drawable.ic_monitor_outline),
                  contentDescription = null,
                  tint = Color.Black.copy(alpha = 0.8f),
                  modifier = Modifier.size(20.dp)
                )
              }
              Spacer(Modifier.width(10.dp))
              Text(device.device, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Normal, modifier = Modifier.weight(1f))
              if (isCurrent) {
                Text(
                  "This device",
                  color = APP_TEXT_COLOR.copy(alpha = 0.4f),
                  fontSize = 11.sp,
                  modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color.Black.copy(alpha = 0.08f))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
                )
              } else if (viewModel.isRevokingDevice(device.id)) {
                CircularProgressIndicator(color = APP_TEXT_COLOR.copy(alpha = 0.6f), modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
              } else {
                IconButton(onClick = { confirmRevoke = device }, modifier = Modifier.size(32.dp)) {
                  DeleteIcon(tint = Color.Black.copy(alpha = 0.5f))
                }
              }
            }
            Spacer(Modifier.height(6.dp))
            Text("Time: ${formatSessionTime(device.signedInAt)}", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 11.sp)
            Text("Login Location: ${device.location}", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 11.sp)
            Text("IP Address: ${device.ip}", color = APP_TEXT_COLOR.copy(alpha = 0.3f), fontSize = 11.sp)
          }
          HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.06f))
        }
      }
    }
  }

  val target = confirmRevoke
  if (target != null) {
    AlertDialog(
      onDismissRequest = { confirmRevoke = null },
      title = { Text("Remove this device?") },
      text = { Text("${target.device} will be signed out and will need to sign in again.") },
      confirmButton = {
        TextButton(onClick = {
          viewModel.revokeTrustedDevice(target.id)
          confirmRevoke = null
        }) {
          Text("Remove", color = APP_TEXT_COLOR, fontWeight = FontWeight.Bold)
        }
      },
      dismissButton = {
        TextButton(onClick = { confirmRevoke = null }) { Text("Cancel") }
      }
    )
  }
}

private fun dirSizeBytes(dir: java.io.File?): Long {
  if (dir == null || !dir.exists()) return 0L
  var total = 0L
  dir.listFiles()?.forEach { f ->
    total += if (f.isDirectory) dirSizeBytes(f) else f.length()
  }
  return total
}

private fun formatStorageBytes(bytes: Long): String {
  if (bytes < 1024) return "$bytes B"
  val units = arrayOf("KB", "MB", "GB")
  var value = bytes / 1024.0
  var unitIndex = 0
  while (value >= 1024 && unitIndex < units.size - 1) {
    value /= 1024
    unitIndex++
  }
  return String.format(java.util.Locale.US, "%.2f %s", value, units[unitIndex])
}

// Real on-device storage breakdown -- cache/data sizes come from actually
// walking context.cacheDir/filesDir, and the used/free split comes from
// StatFs on the data partition, not placeholder numbers. Only "Cache" is
// offered for clearing; filesDir holds things the app needs to keep
// working (TokenStore's encrypted prefs live outside both dirs entirely,
// under shared_prefs, so clearing cache can never sign the user out).
@Composable
private fun StorageManagementScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeStorageManagement() }
  val context = LocalContext.current
  var confirmClearCache by remember { mutableStateOf(false) }
  var refreshTick by remember { mutableStateOf(0) }

  val cacheBytes = remember(refreshTick) { dirSizeBytes(context.cacheDir) }
  val filesBytes = remember(refreshTick) { dirSizeBytes(context.filesDir) }
  val appBytes = cacheBytes + filesBytes

  val statFs = remember { android.os.StatFs(android.os.Environment.getDataDirectory().path) }
  val totalDeviceBytes = statFs.totalBytes
  val freeDeviceBytes = statFs.availableBytes
  val otherUsedBytes = (totalDeviceBytes - freeDeviceBytes - appBytes).coerceAtLeast(0L)
  val percentOfDevice = if (totalDeviceBytes > 0) (appBytes.toDouble() / totalDeviceBytes.toDouble() * 100) else 0.0

  Column(modifier = Modifier.fillMaxSize().background(APP_BACKGROUND).statusBarsPadding()) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Storage management",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeStorageManagement() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      val total = totalDeviceBytes.toFloat().coerceAtLeast(1f)
      val appFraction = (appBytes / total).coerceIn(0f, 1f)
      val otherFraction = (otherUsedBytes / total).coerceIn(0f, 1f)
      val freeFraction = (freeDeviceBytes / total).coerceIn(0f, 1f)
      Spacer(Modifier.height(22.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .height(18.dp)
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.1f))
      ) {
        // weight(0f) throws, so zero-sized segments are skipped entirely
        // rather than coerced to a fake minimum width.
        if (appFraction > 0f) Box(modifier = Modifier.weight(appFraction).fillMaxHeight().background(Color.Black))
        if (otherFraction > 0f) Box(modifier = Modifier.weight(otherFraction).fillMaxHeight().background(Color.Black))
        if (freeFraction > 0f) Box(modifier = Modifier.weight(freeFraction).fillMaxHeight().background(Color.Transparent))
      }
      Spacer(Modifier.height(10.dp))
      Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.Black))
        Spacer(Modifier.width(6.dp))
        Text("ChatGiZa used", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 12.sp)
        Spacer(Modifier.width(14.dp))
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.Black))
        Spacer(Modifier.width(6.dp))
        Text("Other Apps used", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 12.sp)
        Spacer(Modifier.width(14.dp))
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.25f)))
        Spacer(Modifier.width(6.dp))
        Text("Remaining", color = APP_TEXT_COLOR.copy(alpha = 0.6f), fontSize = 12.sp)
      }
      Spacer(Modifier.height(14.dp))
      Text(
        "ChatGiZa currently uses ${formatStorageBytes(appBytes)}, accounting for ${String.format(java.util.Locale.US, "%.2f", percentOfDevice)}% of your device's storage.",
        color = APP_TEXT_COLOR.copy(alpha = 0.5f),
        fontSize = 13.sp
      )
    }

    Spacer(Modifier.height(20.dp))
    HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(Color.Black.copy(alpha = 0.05f))
          .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column(modifier = Modifier.weight(1f)) {
          Text("Cache", color = APP_TEXT_COLOR, fontSize = 14.sp)
          Spacer(Modifier.height(4.dp))
          Text(formatStorageBytes(cacheBytes), color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
          Spacer(Modifier.height(4.dp))
          Text(
            "Clearing Cache will not affect the normal use of ChatGiZa",
            color = APP_TEXT_COLOR.copy(alpha = 0.4f),
            fontSize = 12.sp,
            lineHeight = 16.sp
          )
        }
        IconButton(onClick = { confirmClearCache = true }, modifier = Modifier.size(32.dp)) {
          DeleteIcon(tint = Color.Black.copy(alpha = 0.5f))
        }
      }

      Spacer(Modifier.height(14.dp))

      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(Color.Black.copy(alpha = 0.05f))
          .padding(16.dp)
      ) {
        Text("Important files", color = APP_TEXT_COLOR, fontSize = 14.sp)
        Spacer(Modifier.height(4.dp))
        Text(formatStorageBytes(filesBytes), color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(
          "Includes data ChatGiZa needs to work -- not clearable here.",
          color = APP_TEXT_COLOR.copy(alpha = 0.4f),
          fontSize = 12.sp,
          lineHeight = 16.sp
        )
      }
    }
  }

  if (confirmClearCache) {
    ConfirmDangerDialog(
      title = "Clear cache?",
      message = "This frees up ${formatStorageBytes(cacheBytes)} of temporary files. It won't sign you out or delete your conversations.",
      onConfirm = {
        runCatching { context.cacheDir.deleteRecursively() }
        refreshTick++
      },
      onDismiss = { confirmClearCache = false }
    )
  }
}

// Two steps -- "old" (skipped entirely for accounts that have never set a
// password) then "new" -- rather than one screen with two fields, so the
// current-password check can fail and bounce the user back without also
// discarding whatever they'd already typed as the new one.
@Composable
private fun ChangePasswordScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeChangePassword() }
  val focusManager = LocalFocusManager.current
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      // Tapping the field itself opens the keyboard as usual; tapping
      // anywhere else on the screen dismisses it, same as a chat box --
      // clearFocus() on the field is what actually closes the IME.
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Change Password",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeChangePassword() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    // Used to block the whole screen behind a spinner until the
    // hasPassword status fetch resolved. The form now renders immediately
    // (defaulting to the "old" step -- openChangePassword() already sets
    // that) instead of making every open wait on a network round trip; if
    // the fetch later reveals there's no password set yet, passwordStep
    // just flips to "new" underneath the user with no visible loading
    // state, and a failed fetch surfaces via the same inline passwordError
    // text as any other validation error instead of a full-screen retry.
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFFFF3E5))
          .padding(12.dp)
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(16.dp).padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          when (viewModel.passwordStep) {
            "old" -> "Note: For your account's security, you're allowed to change this password as often as you need to. Changing it here only affects ChatGiZa -- it won't touch your Google sign-in, and you may be asked to sign in again on your other devices afterward. Enter your current ChatGiZa password to continue."
            "new" -> "Note: This password is separate from your Google sign-in and is only ever used inside ChatGiZa. You're free to change it again at any time from Security settings. Choose one that's at least 8 characters long."
            else -> "Note: For your account's security, we've sent a 6-digit verification code to the email on this account. Enter it below to finish confirming this change -- the code expires in 10 minutes."
          },
          color = APP_TEXT_COLOR,
          fontSize = 10.sp,
          lineHeight = 14.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      val hasContent = when (viewModel.passwordStep) {
        "old" -> viewModel.oldPasswordInput.isNotEmpty()
        "new" -> viewModel.newPasswordInput.isNotEmpty()
        else -> viewModel.passwordCodeInput.isNotEmpty()
      }

      when (viewModel.passwordStep) {
        // Same minLength = 6 hint as New Password -- passwords are always
        // 6-16 characters, so anything shorter can't be complete yet. This
        // doesn't assert the password is wrong, just incomplete; the real
        // check against the stored password still happens on Confirm.
        "old" -> PasswordField(
          value = viewModel.oldPasswordInput,
          onValueChange = viewModel::onOldPasswordInputChange,
          placeholder = "Current password",
          minLength = 6,
          onFocusLost = viewModel::checkOldPasswordOnBlur,
          onFocusGained = viewModel::clearPasswordError
        )
        "new" -> PasswordField(
          value = viewModel.newPasswordInput,
          onValueChange = viewModel::onNewPasswordInputChange,
          placeholder = "New password",
          maxLength = 16,
          minLength = 6,
          onFocusLost = viewModel::checkNewPasswordOnBlur,
          onFocusGained = viewModel::clearPasswordError
        )
        else -> CodeField(
          value = viewModel.passwordCodeInput,
          onValueChange = viewModel::onPasswordCodeInputChange
        )
      }

      if (viewModel.passwordError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.passwordError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(24.dp))

      // Pale until there's something to submit, full color once there is --
      // enabled itself stays true either way so tapping while empty still
      // surfaces the "enter your password" validation message instead of
      // just doing nothing.
      Button(
        onClick = {
          when (viewModel.passwordStep) {
            "old" -> viewModel.confirmOldPassword()
            "new" -> viewModel.submitNewPassword()
            else -> viewModel.submitPasswordCode()
          }
        },
        enabled = !viewModel.changingPassword,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = if (hasContent) Color(0xFFFF9C2D) else Color(0xFFFF9C2D).copy(alpha = 0.35f),
          disabledContainerColor = Color(0xFFFF9C2D)
        ),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.changingPassword) {
          CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Confirm", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Security > Mobile. Just one field and a Save -- no OTP step, since
// there's no SMS provider wired up to actually verify the number belongs
// to whoever's typing it (same trust level as the in-app password: a
// self-reported value, not proof of ownership).
@Composable
private fun MobileNumberScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeMobileNumber() }
  val focusManager = LocalFocusManager.current
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Mobile Number",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeMobileNumber() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFFFF3E5))
          .padding(12.dp)
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(16.dp).padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          if (viewModel.userPhone.isNullOrBlank()) {
            "Note: This number is just a contact detail on your account -- it isn't used to sign in, and isn't verified by SMS."
          } else {
            "Note: Changing this number only updates the contact detail on your account -- your Google sign-in is unaffected."
          },
          color = APP_TEXT_COLOR,
          fontSize = 10.sp,
          lineHeight = 14.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
      ) {
        // Country selector -- tap opens a searchable picker; typing a
        // number that already starts with a recognized "+code" also
        // auto-switches this (see onPhoneInputChange), so picking one by
        // hand first is convenient but never required.
        Row(
          modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .clickable { viewModel.openCountryPicker() }
            .padding(horizontal = 12.dp, vertical = 15.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(viewModel.phoneCountry.flag, fontSize = 16.sp)
          Spacer(modifier = Modifier.width(6.dp))
          Text(viewModel.phoneCountry.dialCode, color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Medium)
          Spacer(modifier = Modifier.width(4.dp))
          Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "Choose country", tint = Color.Black.copy(alpha = 0.5f), modifier = Modifier.size(16.dp))
        }
        Spacer(modifier = Modifier.width(8.dp))
        Row(
          modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .padding(horizontal = 16.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
            if (viewModel.phoneInput.isEmpty()) {
              Text("Phone number", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 16.sp)
            }
            BasicTextField(
              value = viewModel.phoneInput,
              onValueChange = { new -> if (new.length <= 20) viewModel.onPhoneInputChange(new) },
              singleLine = true,
              textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
              cursorBrush = SolidColor(Color.Black),
              keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }
      }

      if (viewModel.phoneError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.phoneError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(24.dp))

      Button(
        onClick = { viewModel.submitPhoneNumber() },
        enabled = !viewModel.phoneUpdateBusy,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.phoneUpdateBusy) {
          CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Save", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }

  if (viewModel.phoneCountryPickerOpen) {
    CountryPickerSheet(
      onDismiss = { viewModel.closeCountryPicker() },
      onSelect = { viewModel.selectCountry(it) }
    )
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CountryPickerSheet(onDismiss: () -> Unit, onSelect: (CountryDialCode) -> Unit) {
  var query by remember { mutableStateOf("") }
  val filtered = remember(query) {
    if (query.isBlank()) COUNTRY_DIAL_CODES
    else COUNTRY_DIAL_CODES.filter { it.name.contains(query, ignoreCase = true) || it.dialCode.contains(query) }
  }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(modifier = Modifier.fillMaxWidth().heightIn(max = 480.dp).padding(horizontal = 16.dp)) {
      Text("Choose a country", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(12.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color.Black.copy(alpha = 0.05f))
          .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(Icons.Outlined.Search, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
          if (query.isEmpty()) {
            Text("Search country", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 15.sp)
          }
          BasicTextField(
            value = query,
            onValueChange = { query = it },
            singleLine = true,
            textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 15.sp),
            cursorBrush = SolidColor(Color.Black),
            modifier = Modifier.fillMaxWidth()
          )
        }
      }
      Spacer(modifier = Modifier.height(8.dp))
      LazyColumn(modifier = Modifier.fillMaxWidth()) {
        items(filtered, key = { it.name }) { country ->
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clickable { onSelect(country) }
              .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(country.flag, fontSize = 18.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Text(country.name, color = APP_TEXT_COLOR, fontSize = 15.sp, modifier = Modifier.weight(1f))
            Text(country.dialCode, color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 14.sp, fontFamily = FontFamily.Monospace)
          }
        }
      }
      Spacer(modifier = Modifier.height(20.dp))
    }
  }
}

// Security > Email. Same trust level as Mobile -- there's no separate
// email-sending pipeline to confirm this with, so it just updates the
// address on file directly.
@Composable
private fun ChangeEmailScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeChangeEmail() }
  val focusManager = LocalFocusManager.current
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Change Email",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeChangeEmail() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFFFF3E5))
          .padding(12.dp)
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(16.dp).padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          when (viewModel.emailStep) {
            "email" -> "Note: This updates the contact email ChatGiZa has on file -- it doesn't change your Google sign-in. We'll send a 6-digit code to the new address to confirm you can receive mail there."
            else -> "Note: We've sent a 6-digit verification code to ${viewModel.emailInput.trim()}. Enter it below to finish confirming this change -- the code expires in 10 minutes."
          },
          color = APP_TEXT_COLOR,
          fontSize = 10.sp,
          lineHeight = 14.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      if (viewModel.emailStep == "email") {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black.copy(alpha = 0.05f))
            .padding(horizontal = 16.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mail_outline),
            contentDescription = null,
            tint = Color.Black.copy(alpha = 0.4f),
            modifier = Modifier.size(20.dp)
          )
          Spacer(modifier = Modifier.width(12.dp))
          Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
            if (viewModel.emailInput.isEmpty()) {
              Text("Email address", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 16.sp)
            }
            BasicTextField(
              value = viewModel.emailInput,
              onValueChange = { new -> if (new.length <= 254) viewModel.onEmailInputChange(new) },
              singleLine = true,
              textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
              cursorBrush = SolidColor(Color.Black),
              keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Email),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }
      } else {
        CodeField(
          value = viewModel.emailCodeInput,
          onValueChange = viewModel::onEmailCodeInputChange
        )
      }

      if (viewModel.emailError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.emailError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(24.dp))

      Button(
        onClick = {
          when (viewModel.emailStep) {
            "email" -> viewModel.submitEmail()
            else -> viewModel.submitEmailCode()
          }
        },
        enabled = !viewModel.emailUpdateBusy,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.emailUpdateBusy) {
          CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text(if (viewModel.emailStep == "email") "Continue" else "Confirm", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Profile Hub > My info > Nickname -- a plain boxed field (no icon, no
// warning banner, unlike Mobile/Email) since this is just the display
// name shown across the account, same shape/black cursor as the other
// full-screen field editors.
@Composable
private fun NicknameScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeNickname() }
  val focusManager = LocalFocusManager.current
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Nickname",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeNickname() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
      Spacer(modifier = Modifier.height(20.dp))

      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color.Black.copy(alpha = 0.08f))
          .padding(horizontal = 16.dp, vertical = 18.dp)
      ) {
        if (viewModel.accountNicknameInput.isEmpty()) {
          Text("Nickname", color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 16.sp)
        }
        BasicTextField(
          value = viewModel.accountNicknameInput,
          onValueChange = { viewModel.onNicknameInputChange(it) },
          singleLine = true,
          textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
          cursorBrush = SolidColor(Color.Black),
          modifier = Modifier.fillMaxWidth()
        )
      }

      if (viewModel.nameUpdateError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.nameUpdateError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(24.dp))

      Button(
        onClick = { viewModel.submitNickname() },
        enabled = viewModel.accountNicknameInput.isNotBlank() && !viewModel.nicknameUpdateBusy,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.nicknameUpdateBusy) {
          CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Save", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Renders an otpauth:// URI as a scannable QR bitmap fully on-device --
// no backend image endpoint, no network round trip for something that's
// really just an encoding of a string the backend already returned.
@Composable
private fun rememberQrBitmap(content: String, sizePx: Int = 640): Bitmap? {
  return remember(content) {
    if (content.isEmpty()) return@remember null
    runCatching {
      val bitMatrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx)
      val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
      for (x in 0 until sizePx) {
        for (y in 0 until sizePx) {
          bmp.setPixel(x, y, if (bitMatrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
        }
      }
      bmp
    }.getOrNull()
  }
}

@Composable
private fun TwoFactorSetupScreen(viewModel: ChatViewModel) {
  val context = LocalContext.current
  val clipboard = LocalClipboardManager.current
  val focusManager = LocalFocusManager.current
  val onBack: () -> Unit = when {
    viewModel.totpEnabled == true -> viewModel::closeTwoFactorSetup
    viewModel.totpSetupSecret == null -> viewModel::closeTwoFactorSetup
    viewModel.totpSetupStep == "verify" -> viewModel::backToTotpLinkStep
    else -> viewModel::backToTotpIntro
  }
  BackHandler(onBack = onBack)
  val title = when {
    viewModel.totpEnabled == true -> "Google 2FA Authentication"
    viewModel.totpSetupSecret == null -> "Authenticator App Verification"
    viewModel.totpSetupStep == "link" -> "Link an Authenticator"
    else -> "Verify Authenticator"
  }
  // The intro step uses its own big two-line heading further down instead
  // of a small centered app-bar title -- matching the reference, where
  // only a bare back arrow sits in the top row on that screen.
  val totpIntroStep = viewModel.totpEnabled != true && viewModel.totpSetupSecret == null
  val totpLinkStep = viewModel.totpEnabled != true && viewModel.totpSetupSecret != null && viewModel.totpSetupStep == "link"
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .pointerInput(Unit) {
        detectTapGestures(onTap = { focusManager.clearFocus() })
      }
  ) {
    if (totpIntroStep) {
      IconButton(onClick = onBack, modifier = Modifier.padding(start = 12.dp, top = 6.dp).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    } else {
      Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
        Text(
          title,
          color = APP_TEXT_COLOR,
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold,
          modifier = Modifier.align(Alignment.Center)
        )
        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
          Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
        }
      }
    }

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .weight(1f)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp)
    ) {
      when {
        // Turning 2FA back off -- unrelated to the enroll flow below, kept
        // as its own single-screen branch since disabling doesn't have
        // the same multi-step shape as enrolling.
        viewModel.totpEnabled == true -> {
          Spacer(modifier = Modifier.height(6.dp))
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(14.dp))
              .background(Color(0xFFFFF3E5))
              .padding(12.dp)
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
              contentDescription = null,
              tint = Color.Black,
              modifier = Modifier.size(16.dp).padding(top = 1.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              "Note: 2FA is currently ON. Every sign-in needs a fresh code from your authenticator app after your Google sign-in, on top of it -- not instead of it. Turning it off below only needs a currently-valid code.",
              color = APP_TEXT_COLOR,
              fontSize = 10.sp,
              lineHeight = 14.sp,
              fontWeight = FontWeight.Medium
            )
          }
          Spacer(modifier = Modifier.height(20.dp))
          Text("Turn off 2FA", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
          Spacer(modifier = Modifier.height(10.dp))
          CodeField(value = viewModel.totpDisableCodeInput, onValueChange = viewModel::onTotpDisableCodeChange)
          if (viewModel.totpError != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(viewModel.totpError!!, color = Color(0xFFE14050), fontSize = 13.sp)
          }
          Spacer(modifier = Modifier.height(24.dp))
          Button(
            onClick = { viewModel.disableTotp() },
            enabled = !viewModel.totpBusy,
            shape = RoundedCornerShape(28.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE14050)),
            modifier = Modifier.fillMaxWidth().height(52.dp)
          ) {
            if (viewModel.totpBusy) {
              CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            } else {
              Text("Turn Off", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
          }
          Spacer(modifier = Modifier.height(24.dp))
        }

        // Step 1: intro -- explains what this is and gets the authenticator
        // app installed before anything account-specific is shown.
        viewModel.totpSetupSecret == null -> {
          Spacer(modifier = Modifier.height(8.dp))
          Text("Authenticator App", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold, lineHeight = 27.sp)
          Text("Verification", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold, lineHeight = 27.sp)
          Spacer(modifier = Modifier.height(28.dp))
          Icon(
            painter = androidx.compose.ui.res.painterResource(R.drawable.ic_totp_verify),
            contentDescription = null,
            tint = Color.Black,
            modifier = Modifier.size(80.dp).align(Alignment.CenterHorizontally)
          )
          Spacer(modifier = Modifier.height(16.dp))
          Text(
            "Instead of waiting for text messages, get verification codes from an authenticator app like Google Authenticator. It works even if your phone is offline.",
            color = APP_TEXT_COLOR.copy(alpha = 0.6f),
            fontSize = 13.sp,
            lineHeight = 19.sp
          )
          Spacer(modifier = Modifier.height(20.dp))
          HorizontalDivider(color = APP_TEXT_COLOR.copy(alpha = 0.08f))
          Spacer(modifier = Modifier.height(20.dp))
          Text("1. Download Authenticator App", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
          Spacer(modifier = Modifier.height(10.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
          ) {
            Text(
              "Google Authenticator",
              color = APP_TEXT_COLOR,
              fontSize = 14.sp,
              modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(12.dp))
                .background(Color.Black.copy(alpha = 0.05f))
                .padding(horizontal = 14.dp, vertical = 12.dp)
            )
            Text(
              "Download",
              color = APP_TEXT_COLOR,
              fontSize = 13.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(Color.Black.copy(alpha = 0.08f))
                .clickable {
                  runCatching {
                    context.startActivity(
                      Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=google+authenticator"))
                    )
                  }.onFailure {
                    context.startActivity(
                      Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/search?q=google+authenticator"))
                    )
                  }
                }
                .padding(horizontal = 14.dp, vertical = 12.dp)
            )
          }
          Spacer(modifier = Modifier.height(20.dp))
          Text("2. Link Authenticator App", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
          Spacer(modifier = Modifier.height(10.dp))
          Box(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(14.dp))
              .border(1.dp, Color.Black.copy(alpha = 0.1f), RoundedCornerShape(14.dp))
              .padding(14.dp)
          ) {
            Text(
              "Tap 'Enable Authenticator App' below and follow the instructions to complete the link.",
              color = APP_TEXT_COLOR.copy(alpha = 0.6f),
              fontSize = 12.sp,
              lineHeight = 17.sp
            )
          }
          if (viewModel.totpError != null) {
            Spacer(modifier = Modifier.height(14.dp))
            Text(viewModel.totpError!!, color = Color(0xFFE14050), fontSize = 13.sp)
          }
          Spacer(modifier = Modifier.height(20.dp))
        }

        // Step 2: link -- the QR code / manual key, shown as the same
        // numbered 01/02/03 layout as the reference.
        viewModel.totpSetupStep == "link" -> {
          Spacer(modifier = Modifier.height(20.dp))
          NumberedTotpStep(number = "01", text = "Copy the 16-digit key. Or you can scan the QR code.")
          Spacer(modifier = Modifier.height(10.dp))
          Text("16-digit key", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 11.sp)
          Spacer(modifier = Modifier.height(4.dp))
          // No background box -- just plain text, pulled to the side
          // instead of the wide filled bar it sat in before.
          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              viewModel.totpSetupSecret.orEmpty(),
              color = APP_TEXT_COLOR,
              fontSize = 13.sp,
              fontWeight = FontWeight.SemiBold,
              letterSpacing = 0.5.sp,
              modifier = Modifier.weight(1f)
            )
            Text(
              "Copy",
              color = Color(0xFFFF9C2D),
              fontSize = 13.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier.clickable {
                clipboard.setText(AnnotatedString(viewModel.totpSetupSecret.orEmpty()))
                Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
              }
            )
          }
          Spacer(modifier = Modifier.height(16.dp))
          // QR code stays under step 01, standalone -- it's the alternative
          // to copying the key above, not tied to step 02.
          val qrBitmap = rememberQrBitmap(viewModel.totpSetupUri.orEmpty())
          if (qrBitmap != null) {
            Image(
              bitmap = qrBitmap.asImageBitmap(),
              contentDescription = "2FA QR code",
              modifier = Modifier.size(110.dp)
            )
          }
          Spacer(modifier = Modifier.height(24.dp))
          NumberedTotpStep(number = "02", text = "Open your authenticator app and add a new entry using the 16-digit key that you just copied.")
          Spacer(modifier = Modifier.height(12.dp))
          // Illustrative "add a new entry" box, boxed like the reference's
          // phone-screen graphic, holding just the "+" badge.
          Box(
            modifier = Modifier
              .size(width = 140.dp, height = 130.dp)
              .border(1.dp, Color.Black.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
          ) {
            // Generic "+" rather than a specific authenticator app's logo,
            // since this works with any of them.
            Box(
              modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(Color(0xFFFF9C2D)),
              contentAlignment = Alignment.Center
            ) {
              Text("+", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
          }
          Spacer(modifier = Modifier.height(24.dp))
          NumberedTotpStep(number = "03", text = "Come back and enter the 6-digit code it shows to finish verifying.")
          Spacer(modifier = Modifier.height(24.dp))
        }

        // Step 3: verify -- the only step that actually calls the backend
        // to turn 2FA on.
        else -> {
          Spacer(modifier = Modifier.height(20.dp))
          Text(
            "Enter the 6-digit code generated by the Authenticator App.",
            color = APP_TEXT_COLOR.copy(alpha = 0.6f),
            fontSize = 14.sp,
            lineHeight = 20.sp
          )
          Spacer(modifier = Modifier.height(24.dp))
          Text("Authenticator App Code", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
          Spacer(modifier = Modifier.height(8.dp))
          CodeField(
            value = viewModel.totpSetupCodeInput,
            onValueChange = viewModel::onTotpSetupCodeChange,
            onPaste = {
              val pasted = clipboard.getText()?.text.orEmpty().filter { it.isDigit() }.take(6)
              if (pasted.isNotEmpty()) viewModel.onTotpSetupCodeChange(pasted)
            },
            showIcon = false
          )
          if (viewModel.totpError != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(viewModel.totpError!!, color = Color(0xFFE14050), fontSize = 13.sp)
          }
          Spacer(modifier = Modifier.height(24.dp))
          Button(
            onClick = { viewModel.confirmTotpSetup() },
            enabled = !viewModel.totpBusy,
            shape = RoundedCornerShape(28.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
            modifier = Modifier.fillMaxWidth().height(52.dp)
          ) {
            if (viewModel.totpBusy) {
              CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            } else {
              Text("Submit", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
          }
          Spacer(modifier = Modifier.height(24.dp))
        }
      }
    }

    // Pinned to the very bottom of the screen instead of just trailing the
    // scrollable intro content, so it stays reachable without scrolling
    // all the way down, matching the reference.
    if (totpIntroStep) {
      Button(
        onClick = { viewModel.startTotpSetup() },
        enabled = !viewModel.totpBusy,
        // A more rectangular radius instead of the app's usual 28dp pill,
        // per reference -- specific to this button only.
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 16.dp)
          .navigationBarsPadding()
          .padding(bottom = 16.dp)
          .height(44.dp)
      ) {
        if (viewModel.totpBusy) {
          CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Enable Authenticator App", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
    }
    if (totpLinkStep) {
      Button(
        onClick = { viewModel.goToTotpVerifyStep() },
        // Same size/shape as Enable Authenticator App above, not the app's
        // usual 28dp pill.
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 16.dp)
          .navigationBarsPadding()
          .padding(bottom = 16.dp)
          .height(44.dp)
      ) {
        Text("Next", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
      }
    }
  }
}

@Composable
private fun NumberedTotpStep(number: String, text: String) {
  Row(verticalAlignment = Alignment.Top) {
    Text(number, color = APP_TEXT_COLOR.copy(alpha = 0.25f), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
    Spacer(modifier = Modifier.width(12.dp))
    Text(
      text,
      color = APP_TEXT_COLOR,
      fontSize = 14.sp,
      lineHeight = 20.sp,
      modifier = Modifier.padding(top = 3.dp)
    )
  }
}

// Shown right after Google sign-in succeeds when the account has 2FA on --
// mobileAuth() returned a pendingId instead of a token, and this is the
// only thing standing between here and AppScreen.Chat.
@Composable
private fun TotpLoginVerifyScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.cancelLoginTotp() }
  Column(
    modifier = Modifier.fillMaxSize().padding(32.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text(
      if (viewModel.loginVerifyKind == "email") "Check your email" else "Enter your 2FA code",
      fontSize = 24.sp,
      fontWeight = FontWeight.ExtraBold,
      color = APP_TEXT_COLOR
    )
    Spacer(modifier = Modifier.height(10.dp))
    Text(
      if (viewModel.loginVerifyKind == "email") {
        "We sent a 6-digit code to your email to confirm it's you on this device"
      } else {
        "Open your authenticator app and enter the current 6-digit code for ChatGiZa"
      },
      fontSize = 14.sp,
      color = APP_TEXT_COLOR.copy(alpha = 0.6f),
      textAlign = androidx.compose.ui.text.style.TextAlign.Center
    )
    Spacer(modifier = Modifier.height(28.dp))
    CodeField(value = viewModel.loginTotpCodeInput, onValueChange = viewModel::onLoginTotpCodeChange, showIcon = false)
    if (viewModel.loginTotpError != null) {
      Spacer(modifier = Modifier.height(10.dp))
      Text(viewModel.loginTotpError!!, color = Color(0xFFE14050), fontSize = 13.sp)
    }
    Spacer(modifier = Modifier.height(24.dp))
    Button(
      onClick = { viewModel.submitLoginTotpCode() },
      enabled = !viewModel.loginTotpBusy,
      shape = RoundedCornerShape(24.dp),
      modifier = Modifier.fillMaxWidth().height(52.dp)
    ) {
      if (viewModel.loginTotpBusy) {
        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
      } else {
        Text("Continue")
      }
    }
    Spacer(modifier = Modifier.height(12.dp))
    TextButton(onClick = { viewModel.cancelLoginTotp() }) {
      Text("Cancel", color = APP_TEXT_COLOR.copy(alpha = 0.6f))
    }
  }
}

// Reached when mobileAuth()/authWithPassword() report passkeyRequired --
// this account's second factor is a registered passkey rather than TOTP or
// an emailed code, so this screen's only job is to launch that ceremony
// (see confirmPasskeyLogin in MainActivity) and let the user retry or bail
// out if it's cancelled/fails. Auto-triggers once on entry, same as a
// system permission prompt would, rather than making the user tap a button
// first for what's otherwise a one-step confirmation.
@Composable
private fun PasskeyLoginConfirmScreen(viewModel: ChatViewModel, onConfirm: () -> Unit) {
  BackHandler { viewModel.cancelPasskeyLoginConfirm() }
  LaunchedEffect(Unit) { onConfirm() }
  Column(
    modifier = Modifier.fillMaxSize().padding(32.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Text("Confirm it's you", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = APP_TEXT_COLOR)
    Spacer(modifier = Modifier.height(10.dp))
    Text(
      "Use your passkey to finish signing in on this device",
      fontSize = 14.sp,
      color = APP_TEXT_COLOR.copy(alpha = 0.6f),
      textAlign = androidx.compose.ui.text.style.TextAlign.Center
    )
    Spacer(modifier = Modifier.height(28.dp))
    CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(28.dp), strokeWidth = 2.dp)
    if (viewModel.errorMessage != null) {
      Spacer(modifier = Modifier.height(20.dp))
      Text(viewModel.errorMessage ?: "", color = Color(0xFFE14050), fontSize = 13.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
      Spacer(modifier = Modifier.height(16.dp))
      Button(onClick = onConfirm, shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth().height(52.dp)) {
        Text("Try again")
      }
    }
    Spacer(modifier = Modifier.height(12.dp))
    TextButton(onClick = { viewModel.cancelPasskeyLoginConfirm() }) {
      Text("Cancel", color = APP_TEXT_COLOR.copy(alpha = 0.6f))
    }
  }
}

// Reached from Security > App Lock -- sets/changes/turns off the
// device-local PIN gate (see ChatViewModel's appLock* state and
// TokenStore.setAppLock). Unrelated to the account's Google sign-in or
// its in-app password; this never leaves the device.
@Composable
private fun AppLockSetupScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAppLockSetup() }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "App Lock",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeAppLockSetup() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .weight(1f)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp)
    ) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFFFF3E5))
          .padding(12.dp)
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(16.dp).padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          if (viewModel.appLockEnabled) {
            "Note: App Lock is currently ON. ChatGiZa will ask for this PIN every time you reopen it, even if you're still signed in. Turning it off below only needs your current PIN."
          } else {
            "Note: This sets a PIN that's required to open ChatGiZa, on top of being signed in -- so someone else picking up your phone can't get into your chats even if the phone itself is unlocked."
          },
          color = APP_TEXT_COLOR,
          fontSize = 10.sp,
          lineHeight = 14.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      if (viewModel.appLockEnabled) {
        Text("Enter your PIN to turn off App Lock", color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(10.dp))
        CodeField(value = viewModel.appLockDisableInput, onValueChange = viewModel::onAppLockDisableChange, placeholder = "Enter PIN")
        if (viewModel.appLockError != null) {
          Spacer(modifier = Modifier.height(10.dp))
          Text(viewModel.appLockError!!, color = Color(0xFFE14050), fontSize = 13.sp)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Button(
          onClick = { viewModel.disableAppLock() },
          shape = RoundedCornerShape(28.dp),
          colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE14050)),
          modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
          Text("Turn Off", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      } else {
        Text(
          if (viewModel.appLockSetupStep == "enter") "Choose a PIN (4-6 digits)" else "Enter the same PIN again to confirm",
          color = APP_TEXT_COLOR,
          fontSize = 15.sp,
          fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(10.dp))
        CodeField(value = viewModel.appLockPinInput, onValueChange = viewModel::onAppLockPinChange, placeholder = "Enter PIN")
        if (viewModel.appLockError != null) {
          Spacer(modifier = Modifier.height(10.dp))
          Text(viewModel.appLockError!!, color = Color(0xFFE14050), fontSize = 13.sp)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Button(
          onClick = { viewModel.submitAppLockPinStep() },
          shape = RoundedCornerShape(28.dp),
          colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
          modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
          Text(
            if (viewModel.appLockSetupStep == "enter") "Continue" else "Confirm",
            color = APP_TEXT_COLOR,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
          )
        }
      }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

// The actual lock -- rendered on top of everything else (see MainActivity's
// setContent) whenever viewModel.appLockGateActive is true. No dismiss
// path except the correct PIN; back just backgrounds the app instead of
// exposing whatever screen was underneath.
@Composable
private fun AppLockGateScreen(viewModel: ChatViewModel) {
  val activity = LocalContext.current as? Activity
  BackHandler { activity?.moveTaskToBack(true) }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .padding(32.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Icon(
      painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded),
      contentDescription = null,
      tint = Color.Black,
      modifier = Modifier.size(40.dp)
    )
    Spacer(modifier = Modifier.height(16.dp))
    Text("ChatGiZa", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = APP_TEXT_COLOR)
    Spacer(modifier = Modifier.height(8.dp))
    Text("Enter your PIN to continue", fontSize = 15.sp, color = APP_TEXT_COLOR.copy(alpha = 0.6f))
    Spacer(modifier = Modifier.height(28.dp))
    CodeField(value = viewModel.appLockGateInput, onValueChange = viewModel::onAppLockGateInputChange, placeholder = "Enter PIN")
    if (viewModel.appLockGateError != null) {
      Spacer(modifier = Modifier.height(10.dp))
      Text(viewModel.appLockGateError!!, color = Color(0xFFE14050), fontSize = 13.sp)
    }
    Spacer(modifier = Modifier.height(24.dp))
    Button(
      onClick = { viewModel.submitAppLockGateUnlock() },
      shape = RoundedCornerShape(24.dp),
      modifier = Modifier.fillMaxWidth().height(52.dp)
    ) {
      Text("Unlock")
    }
  }
}

// Reached from Security > Passkeys -- lists registered passkeys and starts
// the registration ceremony via onAddPasskey (MainActivity's
// startPasskeyRegistration, which needs an Activity so it isn't part of
// ChatViewModel itself).
@Composable
private fun PasskeysManageScreen(viewModel: ChatViewModel, onAddPasskey: () -> Unit) {
  BackHandler { viewModel.closePasskeysScreen() }
  var confirmRemoveId by remember { mutableStateOf<String?>(null) }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
  ) {
    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
      Text(
        "Passkeys",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closePasskeysScreen() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .weight(1f)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp)
    ) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(Color(0xFFFFF3E5))
          .padding(12.dp)
      ) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(R.drawable.ic_warning_circle),
          contentDescription = null,
          tint = Color.Black,
          modifier = Modifier.size(16.dp).padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          "Note: A passkey lets you sign in with just your device's screen lock (fingerprint, face, or PIN) instead of typing anything -- it's tied to this device (or synced through your Google Password Manager) and works alongside your Google sign-in.",
          color = APP_TEXT_COLOR,
          fontSize = 10.sp,
          lineHeight = 14.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      Button(
        onClick = onAddPasskey,
        enabled = !viewModel.passkeyRegisterBusy,
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9C2D)),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        if (viewModel.passkeyRegisterBusy) {
          CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        } else {
          Text("Add a passkey", color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
      }
      if (viewModel.passkeyError != null) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(viewModel.passkeyError!!, color = Color(0xFFE14050), fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(28.dp))

      if (viewModel.passkeysLoading && viewModel.passkeys.isEmpty()) {
        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
        }
      } else if (viewModel.passkeys.isEmpty()) {
        Text(
          "No passkeys yet",
          color = APP_TEXT_COLOR.copy(alpha = 0.5f),
          fontSize = 14.sp,
          modifier = Modifier.padding(vertical = 12.dp)
        )
      } else {
        Text("Your passkeys", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(8.dp))
        viewModel.passkeys.forEachIndexed { index, passkey ->
          Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(
              painter = androidx.compose.ui.res.painterResource(R.drawable.ic_passkey),
              contentDescription = null,
              tint = Color.Black.copy(alpha = 0.7f),
              modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text(passkey.deviceName?.takeIf { it.isNotBlank() } ?: "Passkey", color = APP_TEXT_COLOR, fontSize = 15.sp)
              if (passkey.createdAt != null) {
                Text("Added ${passkey.createdAt.take(10)}", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 12.sp)
              }
            }
            Text(
              "Remove",
              color = Color(0xFFE14050),
              fontSize = 13.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier.clickable { confirmRemoveId = passkey.id }
            )
          }
          if (index < viewModel.passkeys.lastIndex) {
            MyInfoDivider()
          }
        }
      }
      Spacer(modifier = Modifier.height(24.dp))
    }
  }

  if (confirmRemoveId != null) {
    AlertDialog(
      onDismissRequest = { confirmRemoveId = null },
      title = { Text("Remove this passkey?") },
      text = { Text("You won't be able to sign in with it anymore.") },
      confirmButton = {
        TextButton(onClick = {
          viewModel.removePasskey(confirmRemoveId!!)
          confirmRemoveId = null
        }) {
          Text("Remove", color = Color(0xFFE14050))
        }
      },
      dismissButton = {
        TextButton(onClick = { confirmRemoveId = null }) {
          Text("Cancel")
        }
      }
    )
  }
}

@Composable
private fun PasswordField(
  value: String,
  onValueChange: (String) -> Unit,
  placeholder: String,
  maxLength: Int? = null,
  minLength: Int? = null,
  onFocusLost: () -> Unit = {},
  onFocusGained: () -> Unit = {}
) {
  var visible by remember { mutableStateOf(false) }
  var focused by remember { mutableStateOf(false) }
  // Set on blur when still under minLength, cleared once typing reaches it
  // again -- stays red across a re-focus even though the error text below
  // hides again the moment they tap back in.
  var invalid by remember { mutableStateOf(false) }
  val borderColor = when {
    invalid -> Color(0xFFE14050)
    focused -> Color.Black
    else -> Color.Transparent
  }
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .background(Color.Black.copy(alpha = 0.05f))
      // Border only shows once the field is actually focused instead of
      // being permanently visible -- an untouched field reads as plain/flat
      // like the rest of the screen, and tapping in is what draws the eye
      // to it. Overridden red while invalid regardless of focus.
      .border(1.dp, borderColor, RoundedCornerShape(14.dp))
      .padding(horizontal = 16.dp, vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded), contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
    Spacer(modifier = Modifier.width(12.dp))
    Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
      if (value.isEmpty()) {
        Text(placeholder, color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 16.sp)
      }
      BasicTextField(
        value = value,
        onValueChange = { new ->
          if (maxLength == null || new.length <= maxLength) {
            onValueChange(new)
            if (minLength != null && new.length >= minLength) invalid = false
          }
        },
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp),
        cursorBrush = SolidColor(Color.Black),
        visualTransformation = if (visible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
        // Without keyboardType = Password the IME had no idea this was a
        // password field, so Gboard was spell-checking it like plain text
        // -- the underline and word-split suggestion bar the user saw were
        // autocorrect actually altering what got typed, which is exactly
        // why a password that was "set" under autocorrect's influence
        // could stop matching what's typed back in later.
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password),
        modifier = Modifier
          .fillMaxWidth()
          .onFocusChanged { state ->
            focused = state.isFocused
            if (state.isFocused) {
              onFocusGained()
            } else {
              // Only flags red if they've actually started typing and
              // stopped short -- a fresh, never-touched field that's just
              // tapped in and out shouldn't be scolded for being empty.
              if (minLength != null && value.isNotEmpty() && value.length < minLength) invalid = true
              onFocusLost()
            }
          }
      )
    }
    // Both states now use pasted SVGs -- ic_eye_open for visible,
    // ic_eye_slash for hidden -- instead of the earlier mix of the
    // Material Icons Extended eye (which has no crossed-out counterpart
    // in this project's icon set) and the pasted slash.
    if (visible) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_eye_open),
        contentDescription = "Hide password",
        tint = Color.Black.copy(alpha = 0.5f),
        modifier = Modifier.size(20.dp).clickable { visible = !visible }
      )
    } else {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_eye_slash),
        contentDescription = "Show password",
        tint = Color.Black.copy(alpha = 0.5f),
        modifier = Modifier.size(20.dp).clickable { visible = !visible }
      )
    }
  }
}

@Composable
private fun CodeField(
  value: String,
  onValueChange: (String) -> Unit,
  // Opt-in trailing "Paste" affordance -- only the Authenticator App setup
  // verify step wants this (matching the reference), the other CodeField
  // call sites (password change, login 2FA) stay as they were.
  onPaste: (() -> Unit)? = null,
  placeholder: String = "6-digit code",
  // The Authenticator App screens (setup verify + login verify) don't want
  // the leading lock icon; the other CodeField call sites (password change,
  // App Lock PIN) keep it.
  showIcon: Boolean = true
) {
  var focused by remember { mutableStateOf(false) }
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(14.dp))
      .background(Color(0xFFF4F4F4))
      .border(1.dp, if (focused) Color.Black else Color.Transparent, RoundedCornerShape(14.dp))
      .padding(horizontal = 16.dp, vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    if (showIcon) {
      Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lock_rounded), contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
      Spacer(modifier = Modifier.width(12.dp))
    }
    Box(modifier = Modifier.weight(1f).padding(vertical = 11.dp)) {
      if (value.isEmpty()) {
        Text(placeholder, color = APP_TEXT_COLOR.copy(alpha = 0.35f), fontSize = 16.sp)
      }
      BasicTextField(
        value = value,
        onValueChange = { new -> if (new.length <= 6 && new.all { it.isDigit() }) onValueChange(new) },
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 16.sp, letterSpacing = 4.sp),
        cursorBrush = SolidColor(Color.Black),
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
        modifier = Modifier
          .fillMaxWidth()
          .onFocusChanged { state -> focused = state.isFocused }
      )
    }
    if (onPaste != null) {
      Text(
        "Paste",
        color = Color(0xFFFF9C2D),
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.clickable(onClick = onPaste)
      )
    }
  }
}

@Composable
private fun NsfwPreferencesScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeNsfwPreferences() }
  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeNsfwPreferences() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "NSFW Preferences", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
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

// Real brand marks (from Simple Icons, MIT-licensed for exactly this
// "which service does this row link to" use) for the connectors that
// have one available -- GitHub and Notion are recolored white since
// their literal brand hex is near-black and would vanish against these
// rows' dark background, same as their own dark-mode treatment. Canva
// has no entry in Simple Icons, so it falls back to the plain
// initial-letter badge below rather than a fake logo.
private fun connectorIconRes(id: String): Int? = when (id) {
  "gmail" -> R.drawable.ic_connector_gmail
  "google_calendar" -> R.drawable.ic_connector_google_calendar
  "google_drive" -> R.drawable.ic_connector_google_drive
  "github" -> R.drawable.ic_connector_github
  "notion" -> R.drawable.ic_connector_notion
  "box" -> R.drawable.ic_connector_box
  "stripe" -> R.drawable.ic_connector_stripe
  "wix" -> R.drawable.ic_connector_wix
  else -> null
}

@Composable
private fun ConnectorRow(info: ConnectorInfo, busy: Boolean, onConnect: () -> Unit, onDisconnect: () -> Unit) {
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)
  ) {
    val iconRes = connectorIconRes(info.id)
    Box(
      modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.1f)),
      contentAlignment = Alignment.Center
    ) {
      if (iconRes != null) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(iconRes),
          contentDescription = null,
          tint = Color.Unspecified,
          modifier = Modifier.size(20.dp)
        )
      } else {
        Text(info.name.take(1), color = APP_TEXT_COLOR, fontSize = 15.sp, fontWeight = FontWeight.Bold)
      }
    }
    Spacer(Modifier.width(12.dp))
    Text(info.name, color = APP_TEXT_COLOR, fontSize = 15.sp, modifier = Modifier.weight(1f))
    when {
      busy -> CircularProgressIndicator(color = APP_TEXT_COLOR.copy(alpha = 0.6f), modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
      info.connected -> Box(
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .border(1.dp, Color.Black.copy(alpha = 0.5f), RoundedCornerShape(50))
          .clickable(onClick = onDisconnect)
          .padding(horizontal = 14.dp, vertical = 6.dp)
      ) {
        Text("Connected", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
      }
      info.configured -> Box(
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.12f))
          .clickable(onClick = onConnect)
          .padding(horizontal = 14.dp, vertical = 6.dp)
      ) {
        Text("Connect", color = APP_TEXT_COLOR, fontSize = 13.sp, fontWeight = FontWeight.Medium)
      }
      else -> Box(
        modifier = Modifier
          .clip(RoundedCornerShape(50))
          .background(Color.Black.copy(alpha = 0.05f))
          .clickable(onClick = onConnect)
          .padding(horizontal = 14.dp, vertical = 6.dp)
      ) {
        Text("Setup needed", color = APP_TEXT_COLOR.copy(alpha = 0.4f), fontSize = 13.sp, fontWeight = FontWeight.Medium)
      }
    }
  }
}

// Real OAuth connectors (see ChatGizaApi.getConnectors/startConnectorAuth
// and src/lib/connectors.ts) -- "Connect" opens the provider's actual
// authorize page in the system browser; connectors without real
// credentials configured on the backend show "Setup needed" instead of a
// working-looking button that would silently do nothing.
@Composable
private fun ConnectorsScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeConnectors() }
  val context = LocalContext.current
  var query by remember { mutableStateOf("") }
  LaunchedEffect(Unit) { viewModel.loadConnectors() }

  val lifecycleOwner = LocalLifecycleOwner.current
  DisposableEffect(lifecycleOwner) {
    val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
      if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) viewModel.loadConnectors()
    }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
  }

  val filtered = remember(viewModel.connectors, query) {
    if (query.isBlank()) viewModel.connectors
    else viewModel.connectors.filter { it.name.contains(query, ignoreCase = true) }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeConnectors() }) {
        Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black)
      }
      Spacer(Modifier.width(18.dp))
      Text(text = "Connectors", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
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
        .background(Color.Black.copy(alpha = 0.08f))
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
          textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 14.sp),
          cursorBrush = SolidColor(Color.Black),
          modifier = Modifier.fillMaxWidth()
        )
      }
    }
    Spacer(Modifier.height(24.dp))

    viewModel.connectorsError?.let {
      Text(it, color = APP_TEXT_COLOR, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
    }

    if (viewModel.loadingConnectors && viewModel.connectors.isEmpty()) {
      Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = APP_TEXT_COLOR, modifier = Modifier.size(24.dp))
      }
    } else {
      Text(text = "Featured", color = Color(0xFFA8A8A8), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
      LazyColumn(modifier = Modifier.fillMaxSize()) {
        items(filtered, key = { it.id }) { info ->
          ConnectorRow(
            info = info,
            busy = viewModel.isConnectorBusy(info.id),
            onConnect = {
              if (!info.configured) {
                Toast.makeText(context, "${info.name} isn't set up yet", Toast.LENGTH_SHORT).show()
              } else {
                viewModel.startConnector(info.id) { url ->
                  runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                }
              }
            },
            onDisconnect = { viewModel.disconnectConnectorService(info.id) }
          )
        }
      }
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
    Text(label, color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
    if (selected) {
      Icon(Icons.Filled.Check, contentDescription = "Selected", tint = Color.Black, modifier = Modifier.size(22.dp))
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
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .padding(horizontal = 20.dp)
  ) {
    Spacer(modifier = Modifier.height(12.dp))
    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
      Text(
        "Language",
        color = APP_TEXT_COLOR,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.align(Alignment.Center)
      )
      IconButton(onClick = { viewModel.closeAppLanguage() }, modifier = Modifier.align(Alignment.CenterStart).size(28.dp)) {
        Icon(Icons.Filled.ArrowBackIosNew, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
      IconButton(onClick = { searchOpen = !searchOpen }, modifier = Modifier.align(Alignment.CenterEnd).size(28.dp)) {
        Icon(Icons.Outlined.Search, contentDescription = "Search languages", tint = Color.Black, modifier = Modifier.size(24.dp))
      }
    }

    // Same hero shape as About Us -- a centered icon standing in for the
    // logo there -- instead of jumping straight from the title into the
    // list.
    Spacer(modifier = Modifier.height(28.dp))
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_world),
        contentDescription = null,
        tint = Color.Black,
        modifier = Modifier.size(56.dp)
      )
    }
    Spacer(modifier = Modifier.height(28.dp))

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
      Text("Suggested", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      LanguageRow("System", selected = isAutoDetect) { applyLocale(null) }
      suggested.forEach { e ->
        LanguageRow(e.nativeName, selected = !isAutoDetect && currentLabel.equals(e.englishName, ignoreCase = true)) {
          applyLocale(e)
        }
      }

      Spacer(modifier = Modifier.height(12.dp))
      Text("All Languages", color = APP_TEXT_COLOR, fontSize = 18.sp, fontWeight = FontWeight.Bold)
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
    tint = if (selected) Color.Black else Color(0xFFA8A8A8)
  )
}

@Composable
private fun AdvancedScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeAdvanced() }
  var showDialog by remember { mutableStateOf(false) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(APP_BACKGROUND)
      .statusBarsPadding()
      .padding(20.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      IconButton(onClick = { viewModel.closeAdvanced() }, modifier = Modifier.size(28.dp)) {
        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = Color.Black, modifier = Modifier.size(28.dp))
      }
      Spacer(Modifier.width(20.dp))
      Text(text = "Advanced", color = APP_TEXT_COLOR, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }

    Spacer(Modifier.height(28.dp))

    Card(
      modifier = Modifier
        .fillMaxWidth()
        .clickable { showDialog = true },
      shape = RoundedCornerShape(22.dp),
      colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.05f))
    ) {
      Column(modifier = Modifier.padding(20.dp)) {
        Text(text = "Paste as File", color = APP_TEXT_COLOR, fontWeight = FontWeight.Medium, fontSize = 16.sp)
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
        colors = CardDefaults.cardColors(containerColor = APP_BACKGROUND)
      ) {
        Column(modifier = Modifier.padding(24.dp)) {
          Text("Paste as File", color = APP_TEXT_COLOR, fontSize = 24.sp, fontWeight = FontWeight.Bold)

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
            Text("Always Ask", color = APP_TEXT_COLOR, fontSize = 19.sp)
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
            Text("Always Attach as File", color = APP_TEXT_COLOR, fontSize = 19.sp)
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
            Text("Always Paste as Text", color = APP_TEXT_COLOR, fontSize = 19.sp)
          }
        }
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
          focusedTextColor = Color.Black,
          unfocusedTextColor = Color.Black,
          focusedBorderColor = Color.Black.copy(alpha = 0.4f),
          unfocusedBorderColor = Color.Black.copy(alpha = 0.15f),
          cursorColor = Color.Black
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

// cadence/detail just describe, in the reference's own label style, what
// each description already says in words ("Every Saturday" -> WEEKLY /
// Saturdays) -- not a claim that tapping one creates a real recurring job,
// see the comment on ScheduledScreen for what tapping these actually does.
// recurrenceDays > 0 is what makes tapping one real -- see the comment on
// ChatViewModel.startTaskExample for the full pending -> done -> reappears
// lifecycle this drives. 0 means it completes on tap (or wizard finish)
// and stays gone, no scheduled comeback.
// emoji is null when a real icon (iconRes) is used instead -- only
// Concert alerts has one so far, pasted in rather than left as an emoji.
// iconMonochrome=false is for icons like ic_sale_bag that carry their own
// multiple real colors -- tinting those to onBackground would flatten them
// to a single color and defeat the point, so they render with
// Color.Unspecified (their own colors) instead.
private data class MockTaskCard(
  val emoji: String?,
  val iconRes: Int?,
  val title: String,
  val description: String,
  val cadence: String,
  val detail: String,
  val recurrenceDays: Int,
  val iconMonochrome: Boolean = true
)

private val MOCK_TASK_CARDS = listOf(
  MockTaskCard("📖", null, "Weekend long read", "Every Saturday, find me an exceptional recent long read based on my interests", "WEEKLY", "Saturdays · Morning", recurrenceDays = 7),
  MockTaskCard(null, R.drawable.ic_sale_bag, "Sale monitor", "Watch my favorite stores and let me know when there's a good sale", "ONGOING", "Continuous watch", recurrenceDays = 0, iconMonochrome = false),
  MockTaskCard(null, R.drawable.ic_music_notes, "Concert alerts", "Let me know when artists I like announce concerts near me", "ONGOING", "Continuous watch", recurrenceDays = 0),
  MockTaskCard("🎉", null, "Weekend ideas", "Every Thursday, send me ideas for things to do nearby this weekend", "WEEKLY", "Thursdays · Morning", recurrenceDays = 7)
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

// Real scheduled tasks now -- backed by GET/PUT /api/scheduled
// (viewModel.scheduledTasks/addScheduledTask/deleteScheduledTask, already
// wired to the KV store) and actually fired by ScheduledTaskWorker
// (WorkManager, runs every ~15 min even with the app closed: sends the
// prompt, posts a real notification, speaks it via TTS, marks fired=true).
// That engine already worked; this screen just never gave it real input.
// Template cards below pre-fill the create sheet instead of firing a
// one-off chat message -- tapping one no longer pretends to "start" a
// recurring task that was never actually scheduled.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduledScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeScheduled() }
  var showCreateSheet by remember { mutableStateOf(false) }
  var confirmDeleteTask by remember { mutableStateOf<ApiScheduledTask?>(null) }
  var taskFilter by remember { mutableStateOf("Active") }
  var filterMenuOpen by remember { mutableStateOf(false) }
  // Chat/Work is a real category picked when a task is created (see
  // CreateScheduledTaskSheet), stored server-side -- not a cosmetic label.
  var categoryFilter by remember { mutableStateOf("Chat") }
  var categoryMenuOpen by remember { mutableStateOf(false) }
  // Active = not fired, not paused, not pending (upcoming). Paused = real --
  // toggled per-task below, and ScheduledTaskWorker actually skips paused
  // tasks instead of just hiding them from this filter. Pending = a
  // template was tapped but its wizard hasn't been finished yet (see
  // ChatViewModel.startTaskExample/dismissPreferenceWizard). Completed =
  // fired.
  val filteredTasks = remember(viewModel.scheduledTasks, taskFilter, categoryFilter) {
    viewModel.scheduledTasks.filter { task ->
      task.category == categoryFilter && when (taskFilter) {
        "Paused" -> task.paused && !task.fired && !task.pending
        "Pending" -> task.pending && !task.fired
        "Completed" -> task.fired
        else -> !task.fired && !task.paused && !task.pending
      }
    }
  }
  // A template stays hidden from "Get started" while there's a real task
  // behind it that's either pending (tapped, not finished) or scheduled in
  // the future (a recurring one on its cooldown) -- once that cooldown
  // passes, runAtMillis <= now and it naturally reappears with no extra
  // bookkeeping needed.
  val visibleTemplates = remember(viewModel.scheduledTasks, categoryFilter) {
    MOCK_TASK_CARDS.filter { template ->
      viewModel.scheduledTasks.none { t ->
        t.title == template.title && t.category == categoryFilter &&
          (t.pending || (!t.fired && !t.paused && (runAtEpochMillis(t.runAt) ?: 0L) > System.currentTimeMillis()))
      }
    }
  }

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
        Box(modifier = Modifier.weight(1f)) {
          Column(modifier = Modifier.fillMaxWidth().clickable { categoryMenuOpen = true }, horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Tasks", color = colorScheme.onBackground, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text(categoryFilter, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 13.sp)
              Icon(
                Icons.Outlined.KeyboardArrowDown,
                contentDescription = null,
                tint = colorScheme.onBackground.copy(alpha = 0.5f),
                modifier = Modifier.size(16.dp)
              )
            }
          }
          DropdownMenu(
            expanded = categoryMenuOpen,
            onDismissRequest = { categoryMenuOpen = false },
            modifier = Modifier.align(Alignment.TopCenter).width(210.dp),
            // Shifted up to open over the "Tasks" title itself instead of
            // down over the task list -- it used to drop low enough to
            // cover the first line or two of "Your tasks"/"No X tasks yet"
            // behind it while still leaving "Tasks" visible above, which
            // read as the menu floating in the wrong spot. Opening upward
            // over the title (which the menu already visually replaces
            // while it's open) keeps the list below fully clear instead.
            offset = DpOffset(x = 0.dp, y = (-28).dp),
            shape = RoundedCornerShape(24.dp)
          ) {
            listOf("Chat", "Work").forEach { option ->
              val selected = categoryFilter == option
              DropdownMenuItem(
                text = { Text(option, fontWeight = FontWeight.Bold) },
                trailingIcon = { if (selected) Icon(Icons.Filled.Check, contentDescription = null) },
                modifier = Modifier
                  .padding(horizontal = 8.dp, vertical = 2.dp)
                  .clip(RoundedCornerShape(50))
                  .background(if (selected) colorScheme.onBackground.copy(alpha = 0.08f) else Color.Transparent),
                onClick = {
                  categoryFilter = option
                  categoryMenuOpen = false
                }
              )
            }
          }
        }
        Box {
          IconButton(
            onClick = { filterMenuOpen = true },
            modifier = Modifier.size(44.dp).clip(CircleShape).background(colorScheme.onBackground.copy(alpha = 0.08f))
          ) {
            FilterIconCustom(tint = colorScheme.onBackground, modifier = Modifier.size(18.dp))
          }
          DropdownMenu(
            expanded = filterMenuOpen,
            onDismissRequest = { filterMenuOpen = false },
            modifier = Modifier.width(210.dp),
            offset = DpOffset(x = 0.dp, y = 4.dp),
            shape = RoundedCornerShape(24.dp)
          ) {
            listOf("Active", "Pending", "Paused", "Completed").forEach { option ->
              val selected = taskFilter == option
              DropdownMenuItem(
                text = { Text(option, fontWeight = FontWeight.Bold) },
                trailingIcon = { if (selected) Icon(Icons.Filled.Check, contentDescription = null) },
                modifier = Modifier
                  .padding(horizontal = 8.dp, vertical = 2.dp)
                  .clip(RoundedCornerShape(50))
                  .background(if (selected) colorScheme.onBackground.copy(alpha = 0.08f) else Color.Transparent),
                onClick = {
                  taskFilter = option
                  filterMenuOpen = false
                }
              )
            }
          }
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
          .clickable {
            viewModel.onNewTaskPromptChange("")
            viewModel.onNewTaskRunAtChange("")
            viewModel.onNewTaskCategoryChange(categoryFilter)
            showCreateSheet = true
          }
          .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          "Create a task",
          color = colorScheme.onBackground.copy(alpha = 0.5f),
          fontSize = 15.sp,
          modifier = Modifier.weight(1f)
        )
        Icon(Icons.Filled.Add, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f))
      }
    }
  ) { padding ->
    LazyColumn(
      modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp),
      contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp)
    ) {
      if (viewModel.loadingScheduled && viewModel.scheduledTasks.isEmpty()) {
        item {
          Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = colorScheme.onBackground)
          }
        }
      }
      // Always shown, even with zero tasks total -- switching to Pending/
      // Paused/Completed must always land on either real items or an
      // explicit "no X tasks yet" line, never silently show nothing.
      item {
        Text("Your tasks ($taskFilter)", color = colorScheme.onBackground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      }
      if (filteredTasks.isEmpty()) {
        item {
          Text(
            "No $taskFilter tasks yet.",
            color = colorScheme.onBackground.copy(alpha = 0.4f),
            fontSize = 13.sp,
            modifier = Modifier.padding(vertical = 4.dp)
          )
        }
      } else {
        items(filteredTasks, key = { it.id }) { task ->
          Column(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(20.dp))
              .background(colorScheme.onBackground.copy(alpha = 0.06f))
              .padding(16.dp)
          ) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
              Text(
                when {
                  task.fired -> "COMPLETED"
                  task.pending -> "PENDING"
                  task.paused -> "PAUSED"
                  else -> "SCHEDULED"
                },
                color = if (!task.fired && !task.paused && !task.pending) Color(0xFF4C8DFF) else colorScheme.onBackground.copy(alpha = 0.5f),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp,
                modifier = Modifier.weight(1f)
              )
              IconButton(onClick = { confirmDeleteTask = task }, modifier = Modifier.size(28.dp)) {
                DeleteIcon(tint = colorScheme.onBackground.copy(alpha = 0.4f))
              }
            }
            Text(
              task.title.ifBlank { task.prompt },
              color = colorScheme.onBackground,
              fontSize = 17.sp,
              fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              task.prompt,
              color = colorScheme.onBackground.copy(alpha = 0.6f),
              fontSize = 14.sp,
              lineHeight = 19.sp,
              maxLines = 3,
              overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = colorScheme.onBackground.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
              Text(
                "${timeOfDayLabel(task.runAt)} • ${formatScheduledRunAt(task.runAt)}",
                color = colorScheme.onBackground.copy(alpha = 0.5f),
                fontSize = 12.sp,
                modifier = Modifier.weight(1f)
              )
              if (task.pending) {
                Text(
                  "Continue",
                  color = colorScheme.onBackground,
                  fontSize = 14.sp,
                  fontWeight = FontWeight.Bold,
                  modifier = Modifier.clickable { viewModel.resumeWizardForTask(task) }
                )
              } else if (!task.fired) {
                Text(
                  if (task.paused) "Resume" else "Pause",
                  color = colorScheme.onBackground,
                  fontSize = 14.sp,
                  fontWeight = FontWeight.Bold,
                  modifier = Modifier.clickable { viewModel.toggleTaskPaused(task.id) }
                )
              }
            }
          }
        }
      }

      item {
        Spacer(modifier = Modifier.height(8.dp))
        Text("Get started", color = colorScheme.onBackground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      }
      items(visibleTemplates) { task ->
        // Sends the prompt as a one-off chat message right away AND
        // creates a real, pending task behind it -- see the comment on
        // ChatViewModel.startTaskExample for the full lifecycle. This
        // card itself disappears from here the instant it's tapped.
        val keyboardController = LocalSoftwareKeyboardController.current
        val focusManager = LocalFocusManager.current
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .dashedBorder(colorScheme.onBackground.copy(alpha = 0.25f), cornerRadius = 20.dp)
            .clickable {
              focusManager.clearFocus()
              keyboardController?.hide()
              viewModel.closeScheduled()
              viewModel.startTaskExample(
                task.title,
                task.description,
                hasWizard = task.title in TASK_WIZARDS,
                category = categoryFilter,
                recurrenceDays = task.recurrenceDays
              )
            }
            .padding(16.dp)
        ) {
          Text(
            task.cadence,
            color = Color(0xFF4C8DFF),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
          )
          Spacer(modifier = Modifier.height(4.dp))
          Row(verticalAlignment = Alignment.CenterVertically) {
            if (task.iconRes != null) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(task.iconRes),
                contentDescription = null,
                tint = if (task.iconMonochrome) colorScheme.onBackground else Color.Unspecified,
                modifier = Modifier.size(18.dp)
              )
            } else {
              Text(task.emoji.orEmpty(), fontSize = 17.sp)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              task.title,
              color = colorScheme.onBackground,
              fontSize = 17.sp,
              fontWeight = FontWeight.Bold,
              modifier = Modifier.weight(1f)
            )
            Icon(Icons.Filled.Add, contentDescription = "Use this task", tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
          }
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            task.description,
            color = colorScheme.onBackground.copy(alpha = 0.6f),
            fontSize = 14.sp,
            lineHeight = 20.sp,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
          )
          Spacer(modifier = Modifier.height(12.dp))
          HorizontalDivider(color = colorScheme.onBackground.copy(alpha = 0.08f))
          Spacer(modifier = Modifier.height(10.dp))
          Text(task.detail, color = colorScheme.onBackground.copy(alpha = 0.5f), fontSize = 12.sp, letterSpacing = 0.3.sp)
        }
      }
    }
  }

  if (showCreateSheet) {
    CreateScheduledTaskSheet(
      viewModel = viewModel,
      onDismiss = { showCreateSheet = false },
      onCreated = { showCreateSheet = false }
    )
  }

  val target = confirmDeleteTask
  if (target != null) {
    ConfirmDangerDialog(
      title = "Delete this task?",
      message = "${target.prompt} won't run anymore.",
      onConfirm = {
        viewModel.deleteScheduledTask(target.id)
        confirmDeleteTask = null
      },
      onDismiss = { confirmDeleteTask = null }
    )
  }
}

// Same parsing as ScheduledTaskWorker's own runAtMillis -- used here just
// to compare a recurring template's rolled-forward runAt against now, to
// decide whether it's still on cooldown or should reappear in Get started.
private fun runAtEpochMillis(runAt: String): Long? = runCatching {
  java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).parse(runAt)?.time
}.getOrNull()

// yyyy-MM-dd'T'HH:mm (naive local time, no seconds/timezone -- same format
// the AI's own [[REMINDER_START]] marker and the web client use) into
// something readable, e.g. "Mar 5, 2026 · 14:30". Falls back to the raw
// string if it doesn't parse instead of crashing the row.
private fun formatScheduledRunAt(runAt: String): String {
  return runCatching {
    val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
    val display = java.text.SimpleDateFormat("MMM d, yyyy · HH:mm", Locale.US)
    display.format(parser.parse(runAt)!!)
  }.getOrDefault(runAt)
}

// Derived straight from the task's own hour, not a separate stored field --
// "Morning"/"Afternoon"/"Evening"/"Night" the same way a person would
// describe that time, matching the reference's bottom-row meta text.
private fun timeOfDayLabel(runAt: String): String {
  return runCatching {
    val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
    val cal = java.util.Calendar.getInstance()
    cal.time = parser.parse(runAt)!!
    when (cal.get(java.util.Calendar.HOUR_OF_DAY)) {
      in 5..11 -> "Morning"
      in 12..16 -> "Afternoon"
      in 17..20 -> "Evening"
      else -> "Night"
    }
  }.getOrDefault("")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateScheduledTaskSheet(viewModel: ChatViewModel, onDismiss: () -> Unit, onCreated: () -> Unit) {
  val context = LocalContext.current
  val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
  var pickedMillis by remember { mutableStateOf<Long?>(null) }
  val displayFormat = remember { java.text.SimpleDateFormat("EEE, MMM d · HH:mm", Locale.US) }
  // Compact in-sheet dictation into the prompt field -- same
  // SpeechRecognizer approach as the main chat composer's mic button, just
  // scoped to this one field instead of viewModel.input.
  var isListening by remember { mutableStateOf(false) }
  var listeningPreview by remember { mutableStateOf("") }
  val promptBeforeListening = remember { mutableStateOf("") }
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
      val base = promptBeforeListening.value
      viewModel.onNewTaskPromptChange(if (base.isBlank()) text else "$base $text")
    }
  }
  fun stopListening(keepResult: Boolean) {
    isListening = false
    listeningPreview = ""
    runCatching { if (keepResult) speechRecognizer?.stopListening() else speechRecognizer?.cancel() }
  }
  fun startListening() {
    val recognizer = speechRecognizer ?: return
    promptBeforeListening.value = viewModel.newTaskPrompt
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

  // Camera/Gallery/Files, back in this sheet per the user's own annotated
  // screenshot -- embedded inside the prompt field itself alongside mic
  // (bottom-right corner) rather than as a separate row, this time. A
  // photo of a calendar or a PDF attached here still rides along with the
  // task and gets folded into the prompt when it fires (see
  // ApiScheduledTask's attachment* fields and ScheduledTaskWorker).
  val scope = rememberCoroutineScope()
  var attachMenuOpen by remember { mutableStateOf(false) }
  var attachError by remember { mutableStateOf(false) }
  var attachBusy by remember { mutableStateOf(false) }

  fun attachPickedImage(uri: Uri) {
    attachError = false
    attachBusy = true
    scope.launch {
      val dataUrl = withContext(Dispatchers.IO) { uriToPostImageDataUrl(context, uri) }
      attachBusy = false
      if (dataUrl != null) {
        viewModel.setNewTaskAttachmentImage("Photo", dataUrl)
      } else {
        attachError = true
      }
    }
  }

  fun attachPickedFile(uri: Uri) {
    attachError = false
    attachBusy = true
    scope.launch {
      val name = withContext(Dispatchers.IO) { queryFileDisplayName(context, uri) }
      val file = withContext(Dispatchers.IO) { readAttachedFile(context, uri, name) }
      attachBusy = false
      when {
        file?.text != null -> viewModel.setNewTaskAttachmentText(file.name, file.text)
        file?.imageDataUrls?.isNotEmpty() == true -> viewModel.setNewTaskAttachmentImage(file.name, file.imageDataUrls.first())
        else -> attachError = true
      }
    }
  }

  val galleryPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
    if (uri != null) attachPickedImage(uri)
  }
  val taskFilePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
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
    val photoFile = File(context.cacheDir, "task_camera_${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", photoFile)
    pendingCameraUri = uri
    cameraCapture.launch(uri)
  }
  val cameraPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    hasCameraPermission = granted
    if (granted) launchCamera()
  }

  // MaterialDatePicker/MaterialTimePicker instead of the plain framework
  // DatePickerDialog/TimePickerDialog -- those render very differently
  // across Android versions and OEM skins (old Holo-style spinners on
  // some), where this gives the same modern rounded calendar-grid dialog
  // everywhere, matching the reference the user sent.
  fun openPicker() {
    val activity = context as? androidx.fragment.app.FragmentActivity ?: return
    val now = java.util.Calendar.getInstance()
    val datePicker = com.google.android.material.datepicker.MaterialDatePicker.Builder.datePicker()
      .setTitleText("Select date")
      .setSelection(com.google.android.material.datepicker.MaterialDatePicker.todayInUtcMilliseconds())
      .setCalendarConstraints(
        com.google.android.material.datepicker.CalendarConstraints.Builder()
          .setValidator(com.google.android.material.datepicker.DateValidatorPointForward.now())
          .build()
      )
      .build()
    datePicker.addOnPositiveButtonClickListener { utcMillis ->
      // MaterialDatePicker's selection is UTC midnight of the chosen day --
      // read the calendar fields back out in UTC (not the device's local
      // zone) so the day itself doesn't shift, then combine with the time
      // picked next using the device's own local Calendar as before.
      val utcCal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
      utcCal.timeInMillis = utcMillis
      val year = utcCal.get(java.util.Calendar.YEAR)
      val month = utcCal.get(java.util.Calendar.MONTH)
      val day = utcCal.get(java.util.Calendar.DAY_OF_MONTH)

      // CLOCK_12H (AM/PM) per the user's reference screenshot -- the
      // MaterialTimePicker still returns hour in 24-hour form either way
      // (getHour()), this only changes the dial's own display format.
      val timePicker = com.google.android.material.timepicker.MaterialTimePicker.Builder()
        .setTimeFormat(com.google.android.material.timepicker.TimeFormat.CLOCK_12H)
        .setHour(now.get(java.util.Calendar.HOUR_OF_DAY))
        .setMinute(now.get(java.util.Calendar.MINUTE))
        .setTitleText("Select time")
        .build()
      timePicker.addOnPositiveButtonClickListener {
        val cal = java.util.Calendar.getInstance()
        cal.set(year, month, day, timePicker.hour, timePicker.minute, 0)
        pickedMillis = cal.timeInMillis
        val runAtFormat = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
        viewModel.onNewTaskRunAtChange(runAtFormat.format(cal.time))
      }
      timePicker.show(activity.supportFragmentManager, "task_time_picker")
    }
    datePicker.show(activity.supportFragmentManager, "task_date_picker")
  }

  ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = colorScheme.background) {
    Column(
      modifier = Modifier.fillMaxWidth().imePadding().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
      Text("New task", color = colorScheme.onBackground, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(16.dp))
      if (isListening) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.06f))
            .padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
          Text(
            listeningPreview.ifBlank { "Listening…" },
            color = colorScheme.onBackground.copy(alpha = if (listeningPreview.isBlank()) 0.5f else 1f),
            fontSize = 15.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Box(
            modifier = Modifier.size(32.dp).clip(CircleShape).background(colorScheme.onBackground.copy(alpha = 0.1f)).clickable { stopListening(keepResult = false) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Outlined.Close, contentDescription = "Cancel", tint = colorScheme.onBackground, modifier = Modifier.size(16.dp))
          }
          Spacer(modifier = Modifier.width(6.dp))
          Box(
            modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFE0E0E0)).clickable { stopListening(keepResult = true) },
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Filled.Check, contentDescription = "Done", tint = Color.White, modifier = Modifier.size(16.dp))
          }
        }
      } else {
        // Attach + mic sit inside the field itself, bottom-right corner,
        // instead of a separate row below it -- extra bottom padding on
        // the text reserves room so typed text never runs under the icons.
        Box {
          OutlinedTextField(
            value = viewModel.newTaskPrompt,
            onValueChange = { viewModel.onNewTaskPromptChange(it) },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("What should ChatGiZa do?") },
            minLines = 3,
            maxLines = 6,
            shape = RoundedCornerShape(16.dp)
          )
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 10.dp)
          ) {
            Box {
              Box(
                modifier = Modifier
                  .size(30.dp)
                  .clip(CircleShape)
                  .background(colorScheme.onBackground.copy(alpha = 0.08f))
                  .clickable { attachMenuOpen = true },
                contentAlignment = Alignment.Center
              ) {
                Icon(Icons.Filled.Add, contentDescription = "Attach", tint = colorScheme.onBackground, modifier = Modifier.size(15.dp))
              }
              DropdownMenu(
                expanded = attachMenuOpen,
                onDismissRequest = { attachMenuOpen = false },
                shape = RoundedCornerShape(32.dp),
                containerColor = APP_BACKGROUND,
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
                  onClick = { attachMenuOpen = false; galleryPicker.launch("image/*") }
                )
                AttachMenuRow(
                  iconRes = R.drawable.ic_files,
                  label = "Files (PDF, text)",
                  onClick = { attachMenuOpen = false; taskFilePicker.launch("*/*") }
                )
              }
            }
            Spacer(modifier = Modifier.width(6.dp))
            Box(
              modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(colorScheme.onBackground.copy(alpha = 0.08f))
                .clickable { launchSpeech() },
              contentAlignment = Alignment.Center
            ) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(R.drawable.ic_mic),
                contentDescription = "Voice input",
                tint = colorScheme.onBackground,
                modifier = Modifier.size(15.dp)
              )
            }
            if (attachBusy) {
              Spacer(modifier = Modifier.width(8.dp))
              CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = colorScheme.onBackground.copy(alpha = 0.5f))
            }
          }
        }
      }
      val attachmentName = viewModel.newTaskAttachmentName
      if (attachmentName.isNotBlank()) {
        Spacer(modifier = Modifier.height(8.dp))
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(colorScheme.onBackground.copy(alpha = 0.08f))
            .padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
          Icon(
            if (viewModel.newTaskAttachmentImageDataUrl.isNotBlank()) Icons.Outlined.Image else Icons.Outlined.Description,
            contentDescription = null,
            tint = colorScheme.onBackground,
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            attachmentName,
            color = colorScheme.onBackground,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.widthIn(max = 200.dp)
          )
          Spacer(modifier = Modifier.width(8.dp))
          Icon(
            Icons.Outlined.Close,
            contentDescription = "Remove attachment",
            tint = colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.size(16.dp).clickable { viewModel.clearNewTaskAttachment() }
          )
        }
      }
      if (attachError) {
        Spacer(modifier = Modifier.height(6.dp))
        Text("Couldn't attach that — try a different file", color = Color(0xFFCC3333), fontSize = 12.sp)
      }
      Spacer(modifier = Modifier.height(12.dp))
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(colorScheme.onBackground.copy(alpha = 0.06f))
          .clickable { openPicker() }
          .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(Icons.Outlined.Schedule, contentDescription = null, tint = colorScheme.onBackground.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Text(
          pickedMillis?.let { displayFormat.format(java.util.Date(it)) } ?: "Pick date & time",
          color = if (pickedMillis != null) colorScheme.onBackground else colorScheme.onBackground.copy(alpha = 0.4f),
          fontSize = 15.sp
        )
      }
      Spacer(modifier = Modifier.height(20.dp))
      Button(
        onClick = {
          viewModel.addScheduledTask()
          onCreated()
        },
        enabled = viewModel.newTaskPrompt.isNotBlank() && pickedMillis != null,
        shape = RoundedCornerShape(28.dp),
        modifier = Modifier.fillMaxWidth().height(52.dp)
      ) {
        Text("Schedule", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
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

// Security tab's "Email" row used to show a fixed fake masked address
// ("nic***@****") to every signed-in user regardless of who they actually
// were. Keeps the first 2 characters of the real local part visible, masks
// the rest, and leaves the domain intact -- same shape real masked-email UI
// elsewhere uses, but derived from the account's own email.
private fun maskEmail(email: String?): String {
  if (email.isNullOrBlank()) return "-"
  val at = email.indexOf('@')
  if (at <= 0) return email
  val local = email.substring(0, at)
  val domain = email.substring(at)
  val visible = local.take(2)
  return "$visible***$domain"
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

// Unlike the flat SOURCES_START/END block, [[CITE:i]] (or [[CITE:i,j]] when
// several sources back the same claim) markers stay in the visible text --
// ai.ts splices them in right after the span they support, using the real
// end_index offsets OpenAI's url_citation annotations carry, indexing into
// this same SOURCES array. inlineMarkdown below turns each one into a
// tappable inline badge instead of stripping it.
private val CITE_TOKEN_RE = Regex("\\[\\[CITE:([0-9]+(?:,[0-9]+)*)]]")

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
            color = APP_TEXT_COLOR,
            // A hair bigger than before (was 15.sp) -- small, deliberate
            // bump to chat text specifically, not app-wide.
            fontSize = 16.sp,
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
            baseColor = Color.Black,
            fontSize = 16.sp,
            sources = verifiedSources
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
// "Quantara" only shows up for replies that look like an actual generated
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
  // Copy/Share/PDF/Quantara all deal in reader-facing text -- never leak the
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
  val accent = Color.Black

  fun push(caption: String?, destination: String) {
    if (pushState == "idle") {
      pushState = "pushing"
      onPushToExtra(caption, destination) { success ->
        pushState = if (success) "pushed" else "idle"
        Toast.makeText(
          context,
          if (success) "Sent to Quantara" else "Couldn't send — try again",
          Toast.LENGTH_SHORT
        ).show()
        if (success) extraStage = "none"
      }
    }
  }

  // Read Aloud/Stop is available on the user's own messages too (not just
  // AI replies) -- lets them hear a message spoken back in the selected
  // voice to check pronunciation, e.g. for Kiswahili/Sheng. Pulled out to a
  // local lambda since it sits in a different spot in the row for user vs.
  // AI messages (see below) rather than one fixed position for both.
  val readAloudItem: @Composable () -> Unit = {
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
  }

  Row(
    modifier = Modifier.horizontalScroll(rememberScrollState()),
    horizontalArrangement = Arrangement.spacedBy(2.dp)
  ) {
    ActionBarItemShell("Copy", Color(0xFFA8A8A8), onClick = {
      clipboard.setText(AnnotatedString(cleanContent))
    }) { tint -> Icon(painter = androidx.compose.ui.res.painterResource(R.drawable.ic_copy), contentDescription = null, tint = tint, modifier = Modifier.size(22.dp)) }
    if (isUser) {
      ActionBarItem(Icons.Outlined.Language, "Translate on-device", onClick = onTranslate)
      readAloudItem()
    } else {
      // Trimmed to the essentials shown inline (matching the generated-
      // image/video reply row: Copy/Share/Like/Dislike/Read Aloud/
      // Regenerate) -- Translate, Quantara, and PDF export moved into "More"
      // below instead of crowding the row for every single reply.
      ActionBarItem(androidx.compose.ui.res.painterResource(R.drawable.ic_share), "Share") {
        val intent = Intent(Intent.ACTION_SEND).apply {
          type = "text/plain"
          putExtra(Intent.EXTRA_TEXT, cleanContent)
        }
        context.startActivity(Intent.createChooser(intent, null))
      }
      ActionBarItem(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lucide_thumbs_up),
        label = "Like",
        tint = if (reaction == "up") accent else Color(0xFFA8A8A8)
      ) { reaction = if (reaction == "up") null else "up" }
      ActionBarItem(
        painter = androidx.compose.ui.res.painterResource(R.drawable.ic_lucide_thumbs_down),
        label = "Dislike",
        tint = if (reaction == "down") accent else Color(0xFFA8A8A8)
      ) { reaction = if (reaction == "down") null else "down" }
      readAloudItem()
      ActionBarItem(androidx.compose.ui.res.painterResource(R.drawable.ic_regenerate), "Regenerate", size = 18.dp, onClick = onRegenerate)
      Box {
        ActionBarItem(Icons.Outlined.MoreHoriz, "More") { moreOpen = true }
        DropdownMenu(
          expanded = moreOpen,
          onDismissRequest = { moreOpen = false },
          modifier = Modifier.width(230.dp),
          // Right-anchored to the "..." button instead of the default
          // top-start (which, this close to the screen's right edge, was
          // getting shoved back toward center by Compose's own off-screen
          // avoidance) -- per feedback, it should open from where the
          // button actually is.
          offset = DpOffset(x = (230 - 40).dp, y = 0.dp),
          shape = RoundedCornerShape(20.dp)
        ) {
          DropdownMenuItem(
            text = { Text("Translate on-device") },
            leadingIcon = { Icon(Icons.Outlined.Language, contentDescription = null, modifier = Modifier.size(22.dp)) },
            onClick = { moreOpen = false; onTranslate() }
          )
          if (cleanContent.length >= MESSAGE_PUSH_TO_EXTRA_MIN_LENGTH) {
            DropdownMenuItem(
              text = { Text(if (pushState == "pushed") "Sent to Quantara" else "Send to Quantara") },
              leadingIcon = {
                Icon(
                  painter = androidx.compose.ui.res.painterResource(R.drawable.ic_share),
                  contentDescription = null,
                  modifier = Modifier.size(22.dp)
                )
              },
              onClick = {
                moreOpen = false
                if (chatGizaMediaConnected) {
                  extraStage = "options"
                } else {
                  Toast.makeText(
                    context,
                    "Connect ChatGiZa with Quantara first — Quantara > + > Connect With ChatGiZa",
                    Toast.LENGTH_LONG
                  ).show()
                }
              }
            )
          }
          DropdownMenuItem(
            text = { Text("Export as PDF") },
            leadingIcon = { Icon(Icons.Outlined.Description, contentDescription = null, modifier = Modifier.size(22.dp)) },
            onClick = {
              moreOpen = false
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
          )
          DropdownMenuItem(
            text = { Text("Delete", color = APP_TEXT_COLOR) },
            leadingIcon = { DeleteIcon(tint = Color.Black, modifier = Modifier.size(22.dp)) },
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

// "Quantara" between Copy and Like. A single icon with a small dropdown-arrow
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

// Reached via the "Quantara" icon -- a bigger, full-weight sheet (matching
// the size of a real share sheet) instead of a cramped dropdown, offering
// the same two choices: "Post" goes straight to the preview step, straight
// through preview before it actually posts; "Caption" collects a caption
// first, then also lands on the preview.
@Composable
private fun ExtraOptionRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
  ExtraOptionRowShell(title, subtitle, onClick) {
    Icon(icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun ExtraOptionRow(painter: androidx.compose.ui.graphics.painter.Painter, title: String, subtitle: String, onClick: () -> Unit) {
  ExtraOptionRowShell(title, subtitle, onClick) {
    Icon(painter, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
  }
}

@Composable
private fun ExtraOptionRowShell(title: String, subtitle: String, onClick: () -> Unit, icon: @Composable () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(18.dp))
      .background(Color.Black.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(16.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Box(
      modifier = Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(Color.Black.copy(alpha = 0.14f)),
      contentAlignment = Alignment.Center
    ) {
      icon()
    }
    Spacer(modifier = Modifier.width(14.dp))
    Column(modifier = Modifier.weight(1f)) {
      Text(title, color = APP_TEXT_COLOR, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.height(2.dp))
      Text(subtitle, color = APP_TEXT_COLOR.copy(alpha = 0.55f), fontSize = 13.sp, lineHeight = 17.sp)
    }
    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.Black.copy(alpha = 0.4f), modifier = Modifier.size(20.dp))
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraOptionsSheet(onDismiss: () -> Unit, onPost: () -> Unit, onCaption: () -> Unit) {
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Text("Send to Quantara", color = APP_TEXT_COLOR, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "Choose how this reply goes to your Quantara profile. You'll see exactly how it looks before it's sent.",
        color = APP_TEXT_COLOR.copy(alpha = 0.6f),
        fontSize = 14.sp,
        lineHeight = 19.sp
      )
      Spacer(modifier = Modifier.height(20.dp))
      ExtraOptionRow(
        icon = Icons.Filled.Send,
        title = "Post",
        subtitle = "Send this reply to Quantara as-is.",
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
// laid out the way it'll actually appear on Quantara -- avatar, name,
// body text -- so something that reads wrong can be caught with "Edit"
// instead of only being noticed after it's already public.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExtraDestinationChip(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .background(if (selected) Color.Black else Color.Black.copy(alpha = 0.06f))
      .clickable(onClick = onClick)
      .padding(vertical = 12.dp),
    contentAlignment = Alignment.Center
  ) {
    Text(
      label,
      color = if (selected) Color.White else Color.Black.copy(alpha = 0.8f),
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
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 24.dp)
        .padding(bottom = 36.dp, top = 4.dp)
    ) {
      Text("Preview", color = APP_TEXT_COLOR, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(4.dp))
      Text(
        "This is how it'll look on Quantara.",
        color = APP_TEXT_COLOR.copy(alpha = 0.6f),
        fontSize = 14.sp
      )
      Spacer(modifier = Modifier.height(18.dp))
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(20.dp))
          .background(Color.Black.copy(alpha = 0.05f))
          .border(1.dp, Color.Black.copy(alpha = 0.08f), RoundedCornerShape(20.dp))
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
            Icon(Icons.Outlined.AccountCircle, contentDescription = null, tint = Color.Black, modifier = Modifier.size(38.dp))
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(authorName, color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text("Just now", color = APP_TEXT_COLOR.copy(alpha = 0.5f), fontSize = 12.sp)
          }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
          if (bodyText.length > 400) bodyText.take(400) + "…" else bodyText,
          color = APP_TEXT_COLOR.copy(alpha = 0.9f),
          fontSize = 14.sp,
          lineHeight = 20.sp
        )
        if (!caption.isNullOrBlank()) {
          Spacer(modifier = Modifier.height(10.dp))
          Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Color.Black.copy(alpha = 0.08f)))
          Spacer(modifier = Modifier.height(10.dp))
          Text(
            caption,
            color = APP_TEXT_COLOR.copy(alpha = 0.75f),
            fontSize = 14.sp,
            lineHeight = 20.sp,
            fontStyle = FontStyle.Italic
          )
        }
      }
      Spacer(modifier = Modifier.height(20.dp))
      Text("Where should this go?", color = APP_TEXT_COLOR, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
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
            containerColor = Color.Black,
            disabledContainerColor = Color.Black.copy(alpha = 0.5f)
          ),
          shape = RoundedCornerShape(24.dp),
          modifier = Modifier.weight(1f).height(52.dp)
        ) {
          Text(if (posting) "Posting…" else "Post to Quantara", color = Color.White, fontWeight = FontWeight.SemiBold)
        }
      }
    }
  }
}

// Reached via "Quantara" -> "Caption": a short caption the user writes
// themselves, which lands under the reply's own text when posted to
// Quantara (ChatViewModel.pushReplyToExtraMedia builds the combined
// text; this sheet only collects the caption itself). Bigger and more
// explanatory than a bare text box -- an icon badge, a heading, and a
// line explaining what happens on submit, closer to the rest of the
// app's sheets (e.g. ConnectWithChatGizaSheet) than the plain composer
// this replaced.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CaptionComposerSheet(onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
  var text by remember { mutableStateOf("") }
  ModalBottomSheet(onDismissRequest = onDismiss, containerColor = APP_BACKGROUND) {
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
          .background(Color.Black.copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(Icons.Filled.Send, contentDescription = null, tint = Color.Black, modifier = Modifier.size(24.dp))
      }
      Spacer(modifier = Modifier.height(16.dp))
      Text("Add a caption", color = APP_TEXT_COLOR, fontSize = 21.sp, fontWeight = FontWeight.Bold)
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        "This reply becomes the post; what you write below is added underneath it on your Quantara profile.",
        color = APP_TEXT_COLOR.copy(alpha = 0.6f),
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
            .background(Color.Black.copy(alpha = 0.06f))
            .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
          if (text.isEmpty()) {
            Text("Write a caption for this post…", color = Color(0xFF6E6E6E), fontSize = 15.sp)
          }
          BasicTextField(
            value = text,
            onValueChange = { text = it },
            textStyle = androidx.compose.ui.text.TextStyle(color = APP_TEXT_COLOR, fontSize = 15.sp, lineHeight = 20.sp),
            cursorBrush = SolidColor(Color.Black),
            modifier = Modifier.fillMaxWidth()
          )
        }
        IconButton(
          onClick = { if (text.isNotBlank()) onSubmit(text.trim()) },
          enabled = text.isNotBlank(),
          modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(if (text.isNotBlank()) Color.Black else Color.Black.copy(alpha = 0.35f))
        ) {
          Icon(Icons.Filled.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(22.dp))
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
      raw.startsWith("[[CITE:", idx) -> {
        val end = raw.indexOf("]]", idx + 7)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          appendInlineContent("cite:" + raw.substring(idx + 7, end), "•")
          idx = end + 2
        }
      }
      raw.startsWith("**", idx) -> {
        val end = raw.indexOf("**", idx + 2)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          // SemiBold, not Bold -- against the Medium-weight body text
          // around it (see MarkdownText's Paragraph/Bullet/Numbered rows),
          // full Bold read as too heavy/thick compared to the reference.
          withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(raw.substring(idx + 2, end)) }
          idx = end + 2
        }
      }
      raw.startsWith("`", idx) -> {
        val end = raw.indexOf("`", idx + 1)
        if (end == -1) {
          append(raw.substring(idx)); idx = len
        } else {
          withStyle(
            SpanStyle(fontFamily = FontFamily.Monospace, background = Color.Black.copy(alpha = 0.1f))
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

// A small inline favicon badge for a [[CITE:i]] / [[CITE:i,j]] marker --
// tapping it opens the article directly when it backs a single source, or
// opens a picker sheet when several sources land at the same point, rather
// than only ever listing everything at the very end (see SourceTrail).
@Composable
private fun CiteBadge(sources: List<VerifiedSource>, onOpenSingle: (String) -> Unit, onChoose: (List<VerifiedSource>) -> Unit) {
  if (sources.isEmpty()) return
  Row(
    verticalAlignment = Alignment.CenterVertically,
    modifier = Modifier
      .padding(horizontal = 2.dp)
      .clip(RoundedCornerShape(50))
      .background(colorScheme.onBackground.copy(alpha = 0.08f))
      .clickable {
        if (sources.size == 1) onOpenSingle(sources[0].url) else onChoose(sources)
      }
      .padding(horizontal = if (sources.size > 1) 4.dp else 3.dp, vertical = 2.dp)
  ) {
    sources.take(2).forEachIndexed { i, source ->
      AsyncImage(
        model = "https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(source.url)}",
        contentDescription = null,
        modifier = Modifier
          .size(14.dp)
          .clip(CircleShape)
          .then(if (i > 0) Modifier.offset(x = (-5).dp) else Modifier)
      )
    }
    if (sources.size > 2) {
      Text(
        "+${sources.size - 2}",
        color = colorScheme.onBackground.copy(alpha = 0.55f),
        fontSize = 9.sp,
        modifier = Modifier.padding(start = 1.dp)
      )
    }
  }
}

@Composable
private fun MarkdownText(
  text: String,
  baseColor: Color,
  fontSize: TextUnit,
  sources: List<VerifiedSource> = emptyList(),
  modifier: Modifier = Modifier
) {
  val blocks = remember(text) { parseMarkdownBlocks(text) }
  val context = LocalContext.current
  var chooserSources by remember { mutableStateOf<List<VerifiedSource>?>(null) }
  val citeIds = remember(text) { CITE_TOKEN_RE.findAll(text).map { it.groupValues[1] }.toSet() }
  val inlineContentMap = remember(citeIds, sources) {
    citeIds.associateWith { ids ->
      val matched = ids.split(",").mapNotNull { it.trim().toIntOrNull() }.mapNotNull { sources.getOrNull(it) }
      InlineTextContent(
        Placeholder(
          width = fontSize * (if (matched.size > 1) 2.4f else 1.35f),
          height = fontSize * 1.15f,
          placeholderVerticalAlign = PlaceholderVerticalAlign.Center
        )
      ) {
        CiteBadge(
          sources = matched,
          onOpenSingle = { url -> runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } },
          onChoose = { chooserSources = it }
        )
      }
    }.mapKeys { "cite:${it.key}" }
  }
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
          },
          inlineContent = inlineContentMap
        )
        is MdBlock.Paragraph -> Text(text = inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium, inlineContent = inlineContentMap)
        is MdBlock.Bullet -> Row {
          Text("•  ", color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium, inlineContent = inlineContentMap, modifier = Modifier.weight(1f))
        }
        is MdBlock.Numbered -> Row {
          Text("${block.index}.  ", color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium)
          Text(inlineMarkdown(block.text), color = baseColor, fontSize = fontSize, fontWeight = FontWeight.Medium, inlineContent = inlineContentMap, modifier = Modifier.weight(1f))
        }
        is MdBlock.CodeBlock -> Box(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color.Black.copy(alpha = 0.06f))
            .padding(10.dp)
        ) {
          Text(block.code, color = baseColor, fontFamily = FontFamily.Monospace, fontSize = fontSize * 0.9f)
        }
      }
    }
  }
  val pickSources = chooserSources
  if (pickSources != null) {
    ModalBottomSheet(onDismissRequest = { chooserSources = null }) {
      Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).padding(bottom = 24.dp)) {
        Text(
          "Choose a source",
          color = colorScheme.onBackground,
          fontSize = 14.sp,
          fontWeight = FontWeight.SemiBold,
          modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
        )
        pickSources.forEach { source ->
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(10.dp))
              .clickable {
                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(source.url))) }
                chooserSources = null
              }
              .padding(horizontal = 8.dp, vertical = 10.dp)
          ) {
            AsyncImage(
              model = "https://www.google.com/s2/favicons?sz=32&domain=${sourceDomain(source.url)}",
              contentDescription = null,
              modifier = Modifier.size(18.dp).clip(RoundedCornerShape(4.dp))
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text(source.title, color = colorScheme.onBackground.copy(alpha = 0.9f), fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
              Text(sourceDomain(source.url), color = colorScheme.onBackground.copy(alpha = 0.4f), fontSize = 11.sp, maxLines = 1)
            }
          }
        }
      }
    }
  }
}

