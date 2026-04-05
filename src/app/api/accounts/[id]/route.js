import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;
    const { name, currency, type, initial_balance, image_path = null } = await request.json();

    const result = await query(
      "UPDATE accounts SET name = ?, currency = ?, type = ?, initial_balance = ?, image_path = ? WHERE id = ? AND user_id = ?",
      [name, currency, type, parseFloat(initial_balance) || 0, image_path, id, userId],
    );

    if (result.affectedRows === 0)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ message: "Account updated" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { id } = await params;

    const result = await query(
      "DELETE FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId],
    );

    if (result.affectedRows === 0)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
