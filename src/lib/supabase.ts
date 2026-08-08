import { createClient } from "@supabase/supabase-js";

// Server-only: uses the secret key, which bypasses Row Level Security --
// never import this from a client component or expose it to the browser
// bundle. All account/workspace/media reads+writes go through our own API
// routes (same pattern as the existing @vercel/kv usage), never directly
// from the client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
