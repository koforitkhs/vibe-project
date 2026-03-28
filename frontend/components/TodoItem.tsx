'use client';

import { Todo } from '@/types/todo';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
  /** 예: 모아보기에서 해당 할일이 속한 날짜 표시 */
  dateLabel?: string;
}

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  dateLabel,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    setEditText(todo.title);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.title) {
      onUpdate(todo.id, trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditText(todo.title);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  return (
    <li className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 sm:px-5">
      <input
        type="checkbox"
        checked={todo.is_completed}
        onChange={() => onToggle(todo.id)}
        className="h-5 w-5 shrink-0 cursor-pointer rounded border-neutral-300 text-sky-500 accent-sky-500 dark:border-neutral-600 dark:accent-sky-400"
      />

      {isEditing ? (
        <div className="min-w-0 flex-1">
          {dateLabel ? (
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90 sm:text-xs">
              {dateLabel}
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25 dark:border-sky-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/25"
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          {dateLabel ? (
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90 sm:text-xs">
              {dateLabel}
            </p>
          ) : null}
          <span
            onDoubleClick={startEditing}
            className={`block cursor-pointer text-sm leading-relaxed select-none sm:text-[15px] ${
              todo.is_completed
                ? 'text-neutral-400 line-through dark:text-neutral-500'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {todo.title}
          </span>
        </div>
      )}

      {!isEditing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={startEditing}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/50 dark:hover:text-sky-400"
            aria-label="수정"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            aria-label="삭제"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
