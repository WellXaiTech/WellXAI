package com.wellxai.chatgiza.ui.media

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.automirrored.outlined.ListAlt
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt
import coil.compose.AsyncImage
import com.wellxai.chatgiza.ApiMediaPost
import com.wellxai.chatgiza.ChatViewModel
import com.wellxai.chatgiza.ChatGizaMediaPostComposerScreen
import com.wellxai.chatgiza.ConnectWithChatGizaSheet
import com.wellxai.chatgiza.MEDIA_POST_TEXT_PREVIEW_LENGTH
import com.wellxai.chatgiza.MediaCommentComposerSheet
import com.wellxai.chatgiza.MediaPostComments
import com.wellxai.chatgiza.MediaPostVideoPlayer
import com.wellxai.chatgiza.formatMediaPostTimeAgo

// =============================================================
// CHATGIZA MEDIA -- white/monochrome feed screen (reference layout):
//   HEADER (+ / ChatGiZa, hides on scroll-down, reappears on scroll-up)
//   VERTICAL FEED (avatar/name/time, media carousel, actions, caption)
//   BOTTOM NAV (Home / Media / Create / Search / Profile)
// Lives in its own file/package -- the composer, create-type sheet,
// comment sheet, and video player are reused from MainActivity.kt
// (exposed there as `internal`) rather than duplicated here.
// =============================================================

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatGiZaMediaScreen(viewModel: ChatViewModel) {
  BackHandler { viewModel.closeChatGizaMedia() }

  var showConnectSheet by remember { mutableStateOf(false) }
  var showPostComposer by remember { mutableStateOf(false) }
  // "post" from the bottom-nav Create button, "status" from the Stories
  // row's Create Story card -- both open the same composer, just tagged
  // for a different feed per ApiMediaPost.destination.
  var composerDestination by remember { mutableStateOf("post") }
  var replyingToPost by remember { mutableStateOf<ApiMediaPost?>(null) }
  var expandedCommentsPostId by remember { mutableStateOf<String?>(null) }
  var searchOpen by remember { mutableStateOf(false) }
  var searchQuery by remember { mutableStateOf("") }
  var viewingProfile by remember { mutableStateOf<ProfileTarget?>(null) }
  var showNotifications by remember { mutableStateOf(false) }
  var fullscreenPostId by remember { mutableStateOf<String?>(null) }
  var fullscreenPage by remember { mutableStateOf(0) }

  // "status"-destination posts predate the removal of the My Story row --
  // excluding them keeps any old ones from resurfacing in the feed now
  // that there's no stories UI to have shown them in the first place.
  val feedEligiblePosts = remember(viewModel.mediaPosts) {
    viewModel.mediaPosts.filter { it.destination != "status" }
  }
  // One card per author's most recent status/both post with a photo --
  // mediaPosts is newest-first, so distinctBy keeps each author's latest.
  // No auto-advancing story-viewer exists yet, so tapping a card opens the
  // same fullscreen photo viewer regular posts use (see fullscreenPostId
  // below) rather than leaving this dead until that gets built.
  val storyPosts = remember(viewModel.mediaPosts) {
    viewModel.mediaPosts
      .filter { (it.destination == "status" || it.destination == "both") && it.imageUrls.isNotEmpty() }
      .distinctBy { it.authorId }
  }
  val visiblePosts = remember(feedEligiblePosts, searchQuery) {
    val q = searchQuery.trim()
    if (q.isEmpty()) feedEligiblePosts
    else feedEligiblePosts.filter { it.text.contains(q, ignoreCase = true) || it.authorName.contains(q, ignoreCase = true) }
  }

  // Extra Media's own light/dark toggle (Extra Settings), independent of
  // the main app's appearance setting -- flips backgrounds white<->black
  // and icon/text black<->white across this whole section, leaving
  // deliberately-dark accents (vote/comment pills, photo overlays, the
  // fullscreen image viewer) unchanged since those aren't the page theme.
  val isDark = viewModel.extraDarkMode
  val bg = if (isDark) Color.Black else Color.White
  val fg = if (isDark) Color.White else Color.Black

  var showHeader by remember { mutableStateOf(true) }
  val listState = rememberLazyListState()
  var previousScrollPosition by remember { mutableIntStateOf(0) }

  LaunchedEffect(listState.firstVisibleItemIndex) {
    val currentPosition = listState.firstVisibleItemIndex
    if (currentPosition > previousScrollPosition) {
      showHeader = false
    } else if (currentPosition < previousScrollPosition) {
      showHeader = true
    }
    previousScrollPosition = currentPosition
  }

  LaunchedEffect(Unit) { viewModel.loadMediaPosts() }

  // Edge-to-edge is on for this app, so this screen has to reserve its
  // own status/navigation-bar insets rather than relying on a Scaffold.
  val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
  val bottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
  val headerHeight = 70.dp + topInset
  val navHeight = 70.dp + bottomInset

  Box(modifier = Modifier.fillMaxSize().background(bg)) {

    LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {

      item { Spacer(modifier = Modifier.height(if (showHeader) headerHeight else 0.dp)) }

      item {
        MediaStoriesRow(
          isDark = isDark,
          userName = viewModel.userName,
          userImage = viewModel.userImage,
          storyPosts = storyPosts,
          onCreateStory = {
            composerDestination = "status"
            showPostComposer = true
          },
          onOpenStory = { post -> fullscreenPostId = post.id; fullscreenPage = 0 }
        )
      }

      if (searchOpen) {
        item {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .padding(horizontal = 14.dp, vertical = 8.dp)
              .height(38.dp)
              .clip(RoundedCornerShape(19.dp))
              .background(if (isDark) Color(0xFF1F1F1F) else Color(0xFFF0F0F0))
              .padding(horizontal = 12.dp)
          ) {
            Icon(Icons.Filled.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Box(modifier = Modifier.weight(1f)) {
              if (searchQuery.isEmpty()) {
                Text("Search posts", color = Color.Gray, fontSize = 13.sp)
              }
              BasicTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(color = fg, fontSize = 13.sp),
                cursorBrush = SolidColor(fg),
                modifier = Modifier.fillMaxWidth()
              )
            }
          }
        }
      }

      if (visiblePosts.isEmpty()) {
        item {
          Box(modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
            if (viewModel.loadingMediaPosts) {
              CircularProgressIndicator(color = fg, modifier = Modifier.size(28.dp))
            } else if (searchQuery.isNotEmpty()) {
              Text("No matches.", color = Color.Gray, fontSize = 14.sp)
            }
            // Otherwise left empty on purpose -- no placeholder icon/text.
          }
        }
      } else {
        items(visiblePosts, key = { it.id }) { post ->
          MediaPost(
            post = post,
            isDark = isDark,
            isOwnPost = post.authorId == viewModel.userId,
            commentsExpanded = expandedCommentsPostId == post.id,
            comments = viewModel.mediaComments[post.id],
            onLikeClick = { viewModel.toggleMediaPostLike(post.id) },
            onToggleComments = {
              if (expandedCommentsPostId == post.id) {
                expandedCommentsPostId = null
              } else {
                expandedCommentsPostId = post.id
                viewModel.loadMediaComments(post.id)
              }
            },
            onDeleteClick = { viewModel.removeMediaPost(post.id) },
            onOpenComposer = { replyingToPost = post },
            onOpenProfile = { viewingProfile = ProfileTarget(post.authorId, post.authorName, post.authorImage) },
            onOpenFullscreen = { page -> fullscreenPostId = post.id; fullscreenPage = page }
          )
        }
      }

      item { Spacer(modifier = Modifier.height(navHeight + 10.dp)) }
    }

    val replyTarget = replyingToPost
    if (replyTarget != null) {
      MediaCommentComposerSheet(
        authorName = replyTarget.authorName,
        onDismiss = { replyingToPost = null },
        onSubmit = { text -> viewModel.addMediaComment(replyTarget.id, text) }
      )
    }

    // =====================================================
    // CHATGIZA HEADER
    // =====================================================

    AnimatedVisibility(
      visible = showHeader,
      enter = slideInVertically(initialOffsetY = { -it }),
      exit = slideOutVertically(targetOffsetY = { -it }),
      modifier = Modifier.align(Alignment.TopCenter)
    ) {
      ChatGiZaComposerBar(
        topInset = topInset,
        isDark = isDark,
        userName = viewModel.userName,
        userImage = viewModel.userImage,
        onComposerClick = {
          composerDestination = "post"
          showPostComposer = true
        }
      )
    }

    if (showNotifications) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color.Black.copy(alpha = 0.4f))
          .clickable(
            indication = null,
            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
          ) { showNotifications = false },
        contentAlignment = Alignment.Center
      ) {
        Column(
          modifier = Modifier
            .padding(horizontal = 40.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .clickable(
              indication = null,
              interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
            ) { }
            .padding(28.dp),
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          Icon(
            androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_bell),
            contentDescription = null,
            tint = fg,
            modifier = Modifier.size(32.dp)
          )
          Spacer(modifier = Modifier.height(12.dp))
          Text("No notifications yet", color = fg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
          Spacer(modifier = Modifier.height(4.dp))
          Text("We'll let you know when something happens.", color = Color.Gray, fontSize = 12.sp)
        }
      }
    }

    // =====================================================
    // BOTTOM NAVIGATION
    // =====================================================

    MediaBottomNavigation(
      viewModel = viewModel,
      isDark = isDark,
      onCreateClick = {
        composerDestination = "post"
        showPostComposer = true
      },
      onProfileClick = {
        val uid = viewModel.userId
        if (uid != null) viewingProfile = ProfileTarget(uid, viewModel.userName ?: "You", viewModel.userImage)
      },
      onMenuClick = { showConnectSheet = true },
      modifier = Modifier.align(Alignment.BottomCenter)
    )

    val profileTarget = viewingProfile
    if (profileTarget != null) {
      MediaProfileScreen(
        viewModel = viewModel,
        target = profileTarget,
        onBack = { viewingProfile = null }
      )
    }

    // Draggable floating shortcut into the AI Agent tool, styled after
    // Binance's floating assistant button -- Extra Media only, per request.
    // Selecting the tool no longer leaves Extra: it used to close straight
    // back to Ask, which read as the button unexpectedly kicking you out.
    GizaProFloatingAgent(
      modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = navHeight + 24.dp),
      onClick = { viewModel.selectTool("ai_agent") }
    )

    val fullscreenPost = viewModel.mediaPosts.firstOrNull { it.id == fullscreenPostId }
    if (fullscreenPost != null) {
      MediaPostFullscreenViewer(
        post = fullscreenPost,
        initialPage = fullscreenPage,
        onLikeClick = { viewModel.toggleMediaPostLike(fullscreenPost.id) },
        onToggleComments = {
          expandedCommentsPostId = fullscreenPost.id
          viewModel.loadMediaComments(fullscreenPost.id)
          fullscreenPostId = null
        },
        onDismiss = { fullscreenPostId = null }
      )
    }
  }

  if (showConnectSheet) {
    ConnectWithChatGizaSheet(viewModel, onDismiss = { showConnectSheet = false })
  }

  if (showPostComposer) {
    ChatGizaMediaPostComposerScreen(viewModel, onDismiss = { showPostComposer = false }, destination = composerDestination)
  }
}

