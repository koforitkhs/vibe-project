'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-[7.25rem] rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
        aria-hidden
      />
    );
  }

  const modes = [
    { id: 'light' as const, label: '라이트' },
    { id: 'dark' as const, label: '다크' },
    { id: 'system' as const, label: '시스템' },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/80 p-0.5 dark:border-neutral-700 dark:bg-neutral-900/80"
      role="group"
      aria-label="화면 테마"
    >
      {modes.map(({ id, label }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
              active
                ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
                : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
            aria-pressed={active}
            title={
              id === 'system'
                ? `시스템 설정 따름 (${resolvedTheme === 'dark' ? '다크' : '라이트'}로 표시 중)`
                : label
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
