# Next.js / TypeScript 코드 품질·아키텍처 점검 리포트

- **대상:** vive-project `frontend` 중심
- **점검 항목:** 코드 중복, 함수·컴포넌트 크기(SRP·50줄 기준), 타입 정의, 네이밍, 불필요한 의존성·props
- **작성일:** 2026-03-28

## 결과 요약

| 일련번호 | 우선순위 | 파일 | 위치 | 문제 | 권고사항 |
|---|---|---|---|---|---|
| 1 | High | `frontend/app/todos/page.tsx` | `TodosPage` 전체(약 540줄+) | 날짜·스트릭 유틸, 부트스트랩, 여러 `useEffect`/`useCallback`, CRUD 핸들러, 헤더·백로그·필터·폼·목록 JSX가 한 컴포넌트에 몰려 **단일 책임 위반**이며 50줄 기준을 크게 초과함. | `useTodosData` 등 커스텀 훅, 날짜/스트릭 `lib`, `TodosHeader`·`BacklogSection`·`TodoListPanel` 등으로 분리해 읽기·테스트·재사용성을 높일 것. |
| 2 | High | `frontend/app/todos/page.tsx` | `loadStreak`·`loadIncompleteBacklog`·`loadTodos`·`handleAdd`·`handleToggle` 등 | `todosMode === 'service' ? api* : direct*` 패턴이 **동일 구조로 반복**되어 변경 시 누락 위험이 큼. | 모드별 구현을 한 곳(예: `createTodosClient(mode)` 또는 `useTodosRepository`)으로 모아 분기를 한 번만 두기. |
| 3 | High | `frontend/app/api/todos/route.ts`, `frontend/app/api/todos/[id]/route.ts` | 각 파일 상단 `getService`·쿠키·`ownerId` 검증·503 메시지 | **동일한 서비스 클라이언트 확보·인증 전제 검사**가 두 라우트에 복제됨. | `assertOwnerCookie()` / `getTodosSupabase()` 같은 공용 헬퍼로 추출해 한곳에서 유지보수. |
| 4 | Medium | `frontend/app/todos/page.tsx` | `useEffect` 내 `fetch('/api/bootstrap')` 후 `(await r.json()) as { mode?: string }` | 응답이 **느슨한 객체 단언**이라 잘못된 JSON/필드도 런타임까지 넘어갈 수 있음. | `mode: 'service' | 'anon'` 등 **유니온 타입**과 타입 가드(또는 스키마 검증)로 좁히기. |
| 5 | Medium | `frontend/lib/todos-api.ts`, `frontend/types/todo.ts` | `TodoRow` vs `Todo` | 필드 구조가 사실상 동일한 **도메인 타입 이중 정의**로, 스키마 변경 시 불일치 위험. | 한 타입을 기준으로 `export type TodoRow = Todo` 식으로 통합하거나 `types/todo`에서만 정의 후 재수출. |
| 6 | Medium | `frontend/types/todo.ts` | `TodoCreateInput`, `TodoUpdateInput` | 프로젝트 내 **다른 파일에서 미사용**(데드 타입). | Route Handler 본문·클라이언트 페이로드에 연결하거나, 당분간 쓰지 않으면 제거해 혼란 방지. |
| 7 | Medium | `frontend/lib/supabase/server.ts` | `createClient` 전체 | **어디에서도 import되지 않음** — 번들에는 안 들어가도 유지보수 시 “쓰는 줄 알았던 코드”가 됨. | 서버 컴포넌트+anon 연동 계획이 있으면 연결하고, 없으면 삭제하거나 README에 “예비”로 명시. |
| 8 | Low | `frontend/components/TodoItem.tsx` | 편집/비편집 분기 각각의 `dateLabel` 블록 | **동일 JSX가 두 갈래**에 복제되어 소규모 중복. | `DateLabelRow` 같은 1줄짜리 컴포넌트로 묶기. |
| 9 | Low | `frontend/app/todos/page.tsx` | 메인·백로그 `TodoItem` 사용부 | `onToggle`/`onDelete`/`onUpdate`를 **목록마다 동일 래퍼**로 전달(실질적 드릴링은 1단계). | `handlers={{ onToggle, onDelete, onUpdate }}` 한 객체 prop으로 정리하면 시그니처 변경 시 한 곳만 수정. |

## 표에 넣지 않은 양호·참고

- **`any`:** `frontend` TS/TSX에서 `any` 사용은 검색되지 않음.
- **`@supabase/*`, `next-themes`:** 실제 import·사용과 대응됨; 명백한 미사용 패키지는 없음.
- **`lib/owner-cookie.ts`의 `isIsoDateString` vs `[id]/route`의 UUID 검사:** 역할이 달라 중복으로 보긴 어려움.
- **루트 `app/page.tsx`:** 리다이렉트만 수행해 단순함.