// Draggable floating shortcut to GiZa Pro's AI Agent, shaped like Binance's
// floating assistant button -- a rotated rounded square, freely draggable
// around the screen. Position resets to the default corner each time this
// screen (Extra Media) is re-entered, since it isn't meant to persist.
@Composable
private fun GizaProFloatingAgent(onClick: () -> Unit, modifier: Modifier = Modifier) {
  var offsetX by remember { mutableStateOf(0f) }
  var offsetY by remember { mutableStateOf(0f) }
  Box(
    modifier = modifier
      .offset { IntOffset(offsetX.roundToInt(), offsetY.roundToInt()) }
      .size(52.dp)
      .pointerInput(Unit) {
        detectDragGestures { change, dragAmount ->
          change.consume()
          offsetX += dragAmount.x
          offsetY += dragAmount.y
        }
      }
      .rotate(45f)
      .clip(RoundedCornerShape(16.dp))
      .background(Color(0xFFFFC94A))
      .border(width = 1.dp, color = Color.Black.copy(alpha = 0.15f), shape = RoundedCornerShape(16.dp))
      .clickable(onClick = onClick),
    contentAlignment = Alignment.Center
  ) {
    Icon(
      Icons.Outlined.WorkspacePremium,
      contentDescription = "GiZa Pro",
      tint = Color.Black,
      modifier = Modifier.rotate(-45f).size(24.dp)
    )
  }
}

data class ProfileTarget(val authorId: String, val authorName: String, val authorImage: String?)

// A handful of solid colors, picked deterministically by name (same color
// every time for a given account, varied across accounts) so an avatar-less
// account gets a real identity-looking circle -- its initial, centered --
// instead of a generic gray person-silhouette icon.
private val MEDIA_AVATAR_COLORS = listOf(
  Color(0xFF6D5DF6), Color(0xFFFF6B6B), Color(0xFF11998E),
  Color(0xFFF7971E), Color(0xFFEE0979), Color(0xFF0072FF)
)

@Composable
private fun MediaInitialAvatar(name: String, size: androidx.compose.ui.unit.Dp, modifier: Modifier = Modifier) {
  val letter = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
  val bg = MEDIA_AVATAR_COLORS[kotlin.math.abs(name.hashCode()) % MEDIA_AVATAR_COLORS.size]
  Box(modifier = modifier.size(size).clip(CircleShape).background(bg), contentAlignment = Alignment.Center) {
    Text(letter, color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.42f).sp)
  }
}

// =============================================================
// CHATGIZA HEADER
// =============================================================

