import { createBrowserClient } from "@supabase/ssr";
import { isDemoMode } from "@/lib/utils";

export function createClient() {
  if (isDemoMode()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createBrowserClient(url, key);
}
