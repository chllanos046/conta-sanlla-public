import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, queryConn, withTransaction } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;
    const { name, currency, type, balance, createTransaction = false } = await request.json();

    if (balance !== undefined && createTransaction) {
      const rows = await query(
        "SELECT balance FROM accounts WHERE id = ? AND user_id = ?",
        [id, userId],
      );
      if (rows.length === 0)
        return NextResponse.json({ error: "Account not found" }, { status: 404 });

      const currentBalance = parseFloat(rows[0].balance);
      const newBalance = parseFloat(balance);
      const diff = newBalance - currentBalance;

      if (diff !== 0) {
        await withTransaction(async (conn) => {
          await queryConn(
            conn,
            "UPDATE accounts SET name = ?, currency = ?, type = ?, balance = ? WHERE id = ? AND user_id = ?",
            [name, currency, type, newBalance, id, userId],
          );

          const amount = Math.abs(diff);
          const txType = diff > 0 ? "income" : "expense";
          const targetAccountId = txType === "income" ? id : null;
          const sourceAccountId = txType === "expense" ? id : null;

          await queryConn(
            conn,
            "INSERT INTO transactions (user_id, type, amount, source_account_id, target_account_id, date, description) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
            [userId, txType, amount, sourceAccountId, targetAccountId, "Balance adjustment"],
          );
        });
      } else {
        const result = await query(
          "UPDATE accounts SET name = ?, currency = ?, type = ? WHERE id = ? AND user_id = ?",
          [name, currency, type, id, userId],
        );
        if (result.affectedRows === 0)
          return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
    } else if (balance !== undefined) {
      const result = await query(
        "UPDATE accounts SET name = ?, currency = ?, type = ?, balance = ? WHERE id = ? AND user_id = ?",
        [name, currency, type, parseFloat(balance), id, userId],
      );
      if (result.affectedRows === 0)
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    } else {
      const result = await query(
        "UPDATE accounts SET name = ?, currency = ?, type = ? WHERE id = ? AND user_id = ?",
        [name, currency, type, id, userId],
      );
      if (result.affectedRows === 0)
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

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
    const userId = session.user.id;

    const { id } = await params;

    const rows = await query(
      "SELECT image_path FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (!rows.length)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const result = await query(
      "DELETE FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId],
    );

    if (result.affectedRows === 0)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    if (rows[0].image_path) {
      try {
        await unlink(path.join(process.cwd(), "public", rows[0].image_path));
      } catch {}
    }

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