// Was a hamburger + "Find anything" search pill + bell -- replaced with
// the Facebook-style "What's on your mind?" composer row (the menu action
// moved down to the bottom nav, see MediaBottomNavigation; search/
// notifications had no other entry point named for them, so they're gone
// for now rather than left half-wired to nothing).
@Composable
private fun ChatGiZaComposerBar(
  topInset: androidx.compose.ui.unit.Dp,
  isDark: Boolean,
  userName: String?,
  userImage: String?,
  onComposerClick: () -> Unit
) {
  val bg = if (isDark) Color.Black else Color.White
  val fg = if (isDark) Color.White else Color.Black
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .background(bg)
      .padding(top = topInset)
      .height(70.dp)
      .padding(horizontal = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    if (userImage != null) {
      AsyncImage(
        model = userImage,
        contentDescription = "Profile",
        modifier = Modifier.size(38.dp).clip(CircleShape).clickable(onClick = onComposerClick),
        contentScale = ContentScale.Crop
      )
    } else {
      MediaInitialAvatar(
        name = userName ?: "You",
        size = 38.dp,
        modifier = Modifier.clickable(onClick = onComposerClick)
      )
    }
    Spacer(modifier = Modifier.width(10.dp))
    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .weight(1f)
        .height(46.dp)
        .clip(RoundedCornerShape(23.dp))
        .background(if (isDark) Color(0xFF1F1F1F) else Color(0xFFF0F0F0))
        .border(width = 1.5.dp, color = if (isDark) Color(0xFF3A3A3A) else Color(0xFFD6D6D6), shape = RoundedCornerShape(23.dp))
        .clickable(onClick = onComposerClick)
        .padding(horizontal = 14.dp)
    ) {
      Text("What's on your mind?", color = Color.Gray, fontSize = 14.sp)
    }
    Spacer(modifier = Modifier.width(4.dp))
    IconButton(onClick = onComposerClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_add_person),
        contentDescription = "Add photo",
        tint = fg,
        modifier = Modifier.size(22.dp)
      )
    }
  }
}

// =============================================================
// STORIES ROW -- "Create story" (own avatar + blue "+" badge) first, then
// one card per author with a recent status/both post. A story is a
// distinct concept from a regular feed post (ApiMediaPost.destination:
// "post" = feed only, "status" = this row only, "both" = shows in
// either), not just an album/feed post reused with different framing.
// =============================================================

private val MEDIA_STORY_CARD_WIDTH = 100.dp
private val MEDIA_STORY_CARD_HEIGHT = 160.dp

@Composable
private fun MediaStoriesRow(
  isDark: Boolean,
  userName: String?,
  userImage: String?,
  storyPosts: List<ApiMediaPost>,
  onCreateStory: () -> Unit,
  onOpenStory: (ApiMediaPost) -> Unit
) {
  val cardShape = RoundedCornerShape(14.dp)
  val scrimBrush = Brush.verticalGradient(
    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.75f)),
    startY = 60f
  )
  LazyRow(
    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 14.dp),
    horizontalArrangement = Arrangement.spacedBy(8.dp)
  ) {
    item {
      Box(
        modifier = Modifier
          .width(MEDIA_STORY_CARD_WIDTH)
          .height(MEDIA_STORY_CARD_HEIGHT)
          .clip(cardShape)
          .background(if (isDark) Color(0xFF1F1F1F) else Color(0xFFF0F0F0))
          .clickable(onClick = onCreateStory)
      ) {
        if (userImage != null) {
          AsyncImage(
            model = userImage,
            contentDescription = null,
            modifier = Modifier.fillMaxWidth().height(MEDIA_STORY_CARD_HEIGHT - 46.dp),
            contentScale = ContentScale.Crop
          )
        } else {
          Box(modifier = Modifier.fillMaxWidth().height(MEDIA_STORY_CARD_HEIGHT - 46.dp))
        }
        Box(modifier = Modifier.fillMaxWidth().height(46.dp).align(Alignment.BottomCenter).background(if (isDark) Color.Black else Color.White))
        Box(
          modifier = Modifier
            .align(Alignment.BottomCenter)
            .offset(y = (-23).dp)
            .size(34.dp)
            .clip(CircleShape)
            .background(Color(0xFF1877F2)),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Filled.AddCircle, contentDescription = "Create story", tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Text(
          "Create story",
          color = if (isDark) Color.White else Color.Black,
          fontSize = 11.sp,
          fontWeight = FontWeight.SemiBold,
          modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 6.dp)
        )
      }
    }

    items(storyPosts, key = { it.id }) { post ->
      Box(
        modifier = Modifier
          .width(MEDIA_STORY_CARD_WIDTH)
          .height(MEDIA_STORY_CARD_HEIGHT)
          .clip(cardShape)
          .clickable { onOpenStory(post) }
      ) {
        AsyncImage(
          model = post.imageUrls[0],
          contentDescription = post.authorName,
          modifier = Modifier.fillMaxSize(),
          contentScale = ContentScale.Crop
        )
        Box(modifier = Modifier.fillMaxSize().background(scrimBrush))
        if (post.authorImage != null) {
          AsyncImage(
            model = post.authorImage,
            contentDescription = null,
            modifier = Modifier
              .padding(8.dp)
              .size(30.dp)
              .clip(CircleShape)
              .border(2.dp, Color(0xFF1877F2), CircleShape),
            contentScale = ContentScale.Crop
          )
        } else {
          Box(
            modifier = Modifier
              .padding(8.dp)
              .size(30.dp)
              .clip(CircleShape)
              .border(2.dp, Color(0xFF1877F2), CircleShape)
          ) {
            MediaInitialAvatar(name = post.authorName, size = 30.dp)
          }
        }
        Text(
          post.authorName,
          color = Color.White,
          fontSize = 12.sp,
          fontWeight = FontWeight.SemiBold,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)
        )
      }
    }
  }
}

