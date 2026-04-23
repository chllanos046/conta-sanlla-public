import postgres from "postgres";

const sql = postgres(process.env.SUPABASE_DB_URL, { max: 10 });

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
