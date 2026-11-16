import { onLang } from "./i18n.js";
import { litCount } from "./stars.js";

const skyApi = {
  impl: null,
  setNight(n) { this.impl?.setNight(n); },
  rise(x, y) { this.impl?.rise(x, y); },
  seed(n) { this.impl?.seed?.(n); },
  dim() { this.impl?.dim?.(); },
  setPointer(x, y) { this.impl?.setPointer?.(x, y); },
  setScroll(y) { this.impl?.setScroll?.(y); },
};
let bookApi = null;
let bookProgress = 0;
let pointerX = 0;
let pointerY = 0;

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
  document.querySelectorAll(".buy, .lang-btn, .btn").forEach((el) => {
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
    const card = event.target.closest?.(".letter-card");
    if (card && !active && finePointer() && !reduced()) {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
    }
    if (!active) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 8) moved = true;
    rail.scrollLeft = origin - dx;
  });
  rail.addEventListener("pointerleave", (event) => {
    const card = event.target.closest?.(".letter-card");
    if (card) card.style.transform = "";
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
    openReader(card, reader, host);
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

function openReader(card, reader, host) {
  reader.hidden = false;
  if (reduced()) return;
  const from = card.getBoundingClientRect();
  const to = host.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.className = "flip-ghost letter-card";
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  document.body.append(ghost);
  host.style.opacity = "0";
  requestAnimationFrame(() => {
    ghost.style.transition = "left .55s cubic-bezier(.2,.7,.2,1), top .55s cubic-bezier(.2,.7,.2,1), width .55s cubic-bezier(.2,.7,.2,1), height .55s cubic-bezier(.2,.7,.2,1), opacity .4s ease";
    ghost.style.left = `${to.left}px`;
    ghost.style.top = `${to.top}px`;
    ghost.style.width = `${to.width}px`;
    ghost.style.height = `${to.height}px`;
    ghost.style.opacity = "0.15";
    host.style.transition = "opacity .4s ease .25s";
    host.style.opacity = "1";
  });
  window.setTimeout(() => ghost.remove(), 600);
}

function splitCopy(root) {
  if (reduced()) return;
  root.querySelectorAll("[data-split]").forEach((node) => {
    if (node.querySelector(".ch")) return;
    const text = node.textContent;
    node.setAttribute("aria-label", text);
    node.textContent = "";
    const cjk = /[\u3400-\u9fff]/.test(text);
    const words = cjk ? [text] : text.split(/(\s+)/);
    let index = 0;
    words.forEach((word) => {
      const hold = document.createElement("span");
      hold.style.display = "inline-block";
      hold.style.whiteSpace = "nowrap";
      const chars = typeof Intl !== "undefined" && Intl.Segmenter
        ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word)].map((part) => part.segment)
        : Array.from(word);
      chars.forEach((ch) => {
        const span = document.createElement("span");
        span.className = "ch";
        span.style.animationDelay = `${Math.min(index, 28) * 14}ms`;
        span.textContent = ch === " " ? "\u00a0" : ch;
        hold.append(span);
        index += 1;
      });
      node.append(hold);
    });
  });
}

function watchCopy() {
  const nodes = [...document.querySelectorAll("[data-split]")];
  if (!nodes.length || reduced()) return;
  splitCopy(document);
  const heads = [...new Set(nodes.map((node) => node.closest("h2") || node))];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
    });
  }, { threshold: 0.45 });
  heads.forEach((node) => io.observe(node));
  onLang(() => {
    splitCopy(document);
    heads.forEach((node) => {
      if (!node.classList.contains("is-in")) return;
      node.classList.remove("is-in");
      requestAnimationFrame(() => node.classList.add("is-in"));
    });
  });
}

function preload(onStep) {
  const sources = [
    "img/cover.webp",
    "img/hosts/dad-cut.webp",
    "img/hosts/p-cut.webp",
    "img/hosts/dory-cut.webp",
    "img/hosts/miao-cut.webp",
  ];
  let done = 0;
  return Promise.all(sources.map((src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      done += 1;
      onStep(done / sources.length);
      resolve();
    };
    img.src = src;
  })));
}

