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
    document.fonts.load("120px Bangers"),
    document.fonts.load("64px 'ZCOOL KuaiLe'"),
    document.fonts.load("700 60px Fredoka"),
    document.fonts.load("600 46px Fredoka"),
    document.fonts.load("700 48px 'Noto Sans SC'"),
    document.fonts.load("600 46px 'Noto Sans SC'"),
  ];
  await Promise.all(jobs.map((job) => job.catch(() => {})));
  await document.fonts.ready;
}

function font(weight, size) {
  return `${weight} ${size}px Fredoka, "ZCOOL KuaiLe", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function displayFont(size) {
  return `${size}px Bangers, "ZCOOL KuaiLe", "Noto Sans SC", Impact, sans-serif`;
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
  const tall = h > 1600;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (heaven) {
    sky.addColorStop(0, "#d9d4ff");
    sky.addColorStop(1, "#8e88c9");
  } else {
    sky.addColorStop(0, "#b9ecff");
    sky.addColorStop(1, "#3aa0e6");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  halftone(ctx, w, h, heaven ? "rgba(44,42,110,.28)" : "rgba(20,20,20,.18)");

  const margin = 36;
  roundRect(ctx, margin + 12, margin + 12, w - margin * 2, h - margin * 2, 18);
  ctx.fillStyle = INK;
  ctx.fill();
  roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, 18);
  ctx.fillStyle = heaven ? "#f7f4ff" : PAPER;
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = displayFont(tall ? 92 : 78);
  inkText(ctx, "MY SUPER DAD", w / 2, margin + (tall ? 110 : 96), SUN);

  ctx.font = displayFont(tall ? 40 : 34);
  ctx.fillStyle = INK;
  ctx.fillText(zh ? "说给爸爸听" : "DEAR DAD!", w / 2, margin + (tall ? 164 : 146));

  const footerH = 78;
  const bubbleX = margin + 48;
  const bubbleW = w - margin * 2 - 96;
  let bubbleY = margin + (tall ? 196 : 172);
  const room = h - margin - footerH - bubbleY - 28;
  let bubbleH = room;

  if (entry.kind === "drawing" && img) {
    const frameH = Math.round(room * 0.56);
    roundRect(ctx, bubbleX, bubbleY, bubbleW, frameH, 12);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.save();
    roundRect(ctx, bubbleX, bubbleY, bubbleW, frameH, 12);
    ctx.clip();
    const ir = img.width / img.height || 1;
    const r = bubbleW / frameH;
    let dw;
    let dh;
    let dx;
    let dy;
    if (ir > r) {
      dh = frameH;
      dw = frameH * ir;
      dy = bubbleY;
      dx = bubbleX + (bubbleW - dw) / 2;
    } else {
      dw = bubbleW;
      dh = bubbleW / ir;
      dx = bubbleX;
      dy = bubbleY + (frameH - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = INK;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, frameH, 12);
    ctx.stroke();
    bubbleY += frameH + 28;
    bubbleH = h - margin - footerH - bubbleY - 24;
  } else {
    ctx.font = font(600, tall ? 46 : 38);
    const preview = wrap(ctx, entry.text, bubbleW - 80);
    const lineH = Math.round((tall ? 46 : 38) * 1.38);
    bubbleH = Math.min(room, 150 + preview.length * lineH + 90);
  }

  roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, heaven ? 80 : 36);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawTail(ctx, bubbleX + 24, bubbleY + bubbleH - 6, heaven);

  const innerX = bubbleX + 40;
  const innerW = bubbleW - 80;
  const pill = zh ? (heaven ? "⭐ 在天上" : "🌤️ 还在身边") : (heaven ? "⭐ In heaven" : "🌤️ Living");
  ctx.font = font(700, 30);
  ctx.textAlign = "left";
  const pillW = ctx.measureText(pill).width + 36;
  roundRect(ctx, innerX, bubbleY + 28, pillW, 48, 24);
  ctx.fillStyle = heaven ? "#2c2a6e" : SUN;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = heaven ? "#fff" : INK;
  ctx.fillText(pill, innerX + 18, bubbleY + 60);

  if (entry.sample) {
    const mark = zh ? "示例" : "SAMPLE";
    ctx.font = zh ? font(700, 28) : displayFont(36);
    const mw = ctx.measureText(mark).width + 28;
    const mx = bubbleX + bubbleW - 36 - mw;
    roundRect(ctx, mx, bubbleY + 28, mw, 48, 10);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(mark, mx + mw / 2, bubbleY + 62);
    ctx.textAlign = "left";
  }

  const salute = zh ? `${entry.salutation}：` : `${entry.salutation},`;
  const textTop = bubbleY + 108;
  const textBottom = bubbleY + bubbleH - 36;
  const available = textBottom - textTop - 70;
  const fitted = fitLines(ctx, entry.text, innerW, Math.max(80, available), tall ? 46 : 38);
  ctx.fillStyle = INK;
  ctx.font = font(700, tall ? 48 : 40);
  ctx.fillText(salute, innerX, textTop + 8);
  ctx.font = font(600, fitted.size);
  let ly = textTop + 8 + fitted.lineH + 8;
  for (const line of fitted.lines) {
    if (ly > textBottom - 40) break;
    ctx.fillText(line, innerX, ly);
    ly += fitted.lineH;
  }
  ctx.font = font(700, 28);
  ctx.fillStyle = "#242424";
  ctx.fillText(entry.countryName || "", innerX, Math.min(ly + 36, textBottom));

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin + 20, bubbleY + bubbleH + 24, w - margin * 2 - 40, h - margin - footerH - (bubbleY + bubbleH + 24));
  ctx.clip();
  ctx.fillStyle = heaven ? "rgba(44,42,110,.2)" : "rgba(20,20,20,.14)";
  for (let y = bubbleY + bubbleH + 36; y < h; y += 18) {
    for (let x = margin + 36; x < w - margin; x += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = font(700, 30);
  ctx.fillStyle = INK;
  ctx.fillText("dadcomic.com/dear", w / 2, h - margin - 36);
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
