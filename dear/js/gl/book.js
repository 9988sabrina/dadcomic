import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

const COVER = "img/cover.webp";

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fiber(ctx, w, h, alpha) {
  const grain = document.createElement("canvas");
  grain.width = 96;
  grain.height = 96;
  const g = grain.getContext("2d");
  const data = g.createImageData(96, 96);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 210 + Math.random() * 45;
    data.data[i] = v;
    data.data[i + 1] = v - 6;
    data.data[i + 2] = v - 18;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(grain, "repeat");
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function gutter(ctx, w, h, fromRight) {
  const grad = ctx.createLinearGradient(fromRight ? w : 0, 0, fromRight ? w * 0.72 : w * 0.28, 0);
  grad.addColorStop(0, "rgba(48, 32, 18, .38)");
  grad.addColorStop(1, "rgba(48, 32, 18, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function studioBackdrop() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createRadialGradient(520, 390, 40, 512, 460, 680);
  sky.addColorStop(0, "#f7ecda");
  sky.addColorStop(0.42, "#e7d3b6");
  sky.addColorStop(0.72, "#4a5374");
  sky.addColorStop(1, "#14182e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 1024);
  const wash = ctx.createLinearGradient(0, 0, 1024, 1024);
  wash.addColorStop(0, "rgba(255, 214, 170, .28)");
  wash.addColorStop(0.5, "rgba(255, 214, 170, 0)");
  wash.addColorStop(1, "rgba(80, 110, 160, .2)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1024, 1024);
  fiber(ctx, 1024, 1024, 0.08);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function endpaperTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1294;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#ecd9bf";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(20, 24, 43, .16)";
  ctx.lineWidth = 1.5;
  for (let y = 24; y < h; y += 32) {
    for (let x = 24; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 7, y);
      ctx.lineTo(x, y + 7);
      ctx.lineTo(x - 7, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  fiber(ctx, w, h, 0.22);
  gutter(ctx, w, h, true);
  ctx.strokeStyle = "rgba(20, 24, 43, .28)";
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.textAlign = "center";
  const ink = (text, y, font) => {
    ctx.font = font;
    ctx.fillStyle = "rgba(40, 24, 16, .22)";
    ctx.fillText(text, w / 2 + 1.5, y + 2);
    ctx.fillStyle = "#14182b";
    ctx.fillText(text, w / 2, y);
  };
  ink("My Super Dad", 520, "500 68px Fraunces, Georgia, serif");
  ink("说给爸爸听", 600, "500 46px 'Noto Serif SC', serif");
  ink("Say what you never said.", 760, "500 40px Fraunces, Georgia, serif");
  ink("说出从没说出口的话", 830, "500 34px 'Noto Serif SC', serif");
  ctx.font = "500 22px Fraunces, Georgia, serif";
  ctx.fillStyle = "rgba(20, 24, 43, .62)";
  ctx.fillText("Art by Phoebie Wang", w / 2, 1188);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

async function comicPageTexture() {
  const img = await loadImage("../img/art/comic_page.webp");
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1294;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#f3e7d4";
  ctx.fillRect(0, 0, w, h);
  if (img) {
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  fiber(ctx, w, h, 0.55);
  ctx.restore();
  gutter(ctx, w, h, false);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const curlVert = `
  uniform float uOpen;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float ang = clamp(uOpen, 0.0, 1.0) * 3.14159265;
    float env = sin(clamp(uOpen, 0.0, 1.0) * 3.14159265);
    float x = position.x;
    float bow = sin(uv.x * 3.14159265) * env * 0.16;
    float lead = sin(uv.x * uv.x * 3.14159265) * env * 0.07;
    vec3 p;
    p.x = cos(ang) * x + (bow + lead) * sin(ang);
    p.z = sin(ang) * x + (bow + lead) * cos(ang);
    p.y = position.y + sin(uv.x * 3.14159265) * env * 0.02;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const curlFrag = `
  uniform sampler2D uMap;
  uniform sampler2D uBack;
  uniform float uSheen;
  varying vec2 vUv;
  void main() {
    if (gl_FrontFacing) {
      vec4 color = texture2D(uMap, vUv);
      float band = smoothstep(0.0, 0.08, vUv.x - uSheen) * smoothstep(0.22, 0.08, vUv.x - uSheen);
      color.rgb += band * 0.28;
      gl_FragColor = color;
    } else {
      gl_FragColor = texture2D(uBack, vec2(1.0 - vUv.x, vUv.y));
    }
  }
`;

export async function mountBook(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !quality.mobile,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x14182e, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(quality.dpr);
  if (quality.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const root = new THREE.Group();
  scene.add(root);

  const W = 1.22;
  const H = W * (1294 / 900);
  const segs = quality.segments;

  const coverMap = await new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(COVER, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      resolve(tex);
    }, undefined, reject);
  });

  const backMap = endpaperTexture();
  const pageMap = await comicPageTexture();
  scene.background = studioBackdrop();

  const curl = new THREE.ShaderMaterial({
    uniforms: {
      uOpen: { value: 0 },
      uSheen: { value: -0.4 },
      uMap: { value: coverMap },
      uBack: { value: backMap },
    },
    vertexShader: curlVert,
    fragmentShader: curlFrag,
    side: THREE.DoubleSide,
  });

  const coverGeo = new THREE.PlaneGeometry(W, H, segs[0], segs[1]);
  coverGeo.translate(W / 2, 0, 0);
  const cover = new THREE.Mesh(coverGeo, curl);
  cover.castShadow = quality.shadows;
  root.add(cover);

  const page = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H, 24, 8),
    new THREE.ShaderMaterial({
      uniforms: { uMap: { value: pageMap }, uSheen: { value: 0.15 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float dip = exp(-uv.x * 5.5) * 0.045;
          float bow = sin(uv.x * 3.14159) * 0.012;
          p.z -= dip + bow;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uSheen;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(uMap, vUv);
          float sheen = smoothstep(0.0, 0.12, vUv.y - uSheen) * smoothstep(0.28, 0.08, vUv.y - uSheen);
          sheen *= smoothstep(0.15, 0.7, vUv.x);
          color.rgb += sheen * 0.16;
          float gutter = exp(-vUv.x * 7.0);
          color.rgb *= 1.0 - gutter * 0.28;
          gl_FragColor = color;
        }
      `,
    }),
  );
  page.geometry.translate(W / 2, 0, 0);
  page.position.z = -0.02;
  root.add(page);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, H * 0.985, 0.11),
    new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.9 }),
  );
  board.position.set(0.02, 0, -0.02);
  board.castShadow = quality.shadows;
  root.add(board);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, H * 0.96, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xf3eadc, roughness: 1 }),
  );
  edge.position.set(W - 0.01, 0, -0.02);
  root.add(edge);

  scene.add(new THREE.AmbientLight(0xfff4e8, 0.78));
  const key = new THREE.DirectionalLight(0xfff7ee, 1.2);
  key.position.set(1.8, 3.2, 4.2);
  key.castShadow = quality.shadows;
  if (quality.shadows) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.4;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0006;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd7e4f5, 0.35);
  fill.position.set(-3, 1.2, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf0c9a0, 0.45);
  rim.position.set(-1.6, 2.2, -2.4);
  scene.add(rim);

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 512;
  shadowCanvas.height = 256;
  const shadowCtx = shadowCanvas.getContext("2d");
  const shade = shadowCtx.createRadialGradient(256, 128, 20, 256, 128, 240);
  shade.addColorStop(0, "rgba(20,24,43,0.45)");
  shade.addColorStop(1, "rgba(20,24,43,0)");
  shadowCtx.fillStyle = shade;
  shadowCtx.fillRect(0, 0, 512, 256);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 2.6, H * 0.55),
    new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(W / 2, -H / 2 - 0.11, 0.2);
  root.add(shadow);
  if (quality.shadows) {
    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 3, H * 1.4),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = -H / 2 - 0.05;
    catcher.receiveShadow = true;
    root.add(catcher);
  }

  let open = 0;
  let nx = 0;
  let ny = 0;
  let width = 1;
  let height = 1;
  let running = false;
  let dirty = true;

  function fit() {
    const aspect = width / Math.max(1, height);
    const fov = (camera.fov * Math.PI) / 180;
    const margin = aspect < 0.8 ? 1.78 : 1.62;
    const zFor = (spanW, spanH) => Math.max(
      (spanW / 2) / (Math.tan(fov / 2) * Math.max(0.42, aspect)),
      (spanH / 2) / Math.tan(fov / 2),
    );
    const zClosed = zFor(W * margin, H * margin);
    const zOpen = zFor(W * 2 * margin * 0.94, H * margin);
    const swing = Math.sin(Math.min(1, open) * Math.PI);
    const z = zClosed + (zOpen - zClosed) * open + swing * zClosed * 0.08;
    const navShift = Math.min(0.22, 78 / height);
    const visH = 2 * z * Math.tan(fov / 2);
    const lookY = -navShift * visH * 0.42;
    camera.aspect = aspect;
    camera.position.set((1 - open) * 0.22 + nx * 0.05, lookY + (1 - open) * 0.05, z);
    camera.lookAt((1 - open) * 0.02, lookY, 0);
    camera.updateProjectionMatrix();
    root.position.x = -W / 2 * (1 - open) + swing * W * 0.12;
    curl.uniforms.uOpen.value = open;
    curl.uniforms.uSheen.value = -0.45 + open * 1.6;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    dirty = true;
    poke();
  }

  function frame() {
    if (!dirty) {
      running = false;
      return;
    }
    dirty = false;
    fit();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function poke() {
    dirty = true;
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement || canvas);
  resize();

  return {
    setProgress(p) {
      const raw = p < 0.06 ? 0 : p > 0.94 ? 1 : (p - 0.06) / 0.88;
      const next = raw <= 0 ? 0 : raw >= 1 ? 1 : raw ** 1.35;
      if (next === open) return;
      open = next;
      poke();
    },
    setPointer(x, y) {
      nx = x;
      ny = y;
      poke();
    },
    dispose() {
      observer.disconnect();
      renderer.dispose();
    },
  };
}
