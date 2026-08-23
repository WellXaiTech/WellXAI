package com.wellxai.chatgiza

import android.graphics.Paint as NativePaint
import android.graphics.RuntimeShader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource

// Fixed palette for the glossy black glass sphere design (see pattern()
// below): near-black glass base, a narrow magenta reflection at the top,
// and violet/cyan accents woven into the rim's chromatic zones. Named
// constants instead of inline literals since both OrinVoiceBadge and
// VoiceLibraryHeroOrb pass the same fixed set -- this is a specific,
// designed-to-spec look, not tied to whichever voice is selected.
private val ORB_BASE_BLACK = Color(0xFF07070F)
private val ORB_TOP_MAGENTA = Color(0xFFFF3FD4)
private val ORB_ACCENT_VIOLET = Color(0xFF7A5CFF)
private val ORB_ACCENT_CYAN = Color(0xFF36E0FF)

// A single self-contained shader instead of a two-pass bake+sample design
// -- the sphere's surface pattern is recomputed inline every frame rather
// than baked to a texture and sampled through a uniform shader child,
// removing that binding as a possible failure point. At icon size
// (~15-20dp) recomputing it per frame costs nothing perceptible. Renders a
// polished black glass sphere with a magenta top reflection and small
// chromatic rim highlights (see pattern()), plus the existing rotation,
// fresnel/limb lighting, and audio-reactive aurora/pulsar in main().
private const val VOICE_ORB_SKSL = """
uniform vec2 uRes;
uniform half3 uAnchor;
uniform half3 uC0;
uniform half3 uC1;
uniform half3 uC2;
uniform float uTime;
uniform float uPhase;
uniform float uAudio;
uniform float uSpin;

float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }

// Glossy black glass sphere with a narrow magenta reflection at the top
// and small chromatic reflections around the rim (purple/blue/cyan upper
// left, magenta/red/violet upper right, green/cyan/blue right edge,
// blue/purple/magenta lower right, cyan/blue/violet lower left) -- direct
// port of the reference Three.js shader's zone logic onto this composable's
// existing screen-space sphere normal (n) and rotation pipeline. Returned
// alpha is how strongly a zone's color should show over the (separately
// computed, near-black) void base in main() below -- near 0 almost
// everywhere, so the sphere reads as ~90% deep black with the colored
// zones only where each gate term is actually lit up, matching the "mostly
// black, colorful only through localized glass reflections" brief.
half4 pattern(vec3 n, float t) {
  float ny = n.y;
  float ang = atan(n.z, n.x);
  float side = clamp(1.0 - n.z, 0.0, 1.0);

  float topZone = smoothstep(-0.1, 0.9, ny);
  float topFade = pow(topZone, 1.5);
  half3 topCol = uC0 * topFade * 0.85;

  float ulG = smoothstep(0.35, 1.0, ny) * exp(-abs(ang - 3.0) * 1.8);
  half3 ulA = mix(half3(0.55, 0.25, 1.0), half3(0.15, 0.30, 1.0), smoothstep(-3.6, -3.0, ang));
  half3 ulB = mix(half3(0.15, 0.30, 1.0), half3(0.0, 0.75, 1.0), smoothstep(-3.0, -2.3, ang));
  half3 ul = ulG * mix(ulA, ulB, side);

  float urG = smoothstep(0.35, 1.0, ny) * exp(-abs(ang + 2.1) * 1.8);
  half3 urA = mix(half3(1.0, 0.25, 0.83), half3(1.0, 0.15, 0.15), smoothstep(-2.6, -1.9, ang));
  half3 urB = mix(half3(1.0, 0.15, 0.15), half3(0.62, 0.2, 1.0), smoothstep(-1.9, -1.2, ang));
  half3 ur = urG * mix(urA, urB, side);

  float rtG = exp(-abs(ang - 0.0) * 1.1);
  half3 rt = rtG * mix(half3(0.1, 1.0, 0.35), half3(0.0, 0.8, 1.0), smoothstep(-0.5, 0.5, ang));

  float lbG = (1.0 - smoothstep(-0.1, 0.7, ny)) * exp(-abs(ang - 1.0) * 1.1);
  half3 lbA = mix(half3(0.15, 0.4, 1.0), half3(0.55, 0.25, 1.0), smoothstep(0.4, 1.2, ang));
  half3 lb = lbG * mix(lbA, half3(1.0, 0.25, 0.83), smoothstep(1.2, 2.0, ang));

  float llG = (1.0 - smoothstep(-0.1, 0.6, ny)) * exp(-abs(ang - 2.4) * 1.6);
  half3 llA = mix(half3(0.0, 0.8, 1.0), half3(0.15, 0.3, 1.0), smoothstep(2.0, 2.6, ang));
  half3 ll = llG * mix(llA, half3(0.6, 0.25, 1.0), smoothstep(2.6, 3.2, ang));

  float gHash = h1(floor(n.x * 30.0 + n.y * 41.0) + t * 0.5);
  float sp = smoothstep(0.975, 1.0, gHash) * side * 0.5;
  half3 spCol = half3(h1(n.x * 91.0 + 3.0), h1(n.y * 57.0 + 7.0), h1((n.x + n.y) * 33.0 + 11.0));

  half3 col = uAnchor * 0.5;
  col += topCol;
  col += ul * 0.55 + ur * 0.55;
  col += rt * 0.30;
  col += (lb + ll) * 0.40;
  col += spCol * sp;

  float w = clamp(topFade * 0.9 + ulG * 0.5 + urG * 0.5 + rtG * 0.35 + lbG * 0.45 + llG * 0.45 + sp, 0.0, 1.0);
  return half4(min(col, half3(1.0)), w);
}

half4 sphereAt(vec3 n, float spin, float t) {
  float roll = t * 0.13;
  float cr = cos(roll);
  float sr = sin(roll);
  n = vec3(cr * n.x - sr * n.y, sr * n.x + cr * n.y, n.z);
  float tilt = 0.45 + 0.35 * sin(t * 0.24);
  float cx = cos(tilt);
  float sx = sin(tilt);
  n = vec3(n.x, cx * n.y - sx * n.z, sx * n.y + cx * n.z);
  float cs = cos(spin);
  float ss = sin(spin);
  n = vec3(cs * n.x + ss * n.z, n.y, -ss * n.x + cs * n.z);
  return pattern(n, t);
}

half4 main(float2 fragCoord) {
  vec2 uv = fragCoord / uRes;
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  float t = uTime * 0.8 + uPhase;
  if (r > 1.10) {
    half3 cc = uAnchor * 0.33;
    return half4(cc, 1.0);
  }
  float rr = min(r, 0.9995);
  float z = sqrt(1.0 - rr * rr);
  vec3 N = vec3(p.x, p.y, z);
  float fres = pow(1.0 - z, 2.4);
  half4 front = sphereAt(N, uSpin, t);
  float fa = clamp(front.a, 0.0, 1.0);
  half3 voidCol = mix(uAnchor * 0.04, uAnchor * 0.35, fres);
  half3 col = voidCol * (0.97 - 0.04 * fres);
  col = mix(col, front.rgb, fa * 0.85);
  float alon = atan(N.x, N.z);
  float speech = pow(0.5 + 0.5 * sin(alon * 3.0 + sin(alon * 7.0 + t * 1.1) * 0.7 + t * 0.5), 3.0)
               * (0.55 + 0.45 * sin(alon * 5.0 - t * 0.65 + 1.7));
  float sky = -N.y;
  float hang = smoothstep(-0.15, 0.5, sky);
  float aur = clamp(speech, 0.0, 1.0) * hang * (1.0 + 2.2 * uAudio);
  half3 aurCol = mix(half3(0.12, 0.95, 0.55), half3(0.45, 0.35, 1.0), smoothstep(0.0, 0.95, sky + 0.35 * speech));
  col += aurCol * aur * 0.7;
  vec3 LD = normalize(vec3(0.85 * sin(t * 0.42), 0.45 * sin(t * 0.26 + 1.2), 0.5));
  float diffuse = (0.62 + 0.65 * max(dot(N, LD), 0.0)) * (1.0 + 0.35 * uAudio);
  col *= diffuse;
  half3 voiceCol = mix(uC1, half3(1.0, 0.97, 0.9), 0.45);
  col += voiceCol * pow(1.0 - rr, 1.8) * uAudio * 0.5;
  col += (uC1 * 0.7 + half3(0.12)) * fres * uAudio * 0.65;
  vec3 L1 = normalize(vec3(-0.45 + 0.3 * sin(t * 0.34), 0.62 + 0.2 * sin(t * 0.27 + 1.7), 0.64));
  col += half3(1.0) * pow(max(dot(N, L1), 0.0), 150.0) * 0.5;
  col = mix(col, front.rgb, fa * fres * 0.3);
  float limb = smoothstep(0.94, 1.0, rr);
  col = mix(col, col * 0.85, limb * 0.4);
  return half4(col, 1.0);
}
"""

