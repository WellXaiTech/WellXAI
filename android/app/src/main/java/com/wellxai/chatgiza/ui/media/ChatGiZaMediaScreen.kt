package com.wellxai.chatgiza.ui.media

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Comment
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.Share
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
import com.wellxai.chatgiza.ChatGizaMediaCreateSheet
import com.wellxai.chatgiza.ChatGizaMediaPostComposerScreen
import com.wellxai.chatgiza.ChatViewModel
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

  var showCreate by remember { mutableStateOf(false) }
  var showPostComposer by remember { mutableStateOf(false) }
  var replyingToPost by remember { mutableStateOf<ApiMediaPost?>(null) }
  var expandedCommentsPostId by remember { mutableStateOf<String?>(null) }
  var searchOpen by remember { mutableStateOf(false) }
  var searchQuery by remember { mutableStateOf("") }

  val visiblePosts = remember(viewModel.mediaPosts, searchQuery) {
    val q = searchQuery.trim()
    if (q.isEmpty()) viewModel.mediaPosts
    else viewModel.mediaPosts.filter { it.text.contains(q, ignoreCase = true) || it.authorName.contains(q, ignoreCase = true) }
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
            onOpenComposer = { replyingToPost = post }
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
      ChatGiZaHeader(topInset = topInset, onAddClick = { showCreate = true })
    }

    // =====================================================
    // BOTTOM NAVIGATION
    // =====================================================

    MediaBottomNavigation(
      viewModel = viewModel,
      searchOpen = searchOpen,
      onSearchClick = { searchOpen = !searchOpen },
      onCreateClick = { showCreate = true },
      modifier = Modifier.align(Alignment.BottomCenter)
    )
  }

  if (showCreate) {
    ChatGizaMediaCreateSheet(
      viewModel,
      onDismiss = { showCreate = false },
      onPostClick = {
        showCreate = false
        showPostComposer = true
      }
    )
  }
  if (showPostComposer) {
    ChatGizaMediaPostComposerScreen(viewModel, onDismiss = { showPostComposer = false })
  }
}

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
  onOpenComposer: () -> Unit
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
          modifier = Modifier.size(44.dp).clip(CircleShape),
          contentScale = ContentScale.Crop
        )
      } else {
        Icon(Icons.Outlined.AccountCircle, contentDescription = "Profile", tint = Color.Gray, modifier = Modifier.size(44.dp))
      }

      Spacer(modifier = Modifier.width(10.dp))

      Column(modifier = Modifier.weight(1f)) {
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
        Icon(imageVector = Icons.Outlined.Repeat, contentDescription = "Repost", tint = Color.DarkGray)
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
        Icon(imageVector = Icons.Outlined.Share, contentDescription = "Share", tint = Color.Black)
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
        modifier = Modifier.size(26.dp).clip(CircleShape),
        contentScale = ContentScale.Crop
      )
    } else {
      Icon(Icons.Filled.Person, contentDescription = "Profile", tint = Color.DarkGray)
    }
  }
}
