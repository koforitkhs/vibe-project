# OWASP 중심 보안 감사 리포트

- **대상 저장소:** vive-project  
- **감사 기준:** 프로젝트 스킬 `owasp-security-audit` (SQL 인젝션, 세션 관리, 에러·정보 유출, Bcrypt/비밀번호)  
- **범위:** `frontend/app/api/**`, `frontend/middleware.ts`, `frontend/lib/owner-cookie.ts`, `frontend/lib/supabase/**`, `frontend/lib/todos-direct.ts`, `supabase/migrations/*.sql`  
- **감사일:** 2026-03-28  

## 결과 요약 (발견 사항)

| 일련번호 | 심각도 | 파일 | 위치 | 문제 | 권고사항 |
|---|---|---|---|---|---|
| 1 | Medium | `frontend/app/api/todos/route.ts` | `GET`·`POST`의 `if (error)` 분기 (예: L49–50, L69–70, L133–134) | Supabase/PostgREST `error.message`를 JSON 응답에 그대로 반환. 스키마·제약·힌트 등이 클라이언트에 노출될 수 있음. | 클라이언트에는 일반화된 메시지만 반환하고, 원문은 서버 로그·관측 도구로만 기록. |
| 2 | Medium | `frontend/app/api/todos/[id]/route.ts` | `PATCH`·`DELETE` 및 선행 `select` 오류 (예: L52–53, L93–94, L128–129) | 동일하게 `fetchErr.message` / `error.message` 직접 반환. | 위와 동일. |
| 3 | Medium | `frontend/lib/todos-direct.ts` | `directFetch*`·`directCreate*`·`directPatch*`·`directDelete*` (예: L39, L59, L71, L87, L95) | `throw new Error(error.message)`로 DB 계층 메시지가 UI까지 전달될 수 있음. | 사용자용 문구와 분리, 상세는 로깅만. |
| 4 | Medium | `frontend/app/api/todos/route.ts`, `frontend/app/api/todos/[id]/route.ts` | 서비스 롤 미설정 시 `503` 응답 본문 | `SUPABASE_SERVICE_ROLE_KEY` 등 환경 변수 **이름**이 공개 API에 포함됨. | 공개 응답은 “서버 설정 오류” 수준으로만 안내하고, 변수명은 내부 문서로 한정. |
| 5 | High | `frontend/middleware.ts`, `frontend/lib/owner-cookie.ts` | `vive_owner_id` 쿠키 발급·검증 (`middleware` L8–14 등) | 게스트 UUID 쿠키가 **소유권 증명**으로 사용됨. `httpOnly`·프로덕션 `Secure`로 완화되나 쿠키 탈취 시 동일 데이터에 대한 읽기/쓰기 가능. `maxAge` 약 400일, 회전·바인딩 없음. | HTTPS·XSS 방지 유지, 위협 모델 문서화. 민감도 증가 시 계정 연동, TTL 단축, 세션 회전 검토. |
| 6 | Medium | `frontend/lib/todos-direct.ts` | `ensureAnonSession`, Supabase 브라우저 클라이언트 | 익명 JWT·세션은 브라우저 저장에 의존. 탈취·공유 기기 시 재사용 위험. | 서버 경로(서비스 롤 + 쿠키 소유자) 우선 사용 또는 익명 세션 수명·정책 문서화. |
| 7 | Medium | (범위 전체) | — | **Bcrypt·비밀번호 해시·평문 비밀번호 비교 코드 없음** — 해당 OWASP 세부 항목은 **구현 부재로 검증 불가**. | 자격 증명 로그인 도입 시 `bcrypt`(또는 Argon2) **salt rounds ≥ 12**(또는 팀 표준), 평문 비교 금지. |

## 양호 요약 (표 외)

- **SQL 인젝션:** 할 일 접근은 Supabase JS 클라이언트의 `.from()`·`.eq()` 등으로만 구성되어 있으며, 본 범위에서 사용자 입력을 이어붙인 원시 SQL 문자열은 확인되지 않음(PostgREST 파라미터 바인딩 경로).
- **마이그레이션 SQL:** `supabase/migrations/*.sql`은 배포용 DDL로, 런타임 사용자 입력과 결합되지 않음.

## 참고

- OWASP Top 10: https://owasp.org/www-project-top-ten/
