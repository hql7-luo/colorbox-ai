import { translate, type Language, type TranslationKey } from "@/i18n";
import { translateFinish, translateMissing, translateRisk, translateSeverity } from "@/i18n/domain";
import type { MissingItem, OrderSpec, RiskItem } from "@/lib/order-schema";

function t(language: Language, key: TranslationKey) {
  return translate(language, key);
}

function show(value: unknown, language: Language) {
  if (value === null || value === undefined || value === "") return t(language, "review.toConfirm");
  if (typeof value === "boolean") return t(language, value ? "review.yes" : "review.no");
  return String(value);
}

export function buildExcelRows(
  orderNo: string,
  spec: OrderSpec,
  missing: MissingItem[],
  risks: RiskItem[],
  meta: Record<string, string | undefined> = {},
  language: Language = "zh",
) {
  const separator = language === "zh" ? "；" : "; ";
  const finishes =
    spec.finishes
      .map((finish) => translateFinish(finish, language))
      .join(language === "zh" ? "、" : ", ") || t(language, "result.none");
  const postProcessing = [
    spec.dieCut && t(language, "field.dieCut"),
    spec.creasing && t(language, "field.creasing"),
    spec.gluing && t(language, "field.gluing"),
    spec.mounting && t(language, "field.mounting"),
    spec.manualAssembly && t(language, "field.manualAssembly"),
  ]
    .filter(Boolean)
    .join(language === "zh" ? "、" : ", ");

  return [
    [t(language, "result.sheetTitle"), ""],
    [t(language, "sheet.orderNo"), orderNo],
    [t(language, "field.customerName"), spec.customerName],
    [t(language, "field.productName"), spec.productName],
    [t(language, "field.quantity"), spec.quantity ?? t(language, "review.toConfirm")],
    [t(language, "field.skuCount"), spec.skuCount ?? t(language, "review.toConfirm")],
    [t(language, "field.quantityPerSku"), show(spec.quantityPerSku, language)],
    [
      t(language, "review.finishedSize"),
      [spec.length, spec.width, spec.height].every(Boolean)
        ? `${spec.length} × ${spec.width} × ${spec.height}`
        : t(language, "review.toConfirm"),
    ],
    [t(language, "field.boxType"), show(spec.boxType, language)],
    [
      t(language, "field.paperType"),
      `${show(spec.paperWeight, language)}gsm ${show(spec.paperType, language)}`,
    ],
    [
      t(language, "field.printingMethod"),
      `${show(spec.printingMethod, language)}${separator}${t(language, "field.frontColors")} ${show(spec.frontColors, language)}${separator}${t(language, "field.backColors")} ${show(spec.backColors, language)}`,
    ],
    [t(language, "review.finishes"), finishes],
    [t(language, "review.postProcessing"), postProcessing || t(language, "review.toConfirm")],
    [
      t(language, "field.packagingMethod"),
      `${show(spec.packagingMethod, language)}${separator}${show(spec.cartonRequirement, language)}`,
    ],
    [
      t(language, "review.section.files"),
      `${t(language, "field.designReceived")}: ${show(spec.designReceived, language)}${separator}${t(language, "field.dielineReceived")}: ${show(spec.dielineReceived, language)}`,
    ],
    [t(language, "field.deliveryDate"), show(spec.deliveryDate, language)],
    [
      t(language, "findings.missing"),
      missing.map((item) => translateMissing(item, language)).join(separator) ||
        t(language, "sheet.none"),
    ],
    [
      t(language, "findings.risks"),
      risks
        .map(
          (item) =>
            `[${translateSeverity(item.severity, language)}] ${translateRisk(item, language)}`,
        )
        .join(separator) || t(language, "sheet.none"),
    ],
    [t(language, "review.internalNotes"), meta.notes || ""],
    [t(language, "review.salesperson"), meta.salesperson || ""],
    [t(language, "review.reviewer"), meta.reviewer || ""],
    [t(language, "sheet.created"), meta.createdAt || ""],
  ];
}
