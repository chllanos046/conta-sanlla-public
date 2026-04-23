/**
 * Export all MySQL tables to a Postgres-compatible SQL file.
 *
 * Usage:
 *   DB_URL=mysql://user:pass@host/db node resources/db/export-mysql.js
 *
 * Output:
 *   resources/db/export-<timestamp>.sql
 *
 * Import into Supabase via SQL editor or psql:
 *   psql <SUPABASE_DB_URL> -f resources/db/export-<timestamp>.sql
 */

import mysql from "mysql2/promise";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tables exported in FK-safe order
const TABLE_ORDER = ["users", "accounts", "categories", "transactions"];

// Columns that contain date-only values (stored as DATE in Postgres)
const DATE_ONLY_COLUMNS = new Set(["date"]);

function serializeValue(value, columnName) {
  if (value === null || value === undefined) return "NULL";

  if (value instanceof Date) {
    if (DATE_ONLY_COLUMNS.has(columnName)) {
      // Date-only: YYYY-MM-DD, no time component
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `'${y}-${m}-${d}'`;
    }
    // Timestamps: full ISO without Z suffix
    return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
  }

  if (typeof value === "bigint") return String(value);
  if (typeof value === "number") return String(value);
  if (Buffer.isBuffer(value)) return `'${value.toString("hex")}'`;

  // String: escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportTable(conn, table) {
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(", ");

  return rows.map((row) => {
    const values = columns
      .map((col) => serializeValue(row[col], col))
      .join(", ");
    return `INSERT INTO ${table} (${columnList}) VALUES (${values});`;
  });
}

async function main() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error("Error: DB_URL environment variable is required.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);
  const lines = [];

  lines.push(`-- Supabase import dump`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Run in Supabase SQL editor or: psql <SUPABASE_DB_URL> -f <this-file>`);
  lines.push("");
  lines.push("SET session_replication_role = replica; -- disable FK checks during import");
  lines.push("");

  for (const table of TABLE_ORDER) {
    console.log(`Exporting ${table}...`);
    lines.push(`-- TABLE: ${table}`);
    lines.push(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);

    const inserts = await exportTable(conn, table);
    if (inserts.length > 0) {
      lines.push(...inserts);
    } else {
      lines.push(`-- (no rows)`);
    }
    lines.push("");
  }

  lines.push("SET session_replication_role = DEFAULT;");
  lines.push("");
  lines.push("-- Done. Verify row counts:");
  for (const table of TABLE_ORDER) {
    lines.push(`-- SELECT COUNT(*) FROM ${table};`);
  }

  const outPath = path.join(__dirname, `export-${Date.now()}.sql`);
  writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`\nExport complete: ${outPath}`);
  await conn.end();
}

main().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});
