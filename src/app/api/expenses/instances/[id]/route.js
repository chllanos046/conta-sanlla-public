import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { paid, paid_date, amount, transaction_id } = await request.json();

    const fields = [];
    const values = [];

    if (paid !== undefined) { fields.push("paid = ?"); values.push(Boolean(paid)); }
    if (paid_date !== undefined) { fields.push("paid_date = ?"); values.push(paid_date || null); }
    if (amount !== undefined) { fields.push("amount = ?"); values.push(parseFloat(amount)); }
    if (transaction_id !== undefined) { fields.push("transaction_id = ?"); values.push(transaction_id || null); }

    if (!fields.length)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    values.push(id);
    await query(
      `UPDATE expense_instances SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return NextResponse.json({ message: "Instance updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update instance" }, { status: 500 });
  }
}
