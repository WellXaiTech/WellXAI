package com.wellxai.chatgiza

import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas as NativeCanvas
import android.graphics.Paint as NativePaint
import android.graphics.RuntimeShader
import android.graphics.Shader as NativeShader
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource

// Bakes the static part of the galaxy (dust, lanes, wisps, pockets, grain)
// into an equirect texture once per (seed, archetype), then the live
// per-frame shader below samples it cheaply instead of recomputing all of
// that noise every frame. Fixed vs the pasted source: uPhase/uC0/uC1/uC2
// were used in the body but never declared as uniforms, and three
// functions were missing their closing brace.
private const val VOICE_ORB_BAKE_SKSL = """
uniform float uArch;
uniform float uPhase;
uniform vec2 uOutSize;
uniform half3 uC0;
uniform half3 uC1;
uniform half3 uC2;

float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }

half4 skyStatic(float lon, float lat, vec3 n, float t,
                float v1, float v2, float v3,
                float isNeb, float isCore, float isDeep,
                float resFac, float band) {
  float n1 = sin(lon * 2.0 + sin(lat * 3.0 + t * 0.25) * 1.6 + t * 0.15);
  float n2 = sin(lon * 5.0 - sin(lat * 4.0 - t * 0.2) * 1.2 - t * 0.22 + 2.4);
  float neb = pow(0.5 + 0.5 * n1, 2.0) * (0.45 + 0.55 * pow(0.5 + 0.5 * n2, 2.0));
  float lane = pow(0.5 + 0.5 * sin(lon * 4.0 + lat * 7.0 + sin(lon * 2.0) * 2.0), 3.0);
  float galaxy = clamp(band * neb * (1.0 - lane * (0.55 + 0.35 * v2)), 0.0, 1.0);
  half3 hue = mix(mix(uC0, uC1, v1), mix(uC1, uC2, v3), 0.5 + 0.5 * sin(lon + lat * 2.0 - t * 0.2));
  half3 hueGrey = half3(dot(hue, half3(0.299, 0.587, 0.114)));
  hue = clamp(hueGrey + (hue - hueGrey) * 1.45, 0.0, 1.0);
  half3 dust = mix(half3(0.72, 0.78, 0.92), hue, 0.45 + 0.3 * v1 + 0.45 * isNeb);
  half3 col = dust * galaxy * (0.6 + 0.9 * isNeb);
  float shear = sin(lon * 13.0 + lat * 4.0 - t * 0.35) * sin(lon * 5.0 + t * 0.2);
  col += dust * band * neb * max(shear, 0.0) * 0.14;
  float gb2 = lat - (0.35 + 0.25 * v2) * sin(lon * 2.0 - 1.1) + 0.4;
  float arm = exp(-gb2 * gb2 * 7.0) * neb;
  col += mix(dust, uC1, 0.35) * arm * 0.2;
  half3 voidGlow = mix(half3(0.04, 0.03, 0.1), mix(uC0, mix(uC1, uC2, v3), v1) * 0.22, 0.75);
  col += voidGlow * (0.5 + 0.22 * sin(t * 0.4 + lon)) * (0.4 + 0.6 * band);
  col += half3(1.0, 0.88, 0.68) * pow(band, 4.0) * pow(neb, 2.0) * 0.4;
  float ca = v2 * 6.28318;
  vec3 Cdir = normalize(vec3(cos(ca) * 0.85, 0.6 * (v3 - 0.5), sin(ca) * 0.85));
  float bulge = max(dot(n, Cdir), 0.0);
  col += mix(half3(1.0, 0.85, 0.6), uC2, 0.25) * (pow(bulge, 14.0) * 1.6 + pow(bulge, 4.0) * 0.5) * isCore;
  float pocket = pow(neb, 5.0) * band * (0.7 + 0.3 * sin(t * 0.6 + lon * 3.0));
  col += mix(uC2, uC0, fract(v1 + 0.5 * sin(lon * 2.0) + 0.5)) * pocket * (0.5 + 0.4 * v2 + 0.8 * isNeb);
  float pocket2 = pow(0.5 + 0.5 * sin(lon * 3.0 + lat * 4.0 - t * 0.18 + 2.0), 6.0) * band;
  col += mix(uC1, uC2, v3) * pocket2 * (0.25 + 0.3 * v1 + 0.5 * isNeb);
  vec2 gg = vec2(lon, lat) * 34.0;
  vec2 gc = floor(gg);
  vec2 gf = fract(gg);
  float gh = h1(gc.x * 3.7 + gc.y * 11.3);
  vec2 gp = vec2(0.2 + 0.6 * h1(gh * 91.0), 0.2 + 0.6 * h1(gh * 47.0));
  float gd = length((gf - gp) * vec2(cos(lat), 1.0));
  float grain = exp(-gd * gd * 700.0 * resFac) * step(0.3, gh) * (0.15 + 0.85 * band);
  col += half3(0.88, 0.9, 1.0) * grain * 0.4;
  float w = clamp(galaxy * 0.7 + pow(band, 4.0) * 0.25, 0.0, 1.0);
  return half4(min(col, half3(1.0)), w);
}

half4 main(float2 fragCoord) {
  vec2 uv = fragCoord / uOutSize;
  float lon = (uv.x - 0.5) * 6.2831853;
  float lat = (uv.y - 0.5) * 3.14159265;
  vec3 n = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float v1 = fract(uPhase * 7.13);
  float v2 = fract(uPhase * 3.71);
  float v3 = fract(uPhase * 5.37);
  float at = uArch >= 0.0 ? uArch : floor(fract(uPhase * 9.73) * 4.0);
  float isNeb = step(0.5, at) * (1.0 - step(1.5, at));
  float isCore = step(1.5, at) * (1.0 - step(2.5, at));
  float isDeep = step(2.5, at);
  float t = 0.0;
  float gb = lat + (0.15 + 0.4 * v1) * sin(lon * (1.0 + floor(v2 * 2.0)) + 1.3)
           + 0.12 * sin(lon * 3.0 + t * 0.1);
  float band = exp(-gb * gb * (5.0 + 10.0 * v3));
  band = mix(band, max(band, 0.8), isNeb);
  band *= 1.0 - 0.85 * isDeep;
  return skyStatic(lon, lat, n, t, v1, v2, v3, isNeb, isCore, isDeep, 1.0, band);
}
"""

