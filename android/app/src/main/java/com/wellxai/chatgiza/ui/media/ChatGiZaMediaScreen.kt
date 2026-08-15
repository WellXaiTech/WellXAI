package com.wellxai.chatgiza.ui.media

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CalendarMonth
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
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
  var replyingToPost by remember { mutableStateOf<ApiMediaPost?>(null) }
  var expandedCommentsPostId by remember { mutableStateOf<String?>(null) }
  var searchOpen by remember { mutableStateOf(false) }
  var searchQuery by remember { mutableStateOf("") }
  var viewingProfile by remember { mutableStateOf<ProfileTarget?>(null) }
  var showNotifications by remember { mutableStateOf(false) }

  // A post's destination ("post" == History/main feed, "status" == stories
  // row, "both") decides which of these two lists it lands in -- a
  // status-only post shouldn't show up in the scrollable feed, and a
  // history-only post shouldn't show up as a story circle.
  val feedEligiblePosts = remember(viewModel.mediaPosts) {
    viewModel.mediaPosts.filter { it.destination != "status" }
  }
  val statusEligiblePosts = remember(viewModel.mediaPosts) {
    viewModel.mediaPosts.filter { it.destination != "post" }
  }
  val visiblePosts = remember(feedEligiblePosts, searchQuery) {
    val q = searchQuery.trim()
    if (q.isEmpty()) feedEligiblePosts
    else feedEligiblePosts.filter { it.text.contains(q, ignoreCase = true) || it.authorName.contains(q, ignoreCase = true) }
  }

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

  Box(modifier = Modifier.fillMaxSize().background(Color.White)) {

    LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {

      item { Spacer(modifier = Modifier.height(if (showHeader) headerHeight else 0.dp)) }

      item {
        MediaStoriesRow(
          myImage = viewModel.userImage,
          posts = statusEligiblePosts,
          onMyStoryClick = { showConnectSheet = true },
          onOpenProfile = { target -> viewingProfile = target }
        )
        androidx.compose.material3.HorizontalDivider(color = Color(0xFFEDEDED))
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
              .background(Color(0xFFF0F0F0))
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
                textStyle = androidx.compose.ui.text.TextStyle(color = Color.Black, fontSize = 13.sp),
                cursorBrush = SolidColor(Color.Black),
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
              CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(28.dp))
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
            isOwnPost = post.authorId == viewModel.userId,
            commentsExpanded = expandedCommentsPostId == post.id,
            comments = viewModel.mediaComments[post.id],
            onLikeClick = { viewModel.toggleMediaPostLike(post.id) },
            onDeleteClick = { viewModel.removeMediaPost(post.id) },
            onToggleComments = {
              if (expandedCommentsPostId == post.id) {
                expandedCommentsPostId = null
              } else {
                expandedCommentsPostId = post.id
                viewModel.loadMediaComments(post.id)
              }
            },
            onOpenComposer = { replyingToPost = post },
            onOpenProfile = { viewingProfile = ProfileTarget(post.authorId, post.authorName, post.authorImage) }
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
      ChatGiZaHeader(
        topInset = topInset,
        onMenuClick = { showConnectSheet = true },
        onSearchClick = { searchOpen = !searchOpen },
        onNotificationsClick = { showNotifications = true }
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
            .background(Color.White)
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
            tint = Color.Black,
            modifier = Modifier.size(32.dp)
          )
          Spacer(modifier = Modifier.height(12.dp))
          Text("No notifications yet", color = Color.Black, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
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
      onCreateClick = { showConnectSheet = true },
      onProfileClick = {
        val uid = viewModel.userId
        if (uid != null) viewingProfile = ProfileTarget(uid, viewModel.userName ?: "You", viewModel.userImage)
      },
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
  }

  if (showConnectSheet) {
    ConnectWithChatGizaSheet(viewModel, onDismiss = { showConnectSheet = false })
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

// A few gradients for the profile grid's text-only-post tiles, picked
// deterministically by post id (same gradient every time for a given
// post, but varied across posts) instead of one flat color for all of
// them.
private val MEDIA_GRID_GRADIENTS = listOf(
  listOf(Color(0xFF6D5DF6), Color(0xFF2979FF)),
  listOf(Color(0xFFFF6B6B), Color(0xFFFF9F43)),
  listOf(Color(0xFF11998E), Color(0xFF38EF7D)),
  listOf(Color(0xFFF7971E), Color(0xFFFFD200)),
  listOf(Color(0xFFEE0979), Color(0xFFFF6A00)),
  listOf(Color(0xFF00C6FF), Color(0xFF0072FF))
)

private fun mediaGridGradient(seed: String): List<Color> =
  MEDIA_GRID_GRADIENTS[kotlin.math.abs(seed.hashCode()) % MEDIA_GRID_GRADIENTS.size]

// =============================================================
// CHATGIZA HEADER
// =============================================================

@Composable
private fun ChatGiZaHeader(
  topInset: androidx.compose.ui.unit.Dp,
  onMenuClick: () -> Unit,
  onSearchClick: () -> Unit,
  onNotificationsClick: () -> Unit
) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .background(Color.White)
      .padding(top = topInset)
      .height(70.dp)
      .padding(horizontal = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    IconButton(onClick = onMenuClick) {
      Icon(Icons.Filled.Menu, contentDescription = "Menu", tint = Color.Black)
    }
    Spacer(modifier = Modifier.width(4.dp))
    Row(
      verticalAlignment = Alignment.CenterVertically,
      modifier = Modifier
        .weight(1f)
        .height(46.dp)
        .clip(RoundedCornerShape(23.dp))
        .background(Color(0xFFF0F0F0))
        .border(width = 1.5.dp, color = Color(0xFFD6D6D6), shape = RoundedCornerShape(23.dp))
        .clickable(onClick = onSearchClick)
        .padding(horizontal = 14.dp)
    ) {
      Icon(Icons.Filled.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp))
      Spacer(modifier = Modifier.width(8.dp))
      Text("Find anything", color = Color.Gray, fontSize = 14.sp)
    }
    Spacer(modifier = Modifier.width(4.dp))
    IconButton(onClick = onNotificationsClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_bell),
        contentDescription = null,
        tint = Color.Black,
        modifier = Modifier.size(22.dp)
      )
    }
  }
}

