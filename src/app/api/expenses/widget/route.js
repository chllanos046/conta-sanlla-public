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

    // Start of week (Monday) and end of week (Sunday) in local terms
    const dow = today.getDay(); // 0=Sun
    const daysFromMon = (dow + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - daysFromMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const monStr = mon.toISOString().split("T")[0];
    const sunStr = sun.toISOString().split("T")[0];

    const thisWeek = await query(
      `SELECT i.*, t.name as template_name, g.name as group_name
       FROM expense_instances i
       JOIN expense_templates t ON t.id = i.template_id
       JOIN expense_groups g ON g.id = t.group_id
       WHERE i.due_date BETWEEN ? AND ?
       ORDER BY i.due_date, g.name`,
      [monStr, sunStr]
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
