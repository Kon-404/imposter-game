import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browserClient;
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
