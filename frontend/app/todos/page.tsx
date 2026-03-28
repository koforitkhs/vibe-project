'use client';

import TodoItem from '@/components/TodoItem';
import { createClient } from '@/lib/supabase/client';
import { Todo } from '@/types/todo';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

/** 로컬 달력 기준 오늘 (UTC ISO와 하루 어긋남 방지) */
function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getCompletionRate(todos: Todo[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter((t) => t.is_completed).length;
  return Math.round((completed / todos.length) * 100);
}

/** 할 일이 있는 날만 세고, 그날 전부 완료일 때만 +1. 할 일 없는 날은 건너뜀(연속 유지). */
function computeStreakFromMap(
  byDate: Map<string, boolean[]>,
  endDate: string,
): number {
  let streak = 0;
  let d = endDate;
  for (let i = 0; i < 400; i++) {
    const list = byDate.get(d);
    if (!list?.length) {
      d = shiftDate(d, -1);
      continue;
    }
    if (!list.every(Boolean)) break;
    streak++;
    d = shiftDate(d, -1);
  }
  return streak;
}

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  date: string;
  created_at: string;
};

type TodoFilter = 'all' | 'active' | 'completed';

function normalizeTodoRow(row: TodoRow): Todo {
  const date =
    typeof row.date === 'string'
      ? row.date.slice(0, 10)
      : String(row.date).slice(0, 10);
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    is_completed: row.is_completed,
    date,
    created_at: row.created_at,
  };
}

