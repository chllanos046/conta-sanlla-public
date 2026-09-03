import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { group_id, name, default_amount, active_months, due_day } = await request.json();

    if (!group_id || !name || default_amount == null || !active_months?.length || !due_day)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    await query(
      "UPDATE expense_templates SET group_id = ?, name = ?, default_amount = ?, active_months = ?, due_day = ? WHERE id = ?",
      [group_id, name, parseFloat(default_amount), JSON.stringify(active_months), due_day, id]
    );
    return NextResponse.json({ message: "Template updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await query("DELETE FROM expense_templates WHERE id = ?", [id]);
    return NextResponse.json({ message: "Template deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
