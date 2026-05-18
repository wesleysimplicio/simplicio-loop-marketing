# Login (example feature)

> Fully-filled example showing the shape of a feature doc. Treat it as the contract between a human and an agent before touching login code.

## Goal

Allow a returning store owner to authenticate with email + password and arrive at the dashboard with a valid session.

## User Flow

1. User opens `/login` and types email + password.
2. Browser POSTs to `/api/v1/auth/login` with payload `{ email, password }`.
3. Backend issues a 15-minute JWT (Authorization header) + 30-day refresh token (httpOnly cookie).
4. Frontend redirects to `/dashboard`; protected routes hydrate user data via `GET /api/v1/me`.
5. On token expiry, frontend silently refreshes via `POST /api/v1/auth/refresh`; failure logs the user out.

## Main Files

| Layer | Files |
|---|---|
| UI | `apps/web/src/app/login/page.tsx`, `apps/web/src/features/auth/LoginForm.tsx` |
| API | `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts` |
| Service/domain | `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/password.service.ts` |
| Persistence | `apps/api/src/users/user.entity.ts`, `apps/api/src/users/users.repository.ts` |
| Tests | `apps/api/test/auth.spec.ts`, `apps/web/e2e/login.spec.ts` |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/login` | Exchange credentials for tokens |
| POST | `/api/v1/auth/refresh` | Rotate access token (uses refresh cookie) |
| POST | `/api/v1/auth/logout` | Invalidate refresh token, clear cookie |
| GET | `/api/v1/me` | Return current user payload |

## Data

| Table | Purpose |
|---|---|
| `users` | Email, hashed password (`argon2id`), roles, status |
| `auth_sessions` | Refresh-token jti, revocation timestamp, last-seen IP/UA |
| `auth_login_attempts` | Failed attempts per IP per email (rate-limit + brute-force detection) |

## Business Rules

- Email is **case-insensitive** and unique. Lower-case on write.
- Passwords stored with `argon2id` (timeCost=3, memoryCost=64MB, parallelism=1). Never log raw password.
- After 5 failed attempts in 10 minutes for the same email, return generic 401 and require captcha next attempt.
- Refresh token rotates on every use; reuse of an already-rotated token revokes the entire session family (token reuse detection).
- Disabled or pending-deletion users always get 401 with `{"error":"account_unavailable"}`.

## Test Scenarios

- Happy path (`apps/web/e2e/login.spec.ts -> "logs in and lands on dashboard"`).
- Wrong password returns 401 without revealing whether email exists.
- Locked account after 5 failures requires captcha (`auth.spec.ts -> "captcha after 5 failures"`).
- Token refresh succeeds with a valid cookie and rotates the refresh token.
- Reused refresh token revokes the session family.

## Evidence

- Screenshot: `evidence/login-success.png`, `evidence/login-locked.png`.
- Video: captured on Playwright retry (`playwright.config.ts` already wires `video: 'retain-on-failure'`).
- Trace: `test-results/**/trace.zip` for every failing run.

## Known Risks

- Argon2 dependency must match between API and worker (worker validates session in async webhooks).
- Refresh-cookie SameSite policy differs in Safari ITP — verify on every Playwright run including Safari project.
- 5-attempts threshold is per email, not per IP — a botnet can rotate IPs. We rely on Cloudflare WAF for IP-based defense.
