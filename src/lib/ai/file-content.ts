import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import * as XLSX from "xlsx";
import type { UploadedFileInput } from "@/lib/order-schema";

const uploadRoot = path.resolve(process.cwd(), "storage", "uploads");

function resolveSafe(relativePath: string) {
  const resolved = path.resolve(uploadRoot, relativePath);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) throw new Error("非法文件路径");
  return resolved;
}

export type ImageAttachment = { mimeType: string; dataUrl: string; name: string };

export async function readUploadedFiles(files: UploadedFileInput[]) {
  const textParts: string[] = [];
  const images: ImageAttachment[] = [];

  for (const file of files.slice(0, 12)) {
    const filePath = resolveSafe(file.relativePath);
    try {
      const buffer = await fs.readFile(filePath);
      const lower = file.originalName.toLowerCase();
      if (file.mimeType.startsWith("image/")) {
        images.push({
          name: file.originalName,
          mimeType: file.mimeType,
          dataUrl: `data:${file.mimeType};base64,${buffer.toString("base64")}`,
        });
      } else if (file.mimeType === "application/pdf" || lower.endsWith(".pdf")) {
        const result = await pdf(buffer);
        textParts.push(`【${file.originalName}】\n${result.text.slice(0, 30000)}`);
      } else if (lower.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        textParts.push(`【${file.originalName}】\n${result.value.slice(0, 30000)}`);
      } else if (/\.(xlsx|xls|csv)$/i.test(lower)) {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map(
          (name) => `工作表 ${name}:\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`,
        );
        textParts.push(`【${file.originalName}】\n${sheets.join("\n").slice(0, 30000)}`);
      } else if (file.mimeType.startsWith("text/") || lower.endsWith(".txt")) {
        textParts.push(`【${file.originalName}】\n${buffer.toString("utf8").slice(0, 30000)}`);
      } else {
        textParts.push(`【${file.originalName}】该格式仅作为原始附件保存，未读取正文。`);
      }
    } catch {
      textParts.push(`【${file.originalName}】读取失败，请人工查看原文件。`);
    }
  }

  return { fileText: textParts.join("\n\n").slice(0, 80000), images: images.slice(0, 6) };
}
