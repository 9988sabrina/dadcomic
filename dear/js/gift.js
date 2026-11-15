import { listPublicEntries } from "./api.js";
import { bindCardActions, mountCard } from "./cards.js";
import { applyI18n, getLang, onLang, setLang, t } from "./i18n.js";
import { bindShareDialog } from "./share.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
let entry = null;

function renderCard() {
  const slot = document.getElementById("gift-card");
  const missing = document.getElementById("gift-missing");
  const selected = document.getElementById("gift-selected");
  slot.replaceChildren();
  if (!entry) {
    slot.hidden = true;
    missing.hidden = false;
    selected.hidden = true;
    return;
  }
  slot.hidden = false;
  missing.hidden = true;
  selected.hidden = false;
  slot.append(mountCard(entry, { gift: false }));
}

async function main() {
  applyI18n();
  document.getElementById("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "zh" ? "en" : "zh");
  });
  bindShareDialog();
  bindCardActions(document.getElementById("gift-card"), (cardId) => (entry && entry.id === cardId ? entry : null));
  onLang(() => {
    applyI18n();
    renderCard();
  });
  try {
    const entries = await listPublicEntries();
    entry = entries.find((item) => item.id === id) || null;
    renderCard();
    document.documentElement.dataset.ready = "1";
  } catch (err) {
    console.error(err);
    document.getElementById("gift-missing").textContent = t("loadError");
    document.getElementById("gift-missing").hidden = false;
    document.documentElement.dataset.ready = "error";
  }
}

main();
