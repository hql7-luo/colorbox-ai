import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo-server";

export const runtime = "nodejs";

const uploadRoot = path.resolve(process.cwd(), "storage", "uploads");
const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".xlsx",
  ".xls",
  ".csv",
  ".doc",
  ".docx",
  ".txt",
]);

function safePath(relativePath: string) {
  const resolved = path.resolve(uploadRoot, relativePath);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) throw new Error("非法文件路径");
  return resolved;
}

export async function POST(request: Request) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "File upload is disabled in the public demo." },
      { status: 403 },
    );
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const sessionId = String(formData.get("sessionId") || randomUUID()).replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    if (!files.length) return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    const maxBytes = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;
    const dir = safePath(sessionId);
    await fs.mkdir(dir, { recursive: true });
    const result = [];
    for (const file of files) {
      const extension = path.extname(file.name).toLowerCase();
      if (!allowedExtensions.has(extension)) throw new Error(`不支持的文件类型：${file.name}`);
      if (file.size > maxBytes)
        throw new Error(`${file.name} 超过 ${process.env.MAX_UPLOAD_MB || 20}MB`);
      const storedName = `${randomUUID()}${extension}`;
      const relativePath = `${sessionId}/${storedName}`;
      await fs.writeFile(safePath(relativePath), Buffer.from(await file.arrayBuffer()));
      result.push({
        originalName: file.name,
        storedName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        relativePath,
        url: `/api/uploads?path=${encodeURIComponent(relativePath)}`,
      });
    }
    return NextResponse.json({ files: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文件上传失败" },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "File access is disabled in the public demo." },
      { status: 403 },
    );
  try {
    const relativePath = new URL(request.url).searchParams.get("path");
    if (!relativePath) return NextResponse.json({ error: "缺少文件路径" }, { status: 400 });
    const filePath = safePath(relativePath);
    const buffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".csv": "text/csv",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": types[extension] || "application/octet-stream",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在或无法读取" }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "File deletion is disabled in the public demo." },
      { status: 403 },
    );
  try {
    const relativePath = new URL(request.url).searchParams.get("path");
    if (!relativePath) return NextResponse.json({ error: "缺少文件路径" }, { status: 400 });
    await fs.unlink(safePath(relativePath));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
