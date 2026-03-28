'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const { isLoggedIn, initializing, login, signUp } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initializing && isLoggedIn) {
      router.replace('/todos');
    }
  }, [initializing, isLoggedIn, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setInfo('');
    const result =
      mode === 'login'
        ? await login(email, password)
        : await signUp(email, password);

    if (result.success) {
      if ('pendingEmailVerification' in result && result.pendingEmailVerification) {
        setInfo(
          '가입 확인 이메일을 발송했습니다. 메일함을 확인한 뒤 로그인해 주세요.',
        );
        setLoading(false);
        return;
      }
      router.replace('/todos');
    } else {
      setError(result.error ?? '알 수 없는 오류가 발생했습니다.');
    }
    setLoading(false);
  }

  function switchMode() {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError('');
    setInfo('');
  }

  const isLogin = mode === 'login';

  if (initializing) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-sm text-gray-500">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isLogin ? '로그인' : '회원가입'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin
              ? '계정에 로그인하여 할일을 관리하세요.'
              : '새 계정을 만들어 시작하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '비밀번호 입력' : '6자 이상 입력'}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none transition-colors"
            />
          </div>

          {info && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {info}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? '처리 중…'
              : isLogin
                ? '로그인'
                : '회원가입'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-gray-900 hover:underline"
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
}
