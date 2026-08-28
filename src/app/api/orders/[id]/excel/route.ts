import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { buildExcelRows } from "@/lib/export";
import { serializeOrder } from "@/lib/orders";
import { formatDateTime, isLanguage, translate } from "@/i18n";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo-server";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Use the in-browser export in public demo mode." },
      { status: 403 },
    );
  const { id } = await context.params;
  const requestedLanguage = new URL(request.url).searchParams.get("lang");
  const language = isLanguage(requestedLanguage) ? requestedLanguage : "zh";
  const stored = await prisma.order.findUnique({ where: { id }, include: { files: true } });
  if (!stored)
    return NextResponse.json({ error: translate(language, "error.loadOrder") }, { status: 404 });
  const order = serializeOrder(stored);
  const rows = buildExcelRows(
    order.orderNo,
    order.spec,
    order.missingFields,
    order.riskItems,
    {
      salesperson: order.salesperson || "",
      notes: order.internalNotes || "",
      reviewer: order.reviewer || "",
      createdAt: formatDateTime(order.createdAt, language),
    },
    language,
  );
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 20 }, { wch: 90 }];
  sheet["!merges"] = [XLSX.utils.decode_range("A1:B1")];
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    language === "zh" ? "生产评审单" : "Production Review",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${order.orderNo}.xlsx"`,
    },
  });
}
