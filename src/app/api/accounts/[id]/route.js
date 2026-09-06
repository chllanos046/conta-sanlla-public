import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calculateAccountBalance } from "@/lib/balanceUtils";

export async function GET(_, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const rows = await query(
      "SELECT id, name, currency, type, initial_balance, image_path, created_at FROM accounts WHERE id = ?",
      [id],
    );
    if (!rows.length)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const acc = rows[0];
    const transactions = await query(
      `SELECT t.type, t.amount, t.source_account_id, t.target_account_id, t.exchange_rate,
              a1.currency as source_currency, a2.currency as target_currency
       FROM transactions t
       LEFT JOIN accounts a1 ON t.source_account_id = a1.id
       LEFT JOIN accounts a2 ON t.target_account_id = a2.id
       WHERE t.source_account_id = ? OR t.target_account_id = ?`,
      [id, id],
    );
    const current_balance = calculateAccountBalance(acc.initial_balance, transactions, acc.id);
    return NextResponse.json({ ...acc, current_balance });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name, currency, type, initial_balance, image_path = null } = await request.json();

    const result = await query(
      "UPDATE accounts SET name = ?, currency = ?, type = ?, initial_balance = ?, image_path = ? WHERE id = ?",
      [name, currency, type, parseFloat(initial_balance) || 0, image_path, id],
    );

    if (result.count === 0)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ message: "Account updated" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const result = await query(
      "DELETE FROM accounts WHERE id = ?",
      [id],
    );

    if (result.count === 0)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
