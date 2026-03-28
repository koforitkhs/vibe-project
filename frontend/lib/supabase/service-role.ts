import { createClient } from '@supabase/supabase-js';

/** 서버(Route Handler) 전용. RLS를 우회하므로 반드시 user_id(게스트 소유자)로 범위를 제한할 것. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(url, key);
}
