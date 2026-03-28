/** Map common Supabase Auth messages to Korean for the UI. */
export function formatAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (m.includes('user already registered')) {
    return '이미 가입된 이메일입니다.';
  }
  if (m.includes('password') && m.includes('6')) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }
  if (m.includes('email')) {
    return message;
  }

  return message;
}
