import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);

// Username & password sama persis. Auth Supabase butuh format email,
// jadi username diterjemahkan ke email dummy di sini (tidak pernah kelihatan user).
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@medinfo.internal`;
}
