import { PrismaClient } from "@prisma/client";
import { orderSpecSchema, type Confidence } from "../src/lib/order-schema";
import { normalizeConfidenceRecord, normalizeSpec } from "../src/lib/legacy";
import { normalizeOrderStatus } from "../src/lib/order-status";
import { deriveStatus, reviewOrder } from "../src/lib/review";

const prisma = new PrismaClient();

const demos = [
  {
    orderNo: "DEMO-CBX-001",
    customerName: "Nova Beauty Co.",
    productName: "Cosmetic Folding Carton",
    salesperson: "Demo Sales",
    sourceText: `Demo data only. Nova Beauty Co. needs 10,000 folding cartons for a skincare serum. Finished size 45 x 45 x 120 mm. 350gsm SBS, CMYK outside, matte lamination and gold foil logo. 2 SKUs, artwork attached. Delivery requested to Los Angeles around 2026-09-18. Please use the supplied dieline if workable.`,
    notes:
      "Demo data — no real customer information. Quantity per SKU, foil position, carton quantity and final artwork status need confirmation.",
    spec: {
      customerName: "Nova Beauty Co.",
      productName: "Cosmetic Folding Carton",
      productType: "折叠彩盒",
      quantity: 10000,
      skuCount: 2,
      quantityPerSku: "",
      deliveryDate: "2026-09-18",
      destination: "美国洛杉矶",
      tradeTerm: "FOB Shenzhen",
      boxType: "反插口折叠盒",
      length: 45,
      width: 45,
      height: 120,
      dielineStatus: "客户刀模待工程确认",
      usesCustomerDieline: true,
      needsNewDieline: null,
      paperType: "单粉白卡",
      paperWeight: 350,
      printingMethod: "胶印",
      frontColors: "CMYK",
      cmyk: true,
      finishes: ["MATTE_LAMINATION", "GOLD_FOIL"],
      foilColor: "金色",
      foilPosition: "",
      dieCut: true,
      creasing: true,
      gluing: true,
      packagingMethod: "出口纸箱",
      designReceived: true,
      dielineReceived: true,
      fileFormat: "PDF / AI",
      finalArtwork: null,
      colorConfirmed: null,
      processPositionConfirmed: null,
    },
  },
  {
    orderNo: "DEMO-CBX-002",
    customerName: "Northstar Home",
    productName: "Corrugated Retail Box",
    salesperson: "Demo Sales",
    sourceText: `Demo data only. Northstar Home needs 3,000 corrugated retail boxes for a small kitchen appliance, size 320 × 210 × 185 mm. E flute with printed paper mounted outside, full-color printing and water-based varnish. One SKU. The dieline is not ready. Target delivery: 30 September 2026, Hamburg.`,
    notes:
      "Demo data — no real customer information. Face-paper weight, packing method and final file status need confirmation.",
    spec: {
      customerName: "Northstar Home",
      productName: "Corrugated Retail Box",
      productType: "瓦楞彩盒",
      quantity: 3000,
      skuCount: 1,
      deliveryDate: "2026-09-30",
      destination: "德国汉堡",
      tradeTerm: "FOB Shenzhen",
      boxType: "瓦楞飞机盒",
      length: 320,
      width: 210,
      height: 185,
      dielineStatus: "未提供",
      usesCustomerDieline: false,
      needsNewDieline: true,
      paperType: "白卡面纸",
      paperWeight: null,
      corrugatedType: "E 楞",
      mountingRequirement: "彩印面纸裱 E 楞",
      printingMethod: "胶印",
      frontColors: "CMYK",
      cmyk: true,
      finishes: ["AQUEOUS_COATING"],
      dieCut: true,
      creasing: true,
      gluing: false,
      mounting: true,
      packagingMethod: "",
      designReceived: false,
      dielineReceived: false,
      fileFormat: "待提供",
      finalArtwork: false,
    },
  },
  {
    orderNo: "DEMO-CBX-003",
    customerName: "Lumière Fragrance",
    productName: "Rigid Gift Box",
    salesperson: "Demo Sales",
    sourceText: `Demo data only. Lumière Fragrance is preparing 600 rigid gift boxes for a fragrance launch. Lid-and-base style, 180 × 120 × 65 mm. 1200gsm greyboard wrapped with 157gsm art paper, CMYK plus a Pantone brand blue, matte lamination, silver foil and an embossed logo. Black EVA insert. Three artwork versions. Delivery requested to Paris before 15 October 2026.`,
    notes:
      "Demo data — no real customer information. Pantone reference, foil position, quantity per SKU and packing method need confirmation.",
    spec: {
      customerName: "Lumière Fragrance",
      productName: "Rigid Gift Box",
      productType: "精品礼盒",
      quantity: 600,
      skuCount: 3,
      quantityPerSku: "",
      deliveryDate: "2026-10-15",
      destination: "法国巴黎",
      tradeTerm: "FOB Shenzhen",
      boxType: "天地盖",
      length: 180,
      width: 120,
      height: 65,
      dielineStatus: "待客户提供",
      needsNewDieline: true,
      paperType: "157gsm 铜版纸裱 1200gsm 灰板",
      paperWeight: 157,
      materialSpecialRequirement: "灰板 1200gsm",
      printingMethod: "胶印",
      frontColors: "CMYK + 1 Pantone",
      cmyk: true,
      pantone: "待提供",
      fileVersionCount: 3,
      multipleSkusGangRun: null,
      finishes: ["MATTE_LAMINATION", "SILVER_FOIL", "EMBOSSING"],
      foilColor: "银色",
      foilPosition: "",
      dieCut: true,
      creasing: true,
      manualAssembly: true,
      insert: "黑色 EVA",
      packagingMethod: "",
      designReceived: true,
      dielineReceived: false,
      fileFormat: "PDF",
      finalArtwork: null,
    },
  },
];

