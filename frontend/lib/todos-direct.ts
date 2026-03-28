/**
 * 서비스 롤 키가 없을 때: 브라우저 Supabase + 익명 로그인(RLS, user_id 기본값 auth.uid()).
 * Supabase 대시보드에서 Anonymous sign-in이 켜져 있어야 합니다.
 */
'use client';

import { createClient } from '@/lib/supabase/client';
import type { TodoRow } from '@/lib/todos-api';

let anonSessionPromise: Promise<void> | null = null;

async function ensureAnonSession(): Promise<void> {
  if (!anonSessionPromise) {
    anonSessionPromise = (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        throw new Error(
          '익명 로그인에 실패했습니다. Supabase에서 Anonymous를 켜거나 SUPABASE_SERVICE_ROLE_KEY를 서버에 넣어 주세요.',
        );
      }
    })();
  }
  await anonSessionPromise;
}

export async function directFetchTodosByDate(date: string): Promise<TodoRow[]> {
  await ensureAnonSession();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TodoRow[];
}

export async function directFetchTodosRange(
  from: string,
  to: string,
  options?: { incompleteOnly?: boolean },
): Promise<TodoRow[]> {
  await ensureAnonSession();
  const supabase = createClient();
  let q = supabase
    .from('todos')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  if (options?.incompleteOnly) q = q.eq('is_completed', false);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TodoRow[];
}

export async function directCreateTodo(title: string, date: string): Promise<TodoRow> {
  await ensureAnonSession();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('todos')
    .insert({ title, date })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TodoRow;
}

export async function directPatchTodo(
  id: string,
  patch: { title?: string; is_completed?: boolean },
): Promise<TodoRow> {
  await ensureAnonSession();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('todos')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TodoRow;
}

export async function directDeleteTodo(id: string): Promise<void> {
  await ensureAnonSession();
  const supabase = createClient();
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