// Hand-drawn three-line "hamburger" menu glyph -- opens Account/Settings
// from your own profile header, matching the reference layout's
// top-right menu icon.
@Composable
private fun MediaMenuIcon(modifier: Modifier = Modifier, tint: Color = Color.Black) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.8f * scale
    listOf(5.5f, 12f, 18.5f).forEach { y ->
      drawLine(
        color = tint,
        start = Offset(3.5f * scale, y * scale),
        end = Offset(20.5f * scale, y * scale),
        strokeWidth = strokeW,
        cap = StrokeCap.Round
      )
    }
  }
}

// =============================================================
// STORIES ROW -- "Your story" (tap opens the create sheet, same as "+")
// followed by the most recent distinct posters. Monochrome ring instead
// of Instagram's gradient to match this screen's black/white palette.
// =============================================================

@Composable
private fun MediaStoriesRow(
  myImage: String?,
  posts: List<ApiMediaPost>,
  onMyStoryClick: () -> Unit,
  onOpenProfile: (ProfileTarget) -> Unit
) {
  val others = remember(posts) { posts.distinctBy { it.authorId }.take(15) }

  Row(
    modifier = Modifier
      .fillMaxWidth()
      .horizontalScroll(rememberScrollState())
      .padding(horizontal = 12.dp, vertical = 10.dp),
    horizontalArrangement = Arrangement.spacedBy(10.dp)
  ) {
    MediaStoryCard(
      image = myImage,
      label = "My story",
      showAddBadge = true,
      onClick = onMyStoryClick
    )
    others.forEach { post ->
      MediaStoryCard(
        image = post.authorImage,
        label = post.authorName,
        showAddBadge = false,
        onClick = { onOpenProfile(ProfileTarget(post.authorId, post.authorName, post.authorImage)) }
      )
    }
  }
}

