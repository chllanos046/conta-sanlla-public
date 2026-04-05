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
    const period     = searchParams.get("period") || "month";
    const dateParam  = searchParams.get("date");
    const yearParam  = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dateFrom   = searchParams.get("dateFrom");
    const dateTo     = searchParams.get("dateTo");

    // Accounts with computed current_balance (all-time)
    const accounts = await query(
      `SELECT a.id, a.name, a.currency, a.type, a.initial_balance, a.image_path, a.created_at,
        a.initial_balance + COALESCE(SUM(CASE
          WHEN t.target_account_id = a.id THEN t.amount
          WHEN t.source_account_id = a.id AND t.type = 'expense' THEN t.amount
          WHEN t.source_account_id = a.id AND t.type = 'transfer' THEN -t.amount
          ELSE 0
        END), 0) AS current_balance
      FROM accounts a
      LEFT JOIN transactions t ON (t.target_account_id = a.id OR t.source_account_id = a.id)
        AND t.user_id = a.user_id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY a.name`,
      [userId],
    );

    // Build date filter for period transactions
    const now = new Date();
    let dateFilter = "";
    const txParams = [userId];

    if (period === "day") {
      const d = dateParam || now.toISOString().split("T")[0];
      dateFilter = "AND t.date >= ? AND t.date < DATE_ADD(?, INTERVAL 1 DAY)";
      txParams.push(d, d);
    } else if (period === "month") {
      const y = yearParam  || now.getFullYear();
      const m = monthParam || now.getMonth() + 1;
      dateFilter = "AND YEAR(t.date) = ? AND MONTH(t.date) = ?";
      txParams.push(y, m);
    } else if (period === "year") {
      const y = yearParam || now.getFullYear();
      dateFilter = "AND YEAR(t.date) = ?";
      txParams.push(y);
    } else if (period === "custom") {
      if (dateFrom) { dateFilter += " AND t.date >= ?";                           txParams.push(dateFrom); }
      if (dateTo)   { dateFilter += " AND t.date < DATE_ADD(?, INTERVAL 1 DAY)"; txParams.push(dateTo); }
    }

    const transactions = await query(
      `SELECT t.*,
             a1.name as source_name,
             a2.name as target_name,
             c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a1 ON t.source_account_id = a1.id
      LEFT JOIN accounts a2 ON t.target_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? ${dateFilter}
      ORDER BY t.date DESC
      LIMIT 1000`,
      txParams,
    );

    const categories = await query(
      "SELECT * FROM categories WHERE user_id = ? ORDER BY type, name",
      [userId],
    );

    // For custom range, compute per-account balance as of dateFrom (opening balance of the range)
    let accountsWithPeriodBalance = accounts;
    if (period === "custom" && dateFrom) {
      accountsWithPeriodBalance = await Promise.all(
        accounts.map(async (acc) => {
          const priorRows = await query(
            `SELECT type, amount, source_account_id, target_account_id
             FROM transactions
             WHERE user_id = ? AND (source_account_id = ? OR target_account_id = ?) AND date < ?`,
            [userId, acc.id, acc.id, dateFrom],
          );
          const openingBalance = priorRows.reduce((bal, tx) => {
            if (String(tx.target_account_id) === String(acc.id)) return bal + parseFloat(tx.amount);
            if (String(tx.source_account_id) === String(acc.id)) {
              if (tx.type === "expense") return bal + parseFloat(tx.amount);
              if (tx.type === "transfer") return bal - parseFloat(tx.amount);
            }
            return bal;
          }, parseFloat(acc.initial_balance) || 0);
          return { ...acc, current_balance: openingBalance };
        }),
      );
    }

    const totalBalance = accountsWithPeriodBalance.reduce(
      (sum, acc) => sum + parseFloat(acc.current_balance),
      0,
    );

    return NextResponse.json({
      accounts: accountsWithPeriodBalance,
      transactions,
      categories,
      summary: {
        totalBalance,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
