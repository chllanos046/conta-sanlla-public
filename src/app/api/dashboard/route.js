import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calculateRunningBalance } from "@/lib/utils";

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

    // Accounts with balances
    const accounts = await query(
      `
      SELECT id, name, currency, type, balance, image_path
      FROM accounts
      WHERE user_id = ?
      ORDER BY name
    `,
      [userId],
    );

    // Build date filter from absolute params
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
      if (dateFrom) { dateFilter += " AND t.date >= ?";                              txParams.push(dateFrom); }
      if (dateTo)   { dateFilter += " AND t.date < DATE_ADD(?, INTERVAL 1 DAY)";    txParams.push(dateTo); }
    }

    const transactions = await query(
      `
      SELECT t.*,
             a1.name as source_name,
             a2.name as target_name,
             c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a1 ON t.source_account_id = a1.id
      LEFT JOIN accounts a2 ON t.target_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? ${dateFilter}
      ORDER BY t.date DESC
      LIMIT 1000
    `,
      txParams,
    );

    // Categories
    const categories = await query(
      "SELECT * FROM categories WHERE user_id = ? ORDER BY type, name",
      [userId],
    );

    const transactionsWithBalance = calculateRunningBalance(transactions);

    return NextResponse.json({
      accounts,
      transactions: transactionsWithBalance,
      categories,
      summary: {
        totalBalance: accounts.reduce(
          (sum, acc) => sum + parseFloat(acc.balance),
          0,
        ),
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
