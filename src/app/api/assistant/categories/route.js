import { NextResponse } from "next/server";
import { requireApiToken } from "@/lib/apiAuth";
import { query } from "@/lib/db";

export async function GET(request) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  try {
    const categories = await query(
      "SELECT * FROM categories ORDER BY type, name",
      [],
    );
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
