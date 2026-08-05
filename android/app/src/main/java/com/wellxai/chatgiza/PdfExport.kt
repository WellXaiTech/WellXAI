package com.wellxai.chatgiza

import android.content.Context
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.io.File
import java.io.FileOutputStream

private const val PAGE_WIDTH = 595 // A4 at 72dpi
private const val PAGE_HEIGHT = 842
private const val MARGIN = 48f

/** Renders [body] as a simple paginated PDF (title + wrapped body text) and
 * writes it into the app cache dir, ready to be shared via FileProvider. */
fun generateReplyPdf(context: Context, title: String, body: String): File {
  val titlePaint = TextPaint().apply {
    isAntiAlias = true
    textSize = 20f
    color = android.graphics.Color.BLACK
    isFakeBoldText = true
  }
  val bodyPaint = TextPaint().apply {
    isAntiAlias = true
    textSize = 13f
    color = android.graphics.Color.BLACK
  }
  val contentWidth = (PAGE_WIDTH - MARGIN * 2).toInt()
  val usableHeight = PAGE_HEIGHT - MARGIN * 2

  val titleLayout = StaticLayout.Builder
    .obtain(title, 0, title.length, titlePaint, contentWidth)
    .setAlignment(Layout.Alignment.ALIGN_NORMAL)
    .build()
  val bodyLayout = StaticLayout.Builder
    .obtain(body, 0, body.length, bodyPaint, contentWidth)
    .setAlignment(Layout.Alignment.ALIGN_NORMAL)
    .setLineSpacing(4f, 1f)
    .build()

  val document = PdfDocument()
  var pageNumber = 1
  var page = document.startPage(PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create())
  var canvas = page.canvas
  canvas.translate(MARGIN, MARGIN)
  titleLayout.draw(canvas)

  // cursorY is the fixed top offset of the text-flow area on the current
  // page (below the title on page 1, zero on every page after); baseTop
  // tracks the StaticLayout Y of the first line drawn on the current page
  // so each line's position can be re-based into that page's coordinates.
  var cursorY = titleLayout.height + 20f
  var baseTop = 0
  for (i in 0 until bodyLayout.lineCount) {
    if (cursorY + (bodyLayout.getLineBottom(i) - baseTop) > usableHeight) {
      document.finishPage(page)
      pageNumber++
      page = document.startPage(PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create())
      canvas = page.canvas
      canvas.translate(MARGIN, MARGIN)
      cursorY = 0f
      baseTop = bodyLayout.getLineTop(i)
    }
    val lineText = body.substring(bodyLayout.getLineStart(i), bodyLayout.getLineEnd(i))
    val baselineY = cursorY + (bodyLayout.getLineBaseline(i) - baseTop)
    canvas.drawText(lineText, 0f, baselineY, bodyPaint)
  }
  document.finishPage(page)

  val file = File(context.cacheDir, "chatgiza-reply-${System.currentTimeMillis()}.pdf")
  FileOutputStream(file).use { stream -> document.writeTo(stream) }
  document.close()
  return file
}
