import { hasServiceRoleConfig } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

/** 서비스 롤이 있을 때만 할 일 API 사용. 없으면 클라이언트는 설정 안내 화면만 표시 */
export async function GET() {
  const mode = hasServiceRoleConfig() ? 'service' : 'unconfigured';
  return NextResponse.json({ mode });
}
