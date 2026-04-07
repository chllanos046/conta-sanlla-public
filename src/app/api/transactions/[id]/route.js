import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

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
       SET type = ?, amount = ?, source_account_id = ?, target_account_id = ?, category_id = ?, date = ?, description = ?
       WHERE id = ?`,
      [
        data.type,
        numericAmount,
        data.source_account_id || null,
        data.target_account_id || null,
        data.category_id || null,
        data.date,
        data.description,
        id,
      ],
    );

    if (result.affectedRows === 0)
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

    if (result.affectedRows === 0)
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
