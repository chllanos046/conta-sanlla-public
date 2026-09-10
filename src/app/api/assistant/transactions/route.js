import { NextResponse } from "next/server";
import { requireApiToken } from "@/lib/apiAuth";
import { query, getDefaultCategoryId } from "@/lib/db";

export async function POST(request) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  try {
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

    if (type === "income" && numericAmount <= 0) {
      return NextResponse.json({ error: "Income amount must be positive" }, { status: 400 });
    }
    if (type === "expense" && numericAmount >= 0) {
      return NextResponse.json({ error: "Expense amount must be negative" }, { status: 400 });
    }
    if (type === "transfer" && numericAmount <= 0) {
      return NextResponse.json({ error: "Transfer amount must be positive" }, { status: 400 });
    }
    if (type === "transfer" && source_account_id && target_account_id && !exchange_rate) {
      const [srcRows, tgtRows] = await Promise.all([
        query("SELECT currency FROM accounts WHERE id = ?", [source_account_id]),
        query("SELECT currency FROM accounts WHERE id = ?", [target_account_id]),
      ]);
      const srcCurrency = srcRows[0]?.currency;
      const tgtCurrency = tgtRows[0]?.currency;
      if (srcCurrency && tgtCurrency && srcCurrency !== tgtCurrency) {
        return NextResponse.json(
          { error: `exchange_rate is required for cross-currency transfers (${srcCurrency}→${tgtCurrency})` },
          { status: 400 },
        );
      }
    }

    const resolvedCategoryId = category_id || (await getDefaultCategoryId(type));

    const result = await query(
      "INSERT INTO transactions (type, amount, source_account_id, target_account_id, category_id, date, description, exchange_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [
        type,
        numericAmount,
        source_account_id || null,
        target_account_id || null,
        resolvedCategoryId,
        date,
        description,
        exchange_rate ? parseFloat(exchange_rate) : null,
      ],
    );

    return NextResponse.json(
      { message: "Transaction created", id: result[0].id },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