// =============================================================
// MEDIA POST
// =============================================================

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MediaPost(
  post: ApiMediaPost,
  isDark: Boolean,
  isOwnPost: Boolean,
  commentsExpanded: Boolean,
  comments: List<com.wellxai.chatgiza.ApiMediaComment>?,
  onLikeClick: () -> Unit,
  onToggleComments: () -> Unit,
  onOpenComposer: () -> Unit,
  onOpenProfile: () -> Unit,
  onDeleteClick: () -> Unit,
  onOpenFullscreen: (Int) -> Unit
) {
  val context = LocalContext.current
  val pagerState = rememberPagerState(pageCount = { post.imageUrls.size })
  var textExpanded by remember(post.id) { mutableStateOf(false) }
  var following by remember(post.id) { mutableStateOf(false) }
  var moreMenuOpen by remember(post.id) { mutableStateOf(false) }
  val isLongText = post.text.length > MEDIA_POST_TEXT_PREVIEW_LENGTH
  val bg = if (isDark) Color.Black else Color.White
  val fg = if (isDark) Color.White else Color.Black
  // Local-only "not interested" dismiss (the X next to "..." in the
  // reference layout) -- no backend concept of a hidden post exists yet,
  // so this just drops the card from view for the rest of this session.
  var dismissed by remember(post.id) { mutableStateOf(false) }
  if (dismissed) return

  Column(modifier = Modifier.fillMaxWidth().background(bg)) {

    // =====================================================
    // POST HEADER -- Follow + "..." menu pinned to the far
    // trailing edge, matching the reference screenshot.
    // =====================================================

    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(start = 14.dp, end = 4.dp, top = 12.dp, bottom = 10.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      if (post.authorImage != null) {
        AsyncImage(
          model = post.authorImage,
          contentDescription = "Profile",
          modifier = Modifier.size(44.dp).clip(CircleShape).clickable(onClick = onOpenProfile),
          contentScale = ContentScale.Crop
        )
      } else {
        MediaInitialAvatar(
          name = post.authorName,
          size = 44.dp,
          modifier = Modifier.clickable(onClick = onOpenProfile)
        )
      }

      Spacer(modifier = Modifier.width(10.dp))

      Column(modifier = Modifier.weight(1f).clickable(onClick = onOpenProfile)) {
        Text(text = post.authorName, color = fg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(text = formatMediaPostTimeAgo(post.createdAt), fontSize = 12.sp, color = Color.Gray)
          Spacer(modifier = Modifier.width(4.dp))
          // Every post here is public (no private/friends-only concept
          // exists yet) -- the globe just marks that, matching the
          // reference layout's "5h · <globe>" line under the name.
          Icon(Icons.Outlined.Public, contentDescription = "Public", tint = Color.Gray, modifier = Modifier.size(12.dp))
        }
      }

      if (!isOwnPost) {
        OutlinedButton(
          onClick = { following = !following },
          shape = RoundedCornerShape(percent = 50),
          colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = fg),
          border = androidx.compose.foundation.BorderStroke(1.dp, fg.copy(alpha = 0.4f)),
          contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 14.dp, vertical = 0.dp),
          modifier = Modifier.height(30.dp)
        ) {
          Text(if (following) "Following" else "Follow", fontSize = 12.sp)
        }
        Spacer(modifier = Modifier.width(2.dp))
      }

      Box {
        IconButton(
          onClick = { moreMenuOpen = true },
          modifier = Modifier.size(36.dp)
        ) {
          Icon(Icons.Filled.MoreVert, contentDescription = "More", tint = fg)
        }
        androidx.compose.material3.DropdownMenu(
          expanded = moreMenuOpen,
          onDismissRequest = { moreMenuOpen = false },
          modifier = Modifier.background(bg)
        ) {
          if (isOwnPost) {
            androidx.compose.material3.DropdownMenuItem(
              text = { Text("Delete", color = Color(0xFFFF4D4D)) },
              onClick = {
                moreMenuOpen = false
                onDeleteClick()
              }
            )
          } else {
            androidx.compose.material3.DropdownMenuItem(
              text = { Text("Report", color = fg) },
              onClick = {
                moreMenuOpen = false
                Toast.makeText(context, "Report — coming soon", Toast.LENGTH_SHORT).show()
              }
            )
          }
        }
      }

      IconButton(
        onClick = { dismissed = true },
        modifier = Modifier.size(36.dp)
      ) {
        Icon(Icons.Outlined.Close, contentDescription = "Dismiss", tint = fg)
      }
    }

    // =====================================================
    // CAPTION -- ABOVE THE IMAGE, right under the header.
    // =====================================================

    if (post.text.isNotEmpty()) {
      val shownText = if (isLongText && !textExpanded) post.text.take(MEDIA_POST_TEXT_PREVIEW_LENGTH) else post.text
      Text(
        text = buildAnnotatedString {
          append(shownText)
          if (isLongText && !textExpanded) {
            withStyle(SpanStyle(color = fg, fontWeight = FontWeight.Bold)) {
              append(" ... more")
            }
          }
        },
        modifier = Modifier
          .fillMaxWidth()
          .padding(start = 14.dp, end = 14.dp, bottom = 12.dp)
          .let { if (isLongText) it.clickable { textExpanded = !textExpanded } else it },
        color = fg,
        fontSize = 14.sp,
        lineHeight = 20.sp
      )
    }

    // =====================================================
    // LARGE MEDIA CAROUSEL / VIDEO -- inset with rounded corners and a
    // bordered background instead of full-bleed, matching how X frames
    // an attached image/video rather than the old edge-to-edge look.
    // =====================================================

    val mediaShape = RoundedCornerShape(16.dp)
    val mediaBorder = if (isDark) Color(0xFF2E2E2E) else Color(0xFFE2E2E2)
    val mediaBg = if (isDark) Color(0xFF141414) else Color(0xFFF2F2F2)

    if (post.imageUrls.isNotEmpty()) {
      // Was a hard-locked aspectRatio(1f) -- every image, whatever its own
      // shape, got center-cropped into a square, which mangled tall
      // portrait photos badly enough to read as "rejected". Instagram/
      // X-style instead: the box takes on the real image's own ratio,
      // clamped to a sane range (0.8 = a bit taller than square, the
      // portrait cap most feeds use; 1.91 = the wide/landscape cap) so an
      // extreme panorama or an extreme full-length portrait still gets a
      // reasonable card instead of an unusably thin sliver or a wall.
      var imageAspect by remember(post.id) { mutableStateOf(1f) }
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 14.dp)
          .aspectRatio(imageAspect.coerceIn(0.8f, 1.91f))
          .clip(mediaShape)
          .background(mediaBg)
          .border(1.dp, mediaBorder, mediaShape)
      ) {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
          AsyncImage(
            model = post.imageUrls[page],
            contentDescription = "Post image",
            modifier = Modifier.fillMaxSize().clickable { onOpenFullscreen(page) },
            contentScale = ContentScale.Crop,
            // Crop's default alignment is Center, which trims a tall
            // portrait photo equally from top and bottom -- for a person
            // photographed head-to-toe that crops the head/face away
            // whenever the card is shorter than the real photo, losing
            // the part of the image that actually matters. Top-aligned
            // instead: any trimming needed to fit the clamped card comes
            // off the bottom, and the top of the image always stays
            // fully visible. The full, uncropped photo is still one tap
            // away in MediaPostFullscreenViewer either way.
            alignment = Alignment.TopCenter,
            onSuccess = { state ->
              val d = state.result.drawable
              if (page == 0 && d.intrinsicWidth > 0 && d.intrinsicHeight > 0) {
                imageAspect = d.intrinsicWidth.toFloat() / d.intrinsicHeight.toFloat()
              }
            }
          )
        }
      }
      if (post.imageUrls.size > 1) {
        Text(
          text = "${pagerState.currentPage + 1}/${post.imageUrls.size}",
          modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
          fontSize = 12.sp,
          color = Color.Gray
        )
      }
    } else if (post.videoUrl != null) {
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = 14.dp)
          .aspectRatio(1f)
          .clip(mediaShape)
          .background(mediaBg)
          .border(1.dp, mediaBorder, mediaShape)
      ) {
        MediaPostVideoPlayer(url = post.videoUrl, modifier = Modifier.fillMaxSize())
      }
    }

    // =====================================================
    // ACTIONS
    // =====================================================

    MediaPostActionsRow(post = post, onLikeClick = onLikeClick, onToggleComments = onToggleComments)

    if (commentsExpanded) {
      Box(modifier = Modifier.padding(horizontal = 10.dp)) {
        MediaPostComments(comments = comments, isDark = isDark, onOpenComposer = onOpenComposer)
      }
    }

    // =====================================================
    // POST DIVIDER
    // =====================================================

    androidx.compose.material3.HorizontalDivider(color = if (isDark) Color(0xFF2A2A2A) else Color.LightGray)
  }
}

