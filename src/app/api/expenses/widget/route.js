import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthEnd = `${todayStr.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;

    const thisWeek = await query(
      `SELECT i.*, t.name as template_name, g.name as group_name
       FROM expense_instances i
       JOIN expense_templates t ON t.id = i.template_id
       JOIN expense_groups g ON g.id = t.group_id
       WHERE i.due_date BETWEEN ? AND ? AND i.paid = FALSE
       ORDER BY i.due_date, g.name`,
      [todayStr, monthEnd]
    );

    const overdue = await query(
      `SELECT i.*, t.name as template_name, g.name as group_name
       FROM expense_instances i
       JOIN expense_templates t ON t.id = i.template_id
       JOIN expense_groups g ON g.id = t.group_id
       WHERE i.due_date < ? AND i.paid = FALSE
       ORDER BY i.due_date DESC, g.name`,
      [todayStr]
    );

    return NextResponse.json({ thisWeek, overdue });
  } catch {
    return NextResponse.json({ error: "Failed to fetch widget data" }, { status: 500 });
  }
}
