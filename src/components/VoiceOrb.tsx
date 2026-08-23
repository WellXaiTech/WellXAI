"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Glossy black cosmic glass sphere -- a twinkling starfield inside a real
// PBR glass body (THREE.MeshPhysicalMaterial's iridescence/transmission/
// clearcoat, not a hand-rolled approximation) with a magenta top reflection
// and small directional chromatic highlights around the rim. Ported from a
// standalone Three.js prototype into a reusable, embeddable component:
// sized by the container div via ResizeObserver instead of the viewport,
// transparent background so it sits on whatever panel it's placed in, no
// drag/zoom controls (this is a small embedded badge, not a standalone
// viewer), and every three.js object is disposed on unmount so opening/
// closing the panel repeatedly (Live Voice, Settings) doesn't leak GPU
// memory.
export default function VoiceOrb({ className, active = false }: { className?: string; active?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.3, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const wrapper = new THREE.Group();
    scene.add(wrapper);

    // Twinkling starfield inside the shell -- each star has its own phase
    // so they flicker independently rather than the whole field pulsing
    // in lockstep.
    const starCount = 700;
    const starPos = new Float32Array(starCount * 3);
    const starPhase = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const r = 0.32 + Math.random() * 0.62;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      starPhase[i] = Math.random() * Math.PI * 2;
      starSize[i] = 1.0 + Math.random() * 1.6;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeom.setAttribute("aPhase", new THREE.BufferAttribute(starPhase, 1));
    starGeom.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        varying float vT;
        uniform float uTime;
        void main() {
          vT = 0.65 + 0.35 * sin(uTime * 1.4 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (9.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vT;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.12, d) * vT;
          if (a < 0.02) discard;
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    });
    const stars = new THREE.Points(starGeom, starMat);
    wrapper.add(stars);

    // Deep glossy black glass body -- real PBR iridescence/transmission/
    // clearcoat instead of an approximated shell, for genuinely polished-
    // glass reflections rather than a flat-shaded sphere with a shader
    // painted on top.
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.MeshPhysicalMaterial({
        color: 0x050505,
        roughness: 0.16,
        metalness: 0.05,
        transparent: true,
        opacity: 0.995,
        transmission: 0.42,
        thickness: 1.2,
        ior: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.35,
        iridescence: 1.0,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [280, 520],
        emissive: 0x050505,
      })
    );
    wrapper.add(orb);

    // Directional chromatic rim -- magenta top, purple/blue/cyan upper
    // left, magenta/red/violet upper right, green/cyan/blue right edge,
    // blue/violet/magenta lower right, cyan/blue/purple lower left, plus
    // tiny scattered chromatic sparkle. Fresnel-gated so it only shows as
    // thin reflective bands near the silhouette, not a full-surface tint.
    const PALETTE = {
      magenta: new THREE.Color("#FF2BC2"),
      purple: new THREE.Color("#7B2CFF"),
      blue: new THREE.Color("#246BFF"),
      cyan: new THREE.Color("#00E5FF"),
      green: new THREE.Color("#39FF88"),
      red: new THREE.Color("#FF1744"),
      violet: new THREE.Color("#8A2BE2"),
    };
    const rimUniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uTopMagenta: { value: PALETTE.magenta.clone() },
      uPurple: { value: PALETTE.purple },
      uBlue: { value: PALETTE.blue },
      uCyan: { value: PALETTE.cyan },
      uGreen: { value: PALETTE.green },
      uRed: { value: PALETTE.red },
      uViolet: { value: PALETTE.violet },
    };
    const rimMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: rimUniforms,
      vertexShader: `
        varying vec3 vN;
        varying vec3 vP;
        void main() {
          vN = normalize(mat3(modelMatrix) * normal);
          vP = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uTopMagenta, uPurple, uBlue, uCyan, uGreen, uRed, uViolet;
        varying vec3 vN;
        varying vec3 vP;

        void main() {
          vec3 n = normalize(vN);
          vec3 vd = normalize(cameraPosition - vP);
          float rim = pow(1.0 - max(dot(n, vd), 0.0), 2.4);

          float top      = smoothstep(0.35, 0.95, max(n.y, 0.0));
          float upLeft   = smoothstep(0.35, 0.9, max(dot(n, normalize(vec3(-0.7,  0.6, 0.0))), 0.0));
          float upRight  = smoothstep(0.35, 0.9, max(dot(n, normalize(vec3( 0.7,  0.6, 0.0))), 0.0));
          float right    = smoothstep(0.4, 0.95, max(n.x, 0.0));
          float botRight = smoothstep(0.4, 0.95, max(dot(n, normalize(vec3( 0.75, -0.6, 0.0))), 0.0));
          float bottom   = smoothstep(0.35, 0.95, max(-n.y, 0.0));
          float botLeft  = smoothstep(0.4, 0.95, max(dot(n, normalize(vec3(-0.6, -0.7, 0.0))), 0.0));

          vec3 ul = mix(uPurple, uBlue, smoothstep(0.0, 1.0, 0.6 - max(n.y + 0.3, 0.0)));
          ul = mix(ul, uCyan, clamp(0.5 - n.x, 0.0, 1.0));
          vec3 ur = mix(uTopMagenta, uRed, smoothstep(0.0, 1.0, 0.6 - max(n.y + 0.3, 0.0)));
          ur = mix(ur, uViolet, clamp(0.5 + n.x, 0.0, 1.0));
          vec3 re = mix(uGreen, uCyan, smoothstep(0.0, 1.0, max(n.x, 0.0)));
          re = mix(re, uBlue, smoothstep(0.2, 1.0, max(-vP.y + 0.4, 0.0)));
          vec3 br = mix(uBlue, uViolet, smoothstep(0.0, 1.0, -n.x));
          br = mix(br, uTopMagenta, smoothstep(0.2, 1.0, max(-n.y, 0.0)));
          vec3 bl = mix(uCyan, uBlue, smoothstep(0.0, 1.0, -n.x));
          bl = mix(bl, uPurple, smoothstep(0.2, 1.0, max(-n.y, 0.0)));

          vec3 col = vec3(0.0);
          col += uTopMagenta * top * 0.65;
          col += ul * upLeft * 0.55;
          col += ur * upRight * 0.55;
          col += re * right * 0.5;
          col += br * (botRight + bottom * 0.5) * 0.55;
          col += bl * botLeft * 0.5;
          col *= uIntensity;

          vec3 wp = vP * 18.0 + uTime * 0.5;
          float h1 = 0.6 + 0.4 * sin(wp.x) * sin(wp.y) * sin(wp.z);
          float rx = fract(sin(dot(vP * 7.31, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float spec = step(0.985, rx * h1);
          vec3 spark = spec > 0.0
            ? mix(uRed, mix(uGreen, mix(uBlue, uPurple, step(0.5, fract(rx * 7.0))), step(0.66, fract(rx * 7.0))), step(0.33, fract(rx * 7.0)))
            : vec3(0.0);

          float a = rim * clamp(length(col) + length(spark), 0.0, 1.0);
          if (a < 0.02) discard;
          gl_FragColor = vec4(col + spark * 0.8, a);
        }
      `,
    });
    const rim = new THREE.Mesh(new THREE.SphereGeometry(1.002, 128, 128), rimMat);
    wrapper.add(rim);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbe6, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const topMagentaLight = new THREE.PointLight(0xff2bc2, 4.0, 12);
    topMagentaLight.position.set(0, 3.2, 0);
    scene.add(topMagentaLight);
    const rimLight = new THREE.DirectionalLight(0x7b2cff, 0.6);
    rimLight.position.set(-3, -2, 3);
    scene.add(rimLight);

    let mouseX = 0;
    let mouseY = 0;
    function onPointerMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
    window.addEventListener("pointermove", onPointerMove);

    function resize() {
      const { clientWidth: w, clientHeight: h } = container!;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      // Speaking/active state reads livelier: faster spin, brighter rim.
      const boost = activeRef.current ? 1 : 0;

      starMat.uniforms.uTime.value = t;
      rimUniforms.uTime.value = t;
      rimUniforms.uIntensity.value = 1 + boost * (0.3 + 0.2 * Math.sin(t * 6));
      rimUniforms.uTopMagenta.value.copy(PALETTE.magenta).multiplyScalar(0.95 + 0.1 * Math.sin(t * 1.2));

      wrapper.position.y = Math.sin(t * (0.6 + boost * 0.3)) * 0.06;
      orb.rotation.y += 0.0008 + boost * 0.0025;
      rim.rotation.y = orb.rotation.y;
      stars.rotation.y = orb.rotation.y;

      camera.position.x += (mouseX * 0.35 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.25 + 0.3 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      envTex.dispose();
      pmrem.dispose();
      starGeom.dispose();
      starMat.dispose();
      rim.geometry.dispose();
      rimMat.dispose();
      orb.geometry.dispose();
      (orb.material as THREE.Material).dispose();
      renderer.dispose();
      container!.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
