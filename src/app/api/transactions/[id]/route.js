import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const rows = await query(
      `SELECT t.*,
              a1.name AS source_name, a1.currency AS source_currency,
              a2.name AS target_name, a2.currency AS target_currency,
              c.name AS category_name
       FROM transactions t
       LEFT JOIN accounts a1 ON t.source_account_id = a1.id
       LEFT JOIN accounts a2 ON t.target_account_id = a2.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id],
    );

    if (!rows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ transaction: rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json();

    const numericAmount = parseFloat(data.amount);

    // Enforce sign convention
    if (data.type === "income" && numericAmount <= 0) {
      return NextResponse.json({ error: "Income amount must be positive" }, { status: 400 });
    }
    if (data.type === "expense" && numericAmount >= 0) {
      return NextResponse.json({ error: "Expense amount must be negative" }, { status: 400 });
    }
    if (data.type === "transfer" && numericAmount <= 0) {
      return NextResponse.json({ error: "Transfer amount must be positive" }, { status: 400 });
    }

    const result = await query(
      `UPDATE transactions
       SET type = ?, amount = ?, source_account_id = ?, target_account_id = ?, category_id = ?, date = ?, description = ?, exchange_rate = ?
       WHERE id = ?`,
      [
        data.type,
        numericAmount,
        data.source_account_id || null,
        data.target_account_id || null,
        data.category_id || null,
        data.date,
        data.description,
        data.exchange_rate ? parseFloat(data.exchange_rate) : null,
        id,
      ],
    );

    if (result.count === 0)
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Transaction updated" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update transaction" },
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
      "DELETE FROM transactions WHERE id = ?",
      [id],
    );

    if (result.count === 0)
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Transaction deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