// Reddit-style dark pill row -- vote pill (up/down + count), comment pill
// (bubble + count), then plain circular repost/share icons. Shared between
// the feed card and the fullscreen image viewer so both stay in sync.
@Composable
private fun MediaPostActionsRow(post: ApiMediaPost, onLikeClick: () -> Unit, onToggleComments: () -> Unit) {
  val context = LocalContext.current
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Row(
      modifier = Modifier
        .clip(RoundedCornerShape(percent = 50))
        .background(Color(0xFF1A1A1A))
        .padding(horizontal = 10.dp, vertical = 6.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_upvote),
        contentDescription = "Upvote",
        tint = if (post.likedByMe) Color(0xFFFF4500) else Color.White,
        modifier = Modifier.size(16.dp).clickable(onClick = onLikeClick)
      )
      Spacer(modifier = Modifier.width(6.dp))
      Text(text = post.likeCount.toString(), fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium)
      Spacer(modifier = Modifier.width(6.dp))
      Box(modifier = Modifier.width(1.dp).height(12.dp).background(Color.White.copy(alpha = 0.3f)))
      Spacer(modifier = Modifier.width(6.dp))
      // Visual-only for now -- no downvote backend built yet, matching
      // how repost below has always been decorative.
      Icon(
        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_downvote),
        contentDescription = "Downvote",
        tint = Color.White,
        modifier = Modifier.size(16.dp).clickable {}
      )
    }

    Spacer(modifier = Modifier.width(8.dp))

    Row(
      modifier = Modifier
        .clip(RoundedCornerShape(percent = 50))
        .background(Color(0xFF1A1A1A))
        .clickable(onClick = onToggleComments)
        .padding(horizontal = 10.dp, vertical = 6.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_comment),
        contentDescription = "Comment",
        tint = Color.White,
        modifier = Modifier.size(16.dp)
      )
      Spacer(modifier = Modifier.width(6.dp))
      Text(text = post.commentCount.toString(), fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium)
    }

    Spacer(modifier = Modifier.weight(1f))

    // Visual-only for now -- no repost backend built yet.
    Box(
      modifier = Modifier
        .size(32.dp)
        .clip(CircleShape)
        .background(Color(0xFF1A1A1A))
        .clickable {},
      contentAlignment = Alignment.Center
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_repost),
        contentDescription = "Repost",
        tint = Color.White,
        modifier = Modifier.size(16.dp)
      )
    }

    Spacer(modifier = Modifier.width(8.dp))

    Box(
      modifier = Modifier
        .size(32.dp)
        .clip(CircleShape)
        .background(Color(0xFF1A1A1A))
        .clickable {
          val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, post.text)
          }
          context.startActivity(Intent.createChooser(sendIntent, "Share post"))
        },
      contentAlignment = Alignment.Center
    ) {
      Icon(
        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_share_nodes),
        contentDescription = "Share",
        tint = Color.White,
        modifier = Modifier.size(16.dp)
      )
    }
  }
}

// Fullscreen photo viewer -- close (X) / author name / "..." up top, the
// image itself at natural fit (no crop, unlike the feed card), then the
// caption and the same action pills as the feed card floating over a
// gradient at the bottom. Matches the Reddit-style reference screenshot.
@Composable
private fun MediaPostFullscreenViewer(
  post: ApiMediaPost,
  initialPage: Int,
  onLikeClick: () -> Unit,
  onToggleComments: () -> Unit,
  onDismiss: () -> Unit
) {
  BackHandler(onBack = onDismiss)
  val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { post.imageUrls.size })
  val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
  val bottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

  Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
      AsyncImage(
        model = post.imageUrls[page],
        contentDescription = "Post image",
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Fit
      )
    }

    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(top = topInset)
        .padding(horizontal = 12.dp, vertical = 8.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = onDismiss, modifier = Modifier.size(36.dp)) {
        Icon(Icons.Outlined.Close, contentDescription = "Close", tint = Color.White)
      }
      Spacer(modifier = Modifier.weight(1f))
      Text(post.authorName, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
      Spacer(modifier = Modifier.weight(1f))
      IconButton(modifier = Modifier.size(36.dp), onClick = {}) {
        Icon(Icons.Filled.MoreVert, contentDescription = "More", tint = Color.White)
      }
    }

    if (post.imageUrls.size > 1) {
      Text(
        text = "${pagerState.currentPage + 1}/${post.imageUrls.size}",
        color = Color.White,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier
          .align(Alignment.TopEnd)
          .padding(top = topInset + 52.dp, end = 14.dp)
          .clip(RoundedCornerShape(percent = 50))
          .background(Color.Black.copy(alpha = 0.55f))
          .padding(horizontal = 9.dp, vertical = 3.dp)
      )
    }

    Column(
      modifier = Modifier
        .align(Alignment.BottomCenter)
        .fillMaxWidth()
        .background(
          Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f)))
        )
        .padding(bottom = bottomInset)
        .padding(start = 14.dp, end = 14.dp, top = 40.dp, bottom = 12.dp)
    ) {
      if (post.text.isNotEmpty()) {
        Text(
          post.text,
          color = Color.White,
          fontSize = 13.sp,
          lineHeight = 18.sp,
          maxLines = 3,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.padding(bottom = 8.dp)
        )
      }
      MediaPostActionsRow(post = post, onLikeClick = onLikeClick, onToggleComments = onToggleComments)
    }
  }
}

// =============================================================
// BOTTOM NAVIGATION
// =============================================================

