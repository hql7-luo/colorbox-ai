import { NextResponse } from "next/server";
import { z } from "zod";
import { extractOrder } from "@/lib/ai/service";
import { uploadedFileSchema } from "@/lib/order-schema";
import { isLanguage, translate, type Language } from "@/i18n";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo-server";

export const runtime = "nodejs";

const inputSchema = z.object({
  sourceText: z.string().default(""),
  customerName: z.string().optional(),
  files: z.array(uploadedFileSchema).default([]),
  language: z.enum(["zh", "en"]).default("zh"),
});

export async function POST(request: Request) {
  let language: Language = "zh";
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && isLanguage((raw as { language?: unknown }).language))
      language = (raw as { language: Language }).language;
    const parsed = inputSchema.parse(raw);
    const input = PUBLIC_DEMO_MODE ? { ...parsed, files: [] } : parsed;
    if (!input.sourceText.trim() && input.files.length === 0) {
      return NextResponse.json(
        { error: translate(language, "error.intakeRequired") },
        { status: 400 },
      );
    }
    return NextResponse.json(await extractOrder(input));
  } catch {
    return NextResponse.json({ error: translate(language, "error.extract") }, { status: 400 });
  }
}
