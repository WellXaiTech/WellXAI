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

// A single self-contained shader instead of the original two-pass
// bake+sample design -- the "static" galaxy noise is recomputed inline
// every frame rather than baked to a texture and sampled through a
// uniform shader child, removing that binding as a possible failure
// point. At icon size (~15-20dp) recomputing it per frame costs nothing
// perceptible. Same visual identity (dust band, stars, pulsar, aurora,
// meteor, lit glass sphere) as the pasted reference, just single-pass.
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

half4 pattern(vec3 n, float t) {
  float lon = atan(n.z, n.x);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float v1 = fract(uPhase * 7.13);
  float v2 = fract(uPhase * 3.71);
  float v3 = fract(uPhase * 5.37);
  float gb = lat + (0.15 + 0.4 * v1) * sin(lon * (1.0 + floor(v2 * 2.0)) + 1.3)
           + 0.12 * sin(lon * 3.0 + t * 0.1);
  float band = exp(-gb * gb * 6.0);
  float n1 = sin(lon * 2.0 + sin(lat * 3.0 + t * 0.25) * 1.6 + t * 0.15);
  float n2 = sin(lon * 5.0 - sin(lat * 4.0 - t * 0.2) * 1.2 - t * 0.22 + 2.4);
  float neb = pow(0.5 + 0.5 * n1, 2.0) * (0.45 + 0.55 * pow(0.5 + 0.5 * n2, 2.0));
  float lane = pow(0.5 + 0.5 * sin(lon * 4.0 + lat * 7.0 + sin(lon * 2.0) * 2.0), 3.0);
  float galaxy = clamp(band * neb * (1.0 - lane * (0.55 + 0.35 * v2)), 0.0, 1.0);
  half3 hue = mix(mix(uC0, uC1, v1), mix(uC1, uC2, v3), 0.5 + 0.5 * sin(lon + lat * 2.0 - t * 0.2));
  half3 dust = mix(half3(0.72, 0.78, 0.92), hue, 0.5 + 0.4 * v1);
  half3 col = dust * galaxy * 0.9;
  half3 voidGlow = mix(half3(0.04, 0.03, 0.1), mix(uC0, mix(uC1, uC2, v3), v1) * 0.24, 0.75);
  col += voidGlow * (0.5 + 0.22 * sin(t * 0.4 + lon)) * (0.4 + 0.6 * band);
  col += half3(1.0, 0.88, 0.68) * pow(band, 4.0) * pow(neb, 2.0) * 0.4;
  float w = clamp(galaxy * 0.7 + pow(band, 4.0) * 0.25, 0.0, 1.0);
  for (int s = 0; s < 2; s++) {
    float K = s == 0 ? 7.0 : 14.0;
    vec2 g = vec2(lon, lat) * K;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float hx = h1(cell.x * 13.7 + cell.y * 7.3 + float(s) * 91.0);
    float hy = h1(cell.x * 5.1 + cell.y * 17.9 + float(s) * 37.0);
    vec2 sp = vec2(0.15 + 0.7 * hx, 0.15 + 0.7 * hy);
    float d = length((f - sp) * vec2(cos(lat), 1.0));
    float keep = step(0.5, h1(hx * 89.0 + hy * 31.0) + band * 0.25);
    float star = exp(-d * d * (s == 0 ? 280.0 : 700.0)) * keep;
    half3 tint = mix(half3(1.0), hx < 0.5 ? half3(0.85, 0.9, 1.0) : mix(half3(1.0), uC1, 0.3), 0.6);
    col += tint * star * (s == 0 ? 1.6 : 0.8);
    w = max(w, star);
  }
  float pa = v1 * 6.28318;
  vec3 P = normalize(vec3(sin(pa) * 0.9, 1.4 * (v2 - 0.5), cos(pa) * 0.9));
  float pd = max(dot(n, P), 0.0);
  float beat = pow(0.5 + 0.5 * sin(t * (1.2 + v3 + 1.5 * uAudio) + v3 * 6.28), 8.0);
  beat = min(1.0, beat + 0.6 * uAudio);
  col += half3(0.9, 0.95, 1.0) * (pow(pd, 900.0) * (0.6 + 1.2 * beat) + pow(pd, 110.0) * 0.5 * beat);
  w = max(w, pow(pd, 900.0));
  return half4(min(col, half3(1.0)), min(w, 1.0));
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
 * sheet. */
@Composable
fun OrinVoiceBadge(modifier: Modifier = Modifier, tint: Color) {
  var failed by remember { mutableStateOf(false) }

  if (!failed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    VoiceOrb(
      modifier = modifier,
      seedPhase = 0.42f,
      anchor = Color(0xFF6D8CFF),
      colorA = Color(0xFF3A5CFF),
      colorB = Color(0xFFBFD4FF),
      colorC = Color(0xFF8E6DFF),
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
  anchor: Color = Color(0xFF6D8CFF),
  colorA: Color = Color(0xFF3A5CFF),
  colorB: Color = Color(0xFFBFD4FF),
  colorC: Color = Color(0xFF8E6DFF),
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
