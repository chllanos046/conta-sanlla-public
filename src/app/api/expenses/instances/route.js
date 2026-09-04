import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"));
    const month = parseInt(searchParams.get("month"));

    if (!year || !month || month < 1 || month > 12)
      return NextResponse.json({ error: "year and month (1-12) are required" }, { status: 400 });

    // Return all instances for this month, enriched with template + group data
    const instances = await query(
      `SELECT i.*,
              t.name as template_name, t.due_day,
              g.id as group_id, g.name as group_name
       FROM expense_instances i
       JOIN expense_templates t ON t.id = i.template_id
       JOIN expense_groups g ON g.id = t.group_id
       WHERE i.year = ? AND i.month = ?
       ORDER BY g.name, t.name`,
      [year, month]
    );

    // Group by group_id
    const grouped = {};
    for (const inst of instances) {
      if (!grouped[inst.group_id]) {
        grouped[inst.group_id] = { group_id: inst.group_id, group_name: inst.group_name, instances: [] };
      }
      grouped[inst.group_id].instances.push(inst);
    }

    return NextResponse.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
  }
}