@Composable
private fun MediaBottomNavigation(
  viewModel: ChatViewModel,
  isDark: Boolean,
  onCreateClick: () -> Unit,
  onProfileClick: () -> Unit,
  onMenuClick: () -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  val bg = if (isDark) Color.Black else Color.White
  val fg = if (isDark) Color.White else Color.Black
  Row(
    modifier = modifier
      .fillMaxWidth()
      .background(bg)
      .navigationBarsPadding()
      .height(70.dp),
    horizontalArrangement = Arrangement.SpaceAround,
    verticalAlignment = Alignment.CenterVertically
  ) {
    val muted = if (isDark) Color.Gray else Color.DarkGray

    // Home -- this screen itself, so it's always shown "active".
    Icon(
      androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_home),
      contentDescription = "Home",
      tint = fg
    )

    IconButton(onClick = onCreateClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_send),
        contentDescription = "Create",
        tint = fg,
        modifier = Modifier.size(26.dp)
      )
    }

    // Was "Jobs" (no backend, coming-soon placeholder) -- replaced with
    // "For You", same coming-soon-placeholder treatment since there's no
    // personalized feed backend yet either. Icon is a play triangle inside
    // a filled rounded square (matching Lucide's "square-play" glyph,
    // which Material's icon set has no direct equivalent for) rather than
    // a plain outline icon, per explicit request for it to carry its own
    // background instead of just tinted line art like its neighbors.
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      // Only slot in this row with a label under the icon -- without this
      // top padding, centering the taller icon+label block as a whole
      // pushes the icon itself noticeably above where the other (label-less)
      // icons sit, since those are centered on their own, shorter bounds.
      modifier = Modifier
        .padding(top = 15.dp)
        .clickable {
          Toast.makeText(context, "For You — coming soon", Toast.LENGTH_SHORT).show()
        }
    ) {
      Box(
        modifier = Modifier
          .size(22.dp)
          .clip(RoundedCornerShape(6.dp))
          .background(muted),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          Icons.Filled.PlayArrow,
          contentDescription = "For You",
          tint = bg,
          modifier = Modifier.size(16.dp)
        )
      }
      Spacer(modifier = Modifier.height(2.dp))
      Text("For You", color = muted, fontSize = 10.sp)
    }

    // Was "Messages" (no backend, coming-soon placeholder) -- now opens
    // the Connect-With-ChatGiZa sheet, moved down here from the old top
    // header's hamburger icon (see ChatGiZaComposerBar, which replaced
    // that whole header with the "What's on your mind?" composer row).
    IconButton(onClick = onMenuClick) {
      Icon(
        Icons.Filled.Menu,
        contentDescription = "Menu",
        tint = muted,
        modifier = Modifier.size(24.dp)
      )
    }

    if (viewModel.userImage != null) {
      AsyncImage(
        model = viewModel.userImage,
        contentDescription = "Profile",
        modifier = Modifier.size(26.dp).clip(CircleShape).clickable(onClick = onProfileClick),
        contentScale = ContentScale.Crop
      )
    } else {
      Icon(
        Icons.Filled.Person,
        contentDescription = "Profile",
        tint = muted,
        modifier = Modifier.clickable(onClick = onProfileClick)
      )
    }
  }
}

// =============================================================
// PROFILE -- avatar, real post/follower/following counts, bio, and this
// person's posts as full X-style cards (tap an image to view it fullscreen).
// =============================================================

