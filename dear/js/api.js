import { DEAR_CONFIG } from "./config.js";

/**
 * Data layer for Dear Super Dad.
 *
 * Local mode (now):
 *   listPublicEntries() reads dear/data/seed.json. Every row is a sample.
 *   createEntry() returns { ok: false, code: "not_wired" } and performs no network write.
 *
 * Supabase mode (later), expected table public.entries:
 *   id uuid primary key default gen_random_uuid()
 *   created_at timestamptz default now()
 *   kind text check (kind in ('letter','drawing'))
 *   salutation text not null
 *   presence text check (presence in ('living','heaven'))
 *   lang text check (lang in ('en','zh'))
 *   country_code text not null          -- ISO 3166-1 alpha-2, country only
 *   body text
 *   image_path text                     -- storage path, not a public URL
 *   privacy text check (privacy in ('only_me','team','public'))
 *   consent_wall boolean default false
 *   consent_video boolean default false
 *   consent_products boolean default false
 *   status text check (status in ('pending','approved','rejected','held')) default 'pending'
 *   sample boolean default false
 *
 * Suggested RLS:
 *   anon select: privacy = 'public' AND status = 'approved' AND sample = false
 *   anon insert: none. Inserts should go through a moderated path
 *   (edge function or server) so the browser cannot approve its own post.
 *   Team reads of privacy = 'team' need a separate role, not the anon key.
 * Drawings: upload to a private Storage bucket first, then store image_path.
 * That upload is intentionally not implemented in this prototype.
 */

const displays = {
  en: new Intl.DisplayNames(["en"], { type: "region" }),
  zh: new Intl.DisplayNames(["zh-Hans"], { type: "region" }),
};

let countriesPromise;

function dearRoot() {
  return new URL("../", import.meta.url);
}

export function mediaUrl(path) {
  if (!path) return null;
  return new URL(path, dearRoot()).href;
}

function backend() {
  const override = typeof window !== "undefined" ? window.DEAR_BACKEND : "";
  if (override === "supabase" || override === "local") return override;
  return DEAR_CONFIG.backend === "supabase" ? "supabase" : "local";
}

function supabaseConfig() {
  const runtime = typeof window !== "undefined" ? window.DEAR_SUPABASE : null;
  return {
    url: (runtime && runtime.url) || DEAR_CONFIG.supabaseUrl || "",
    anonKey: (runtime && runtime.anonKey) || DEAR_CONFIG.supabaseAnonKey || "",
  };
}

export function loadCountries() {
  if (!countriesPromise) {
    countriesPromise = fetch(new URL("../data/countries.json", import.meta.url)).then((res) => {
      if (!res.ok) throw new Error("countries");
      return res.json();
    });
  }
  return countriesPromise;
}

export function countryName(code, lang) {
  if (!code) return "";
  try {
    const name = displays[lang === "zh" ? "zh" : "en"].of(code);
    if (name && name !== code) return name;
  } catch (err) {
    /* Intl missing */
  }
  return code;
}

function fromSeed(row) {
  return {
    id: row.id,
    sample: true,
    kind: row.kind === "drawing" ? "drawing" : "letter",
    salutation: row.salutation,
    presence: row.presence === "heaven" ? "heaven" : "living",
    lang: row.lang === "zh" ? "zh" : "en",
    countryCode: row.countryCode,
    text: row.text || "",
    image: row.image || null,
    alt: row.alt || null,
    privacy: "public",
    reactions: {
      heart: Number(row.reactions?.heart) || 0,
      hug: Number(row.reactions?.hug) || 0,
      star: Number(row.reactions?.star) || 0,
    },
  };
}

function fromRow(row) {
  const base = supabaseConfig().url.replace(/\/$/, "");
  const image = row.image_path
    ? `${base}/storage/v1/object/public/drawings/${row.image_path}`
    : null;
  return {
    id: row.id,
    sample: Boolean(row.sample),
    kind: row.kind === "drawing" ? "drawing" : "letter",
    salutation: row.salutation,
    presence: row.presence === "heaven" ? "heaven" : "living",
    lang: row.lang === "zh" ? "zh" : "en",
    countryCode: row.country_code,
    text: row.body || "",
    image,
    alt: null,
    privacy: "public",
    reactions: { heart: 0, hug: 0, star: 0 },
  };
}

async function listFromSeed() {
  const res = await fetch(new URL("../data/seed.json", import.meta.url));
  if (!res.ok) throw new Error("seed");
  const data = await res.json();
  return (data.entries || []).map(fromSeed).filter((entry) => entry.privacy === "public");
}

async function listFromSupabase() {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) throw new Error("supabase-config");
  const query = new URLSearchParams({
    select: "id,kind,salutation,presence,lang,country_code,body,image_path,sample",
    privacy: "eq.public",
    status: "eq.approved",
    sample: "eq.false",
    order: "created_at.desc",
  });
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/entries?${query}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) throw new Error("supabase-read");
  const rows = await res.json();
  return rows.map(fromRow);
}

export async function listPublicEntries() {
  if (backend() === "supabase") return listFromSupabase();
  return listFromSeed();
}

export function toSupabaseRow(payload) {
  return {
    kind: payload.kind,
    salutation: payload.salutation,
    presence: payload.presence,
    lang: payload.lang,
    country_code: payload.countryCode,
    body: payload.text || "",
    privacy: payload.privacy,
    consent_wall: Boolean(payload.consent?.wall),
    consent_video: Boolean(payload.consent?.video),
    consent_products: Boolean(payload.consent?.products),
    status: payload.privacy === "public" ? "pending" : "held",
    sample: false,
  };
}

async function createInSupabase(payload) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return { ok: false, code: "not_configured" };
  if (payload.hasImage) {
    return { ok: false, code: "not_wired", reason: "image_upload_not_ready" };
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/entries`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(toSupabaseRow(payload)),
  });
  if (!res.ok) return { ok: false, code: "supabase_error" };
  return { ok: true };
}

/**
 * Shape a draft the future insert can send unchanged.
 * In this prototype the return value is always not_wired: no fetch runs
 * unless DEAR_BACKEND is "supabase" AND a letter (not a drawing) is posted.
 * The form treats every non-ok result as "nothing was sent".
 */
export async function createEntry(payload) {
  if (backend() !== "supabase") return { ok: false, code: "not_wired" };
  return createInSupabase(payload);
}
