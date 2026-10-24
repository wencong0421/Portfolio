import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  Raycaster,
  Vector2,
  Color,
  AdditiveBlending,
  NormalBlending,
} from "../vendor/three.min.js";
import { Spring } from "./spring.js";
import { clamp, debounce, rand } from "./utils.js";

// Colours cycle through the palette over time and across space, so the field shifts slowly
// between slate, neon and gradient tones. Energy (pointer activity) brightens the field.
const VERTEX_SHADER = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uColorSpeed;
  uniform float uEnergy;
  uniform float uRefDepth;
  uniform vec3 uPalette[5];

  varying vec3 vColor;
  varying float vAlpha;

  vec3 palette(float t) {
    t = fract(t) * 5.0;
    int i = int(floor(t));
    int j = i == 4 ? 0 : i + 1;
    float f = smoothstep(0.0, 1.0, fract(t));
    return mix(uPalette[i], uPalette[j], f);
  }

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = -mvPosition.z;

    float t = aSeed * 0.65 + uTime * uColorSpeed + position.x * 0.012 - position.y * 0.017;
    vColor = palette(t) * (0.9 + uEnergy * 0.55);

    // Fade far particles and the ones almost touching the camera.
    float far = clamp(1.0 - (depth - 6.0) / 30.0, 0.18, 1.0);
    float near = smoothstep(1.5, 4.0, depth);
    vAlpha = (0.35 + aSeed * 0.65) * far * near;

    gl_PointSize = aSize * uPixelRatio * (uRefDepth / max(depth, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = pow(smoothstep(0.5, 0.0, d), 1.6);
    gl_FragColor = vec4(vColor, core * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

function pickParticleCount(settings) {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  if (mobile) return settings.count.mobile;
  if (lowPower) return settings.count.lowPower;
  return settings.count.desktop;
}

export function createParticleField({ canvas, ticker, settings, reducedMotion = false, initialMode = "scatter" }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    console.warn("[particles] WebGL unavailable, keeping the static background.", error);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(settings.camera.fov, 1, 0.1, 100);
  camera.position.set(0, 0, settings.camera.z);

  // ---- Particle data -------------------------------------------------------------------
  const count = pickParticleCount(settings);
  let activeCount = count;

  const positions = new Float32Array(count * 3); // current simulated position (uploaded to the GPU)
  const velocities = new Float32Array(count * 3);
  const homes = new Float32Array(count * 3); // resting position before drift is added
  const normalized = new Float32Array(count * 3); // u, v in [-1, 1] and depth w in [0, 1]
  const drift = new Float32Array(count * 4); // speedA, speedB, amplitude, phase
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    normalized[i * 3] = rand(-1, 1);
    normalized[i * 3 + 1] = rand(-1, 1);
    normalized[i * 3 + 2] = Math.pow(Math.random(), 0.8);
    drift[i * 4] = rand(settings.drift.speed[0], settings.drift.speed[1]);
    drift[i * 4 + 1] = rand(settings.drift.speed[0], settings.drift.speed[1]);
    drift[i * 4 + 2] = rand(settings.drift.amplitude[0], settings.drift.amplitude[1]);
    drift[i * 4 + 3] = rand(0, Math.PI * 2);
    seeds[i] = Math.random();
    sizes[i] = rand(settings.size[0], settings.size[1]);
  }

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: settings.blending === "normal" ? NormalBlending : AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorSpeed: { value: settings.colorSpeed },
      uEnergy: { value: 0 },
      uOpacity: { value: settings.opacity },
      uRefDepth: { value: settings.camera.z },
      uPalette: { value: settings.palette.map((hex) => new Color(hex)) },
    },
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false; // positions change every frame, so the cached bounds are meaningless
  scene.add(points);

  // ---- Layout --------------------------------------------------------------------------
  let width = 1;
  let height = 1;
  let maxScroll = 1;

  // Spread the particles so they cover the visible frustum at every depth, with extra
  // vertical room for the scroll parallax.
  function layoutHomes() {
    const aspect = width / height;
    const tanHalf = Math.tan((settings.camera.fov * Math.PI) / 360);
    const { near, far } = settings.depth;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const z = far + (near - far) * normalized[i3 + 2];
      const halfH = tanHalf * (settings.camera.z - z);
      const halfW = halfH * aspect;
      homes[i3] = normalized[i3] * halfW * 1.15;
      homes[i3 + 1] = normalized[i3 + 1] * (halfH * 1.15 + settings.parallax.scroll * 0.6);
      homes[i3 + 2] = z;
    }
  }

  function measureScroll() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function resize() {
    // The canvas's CSS box excludes the scrollbar, so pointer coordinates map onto it exactly.
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    const mobile = width <= 760;
    const dprCap = mobile ? settings.maxPixelRatio.mobile : settings.maxPixelRatio.desktop;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * qualityScale.dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    material.uniforms.uPixelRatio.value = dpr;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    layoutHomes();
    measureScroll();
    if (!running) renderOnce();
  }

  // ---- Pointer -------------------------------------------------------------------------
  const ndc = new Vector2();
  const raycaster = new Raycaster();
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0, speed: 0, lastMove: 0, inside: false, pressed: false };
  const energy = new Spring({ ...settings.pointer.energySpring, auto: false });
  let mode = initialMode;

  function onPointerMove(event) {
    const x = (event.clientX / width) * 2 - 1;
    const y = -((event.clientY / height) * 2 - 1);
    const now = performance.now();
    if (pointer.inside) {
      const dt = Math.max((now - pointer.lastMove) / 1000, 0.008);
      const instant = Math.hypot((x - pointer.x) * (width / height), y - pointer.y) / dt;
      pointer.speed += (instant - pointer.speed) * 0.35;
    } else {
      pointer.smoothX = x;
      pointer.smoothY = y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.lastMove = now;
    pointer.inside = true;
  }
  const onPointerDown = (event) => {
    if (event.button === 0) pointer.pressed = true;
  };
  const onPointerUp = () => {
    pointer.pressed = false;
  };
  const onPointerLeave = () => {
    pointer.inside = false;
    pointer.pressed = false;
  };
  const onScroll = () => {
    scrollProgress = clamp(window.scrollY / maxScroll, 0, 1);
  };

  // ---- Simulation ----------------------------------------------------------------------
  let time = 0;
  let accumulator = 0;
  let scrollProgress = 0;
  let running = false;
  const qualityScale = { dpr: 1 };
  let slowFrames = 0;

  function simulate(dt) {
    time += dt;
    const p = settings.pointer;

    // Smooth the pointer so the force field glides rather than jumps.
    const follow = 1 - Math.exp(-dt * 14);
    pointer.smoothX += (pointer.x - pointer.smoothX) * follow;
    pointer.smoothY += (pointer.y - pointer.smoothY) * follow;
    if (performance.now() - pointer.lastMove > p.idleAfterMs) pointer.speed *= Math.exp(-dt * 10);

    const swarming = mode === "swarm" || pointer.pressed;
    let targetEnergy = 0;
    if (pointer.inside) targetEnergy = pointer.pressed ? 1 : clamp(pointer.speed / p.speedForFullEnergy, 0, 1);
    energy.target = targetEnergy;
    energy.step(dt);
    const e = clamp(energy.value, 0, 1.2);
    material.uniforms.uEnergy.value = e;

    // Camera parallax from pointer and scroll position.
    const camX = pointer.smoothX * settings.parallax.pointer;
    const camY = pointer.smoothY * settings.parallax.pointer * 0.7 - scrollProgress * settings.parallax.scroll;
    camera.position.x += (camX - camera.position.x) * follow * 0.25;
    camera.position.y += (camY - camera.position.y) * follow * 0.25;
    camera.updateMatrixWorld();

    // Cursor ray in world space.
    ndc.set(pointer.smoothX, pointer.smoothY);
    raycaster.setFromCamera(ndc, camera);
    const { origin, direction } = raycaster.ray;
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dx = direction.x, dy = direction.y, dz = direction.z;

    const k = settings.home.stiffness;
    const c = settings.home.damping;
    const maxV = settings.maxVelocity;
    const maxV2 = maxV * maxV;
    const forceOn = e > 0.004;
    const force = (swarming ? p.swarmForce : p.scatterForce) * e;
    const swirl = p.swirl * e;

    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const sa = drift[i4], sb = drift[i4 + 1], amp = drift[i4 + 2], ph = drift[i4 + 3];

      // Where the particle wants to be: its home plus a slow, organic drift.
      const hx = homes[i3] + Math.sin(time * sa + ph) * amp;
      const hy = homes[i3 + 1] + Math.cos(time * sb + ph * 1.7) * amp;
      const hz = homes[i3 + 2] + Math.sin(time * sa * 0.7 + ph * 2.3) * amp * 0.6;

      const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
      let vx = velocities[i3], vy = velocities[i3 + 1], vz = velocities[i3 + 2];

      let ax = (hx - px) * k - vx * c;
      let ay = (hy - py) * k - vy * c;
      let az = (hz - pz) * k - vz * c;

      if (forceOn) {
        // Perpendicular offset from the cursor ray.
        const rx = px - ox, ry = py - oy, rz = pz - oz;
        const along = rx * dx + ry * dy + rz * dz;
        const cx = rx - along * dx, cy = ry - along * dy, cz = rz - along * dz;
        const radius = (swarming ? p.swarmRadius ?? p.radius : p.radius) * along;
        const d2 = cx * cx + cy * cy + cz * cz;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) + 1e-4;
          const falloff = (1 - d / radius) ** 2;
          const inv = 1 / d;
          const strength = force * falloff * inv;
          if (swarming) {
            ax -= cx * strength;
            ay -= cy * strength;
            az -= cz * strength;
            // Spin around the ray so the swarm forms a vortex instead of a line.
            const s = swirl * falloff * inv;
            ax += (dy * cz - dz * cy) * s;
            ay += (dz * cx - dx * cz) * s;
            az += (dx * cy - dy * cx) * s;
          } else {
            ax += cx * strength;
            ay += cy * strength;
            az += cz * strength;
          }
        }
      }

      vx += ax * dt;
      vy += ay * dt;
      vz += az * dt;
      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > maxV2) {
        const scale = maxV / Math.sqrt(v2);
        vx *= scale;
        vy *= scale;
        vz *= scale;
      }

      velocities[i3] = vx;
      velocities[i3 + 1] = vy;
      velocities[i3 + 2] = vz;
      positions[i3] = px + vx * dt;
      positions[i3 + 1] = py + vy * dt;
      positions[i3 + 2] = pz + vz * dt;
    }

    positionAttribute.needsUpdate = true;
    material.uniforms.uTime.value = time;
  }

  // Lower the particle count and resolution if the device can't keep up.
  function adaptQuality(frameMs) {
    const a = settings.adaptive;
    slowFrames = frameMs > a.slowFrameMs ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames < a.sampleFrames) return;
    slowFrames = 0;
    const minCount = Math.floor(count * a.minFraction);
    if (activeCount > minCount) {
      activeCount = Math.max(minCount, Math.floor(activeCount * 0.75));
      geometry.setDrawRange(0, activeCount);
    } else if (qualityScale.dpr > 0.6) {
      qualityScale.dpr = Math.max(0.6, qualityScale.dpr - 0.2);
      resize();
    }
  }

  function frame(_time, deltaMs) {
    // Run the simulation at most ~60 times a second, even on 120 Hz screens.
    accumulator += deltaMs / 1000;
    if (accumulator < 1 / 62) return;
    const dt = Math.min(accumulator, 1 / 30);
    adaptQuality(accumulator * 1000);
    accumulator = 0;
    simulate(dt);
    renderer.render(scene, camera);
  }

  function renderOnce() {
    renderer.render(scene, camera);
  }

  function start() {
    if (running || reducedMotion || mode === "off") return;
    running = true;
    accumulator = 0;
    ticker.add(frame);
  }

  function stop() {
    if (!running) return;
    running = false;
    ticker.remove(frame);
  }

  // ---- Context loss --------------------------------------------------------------------
  const onContextLost = (event) => {
    event.preventDefault();
    stop();
  };
  const onContextRestored = () => {
    resize();
    start();
  };

  // ---- Wiring --------------------------------------------------------------------------
  const onResize = debounce(resize, 120);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  const bodyObserver = new ResizeObserver(debounce(measureScroll, 150));
  bodyObserver.observe(document.body);

  if (!reducedMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
  }

  resize();
  layoutHomes();
  positions.set(homes); // start every particle at home
  positionAttribute.needsUpdate = true;
  onScroll();
  renderOnce();
  canvas.classList.add("is-ready");
  setMode(initialMode);

  function setMode(next) {
    mode = next;
    canvas.classList.toggle("is-off", mode === "off");
    if (mode === "off") stop();
    else start();
  }

  function dispose() {
    stop();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("blur", onPointerLeave);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    bodyObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }

  return {
    setMode,
    getMode: () => mode,
    dispose,
    // Debug helper: how far particles currently are from their resting positions (world units).
    stats: () => {
      let total = 0;
      let max = 0;
      for (let i = 0; i < activeCount; i++) {
        const i3 = i * 3;
        const d = Math.hypot(positions[i3] - homes[i3], positions[i3 + 1] - homes[i3 + 1], positions[i3 + 2] - homes[i3 + 2]);
        total += d;
        if (d > max) max = d;
      }
      return { count, activeCount, running, mode, energy: energy.value, dpr: renderer.getPixelRatio(), meanOffset: total / activeCount, maxOffset: max };
    },
  };
}
