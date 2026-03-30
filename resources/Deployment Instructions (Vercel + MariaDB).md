Deployment Instructions (Vercel + MariaDB)
1. Database: Use PlanetScale (MySQL-compatible, free tier) or Railway for MariaDB. Update .env with connection details.

2. Backend:

  Create vercel.json in backend/: {"builds": [{"src": "server.js", "use": "@vercel/node"}]}

  vercel --prod

3. Frontend:

  npm run build

  Deploy to Vercel: vercel --prod

  Set proxy/env vars for API URL

4. Environment Variables (Vercel dashboard):

DB_HOST=your-mariadb-host
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=finance_app
JWT_SECRET=your-long-secret
