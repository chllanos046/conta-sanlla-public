import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { calcDueDate } from "@/lib/dueDate";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { year } = await request.json();
    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      return NextResponse.json({ error: "A valid year is required" }, { status: 400 });

    // Templates active in each month of the year, excluding months before the template existed
    const eligible = await query(
      `SELECT t.id, t.default_amount, t.due_day, m::int AS month
       FROM expense_templates t, jsonb_array_elements(t.active_months::jsonb) m
       WHERE t.created_at <= (make_date(?, m::int, 1) + INTERVAL '1 month' - INTERVAL '1 day')`,
      [year]
    );

    if (!eligible.length)
      return NextResponse.json({ total: 0 });

    const placeholders = [];
    const values = [];
    for (const row of eligible) {
      const dueDate = await calcDueDate(year, row.month, row.due_day);
      placeholders.push("(?, ?, ?, ?, ?)");
      values.push(row.id, year, row.month, dueDate, row.default_amount);
    }

    const result = await query(
      `INSERT INTO expense_instances (template_id, year, month, due_date, amount)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (template_id, year, month) DO UPDATE
         SET amount = EXCLUDED.amount, due_date = EXCLUDED.due_date
         WHERE expense_instances.paid = false
       RETURNING (xmax = 0) AS inserted`,
      values
    );

    const created = result.filter((r) => r.inserted).length;
    return NextResponse.json({ total: eligible.length, created, updated: result.length - created });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate instances" }, { status: 500 });
  }
}