/** Orin's badge next to her name in the voice list -- the full animated
 * orb on API 33+, the plain cloud glyph everywhere else. Shader
 * compilation and per-frame uniform setting are both guarded so a bad
 * shader shows the fallback glyph instead of crashing the settings
 * sheet. audioLevel (0..1) brightens the rim/aurora while live -- also
 * used at icon size for the Live Vision status pill's speaking indicator. */
@Composable
fun OrinVoiceBadge(modifier: Modifier = Modifier, tint: Color, audioLevel: Float = 0f) {
  var failed by remember { mutableStateOf(false) }

  if (!failed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    VoiceOrb(
      modifier = modifier,
      seedPhase = 0.42f,
      anchor = ORB_BASE_BLACK,
      colorA = ORB_TOP_MAGENTA,
      colorB = ORB_ACCENT_VIOLET,
      colorC = ORB_ACCENT_CYAN,
      audioLevel = audioLevel,
      onError = { failed = true }
    )
  } else {
    androidx.compose.material3.Icon(
      painter = painterResource(R.drawable.ic_cloud),
      contentDescription = "Cloud voice",
      tint = tint,
      modifier = modifier
    )
  }
}

/** Same orb as [OrinVoiceBadge], sized up as the hero avatar on Settings >
 * Voice. Fixed palette, not tied to whichever voice is selected. */
