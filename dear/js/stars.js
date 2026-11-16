import { t } from "./i18n.js";

const KEY = "dear-super-dad-stars-v1";

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    return [];
  }
}

function save(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch (err) {
    /* ignore */
  }
}

export function isLit(id) {
  return load().includes(id);
}

export function toggleStar(id) {
  const ids = load();
  const index = ids.indexOf(id);
  let on;
  if (index >= 0) {
    ids.splice(index, 1);
    on = false;
  } else {
    ids.push(id);
    on = true;
  }
  save(ids);
  return on;
}

export function paintSky() {
  const sky = document.getElementById("night-sky");
  const stars = document.getElementById("night-stars");
  const count = document.getElementById("night-count");
  if (!sky || !stars || !count) return;
  const heaven = document.getElementById("wall")?.classList.contains("tone-heaven");
  sky.hidden = !heaven;
  const ids = load();
  count.textContent = t("starsCount").replace("{n}", String(ids.length));
  stars.replaceChildren();
  ids.forEach(() => {
    const star = document.createElement("i");
    stars.append(star);
  });
}