// The live per-frame orb: a refractive glass sphere whose surface samples
// the baked sky, plus analytic stars, a pulsar, aurora curtains, a
// shooting star, and 3D lighting -- fixed vs the pasted source in the same
// way (missing closing braces on the star loop, pattern(), sphereAt(),
// the corner early-out, and main() itself).
private const val VOICE_ORB_LIVE_SKSL = """
uniform vec2 uRes;
uniform half3 uAnchor;
uniform half3 uC0;
uniform half3 uC1;
uniform half3 uC2;
uniform float uTime;
uniform float uPhase;
uniform float uAudio;
uniform float uArch;
uniform shader uSky;
uniform vec2 uSkySize;
uniform float uSpin;

float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }

half4 pattern(vec3 n, float t) {
  float lon = atan(n.z, n.x);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float v1 = fract(uPhase * 7.13);
  float v2 = fract(uPhase * 3.71);
  float v3 = fract(uPhase * 5.37);
  float at = uArch >= 0.0 ? uArch : floor(fract(uPhase * 9.73) * 4.0);
  float isNeb = step(0.5, at) * (1.0 - step(1.5, at));
  float isCore = step(1.5, at) * (1.0 - step(2.5, at));
  float isDeep = step(2.5, at);
  float gb = lat + (0.15 + 0.4 * v1) * sin(lon * (1.0 + floor(v2 * 2.0)) + 1.3)
           + 0.12 * sin(lon * 3.0 + t * 0.1);
  float band = exp(-gb * gb * (5.0 + 10.0 * v3));
  band = mix(band, max(band, 0.8), isNeb);
  band *= 1.0 - 0.85 * isDeep;
  half3 col;
  float w;
  vec2 suv = vec2(lon / 6.2831853 + 0.5, lat / 3.14159265 + 0.5);
  half4 sky = uSky.eval(suv * uSkySize);
  col = sky.rgb;
  w = float(sky.a);
  for (int s = 0; s < 3; s++) {
    float K = s == 0 ? 6.0 : (s == 1 ? 11.0 : 19.0);
    vec2 g = vec2(lon, lat) * K;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float hx = h1(cell.x * 13.7 + cell.y * 7.3 + float(s) * 91.0);
    float hy = h1(cell.x * 5.1 + cell.y * 17.9 + float(s) * 37.0);
    vec2 sp = vec2(0.15 + 0.7 * hx, 0.15 + 0.7 * hy);
    float d = length((f - sp) * vec2(cos(lat), 1.0));
    float census = (v2 - 0.5) * 0.2 + 0.35 * isNeb - 0.2 * isCore + 0.3 * isDeep;
    float keep = step((s == 2 ? 0.3 : 0.55) + census, h1(hx * 89.0 + hy * 31.0) + band * 0.25);
    float resFac = clamp(uRes.y / 420.0, 0.22, 1.0);
    float tw = mix(0.92, 0.6 + 0.4 * sin(t * (1.5 + 3.0 * hx) + hx * 40.0), resFac);
    float hz = h1(hx * 53.0 + hy * 71.0 + cell.x);
    float sizeJit = 0.35 + 1.8 * hz * hz;
    float sharp = (s == 0 ? 260.0 : (s == 1 ? 700.0 : 1600.0)) / sizeJit * resFac;
    float star = exp(-d * d * sharp) * keep * tw;
    half3 tint = mix(half3(1.0), hx < 0.33 ? half3(0.85, 0.9, 1.0) : (hx < 0.66 ? half3(1.0, 0.95, 0.85) : mix(half3(1.0), uC1, 0.3)), 0.6);
    float bright = (s == 0 ? 1.7 : (s == 1 ? 0.9 : 0.5)) * (0.55 + 0.7 * sizeJit);
    col += tint * star * bright;
    if (s == 0) {
      float big = smoothstep(1.2, 2.0, sizeJit);
      col += tint * exp(-d * d * 60.0) * 0.18 * big * tw;
      vec2 dd = (f - sp) * vec2(cos(lat), 1.0);
      float spike = exp(-dd.x * dd.x * 1200.0) * exp(-dd.y * dd.y * 26.0)
                  + exp(-dd.y * dd.y * 1200.0) * exp(-dd.x * dd.x * 26.0);
      col += tint * spike * 0.3 * big * tw;
      w = max(w, spike * 0.3 * big);
    }
    w = max(w, star * min(bright, 1.5));
  }
  float pa = v1 * 6.28318;
  vec3 P = normalize(vec3(sin(pa) * 0.9, 1.4 * (v2 - 0.5), cos(pa) * 0.9));
  float pd = max(dot(n, P), 0.0);
  float beat = pow(0.5 + 0.5 * sin(t * (1.2 + v3 + 1.5 * uAudio) + v3 * 6.28), 8.0);
  beat = min(1.0, beat + 0.6 * uAudio);
  col += half3(0.9, 0.95, 1.0) * (pow(pd, 900.0) * (0.6 + 1.2 * beat) + pow(pd, 110.0) * 0.5 * beat);
  w = max(w, pow(pd, 900.0) * (0.5 + 0.5 * beat));
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
  vec3 I = vec3(0.0, 0.0, -1.0);
  vec3 R = refract(I, N, 0.75);
  float dHit = -2.0 * dot(N, R);
  vec3 B = normalize(N + R * dHit);
  half4 front;
  half4 back;
  float sv = fract(uPhase * 6.31);
  float sw = fract(uPhase * 2.17);
  float tWarp = t
    + (0.9 + 1.3 * sv) * sin(t * (0.09 + 0.07 * sw))
    + (0.5 + 0.8 * sw) * sin(t * (0.21 + 0.09 * sv) + 2.6);
  front = sphereAt(N, uSpin, tWarp);
  back = sphereAt(B, uSpin, tWarp * 0.8 + 2.7);
  half3 col;
  half3 voidCol = mix(uAnchor * 0.04, uAnchor * 0.35, fres);
  col = voidCol * (0.97 - 0.04 * fres);
  float fa = clamp(front.a, 0.0, 1.0);
  float ba = clamp(back.a, 0.0, 1.0);
  col = mix(col, back.rgb, ba * 0.16);
  col = mix(col, front.rgb, fa * 0.85);
  float alon = atan(N.x, N.z);
  float speech = pow(0.5 + 0.5 * sin(alon * 3.0 + sin(alon * 7.0 + t * 1.1) * 0.7 + t * 0.5), 3.0)
               * (0.55 + 0.45 * sin(alon * 5.0 - t * 0.65 + 1.7));
  float sky = -N.y;
  float hang = smoothstep(-0.15, 0.5, sky);
  float rays = 0.7 + 0.3 * sin(alon * 24.0 + sin(alon * 9.0 - t * 0.8) * 2.0 + t * 1.6);
  float aur = clamp(speech, 0.0, 1.0) * hang * rays * (1.0 + 2.2 * uAudio);
  float av = fract(uPhase * 2.93);
  half3 aurCol = mix(half3(0.12, 0.95, 0.55), half3(0.45, 0.35, 1.0),
                     smoothstep(0.0, 0.95, sky + 0.35 * speech));
  aurCol = mix(aurCol, mix(uC0, uC2, av), 0.15 + 0.4 * av);
  col += aurCol * aur * 0.8;
  float met = 4.5 + 3.5 * fract(uPhase * 4.91);
  float epoch = floor(t / met);
  float ph = fract(t / met);
  vec2 s0 = vec2(-1.1 + 2.2 * h1(epoch * 1.3), 0.85 - 1.4 * h1(epoch * 2.9));
  vec2 sd = normalize(vec2(0.7 + 0.5 * h1(epoch * 4.1), -0.35 - 0.4 * h1(epoch * 5.3)));
  vec2 head = s0 + sd * ph * 2.8;
  vec2 rel = p - head;
  float along = dot(rel, sd);
  float perp = dot(rel, vec2(-sd.y, sd.x));
  float vis = smoothstep(0.0, 0.06, ph) * smoothstep(0.5, 0.32, ph);
  float tail = exp(-perp * perp * 1600.0) * exp(along * 9.0) * step(along, 0.0)
             * smoothstep(-0.5, -0.02, along);
  float headGlow = exp(-dot(rel, rel) * 900.0);
  col += (half3(1.0) * headGlow * 1.2 + mix(half3(1.0), uC1, 0.3) * tail * 0.85) * vis;
  vec3 LD = normalize(vec3(0.85 * sin(t * 0.42), 0.45 * sin(t * 0.26 + 1.2), 0.5));
  float diffuse = 0.62 + 0.65 * max(dot(N, LD), 0.0);
  diffuse *= 1.0 + 0.35 * uAudio;
  col *= diffuse;
  half3 voiceCol = mix(uC1, half3(1.0, 0.97, 0.9), 0.45);
  col += voiceCol * pow(1.0 - rr, 1.8) * uAudio * 0.5;
  col += (uC1 * 0.7 + half3(0.12)) * fres * uAudio * 0.65;
  col += col * uAudio * 0.18 * sin(t * 14.0 + rr * 40.0 + uPhase * 7.0);
  float counter = max(dot(N.xy, -LD.xy), 0.0) * fres;
  col += mix(uC0, half3(0.5, 0.6, 0.9), 0.5) * counter * 0.18;
  vec3 L1 = normalize(vec3(-0.45 + 0.3 * sin(t * 0.34), 0.62 + 0.2 * sin(t * 0.27 + 1.7), 0.64));
  float keyAmp = 0.5 * (0.78 + 0.22 * sin(t * 0.45 + 2.2));
  col += half3(1.0) * pow(max(dot(N, L1), 0.0), 150.0) * keyAmp;
  vec3 LS = normalize(vec3(sin(t * 0.07) * 0.9, 0.35 + 0.3 * cos(t * 0.05), 0.7));
  col += half3(1.0) * pow(max(dot(N, LS), 0.0), 7.0) * 0.05;
  vec3 L2 = normalize(vec3(0.52, -0.5 + 0.12 * sin(t * 0.09), 0.69));
  col += half3(1.0) * pow(max(dot(N, L2), 0.0), 140.0) * 0.25;
  col = mix(col, front.rgb, fa * fres * 0.3);
  float limb = smoothstep(0.94, 1.0, rr);
  col = mix(col, col * 0.85, limb * 0.4);
  return half4(col, 1.0);
}
"""

