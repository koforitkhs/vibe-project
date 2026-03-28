'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();

  function handleLogout() {
    void logout();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          할일 관리
        </Link>

        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
