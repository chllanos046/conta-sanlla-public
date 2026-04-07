import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const { email, name, code } = await request.json();

    if (!email || !name || !code) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, code" },
        { status: 400 },
      );
    }

    if (code !== "CONTASANLLA") {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
    }

    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 200 });
    }

    await query(
      "INSERT INTO users (email, password, name) VALUES (?, NULL, ?)",
      [email, name],
    );

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
