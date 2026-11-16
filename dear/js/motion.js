let sky = null;

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || window.matchMedia("(prefers-reduced-data: reduce)").matches;
}

function finePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

function makeSky(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const stars = [];
  const rising = [];
  let night = 0;
  let running = false;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  for (let i = 0; i < 130; i += 1) {
    stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3, p: Math.random() * 6 });
  }
  function frame() {
    if (!running) return;
    const w = innerWidth;
    const h = innerHeight;
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    ctx.fillStyle = "#f6e7c1";
    for (const s of stars) {
      ctx.globalAlpha = night * (0.45 + Math.sin(t * 1.4 + s.p) * 0.35);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = rising.length - 1; i >= 0; i -= 1) {
      const s = rising[i];
      s.y -= s.vy;
      s.x += Math.sin(t * 2 + s.p) * 0.35;
      ctx.shadowColor = "#f6e7c1";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#fff8e4";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (s.y < h * 0.12) {
        stars.push({ x: s.x / w, y: Math.max(0.05, s.y / h), r: 1.5, p: s.p });
        rising.splice(i, 1);
      }
    }
    if (night < 0.02 && !rising.length) running = false;
    else requestAnimationFrame(frame);
  }
  function ensure() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }
  resize();
  window.addEventListener("resize", resize);
  return {
    setNight(n) {
      night = Math.max(0, Math.min(1, n));
      canvas.style.opacity = night > 0.02 || rising.length ? "1" : "0";
      if (night > 0.02) ensure();
    },
    rise(x, y) {
      rising.push({ x, y, vy: 3.1, p: Math.random() * 6 });
      ensure();
    },
  };
}

function cursor() {
  if (!finePointer() || reduced()) return;
  document.documentElement.classList.add("fine");
  const dot = document.getElementById("cursor");
  if (!dot) return;
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let tx = x;
  let ty = y;
  window.addEventListener("pointermove", (event) => {
    tx = event.clientX;
    ty = event.clientY;
  });
  function loop() {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(loop);
  }
  loop();
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.18}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

function dragRail() {
  const rail = document.getElementById("wall-cards");
  if (!rail) return;
  rail.classList.add("rail");
  let active = false;
  let startX = 0;
  let origin = 0;
  let moved = false;
  rail.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) return;
    active = true;
    moved = false;
    startX = event.clientX;
    origin = rail.scrollLeft;
    rail.setPointerCapture(event.pointerId);
  });
  rail.addEventListener("pointermove", (event) => {
    if (!active) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 8) moved = true;
    rail.scrollLeft = origin - dx;
  });
  rail.addEventListener("pointerup", () => { active = false; });
  rail.addEventListener("click", (event) => {
    if (moved || event.target.closest("a, button")) return;
    const card = event.target.closest("article.card");
    if (!card) return;
    const salute = card.querySelector(".salute")?.textContent || "";
    const body = card.querySelector(".body")?.textContent || "";
    const meta = card.querySelector(".meta")?.textContent || "";
    const reader = document.getElementById("reader");
    const host = document.getElementById("reader-copy");
    if (!reader || !host) return;
    host.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = salute;
    const p = document.createElement("p");
    p.textContent = body;
    const m = document.createElement("p");
    m.textContent = meta;
    host.append(h, p, m);
    reader.hidden = false;
  });
  document.getElementById("reader-close")?.addEventListener("click", () => {
    document.getElementById("reader").hidden = true;
  });
}

function pageTurn() {
  if (reduced()) return;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank") return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !url.pathname.includes("/dear")) return;
    if (url.hash && url.pathname === location.pathname) return;
    event.preventDefault();
    document.documentElement.classList.add("turning");
    window.setTimeout(() => { location.href = link.href; }, 480);
  });
}

function boot() {
  const el = document.getElementById("boot");
  if (!el) return;
  const hide = () => el.classList.add("is-done");
  if (reduced()) {
    hide();
    return;
  }
  window.setTimeout(hide, 900);
}

