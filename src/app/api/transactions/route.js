import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

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

    // Get accounts (with initial_balance for opening balance computation)
    const accounts = await query(
      "SELECT id, name, initial_balance FROM accounts WHERE user_id = ?",
      [userId],
    );
    const categories = await query(
      "SELECT id, name, type FROM categories WHERE user_id = ?",
      [userId],
    );

    // Compute opening_balance: balance of the filtered account as of the day before
    // the earliest transaction in the current result set.
    // When a single account filter is active, computes the true opening balance.
    // Otherwise defaults to 0.
    let opening_balance = 0;
    if (account && transactions.length > 0) {
      const acc = accounts.find((a) => String(a.id) === String(account));
      if (acc) {
        // Find the earliest date in the filtered set
        const earliest = transactions.reduce(
          (min, tx) => (new Date(tx.date) < new Date(min) ? tx.date : min),
          transactions[0].date,
        );
        // Sum all transactions for this account strictly before the earliest date
        const priorRows = await query(
          `SELECT type, amount, source_account_id, target_account_id
           FROM transactions
           WHERE user_id = ? AND (source_account_id = ? OR target_account_id = ?) AND date < ?`,
          [userId, account, account, earliest],
        );
        const prior = priorRows.reduce((bal, tx) => {
          const id = String(account);
          if (String(tx.target_account_id) === id) return bal + parseFloat(tx.amount);
          if (String(tx.source_account_id) === id) {
            if (tx.type === "expense") return bal + parseFloat(tx.amount);
            if (tx.type === "transfer") return bal - parseFloat(tx.amount);
          }
          return bal;
        }, parseFloat(acc.initial_balance) || 0);
        opening_balance = prior;
      }
    }

    return NextResponse.json({ transactions, accounts, categories, opening_balance });
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

    if (!type || amount == null || !date) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, date" },
        { status: 400 },
      );
    }

    const numericAmount = parseFloat(amount);

    // Enforce sign convention
    if (type === "income" && numericAmount <= 0) {
      return NextResponse.json({ error: "Income amount must be positive" }, { status: 400 });
    }
    if (type === "expense" && numericAmount >= 0) {
      return NextResponse.json({ error: "Expense amount must be negative" }, { status: 400 });
    }
    if (type === "transfer" && numericAmount <= 0) {
      return NextResponse.json({ error: "Transfer amount must be positive" }, { status: 400 });
    }

    await query(
      "INSERT INTO transactions (user_id, type, amount, source_account_id, target_account_id, category_id, date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        type,
        numericAmount,
        source_account_id || null,
        target_account_id || null,
        category_id || null,
        date,
        description,
      ],
    );

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
