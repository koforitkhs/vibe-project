import { hasServiceRoleConfig } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

/** 클라이언트가 서버 API(서비스 롤) vs 브라우저 익명 중 어떤 경로를 쓸지 결정 */
export async function GET() {
  const mode = hasServiceRoleConfig() ? 'service' : 'anon';
  return NextResponse.json({ mode });
}
