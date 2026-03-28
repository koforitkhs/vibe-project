import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link
          href="/todos"
          className="text-lg font-bold tracking-tight text-neutral-950 transition-colors hover:text-sky-600 dark:text-neutral-100 dark:hover:text-sky-400"
        >
          할일 관리
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <ThemeToggle />
          <Link
            href="/todos"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            할일 목록
          </Link>
        </nav>
      </div>
    </header>
  );
}
