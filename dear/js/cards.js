import { countryName, mediaUrl } from "./api.js";
import { t, getLang } from "./i18n.js";
import { displayCount, isOn, toggleReaction } from "./reactions.js";
import { openShareDialog } from "./share.js";
import { isLit, paintSky, toggleStar } from "./stars.js";

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  (children || []).forEach((child) => {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function giftHref(id) {
  const root = new URL("../", import.meta.url);
  const url = new URL("gift/", root);
  url.searchParams.set("id", id);
  return url.pathname + url.search;
}

function altText(entry) {
  if (!entry.alt) return "";
  const lang = getLang();
  return entry.alt[lang] || entry.alt.en || entry.alt.zh || "";
}

function reactionButton(entry, key, emoji, labelKey) {
  const on = isOn(entry.id, key);
  return el("button", {
    type: "button",
    class: on ? "react on" : "react",
    "data-action": "react",
    "data-key": key,
    "aria-pressed": on ? "true" : "false",
    "aria-label": t(labelKey),
  }, [
    el("span", { "aria-hidden": "true" }, [emoji]),
    el("span", { class: "count" }, [String(displayCount(entry, key))]),
  ]);
}

export function mountCard(entry, options = {}) {
  const showGift = options.gift !== false;
  const showShare = options.share !== false;
  const showReactions = options.reactions !== false;
  const zh = entry.lang === "zh";
  const salute = zh ? `${entry.salutation}：` : `${entry.salutation},`;
  const kids = [
    el("div", { class: "panel-bar" }, [
      el("span", { class: `pill ${entry.presence}` }, [entry.presence === "heaven" ? t("heaven") : t("living")]),
      entry.sample ? el("span", { class: "sample-pill" }, [t("sample")]) : null,
      el("span", { class: "lang-pill" }, [entry.lang === "zh" ? "中文" : "EN"]),
    ].filter(Boolean)),
  ];
  if (entry.kind === "drawing" && entry.image) {
    kids.push(el("div", { class: "page-frame" }, [
      el("img", {
        class: "drawing",
        src: mediaUrl(entry.image),
        alt: altText(entry),
        width: "800",
        height: "800",
      }),
    ]));
  }
  kids.push(el("div", { class: "letter bubble" }, [
    el("p", { class: "salute" }, [salute]),
    el("p", { class: "body" }, [entry.text]),
  ]));
  kids.push(el("p", { class: "meta" }, [countryName(entry.countryCode, getLang())]));
  if (entry.presence === "heaven") {
    const lit = isLit(entry.id);
    kids.push(el("button", {
      type: "button",
      class: "star-light",
      "data-action": "star",
      "aria-pressed": lit ? "true" : "false",
    }, [lit ? t("starLit") : t("lightStar")]));
  }
  if (showReactions) {
    kids.push(el("div", { class: "reacts" }, [
      reactionButton(entry, "heart", "❤️", "reactHeart"),
      reactionButton(entry, "hug", "🤗", "reactHug"),
      reactionButton(entry, "star", "💛", "reactWarm"),
    ]));
  }
  const actions = [];
  if (showShare) {
    actions.push(el("button", { type: "button", class: "btn w", "data-action": "share" }, [t("share")]));
  }
  if (showGift) {
    actions.push(el("a", { class: "btn y", href: giftHref(entry.id) }, [t("gift")]));
  }
  if (actions.length) kids.push(el("div", { class: "card-actions" }, actions));
  return el("article", {
    class: `card panel letter-card ${entry.kind} ${entry.presence}`,
    "data-reveal": "1",
    "data-id": entry.id,
  }, kids);
}

export function bindCardActions(root, lookup) {
  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn || !root.contains(btn)) return;
    const card = btn.closest("[data-id]");
    const entry = card && lookup(card.dataset.id);
    if (!entry) return;
    if (btn.dataset.action === "share") {
      openShareDialog(entry);
      return;
    }
    if (btn.dataset.action === "star") {
      const on = toggleStar(entry.id);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? t("starLit") : t("lightStar");
      paintSky();
      return;
    }
    if (btn.dataset.action === "react") {
      const key = btn.dataset.key;
      const on = toggleReaction(entry.id, key);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("on", on);
      const count = btn.querySelector(".count");
      if (count) count.textContent = String(displayCount(entry, key));
    }
  });
}
