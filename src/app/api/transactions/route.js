import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query, withTransaction, queryConn } from "@/lib/db";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const account = searchParams.get("account");
    const sourceAccount = searchParams.get("sourceAccount");
    const targetAccount = searchParams.get("targetAccount");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let sql = `
      SELECT t.*,
             a1.name as source_name, a1.currency as source_currency,
             a2.name as target_name, a2.currency as target_currency,
             c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a1 ON t.source_account_id = a1.id
      LEFT JOIN accounts a2 ON t.target_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (type) {
      sql += " AND t.type = ?";
      params.push(type);
    }
    if (account) {
      sql += " AND (t.source_account_id = ? OR t.target_account_id = ?)";
      params.push(account, account);
    }
    if (sourceAccount) {
      sql += " AND t.source_account_id = ?";
      params.push(sourceAccount);
    }
    if (targetAccount) {
      sql += " AND t.target_account_id = ?";
      params.push(targetAccount);
    }
    if (category) {
      sql += " AND t.category_id = ?";
      params.push(category);
    }
    if (dateFrom) {
      sql += " AND t.date >= ?";
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += " AND t.date <= ?";
      params.push(dateTo);
    }

    const transactions = await query(
      sql + " ORDER BY t.date DESC LIMIT 1000",
      params,
    );

    // Get accounts and categories for frontend
    const accounts = await query(
      "SELECT id, name FROM accounts WHERE user_id = ?",
      [userId],
    );
    const categories = await query(
      "SELECT id, name, type FROM categories WHERE user_id = ?",
      [userId],
    );

    return NextResponse.json({ transactions, accounts, categories });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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

    const {
      type,
      amount,
      source_account_id,
      target_account_id,
      category_id,
      date,
      description,
    } = await request.json();

    if (!type || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, date" },
        { status: 400 },
      );
    }

    await withTransaction(async (conn) => {
      // Update source account balance
      if (source_account_id) {
        await queryConn(
          conn,
          "UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?",
          [amount, source_account_id, userId],
        );
      }

      // Update target account balance (income or transfer)
      if (target_account_id) {
        let targetAmount = amount;

        // Currency conversion for transfers
        if (source_account_id && type === "transfer") {
          const sourceAcc = await queryConn(
            conn,
            "SELECT currency FROM accounts WHERE id = ?",
            [source_account_id],
          );
          const targetAcc = await queryConn(
            conn,
            "SELECT currency FROM accounts WHERE id = ?",
            [target_account_id],
          );

          if (sourceAcc[0]?.currency !== targetAcc[0]?.currency) {
            // Simple 1:1 fallback (add exchangerate-api in production)
            targetAmount = amount * 1.05; // Demo conversion
          }
        }

        await queryConn(
          conn,
          "UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?",
          [targetAmount, target_account_id, userId],
        );
      }

      // Create transaction
      await queryConn(
        conn,
        "INSERT INTO transactions (user_id, type, amount, source_account_id, target_account_id, category_id, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          type,
          amount,
          source_account_id || null,
          target_account_id || null,
          category_id || null,
          date,
          description,
        ],
      );
    });

    return NextResponse.json(
      { message: "Transaction created" },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
