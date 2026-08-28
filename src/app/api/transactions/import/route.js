import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, withTransaction, queryConn } from "@/lib/db";

const VALID_TYPES = ["income", "expense", "transfer"];

function applySignConvention(type, amount) {
  const n = parseFloat(amount);
  if (type === "expense" && n > 0) return -n;
  if (type === "income" && n < 0) return -n;
  if (type === "transfer" && n < 0) return -n;
  return n;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "transactions must be a non-empty array" },
        { status: 400 },
      );
    }

    // Pre-fetch account currencies for cross-currency transfer validation
    const accountRows = await query("SELECT id, currency FROM accounts", []);
    const currencyMap = Object.fromEntries(accountRows.map((a) => [String(a.id), a.currency]));

    // Validate each row before inserting
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!VALID_TYPES.includes(tx.type)) {
        return NextResponse.json(
          { error: `Row ${i + 1}: invalid type "${tx.type}"` },
          { status: 400 },
        );
      }
      if (tx.amount == null || isNaN(parseFloat(tx.amount))) {
        return NextResponse.json(
          { error: `Row ${i + 1}: missing or invalid amount` },
          { status: 400 },
        );
      }
      if (!tx.date) {
        return NextResponse.json(
          { error: `Row ${i + 1}: missing date` },
          { status: 400 },
        );
      }
      if (tx.type === "transfer" && tx.source_account_id && tx.target_account_id) {
        const srcCurrency = currencyMap[String(tx.source_account_id)];
        const tgtCurrency = currencyMap[String(tx.target_account_id)];
        if (srcCurrency && tgtCurrency && srcCurrency !== tgtCurrency && !tx.exchange_rate) {
          return NextResponse.json(
            { error: `Row ${i + 1}: exchange_rate required for cross-currency transfer (${srcCurrency}→${tgtCurrency})` },
            { status: 400 },
          );
        }
      }
    }

    const imported = await withTransaction(async (conn) => {
      let count = 0;
      for (const tx of transactions) {
        const amount = applySignConvention(tx.type, tx.amount);
        await queryConn(
          conn,
          "INSERT INTO transactions (type, amount, source_account_id, target_account_id, category_id, date, description, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            tx.type,
            amount,
            tx.source_account_id || null,
            tx.target_account_id || null,
            tx.category_id || null,
            tx.date,
            tx.description || null,
            tx.exchange_rate ? parseFloat(tx.exchange_rate) : null,
          ],
        );
        count++;
      }
      return count;
    });

    return NextResponse.json({ imported }, { status: 201 });
  } catch (error) {
    console.error("[import] failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import transactions" },
      { status: 500 },
    );
  }
}
