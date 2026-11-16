import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,250,236,1)");
  g.addColorStop(0.18, "rgba(246,231,193,0.85)");
  g.addColorStop(0.45, "rgba(246,231,193,0.25)");
  g.addColorStop(1, "rgba(246,231,193,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const blurVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const blurFrag = `
  uniform sampler2D tMap;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    float w0 = 0.227027;
    float w1 = 0.1945946;
    float w2 = 0.1216216;
    float w3 = 0.054054;
    float w4 = 0.016216;
    vec4 sum = texture2D(tMap, vUv) * w0;
    sum += texture2D(tMap, vUv + uDir * 1.5) * w1;
    sum += texture2D(tMap, vUv - uDir * 1.5) * w1;
    sum += texture2D(tMap, vUv + uDir * 3.5) * w2;
    sum += texture2D(tMap, vUv - uDir * 3.5) * w2;
    sum += texture2D(tMap, vUv + uDir * 6.0) * w3;
    sum += texture2D(tMap, vUv - uDir * 6.0) * w3;
    sum += texture2D(tMap, vUv + uDir * 9.0) * w4;
    sum += texture2D(tMap, vUv - uDir * 9.0) * w4;
    gl_FragColor = sum;
  }
`;

const compFrag = `
  uniform sampler2D tSharp;
  uniform sampler2D tBloom;
  uniform float uBloom;
  varying vec2 vUv;
  void main() {
    vec4 sharp = texture2D(tSharp, vUv);
    vec4 bloom = texture2D(tBloom, vUv);
    vec3 color = sharp.rgb + bloom.rgb * uBloom;
    float a = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
    gl_FragColor = vec4(color, a);
  }