@Composable
internal fun MediaProfileScreen(viewModel: ChatViewModel, target: ProfileTarget, onBack: () -> Unit) {
  var showExtraSettings by remember { mutableStateOf(false) }
  var expandedCommentsPostId by remember { mutableStateOf<String?>(null) }
  var replyingToPost by remember { mutableStateOf<ApiMediaPost?>(null) }
  var fullscreenPostId by remember { mutableStateOf<String?>(null) }
  var fullscreenPage by remember { mutableStateOf(0) }
  BackHandler(enabled = !showExtraSettings) { onBack() }
  val context = LocalContext.current
  val isOwnProfile = target.authorId == viewModel.userId
  val authorPosts = remember(viewModel.mediaPosts, target.authorId) {
    viewModel.mediaPosts.filter { it.authorId == target.authorId }
  }
  LaunchedEffect(target.authorId) { viewModel.loadMediaUserProfile(target.authorId) }
  val userProfile = viewModel.mediaUserProfiles[target.authorId]
  val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
  // Follows Extra's own light/dark toggle (Extra Settings) -- defaults to
  // dark, matching the rest of the app, same reasoning as before this
  // toggle existed.
  val isDark = viewModel.extraDarkMode
  val bg = if (isDark) Color(0xFF161616) else Color.White
  val onBg = if (isDark) Color.White else Color.Black
  val onBgDim = if (isDark) Color(0xFFA8A8A8) else Color(0xFF6B6B6B)

  Box(modifier = Modifier.fillMaxSize().background(bg)) {
    Column(modifier = Modifier.fillMaxSize()) {
      LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
          // Banner -- the account's own photo, cropped wide and dimmed,
          // standing in for a dedicated banner image (no separate banner
          // field exists yet). Back/menu controls float over it and the
          // avatar overlaps its bottom edge, matching the reference
          // profile-header layout.
          Box(modifier = Modifier.fillMaxWidth().height(130.dp)) {
            if (target.authorImage != null) {
              AsyncImage(
                model = target.authorImage,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
              )
              Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
            } else {
              Box(modifier = Modifier.fillMaxSize().background(Color(0xFF2A2A2A)))
            }

            Row(
              modifier = Modifier.fillMaxWidth().padding(top = topInset).padding(8.dp),
              horizontalArrangement = Arrangement.SpaceBetween
            ) {
              Box(
                modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.45f)),
                contentAlignment = Alignment.Center
              ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                  Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(18.dp))
                }
              }
              if (isOwnProfile) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                  Box(
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center
                  ) {
                    IconButton(
                      onClick = { Toast.makeText(context, "Search — coming soon", Toast.LENGTH_SHORT).show() },
                      modifier = Modifier.size(36.dp)
                    ) {
                      Icon(
                        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_media_profile_search),
                        contentDescription = "Search",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                      )
                    }
                  }
                  Box(
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center
                  ) {
                    IconButton(onClick = { showExtraSettings = true }, modifier = Modifier.size(36.dp)) {
                      Icon(
                        painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_badge_seal),
                        contentDescription = "Settings",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                      )
                    }
                  }
                }
              }
            }

            Box(
              modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = 16.dp, y = 36.dp)
                .size(76.dp)
                .clip(CircleShape)
                .background(bg)
                .padding(3.dp)
            ) {
              if (target.authorImage != null) {
                AsyncImage(
                  model = target.authorImage,
                  contentDescription = target.authorName,
                  modifier = Modifier.fillMaxSize().clip(CircleShape),
                  contentScale = ContentScale.Crop
                )
              } else {
                MediaInitialAvatar(name = target.authorName, size = 70.dp)
              }
            }

            // Share, at the same row as the avatar (right-aligned instead
            // of left), matching the reference profile header.
            Box(
              modifier = Modifier
                .align(Alignment.BottomEnd)
                .offset(x = (-16).dp, y = 36.dp)
                .size(40.dp)
                .clip(CircleShape)
                .border(1.dp, onBgDim.copy(alpha = 0.4f), CircleShape)
                .clickable {
                  val shareText = buildString {
                    append(target.authorName)
                    if (isOwnProfile && viewModel.profileData.profile.bio.isNotBlank()) append(" — ${viewModel.profileData.profile.bio}")
                    append("\n\nFollow me on ChatGiZa!")
                  }
                  val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, shareText)
                  }
                  context.startActivity(Intent.createChooser(sendIntent, "Share profile"))
                },
              contentAlignment = Alignment.Center
            ) {
              Icon(
                painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_share_nodes),
                contentDescription = "Share",
                tint = onBg,
                modifier = Modifier.size(18.dp)
              )
            }
          }
        }
        item { Spacer(modifier = Modifier.height(44.dp)) }
        item {
          Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            // The bold display name (e.g. "QUANTARA") is a separate,
            // user-set field shown here -- target.authorName stays the
            // account's real/login name, this is what other users see as
            // the account's public identity. Falls back to authorName
            // when nothing's been set.
            val displayName = (if (isOwnProfile) viewModel.profileData.profile.displayName else userProfile?.displayName.orEmpty())
              .ifBlank { target.authorName }
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text(
                displayName,
                color = onBg,
                fontSize = 19.sp,
                fontWeight = FontWeight.ExtraBold
              )
              // Admin-only flag (no self-serve UI sets it) -- real, not
              // decorative, so it only shows once userProfile confirms it.
              if (userProfile?.isVerified == true) {
                Spacer(modifier = Modifier.width(4.dp))
                Box(
                  modifier = Modifier.size(16.dp).clip(CircleShape).background(Color(0xFF1D9BF0)),
                  contentAlignment = Alignment.Center
                ) {
                  Icon(Icons.Filled.Check, contentDescription = "Verified", tint = Color.White, modifier = Modifier.size(11.dp))
                }
              }
            }
            Text("@${target.authorName.lowercase().replace(" ", "")}", color = onBgDim, fontSize = 13.sp)

            // Own profile reads bio/occupation/location live from the
            // editable profileData so they update the instant Edit Profile
            // is saved; other profiles read the fetched snapshot from
            // /api/media/users/[id].
            val bio = if (isOwnProfile) viewModel.profileData.profile.bio else userProfile?.bio.orEmpty()
            if (bio.isNotBlank()) {
              Spacer(modifier = Modifier.height(8.dp))
              Text(bio, color = onBg, fontSize = 14.sp, lineHeight = 19.sp)
            }

            val occupation = if (isOwnProfile) viewModel.profileData.profile.role.orEmpty() else userProfile?.occupation.orEmpty()
            val location = if (isOwnProfile) viewModel.profileData.profile.country.orEmpty() else userProfile?.location.orEmpty()
            if (occupation.isNotBlank() || location.isNotBlank()) {
              Spacer(modifier = Modifier.height(8.dp))
              Row(verticalAlignment = Alignment.CenterVertically) {
                if (occupation.isNotBlank()) {
                  Icon(Icons.Outlined.WorkspacePremium, contentDescription = null, tint = onBgDim, modifier = Modifier.size(14.dp))
                  Spacer(modifier = Modifier.width(4.dp))
                  Text(occupation, color = onBgDim, fontSize = 13.sp)
                }
                if (occupation.isNotBlank() && location.isNotBlank()) Spacer(modifier = Modifier.width(12.dp))
                if (location.isNotBlank()) {
                  Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = onBgDim, modifier = Modifier.size(14.dp))
                  Spacer(modifier = Modifier.width(4.dp))
                  Text(location, color = onBgDim, fontSize = 13.sp)
                }
              }
            }

            val link = if (isOwnProfile) viewModel.profileData.profile.link else userProfile?.link.orEmpty()
            if (!link.isNullOrBlank()) {
              Spacer(modifier = Modifier.height(6.dp))
              Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable {
                  runCatching {
                    val url = if (link.startsWith("http")) link else "https://$link"
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                  }
                }
              ) {
                Icon(Icons.Outlined.Link, contentDescription = null, tint = Color(0xFF1D9BF0), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(link, color = Color(0xFF1D9BF0), fontSize = 13.sp)
              }
            }

            val joinedAt = userProfile?.joinedAt
            if (joinedAt != null) {
              Spacer(modifier = Modifier.height(6.dp))
              Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = onBgDim, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                val formatted = remember(joinedAt) {
                  java.text.SimpleDateFormat("MMMM yyyy", java.util.Locale.getDefault()).format(java.util.Date(joinedAt))
                }
                Text("Joined $formatted", color = onBgDim, fontSize = 13.sp)
              }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text(
                buildAnnotatedString {
                  withStyle(SpanStyle(color = onBg, fontWeight = FontWeight.Bold)) { append("${userProfile?.followingCount ?: 0}") }
                  withStyle(SpanStyle(color = onBgDim)) { append(" Following") }
                },
                fontSize = 13.sp
              )
              Spacer(modifier = Modifier.width(14.dp))
              Text(
                buildAnnotatedString {
                  withStyle(SpanStyle(color = onBg, fontWeight = FontWeight.Bold)) { append("${userProfile?.followerCount ?: 0}") }
                  withStyle(SpanStyle(color = onBgDim)) { append(" Followers") }
                },
                fontSize = 13.sp
              )
              Spacer(modifier = Modifier.width(14.dp))
              Text(
                buildAnnotatedString {
                  withStyle(SpanStyle(color = onBg, fontWeight = FontWeight.Bold)) { append("${authorPosts.size}") }
                  withStyle(SpanStyle(color = onBgDim)) { append(" Posts") }
                },
                fontSize = 13.sp
              )
            }
          }
        }
        item {
          Spacer(modifier = Modifier.height(14.dp))
          if (isOwnProfile) {
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              OutlinedButton(
                onClick = { viewModel.openCustomize() },
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = onBg),
                border = androidx.compose.foundation.BorderStroke(1.dp, onBgDim.copy(alpha = 0.4f)),
                modifier = Modifier.weight(1f)
              ) { Text("Edit Profile") }
              OutlinedButton(
                onClick = {
                  val shareText = buildString {
                    append(target.authorName)
                    if (viewModel.profileData.profile.bio.isNotBlank()) append(" — ${viewModel.profileData.profile.bio}")
                    append("\n\nFollow me on ChatGiZa!")
                  }
                  val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, shareText)
                  }
                  context.startActivity(Intent.createChooser(sendIntent, "Share profile"))
                },
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = onBg),
                border = androidx.compose.foundation.BorderStroke(1.dp, onBgDim.copy(alpha = 0.4f)),
                modifier = Modifier.weight(1f)
              ) { Text("Share Profile") }
            }
          } else {
            val following = userProfile?.isFollowedByMe ?: false
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              OutlinedButton(
                onClick = {},
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = onBg),
                border = androidx.compose.foundation.BorderStroke(1.dp, onBgDim.copy(alpha = 0.4f)),
                modifier = Modifier.weight(1f)
              ) { Text("Message") }
              androidx.compose.material3.Button(
                onClick = { viewModel.toggleFollowMediaUser(target.authorId) },
                modifier = Modifier.weight(1f)
              ) { Text(if (following) "Following" else "Follow") }
            }
          }
          Spacer(modifier = Modifier.height(16.dp))
          // Icon tab row matching X's profile (Posts / Replies / Reposts /
          // Media / Articles / Likes) -- only Posts is backed by real data
          // right now, the rest are visual-only, same convention as the
          // repost/share icons on the feed's own post cards.
          Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier.padding(bottom = 10.dp).drawBehind {
                drawLine(
                  color = onBg,
                  start = androidx.compose.ui.geometry.Offset(0f, size.height + 8.dp.toPx()),
                  end = androidx.compose.ui.geometry.Offset(size.width, size.height + 8.dp.toPx()),
                  strokeWidth = 2.dp.toPx()
                )
              }
            ) {
              Icon(Icons.AutoMirrored.Outlined.ListAlt, contentDescription = "Posts", tint = onBg, modifier = Modifier.size(20.dp))
            }
            Icon(
              Icons.Outlined.Comment,
              contentDescription = "Replies",
              tint = onBgDim,
              modifier = Modifier.size(20.dp).clickable {
                Toast.makeText(context, "Replies — coming soon", Toast.LENGTH_SHORT).show()
              }
            )
            Icon(
              painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_repost),
              contentDescription = "Reposts",
              tint = onBgDim,
              modifier = Modifier.size(20.dp).clickable {
                Toast.makeText(context, "Reposts — coming soon", Toast.LENGTH_SHORT).show()
              }
            )
            Icon(
              Icons.Outlined.Movie,
              contentDescription = "Media",
              tint = onBgDim,
              modifier = Modifier.size(20.dp).clickable {
                Toast.makeText(context, "Media — coming soon", Toast.LENGTH_SHORT).show()
              }
            )
            Icon(
              Icons.Outlined.BookmarkBorder,
              contentDescription = "Likes",
              tint = onBgDim,
              modifier = Modifier.size(20.dp).clickable {
                Toast.makeText(context, "Likes — coming soon", Toast.LENGTH_SHORT).show()
              }
            )
          }
          Spacer(modifier = Modifier.height(4.dp))
          androidx.compose.material3.HorizontalDivider(color = onBgDim.copy(alpha = 0.15f))
        }
        if (authorPosts.isEmpty()) {
          item {
            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
              Text("No posts yet.", color = onBgDim, fontSize = 14.sp)
            }
          }
        } else {
          // Full X-style post cards (caption above image, rounded/bordered
          // media, Reddit-pill actions) instead of the old Instagram-style
          // square-thumbnail grid -- this profile's feed should read the
          // same as the main Extra feed, not a separate compressed view.
          items(authorPosts, key = { it.id }) { post ->
            MediaPost(
              post = post,
              isDark = isDark,
              isOwnPost = isOwnProfile,
              commentsExpanded = expandedCommentsPostId == post.id,
              comments = viewModel.mediaComments[post.id],
              onLikeClick = { viewModel.toggleMediaPostLike(post.id) },
              onToggleComments = {
                if (expandedCommentsPostId == post.id) {
                  expandedCommentsPostId = null
                } else {
                  expandedCommentsPostId = post.id
                  viewModel.loadMediaComments(post.id)
                }
              },
              onDeleteClick = { viewModel.removeMediaPost(post.id) },
              onOpenComposer = { replyingToPost = post },
              onOpenProfile = {},
              onOpenFullscreen = { page -> fullscreenPostId = post.id; fullscreenPage = page }
            )
            androidx.compose.material3.HorizontalDivider(color = onBgDim.copy(alpha = 0.1f))
          }
        }
        item { Spacer(modifier = Modifier.height(24.dp)) }
      }
    }

    val replyTarget = replyingToPost
    if (replyTarget != null) {
      MediaCommentComposerSheet(
        authorName = replyTarget.authorName,
        onDismiss = { replyingToPost = null },
        onSubmit = { text -> viewModel.addMediaComment(replyTarget.id, text) }
      )
    }

    val fullscreenPost = viewModel.mediaPosts.firstOrNull { it.id == fullscreenPostId }
    if (fullscreenPost != null) {
      MediaPostFullscreenViewer(
        post = fullscreenPost,
        initialPage = fullscreenPage,
        onLikeClick = { viewModel.toggleMediaPostLike(fullscreenPost.id) },
        onToggleComments = {
          expandedCommentsPostId = fullscreenPost.id
          viewModel.loadMediaComments(fullscreenPost.id)
          fullscreenPostId = null
        },
        onDismiss = { fullscreenPostId = null }
      )
    }

    if (showExtraSettings) {
      ExtraSettingsScreen(viewModel = viewModel, onBack = { showExtraSettings = false })
    }
  }
}

