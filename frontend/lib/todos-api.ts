/** 브라우저에서 /api/todos 호출 (게스트 쿠키 기반, 로그인 없음) */

export type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  date: string;
  created_at: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const b: unknown = await res.json();
    if (b && typeof b === 'object' && 'error' in b && typeof (b as { error: unknown }).error === 'string') {
      return (b as { error: string }).error;
    }
  } catch {
    /* noop */
  }
  return '요청에 실패했습니다.';
}

export async function apiFetchTodosByDate(date: string): Promise<TodoRow[]> {
  const res = await fetch(`/api/todos?date=${encodeURIComponent(date)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const body = (await res.json()) as { data?: TodoRow[] };
  return body.data ?? [];
}

export async function apiFetchTodosRange(
  from: string,
  to: string,
  options?: { incompleteOnly?: boolean },
): Promise<TodoRow[]> {
  const q = new URLSearchParams({ from, to });
  if (options?.incompleteOnly) q.set('incomplete_only', '1');
  const res = await fetch(`/api/todos?${q}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const body = (await res.json()) as { data?: TodoRow[] };
  return body.data ?? [];
}

export async function apiCreateTodo(title: string, date: string): Promise<TodoRow> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, date }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const body = (await res.json()) as { data: TodoRow };
  return body.data;
}

export async function apiPatchTodo(
  id: string,
  patch: { title?: string; is_completed?: boolean },
): Promise<TodoRow> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const body = (await res.json()) as { data: TodoRow };
  return body.data;
}

export async function apiDeleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
