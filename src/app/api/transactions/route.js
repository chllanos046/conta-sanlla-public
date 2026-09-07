import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { txContribution } from "@/lib/balanceUtils";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const account = searchParams.get("account");
    const sourceAccount = searchParams.get("sourceAccount");
    const targetAccount = searchParams.get("targetAccount");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit"), 10) || 25;
    const offset = parseInt(searchParams.get("offset"), 10) || 0;

    let sql = `
      SELECT t.*,
             a1.name as source_name, a1.currency as source_currency,
             a2.name as target_name, a2.currency as target_currency,
             c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a1 ON t.source_account_id = a1.id
      LEFT JOIN accounts a2 ON t.target_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

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
      sql + " ORDER BY t.date DESC LIMIT ? OFFSET ?",
      [...params, limit, offset],
    );

    const countRows = await query(
      sql.replace(/^\s*SELECT[\s\S]*?FROM transactions t/, "SELECT COUNT(*) as count FROM transactions t"),
      params,
    );
    const total = parseInt(countRows[0]?.count, 10) || 0;

    // Get accounts (with currency for exchange rate field visibility in form)
    const accounts = await query(
      "SELECT id, name, currency, type, initial_balance FROM accounts ORDER BY name",
      [],
    );
    const categories = await query(
      "SELECT id, name, type FROM categories",
      [],
    );

    // Compute opening_balance: balance of the filtered account as of the day before
    // the earliest transaction in the current result set.
    // When a single account filter is active, computes the true opening balance.
    // Otherwise defaults to 0.
    let opening_balance = 0;
    if (account && transactions.length > 0) {
      const acc = accounts.find((a) => String(a.id) === String(account));
      if (acc) {
        // Query is ORDER BY t.date DESC, so the last element is the earliest date
        const earliest = transactions[transactions.length - 1].date;
        // Sum all transactions for this account strictly before the earliest date
        const priorRows = await query(
          `SELECT t.type, t.amount, t.source_account_id, t.target_account_id,
                  t.exchange_rate, a1.currency as source_currency, a2.currency as target_currency
           FROM transactions t
           LEFT JOIN accounts a1 ON a1.id = t.source_account_id
           LEFT JOIN accounts a2 ON a2.id = t.target_account_id
           WHERE (t.source_account_id = ? OR t.target_account_id = ?) AND t.date < ?`,
          [account, account, earliest],
        );
        const prior = priorRows.reduce(
          (bal, tx) => bal + txContribution(tx, account),
          parseFloat(acc.initial_balance) || 0,
        );
        opening_balance = prior;
      }
    }

    return NextResponse.json({ transactions, accounts, categories, opening_balance, total });
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

    const {
      type,
      amount,
      source_account_id,
      target_account_id,
      category_id,
      date,
      description,
      exchange_rate,
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
    if (type === "income" && target_account_id) {
      const tgt = await query("SELECT type FROM accounts WHERE id = ?", [target_account_id]);
      if (tgt[0]?.type === "credit") {
        return NextResponse.json(
          { error: "Income transactions cannot target a credit card account" },
          { status: 400 },
        );
      }
    }
    if (type === "transfer" && source_account_id && target_account_id) {
      const [srcRows, tgtRows] = await Promise.all([
        query("SELECT type, currency FROM accounts WHERE id = ?", [source_account_id]),
        query("SELECT currency FROM accounts WHERE id = ?", [target_account_id]),
      ]);
      if (srcRows[0]?.type === "credit") {
        return NextResponse.json(
          { error: "Credit card accounts cannot be the source of a transfer" },
          { status: 400 },
        );
      }
      if (!exchange_rate) {
        const srcCurrency = srcRows[0]?.currency;
        const tgtCurrency = tgtRows[0]?.currency;
        if (srcCurrency && tgtCurrency && srcCurrency !== tgtCurrency) {
          return NextResponse.json(
            { error: `exchange_rate is required for cross-currency transfers (${srcCurrency}→${tgtCurrency})` },
            { status: 400 },
          );
        }
      }
    }

    await query(
      "INSERT INTO transactions (type, amount, source_account_id, target_account_id, category_id, date, description, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        type,
        numericAmount,
        source_account_id || null,
        target_account_id || null,
        category_id || null,
        date,
        description,
        exchange_rate ? parseFloat(exchange_rate) : null,
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
