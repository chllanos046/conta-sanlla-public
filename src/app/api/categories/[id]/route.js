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
    const { name, type } = await request.json();

    const result = await query(
      "UPDATE categories SET name = ?, type = ? WHERE id = ? AND user_id = ?",
      [name, type, id, userId],
    );

    if (result.affectedRows === 0)
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Category updated" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update category" },
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
      "DELETE FROM categories WHERE id = ? AND user_id = ?",
      [id, userId],
    );

    if (result.affectedRows === 0)
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
