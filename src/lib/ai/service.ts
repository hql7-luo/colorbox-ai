import { aiOutputSchema, type AiOutput, type UploadedFileInput } from "@/lib/order-schema";
import { reviewOrder } from "@/lib/review";
import type { Language, TranslationKey } from "@/i18n";
import { readUploadedFiles } from "@/lib/ai/file-content";
import { extractWithLocalRules } from "@/lib/ai/local-extractor";
import { buildExtractionPrompt, buildSystemPrompt } from "@/lib/ai/prompt";

export function getAiConfigStatus() {
  return {
    configured: Boolean(process.env.AI_API_KEY),
    baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "",
  };
}

function parseModelJson(raw: string) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned) as unknown;
}

export async function extractOrder(input: {
  sourceText: string;
  customerName?: string;
  files?: UploadedFileInput[];
  language?: Language;
}): Promise<{
  mode: "ai" | "local";
  output: AiOutput;
  noticeCode: TranslationKey;
}> {
  const language = input.language || "zh";
  const { fileText, images } = await readUploadedFiles(input.files ?? []);
  const combinedText = [input.sourceText, fileText].filter(Boolean).join("\n\n");

  if (!process.env.AI_API_KEY) {
    return {
      mode: "local",
      output: extractWithLocalRules(combinedText, input.customerName, language),
      noticeCode: "notice.localMode",
    };
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: buildExtractionPrompt(input.sourceText, fileText, language) },
    ...images.map((image) => ({
      type: "image_url",
      image_url: { url: image.dataUrl, detail: "high" },
    })),
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(language) },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI 接口返回 ${response.status}`);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("AI 未返回内容");
    const parsed = aiOutputSchema.parse(parseModelJson(raw));
    const reviewed = reviewOrder(parsed.extractedFields, "PENDING", {}, language);
    return {
      mode: "ai",
      output: {
        ...parsed,
        missingFields: reviewed.missingFields,
        riskItems: reviewed.riskItems,
        customerQuestions: reviewed.customerQuestions,
        internalSummary: reviewed.internalSummary,
      },
      noticeCode: "notice.aiComplete",
    };
  } catch {
    return {
      mode: "local",
      output: extractWithLocalRules(combinedText, input.customerName, language),
      noticeCode: "notice.aiFallback",
    };
  }
}
