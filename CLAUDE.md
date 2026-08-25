# Project: Conta-Sanlla

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Guidelines
From now on, remove all filler words. No 'the', 'is', 'am', 'are'. Direct answer only. Use short 3-6 word sentences. Run tools first, show the result, then stop. Do not narrate. Example: Instead 'The solution is to use async', say 'Use asunc'.

## Context navigation
1. Always query the knowledge graph first.
2. Only read raw files if I explicity say it.


## Commands

```bash
npm run dev      # Start dev server on port 3099
npm run build    # Production build
npm run start    # Start production server on port 3099
npm run lint     # Run ESLint
npm run test     # Jest test suite
```

## Architecture Overview

This is a **full-stack personal finance app** (Conta Sanlla) where the Next.js app handles both UI and backend API — no separate backend service.

- Framework: Next.js 16 with App Router
- Styling: MUI v7 + custom theme in `src/theme/`
- State: React Context
- Auth: NextAuth.js with JWT strategy
- DB: MySQL2
- /src/lib/db/      → repositories (DB layer)
- /src/app/api/     → route handlers
- /src/components/  → React components

## Branch Strategy
- Feature branches: `feature/<short-description>` (e.g., `feature/user-auth`)
- Bug fixes: `fix/<short-description>`
- Never commit directly to `main`


## Review Criteria
- Check for React best practices (memoization, key props, effect deps)
- Verify no hardcoded secrets or API keys
- Ensure no unused imports or dead code
- Confirm proper error handling on async functions

## Authentication — NextAuth (Auth.js v5)

### Setup & Configuration
- Use Auth.js v5 (`next-auth@5` / `authjs`), not v4. The API surface changed significantly.
- Place the main config in `auth.js` at the project root. Export `{ handlers, auth, signIn, signOut }` from it.
- Mount the catch-all route handler at `app/api/auth/[...nextauth]/route.js` using `handlers` from `auth.js`.
- Set `AUTH_SECRET` in `.env.local` (required in v5). Generate with `npx auth secret`.

### Session Access
- In **Server Components**, use `auth()` directly — no prop drilling needed.
  ```js
  import { auth } from "@/auth"

  export default async function Dashboard() {
    const session = await auth()
    if (!session) redirect("/login")
    return <div>Hello, {session.user.name}</div>
  }
  ```
- In **Client Components**, use `useSession()` from `next-auth/react` and wrap the layout with `<SessionProvider>`.
  ```js
  // app/layout.js
  import { SessionProvider } from "next-auth/react"

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          <SessionProvider>{children}</SessionProvider>
        </body>
      </html>
    )
  }
  ```

  ```js
  // components/user-avatar.js
  "use client"
  import { useSession } from "next-auth/react"

  export function UserAvatar() {
    const { data: session } = useSession()
    if (!session) return null
    return <img src={session.user.image} alt={session.user.name} />
  }
  ```
- Prefer server-side session access over client-side to avoid waterfall fetches.
- Never expose raw session tokens or secrets to the client.

### Middleware & Route Protection
- Use `middleware.js` at the project root to protect routes.
- Use the `auth` export as the middleware or wrap it:
  ```js
  // middleware.js
  export { auth as middleware } from "@/auth"

  export const config = {
    matcher: ["/dashboard(.*)", "/profile(.*)"],
  }
  ```
- Always define an explicit `matcher` — never run middleware on all routes (it runs on static assets too).
- ⚠️ SECURITY: If using Next.js 15.2.2 or below, be aware of CVE middleware bypass (x-middleware-subrequest header). Upgrade to 15.2.3+ or add server-side authorization checks in addition to middleware.
- Never rely solely on middleware for authorization — always validate session server-side in Server Components and API Routes.

### Callbacks & JWT Customization
- Extend the session/JWT via `callbacks` in `auth.js` to include `id`, or other user fields.
- Keep JWT payloads small — avoid storing large objects. Store only `id`, `email`.

### Providers
- For **Credentials**: always hash passwords with `bcrypt`. Never store plaintext.
- Use `signIn("credentials", { ... })` for form-based login.

### Security Checklist
- [ ] `AUTH_SECRET` set in all environments (never committed to git)
- [ ] CSRF protection is built-in — don't disable it
- [ ] `callbackUrl` whitelist: only redirect to trusted origins
- [ ] Rate-limit credential login endpoints (e.g., with `@upstash/ratelimit` or middleware)
- [ ] Email verification flow if using Credentials provider
- [ ] Session strategy: prefer `jwt` for edge-compatible deployments
- [ ] Validate session in Server Actions and API Route Handlers — not just middleware
- [ ] Next.js ≥ 15.2.3 to patch middleware bypass CVE


### Data Flow

All pages are **Client Components** (`"use client"`) that call the app's own API routes via `axios`.

### Database

`src/lib/db.js` exports a MySQL2 connection pool. API routes import it directly and run parameterized SQL queries. Multi-step operations (e.g., creating a transaction + updating account balance) use manual transactions with `BEGIN`/`COMMIT`/`ROLLBACK`.

### Key Patterns

- Server Components fetch data directly; pass to Client Components as props
- Use `lib/db.js` for all database access
- API errors use standard `{ error: string, code: number }` shape
- All forms use React Hook Form + Zod validation
- Path alias `@/*` maps to `src/*`
- /src/lib/db/      → repositories (DB layer)
- /src/app/api/     → route handlers
- /src/components/  → React components

## MUI Import Style

Always import MUI components individually by path — never from the barrel `@mui/material`:

```js
// ✅ correct
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// ❌ wrong
import { Button, Typography } from "@mui/material";
```

This applies to all `@mui/material` components. Sub-packages (`@mui/x-data-grid`, `@mui/x-date-pickers/*`, `@mui/icons-material/*`) already use individual paths and are fine as-is.

## Hard Rules
- Never generate TypeScript. All files must use `.js` or `.jsx`
- All React components must be created in `src/components/` — never in `src/app/` (pages, layouts, and Next.js special files like `global-error.jsx` are the only exceptions)
- Every API route and DB action must have a corresponding unit test
- Run `npm test` after every phase and ensure all tests pass
- Run `npm run build` before marking a phase complete

### API Routes (`src/app/api/`)

```
/auth/login        POST  - bcrypt verify → JWT cookie
/auth/register     POST  - bcrypt hash → insert user
/dashboard         GET   - aggregated totals, period filter (day/week/month/year/custom)
/accounts          GET, POST
/accounts/[id]     PUT, DELETE
/transactions      GET (with filters: type, sourceAccount, targetAccount, category), POST
/transactions/[id] PUT, DELETE
/categories        GET, POST
/categories/[id]   PUT, DELETE
```

### Environment Variables

Required in `.env.local`:
```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
```
