import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function deleteImageFile(imagePath) {
  if (!imagePath) return;
  try {
    await unlink(path.join(process.cwd(), "public", imagePath));
  } catch {
    // File may not exist — ignore
  }
}

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;

    const rows = await query(
      "SELECT image_path FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (!rows.length)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !file.size)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Invalid file type. Allowed: jpg, png, gif, webp" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    // Delete old image if exists
    await deleteImageFile(rows[0].image_path);

    const ext = file.name.split(".").pop().toLowerCase();
    const fileName = `account_${id}_${Date.now()}.${ext}`;
    const relativePath = `/account-images/${fileName}`;
    const dir = path.join(process.cwd(), "public", "account-images");

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
    await query(
      "UPDATE accounts SET image_path = ? WHERE id = ? AND user_id = ?",
      [relativePath, id, userId],
    );

    return NextResponse.json({ image_path: relativePath });
  } catch {
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;

    const rows = await query(
      "SELECT image_path FROM accounts WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (!rows.length)
      return NextResponse.json({ error: "Account not found" }, { status: 404 });

    await deleteImageFile(rows[0].image_path);
    await query(
      "UPDATE accounts SET image_path = NULL WHERE id = ? AND user_id = ?",
      [id, userId],
    );

    return NextResponse.json({ message: "Image removed" });
  } catch {
    return NextResponse.json({ error: "Failed to remove image" }, { status: 500 });
  }
}
