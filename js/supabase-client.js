// ============================================================================
// QuickCO Supabase Client Singleton (Resilient & Offline-Tolerant)
// ============================================================================

import { CONFIG } from './config.js';

let clientInstance = null;
export const isSupabaseLoaded = typeof window !== 'undefined' && Boolean(window.supabase?.createClient);

if (isSupabaseLoaded) {
  try {
    clientInstance = window.supabase.createClient(
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
  } catch (err) {
    console.warn("Supabase client initialization warning:", err);
  }
} else {
  console.warn("Supabase CDN library not detected. Running with resilient local adapter.");
}

// Resilient fallback stub if Supabase script failed to load
function createDummyQuery() {
  const handler = {
    get(target, prop) {
      if (['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'range'].includes(prop)) {
        return () => new Proxy({}, handler);
      }
      if (prop === 'single') {
        return () => Promise.resolve({ data: null, error: { message: 'Offline mode', code: 'PGRST205' } });
      }
      if (prop === 'then') {
        return (resolve) => resolve({ data: [], error: { message: 'Offline mode', code: 'PGRST205' } });
      }
      return () => new Proxy({}, handler);
    }
  };
  return new Proxy({}, handler);
}

const fallbackClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error("Supabase CDN offline") }),
    signUp: async () => ({ data: null, error: new Error("Supabase CDN offline") }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => createDummyQuery(),
  rpc: async () => ({ data: null, error: new Error("Offline") })
};

export const supabase = clientInstance || fallbackClient;

