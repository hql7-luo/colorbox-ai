import { describe, expect, it } from "vitest";
import { emptyOrderSpec, orderSpecSchema } from "@/lib/order-schema";
import { findMissingFields, findRiskItems, skuQuantityMatches } from "@/lib/rules";
import { deriveStatus, generateCustomerQuestions } from "@/lib/review";

describe("本地审单规则", () => {
  it("检查缺失信息", () => {
    const missing = findMissingFields({ ...emptyOrderSpec, paperType: "白卡纸" });
    expect(missing.map((item) => item.code)).toContain("MISSING_VALID_QUANTITY");
    expect(missing.map((item) => item.code)).toContain("MISSING_FINISHED_SIZE");
    expect(missing.map((item) => item.code)).toContain("MISSING_PAPER_WEIGHT");
  });

  it("检查烫金、开窗和刀模风险", () => {
    const spec = orderSpecSchema.parse({
      ...emptyOrderSpec,
      quantity: 500,
      finishes: ["GOLD_FOIL", "WINDOW_CUTOUT"],
      dieCut: true,
      dielineReceived: false,
    });
    const risks = findRiskItems(spec);
    expect(risks.some((risk) => risk.code === "FOIL_POSITION_UNKNOWN")).toBe(true);
    expect(risks.some((risk) => risk.code === "WINDOW_POSITION_UNKNOWN")).toBe(true);
    expect(
      risks.some(
        (risk) => risk.severity === "CONFIRMATION_REQUIRED" && risk.code === "DIELINE_NOT_FINAL",
      ),
    ).toBe(true);
  });

  it("正确计算 SKU 数量", () => {
    expect(
      skuQuantityMatches({ quantity: 10000, skuCount: 3, quantityPerSku: "5000 / 3000 / 2000" }),
    ).toBe(true);
    expect(
      skuQuantityMatches({ quantity: 10000, skuCount: 2, quantityPerSku: "5000 / 3000" }),
    ).toBe(false);
  });

  it("状态按流程变化", () => {
    expect(deriveStatus("uploaded")).toBe("PENDING_EXTRACTION");
    expect(deriveStatus("extracted")).toBe("PENDING_CONFIRMATION");
    expect(deriveStatus("reviewed", [{ code: "MISSING_FINISHED_SIZE" }], [])).toBe("RISK_FOUND");
    expect(deriveStatus("reviewed", [], [])).toBe("COMPLETED");
  });

  it("生成简洁中英文客户问题", () => {
    const questions = generateCustomerQuestions([
      { code: "MISSING_FINISHED_SIZE" },
      { code: "MISSING_PANTONE" },
    ]);
    expect(questions.zh[0]).toContain("长、宽、高");
    expect(questions.en[0]).toContain("L × W × H");
    expect(questions.en[1]).toContain("Pantone");
  });
});
