import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    const { email, password, name, invite_code } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name" },
        { status: 400 },
      );
    }

    if (invite_code !== "CONTASANLLA") {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 403 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [
      email,
      hashedPassword,
      name,
    ]);

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
