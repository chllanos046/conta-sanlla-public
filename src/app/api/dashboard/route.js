import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calculateAllAccountBalances } from "@/lib/balanceUtils";

// Route runs 7 queries in parallel; give it headroom past Vercel's default timeout.
export const maxDuration = 30;

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
    const limit      = parseInt(searchParams.get("limit"), 10) || 10;
    const offset     = parseInt(searchParams.get("offset"), 10) || 0;

    // Build date filter using range comparisons so idx_transactions_date is used
    const now = new Date();
    let dateFilter = "";
    const txParams = [];

    if (period === "day") {
      const d = dateParam || now.toISOString().split("T")[0];
      dateFilter = "AND t.date >= ? AND t.date < ?::date + 1";
      txParams.push(d, d);
    } else if (period === "month") {
      const y = parseInt(yearParam) || now.getFullYear();
      const m = parseInt(monthParam) || (now.getMonth() + 1);
      const start = new Date(y, m - 1, 1).toISOString().split("T")[0];
      const end   = new Date(y, m,     1).toISOString().split("T")[0];
      dateFilter = "AND t.date >= ? AND t.date < ?";
      txParams.push(start, end);
    } else if (period === "year") {
      const y = parseInt(yearParam) || now.getFullYear();
      dateFilter = "AND t.date >= ? AND t.date < ?";
      txParams.push(`${y}-01-01`, `${y + 1}-01-01`);
    } else if (period === "custom") {
      if (dateFrom) { dateFilter += " AND t.date >= ?";              txParams.push(dateFrom); }
      if (dateTo)   { dateFilter += " AND t.date < ?::date + 1";    txParams.push(dateTo);   }
    }

    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStartStr = prevMonthStart.toISOString().split("T")[0];
    const prevMonthEndStr   = prevMonthEnd.toISOString().split("T")[0];

    const fullTxSel = `
      SELECT t.*, a1.name as source_name, a2.name as target_name, c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a1 ON t.source_account_id = a1.id
      LEFT JOIN accounts a2 ON t.target_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id`;

    const [
      accountRows,
      txForBalance,
      transactions,
      countRows,
      chartTransactions,
      categories,
      prevMonthRows,
    ] = await Promise.all([
      query(`SELECT id, name, currency, type, initial_balance, image_path, created_at FROM accounts ORDER BY name`, []),
      query(`SELECT t.type, t.amount, t.date, t.source_account_id, t.target_account_id, t.exchange_rate,
                    a1.currency as source_currency, a2.currency as target_currency
             FROM transactions t
             LEFT JOIN accounts a1 ON t.source_account_id = a1.id
             LEFT JOIN accounts a2 ON t.target_account_id = a2.id`, []),
      query(`${fullTxSel} WHERE 1=1 ${dateFilter} ORDER BY t.date DESC LIMIT ? OFFSET ?`, [...txParams, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM transactions t WHERE 1=1 ${dateFilter}`, txParams),
      query(`SELECT t.date, t.type, t.amount, t.exchange_rate,
                    t.source_account_id, t.target_account_id, t.category_id,
                    c.name as category_name
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE 1=1 ${dateFilter} AND t.type IN ('income', 'expense')
             ORDER BY t.date`, txParams),
      query(`SELECT * FROM categories ORDER BY type, name`, []),
      query(`SELECT COALESCE(SUM(CASE WHEN type = 'income'  THEN amount      ELSE 0 END), 0) AS income,
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END), 0) AS expense
             FROM transactions WHERE date >= ? AND date < ?`, [prevMonthStartStr, prevMonthEndStr]),
    ]);

    const total = parseInt(countRows[0]?.total, 10) || 0;

    const balances = calculateAllAccountBalances(accountRows, txForBalance);
    const accounts = accountRows.map((acc) => ({
      ...acc,
      current_balance: balances[String(acc.id)],
    }));

    let accountsWithPeriodBalance = accounts;
    if (period === "custom" && dateFrom) {
      const periodBalances = calculateAllAccountBalances(accountRows, txForBalance, dateFrom);
      accountsWithPeriodBalance = accounts.map((acc) => ({
        ...acc,
        current_balance: periodBalances[String(acc.id)],
      }));
    }

    const totalBalance = accountsWithPeriodBalance.reduce(
      (sum, acc) => sum + parseFloat(acc.current_balance),
      0,
    );

    const prevMonthRow = prevMonthRows[0];

    return NextResponse.json({
      accounts: accountsWithPeriodBalance,
      transactions,
      chartTransactions,
      categories,
      summary: {
        totalBalance,
        total,
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
