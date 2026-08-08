import { createClient } from "@supabase/supabase-js";

// Client-side only: uses the publishable key, which RLS restricts to zero
// table access (see supabase/schema.sql) -- this client is only ever used
// for Storage's uploadToSignedUrl, which is authorized per-upload by the
// signed token itself, not by this key.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
