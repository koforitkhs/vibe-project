# API 명세서

이 문서는 할일 관리 서비스에서 **프론트엔드와 백엔드(Supabase)가 주고받는 데이터**를 정리한 것입니다.

이 프로젝트는 별도의 REST API 서버 없이 **Supabase Client**를 통해 인증과 데이터베이스를 직접 호출합니다.

---

## 목차

1. [공통 타입](#1-공통-타입)
2. [인증 (Auth)](#2-인증-auth)
3. [할일 조회](#3-할일-조회)
4. [할일 생성](#4-할일-생성)
5. [할일 수정](#5-할일-수정)
6. [할일 삭제](#6-할일-삭제)
7. [완료 토글](#7-완료-토글)
8. [달성률 계산](#8-달성률-계산)
9. [에러 처리](#9-에러-처리)

---

## 1. 공통 타입

### `Todo` 인터페이스

```typescript
interface Todo {
  id: string;           // uuid — 자동 생성
  user_id: string;      // uuid — 로그인한 사용자 ID
  title: string;        // 할일 내용
  is_completed: boolean; // 완료 여부 (기본값 false)
  date: string;         // 'YYYY-MM-DD' 형식
  created_at: string;   // ISO 8601 타임스탬프
}
```

---

## 2. 인증 (Auth)

### 2-1. 회원가입

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'mypassword123',
});
```

**응답 (성공)**

```json
{
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "user@example.com",
      "created_at": "2026-03-27T12:00:00.000Z"
    },
    "session": {
      "access_token": "eyJhbGci...",
      "refresh_token": "v1.xxxxx..."
    }
  },
  "error": null
}
```

### 2-2. 로그인

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'mypassword123',
});
```

**응답 (성공)** — 회원가입과 같은 구조 (`user` + `session`)

**응답 (실패)** — 비밀번호 틀림 등

```json
{
  "data": { "user": null, "session": null },
  "error": {
    "message": "Invalid login credentials",
    "status": 400
  }
}
```

### 2-3. 로그아웃

```typescript
const { error } = await supabase.auth.signOut();
```

**응답 (성공)** — `error`가 `null`이면 성공. 세션이 제거됩니다.

### 2-4. 현재 세션 확인

```typescript
const { data, error } = await supabase.auth.getSession();
```

**응답 (로그인 상태)**

```json
{
  "data": {
    "session": {
      "access_token": "eyJhbGci...",
      "user": {
        "id": "a1b2c3d4-...",
        "email": "user@example.com"
      }
    }
  },
  "error": null
}
```

**응답 (비로그인 상태)** — `data.session`이 `null`

---

## 3. 할일 조회

특정 날짜의 할일 목록을 가져옵니다.

### 요청

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('date', '2026-03-27')
  .order('created_at', { ascending: true });
```

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `date` | string | 조회할 날짜 (`YYYY-MM-DD`) |

### 응답 (성공)

```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "user_id": "a1b2c3d4-...",
      "title": "TypeScript 공부하기",
      "is_completed": false,
      "date": "2026-03-27",
      "created_at": "2026-03-27T09:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "a1b2c3d4-...",
      "title": "장보기",
      "is_completed": true,
      "date": "2026-03-27",
      "created_at": "2026-03-27T09:05:00.000Z"
    }
  ],
  "error": null
}
```

### 응답 (할일 없음)

```json
{
  "data": [],
  "error": null
}
```

---

## 4. 할일 생성

새 할일을 추가합니다.

### 요청

```typescript
const { data, error } = await supabase
  .from('todos')
  .insert({
    title: '운동 30분 하기',
    date: '2026-03-27',
  })
  .select()
  .single();
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | O | 할일 내용 |
| `date` | string | O | 날짜 (`YYYY-MM-DD`) |

> `user_id`는 현재 로그인한 사용자의 ID를 넣어줍니다.
> DB 기본값 설정 또는 트리거로 처리합니다.

### 응답 (성공)

```json
{
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "user_id": "a1b2c3d4-...",
    "title": "운동 30분 하기",
    "is_completed": false,
    "date": "2026-03-27",
    "created_at": "2026-03-27T10:30:00.000Z"
  },
  "error": null
}
```

---

## 5. 할일 수정

할일의 텍스트 내용을 변경합니다.

### 요청

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({ title: '운동 1시간 하기' })
  .eq('id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')
  .select()
  .single();
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | string | 변경할 할일 내용 |
| `id` | string (uuid) | 수정 대상 할일 ID |

### 응답 (성공)

```json
{
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "user_id": "a1b2c3d4-...",
    "title": "운동 1시간 하기",
    "is_completed": false,
    "date": "2026-03-27",
    "created_at": "2026-03-27T10:30:00.000Z"
  },
  "error": null
}
```

---

## 6. 할일 삭제

할일 항목을 제거합니다.

### 요청

```typescript
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (uuid) | 삭제 대상 할일 ID |

### 응답 (성공)

```json
{
  "error": null
}
```

---

## 7. 완료 토글

할일의 완료 상태를 변경합니다. (체크 / 체크 해제)

### 요청

```typescript
const { data, error } = await supabase
  .from('todos')
  .update({ is_completed: true })   // false → true, true → false
  .eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
  .select()
  .single();
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `is_completed` | boolean | `true`면 완료, `false`면 미완료 |
| `id` | string (uuid) | 대상 할일 ID |

### 응답 (성공)

```json
{
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "a1b2c3d4-...",
    "title": "TypeScript 공부하기",
    "is_completed": true,
    "date": "2026-03-27",
    "created_at": "2026-03-27T09:00:00.000Z"
  },
  "error": null
}
```

---

## 8. 달성률 계산

달성률은 별도 API 호출 없이 **프론트엔드에서 계산**합니다.

### 계산 방법

```typescript
function getCompletionRate(todos: Todo[]): number {
  if (todos.length === 0) return 0;

  const completed = todos.filter((t) => t.is_completed).length;
  return Math.round((completed / todos.length) * 100);
}
```

### 예시

| 전체 | 완료 | 달성률 |
|------|------|--------|
| 5개 | 3개 | 60% |
| 3개 | 3개 | 100% |
| 0개 | 0개 | 0% |

---

## 9. 에러 처리

모든 Supabase 호출의 응답에는 `error` 필드가 포함됩니다.

### 에러 응답 구조

```typescript
interface SupabaseError {
  message: string;  // 에러 메시지
  details: string;  // 상세 내용
  hint: string;     // 힌트
  code: string;     // PostgreSQL 에러 코드
}
```

### 주요 에러 상황

| 상황 | `error.message` 예시 |
|------|---------------------|
| 비밀번호 틀림 | `"Invalid login credentials"` |
| 이미 가입된 이메일 | `"User already registered"` |
| 로그인 안 된 상태에서 DB 요청 | `"JWT expired"` 또는 빈 결과 반환 |
| 존재하지 않는 할일 수정/삭제 | `error`는 `null`이지만 `data`가 빈 배열 |

### 프론트엔드 에러 처리 패턴

```typescript
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('date', today);

if (error) {
  console.error('할일 조회 실패:', error.message);
  // 사용자에게 에러 메시지 표시
  return;
}

// data를 사용해 화면 렌더링
```
