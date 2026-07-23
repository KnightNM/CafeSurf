import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
}

const configuredSupabaseUrl = supabaseUrl;

export const supabaseAuth = createClient(configuredSupabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

let adminClient: ReturnType<typeof createClient> | null = null;

export const CAFE_COVERS_BUCKET = 'cafe-covers';
export const CAFE_REVISION_COVERS_BUCKET = 'cafe-revision-covers';

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  if (adminClient) return adminClient;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for cafe cover management.');
  }
  adminClient = createClient(configuredSupabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return adminClient;
}

export function getCafeCoverPublicUrl(path: string | null): string | null {
  if (!path) return null;
  return supabaseAuth.storage.from(CAFE_COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
}
