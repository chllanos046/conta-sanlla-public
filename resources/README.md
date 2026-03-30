# Personal Finance Tracker

Multi-user React/Next.js + Node/MariaDB app with:
- JWT Authentication
- Multi-currency accounts (USD/EUR/ARS/BRL + conversion)
- Income/Expense/Transfer transactions
- Running balance calculations
- Advanced filtering (date range, accounts, categories)
- MUI DataGrid + Recharts dashboard
- Vercel + Railway deployment

## Local Setup

1. **Clone & Install**
```bash
git clone <your-repo> finance-app
cd finance-app
npm install

2. **Database (Railway.app - Free)**

```text
- New → MariaDB
- Copy connection string to .env.local
- Run schema.sql

3. **Environment**

```bash
# .env.local
DB_HOST=your-host.railway.app
DB_USER=root
DB_PASSWORD=your-password
JWT_SECRET=supersecret-change-production


4. **Run**

```bash
npm run dev
# http://localhost:3000/login
# test@example.com / password

## Production Deploy

```text
# Vercel (Frontend + API)
vercel --prod

# Railway (MariaDB - Free tier)
railway.app → New Project → MariaDB