// Card matching the WhatsApp Status-tab reference: a subtly-tinted card
// with a circular avatar sitting in the upper portion (not full-bleed),
// a "+" badge overlapping that circle's bottom-right corner for "My
// story", and the name as its own line at the bottom of the card.
@Composable
private fun MediaStoryCard(image: String?, label: String, showAddBadge: Boolean, onClick: () -> Unit) {
  val cardShape = RoundedCornerShape(14.dp)
  Box(
    modifier = Modifier
      .width(84.dp)
      .height(112.dp)
      .clip(cardShape)
      .background(Color(0xFFF5F5F5))
      .border(1.dp, Color(0xFFE2E2E2), cardShape)
      .clickable(onClick = onClick)
  ) {
    Box(
      modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 30.dp),
      contentAlignment = Alignment.BottomEnd
    ) {
      if (image != null) {
        AsyncImage(
          model = image,
          contentDescription = label,
          modifier = Modifier.size(46.dp).clip(CircleShape).border(1.dp, Color(0xFFDADADA), CircleShape),
          contentScale = ContentScale.Crop
        )
      } else {
        Icon(
          Icons.Outlined.AccountCircle,
          contentDescription = label,
          tint = Color.Gray,
          modifier = Modifier.size(46.dp)
        )
      }
      if (showAddBadge) {
        Box(
          modifier = Modifier
            .size(19.dp)
            .clip(CircleShape)
            .background(Color.White)
            .border(1.5.dp, Color(0xFFF5F5F5), CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Filled.Add, contentDescription = null, tint = Color.Black, modifier = Modifier.size(11.dp))
        }
      }
    }

    Text(
      label,
      color = Color.Black,
      fontSize = 11.sp,
      fontWeight = FontWeight.SemiBold,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
      modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)
    )
  }
}

// =============================================================
// MEDIA POST
// =============================================================

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MediaPost(
  post: ApiMediaPost,
  isOwnPost: Boolean,
  commentsExpanded: Boolean,
  comments: List<com.wellxai.chatgiza.ApiMediaComment>?,
  onLikeClick: () -> Unit,
  onDeleteClick: () -> Unit,
  onToggleComments: () -> Unit,
  onOpenComposer: () -> Unit,
  onOpenProfile: () -> Unit
) {
  val context = LocalContext.current
  val pagerState = rememberPagerState(pageCount = { post.imageUrls.size })
  var following by remember(post.id) { mutableStateOf(false) }
  var moreMenuOpen by remember(post.id) { mutableStateOf(false) }
  var textExpanded by remember(post.id) { mutableStateOf(false) }
  val isLongText = post.text.length > MEDIA_POST_TEXT_PREVIEW_LENGTH

  Column(modifier = Modifier.fillMaxWidth().background(Color.White)) {

    // =====================================================
    // POST HEADER
    // =====================================================

    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(start = 14.dp, end = 8.dp, top = 12.dp, bottom = 10.dp),
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
        Icon(
          Icons.Outlined.AccountCircle,
          contentDescription = "Profile",
          tint = Color.Gray,
          modifier = Modifier.size(44.dp).clickable(onClick = onOpenProfile)
        )
      }

      Spacer(modifier = Modifier.width(10.dp))

      Column(modifier = Modifier.weight(1f).clickable(onClick = onOpenProfile)) {
        Text(text = post.authorName, color = Color.Black, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Text(text = formatMediaPostTimeAgo(post.createdAt), fontSize = 12.sp, color = Color.Gray)
      }

      if (!isOwnPost) {
        OutlinedButton(onClick = { following = !following }) {
          Text(text = if (following) "Following" else "Follow", fontSize = 12.sp)
        }
      }

      // No per-post search exists yet, so this is a clearly labeled
      // placeholder rather than a dead icon, same pattern as Jobs/Messages
      // in the bottom nav.
      IconButton(onClick = { Toast.makeText(context, "Search — coming soon", Toast.LENGTH_SHORT).show() }) {
        Icon(Icons.Filled.Search, contentDescription = "Search", tint = Color.Black)
      }

      Box {
        IconButton(onClick = { if (isOwnPost) moreMenuOpen = true }) {
          Icon(
            painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_badge_seal),
            contentDescription = "More",
            tint = Color.Black
          )
        }
        DropdownMenu(expanded = moreMenuOpen, onDismissRequest = { moreMenuOpen = false }) {
          DropdownMenuItem(
            text = { Text("Delete post") },
            onClick = {
              moreMenuOpen = false
              onDeleteClick()
            }
          )
        }
      }
    }

    // =====================================================
    // LARGE MEDIA CAROUSEL / VIDEO
    // =====================================================

    if (post.imageUrls.isNotEmpty()) {
      HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth().aspectRatio(4f / 5f)) { page ->
        AsyncImage(
          model = post.imageUrls[page],
          contentDescription = "Post image",
          modifier = Modifier.fillMaxSize(),
          contentScale = ContentScale.Crop
        )
      }
      if (post.imageUrls.size > 1) {
        Text(
          text = "${pagerState.currentPage + 1}/${post.imageUrls.size}",
          modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
          fontSize = 12.sp,
          color = Color.Gray
        )
      }
    } else if (post.videoUrl != null) {
      MediaPostVideoPlayer(url = post.videoUrl, modifier = Modifier.fillMaxWidth().aspectRatio(4f / 5f))
    }

    // =====================================================
    // ACTIONS
    // =====================================================

    // Reddit-style dark pill row -- vote pill (up/down + count), comment
    // pill (bubble + count), then plain circular repost/share icons --
    // replacing the old Instagram-style heart/comment/repost/share/save
    // row entirely, per explicit reference screenshots.
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

    if (commentsExpanded) {
      Box(modifier = Modifier.padding(horizontal = 10.dp)) {
        MediaPostComments(comments = comments, onOpenComposer = onOpenComposer)
      }
    }

    // =====================================================
    // CAPTION -- BELOW IMAGE + ACTIONS
    // =====================================================

    if (post.text.isNotEmpty()) {
      val shownText = if (isLongText && !textExpanded) post.text.take(MEDIA_POST_TEXT_PREVIEW_LENGTH) else post.text
      Text(
        text = buildAnnotatedString {
          append(shownText)
          if (isLongText && !textExpanded) {
            withStyle(SpanStyle(color = Color.Black, fontWeight = FontWeight.Bold)) {
              append(" ... more")
            }
          }
        },
        modifier = Modifier
          .fillMaxWidth()
          .padding(start = 14.dp, end = 14.dp, bottom = 16.dp)
          .let { if (isLongText) it.clickable { textExpanded = !textExpanded } else it },
        color = Color.Black,
        fontSize = 14.sp,
        lineHeight = 20.sp
      )
    }

    // =====================================================
    // POST DIVIDER
    // =====================================================

    androidx.compose.material3.HorizontalDivider(color = Color.LightGray)
  }
}

