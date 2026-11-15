import { countryName, mediaUrl } from "./api.js";
import { t } from "./i18n.js";

const INK = "#1d1b3a";
const SUN = "#ffd23f";
const PAPER = "#fffdf6";
const RED = "#e63946";

const RATIOS = {
  "9:16": { w: 1080, h: 1920 },
  "4:5": { w: 1080, h: 1350 },
};

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function isCJK(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x2e80 && c <= 0x9fff) || (c >= 0xff00 && c <= 0xffef);
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text || "").split(/\n/)) {
    const pieces = [];
    for (const token of para.split(/(\s+)/)) {
      if (/^\s+$/.test(token)) {
        pieces.push(token);
        continue;
      }
      let buf = "";
      for (const ch of token) {
        if (isCJK(ch)) {
          if (buf) pieces.push(buf);
          buf = "";
          pieces.push(ch);
        } else buf += ch;
      }
      if (buf) pieces.push(buf);
    }
    let line = "";
    for (const piece of pieces) {
      const candidate = line + piece;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line.replace(/\s+$/g, ""));
        line = /^\s+$/.test(piece) ? "" : piece;
      } else line = candidate;
    }
    if (line.trim()) lines.push(line.replace(/\s+$/g, ""));
  }
  return lines.length ? lines : [""];
}

async function loadFonts() {
  const jobs = [
    document.fonts.load("104px Bangers"),
    document.fonts.load("700 60px Fredoka"),
    document.fonts.load("600 46px Fredoka"),
    document.fonts.load("700 40px 'Noto Sans SC'"),
    document.fonts.load("600 46px 'Noto Sans SC'"),
  ];
  await Promise.all(jobs);
  await document.fonts.ready;
}