// Reached only from the menu icon on your own profile inside Extra Media --
// scoped to Extra's own features rather than mixed into the main app's
// Settings list, per explicit correction after an earlier attempt put
// these rows there instead.
@Composable
private fun ExtraSettingsScreen(viewModel: ChatViewModel, onBack: () -> Unit) {
  BackHandler { onBack() }
  val context = LocalContext.current
  val isDark = viewModel.extraDarkMode
  val bg = if (isDark) Color(0xFF161616) else Color.White
  val onBg = if (isDark) Color.White else Color.Black
  val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()

  Box(modifier = Modifier.fillMaxSize().background(bg)) {
    Column(modifier = Modifier.fillMaxSize()) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(top = topInset)
          .height(56.dp)
          .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
          Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = onBg, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text("Extra Settings", color = onBg, fontSize = 18.sp, fontWeight = FontWeight.Bold)
      }
      Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
        // Not viewModel.openCustomize() -- that jumps into the main app's
        // own screen stack, and its back button then lands in Ask's
        // settings instead of returning here, per explicit bug report.
        // Extra Settings stays self-contained until a real Extra-scoped
        // profile editor exists.
        ExtraSettingsRow(Icons.Outlined.AccountCircle, "Profile", onBg) {
          Toast.makeText(context, "Profile — coming soon", Toast.LENGTH_SHORT).show()
        }
        ExtraSettingsRow(Icons.Outlined.WorkspacePremium, "Premium", onBg) {
          Toast.makeText(context, "Premium — coming soon", Toast.LENGTH_SHORT).show()
        }
        ExtraSettingsRow(Icons.Outlined.Groups, "Communities", onBg) {
          Toast.makeText(context, "Communities — coming soon", Toast.LENGTH_SHORT).show()
        }
        ExtraSettingsRow(Icons.Outlined.BookmarkBorder, "Bookmarks", onBg) {
          Toast.makeText(context, "Bookmarks — coming soon", Toast.LENGTH_SHORT).show()
        }
        ExtraSettingsRow(Icons.AutoMirrored.Outlined.ListAlt, "Lists", onBg) {
          Toast.makeText(context, "Lists — coming soon", Toast.LENGTH_SHORT).show()
        }
        ExtraSettingsRow(Icons.Outlined.Movie, "Creator Studio", onBg) {
          Toast.makeText(context, "Creator Studio — coming soon", Toast.LENGTH_SHORT).show()
        }
        androidx.compose.material3.HorizontalDivider(color = onBg.copy(alpha = 0.12f), modifier = Modifier.padding(vertical = 8.dp))
        // Extra's own light/dark toggle -- independent of the main app's
        // appearance setting, per explicit request.
        Row(
          modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(Icons.Outlined.DarkMode, contentDescription = null, tint = onBg, modifier = Modifier.size(22.dp))
          Spacer(modifier = Modifier.width(18.dp))
          Text("Dark Mode", color = onBg, fontSize = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
          Switch(checked = isDark, onCheckedChange = { viewModel.updateExtraDarkMode(it) })
        }
      }
    }
  }
}

@Composable
private fun ExtraSettingsRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, tint: Color, onClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(12.dp))
      .clickable(onClick = onClick)
      .padding(vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
    Spacer(modifier = Modifier.width(18.dp))
    Text(label, color = tint, fontSize = 16.sp, fontWeight = FontWeight.Medium)
  }
}
