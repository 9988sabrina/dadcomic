import { createEntry, loadCountries, countryName } from "./api.js";
import { applyI18n, getLang, onLang, t } from "./i18n.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export function initForm() {
  const form = document.getElementById("write-form");
  if (!form) return;

  const errors = document.getElementById("form-errors");
  const result = document.getElementById("form-result");
  const resultTitle = document.getElementById("form-result-title");
  const resultBody = document.getElementById("form-result-body");
  const copyBtn = document.getElementById("copy-words");
  const copyStatus = document.getElementById("copy-status");
  const counter = document.getElementById("counter");
  const textarea = form.querySelector("[name=text]");
  const fileInput = form.querySelector("[name=drawing]");
  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("image-preview-img");
  const customField = document.getElementById("custom-salutation-field");
  const countrySelect = form.querySelector("[name=country]");
  let objectUrl = null;
  let errorKeys = [];
  let resultOn = false;

  function kind() {
    return form.querySelector("[name=kind]:checked")?.value || "letter";
  }

  function syncKind() {
    const drawing = kind() === "drawing";
    document.getElementById("letter-fields").hidden = drawing;
    document.getElementById("drawing-fields").hidden = !drawing;
  }

  function syncSalutation() {
    const other = form.salutation.value === "other";
    customField.hidden = !other;
    if (!other) form.salutationCustom.value = "";
  }

  function updateCounter() {
    const chars = [...textarea.value];
    if (chars.length > 300) {
      textarea.value = chars.slice(0, 300).join("");
    }
    const n = [...textarea.value].length;
    counter.textContent = t("counter").replace("{n}", String(n));
    counter.classList.toggle("warn", n >= 270 && n < 300);
    counter.classList.toggle("full", n >= 300);
  }

  async function fillCountries() {
    const map = await loadCountries();
    const previous = countrySelect.value;
    const lang = getLang();
    const collator = new Intl.Collator(lang === "zh" ? "zh-Hans" : "en");
    const codes = Object.keys(map).sort((a, b) => collator.compare(countryName(a, lang), countryName(b, lang)));
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("countryPlaceholder");
    countrySelect.replaceChildren(placeholder);
    for (const code of codes) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = countryName(code, lang);
      countrySelect.append(option);
    }
    if (previous && [...countrySelect.options].some((opt) => opt.value === previous)) {
      countrySelect.value = previous;
    }
  }

  function showErrors(keys) {
    errorKeys = keys;
    errors.replaceChildren();
    if (!keys.length) {
      errors.hidden = true;
      return;
    }
    errors.hidden = false;
    const lead = document.createElement("p");
    lead.textContent = t("formErrorLead");
    const list = document.createElement("ul");
    keys.forEach((key) => {
      const li = document.createElement("li");
      li.textContent = t(key);
      list.append(li);
    });
    errors.append(lead, list);
  }

  function showResult(on) {
    resultOn = on;
    result.hidden = !on;
    if (!on) return;
    resultTitle.textContent = t("notSentTitle");
    resultBody.textContent = t("notSentBody");
    const letter = kind() === "letter" && textarea.value.trim();
    copyBtn.hidden = !letter;
    copyStatus.textContent = "";
  }

  function clearPreview() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    previewImg.removeAttribute("src");
    preview.hidden = true;
    fileInput.value = "";
  }

  form.salutation.addEventListener("change", syncSalutation);
  form.querySelectorAll("[name=kind]").forEach((input) => input.addEventListener("change", syncKind));
  textarea.addEventListener("input", updateCounter);
  document.getElementById("remove-image").addEventListener("click", clearPreview);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    preview.hidden = true;
    previewImg.removeAttribute("src");
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      fileInput.value = "";
      showErrors(["errImageType"]);
      return;
    }
    if (file.size > MAX_BYTES) {
      fileInput.value = "";
      showErrors(["errImageSize"]);
      return;
    }
    objectUrl = URL.createObjectURL(file);
    previewImg.src = objectUrl;
    previewImg.alt = t("previewAlt");
    preview.hidden = false;
    if (errorKeys.includes("errImageType") || errorKeys.includes("errImageSize") || errorKeys.includes("errDrawing")) {
      showErrors([]);
    }
  });

  copyBtn.addEventListener("click", async () => {
    const text = textarea.value;
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = t("copied");
    } catch (err) {
      copyStatus.textContent = t("copyFail");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const salutation = form.salutation.value === "other"
      ? form.salutationCustom.value.trim()
      : form.salutation.value.trim();
    const payload = {
      kind: kind(),
      salutation,
      presence: form.querySelector("[name=presence]:checked")?.value || "",
      lang: form.querySelector("[name=lang]:checked")?.value || "",
      countryCode: countrySelect.value,
      text: textarea.value.trim(),
      privacy: form.querySelector("[name=privacy]:checked")?.value || "team",
      consent: {
        wall: form.consent_wall.checked,
        video: form.consent_video.checked,
        products: form.consent_products.checked,
      },
      hasImage: kind() === "drawing" && Boolean(fileInput.files && fileInput.files[0]),
    };
    const keys = [];
    if (!payload.salutation) keys.push("errSalutation");
    if (!payload.presence) keys.push("errPresence");
    if (!payload.lang) keys.push("errLang");
    if (!payload.countryCode) keys.push("errCountry");
    if (payload.kind === "letter" && (!payload.text || [...payload.text].length > 300)) keys.push("errLetter");
    if (payload.kind === "drawing" && !payload.hasImage) keys.push("errDrawing");
    if (payload.privacy === "public" && !payload.consent.wall) keys.push("errPublicConsent");
    if (keys.length) {
      showResult(false);
      showErrors(keys);
      errors.focus?.();
      const top = errors.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
      return;
    }
    showErrors([]);
    let response = { ok: false, code: "not_wired" };
    try {
      response = await createEntry(payload);
    } catch (err) {
      console.error(err);
    }
    if (response && response.ok) {
      showResult(true);
      return;
    }
    showResult(true);
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  onLang(() => {
    applyI18n();
    updateCounter();
    if (previewImg.getAttribute("src")) previewImg.alt = t("previewAlt");
    fillCountries();
    if (errorKeys.length) showErrors(errorKeys);
    if (resultOn) showResult(true);
  });

  syncKind();
  syncSalutation();
  updateCounter();
  fillCountries();
}