function boot() {
  const el = document.getElementById("boot");
  const bar = document.getElementById("boot-bar");
  if (!el) return;
  const hide = () => el.classList.add("is-done");
  if (reduced()) {
    if (bar) bar.style.width = "100%";
    hide();
    return;
  }
  const setBar = (n) => { if (bar) bar.style.width = `${Math.round(n * 100)}%`; };
  window.setTimeout(hide, 900);
  const cover = new Image();
  cover.onload = cover.onerror = () => {
    setBar(1);
    window.setTimeout(hide, 280);
  };
  cover.src = "img/cover.webp";
  const launch = () => {
    import("./gl/studio.js").then(async ({ startStudio }) => {
      const studio = await startStudio();
      if (studio?.book) {
        bookApi = studio.book;
        bookApi.setProgress(bookProgress);
      }
      if (studio?.sky) {
        skyApi.impl = studio.sky;
        skyApi.seed(litCount());
        if (document.getElementById("wall")?.classList.contains("tone-heaven")) skyApi.setNight(1);
      }
      if (!skyApi.impl) skyApi.impl = makeSky(document.getElementById("starfield"));
    }).catch(() => {
      if (!skyApi.impl) skyApi.impl = makeSky(document.getElementById("starfield"));
    });
  };
  const afterPaint = () => {
    window.setTimeout(launch, 4000);
  };
  if (document.readyState === "complete") requestAnimationFrame(afterPaint);
  else window.addEventListener("load", () => requestAnimationFrame(afterPaint), { once: true });
}

export function initMotion() {
  boot();
  dragRail();
  pageTurn();
  cursor();
  const painted = document.getElementById("painted-sky");
  const placeSky = () => {
    if (!painted) return;
    const drift = Math.sin(performance.now() / 9000) * 16;
    painted.style.transform = `scale(1.14) translate3d(${pointerX * -26 + drift}px, ${pointerY * -12}px, 0)`;
  };
  document.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / Math.max(1, innerWidth) - 0.5;
    pointerY = event.clientY / Math.max(1, innerHeight) - 0.5;
    skyApi.setPointer(pointerX, pointerY);
    bookApi?.setPointer(pointerX, pointerY);
    placeSky();
  });
  const zoom = document.getElementById("page-zoom");
  const zoomView = document.getElementById("page-zoom-view");
  zoom?.addEventListener("click", () => zoomView?.showModal());
  document.getElementById("page-zoom-close")?.addEventListener("click", () => zoomView?.close());
  document.addEventListener("dear-star", (event) => {
    skyApi.rise(event.detail.x, event.detail.y);
  });
  document.addEventListener("dear-sky-dim", () => skyApi.dim());
  watchCopy();
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
        bookProgress = p;
        bookApi?.setProgress(p);
        const zoomBtn = document.getElementById("page-zoom");
        if (zoomBtn) zoomBtn.hidden = !(p > 0.92 && window.matchMedia("(max-width: 780px)").matches);
        skyApi.setScroll(window.scrollY);
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
          const depth = { p: 18, dad: 8, dory: 12, miao: 22 };
          if (node) {
            const y = arrived ? 0 : 28;
            const s = focus ? 1.04 : 1;
            const name = node.classList.contains("p") ? "p"
              : node.classList.contains("dad") ? "dad"
                : node.classList.contains("dory") ? "dory" : "miao";
            const dx = pointerX * depth[name];
            const dy = pointerY * depth[name] * 0.35;
            node.style.transform = `translate3d(${dx}px, ${y + dy}px, 0) scale(${s})`;
          }
          if (bubble) {
            const name = bubble.classList.contains("p") ? "p"
              : bubble.classList.contains("dad") ? "dad"
                : bubble.classList.contains("dory") ? "dory" : "miao";
            const dx = pointerX * depth[name];
            const dy = pointerY * depth[name] * 0.35;
            bubble.style.opacity = "1";
            bubble.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${focus ? 1.04 : 1})`;
          }
        });
        skyApi.setNight(Math.max(0, (p - 0.82) / 0.18) * 0.35);
      },
    });
  }

  gsap.fromTo("#chapter-cast .cast-layers", { scale: 1.06, y: 36 }, {
    scale: 1,
    y: 0,
    ease: "none",
    scrollTrigger: { trigger: "#chapter-cast", start: "top bottom", end: "top top", scrub: true },
  });
  window.ScrollTrigger.create({
    trigger: ".night-pin",
    start: "top 75%",
    onEnter: () => skyApi.setNight(1),
    onEnterBack: () => skyApi.setNight(1),
    onLeaveBack: () => {
      if (!document.getElementById("wall")?.classList.contains("tone-heaven")) skyApi.setNight(0.15);
    },
  });
  gsap.from(".night-pin h2", {
    y: 30,
    duration: 1,
    scrollTrigger: { trigger: ".night-pin", start: "top 70%" },
  });
}

export function revealCards() {
  if (document.getElementById("wall")?.classList.contains("tone-heaven")) skyApi.setNight(1);
}
