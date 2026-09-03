import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groups = await query(
      "SELECT * FROM expense_groups ORDER BY name",
      []
    );
    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await request.json();
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    const result = await query(
      "INSERT INTO expense_groups (name) VALUES (?) RETURNING id",
      [name]
    );
    return NextResponse.json({ id: result[0].id, name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
