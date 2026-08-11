package com.wellxai.chatgiza.ui.media

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.outlined.KeyboardArrowDown
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
        onAddClick = { showConnectSheet = true },
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
          NotificationBellIcon(modifier = Modifier.size(32.dp), tint = Color.Black)
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
      searchOpen = searchOpen,
      onSearchClick = { searchOpen = !searchOpen },
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
  }

  if (showConnectSheet) {
    ConnectWithChatGizaSheet(viewModel, onDismiss = { showConnectSheet = false })
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
private fun ChatGiZaHeader(topInset: androidx.compose.ui.unit.Dp, onAddClick: () -> Unit, onNotificationsClick: () -> Unit) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .background(Color.White)
      .padding(top = topInset)
      .height(70.dp)
      .padding(horizontal = 12.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    IconButton(onClick = onAddClick) {
      Icon(Icons.Filled.Add, contentDescription = "Create", tint = Color.Black)
    }
    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
      Text(text = "ChatGiZa", color = Color.Black, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
    IconButton(onClick = onNotificationsClick) {
      NotificationBellIcon(modifier = Modifier.size(22.dp), tint = Color.Black)
    }
  }
}

// Hand-drawn -- no notifications backend exists yet, so this is a clearly
// labeled placeholder ("No notifications yet") rather than a dead icon.
@Composable
private fun NotificationBellIcon(modifier: Modifier = Modifier, tint: Color = Color.Black) {
  Canvas(modifier = modifier) {
    val scale = size.width / 24f
    val strokeW = 1.6f * scale
    drawArc(
      color = tint,
      startAngle = 180f,
      sweepAngle = 180f,
      useCenter = false,
      topLeft = Offset(4.5f * scale, 3f * scale),
      size = Size(15f * scale, 15f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round)
    )
    drawLine(
      color = tint,
      start = Offset(4.5f * scale, 10.5f * scale),
      end = Offset(3f * scale, 17f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawLine(
      color = tint,
      start = Offset(19.5f * scale, 10.5f * scale),
      end = Offset(21f * scale, 17f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawLine(
      color = tint,
      start = Offset(3f * scale, 17f * scale),
      end = Offset(21f * scale, 17f * scale),
      strokeWidth = strokeW,
      cap = StrokeCap.Round
    )
    drawArc(
      color = tint,
      startAngle = 0f,
      sweepAngle = 180f,
      useCenter = false,
      topLeft = Offset(9.5f * scale, 17f * scale),
      size = Size(5f * scale, 5f * scale),
      style = Stroke(width = strokeW, cap = StrokeCap.Round, join = StrokeJoin.Round)
    )
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
    horizontalArrangement = Arrangement.spacedBy(14.dp)
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp).clickable(onClick = onMyStoryClick)) {
      Box(contentAlignment = Alignment.BottomEnd) {
        if (myImage != null) {
          AsyncImage(
            model = myImage,
            contentDescription = "Your story",
            modifier = Modifier.size(64.dp).clip(CircleShape).border(1.dp, Color(0xFFDADADA), CircleShape),
            contentScale = ContentScale.Crop
          )
        } else {
          Icon(Icons.Outlined.AccountCircle, contentDescription = "Your story", tint = Color.Gray, modifier = Modifier.size(64.dp))
        }
        Box(
          modifier = Modifier
            .size(22.dp)
            .clip(CircleShape)
            .background(Color.Black)
            .border(2.dp, Color.White, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
        }
      }
      Spacer(modifier = Modifier.height(4.dp))
      Text("Your story", color = Color.Black, fontSize = 11.sp, maxLines = 1, softWrap = false)
    }
    others.forEach { post ->
      Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
          .width(72.dp)
          .clickable { onOpenProfile(ProfileTarget(post.authorId, post.authorName, post.authorImage)) }
      ) {
        Box(
          modifier = Modifier.size(68.dp).clip(CircleShape).background(Color.Black).padding(2.5.dp),
          contentAlignment = Alignment.Center
        ) {
          if (post.authorImage != null) {
            AsyncImage(
              model = post.authorImage,
              contentDescription = post.authorName,
              modifier = Modifier.size(61.dp).clip(CircleShape).border(2.dp, Color.White, CircleShape),
              contentScale = ContentScale.Crop
            )
          } else {
            Box(modifier = Modifier.size(61.dp).clip(CircleShape).background(Color(0xFFEDEDED)).border(2.dp, Color.White, CircleShape), contentAlignment = Alignment.Center) {
              Icon(Icons.Outlined.AccountCircle, contentDescription = post.authorName, tint = Color.Gray, modifier = Modifier.size(46.dp))
            }
          }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(post.authorName, color = Color.Black, fontSize = 11.sp, maxLines = 1, softWrap = false)
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

      Box {
        IconButton(onClick = { if (isOwnPost) moreMenuOpen = true }) {
          Icon(Icons.Filled.MoreVert, contentDescription = "More", tint = Color.Black)
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

    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      IconButton(onClick = onLikeClick) {
        Icon(
          imageVector = if (post.likedByMe) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
          contentDescription = "Like",
          tint = if (post.likedByMe) Color.Red else Color.Black
        )
      }
      Text(text = post.likeCount.toString(), fontSize = 13.sp, color = Color.Black)

      Spacer(modifier = Modifier.width(12.dp))

      IconButton(onClick = onToggleComments) {
        Icon(
          painter = androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_comment),
          contentDescription = "Comment",
          tint = if (commentsExpanded) Color.Black else Color.DarkGray
        )
      }
      Text(text = post.commentCount.toString(), fontSize = 13.sp, color = Color.Black)

      Spacer(modifier = Modifier.width(12.dp))

      // Visual-only for now -- no repost backend built yet.
      IconButton(onClick = {}) {
        Icon(imageVector = Icons.Filled.Refresh, contentDescription = "Repost", tint = Color.DarkGray)
      }
      Text(text = "0", fontSize = 13.sp, color = Color.Black)

      Spacer(modifier = Modifier.weight(1f))

      IconButton(
        onClick = {
          val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, post.text)
          }
          context.startActivity(Intent.createChooser(sendIntent, "Share post"))
        }
      ) {
        Icon(imageVector = Icons.Filled.Send, contentDescription = "Share", tint = Color.Black)
      }

      // Visual-only for now -- no saved-posts list built yet.
      var saved by remember(post.id) { mutableStateOf(false) }
      IconButton(onClick = { saved = !saved }) {
        Icon(
          imageVector = if (saved) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
          contentDescription = "Save",
          tint = Color.Black
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
  searchOpen: Boolean,
  onSearchClick: () -> Unit,
  onCreateClick: () -> Unit,
  onProfileClick: () -> Unit,
  modifier: Modifier = Modifier
) {
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

    // Visual-only for now -- no saved-media library screen built yet.
    Icon(
      androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_add_photo),
      contentDescription = "Media",
      tint = Color.DarkGray
    )

    IconButton(onClick = onCreateClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_send),
        contentDescription = "Create",
        tint = Color.Black,
        modifier = Modifier.size(26.dp)
      )
    }

    IconButton(onClick = onSearchClick) {
      Icon(
        androidx.compose.ui.res.painterResource(com.wellxai.chatgiza.R.drawable.ic_extra_search),
        contentDescription = "Search",
        tint = if (searchOpen) Color.Black else Color.DarkGray
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
  BackHandler(enabled = fullscreenImage != null) { fullscreenImage = null }
  BackHandler(enabled = fullscreenImage == null) { onBack() }
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
        Row(
          modifier = Modifier.weight(1f),
          horizontalArrangement = Arrangement.Center,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            target.authorName,
            color = onBg,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
          )
          Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = onBg, modifier = Modifier.size(18.dp))
        }
        if (isOwnProfile) {
          IconButton(onClick = { viewModel.openAccount() }, modifier = Modifier.size(40.dp)) {
            MediaMenuIcon(modifier = Modifier.size(20.dp), tint = onBg)
          }
        } else {
          Spacer(modifier = Modifier.size(40.dp))
        }
      }

      LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
          Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            if (target.authorImage != null) {
              AsyncImage(
                model = target.authorImage,
                contentDescription = target.authorName,
                modifier = Modifier.size(84.dp).clip(CircleShape),
                contentScale = ContentScale.Crop
              )
            } else {
              Icon(Icons.Outlined.AccountCircle, contentDescription = target.authorName, tint = onBgDim, modifier = Modifier.size(84.dp))
            }
            Spacer(modifier = Modifier.width(20.dp))
            Row(
              modifier = Modifier.weight(1f),
              horizontalArrangement = Arrangement.SpaceEvenly
            ) {
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${authorPosts.size}", color = onBg, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("Posts", color = onBgDim, fontSize = 13.sp)
              }
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${userProfile?.followerCount ?: 0}", color = onBg, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("Followers", color = onBgDim, fontSize = 13.sp)
              }
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${userProfile?.followingCount ?: 0}", color = onBg, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("Following", color = onBgDim, fontSize = 13.sp)
              }
            }
          }
        }
        item {
          Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            // The bold display name (e.g. "QUANTARA") is a separate,
            // user-set field shown here -- target.authorName (the header
            // above) stays the account's real/login name, this is what
            // other users see as the account's public identity. Falls
            // back to authorName when nothing's been set.
            val displayName = (if (isOwnProfile) viewModel.profileData.profile.displayName else userProfile?.displayName.orEmpty())
              .ifBlank { target.authorName }
            Text(
              displayName,
              color = onBg,
              fontSize = 15.sp,
              fontWeight = FontWeight.SemiBold
            )
            // Own profile reads bio live from the editable profileData so
            // it updates the instant Edit Profile is saved; other profiles
            // read the fetched snapshot from /api/media/users/[id].
            val bio = if (isOwnProfile) viewModel.profileData.profile.bio else userProfile?.bio.orEmpty()
            if (bio.isNotBlank()) {
              Spacer(modifier = Modifier.height(4.dp))
              Text(bio, color = onBgDim, fontSize = 13.sp, lineHeight = 18.sp)
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
              androidx.compose.material3.Button(
                onClick = { viewModel.toggleFollowMediaUser(target.authorId) },
                modifier = Modifier.weight(1f)
              ) { Text(if (following) "Following" else "Follow") }
              OutlinedButton(
                onClick = {},
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = onBg),
                border = androidx.compose.foundation.BorderStroke(1.dp, onBgDim.copy(alpha = 0.4f)),
                modifier = Modifier.weight(1f)
              ) { Text("Message") }
            }
          }
          Spacer(modifier = Modifier.height(16.dp))
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
  }
}
