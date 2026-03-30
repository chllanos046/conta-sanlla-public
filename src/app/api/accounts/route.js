import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, queryConn, withTransaction } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const accounts = await query(
      "SELECT * FROM accounts WHERE user_id = ? ORDER BY name",
      [userId],
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
    const userId = session.user.id;

    const { name, currency, type, balance = 0, createTransaction = false } = await request.json();

    if (!name || !currency || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, currency, type" },
        { status: 400 },
      );
    }

    const numericBalance = parseFloat(balance) || 0;
    let newId;

    if (createTransaction && numericBalance !== 0) {
      await withTransaction(async (conn) => {
        const insertResult = await queryConn(
          conn,
          "INSERT INTO accounts (user_id, name, currency, type, balance) VALUES (?, ?, ?, ?, 0)",
          [userId, name, currency, type],
        );
        newId = insertResult.insertId;
        const amount = Math.abs(numericBalance);
        const txType = numericBalance > 0 ? "income" : "expense";
        const targetAccountId = txType === "income" ? newId : null;
        const sourceAccountId = txType === "expense" ? newId : null;

        await queryConn(
          conn,
          txType === "income"
            ? "UPDATE accounts SET balance = balance + ? WHERE id = ?"
            : "UPDATE accounts SET balance = balance - ? WHERE id = ?",
          [amount, newId],
        );

        await queryConn(
          conn,
          "INSERT INTO transactions (user_id, type, amount, source_account_id, target_account_id, date, description) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
          [userId, txType, amount, sourceAccountId, targetAccountId, "Initial balance"],
        );
      });
    } else {
      const result = await query(
        "INSERT INTO accounts (user_id, name, currency, type, balance) VALUES (?, ?, ?, ?, ?)",
        [userId, name, currency, type, numericBalance],
      );
      newId = result.insertId;
    }

    return NextResponse.json({ message: "Account created", id: newId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
