# Project: Conta-Sanlla

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Guidelines
From now on, remove all filler words. No 'the', 'is', 'am', 'are'. Direct answer only. Use short 3-6 word sentences. Run tools first, show the result, then stop. Do not narrate. Example: Instead 'The solution is to use async', say 'Use asunc'.


## Commands

```bash
npm run dev      # Start dev server on port 3099
npm run build    # Production build
npm run start    # Start production server on port 3099
npm run lint     # Run ESLint
npm run test     # Jest test suite
```

There are no test scripts configured in this project.

## Architecture Overview

This is a **full-stack personal finance app** (Conta Sanlla) where the Next.js app handles both UI and backend API — no separate backend service.

- Framework: Next.js 16 with App Router
- Styling: MUI v7 + custom theme in `src/theme/`
- State: React Context
- Auth: NextAuth.js with JWT strategy
- DB: MySQL2
- /src/lib/api/     → centralized fetch clients (API layer)
- /src/lib/db/      → repositories (DB layer)
- /src/lib/services/ → business logic
- /src/app/api/     → route handlers (thin, delegate to services)
- /src/components/  → React components

## Branch Strategy
- Feature branches: `feature/<short-description>` (e.g., `feature/user-auth`)
- Bug fixes: `fix/<short-description>`
- Never commit directly to `main`

## PR Guidelines
- PR title must follow Conventional Commits: `feat:`, `fix:`, `chore:`
- Include a description of what changed and why
- Every PR must target `main`

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

**`auth.js` minimal example:**
```js
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
})
```

**`app/api/auth/[...nextauth]/route.js`:**
```js
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

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

All pages are **Client Components** (`"use client"`) that call the app's own API routes via `axios`. Requests pass cookies explicitly: `headers: { Cookie: document.cookie }`. No server-side data fetching or React Server Components in use beyond the root layout.

### Database

`src/lib/db.js` exports a MySQL2 connection pool. API routes import it directly and run parameterized SQL queries. Multi-step operations (e.g., creating a transaction + updating account balance) use manual transactions with `BEGIN`/`COMMIT`/`ROLLBACK`.

### Use the mui-mcp server to answer any MUI questions --

- 1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
- 2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
- 3. repeat steps 1-2 until you have fetched all relevant docs for the given question
- 4. use the fetched content to answer the question

### Key Patterns

- Server Components fetch data directly; pass to Client Components as props
- Use `lib/db.ts` for all database access
- API errors use standard `{ error: string, code: number }` shape
- All forms use React Hook Form + Zod validation
- Path alias `@/*` maps to `src/*`
- /src/lib/api/     → centralized fetch clients (API layer)
- /src/lib/db/      → repositories (DB layer)
- /src/app/api/     → route handlers (thin, delegate to services)
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
- Create a SUMMARY.md after each phase describing what was done

### API Routes (`src/app/api/`)

```
/auth/login        POST  - bcrypt verify → JWT cookie
/auth/register     POST  - bcrypt hash → insert user
/dashboard         GET   - aggregated totals, period filter (day/week/month/year/custom)
/accounts          GET, POST
/accounts/[id]     PUT, DELETE
/transactions      GET (with filters: type, sourceAccount, targetAccount, category, dateFrom, dateTo), POST
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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
