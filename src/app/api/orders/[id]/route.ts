import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrderNo, fileCreateData, serializeOrder } from "@/lib/orders";
import { orderInputSchema } from "@/lib/order-schema";
import { deriveStatus, reviewOrder } from "@/lib/review";
import { formatDateTime, isLanguage, translate } from "@/i18n";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Order history is disabled in the public demo." },
      { status: 404 },
    );
  const { id } = await context.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { files: true } });
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  return NextResponse.json(serializeOrder(order));
}

export async function PUT(request: Request, context: Context) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Order history is disabled in the public demo." },
      { status: 403 },
    );
  try {
    const { id } = await context.params;
    const input = orderInputSchema.parse(await request.json());
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    const spec = {
      ...input.spec,
      customerName: input.customerName,
      productName: input.productName,
    };
    const result = reviewOrder(
      spec,
      existing.orderNo,
      {
        salesperson: input.salesperson,
        notes: input.internalNotes,
        reviewer: input.reviewer,
        createdAt: formatDateTime(existing.createdAt, input.language),
      },
      input.language,
    );
    const status = deriveStatus("reviewed", result.missingFields, result.riskItems);
    const order = await prisma.$transaction(async (tx) => {
      await tx.uploadFile.deleteMany({ where: { orderId: id } });
      return tx.order.update({
        where: { id },
        data: {
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
    });
    return NextResponse.json(serializeOrder(order));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新订单失败" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: Context) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Order history is disabled in the public demo." },
      { status: 403 },
    );
  const { id } = await context.params;
  const requestedLanguage = new URL(request.url).searchParams.get("lang");
  const language = isLanguage(requestedLanguage) ? requestedLanguage : "zh";
  const source = await prisma.order.findUnique({ where: { id }, include: { files: true } });
  if (!source) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const orderNo = createOrderNo();
  const copy = await prisma.order.create({
    data: {
      orderNo,
      isDemo: false,
      customerName: source.customerName,
      productName: `${source.productName}${translate(language, "orders.copySuffix")}`,
      quantity: source.quantity,
      status: "PENDING_CONFIRMATION",
      salesperson: source.salesperson,
      sourceText: source.sourceText,
      internalNotes: source.internalNotes,
      reviewer: source.reviewer,
      specJson: source.specJson,
      confidenceJson: source.confidenceJson,
      missingJson: source.missingJson,
      risksJson: source.risksJson,
      questionsZhJson: source.questionsZhJson,
      questionsEnJson: source.questionsEnJson,
      internalSummary: source.internalSummary,
      reviewSheet: source.reviewSheet?.replace(source.orderNo, orderNo),
      files: {
        create: source.files.map((file) => ({
          originalName: file.originalName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          size: file.size,
          relativePath: file.relativePath,
        })),
      },
    },
    include: { files: true },
  });
  return NextResponse.json(serializeOrder(copy), { status: 201 });
}

export async function DELETE(_request: Request, context: Context) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Order history is disabled in the public demo." },
      { status: 403 },
    );
  const { id } = await context.params;
  const exists = await prisma.order.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
