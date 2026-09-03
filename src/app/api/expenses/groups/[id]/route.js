import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { name } = await request.json();
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    await query("UPDATE expense_groups SET name = ? WHERE id = ?", [name, id]);
    return NextResponse.json({ message: "Group updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await query("DELETE FROM expense_groups WHERE id = ?", [id]);
    return NextResponse.json({ message: "Group deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
