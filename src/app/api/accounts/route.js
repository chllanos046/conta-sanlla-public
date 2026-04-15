import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await query(
      `SELECT a.id, a.name, a.currency, a.type, a.initial_balance, a.image_path, a.created_at,
        a.initial_balance + COALESCE(SUM(CASE
          WHEN t.target_account_id = a.id
            THEN t.amount * CASE WHEN a.currency = 'USD' THEN 1 ELSE COALESCE(t.exchange_rate, 1) END
          WHEN t.source_account_id = a.id AND t.type = 'expense'
            THEN t.amount * CASE WHEN a.currency = 'USD' THEN 1 ELSE COALESCE(t.exchange_rate, 1) END
          WHEN t.source_account_id = a.id AND t.type = 'transfer'
            THEN -t.amount * CASE WHEN a.currency = 'USD' THEN 1 ELSE COALESCE(t.exchange_rate, 1) END
          ELSE 0
        END), 0) AS current_balance
      FROM accounts a
      LEFT JOIN transactions t ON (t.target_account_id = a.id OR t.source_account_id = a.id)
      GROUP BY a.id
      ORDER BY a.name`,
      [],
    );
    return NextResponse.json(accounts);
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
      "INSERT INTO accounts (name, currency, type, initial_balance, image_path) VALUES (?, ?, ?, ?, ?)",
      [name, currency, type, parseFloat(initial_balance) || 0, image_path],
    );

    return NextResponse.json({ message: "Account created", id: result.insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
