import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Lazy-initialized singletons — read env vars at first call, not at import.
// This is required on Render where env vars are injected at container start
// but module-level code runs before that injection completes.
// ---------------------------------------------------------------------------

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!_supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        }
        _supabaseClient = createClient(url, key);
        console.log('[Supabase] Anon client initialized for URL:', url);
    }
    return _supabaseClient;
}

export function getSupabaseAdmin(): SupabaseClient {
    if (!_supabaseAdmin) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }
        _supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        console.log('[Supabase] Admin client initialized for URL:', url);
    }
    return _supabaseAdmin;
}

// ---------------------------------------------------------------------------
// Named convenience exports that call the lazy getters each time.
// Deliberately NOT using Proxy to avoid `this`-context loss on nested calls.
// ---------------------------------------------------------------------------
export const supabaseClient = {
    get auth() { return getSupabaseClient().auth; },
    get storage() { return getSupabaseClient().storage; },
    get realtime() { return getSupabaseClient().realtime; },
} as unknown as SupabaseClient;

export const supabaseAdmin = {
    get auth() { return getSupabaseAdmin().auth; },
    get storage() { return getSupabaseAdmin().storage; },
    get realtime() { return getSupabaseAdmin().realtime; },
} as unknown as SupabaseClient;
