import { OWNER_COOKIE_NAME, isIsoDateString, isValidOwnerId } from '@/lib/owner-cookie';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getService() {
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const ownerId = jar.get(OWNER_COOKIE_NAME)?.value;
  if (!ownerId || !isValidOwnerId(ownerId)) {
    return NextResponse.json({ error: '브라우저 쿠키를 허용해 주세요.' }, { status: 401 });
  }

  const supabase = getService();
  if (!supabase) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const incompleteOnly = searchParams.get('incomplete_only') === '1';

  if (date) {
    if (!isIsoDateString(date)) {
      return NextResponse.json({ error: '잘못된 날짜입니다.' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', ownerId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }

  if (from && to) {
    if (!isIsoDateString(from) || !isIsoDateString(to)) {
      return NextResponse.json({ error: '잘못된 날짜 범위입니다.' }, { status: 400 });
    }
    let q = supabase
      .from('todos')
      .select('*')
      .eq('user_id', ownerId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (incompleteOnly) q = q.eq('is_completed', false);
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }

  return NextResponse.json(
    { error: '쿼리에 date 또는 from·to가 필요합니다.' },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const ownerId = jar.get(OWNER_COOKIE_NAME)?.value;
  if (!ownerId || !isValidOwnerId(ownerId)) {
    return NextResponse.json({ error: '브라우저 쿠키를 허용해 주세요.' }, { status: 401 });
  }

  const supabase = getService();
  if (!supabase) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const title =
    typeof body === 'object' && body !== null && 'title' in body
      ? String((body as { title: unknown }).title).trim()
      : '';
  const dateRaw =
    typeof body === 'object' && body !== null && 'date' in body
      ? String((body as { date: unknown }).date)
      : '';

  if (!title) {
    return NextResponse.json({ error: '제목이 필요합니다.' }, { status: 400 });
  }
  if (!isIsoDateString(dateRaw)) {
    return NextResponse.json({ error: '날짜가 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('todos')
    .insert({
      title,
      date: dateRaw,
      user_id: ownerId,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
