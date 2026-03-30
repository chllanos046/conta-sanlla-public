import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, withTransaction, queryConn } from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;
    const data = await request.json();

    const result = await query(
      `UPDATE transactions
       SET type = ?, amount = ?, source_account_id = ?, target_account_id = ?, category_id = ?, date = ?, description = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.type,
        data.amount,
        data.source_account_id || null,
        data.target_account_id || null,
        data.category_id || null,
        data.date,
        data.description,
        id,
        userId,
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
    const userId = session.user.id;

    const { id } = await params;

    // Reverse transaction effect on balances
    const tx = await query(
      "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (tx.length === 0)
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );

    const transaction = tx[0];

    await withTransaction(async (conn) => {
      if (transaction.source_account_id) {
        await queryConn(
          conn,
          "UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?",
          [transaction.amount, transaction.source_account_id, userId],
        );
      }
      if (transaction.target_account_id) {
        await queryConn(
          conn,
          "UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?",
          [transaction.amount, transaction.target_account_id, userId],
        );
      }

      await queryConn(
        conn,
        "DELETE FROM transactions WHERE id = ? AND user_id = ?",
        [id, userId],
      );
    });

    return NextResponse.json({ message: "Transaction deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
