# Graph Report - conta-sanlla  (2026-08-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 362 nodes · 560 edges · 32 communities (19 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `397fef82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- query
- dependencies
- dashboard/page.js
- transactions/page.js
- devDependencies
- RootClientLayout.js
- allow
- MobileTransactionDetail.jsx
- balanceUtils.test.js
- ImportTransactionsDialog.jsx
- export-mysql.js
- MobileTransactionsList.jsx
- settings/mobile/page.js
- account/mobile/page.js
- apple-icon.js
- icon.js
- jest.config.js
- compilerOptions
- account-images/route.js
- login/page.js
- register/page.js
- verify-code/page.js
- eslint.config.mjs
- next.config.mjs
- { GET, POST }

## God Nodes (most connected - your core abstractions)
1. `query()` - 36 edges
2. `convertAmount()` - 12 edges
3. `useCurrency()` - 9 edges
4. `formatCurrency()` - 9 edges
5. `allow` - 8 edges
6. `calculateAccountBalance()` - 7 edges
7. `checkRateLimit()` - 7 edges
8. `useConfirm()` - 7 edges
9. `useNotify()` - 7 edges
10. `txContribution()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `query()`  [EXTRACTED]
  src/app/api/transactions/[id]/route.js → src/lib/db.js
- `GET()` --calls--> `query()`  [EXTRACTED]
  src/app/api/transactions/route.js → src/lib/db.js
- `POST()` --calls--> `query()`  [EXTRACTED]
  src/app/api/transactions/route.js → src/lib/db.js
- `TransactionsPage()` --calls--> `useCurrency()`  [EXTRACTED]
  src/app/transactions/page.js → src/hooks/useCurrency.js
- `txContribution()` --calls--> `convertAmount()`  [EXTRACTED]
  src/lib/balanceUtils.js → src/lib/currency.js

## Import Cycles
- None detected.

## Communities (32 total, 13 thin omitted)

### Community 0 - "query"
Cohesion: 0.07
Nodes (31): DELETE(), PUT(), GET(), POST(), POST(), POST(), DELETE(), PUT() (+23 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (43): axios, bcryptjs, date-fns, @ducanh2912/next-pwa, @emotion/cache, @emotion/react, @emotion/styled, @hookform/resolvers (+35 more)

### Community 2 - "dashboard/page.js"
Cohesion: 0.12
Nodes (21): Dashboard(), PERIODS, AccountCarousel(), AccountTypeIcon(), ICONS, COLORS, ExpensesByCategoryChart(), StyledText (+13 more)

### Community 3 - "transactions/page.js"
Cohesion: 0.11
Nodes (16): GET(), POST(), TransactionsPage(), AccountsList(), EMPTY_FORM, schema, CategoriesList(), EMPTY_FORM (+8 more)

### Community 4 - "devDependencies"
Cohesion: 0.07
Nodes (26): babel-jest, eslint, eslint-config-next, jest, jest-environment-jsdom, devDependencies, babel-jest, eslint (+18 more)

### Community 5 - "RootClientLayout.js"
Cohesion: 0.10
Nodes (18): AppShell(), AUTH_ROUTES, ConfirmDialogProvider(), Loading(), MobileBottomNav(), NAV_ITEMS, NotificationProvider(), PwaUpdatePrompt() (+10 more)

### Community 6 - "allow"
Cohesion: 0.10
Nodes (20): env, NODE_ENV, hooks, PreToolUse, model, permissions, allow, deny (+12 more)

### Community 7 - "MobileTransactionDetail.jsx"
Cohesion: 0.17
Nodes (10): amountColor(), formatAmount(), MobileTransactionDetail(), EMPTY_TX, makeSchema(), today(), TransactionFormDialog(), ACCOUNTS (+2 more)

### Community 8 - "balanceUtils.test.js"
Cohesion: 0.13
Nodes (14): acc1, acc2, acc3, acc4, acc5, allTx, tx1, tx2 (+6 more)

### Community 9 - "ImportTransactionsDialog.jsx"
Cohesion: 0.36
Nodes (8): ImportTransactionsDialog(), normalizeAmount(), normalizeDate(), parseCSV(), resolveRow(), STEPS, TX_FIELDS, uniqueColValues()

### Community 10 - "export-mysql.js"
Cohesion: 0.38
Nodes (6): DATE_ONLY_COLUMNS, __dirname, exportTable(), main(), serializeValue(), TABLE_ORDER

### Community 11 - "MobileTransactionsList.jsx"
Cohesion: 0.53
Nodes (3): amountColor(), formatAmount(), MobileTransactionsList()

## Knowledge Gaps
- **114 isolated node(s):** `VALID_TYPES`, `{ handlers, signIn, signOut, auth }`, `store`, `{ auth }`, `config` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `transactions/page.js`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `convertAmount()` connect `dashboard/page.js` to `transactions/page.js`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `VALID_TYPES`, `{ handlers, signIn, signOut, auth }`, `store` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.07490079365079365 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `dashboard/page.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11861861861861862 - nodes in this community are weakly interconnected._