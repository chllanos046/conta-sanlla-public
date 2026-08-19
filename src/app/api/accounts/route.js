import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calculateAccountBalance } from "@/lib/balanceUtils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, currency, type, initial_balance = 0, image_path = null } = await request.json();

    if (!name || !currency || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, currency, type" },
        { status: 400 },
      );
    }

    const result = await query(
      "INSERT INTO accounts (name, currency, type, initial_balance, image_path) VALUES (?, ?, ?, ?, ?) RETURNING id",
      [name, currency, type, parseFloat(initial_balance) || 0, image_path],
    );

    return NextResponse.json({ message: "Account created", id: result[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
