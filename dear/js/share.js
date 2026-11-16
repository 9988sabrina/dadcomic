import { countryName, mediaUrl } from "./api.js";
import { t } from "./i18n.js";

const INK = "#141414";
const SUN = "#ffd23f";
const PAPER = "#fffdf6";
const RED = "#e23b4a";

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
    document.fonts.load("500 72px Fraunces"),
    document.fonts.load("italic 500 48px Fraunces"),
    document.fonts.load("500 40px 'Noto Serif SC'"),
    document.fonts.load("600 32px 'Noto Serif SC'"),
  ];
  await Promise.all(jobs.map((job) => job.catch(() => {})));
  await document.fonts.ready;
}

function font(weight, size) {
  return `${weight} ${size}px Fraunces, "Noto Serif SC", Georgia, serif`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function halftone(ctx, w, h, color) {
  ctx.fillStyle = color;
  for (let y = 16; y < h; y += 22) {
    for (let x = 12; x < w; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function inkText(ctx, text, x, y, fill) {
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawTail(ctx, x, y, heaven) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  if (heaven) {
    ctx.beginPath();
    ctx.arc(x + 36, y + 8, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 8, y + 36, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + 36, y - 8);
  ctx.lineTo(x + 18, y + 36);
  ctx.lineTo(x + 70, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function fitLines(ctx, text, maxWidth, maxHeight, start) {
  let size = start;
  let lines = [""];
  let lineH = size * 1.35;
  while (size >= 30) {
    ctx.font = font(600, size);
    lines = wrap(ctx, text, maxWidth);
    lineH = Math.round(size * 1.38);
    if (lines.length * lineH <= maxHeight) break;
    size -= 2;
  }
  return { size, lines, lineH };
}

function paint(ctx, spec, entry, img) {
  const { w, h } = spec;
  const heaven = entry.presence === "heaven";
  const zh = entry.lang === "zh";
  const ink = heaven ? "#f6f1e7" : "#14182b";
  const gold = "#c4a574";
  ctx.fillStyle = heaven ? "#14182e" : "#f4efe6";
  ctx.fillRect(0, 0, w, h);
  if (heaven) {
    ctx.fillStyle = "rgba(243,226,196,.85)";
    [[140, 160], [940, 220], [200, 780], [880, 980], [160, 1500], [900, 1680]].forEach(([x, y]) => {
      if (y > h - 80) return;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const m = 72;
  ctx.strokeStyle = heaven ? "rgba(243,226,196,.75)" : "#14182b";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeRect(m + 14, m + 14, w - (m + 14) * 2, h - (m + 14) * 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = gold;
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.fillText(zh ? "第 01 期" : "ISSUE  01", w / 2, m + 78);
  ctx.fillStyle = ink;
  ctx.font = `500 ${h > 1600 ? 68 : 54}px Fraunces, "Noto Serif SC", Georgia, serif`;
  ctx.fillText("Dear Super Dad", w / 2, m + 150);
  ctx.font = `500 30px "Noto Serif SC", Fraunces, Georgia, serif`;
  ctx.fillText(zh ? "说给爸爸听" : "Say what you never said.", w / 2, m + 200);

  const contentTop = m + 250;
  const contentBottom = h - m - 120;
  let cursor = contentTop;
  if (entry.kind === "drawing" && img) {
    const frameH = Math.round((contentBottom - contentTop) * 0.46);
    const frameW = w - (m + 70) * 2;
    const fx = (w - frameW) / 2;
    ctx.fillStyle = heaven ? "#1c2344" : "#fff";
    ctx.fillRect(fx, cursor, frameW, frameH);
    const ir = img.width / img.height || 1;
    const r = frameW / frameH;
    let dw, dh, dx, dy;
    if (ir > r) { dh = frameH; dw = frameH * ir; dy = cursor; dx = fx + (frameW - dw) / 2; }
    else { dw = frameW; dh = frameW / ir; dx = fx; dy = cursor + (frameH - dh) / 2; }
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, cursor, frameW, frameH);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    cursor += frameH + 48;
  }

  const innerW = w - (m + 110) * 2;
  const available = contentBottom - cursor - 20;
  const fitted = fitLines(ctx, entry.text, innerW, Math.max(120, available - 80), h > 1600 ? 46 : 38);
  const block = 70 + fitted.lines.length * fitted.lineH + 70;
  const extra = Math.max(0, available - block);
  let y = cursor + extra * 0.35;
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `italic 500 ${h > 1600 ? 48 : 40}px Fraunces, "Noto Serif SC", Georgia, serif`;
  const salute = zh ? `${entry.salutation}，` : `${entry.salutation},`;
  ctx.fillText(salute, w / 2, y);
  y += 28;
  ctx.font = font(500, fitted.size);
  fitted.lines.forEach((line) => {
    y += fitted.lineH;
    ctx.fillText(line, w / 2, y);
  });
  y += 42;
  ctx.font = "500 22px Outfit, sans-serif";
  ctx.fillStyle = gold;
  const where = `${heaven ? (zh ? "在天上" : "In heaven") : (zh ? "还在身边" : "Living")}  ·  ${entry.countryName || ""}`;
  ctx.fillText(where, w / 2, y);
  if (entry.sample) {
    ctx.fillText(zh ? "示例" : "SAMPLE", w / 2, y + 36);
  }

  ctx.fillStyle = ink;
  ctx.font = "500 24px Outfit, sans-serif";
  ctx.fillText("dadcomic.com/dear", w / 2, h - m - 36);
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