// =============================================================
// BOTTOM NAVIGATION
// =============================================================

@Composable
private fun MediaBottomNavigation(
  viewModel: ChatViewModel,
  onCreateClick: () -> Unit,
  onProfileClick: () -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  Row(
    modifier = modifier
      .fillMaxWidth()
      .background(Color.White)
      .navigationBarsPadding()
      .height(70.dp),
    horizontalArrangement = Arrangement.SpaceAround,
    verticalAlignment = Alignment.CenterVertically
  ) {
    // Home -- this screen itself, so it's always shown "active".
    Icon(
      androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_home),
      contentDescription = "Home",
      tint = Color.Black
    )

    IconButton(onClick = onCreateClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_send),
        contentDescription = "Create",
        tint = Color.Black,
        modifier = Modifier.size(26.dp)
      )
    }

    // Replaces the old notifications shortcut here -- notifications are
    // still reachable via the bell in ChatGiZaHeader up top. No jobs
    // backend exists yet, so this is a clearly labeled placeholder
    // rather than a dead icon.
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      // Only slot in this row with a label under the icon -- without this
      // top padding, centering the taller icon+label block as a whole
      // pushes the icon itself noticeably above where the other (label-less)
      // icons sit, since those are centered on their own, shorter bounds.
      modifier = Modifier
        .padding(top = 15.dp)
        .clickable {
          Toast.makeText(context, "Jobs — coming soon", Toast.LENGTH_SHORT).show()
        }
    ) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_jobs),
        contentDescription = "Jobs",
        tint = Color.DarkGray,
        modifier = Modifier.size(22.dp)
      )
      Spacer(modifier = Modifier.height(2.dp))
      Text("Jobs", color = Color.DarkGray, fontSize = 10.sp)
    }

    // No messaging backend exists yet, so this is a clearly labeled
    // placeholder rather than a dead icon, same as Jobs above.
    IconButton(
      onClick = { Toast.makeText(context, "Messages — coming soon", Toast.LENGTH_SHORT).show() }
    ) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_messages_bubble),
        contentDescription = "Messages",
        tint = Color.DarkGray,
        // Not square (the source glyph is taller than wide) -- an explicit
        // width/height keeps that ratio instead of a uniform size()
        // shrinking it down to fit a square box.
        modifier = Modifier.size(width = 20.8.dp, height = 26.dp)
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
        tint = Color.DarkGray,
        modifier = Modifier.clickable(onClick = onProfileClick)
      )
    }
  }
}

// =============================================================
// PROFILE -- avatar, real post/follower/following counts, bio, and a
// grid of that person's posts (tap a grid image to view it fullscreen).
// =============================================================

