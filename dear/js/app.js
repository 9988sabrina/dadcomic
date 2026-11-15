import { countryName, listPublicEntries } from "./api.js";
import { bindCardActions, mountCard } from "./cards.js";
import { initForm } from "./form.js";
import { applyI18n, getLang, onLang, setLang, t } from "./i18n.js";
import { bindShareDialog } from "./share.js";

const state = {
  entries: [],
  presence: "all",
  lang: "all",
  country: "all",
};

function countButton(code, name, n, pressed) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.country = code;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  const label = document.createElement("span");
  label.textContent = name;
  const num = document.createElement("b");
  num.textContent = String(n);
  btn.append(label, num);
  li.append(btn);
  return li;
}

function render() {
  const status = document.getElementById("wall-status");
  const wall = document.getElementById("wall-cards");
  const list = document.getElementById("count-list");
  const base = state.entries.filter((entry) => {
    if (state.presence !== "all" && entry.presence !== state.presence) return false;
    if (state.lang !== "all" && entry.lang !== state.lang) return false;
    return true;
  });
  const shown = base.filter((entry) => state.country === "all" || entry.countryCode === state.country);
  status.removeAttribute("data-i18n");
  status.textContent = t("resultCount").replace("{n}", String(shown.length));
  wall.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("empty");
    wall.append(empty);
  } else {
    shown.forEach((entry) => wall.append(mountCard(entry)));
  }
  wall.dataset.count = String(shown.length);

  const counts = new Map();
  base.forEach((entry) => {
    counts.set(entry.countryCode, (counts.get(entry.countryCode) || 0) + 1);
  });
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  list.replaceChildren();
  list.append(countButton("all", t("countsAll"), base.length, state.country === "all"));
  rows.forEach(([code, n]) => {
    list.append(countButton(code, countryName(code, getLang()), n, state.country === code));
  });

  document.querySelectorAll("[data-filter-presence]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.filterPresence === state.presence));
  });
  document.querySelectorAll("[data-filter-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.filterLang === state.lang));
  });
}

function bindChrome() {
  document.getElementById("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "zh" ? "en" : "zh");
  });
  document.querySelector(".filters").addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    if (btn.dataset.filterPresence) state.presence = btn.dataset.filterPresence;
    if (btn.dataset.filterLang) state.lang = btn.dataset.filterLang;
    render();
  });
  document.getElementById("count-list").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-country]");
    if (!btn) return;
    const code = btn.dataset.country;
    state.country = code === state.country ? "all" : code;
    render();
  });
  bindCardActions(document.getElementById("wall-cards"), (id) => state.entries.find((entry) => entry.id === id));
  bindShareDialog();
}

async function main() {
  applyI18n();
  bindChrome();
  initForm();
  onLang(render);
  try {
    state.entries = await listPublicEntries();
    render();
    document.documentElement.dataset.ready = "1";
  } catch (err) {
    console.error(err);
    document.getElementById("wall-status").textContent = t("loadError");
    document.documentElement.dataset.ready = "error";
  }
}

main();