export default function TodosPage() {
  const supabase = useMemo(() => createClient(), []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [newTitle, setNewTitle] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [completionStreak, setCompletionStreak] = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);

  const loadStreak = useCallback(async () => {
    const end = getToday();
    const start = shiftDate(end, -120);
    const { data, error } = await supabase
      .from('todos')
      .select('date, is_completed')
      .gte('date', start)
      .lte('date', end);

    if (error || !data) {
      setCompletionStreak(0);
      return;
    }

    const map = new Map<string, boolean[]>();
    for (const row of data as { date: string; is_completed: boolean }[]) {
      const d = String(row.date).slice(0, 10);
      const arr = map.get(d) ?? [];
      arr.push(row.is_completed);
      map.set(d, arr);
    }
    setCompletionStreak(computeStreakFromMap(map, end));
  }, [supabase]);

  const loadTodos = useCallback(
    async (date: string) => {
      setListLoading(true);
      setListError(null);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) {
        setListError('할일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setTodos([]);
        setListLoading(false);
        return;
      }

      const rows = (data ?? []) as TodoRow[];
      setTodos(rows.map(normalizeTodoRow));
      setListLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          setAuthError(
            '세션을 시작할 수 없습니다. Supabase 대시보드에서 익명 로그인(Anonymous sign-in)을 켜 주세요.',
          );
        }
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!authReady || authError) return;
    void loadTodos(selectedDate);
  }, [authReady, authError, selectedDate, loadTodos]);

  useEffect(() => {
    if (!authReady || authError) return;
    void loadStreak();
  }, [authReady, authError, loadStreak]);

  const filteredTodos = useMemo(() => {
    if (todoFilter === 'active') return todos.filter((t) => !t.is_completed);
    if (todoFilter === 'completed') return todos.filter((t) => t.is_completed);
    return todos;
  }, [todos, todoFilter]);

  const completionRate = getCompletionRate(todos);
  const completedCount = todos.filter((t) => t.is_completed).length;
  const isToday = selectedDate === getToday();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setActionError(null);
    const { data, error } = await supabase
      .from('todos')
      .insert({ title: trimmed, date: selectedDate })
      .select()
      .single();

    if (error) {
      setActionError('할일을 추가하지 못했습니다.');
      return;
    }

    setTodos((prev) => [...prev, normalizeTodoRow(data as TodoRow)]);
    setNewTitle('');
    void loadStreak();
  }

  async function handleToggle(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const today = getToday();
    const hadIncomplete = todos.some((t) => !t.is_completed);
    const willCompleteThis = !todo.is_completed;

    setActionError(null);
    const next = !todo.is_completed;
    const { data, error } = await supabase
      .from('todos')
      .update({ is_completed: next })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      setActionError('완료 상태를 변경하지 못했습니다.');
      return;
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? normalizeTodoRow(data as TodoRow) : t)),
    );

    const nextTodos = todos.map((t) =>
      t.id === id ? normalizeTodoRow(data as TodoRow) : t,
    );
    const allDone = nextTodos.length > 0 && nextTodos.every((t) => t.is_completed);
    if (
      selectedDate === today &&
      willCompleteThis &&
      hadIncomplete &&
      allDone
    ) {
      setStreakFlash(true);
      window.setTimeout(() => setStreakFlash(false), 2800);
    }
    void loadStreak();
  }

  async function handleDelete(id: string) {
    setActionError(null);
    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      setActionError('할일을 삭제하지 못했습니다.');
      return;
    }

    setTodos((prev) => prev.filter((t) => t.id !== id));
    void loadStreak();
  }

  async function handleUpdate(id: string, title: string) {
    setActionError(null);
    const { data, error } = await supabase
      .from('todos')
      .update({ title })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      setActionError('할일을 수정하지 못했습니다.');
      return;
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? normalizeTodoRow(data as TodoRow) : t)),
    );
  }

  function goToPrev() {
    setSelectedDate((d) => shiftDate(d, -1));
  }

  function goToNext() {
    setSelectedDate((d) => shiftDate(d, 1));
  }

  function goToToday() {
    setSelectedDate(getToday());
  }

  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-100 border-t-sky-500" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {authError}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <div
        className={`relative mb-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white px-4 py-5 shadow-sm sm:px-6 ${
          streakFlash ? 'flame-glow ring-2 ring-orange-400/60' : ''
        }`}
      >
        {streakFlash && (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-orange-500/15 via-transparent to-red-500/10"
            aria-hidden
          />
        )}
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrev}
            className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
            aria-label="하루 전"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
              {isToday ? '오늘의 할일' : '할일 기록'}
            </h1>
            <p className="mt-2 text-sm font-medium text-neutral-500 sm:text-base">
              {formatDate(selectedDate)}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={goToToday}
                className="mt-2 text-xs font-semibold text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline sm:text-sm"
              >
                오늘로 돌아가기
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goToNext}
            className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
            aria-label="하루 후"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {completionStreak > 0 && (
          <div className="relative mt-5 flex justify-center">
            <div
              className={`flame-pulse inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/35 ${
                streakFlash ? 'scale-105 ring-2 ring-amber-200' : ''
              } transition-transform duration-300`}
            >
              <span className="text-lg leading-none" aria-hidden>
                🔥
              </span>
              <span>
                연속 {completionStreak}일 전부 완료
              </span>
            </div>
          </div>
        )}
      </div>

      {(listError || actionError) && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {listError ?? actionError}
        </div>
      )}

      <div className="mb-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between text-sm sm:text-base">
          <span className="font-semibold text-neutral-800">달성률</span>
          <span className="text-lg font-bold tracking-tight text-neutral-950">
            {completionRate}%
            <span className="ml-1.5 text-sm font-medium text-neutral-400">
              ({completedCount}/{todos.length})
            </span>
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-500 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          보기
        </span>
        {(
          [
            { key: 'all' as const, label: '전체' },
            { key: 'active' as const, label: '미완료' },
            { key: 'completed' as const, label: '완료' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTodoFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              todoFilter === key
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {listLoading ? (
        <p className="py-16 text-center text-sm font-medium text-neutral-500">불러오는 중…</p>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-100 bg-sky-50/30 py-20">
          <svg
            className="h-14 w-14 text-sky-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
            />
          </svg>
          <p className="mt-5 text-lg font-semibold tracking-tight text-neutral-900">
            할일이 없습니다
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            새로운 할일을 추가해 보세요!
          </p>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/80 py-16 text-center">
          <p className="text-sm font-medium text-neutral-600">
            {todoFilter === 'completed'
              ? '완료된 할일이 없습니다.'
              : '미완료 할일이 없습니다.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={(id) => {
                void handleToggle(id);
              }}
              onDelete={(id) => {
                void handleDelete(id);
              }}
              onUpdate={(id, title) => {
                void handleUpdate(id, title);
              }}
            />
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-8 flex gap-3 rounded-3xl border border-neutral-200 bg-white p-3 pl-5 shadow-sm sm:p-4 sm:pl-6"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새로운 할일을 입력하세요"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 sm:text-base"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="shrink-0 rounded-2xl bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
        >
          추가
        </button>
      </form>
    </div>
  );
}
