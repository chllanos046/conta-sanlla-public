import { readdirSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".svg"];

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "account-images");
    const files = readdirSync(dir).filter((f) =>
      ALLOWED_EXT.includes(path.extname(f).toLowerCase())
    );
    return NextResponse.json(files.map((f) => `/account-images/${f}`));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
