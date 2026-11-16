/**
 * Dear Super Dad backend switch.
 *
 * Leave backend as "local" for the static prototype. The wall reads
 * dear/data/seed.json and the form does not send anything.
 *
 * To plug in Supabase later, set backend to "supabase" and fill the URL
 * and anon key (the anon key is public; lock the table down with RLS).
 * You can also set these at runtime without editing this file:
 *   window.DEAR_BACKEND = "supabase"
 *   window.DEAR_SUPABASE = { url: "https://PROJECT.supabase.co", anonKey: "..." }
 *
 * The anon key must not be a service-role key. See the notes in api.js.
 */
export const DEAR_CONFIG = {
  backend: "local",
  supabaseUrl: "",
  supabaseAnonKey: "",
};
