'use client';

import TodoItem from '@/components/TodoItem';
import {
  apiCreateTodo,
  apiDeleteTodo,
  apiFetchTodosByDate,
  apiFetchTodosRange,
  apiPatchTodo,
  type TodoRow,
} from '@/lib/todos-api';
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

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [newTitle, setNewTitle] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [completionStreak, setCompletionStreak] = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);
  const [incompleteBacklog, setIncompleteBacklog] = useState<Todo[]>([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogOpen, setBacklogOpen] = useState(true);

  const loadStreak = useCallback(async () => {
    const end = getToday();
    const start = shiftDate(end, -120);
    try {
      const rows = await apiFetchTodosRange(start, end);
      const map = new Map<string, boolean[]>();
      for (const row of rows) {
        const d = String(row.date).slice(0, 10);
        const arr = map.get(d) ?? [];
        arr.push(row.is_completed);
        map.set(d, arr);
      }
      setCompletionStreak(computeStreakFromMap(map, end));
    } catch {
      setCompletionStreak(0);
    }
  }, []);

  const loadIncompleteBacklog = useCallback(async () => {
    setBacklogLoading(true);
    const today = getToday();
    const end = shiftDate(today, 366);
    const start = shiftDate(today, -730);
    try {
      const rows = await apiFetchTodosRange(start, end, { incompleteOnly: true });
      setIncompleteBacklog(rows.map(normalizeTodoRow));
    } catch {
      setIncompleteBacklog([]);
    }
    setBacklogLoading(false);
  }, []);

  const loadTodos = useCallback(async (date: string) => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await apiFetchTodosByDate(date);
      setTodos(rows.map(normalizeTodoRow));
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : '할일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      setTodos([]);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    void loadTodos(selectedDate);
  }, [selectedDate, loadTodos]);

  useEffect(() => {
    void loadStreak();
  }, [loadStreak]);

  useEffect(() => {
    void loadIncompleteBacklog();
  }, [loadIncompleteBacklog]);

  const filteredTodos = useMemo(() => {
    if (todoFilter === 'active') return todos.filter((t) => !t.is_completed);
    if (todoFilter === 'completed') return todos.filter((t) => t.is_completed);
    return todos;
  }, [todos, todoFilter]);

  /** 보고 있는 날짜 목록과 겹치지 않게, 다른 날짜에 남은 미완료만 모아서 표시 */
  const backlogForPanel = useMemo(
    () => incompleteBacklog.filter((t) => t.date !== selectedDate),
    [incompleteBacklog, selectedDate],
  );

  const completionRate = getCompletionRate(todos);
  const completedCount = todos.filter((t) => t.is_completed).length;
  const isToday = selectedDate === getToday();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setActionError(null);
    let row: TodoRow;
    try {
      row = await apiCreateTodo(trimmed, selectedDate);
    } catch {
      setActionError('할일을 추가하지 못했습니다.');
      return;
    }

    setTodos((prev) => [...prev, normalizeTodoRow(row)]);
    setNewTitle('');
    void loadStreak();
    void loadIncompleteBacklog();
  }

  async function handleToggle(id: string) {
    const todo =
      todos.find((t) => t.id === id) ??
      incompleteBacklog.find((t) => t.id === id);
    if (!todo) return;

    const today = getToday();
    const willCompleteThis = !todo.is_completed;

    setActionError(null);
    const next = !todo.is_completed;
    let updatedRow: TodoRow;
    try {
      updatedRow = await apiPatchTodo(id, { is_completed: next });
    } catch {
      setActionError('완료 상태를 변경하지 못했습니다.');
      return;
    }

    const updated = normalizeTodoRow(updatedRow);

    if (updated.date === selectedDate) {
      setTodos((prev) => {
        if (!prev.some((t) => t.id === id)) return prev;
        return prev.map((t) => (t.id === id ? updated : t));
      });
    }

    if (willCompleteThis && updated.date === today && updated.is_completed) {
      try {
        const todayRows = await apiFetchTodosByDate(today);
        const allTodayDone =
          todayRows.length > 0 && todayRows.every((r) => r.is_completed);
        if (allTodayDone) {
          setStreakFlash(true);
          window.setTimeout(() => setStreakFlash(false), 2800);
        }
      } catch {
        /* noop */
      }
    }

    void loadStreak();
    void loadIncompleteBacklog();
  }

  async function handleDelete(id: string) {
    const todo =
      todos.find((t) => t.id === id) ??
      incompleteBacklog.find((t) => t.id === id);

    setActionError(null);
    try {
      await apiDeleteTodo(id);
    } catch {
      setActionError('할일을 삭제하지 못했습니다.');
      return;
    }

    if (todo?.date === selectedDate) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
    void loadStreak();
    void loadIncompleteBacklog();
  }

  async function handleUpdate(id: string, title: string) {
    const todo =
      todos.find((t) => t.id === id) ??
      incompleteBacklog.find((t) => t.id === id);

    setActionError(null);
    let updatedRow: TodoRow;
    try {
      updatedRow = await apiPatchTodo(id, { title });
    } catch {
      setActionError('할일을 수정하지 못했습니다.');
      return;
    }

    const updated = normalizeTodoRow(updatedRow);
    if (todo?.date === selectedDate) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t)),
      );
    }
    void loadIncompleteBacklog();
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
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <div
        className={`relative mb-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white px-4 py-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:px-6 ${
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
            className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/50 dark:hover:text-sky-400"
            aria-label="하루 전"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-3xl">
              {isToday ? '오늘의 할일' : '할일 기록'}
            </h1>
            <p className="mt-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 sm:text-base">
              {formatDate(selectedDate)}
            </p>
            {!isToday && (
              <button
                type="button"
                onClick={goToToday}
                className="mt-2 text-xs font-semibold text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300 sm:text-sm"
              >
                오늘로 돌아가기
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goToNext}
            className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/50 dark:hover:text-sky-400"
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
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {listError ?? actionError}
        </div>
      )}

      <div className="mb-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
        <div className="flex items-center justify-between text-sm sm:text-base">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">달성률</span>
          <span className="text-lg font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            {completionRate}%
            <span className="ml-1.5 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              ({completedCount}/{todos.length})
            </span>
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-500 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <section
        className="mb-8 overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white shadow-sm dark:border-amber-800/50 dark:from-amber-950/50 dark:to-neutral-900"
        aria-label="다른 날짜 미완료 할일"
      >
        <button
          type="button"
          onClick={() => setBacklogOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-950/30 sm:px-6"
          aria-expanded={backlogOpen}
        >
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 sm:text-lg">
              완료하지 못한 할일
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
              다른 날짜에 남겨 둔 일만 모아서 보여요. 이 날짜의 미완료는 위 목록에서 볼 수 있어요.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-sm font-bold tabular-nums text-white shadow-sm dark:bg-amber-600">
            {backlogForPanel.length}
          </span>
        </button>

        {backlogOpen && (
          <div className="border-t border-amber-200/60 px-5 pb-5 pt-3 dark:border-amber-800/40 sm:px-6">
            {incompleteBacklog.length > backlogForPanel.length && (
              <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                이 날짜 미완료{' '}
                {incompleteBacklog.length - backlogForPanel.length}건은 위 할일 목록에서 확인하세요.
              </p>
            )}
            {backlogLoading ? (
              <p className="py-8 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">
                불러오는 중…
              </p>
            ) : backlogForPanel.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                다른 날짜에 밀린 미완료 할일이 없습니다.
              </p>
            ) : (
              <ul className="space-y-3">
                {backlogForPanel.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    dateLabel={formatDateShort(todo.date)}
                    onToggle={(tid) => {
                      void handleToggle(tid);
                    }}
                    onDelete={(tid) => {
                      void handleDelete(tid);
                    }}
                    onUpdate={(tid, title) => {
                      void handleUpdate(tid, title);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
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
                ? 'bg-neutral-950 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {listLoading ? (
        <p className="py-16 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">
          불러오는 중…
        </p>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-100 bg-sky-50/30 py-20 dark:border-sky-900/50 dark:bg-sky-950/20">
          <svg
            className="h-14 w-14 text-sky-300 dark:text-sky-700"
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
          <p className="mt-5 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            할일이 없습니다
          </p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            새로운 할일을 추가해 보세요!
          </p>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/80 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
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
        className="mt-8 flex gap-3 rounded-3xl border border-neutral-200 bg-white p-3 pl-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-4 sm:pl-6"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새로운 할일을 입력하세요"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-500 sm:text-base"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="shrink-0 rounded-2xl bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:ring-sky-500 dark:focus-visible:ring-offset-neutral-950"
        >
          추가
        </button>
      </form>
    </div>
  );
}
