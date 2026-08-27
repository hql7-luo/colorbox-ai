import { PrismaClient } from "@prisma/client";
import { DEMO_ORDERS, buildDemoClientOrder } from "../src/lib/demo-orders";
import { orderSpecSchema } from "../src/lib/order-schema";
import { normalizeConfidenceRecord, normalizeSpec } from "../src/lib/legacy";
import { normalizeOrderStatus } from "../src/lib/order-status";
import { reviewOrder } from "../src/lib/review";

const prisma = new PrismaClient();

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

  for (const demo of DEMO_ORDERS) {
    const order = buildDemoClientOrder(demo, "zh");
    const data = {
      isDemo: true,
      customerName: order.customerName,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      salesperson: order.salesperson,
      sourceText: order.sourceText,
      internalNotes: order.internalNotes,
      specJson: JSON.stringify(order.spec),
      confidenceJson: JSON.stringify(order.confidence),
      missingJson: JSON.stringify(order.missingFields),
      risksJson: JSON.stringify(order.riskItems),
      questionsZhJson: JSON.stringify(order.customerQuestions.zh),
      questionsEnJson: JSON.stringify(order.customerQuestions.en),
      internalSummary: order.internalSummary,
      reviewSheet: order.reviewSheet,
      reviewer: order.reviewer,
    };
    const stored = await prisma.order.upsert({
      where: { orderNo: demo.orderNo },
      update: data,
      create: { orderNo: demo.orderNo, ...data },
    });
    await prisma.uploadFile.deleteMany({ where: { orderId: stored.id } });
    if (demo.files.length) {
      await prisma.uploadFile.createMany({
        data: demo.files.map((file) => ({
          orderId: stored.id,
          originalName: file.originalName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          size: file.size,
          relativePath: file.relativePath,
        })),
      });
    }
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
