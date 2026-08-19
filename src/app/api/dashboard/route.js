import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calculateAccountBalance } from "@/lib/balanceUtils";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period     = searchParams.get("period") || "month";
    const dateParam  = searchParams.get("date");
    const yearParam  = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const dateFrom   = searchParams.get("dateFrom");
    const dateTo     = searchParams.get("dateTo");

    // Accounts with computed current_balance (all-time), via the shared txContribution model
    const accountRows = await query(
      `SELECT id, name, currency, type, initial_balance, image_path, created_at
       FROM accounts ORDER BY name`,
      [],
    );
    const txForBalance = await query(
      `SELECT t.type, t.amount, t.date, t.source_account_id, t.target_account_id, t.exchange_rate,
              a1.currency as source_currency, a2.currency as target_currency
       FROM transactions t
       LEFT JOIN accounts a1 ON t.source_account_id = a1.id
       LEFT JOIN accounts a2 ON t.target_account_id = a2.id`,
      [],
    );
    const accounts = accountRows.map((acc) => ({
      ...acc,
      current_balance: calculateAccountBalance(acc.initial_balance, txForBalance, acc.id),
    }));

    // Build date filter for period transactions
    const now = new Date();
    let dateFilter = "";
    const txParams = [];

    if (period === "day") {
      const d = dateParam || now.toISOString().split("T")[0];
      dateFilter = "AND t.date >= ? AND t.date < ?::date + 1";
      txParams.push(d, d);
    } else if (period === "month") {
      const y = yearParam  || now.getFullYear();
      const m = monthParam || now.getMonth() + 1;
      dateFilter = "AND EXTRACT(YEAR FROM t.date) = ? AND EXTRACT(MONTH FROM t.date) = ?";
      txParams.push(y, m);
    } else if (period === "year") {
      const y = yearParam || now.getFullYear();
      dateFilter = "AND EXTRACT(YEAR FROM t.date) = ?";
      txParams.push(y);
    } else if (period === "custom") {
      if (dateFrom) { dateFilter += " AND t.date >= ?";                           txParams.push(dateFrom); }
      if (dateTo)   { dateFilter += " AND t.date < ?::date + 1"; txParams.push(dateTo); }
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
      WHERE 1=1 ${dateFilter}
      ORDER BY t.date DESC
      LIMIT 1000`,
      txParams,
    );

    const categories = await query(
      "SELECT * FROM categories ORDER BY type, name",
      [],
    );

    // For custom range, compute per-account balance as of dateFrom (opening balance of the range)
    let accountsWithPeriodBalance = accounts;
    if (period === "custom" && dateFrom) {
      accountsWithPeriodBalance = accounts.map((acc) => ({
        ...acc,
        current_balance: calculateAccountBalance(acc.initial_balance, txForBalance, acc.id, dateFrom),
      }));
    }

    const totalBalance = accountsWithPeriodBalance.reduce(
      (sum, acc) => sum + parseFloat(acc.current_balance),
      0,
    );

    // Previous calendar month totals for % change badges
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1); // first of current month = exclusive end
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStartStr = prevMonthStart.toISOString().split("T")[0];
    const prevMonthEndStr   = prevMonthEnd.toISOString().split("T")[0];

    const [prevMonthRow] = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount       ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount)  ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE date >= ? AND date < ?`,
      [prevMonthStartStr, prevMonthEndStr],
    );

    return NextResponse.json({
      accounts: accountsWithPeriodBalance,
      transactions,
      categories,
      summary: {
        totalBalance,
        transactionCount: transactions.length,
      },
      prevMonthSummary: {
        income:  parseFloat(prevMonthRow.income),
        expense: parseFloat(prevMonthRow.expense),
      },
    });
  } catch (error) {
    console.error("[dashboard]", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
