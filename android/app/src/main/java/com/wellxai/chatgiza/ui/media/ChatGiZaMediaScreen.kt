package com.wellxai.chatgiza.ui.media

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
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
      ChatGiZaHeader(topInset = topInset, onAddClick = { showConnectSheet = true })
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
private fun ChatGiZaHeader(topInset: androidx.compose.ui.unit.Dp, onAddClick: () -> Unit) {
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
    Spacer(modifier = Modifier.width(48.dp))
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
          imageVector = Icons.Outlined.Comment,
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
    Icon(Icons.Filled.Home, contentDescription = "Home", tint = Color.Black)

    // Visual-only for now -- no saved-media library screen built yet.
    Icon(Icons.Filled.PhotoLibrary, contentDescription = "Media", tint = Color.DarkGray)

    IconButton(onClick = onCreateClick) {
      Icon(Icons.Filled.AddCircle, contentDescription = "Create", tint = Color.Black, modifier = Modifier.size(30.dp))
    }

    IconButton(onClick = onSearchClick) {
      Icon(Icons.Filled.Search, contentDescription = "Search", tint = if (searchOpen) Color.Black else Color.DarkGray)
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
// PROFILE -- avatar, real post count, a grid of that person's posts.
// No follower/following/bio data exists on the backend yet, so those
// are left out entirely rather than showing fabricated numbers; this
// is a foundation to build on, not the full reference layout.
// =============================================================

@Composable
internal fun MediaProfileScreen(viewModel: ChatViewModel, target: ProfileTarget, onBack: () -> Unit) {
  BackHandler { onBack() }
  val isOwnProfile = target.authorId == viewModel.userId
  val authorPosts = remember(viewModel.mediaPosts, target.authorId) {
    viewModel.mediaPosts.filter { it.authorId == target.authorId }
  }
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
        IconButton(onClick = onBack) {
          Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = onBg)
        }
        Text(
          target.authorName,
          color = onBg,
          fontSize = 16.sp,
          fontWeight = FontWeight.SemiBold,
          modifier = Modifier.weight(1f)
        )
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
            Spacer(modifier = Modifier.width(28.dp))
            Column {
              Text("${authorPosts.size}", color = onBg, fontSize = 18.sp, fontWeight = FontWeight.Bold)
              Text("Posts", color = onBgDim, fontSize = 13.sp)
            }
          }
        }
        item {
          Text(
            target.authorName,
            color = onBg,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
          )
        }
        item {
          Spacer(modifier = Modifier.height(14.dp))
          if (isOwnProfile) {
            OutlinedButton(
              onClick = {},
              colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = onBg),
              border = androidx.compose.foundation.BorderStroke(1.dp, onBgDim.copy(alpha = 0.4f)),
              modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
            ) { Text("Edit Profile") }
          } else {
            var following by remember(target.authorId) { mutableStateOf(false) }
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              androidx.compose.material3.Button(
                onClick = { following = !following },
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
                Box(modifier = Modifier.weight(1f).aspectRatio(1f).padding(1.dp)) {
                  val thumb = post.imageUrls.firstOrNull()
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
  }
}
