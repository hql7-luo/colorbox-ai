import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrderNo, fileCreateData, serializeOrder } from "@/lib/orders";
import { orderInputSchema } from "@/lib/order-schema";
import { deriveStatus, reviewOrder } from "@/lib/review";
import { formatDateTime } from "@/i18n";
import { normalizeOrderStatus, statusStorageValues } from "@/lib/order-status";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo-server";
import { getDemoClientOrders } from "@/lib/demo-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "";
  const customer = searchParams.get("customer") || "";
  if (PUBLIC_DEMO_MODE) {
    const normalizedSearch = search.toLocaleLowerCase();
    const demoOrders = getDemoClientOrders().filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        [order.orderNo, order.customerName, order.productName].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        );
      return (
        matchesSearch &&
        (!status || order.status === status) &&
        (!customer || order.customerName === customer)
      );
    });
    return NextResponse.json({
      orders: demoOrders,
      customers: getDemoClientOrders()
        .map((order) => order.customerName)
        .sort(),
      publicDemo: true,
    });
  }
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: { in: statusStorageValues(normalizeOrderStatus(status)) } } : {}),
      ...(customer ? { customerName: customer } : {}),
      ...(search
        ? {
            OR: [
              { orderNo: { contains: search } },
              { customerName: { contains: search } },
              { productName: { contains: search } },
            ],
          }
        : {}),
    },
    include: { files: true },
    orderBy: { updatedAt: "desc" },
  });
  const customers = await prisma.order.findMany({
    select: { customerName: true },
    distinct: ["customerName"],
  });
  return NextResponse.json({
    orders: orders.map(serializeOrder),
    customers: customers.map((item) => item.customerName).sort(),
  });
}

export async function POST(request: Request) {
  if (PUBLIC_DEMO_MODE) {
    return NextResponse.json(
      { error: "Order history is disabled in the public demo." },
      { status: 403 },
    );
  }
  try {
    const input = orderInputSchema.parse(await request.json());
    const orderNo = createOrderNo();
    const spec = {
      ...input.spec,
      customerName: input.customerName,
      productName: input.productName,
    };
    const result = reviewOrder(
      spec,
      orderNo,
      {
        salesperson: input.salesperson,
        notes: input.internalNotes,
        reviewer: input.reviewer,
        createdAt: formatDateTime(new Date(), input.language),
      },
      input.language,
    );
    const status = deriveStatus("reviewed", result.missingFields, result.riskItems);
    const order = await prisma.order.create({
      data: {
        orderNo,
        customerName: input.customerName,
        productName: input.productName,
        quantity: spec.quantity,
        status,
        salesperson: input.salesperson,
        sourceText: input.sourceText,
        internalNotes: input.internalNotes,
        reviewer: input.reviewer,
        specJson: JSON.stringify(spec),
        confidenceJson: JSON.stringify(input.confidence),
        missingJson: JSON.stringify(result.missingFields),
        risksJson: JSON.stringify(result.riskItems),
        questionsZhJson: JSON.stringify(result.customerQuestions.zh),
        questionsEnJson: JSON.stringify(result.customerQuestions.en),
        internalSummary: result.internalSummary,
        reviewSheet: result.reviewSheet,
        files: { create: input.files.map(fileCreateData) },
      },
      include: { files: true },
    });
    return NextResponse.json(serializeOrder(order), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存订单失败" },
      { status: 400 },
    );
  }
}