@Composable
internal fun MediaProfileScreen(viewModel: ChatViewModel, target: ProfileTarget, onBack: () -> Unit) {
  var fullscreenImage by remember { mutableStateOf<String?>(null) }
  var showExtraSettings by remember { mutableStateOf(false) }
  BackHandler(enabled = fullscreenImage != null) { fullscreenImage = null }
  BackHandler(enabled = fullscreenImage == null && !showExtraSettings) { onBack() }
  val context = LocalContext.current
  val isOwnProfile = target.authorId == viewModel.userId
  val authorPosts = remember(viewModel.mediaPosts, target.authorId) {
    viewModel.mediaPosts.filter { it.authorId == target.authorId }
  }
  LaunchedEffect(target.authorId) { viewModel.loadMediaUserProfile(target.authorId) }
  val userProfile = viewModel.mediaUserProfiles[target.authorId]
  val topInset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
  // Dark, matching the rest of the app -- this screen (and the grid
  // thumbnails' placeholder) was left over from an earlier all-white
  // pass on the Media feed and read as visually disconnected from
  // everywhere else in the app.
  val bg = Color(0xFF161616)
  val onBg = Color.White
  val onBgDim = Color(0xFFA8A8A8)

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
                Box(
                  modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.45f)),
                  contentAlignment = Alignment.Center
                ) {
                  IconButton(onClick = { showExtraSettings = true }, modifier = Modifier.size(36.dp)) {
                    MediaMenuIcon(modifier = Modifier.size(16.dp), tint = Color.White)
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
                Icon(Icons.Outlined.AccountCircle, contentDescription = target.authorName, tint = onBgDim, modifier = Modifier.fillMaxSize())
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
          Text(
            "Posts",
            color = onBg,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp)
          )
          Spacer(modifier = Modifier.height(10.dp))
          androidx.compose.material3.HorizontalDivider(color = onBgDim.copy(alpha = 0.15f))
        }
        if (authorPosts.isEmpty()) {
          item {
            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
              Text("No posts yet.", color = onBgDim, fontSize = 14.sp)
            }
          }
        } else {
          items(authorPosts.chunked(3)) { rowPosts ->
            Row(modifier = Modifier.fillMaxWidth()) {
              rowPosts.forEach { post ->
                val thumb = post.imageUrls.firstOrNull()
                Box(
                  modifier = Modifier
                    .weight(1f)
                    .aspectRatio(1f)
                    .padding(1.dp)
                    .then(if (thumb != null) Modifier.clickable { fullscreenImage = thumb } else Modifier)
                ) {
                  if (thumb != null) {
                    AsyncImage(
                      model = thumb,
                      contentDescription = null,
                      modifier = Modifier.fillMaxSize(),
                      contentScale = ContentScale.Crop
                    )
                  } else {
                    // A flat gray tile for every text-only post read as a
                    // wall of near-white boxes in the grid -- this picks
                    // one of a few gradients deterministically from the
                    // post id instead, so it's still the same tile every
                    // time you look at this post, but the grid as a whole
                    // isn't monotone.
                    Box(
                      modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.linearGradient(mediaGridGradient(post.id))),
                      contentAlignment = Alignment.Center
                    ) {
                      Text(
                        post.text.take(24),
                        fontSize = 10.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Medium,
                        maxLines = 3,
                        modifier = Modifier.padding(6.dp)
                      )
                    }
                  }
                }
              }
              repeat(3 - rowPosts.size) { Box(modifier = Modifier.weight(1f)) }
            }
          }
        }
        item { Spacer(modifier = Modifier.height(24.dp)) }
      }
    }

    val zoomedImage = fullscreenImage
    if (zoomedImage != null) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color.Black)
          .clickable { fullscreenImage = null },
        contentAlignment = Alignment.Center
      ) {
        AsyncImage(
          model = zoomedImage,
          contentDescription = null,
          modifier = Modifier.fillMaxWidth(),
          contentScale = ContentScale.Fit
        )
        IconButton(
          onClick = { fullscreenImage = null },
          modifier = Modifier.align(Alignment.TopStart).padding(top = topInset, start = 4.dp)
        ) {
          Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Close", tint = Color.White)
        }
      }
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
  val bg = Color(0xFF161616)
  val onBg = Color.White
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
        ExtraSettingsRow(Icons.Outlined.AccountCircle, "Profile", onBg) { viewModel.openCustomize() }
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
