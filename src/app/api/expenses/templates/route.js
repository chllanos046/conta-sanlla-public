import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const templates = await query(
      `SELECT t.*, g.name as group_name
       FROM expense_templates t
       JOIN expense_groups g ON g.id = t.group_id
       ORDER BY g.name, t.name`,
      []
    );
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { group_id, name, default_amount, active_months, due_day } = await request.json();

    if (!group_id || !name || default_amount == null || !active_months?.length || !due_day)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const result = await query(
      "INSERT INTO expense_templates (group_id, name, default_amount, active_months, due_day) VALUES (?, ?, ?, ?, ?) RETURNING id",
      [group_id, name, parseFloat(default_amount), JSON.stringify(active_months), due_day]
    );
    return NextResponse.json({ id: result[0].id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
