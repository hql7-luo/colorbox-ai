import { notFound } from "next/navigation";
import { PrintAuto } from "@/components/print-auto";
import { PrintSheet } from "@/components/print-sheet";
import { prisma } from "@/lib/db";
import { serializeOrder } from "@/lib/orders";
import { isLanguage, translate } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; lang?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const language = isLanguage(query.lang) ? query.lang : "zh";
  const stored = await prisma.order.findUnique({ where: { id }, include: { files: true } });
  if (!stored) notFound();
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const order = serializeOrder(stored) as unknown as import("@/types").ClientOrder;
  return (
    <div className="bg-white">
      <div className="no-print mx-auto flex max-w-[900px] items-center justify-between gap-4 p-4">
        <p className="text-sm text-slate-600">{translate(language, "print.hint")}</p>
        <PrintAuto enabled={query.auto === "1"} label={translate(language, "print.open")} />
      </div>
      <PrintSheet
        order={order}
        companyName={setting?.companyName || translate(language, "print.companyFallback")}
        language={language}
      />
    </div>
  );
}