@Composable
fun VoiceLibraryHeroOrb(modifier: Modifier = Modifier, tint: Color) {
  var failed by remember { mutableStateOf(false) }

  if (!failed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    VoiceOrb(
      modifier = modifier,
      seedPhase = 0.42f,
      anchor = ORB_BASE_BLACK,
      colorA = ORB_TOP_MAGENTA,
      colorB = ORB_ACCENT_VIOLET,
      colorC = ORB_ACCENT_CYAN,
      onError = { failed = true }
    )
  } else {
    androidx.compose.material3.Icon(
      painter = painterResource(R.drawable.ic_cloud),
      contentDescription = "Cloud voice",
      tint = tint,
      modifier = modifier
    )
  }
}

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@Composable
private fun VoiceOrb(
  modifier: Modifier = Modifier,
  seedPhase: Float = 0.42f,
  anchor: Color = Color.White,
  colorA: Color = Color.White,
  colorB: Color = Color.White,
  colorC: Color = Color.White,
  audioLevel: Float = 0f,
  onError: () -> Unit
) {
  val shader = remember { runCatching { RuntimeShader(VOICE_ORB_SKSL) }.getOrNull() }
  if (shader == null) {
    LaunchedEffect(Unit) { onError() }
    return
  }

  val setupOk = remember(anchor, colorA, colorB, colorC, seedPhase) {
    runCatching {
      shader.setFloatUniform("uAnchor", anchor.red, anchor.green, anchor.blue)
      shader.setFloatUniform("uC0", colorA.red, colorA.green, colorA.blue)
      shader.setFloatUniform("uC1", colorB.red, colorB.green, colorB.blue)
      shader.setFloatUniform("uC2", colorC.red, colorC.green, colorC.blue)
      shader.setFloatUniform("uPhase", seedPhase)
    }.isSuccess
  }
  if (!setupOk) {
    LaunchedEffect(Unit) { onError() }
    return
  }

  val infiniteTransition = rememberInfiniteTransition(label = "voiceOrbTime")
  val time by infiniteTransition.animateFloat(
    initialValue = 0f,
    targetValue = 1000f,
    animationSpec = infiniteRepeatable(
      animation = tween(durationMillis = 1_000_000, easing = LinearEasing),
      repeatMode = RepeatMode.Restart
    ),
    label = "voiceOrbTime"
  )
  val spin by infiniteTransition.animateFloat(
    initialValue = 0f,
    targetValue = (2 * Math.PI).toFloat(),
    animationSpec = infiniteRepeatable(
      animation = tween(durationMillis = 40_000, easing = LinearEasing),
      repeatMode = RepeatMode.Restart
    ),
    label = "voiceOrbSpin"
  )

  Canvas(
    modifier = modifier
      .clip(CircleShape)
      .graphicsLayer()
  ) {
    runCatching {
      shader.setFloatUniform("uRes", size.width, size.height)
      shader.setFloatUniform("uTime", time)
      shader.setFloatUniform("uAudio", audioLevel)
      shader.setFloatUniform("uSpin", spin)
      drawIntoCanvas { canvas ->
        val paint = NativePaint().apply { this.shader = shader }
        canvas.nativeCanvas.drawRect(0f, 0f, size.width, size.height, paint)
      }
    }.onFailure { onError() }
  }
}
