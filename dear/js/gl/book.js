import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

const COVER = "img/cover.webp";

function paperTexture(lines, sub) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1472;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(20,24,43,.18)";
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);
  ctx.fillStyle = "#14182b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.font = line.font;
    ctx.fillText(line.text, canvas.width / 2, line.y);
  });
  if (sub) {
    ctx.font = "500 28px Fraunces, 'Noto Serif SC', serif";
    ctx.fillStyle = "rgba(20,24,43,.55)";
    ctx.fillText(sub, canvas.width / 2, 1320);
  }
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
  renderer.setClearColor(0x000000, 0);
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

  const backMap = paperTexture([
    { text: "My Super Dad", font: "500 78px Fraunces, Georgia, serif", y: 640 },
    { text: "说给爸爸听", font: "500 64px 'Noto Serif SC', serif", y: 760 },
  ], "Art by Phoebie Wang");

  const pageMap = paperTexture([
    { text: "Say what you", font: "500 72px Fraunces, Georgia, serif", y: 520 },
    { text: "never said.", font: "500 72px Fraunces, Georgia, serif", y: 620 },
    { text: "说出从没", font: "500 64px 'Noto Serif SC', serif", y: 790 },
    { text: "说出口的话", font: "500 64px 'Noto Serif SC', serif", y: 890 },
  ], "");

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
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: pageMap }),
  );
  page.position.set(W / 2, 0, -0.02);
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
  const fill = new THREE.DirectionalLight(0xd7e4f5, 0.28);
  fill.position.set(-3, 1.2, 2);
  scene.add(fill);

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
  shadow.position.set(W / 2, -H / 2 - 0.04, 0.12);
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
    const spread = W * 2 * 1.12;
    const zW = (spread / 2) / (Math.tan(fov / 2) * Math.max(0.35, aspect));
    const zH = (H * 1.28) / 2 / Math.tan(fov / 2);
    const zOpen = Math.max(zW, zH);
    const zClosed = zOpen * 0.78;
    const swing = Math.sin(Math.min(1, open) * Math.PI);
    const z = (zClosed + (zOpen - zClosed) * open) * (1 + swing * 0.28);
    camera.aspect = aspect;
    camera.position.set((1 - open) * 0.34 + nx * 0.06, (1 - open) * 0.16 + ny * 0.04, z);
    camera.lookAt((1 - open) * 0.02, -0.02, 0);
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
