import { describe, expect, it } from "vitest";
import { emptyOrderSpec, orderSpecSchema } from "@/lib/order-schema";
import { buildExcelRows } from "@/lib/export";
import { buildReviewSheet, reviewOrder } from "@/lib/review";
import { buildDemoClientOrder, getDemoOrder } from "@/lib/demo-orders";
import * as XLSX from "xlsx";

const spec = orderSpecSchema.parse({
  ...emptyOrderSpec,
  customerName: "测试客户",
  productName: "折叠彩盒",
  quantity: 1000,
  skuCount: 1,
  length: 100,
  width: 60,
  height: 30,
  boxType: "反插盒",
  paperType: "白卡纸",
  paperWeight: 350,
  printingMethod: "胶印",
  finishes: ["MATTE_LAMINATION"],
});

describe("输出生成", () => {
  it("round-trips a bilingual production workbook and keeps customer input as text", () => {
    const customerSpec = { ...spec, customerName: "=1+1 测试客户" };
    const rows = buildExcelRows("CBX-TEST-001", customerSpec, [], [], {}, "en");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Production Review");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const parsed = XLSX.read(buffer, { type: "buffer" });
    const sheet = parsed.Sheets["Production Review"];
    const exportedRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    expect(exportedRows).toContainEqual(["Customer", customerSpec.customerName]);
    expect(exportedRows).toContainEqual(["Order Quantity", 1000]);
    expect(sheet.B3.t).toBe("s");
    expect(sheet.B3.f).toBeUndefined();
  });

  it("统一 Demo 可生成有实际价值的审单结果", () => {
    const demo = getDemoOrder("folding-carton");
    expect(demo).toBeDefined();
    const order = buildDemoClientOrder(demo!, "zh");
    expect(order.missingFields).toHaveLength(4);
    expect(order.riskItems.length).toBeGreaterThanOrEqual(2);
    expect(order.reviewSheet).toContain("DEMO-CBX-001");
  });
  it("生成中文生产评审单", () => {
    const sheet = buildReviewSheet("CBX-TEST-001", spec, [], [], { salesperson: "小林" });
    expect(sheet).toContain("彩盒生产评审单");
    expect(sheet).toContain("CBX-TEST-001");
    expect(sheet).toContain("100 × 60 × 30 mm");
  });

  it("生成英文生产评审单", () => {
    const sheet = buildReviewSheet(
      "CBX-TEST-001",
      spec,
      [{ code: "MISSING_PACKING_METHOD" }],
      [],
      { salesperson: "Linda" },
      "en",
    );
    expect(sheet).toContain("Packaging Production Review Sheet");
    expect(sheet).toContain("packing method has not been provided");
  });

  it("生成完整审单摘要", () => {
    const result = reviewOrder(spec, "CBX-TEST-001");
    expect(result.internalSummary).toContain("测试客户");
    expect(result.customerQuestions.zh.length).toBeGreaterThan(0);
  });

  it("生成 Excel 二维数据", () => {
    const rows = buildExcelRows(
      "CBX-TEST-001",
      spec,
      [{ code: "MISSING_PACKING_METHOD" }],
      [],
      { reviewer: "测试员" },
      "zh",
    );
    expect(rows[0][0]).toBe("彩盒生产评审单");
    expect(rows.find((row) => row[0] === "客户名称")?.[1]).toBe("测试客户");
    expect(rows.find((row) => row[0] === "缺失信息")?.[1]).toContain("包装");
  });

  it("生成英文 Excel 二维数据", () => {
    const rows = buildExcelRows(
      "CBX-TEST-001",
      spec,
      [{ code: "MISSING_PACKING_METHOD" }],
      [{ code: "FOIL_POSITION_UNKNOWN", severity: "IMPORTANT" }],
      { reviewer: "Alex" },
      "en",
    );
    expect(rows[0][0]).toBe("Packaging Production Review Sheet");
    expect(rows.find((row) => row[0] === "Customer")?.[1]).toBe("测试客户");
    expect(rows.find((row) => row[0] === "Missing Information")?.[1]).toContain("packing");
  });
});
