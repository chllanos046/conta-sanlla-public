import postgres from "postgres";

const globalForDb = globalThis;

const isServerless = process.env.VERCEL === "1";

if (!globalForDb._sql) {
  globalForDb._sql = postgres(process.env.SUPABASE_DB_URL, {
    // max:1 forced every Promise.all query batch to queue serially on one
    // connection; PgBouncer transaction mode is built for many pooled
    // connections per function, so give routes room for real parallelism.
    max: isServerless ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for PgBouncer transaction mode
    onnotice: () => {},
    // A transaction interrupted mid-request (e.g. a killed serverless
    // invocation inside withTransaction) otherwise stays idle-in-transaction
    // holding row locks forever, hanging every later query on the same pooled
    // connection. Cap both so the session self-terminates instead.
    connection: {
      statement_timeout: 15000,
      idle_in_transaction_session_timeout: 15000,
    },
  });

  // Clean up on process exit (dev HMR and production shutdown)
  const end = () => globalForDb._sql.end({ timeout: 5 }).catch(() => {});
  process.on("exit", end);
  process.on("SIGINT", end);
  process.on("SIGTERM", end);
  process.on("beforeExit", end);
}

const sql = globalForDb._sql;

function convertPlaceholders(rawSql) {
  let i = 0;
  return rawSql.replace(/\?/g, () => `$${++i}`);
}

export async function query(rawSql, params = []) {
  return await sql.unsafe(convertPlaceholders(rawSql), params);
}

export async function queryConn(txSql, rawSql, params = []) {
  return await txSql.unsafe(convertPlaceholders(rawSql), params);
}

export async function withTransaction(callback) {
  return await sql.begin(async (txSql) => callback(txSql));
}

export default sql;