/**
 * The animated voice orb -- galaxy-in-glass with aurora, stars and a
 * pulsar, driven by [seedPhase] (per-voice structural variance) and
 * [audioLevel] (0 for a static list badge, live mic amplitude for an
 * active call). Requires API 33 (RuntimeShader); call sites should check
 * [isVoiceOrbSupported] and fall back to a plain icon below that.
 */
val isVoiceOrbSupported: Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@Composable
fun VoiceOrb(
  modifier: Modifier = Modifier,
  seedPhase: Float = 0.42f,
  archetype: Float = 0f,
  anchor: Color = Color(0xFF6D8CFF),
  colorA: Color = Color(0xFF3A5CFF),
  colorB: Color = Color(0xFFBFD4FF),
  colorC: Color = Color(0xFF8E6DFF),
  audioLevel: Float = 0f
) {
  val bakeShader = remember { RuntimeShader(VOICE_ORB_BAKE_SKSL) }
  val liveShader = remember { RuntimeShader(VOICE_ORB_LIVE_SKSL) }

  // Baked once per (seed, archetype, palette) -- the expensive static
  // noise never needs to be recomputed on every animation frame.
  val skyBitmap = remember(seedPhase, archetype, colorA, colorB, colorC) {
    val w = 256
    val h = 128
    bakeShader.setFloatUniform("uArch", archetype)
    bakeShader.setFloatUniform("uPhase", seedPhase)
    bakeShader.setFloatUniform("uOutSize", w.toFloat(), h.toFloat())
    bakeShader.setColorUniform("uC0", colorA.toArgb())
    bakeShader.setColorUniform("uC1", colorB.toArgb())
    bakeShader.setColorUniform("uC2", colorC.toArgb())
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = NativeCanvas(bmp)
    val paint = NativePaint().apply { shader = bakeShader }
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
    bmp
  }

  liveShader.setColorUniform("uAnchor", anchor.toArgb())
  liveShader.setColorUniform("uC0", colorA.toArgb())
  liveShader.setColorUniform("uC1", colorB.toArgb())
  liveShader.setColorUniform("uC2", colorC.toArgb())
  liveShader.setFloatUniform("uPhase", seedPhase)
  liveShader.setFloatUniform("uArch", archetype)
  liveShader.setFloatUniform("uAudio", audioLevel)
  liveShader.setFloatUniform("uSkySize", skyBitmap.width.toFloat(), skyBitmap.height.toFloat())
  liveShader.setInputShader(
    "uSky",
    BitmapShader(skyBitmap, NativeShader.TileMode.REPEAT, NativeShader.TileMode.CLAMP)
  )

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
    liveShader.setFloatUniform("uRes", size.width, size.height)
    liveShader.setFloatUniform("uTime", time)
    liveShader.setFloatUniform("uSpin", spin)
    drawIntoCanvas { canvas ->
      val paint = NativePaint().apply { shader = liveShader }
      canvas.nativeCanvas.drawRect(0f, 0f, size.width, size.height, paint)
    }
  }
}

/** Orin's badge next to her name in the voice list -- the full animated
 * orb on API 33+, the plain cloud glyph on everything older. */
@Composable
fun OrinVoiceBadge(modifier: Modifier = Modifier, tint: Color) {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    VoiceOrb(
      modifier = modifier,
      seedPhase = 0.42f,
      anchor = Color(0xFF6D8CFF),
      colorA = Color(0xFF3A5CFF),
      colorB = Color(0xFFBFD4FF),
      colorC = Color(0xFF8E6DFF)
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
