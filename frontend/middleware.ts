import { isValidOwnerId, OWNER_COOKIE_NAME } from '@/lib/owner-cookie';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const res = NextResponse.next({ request });
  const existing = request.cookies.get(OWNER_COOKIE_NAME)?.value;
  if (!existing || !isValidOwnerId(existing)) {
    res.cookies.set(OWNER_COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 400,
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
