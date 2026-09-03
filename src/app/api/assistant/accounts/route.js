import { NextResponse } from "next/server";
import { requireApiToken } from "@/lib/apiAuth";
import { query } from "@/lib/db";
import { calculateAccountBalance } from "@/lib/balanceUtils";

export async function GET(request) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  try {
    const accounts = await query(
      `SELECT id, name, currency, type, initial_balance, image_path, created_at
       FROM accounts ORDER BY name`,
      [],
    );
    const transactions = await query(
      `SELECT t.type, t.amount, t.source_account_id, t.target_account_id, t.exchange_rate,
              a1.currency as source_currency, a2.currency as target_currency
       FROM transactions t
       LEFT JOIN accounts a1 ON t.source_account_id = a1.id
       LEFT JOIN accounts a2 ON t.target_account_id = a2.id`,
      [],
    );

    const accountsWithBalance = accounts.map((acc) => ({
      ...acc,
      current_balance: calculateAccountBalance(acc.initial_balance, transactions, acc.id),
    }));

    return NextResponse.json(accountsWithBalance);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}
