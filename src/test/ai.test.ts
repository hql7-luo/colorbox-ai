import { afterEach, describe, expect, it } from "vitest";
import { aiOutputSchema, emptyOrderSpec } from "@/lib/order-schema";
import { extractOrder } from "@/lib/ai/service";

const previousKey = process.env.AI_API_KEY;

afterEach(() => {
  if (previousKey) process.env.AI_API_KEY = previousKey;
  else delete process.env.AI_API_KEY;
});

describe("AI 输出验证与降级", () => {
  it("接受完整统一 JSON 结构", () => {
    const result = aiOutputSchema.safeParse({
      extractedFields: emptyOrderSpec,
      missingFields: [{ code: "MISSING_VALID_QUANTITY" }],
      riskItems: [{ code: "SMALL_ORDER_SETUP_COST", severity: "REMINDER" }],
      customerQuestions: { zh: ["请确认数量。"], en: ["Please confirm the quantity."] },
      internalSummary: "数量待确认。",
      confidence: { quantity: "UNKNOWN" },
    });
    expect(result.success).toBe(true);
  });

  it("拒绝非法风险等级", () => {
    const result = aiOutputSchema.safeParse({
      extractedFields: emptyOrderSpec,
      missingFields: [],
      riskItems: [{ code: "SMALL_ORDER_SETUP_COST", severity: "IMPOSSIBLE" }],
      customerQuestions: { zh: [], en: [] },
      internalSummary: "",
      confidence: {},
    });
    expect(result.success).toBe(false);
  });

  it("无 API Key 时可正常运行并使用本地规则", async () => {
    delete process.env.AI_API_KEY;
    const result = await extractOrder({
      customerName: "Test Customer",
      sourceText: "数量: 5000，尺寸 100 x 60 x 30 mm，350gsm 白卡，CMYK，哑膜",
      files: [],
    });
    expect(result.mode).toBe("local");
    expect(result.output.extractedFields.quantity).toBe(5000);
    expect(result.output.extractedFields.paperWeight).toBe(350);
    expect(result.noticeCode).toBe("notice.localMode");
  });

  it("将当前界面语言传入无 AI 提取模式", async () => {
    delete process.env.AI_API_KEY;
    const result = await extractOrder({
      sourceText: "Need 500 folding boxes, size 100 x 60 x 30 mm.",
      language: "en",
    });
    expect(result.output.internalSummary).toContain("missing items");
  });
});
