import { unlink } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { emptyOrderSpec } from "@/lib/order-schema";

const orderNo = `TEST-${Date.now()}`;

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderNo" TEXT NOT NULL,
      "isDemo" BOOLEAN NOT NULL DEFAULT false,
      "customerName" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "quantity" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'PENDING_EXTRACTION',
      "salesperson" TEXT,
      "sourceText" TEXT,
      "internalNotes" TEXT,
      "specJson" TEXT NOT NULL,
      "confidenceJson" TEXT NOT NULL DEFAULT '{}',
      "missingJson" TEXT NOT NULL DEFAULT '[]',
      "risksJson" TEXT NOT NULL DEFAULT '[]',
      "questionsZhJson" TEXT NOT NULL DEFAULT '[]',
      "questionsEnJson" TEXT NOT NULL DEFAULT '[]',
      "internalSummary" TEXT,
      "reviewSheet" TEXT,
      "reviewer" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo")`,
  );
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNo: { startsWith: "TEST-" } } });
  await prisma.$disconnect();
  const databasePath = process.env.DATABASE_URL?.replace(/^file:/, "");
  if (databasePath) await unlink(databasePath).catch(() => undefined);
});

describe("SQLite 数据库", () => {
  it("创建并读取订单字段", async () => {
    await prisma.order.create({
      data: {
        orderNo,
        customerName: "数据库测试客户",
        productName: "测试彩盒",
        quantity: 2500,
        status: "PENDING_CONFIRMATION",
        specJson: JSON.stringify({
          ...emptyOrderSpec,
          customerName: "数据库测试客户",
          productName: "测试彩盒",
          quantity: 2500,
        }),
      },
    });
    const stored = await prisma.order.findUnique({ where: { orderNo } });
    expect(stored?.customerName).toBe("数据库测试客户");
    expect(stored?.quantity).toBe(2500);
    expect(stored?.status).toBe("PENDING_CONFIRMATION");
    expect(JSON.parse(stored?.specJson || "{}").productName).toBe("测试彩盒");
  });
});