`;

export function mountSky(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(quality.dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  const count = quality.stars;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const layer = i % 3;
    positions[i * 3] = Math.random() * 2.4 - 1.2;
    positions[i * 3 + 1] = Math.random() * 2.2 - 1.05;
    positions[i * 3 + 2] = 0;
    phases[i] = Math.random() * Math.PI * 2;
    const base = layer === 0 ? 3 : layer === 1 ? 9 : 18;
    sizes[i] = (quality.mobile ? 0.9 : 1.45) * (base + Math.random() * base);
  }
  const milk = document.createElement("canvas");
  milk.width = 512;
  milk.height = 256;
  const mctx = milk.getContext("2d");
  const band = mctx.createRadialGradient(256, 140, 10, 256, 150, 240);
  band.addColorStop(0, "rgba(255, 228, 186, 0.42)");
  band.addColorStop(0.4, "rgba(176, 156, 214, 0.16)");
  band.addColorStop(1, "rgba(20, 24, 46, 0)");
  mctx.fillStyle = band;
  mctx.fillRect(0, 0, 512, 256);
  const milkTex = new THREE.CanvasTexture(milk);
  milkTex.colorSpace = THREE.SRGBColorSpace;
  const milkMat = new THREE.MeshBasicMaterial({
    map: milkTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.9,
  });
  const milkMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), milkMat);
  milkMesh.position.set(0, 0.55, -0.2);
  scene.add(milkMesh);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: glowTexture() },
      uNight: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      uniform float uNight;
      varying float vTw;
      void main() {
        vTw = uNight * (0.55 + 0.45 * sin(uTime * 1.3 + aPhase));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (0.75 + 0.25 * vTw);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vTw;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb, tex.a * vTw);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, starMat);
  scene.add(points);

  const litGeo = new THREE.BufferGeometry();
  const litPositions = new Float32Array(48 * 3);
  const litSizes = new Float32Array(48);
  litGeo.setAttribute("position", new THREE.BufferAttribute(litPositions, 3));
  litGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(48), 1));
  litGeo.setAttribute("aSize", new THREE.BufferAttribute(litSizes, 1));
  litGeo.setDrawRange(0, 0);
  const litMat = starMat.clone();
  litMat.uniforms = {
    uMap: starMat.uniforms.uMap,
    uNight: { value: 1 },
    uTime: starMat.uniforms.uTime,
  };
  const litPoints = new THREE.Points(litGeo, litMat);
  scene.add(litPoints);

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const blurMat = new THREE.ShaderMaterial({
    uniforms: {
      tMap: { value: null },
      uDir: { value: new THREE.Vector2() },
    },
    vertexShader: blurVert,
    fragmentShader: blurFrag,
    depthTest: false,
    depthWrite: false,
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tSharp: { value: null },
      tBloom: { value: null },
      uBloom: { value: quality.bloom ? 0.85 : 0.45 },
    },
    vertexShader: blurVert,
    fragmentShader: compFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(quadGeo, blurMat);
  const comp = new THREE.Mesh(quadGeo, compMat);
  const post = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  post.add(quad);

  let rtA = null;
  let rtB = null;
  let rtC = null;
  let night = 0;
  let pointerX = 0;
  let pointerY = 0;
  let scroll = 0;
  let running = false;
  const rising = [];
  const lit = [];
  const trail = [];
  const trailMax = 80;
  const trailPos = new Float32Array(trailMax * 3);
  const trailSize = new Float32Array(trailMax);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(trailMax), 1));
  trailGeo.setAttribute("aSize", new THREE.BufferAttribute(trailSize, 1));
  trailGeo.setDrawRange(0, 0);
  const trailMat = starMat.clone();
  trailMat.uniforms = {
    uMap: starMat.uniforms.uMap,
    uNight: { value: 1 },
    uTime: starMat.uniforms.uTime,
  };
  scene.add(new THREE.Points(trailGeo, trailMat));

  function target(scale = 1) {
    const w = Math.max(2, Math.floor(canvas.clientWidth * quality.dpr * scale));
    const h = Math.max(2, Math.floor(canvas.clientHeight * quality.dpr * scale));
    const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt;
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    rtA?.dispose();
    rtB?.dispose();
    rtC?.dispose();
    const scale = quality.bloom ? 0.5 : 0.35;
    rtA = target(1);
    rtB = target(scale);
    rtC = target(scale);
  }

  function pushLit(x, y, size) {
    if (lit.length >= 48) lit.shift();
    lit.push({ x, y, size });
    const i = lit.length - 1;
    litPositions[i * 3] = x;
    litPositions[i * 3 + 1] = y;
    litSizes[i] = size;
    litGeo.attributes.position.needsUpdate = true;
    litGeo.attributes.aSize.needsUpdate = true;
    litGeo.setDrawRange(0, lit.length);
  }

  function syncLit() {
    for (let i = 0; i < lit.length; i += 1) {
      litPositions[i * 3] = lit[i].x;
      litPositions[i * 3 + 1] = lit[i].y;
      litSizes[i] = lit[i].size;
    }
    litGeo.attributes.position.needsUpdate = true;
    litGeo.attributes.aSize.needsUpdate = true;
    litGeo.setDrawRange(0, lit.length);
  }

  function frame() {
    if (!running) return;
    const t = performance.now() / 1000;
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uNight.value = Math.max(night, rising.length || trail.length ? 0.85 : 0);
    milkMat.opacity = night * 0.7;
    points.position.set(pointerX * 0.06 + scroll * 0.00005, pointerY * 0.04, 0);
    milkMesh.position.x = pointerX * 0.08;
    for (let i = rising.length - 1; i >= 0; i -= 1) {
      const s = rising[i];
      s.y += 0.032;
      s.x += Math.sin(t * 2 + s.p) * 0.002;
      litPositions[s.index * 3] = s.x;
      litPositions[s.index * 3 + 1] = s.y;
      litSizes[s.index] = s.size * (1.15 + Math.sin(t * 6) * 0.12);
      if (trail.length > trailMax - 2) trail.shift();
      trail.push({ x: s.x, y: s.y - 0.015, life: 1, size: s.size * 0.7 });
      if (s.y > s.goal) {
        lit[s.index].x = s.x;
        lit[s.index].y = Math.min(0.9, s.y);
        lit[s.index].size = s.size * 0.72;
        rising.splice(i, 1);
      }
    }
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      trail[i].life -= 0.04;
      trail[i].y -= 0.002;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
    for (let i = 0; i < trail.length; i += 1) {
      trailPos[i * 3] = trail[i].x;
      trailPos[i * 3 + 1] = trail[i].y;
      trailSize[i] = trail[i].size * trail[i].life;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.aSize.needsUpdate = true;
    trailGeo.setDrawRange(0, trail.length);
    if (rising.length) {
      litGeo.attributes.position.needsUpdate = true;
      litGeo.attributes.aSize.needsUpdate = true;
    }
    paintRise();
    const alive = night > 0.02 || rising.length || lit.length || trail.length;
    if (!alive) {
      renderer.setRenderTarget(null);
      renderer.clear();
      running = false;
      return;
    }
    renderer.setRenderTarget(rtA);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    if (quality.bloom) {
      blurMat.uniforms.tMap.value = rtA.texture;
      blurMat.uniforms.uDir.value.set(1.8 / rtB.width, 0);
      renderer.setRenderTarget(rtB);
      renderer.render(quad, postCam);
      blurMat.uniforms.tMap.value = rtB.texture;
      blurMat.uniforms.uDir.value.set(0, 1.8 / rtC.height);
      renderer.setRenderTarget(rtC);
      renderer.render(quad, postCam);
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    compMat.uniforms.tSharp.value = rtA.texture;
    compMat.uniforms.tBloom.value = quality.bloom ? rtC.texture : rtA.texture;
    post.remove(quad);
    post.add(comp);
    renderer.render(comp, postCam);
    post.remove(comp);
    post.add(quad);
    requestAnimationFrame(frame);
  }

  function ensure() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  const riseCanvas = document.getElementById("rise-layer");
  const riseCtx = riseCanvas?.getContext("2d");
  function sizeRise() {
    if (!riseCanvas) return;
    const dpr = quality.dpr;
    riseCanvas.width = Math.floor(riseCanvas.clientWidth * dpr);
    riseCanvas.height = Math.floor(riseCanvas.clientHeight * dpr);
  }
  function paintRise() {
    if (!riseCtx || !riseCanvas) return;
    riseCtx.clearRect(0, 0, riseCanvas.width, riseCanvas.height);
    const dots = trail.map((p) => ({ x: p.x, y: p.y, s: p.size * p.life, a: p.life * 0.55 }));
    rising.forEach((s) => dots.push({ x: s.x, y: s.y, s: s.size * 1.15, a: 1 }));
    const dpr = quality.dpr;
    dots.forEach((dot) => {
      const sx = ((dot.x + 1) / 2) * riseCanvas.width;
      const sy = ((1 - dot.y) / 2) * riseCanvas.height;
      const radius = dot.s * dpr * 1.6;
      const g = riseCtx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      g.addColorStop(0, `rgba(255, 250, 236, ${dot.a})`);
      g.addColorStop(0.25, `rgba(255, 214, 140, ${dot.a * 0.7})`);
      g.addColorStop(1, "rgba(255, 214, 140, 0)");
      riseCtx.fillStyle = g;
      riseCtx.beginPath();
      riseCtx.arc(sx, sy, radius, 0, Math.PI * 2);
      riseCtx.fill();
    });
  }
  sizeRise();
  resize();
  window.addEventListener("resize", () => { resize(); sizeRise(); });

  return {
    setNight(n) {
      night = Math.max(0, Math.min(1, n));
      canvas.style.opacity = night > 0.02 || rising.length || lit.length ? "1" : "0";
      document.documentElement.classList.toggle("night", night > 0.35 || rising.length > 0);
      if (night > 0.02 || lit.length) ensure();
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    setScroll(y) {
      scroll = y;
    },
    seed(n) {
      lit.length = 0;
      for (let i = 0; i < Math.min(48, n); i += 1) {
        pushLit(Math.random() * 1.6 - 0.8, 0.05 + Math.random() * 0.8, quality.mobile ? 28 : 42);
      }
      if (n) ensure();
    },
    rise(x, y) {
      const nx = (x / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -((y / Math.max(1, window.innerHeight)) * 2 - 1);
      const index = lit.length;
      const size = quality.mobile ? 34 : 42;
      pushLit(nx, ny, size);
      rising.push({
        index,
        x: nx,
        y: ny,
        goal: 0.72 + Math.random() * 0.18,
        p: Math.random() * 6,
        size,
      });
      canvas.style.opacity = "1";
      document.documentElement.classList.add("night");
      ensure();
    },
    dim() {
      if (!lit.length) return;
      lit.pop();
      syncLit();
    },
  };
}