function font(weight, size) {
  return `${weight} ${size}px Fredoka, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function drawBackground(ctx, w, h, heaven) {
  const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
  if (heaven) {
    g.addColorStop(0, "#8d92e8");
    g.addColorStop(0.38, "#3d3a86");
    g.addColorStop(1, "#1d1b3a");
  } else {
    g.addColorStop(0, "#b6ecff");
    g.addColorStop(0.42, "#3fb4f5");
    g.addColorStop(1, "#1565c0");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (heaven) {
    const stars = [
      [90, 180], [980, 140], [860, 320], [70, 520], [1000, 640],
      [180, 860], [940, 980], [120, 1200], [980, 1400], [200, 1600],
    ];
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (const [x, y] of stars) {
      if (y > h - 40) continue;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.save();
    ctx.translate(w * 0.82, h * 0.08);
    for (let i = 0; i < 16; i += 1) {
      ctx.rotate(Math.PI / 8);
      ctx.fillStyle = i % 2 ? "rgba(255,210,63,.35)" : "rgba(255,255,255,.18)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(28, 520);
      ctx.lineTo(-28, 520);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawLogo(ctx, w, y) {
  const logo = "MY SUPER DAD";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "104px Bangers, Impact, sans-serif";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.strokeText(logo, w / 2 + 8, y + 8);
  ctx.fillText(logo, w / 2 + 8, y + 8);
  ctx.strokeText(logo, w / 2, y);
  ctx.fillStyle = SUN;
  ctx.fillText(logo, w / 2, y);
}

function drawImageContain(ctx, img, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, h, 20);
  ctx.clip();
  const ir = img.width / img.height || 1;
  const r = w / h;
  let dw;
  let dh;
  let dx;
  let dy;
  if (ir > r) {
    dw = w;
    dh = w / ir;
    dx = x;
    dy = y + (h - dh) / 2;
  } else {
    dh = h;
    dw = h * ir;
    dy = y;
    dx = x + (w - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  roundRect(ctx, x, y, w, h, 20);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function paint(ctx, spec, entry, img) {
  const { w, h } = spec;
  const heaven = entry.presence === "heaven";
  const zh = entry.lang === "zh";
  drawBackground(ctx, w, h, heaven);

  const tall = h > 1600;
  let y = tall ? 150 : 120;
  drawLogo(ctx, w, y);
  y += tall ? 58 : 50;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = font(700, tall ? 40 : 34);
  ctx.fillText("Dear Super Dad · 说给爸爸听", w / 2, y);
  y += tall ? 52 : 44;
  ctx.font = font(600, tall ? 34 : 30);
  ctx.fillText(zh ? "那些没说出口的话，说给爸爸听。" : "Say what you never said.", w / 2, y);
  y += tall ? 46 : 36;

  const pad = 72;
  const footerBlock = tall ? 210 : 180;
  const panelX = pad;
  const panelY = y;
  const panelW = w - pad * 2;
  const panelH = h - footerBlock - panelY;

  roundRect(ctx, panelX + 14, panelY + 14, panelW, panelH, 32);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRect(ctx, panelX, panelY, panelW, panelH, 32);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();

  const innerX = panelX + 52;
  const innerW = panelW - 104;
  let ty = panelY + 78;

  const pill = zh ? (heaven ? "⭐ 在天上" : "🌤️ 还在身边") : (heaven ? "⭐ In heaven" : "🌤️ Living");
  ctx.font = font(700, 32);
  ctx.textAlign = "left";
  const pillW = ctx.measureText(pill).width + 40;
  roundRect(ctx, innerX, ty - 38, pillW, 54, 27);
  ctx.fillStyle = heaven ? "#2a2a72" : SUN;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = heaven ? "#fff" : INK;
  ctx.fillText(pill, innerX + 20, ty);

  if (entry.sample) {
    const mark = zh ? "示例" : "SAMPLE";
    ctx.font = zh ? font(700, 30) : "40px Bangers, Impact, sans-serif";
    const mw = ctx.measureText(mark).width + 36;
    const mx = panelX + panelW - 52 - mw;
    roundRect(ctx, mx, ty - 38, mw, 54, 14);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(mark, mx + mw / 2, ty + (zh ? 0 : 4));
  }

  ty += 78;
  const salute = zh ? `${entry.salutation}：` : `${entry.salutation},`;
  const saluteSize = tall ? 58 : 48;
  const place = entry.countryName || entry.countryCode || "";
  const countryY = panelY + panelH - 52;
  const contentBottom = countryY - 36;

  if (entry.kind === "drawing" && img) {
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = font(700, saluteSize);
    ctx.fillText(salute, innerX, ty);
    ty += tall ? 28 : 22;
    ctx.font = font(600, tall ? 34 : 30);
    const capLines = entry.text ? wrap(ctx, entry.text, innerW) : [];
    const capH = capLines.length * (tall ? 48 : 42);
    const imgTop = ty + 24;
    const imgH = Math.max(160, contentBottom - imgTop - capH - (capLines.length ? 20 : 0));
    drawImageContain(ctx, img, innerX, imgTop, innerW, imgH);
    let cy = imgTop + imgH + (tall ? 44 : 38);
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.font = font(600, tall ? 34 : 30);
    for (const line of capLines) {
      if (cy > contentBottom) break;
      ctx.fillText(line, innerX, cy);
      cy += tall ? 48 : 42;
    }
  } else {
    const regionTop = ty;
    const regionBottom = panelY + panelH - 64;
    const available = regionBottom - regionTop;
    let size = tall ? 52 : 42;
    let lines = [];
    let lineH = size * 1.45;
    while (size >= 30) {
      ctx.font = font(600, size);
      lines = wrap(ctx, entry.text, innerW);
      lineH = Math.round(size * 1.45);
      const block = saluteSize + 36 + lines.length * lineH + 64;
      if (block <= available) break;
      size -= 2;
    }
    const block = saluteSize + 36 + lines.length * lineH + 64;
    const extra = Math.max(0, available - block);
    let cursor = regionTop + extra * 0.45;
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = font(700, saluteSize);
    cursor += saluteSize;
    ctx.fillText(salute, innerX, cursor);
    cursor += 36;
    ctx.font = font(600, size);
    for (const line of lines) {
      cursor += lineH;
      ctx.fillText(line, innerX, cursor);
    }
    ctx.font = font(600, 30);
    ctx.fillStyle = "#3a3866";
    ctx.fillText(place, innerX, cursor + 52);
  }

  if (entry.kind === "drawing" && img) {
    ctx.font = font(600, 30);
    ctx.fillStyle = "#3a3866";
    ctx.textAlign = "left";
    ctx.fillText(place, innerX, countryY);
  }

  const brand = zh ? "每个爸爸，都是某个人的超人。" : "Every dad is somebody's super dad.";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fffdf6";
  ctx.font = font(700, tall ? 36 : 32);
  ctx.fillText(brand, w / 2, h - (tall ? 118 : 100));
  ctx.font = font(600, 28);
  ctx.fillStyle = SUN;
  ctx.fillText("dadcomic.com/dear  ·  My Super Dad", w / 2, h - (tall ? 64 : 54));
}

export async function renderShareCard(entry, ratio) {
  const spec = RATIOS[ratio];
  if (!spec) throw new Error("ratio");
  await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext("2d");
  let img = null;
  if (entry.kind === "drawing" && entry.imageUrl) img = await loadImage(entry.imageUrl);
  paint(ctx, spec, entry, img);
  return canvas;
}

export function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("blob"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
      resolve(blob);
    }, "image/png");
  });
}

export function presentEntry(entry) {
  return {
    ...entry,
    countryName: countryName(entry.countryCode, entry.lang),
    imageUrl: entry.image ? mediaUrl(entry.image) : null,
  };
}

export async function openShareDialog(entry) {
  const dialog = document.getElementById("share-dialog");
  if (!dialog) return;
  const box = dialog.querySelector(".previews");
  const status = dialog.querySelector(".share-status");
  const buttons = [...dialog.querySelectorAll("[data-download]")];
  box.replaceChildren();
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.onclick = null;
  });
  status.textContent = t("shareWorking");
  if (!dialog.open) dialog.showModal();
  const title = dialog.querySelector("#share-title");
  if (title) title.focus();
  try {
    const view = presentEntry(entry);
    const c916 = await renderShareCard(view, "9:16");
    const c45 = await renderShareCard(view, "4:5");
    c916.className = "preview-canvas p916";
    c45.className = "preview-canvas p45";
    box.append(figureFor(c916, "9:16"), figureFor(c45, "4:5"));
    wireDownload(dialog, "9:16", c916, `my-super-dad-${entry.id}-9x16.png`);
    wireDownload(dialog, "4:5", c45, `my-super-dad-${entry.id}-4x5.png`);
    status.textContent = entry.sample ? t("shareSample") : t("shareHelp");
  } catch (err) {
    status.textContent = t("shareFail");
    console.error(err);
  }
}

function figureFor(canvas, label) {
  const fig = document.createElement("figure");
  const cap = document.createElement("figcaption");
  cap.textContent = label;
  fig.append(canvas, cap);
  return fig;
}

function wireDownload(dialog, ratio, canvas, filename) {
  const btn = dialog.querySelector(`[data-download="${ratio}"]`);
  if (!btn) return;
  btn.disabled = false;
  btn.onclick = () => {
    downloadCanvas(canvas, filename).catch(() => {
      const status = dialog.querySelector(".share-status");
      if (status) status.textContent = t("shareFail");
    });
  };
}

export function bindShareDialog() {
  const dialog = document.getElementById("share-dialog");
  const close = document.getElementById("share-close");
  if (close && dialog) close.addEventListener("click", () => dialog.close());
}
