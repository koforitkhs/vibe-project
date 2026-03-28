'use client';

import TodoItem from '@/components/TodoItem';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/authContext';
import { Todo } from '@/types/todo';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
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
  return d.toISOString().split('T')[0];
}

function getCompletionRate(todos: Todo[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter((t) => t.is_completed).length;
  return Math.round((completed / todos.length) * 100);
}

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  date: string;
  created_at: string;
};

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
  const { isLoggedIn, initializing } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [newTitle, setNewTitle] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    if (!initializing && !isLoggedIn) {
      router.replace('/login');
    }
  }, [initializing, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadTodos(selectedDate);
  }, [isLoggedIn, selectedDate, loadTodos]);

  if (initializing || !isLoggedIn) {
    return null;
  }

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
  }

  async function handleToggle(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

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
  }

  async function handleDelete(id: string) {
    setActionError(null);
    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      setActionError('할일을 삭제하지 못했습니다.');
      return;
    }

    setTodos((prev) => prev.filter((t) => t.id !== id));
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrev}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="이전 날짜"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isToday ? '오늘의 할일' : '할일 기록'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(selectedDate)}
          </p>
          {!isToday && (
            <button
              type="button"
              onClick={goToToday}
              className="mt-1 text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600"
            >
              오늘로 돌아가기
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={goToNext}
          disabled={isToday}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="다음 날짜"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {(listError || actionError) && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError ?? actionError}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">달성률</span>
          <span className="font-bold text-gray-900">
            {completionRate}%
            <span className="ml-1 font-normal text-gray-400">
              ({completedCount}/{todos.length})
            </span>
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-300 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {listLoading ? (
        <p className="py-12 text-center text-sm text-gray-500">불러오는 중…</p>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16">
          <svg
            className="h-12 w-12 text-gray-300"
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
          <p className="mt-4 text-base font-medium text-gray-900">
            할일이 없습니다
          </p>
          <p className="mt-1 text-sm text-gray-500">
            새로운 할일을 추가해 보세요!
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
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

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새로운 할일을 입력하세요"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="shrink-0 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          추가
        </button>
      </form>
    </div>
  );
}
