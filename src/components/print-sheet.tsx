import { formatDateTime, translate, type Language, type TranslationKey } from "@/i18n";
import { translateFinish, translateMissing, translateRisk, translateSeverity } from "@/i18n/domain";
import type { ClientOrder } from "@/types";

export function PrintSheet({
  order,
  companyName,
  language,
}: {
  order: ClientOrder;
  companyName: string;
  language: Language;
}) {
  const { spec } = order;
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(language, key, params);
  const show = (value: unknown) => {
    if (value === null || value === undefined || value === "") return t("review.toConfirm");
    if (typeof value === "boolean") return t(value ? "review.yes" : "review.no");
    return String(value);
  };
  const joiner = language === "zh" ? "、" : ", ";
  const rows = [
    [t("field.customerName"), spec.customerName, t("field.productName"), spec.productName],
    [
      t("field.quantity"),
      `${show(spec.quantity)} ${t("sheet.pieces")} / ${show(spec.skuCount)} ${t("sheet.skus")}`,
      t("field.quantityPerSku"),
      show(spec.quantityPerSku),
    ],
    [
      t("review.finishedSize"),
      spec.length && spec.width && spec.height
        ? `${spec.length} × ${spec.width} × ${spec.height} mm`
        : t("review.toConfirm"),
      t("field.boxType"),
      show(spec.boxType),
    ],
    [
      t("field.paperType"),
      `${show(spec.paperWeight)}gsm ${show(spec.paperType)}`,
      `${t("field.corrugatedType")} / ${t("field.mountingRequirement")}`,
      `${show(spec.corrugatedType)} / ${show(spec.mountingRequirement)}`,
    ],
    [
      t("field.printingMethod"),
      `${show(spec.printingMethod)}; ${t("field.frontColors")} ${show(spec.frontColors)}; ${t("field.backColors")} ${show(spec.backColors)}`,
      t("field.pantone"),
      show(spec.pantone),
    ],
    [
      t("review.finishes"),
      spec.finishes.map((finish) => translateFinish(finish, language)).join(joiner) ||
        t("result.none"),
      t("review.postProcessing"),
      [
        spec.dieCut && t("field.dieCut"),
        spec.creasing && t("field.creasing"),
        spec.gluing && t("field.gluing"),
        spec.mounting && t("field.mounting"),
        spec.manualAssembly && t("field.manualAssembly"),
      ]
        .filter(Boolean)
        .join(joiner) || t("review.toConfirm"),
    ],
    [
      t("field.packagingMethod"),
      show(spec.packagingMethod),
      t("field.cartonRequirement"),
      `${show(spec.cartonRequirement)}; ${t("field.cartonQuantity")} ${show(spec.cartonQuantity)}`,
    ],
    [
      t("review.section.files"),
      `${t("field.designReceived")} ${show(spec.designReceived)} / ${t("field.dielineReceived")} ${show(spec.dielineReceived)} / ${t("field.finalArtwork")} ${show(spec.finalArtwork)}`,
      t("field.fileFormat"),
      show(spec.fileFormat),
    ],
    [
      t("field.deliveryDate"),
      show(spec.deliveryDate),
      `${t("field.destination")} / ${t("field.tradeTerm")}`,
      `${show(spec.destination)} / ${show(spec.tradeTerm)}`,
    ],
  ];
  return (
    <article className="print-page mx-auto max-w-[900px] bg-white p-4 text-[13px] leading-6">
      <header className="mb-5 flex items-end justify-between border-b-2 border-ink pb-4">
        <div>
          <p className="text-xs font-bold text-slate-500">{companyName}</p>
          <h1 className="mt-1 font-display text-3xl font-black">{t("result.sheetTitle")}</h1>
        </div>
        <div className="text-right">
          <p className="font-black">{order.orderNo}</p>
          <p className="text-xs text-slate-500">
            {t("print.created", { date: formatDateTime(order.createdAt, language) })}
          </p>
        </div>
      </header>
      <table className="w-full table-fixed border-collapse">
        {rows.map((row, index) => (
          <tbody key={index}>
            <tr>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex % 2 === 0
                      ? "w-[16%] border border-slate-400 bg-slate-100 px-2 py-2 font-bold"
                      : "w-[34%] border border-slate-400 px-2 py-2"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        ))}
      </table>
      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-slate-400">
          <h2 className="border-b border-slate-400 bg-slate-100 px-3 py-2 font-black">
            {t("result.missing")}
          </h2>
          <ol className="min-h-24 list-decimal space-y-1 p-3 pl-7">
            {order.missingFields.length ? (
              order.missingFields.map((item) => (
                <li key={item.code}>{translateMissing(item, language)}</li>
              ))
            ) : (
              <li className="list-none">{t("sheet.none")}</li>
            )}
          </ol>
        </div>
        <div className="border border-slate-400">
          <h2 className="border-b border-slate-400 bg-slate-100 px-3 py-2 font-black">
            {t("result.risks")}
          </h2>
          <ul className="min-h-24 space-y-1 p-3">
            {order.riskItems.length ? (
              order.riskItems.map((item) => (
                <li key={item.code}>
                  <strong>[{translateSeverity(item.severity, language)}] </strong>
                  {translateRisk(item, language)}
                </li>
              ))
            ) : (
              <li>{t("sheet.none")}</li>
            )}
          </ul>
        </div>
      </section>
      <section className="mt-4 border border-slate-400">
        <h2 className="border-b border-slate-400 bg-slate-100 px-3 py-2 font-black">
          {t("print.notes")}
        </h2>
        <p className="min-h-16 whitespace-pre-wrap p-3">{order.internalNotes || t("sheet.none")}</p>
      </section>
      <footer className="mt-5 grid grid-cols-3 gap-5 border-t border-slate-400 pt-4">
        <p>
          {t("review.salesperson")}: {order.salesperson || "________"}
        </p>
        <p>
          {t("review.reviewer")}: {order.reviewer || "________"}
        </p>
        <p>{t("print.productionReview")}: ________</p>
      </footer>
      <p className="mt-5 text-[10px] text-slate-500">{t("print.disclaimer")}</p>
    </article>
  );
}
