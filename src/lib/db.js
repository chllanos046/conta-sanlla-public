import mysql from "mysql2/promise";

const pool = mysql.createPool({
  uri: process.env.DB_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryConn(connection, sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
