import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Lazy-initialized singletons
// Supabase clients are created on first access, not at module import time.
// This guarantees the environment variables are fully resolved by the time
// the client is constructed (critical for Render where env vars are injected
// after container start, not available during the initial module-load phase).
// ---------------------------------------------------------------------------

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!_supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable');
        }
        _supabaseClient = createClient(url, key);
    }
    return _supabaseClient;
}

export function getSupabaseAdmin(): SupabaseClient {
    if (!_supabaseAdmin) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
        }
        _supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return _supabaseAdmin;
}

// ---------------------------------------------------------------------------
// Legacy named exports — kept for backward compatibility so no other files
// need to be changed. These are now thin proxies to the lazy getters.
// ---------------------------------------------------------------------------
export const supabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabaseClient() as any)[prop];
    },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabaseAdmin() as any)[prop];
    },
});
