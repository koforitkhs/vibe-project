import { OWNER_COOKIE_NAME, isValidOwnerId } from '@/lib/owner-cookie';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const UUID_ANY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_ANY.test(s);
}

function getService() {
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteParams) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: '잘못된 id입니다.' }, { status: 400 });
  }

  const jar = await cookies();
  const ownerId = jar.get(OWNER_COOKIE_NAME)?.value;
  if (!ownerId || !isValidOwnerId(ownerId)) {
    return NextResponse.json({ error: '브라우저 쿠키를 허용해 주세요.' }, { status: 401 });
  }

  const supabase = getService();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          '서버에 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_SERVICE_KEY)가 없습니다. .env.local에 넣고 개발 서버를 다시 시작하세요.',
      },
      { status: 503 },
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from('todos')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row || row.user_id !== ownerId) {
    return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const patch: { title?: string; is_completed?: boolean } = {};
  if (typeof body === 'object' && body !== null) {
    const o = body as Record<string, unknown>;
    if ('title' in o) {
      const t = String(o.title).trim();
      if (!t) {
        return NextResponse.json({ error: '제목이 비어 있습니다.' }, { status: 400 });
      }
      patch.title = t;
    }
    if ('is_completed' in o) {
      patch.is_completed = Boolean(o.is_completed);
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('todos')
    .update(patch)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, context: RouteParams) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: '잘못된 id입니다.' }, { status: 400 });
  }

  const jar = await cookies();
  const ownerId = jar.get(OWNER_COOKIE_NAME)?.value;
  if (!ownerId || !isValidOwnerId(ownerId)) {
    return NextResponse.json({ error: '브라우저 쿠키를 허용해 주세요.' }, { status: 401 });
  }

  const supabase = getService();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          '서버에 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_SERVICE_KEY)가 없습니다. .env.local에 넣고 개발 서버를 다시 시작하세요.',
      },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
