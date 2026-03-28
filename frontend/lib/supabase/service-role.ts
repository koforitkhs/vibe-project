import { createClient } from '@supabase/supabase-js';

/** Vercel/로컬 등에서 이름이 조금 달라도 잡기 위함 */
export function getServiceRoleKey(): string | undefined {
  const k =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();
  return k || undefined;
}

export function hasServiceRoleConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getServiceRoleKey());
}

/** 서버(Route Handler) 전용. RLS를 우회하므로 반드시 user_id(게스트 소유자)로 범위를 제한할 것. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or service role key is not set');
  }
  return createClient(url, key);
}
