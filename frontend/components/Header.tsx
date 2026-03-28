import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/todos"
          className="text-lg font-bold tracking-tight text-neutral-950 transition-colors hover:text-sky-600"
        >
          할일 관리
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/todos"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
          >
            할일 목록
          </Link>
        </nav>
      </div>
    </header>
  );
}
