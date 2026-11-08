/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Supabase project URL for account sync. Empty or missing: sync is off. */
  readonly VITE_SUPABASE_URL?: string;
  /** The Supabase public anon key (public by design; row-level security protects the data). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