export function initMotion() {
  boot();
  dragRail();
  pageTurn();
  cursor();
  const canvas = document.getElementById("starfield");
  if (canvas) sky = makeSky(canvas);
  document.addEventListener("dear-star", (event) => {
    sky?.rise(event.detail.x, event.detail.y);
  });
  if (reduced() || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.Lenis && finePointer()) {
    const lenis = new window.Lenis({ lerp: 0.08 });
    lenis.on("scroll", window.ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.documentElement.classList.add("has-motion");

  const cover = document.querySelector(".book-cover");
  const book = document.querySelector(".book-3d");
  const sheen = document.querySelector(".sheen");
  const words = [...document.querySelectorAll(".kinetic span, .kinetic-zh span")];
  if (cover && book) {
    window.ScrollTrigger.create({
      trigger: "#chapter-book",
      start: "top top",
      end: "+=140%",
      pin: true,
      scrub: 0.45,
      snap: { snapTo: [0, 1], duration: 0.35, delay: 0.05 },
      onUpdate: (self) => {
        const p = self.progress;
        const open = p < 0.08 ? 0 : p > 0.92 ? 1 : Math.min(1, (p - 0.08) / 0.7);
        const pageW = book.offsetWidth;
        cover.style.transform = `rotateY(${-168 * open}deg)`;
        book.style.transform = `translateX(${open * pageW * 0.5}px) rotateX(${6 * (1 - open)}deg)`;
        if (sheen) sheen.style.transform = `translateX(${-40 + open * 160}%)`;
        const show = open > 0.92 ? 1 : 0;
        words.forEach((word, i) => {
          const start = 0.55 + i * 0.03;
          const local = show || (open > 0.92 ? 1 : Math.min(1, Math.max(0, (p - start) / 0.12)));
          const settled = p > 0.92 ? 1 : local;
          word.style.opacity = String(settled);
          word.style.transform = settled >= 1 ? "none" : `translateY(${(1 - settled) * 16}px)`;
        });
      },
    });
  }

  const cast = document.querySelector(".cast-layers");
  if (cast) {
    const beats = [
      [".char.p", ".who.p", 0.05],
      [".char.dad", ".who.dad", 0.28],
      [".char.dory", ".who.dory", 0.5],
      [".char.miao", ".who.miao", 0.72],
    ];
    window.ScrollTrigger.create({
      trigger: "#chapter-cast",
      start: "top top",
      end: "+=160%",
      pin: true,
      scrub: 0.5,
      snap: { snapTo: [0, 0.28, 0.5, 0.72, 1], duration: 0.35, delay: 0.06 },
      onUpdate: (self) => {
        const p = self.progress;
        const sun = cast.querySelector(".sun");
        if (sun) sun.style.transform = `translate3d(${p * -40}px, ${p * 10}px, 0)`;
        beats.forEach(([figure, line, at]) => {
          const node = cast.querySelector(figure);
          const bubble = cast.querySelector(line);
          const arrived = p >= at;
          const focus = p >= at && p < at + 0.24;
          if (node) {
            const y = arrived ? 0 : 28;
            const s = focus ? 1.04 : 1;
            node.style.transform = `translate3d(0, ${y}px, 0) scale(${s})`;
          }
          if (bubble) {
            bubble.style.opacity = "1";
            bubble.style.transform = focus ? "scale(1.04)" : "scale(1)";
          }
        });
        sky?.setNight(Math.max(0, (p - 0.82) / 0.18) * 0.35);
      },
    });
  }

  gsap.from(".night-pin h2", {
    y: 30,
    duration: 1,
    scrollTrigger: { trigger: ".night-pin", start: "top 70%" },
  });
}

export function revealCards() {
  if (sky && document.getElementById("wall")?.classList.contains("tone-heaven")) sky.setNight(1);
}
