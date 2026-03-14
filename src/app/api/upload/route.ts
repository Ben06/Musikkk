import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  // Use Vercel Blob if configured (server-side = no CORS issues)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = file.name.split(".").pop() || "bin";
      const pathname = `uploads/${randomUUID()}.${ext}`;
      // 0.27 types only allow access: "public"; our store is private so we pass private at runtime
      const blob = await put(pathname, file, {
        access: "private",
        token,
      } as { access: "public"; token?: string });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      console.error("Blob upload error:", message);
      return NextResponse.json(
        { error: `Blob upload failed: ${message}` },
        { status: 500 }
      );
    }
  }

  // Local file storage fallback for development
  try {
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Local upload failed" }, { status: 500 });
  }
}
