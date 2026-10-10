// ============================================================================
// QuickCO Supabase Client Singleton
// ============================================================================

import { CONFIG } from './config.js';

if (!window.supabase) {
  console.error("Supabase client library not loaded from CDN.");
}

export const supabase = window.supabase.createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