async function main() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "ColorBox Demo Workspace",
      defaultSalesperson: "Demo Sales",
      defaultTradeTerm: "FOB Shenzhen",
      defaultLanguage: "中文",
    },
  });
  for (const demo of demos) {
    const spec = orderSpecSchema.parse(demo.spec);
    const reviewed = reviewOrder(spec, demo.orderNo, {
      salesperson: demo.salesperson,
      notes: demo.notes,
      reviewer: "Demo Reviewer",
      createdAt: "2026-08-01 09:00",
    });
    const confidence: Record<string, Confidence> = {};
    for (const [key, value] of Object.entries(spec))
      confidence[key] =
        value === null || value === "" || (Array.isArray(value) && !value.length)
          ? "UNKNOWN"
          : "HIGH";
    const data = {
      isDemo: true,
      customerName: demo.customerName,
      productName: demo.productName,
      quantity: spec.quantity,
      status: deriveStatus("reviewed", reviewed.missingFields, reviewed.riskItems),
      salesperson: demo.salesperson,
      sourceText: demo.sourceText,
      internalNotes: demo.notes,
      specJson: JSON.stringify(spec),
      confidenceJson: JSON.stringify(confidence),
      missingJson: JSON.stringify(reviewed.missingFields),
      risksJson: JSON.stringify(reviewed.riskItems),
      questionsZhJson: JSON.stringify(reviewed.customerQuestions.zh),
      questionsEnJson: JSON.stringify(reviewed.customerQuestions.en),
      internalSummary: reviewed.internalSummary,
      reviewSheet: reviewed.reviewSheet,
      reviewer: "Demo Reviewer",
    };
    await prisma.order.upsert({
      where: { orderNo: demo.orderNo },
      update: data,
      create: {
        orderNo: demo.orderNo,
        ...data,
      },
    });
  }

  // Backfill legacy localized values so database records remain language-neutral.
  const storedOrders = await prisma.order.findMany();
  for (const stored of storedOrders) {
    try {
      const rawSpec = JSON.parse(stored.specJson) as Record<string, unknown>;
      const spec = orderSpecSchema.parse(normalizeSpec(rawSpec));
      const confidence = normalizeConfidenceRecord(JSON.parse(stored.confidenceJson));
      const reviewed = reviewOrder(
        spec,
        stored.orderNo,
        {
          salesperson: stored.salesperson || "",
          notes: stored.internalNotes || "",
          reviewer: stored.reviewer || "",
          createdAt: stored.createdAt.toISOString(),
        },
        "zh",
      );
      await prisma.order.update({
        where: { id: stored.id },
        data: {
          status: normalizeOrderStatus(stored.status),
          specJson: JSON.stringify(spec),
          confidenceJson: JSON.stringify(confidence),
          missingJson: JSON.stringify(reviewed.missingFields),
          risksJson: JSON.stringify(reviewed.riskItems),
          questionsZhJson: JSON.stringify(reviewed.customerQuestions.zh),
          questionsEnJson: JSON.stringify(reviewed.customerQuestions.en),
          internalSummary: reviewed.internalSummary,
          reviewSheet: reviewed.reviewSheet,
        },
      });
    } catch (error) {
      console.warn(`Skipped legacy order ${stored.orderNo}:`, error);
    }
  }
}

main().finally(async () => prisma.$disconnect());
