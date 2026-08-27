import { translate, type Language, type TranslationKey } from "@/i18n";
import { translateFinish, translateMissing, translateRisk, translateSeverity } from "@/i18n/domain";
import type { MissingCode, MissingItem, OrderSpec, RiskItem } from "@/lib/order-schema";
import type { OrderStatus } from "@/lib/order-status";
import { findMissingFields, findRiskItems } from "@/lib/rules";

export type ReviewResult = {
  missingFields: MissingItem[];
  riskItems: RiskItem[];
  customerQuestions: { zh: string[]; en: string[] };
  internalSummary: string;
  reviewSheet: string;
};

const questions: Record<MissingCode, { zh: string; en: string }> = {
  MISSING_VALID_QUANTITY: {
    zh: "请确认本订单的总数量。",
    en: "Please confirm the total order quantity.",
  },
  MISSING_FINISHED_SIZE: {
    zh: "请确认成品尺寸，并注明长、宽、高的顺序。",
    en: "Please confirm the finished size and specify the L × W × H order.",
  },
  MISSING_PAPER_WEIGHT: {
    zh: "请确认纸张克重（gsm）。",
    en: "Please confirm the paper weight in gsm.",
  },
  MISSING_PAPER_TYPE: {
    zh: "请确认需要使用的纸张类型。",
    en: "Please confirm the required paper type.",
  },
  MISSING_BOX_STYLE: {
    zh: "请确认盒型，或提供参考照片/刀模图。",
    en: "Please confirm the box style, or share a reference photo or dieline.",
  },
  MISSING_PACKING_METHOD: {
    zh: "请确认包装方式。",
    en: "Please confirm the packing method.",
  },
  MISSING_QUANTITY_PER_SKU: {
    zh: "请提供每个 SKU 的数量分配。",
    en: "Please provide the quantity breakdown for each SKU.",
  },
  MISSING_FOIL_COLOR: {
    zh: "请确认烫金/烫银的颜色。",
    en: "Please confirm the foil color.",
  },
  MISSING_FOIL_POSITION: {
    zh: "请在文件中标明烫金/烫银位置。",
    en: "Please mark the foil position in the artwork.",
  },
  MISSING_WINDOW_MATERIAL: {
    zh: "请确认窗口材料（如 PET）及厚度。",
    en: "Please confirm the window material, such as PET, and its thickness.",
  },
  MISSING_WINDOW_SIZE: {
    zh: "请确认窗口尺寸和位置。",
    en: "Please confirm the window size and position.",
  },
  MISSING_DIELINE: {
    zh: "请提供或确认最终刀模文件。",
    en: "Please provide or confirm the final dieline.",
  },
  MISSING_PANTONE: {
    zh: "请提供准确的 Pantone 色号。",
    en: "Please provide the exact Pantone reference.",
  },
  MISSING_GLUE_FLAP_DIRECTION: {
    zh: "请确认糊口方向。",
    en: "Please confirm the glue flap direction.",
  },
  MISSING_CARTON_QUANTITY: {
    zh: "请确认每箱装箱数量。",
    en: "Please confirm the quantity per carton.",
  },
  MISSING_ARTWORK: {
    zh: "请提供或确认设计稿。",
    en: "Please provide or confirm the artwork.",
  },
  MISSING_FINAL_ARTWORK_STATUS: {
    zh: "请确认当前文件是否为最终生产版本。",
    en: "Please confirm whether the current artwork is the final production version.",
  },
};

export function generateCustomerQuestions(missingFields: MissingItem[]) {
  const zh = missingFields.map((item) => questions[item.code].zh);
  const en = missingFields.map((item) => questions[item.code].en);
  return { zh: [...new Set(zh)], en: [...new Set(en)] };
}

export function deriveStatus(
  stage: "uploaded" | "extracted" | "reviewed",
  missingFields: MissingItem[] = [],
  riskItems: RiskItem[] = [],
): OrderStatus {
  if (stage === "uploaded") return "PENDING_EXTRACTION";
  if (stage === "extracted") return "PENDING_CONFIRMATION";
  if (
    riskItems.some((item) => item.severity === "CONFIRMATION_REQUIRED") ||
    missingFields.length > 0
  )
    return "RISK_FOUND";
  return "COMPLETED";
}

function t(language: Language, key: TranslationKey, params?: Record<string, string | number>) {
  return translate(language, key, params);
}

function display(value: unknown, language: Language): string {
  if (value === null || value === undefined || value === "") return t(language, "review.toConfirm");
  if (typeof value === "boolean") return t(language, value ? "review.yes" : "review.no");
  return String(value);
}

function finishes(spec: OrderSpec, language: Language) {
  return spec.finishes.length
    ? spec.finishes
        .map((finish) => translateFinish(finish, language))
        .join(language === "zh" ? "、" : ", ")
    : t(language, "result.none");
}

function postProcessing(spec: OrderSpec, language: Language) {
  const values = [
    spec.dieCut && t(language, "field.dieCut"),
    spec.creasing && t(language, "field.creasing"),
    spec.gluing && t(language, "field.gluing"),
    spec.mounting && t(language, "field.mounting"),
    spec.manualAssembly && t(language, "field.manualAssembly"),
  ].filter(Boolean);
  return values.join(language === "zh" ? "、" : ", ") || t(language, "review.toConfirm");
}

export function buildInternalSummary(
  spec: OrderSpec,
  missing: MissingItem[],
  risks: RiskItem[],
  language: Language = "zh",
): string {
  const size =
    spec.length && spec.width && spec.height
      ? `${spec.length} × ${spec.width} × ${spec.height} mm`
      : t(language, "sheet.finishedPending");
  return t(language, "summary.template", {
    customer: display(spec.customerName, language),
    product: display(spec.productName, language),
    quantity: display(spec.quantity, language),
    skus: display(spec.skuCount, language),
    boxStyle: display(spec.boxType, language),
    size,
    material: `${display(spec.paperWeight, language)}gsm ${display(spec.paperType, language)}`,
    printing: display(spec.printingMethod, language),
    finishes: finishes(spec, language),
    missing: missing.length,
    risks: risks.length,
  });
}

export function buildReviewSheet(
  orderNo: string,
  spec: OrderSpec,
  missing: MissingItem[],
  risks: RiskItem[],
  meta: { salesperson?: string; notes?: string; reviewer?: string; createdAt?: string } = {},
  language: Language = "zh",
): string {
  const size =
    spec.length && spec.width && spec.height
      ? `${spec.length} × ${spec.width} × ${spec.height} mm`
      : t(language, "review.toConfirm");
  const line = (key: TranslationKey, value: string) => `${t(language, key)}: ${value}`;
  const separator = language === "zh" ? "；" : "; ";
  const riskText = risks.length
    ? risks
        .map(
          (item) =>
            `[${translateSeverity(item.severity, language)}] ${translateRisk(item, language)}`,
        )
        .join(separator)
    : t(language, "sheet.none");
  return [
    t(language, "result.sheetTitle"),
    line("sheet.orderNo", orderNo),
    line("field.customerName", display(spec.customerName, language)),
    line("field.productName", display(spec.productName, language)),
    line(
      "field.quantity",
      t(language, "sheet.quantity", {
        quantity: display(spec.quantity, language),
        skus: display(spec.skuCount, language),
        perSku: display(spec.quantityPerSku, language),
      }),
    ),
    line(
      "review.finishedSize",
      t(language, "sheet.size", { finished: size, flat: display(spec.flatSize, language) }),
    ),
    line("field.boxType", display(spec.boxType, language)),
    line(
      "field.paperType",
      t(language, "sheet.material", {
        weight: display(spec.paperWeight, language),
        paper: display(spec.paperType, language),
        flute: display(spec.corrugatedType, language),
        mounting: display(spec.mountingRequirement, language),
      }),
    ),
    line(
      "field.printingMethod",
      t(language, "sheet.printing", {
        method: display(spec.printingMethod, language),
        front: display(spec.frontColors, language),
        back: display(spec.backColors, language),
        pantone: display(spec.pantone, language),
      }),
    ),
    line("review.finishes", finishes(spec, language)),
    line("review.postProcessing", postProcessing(spec, language)),
    line(
      "field.packagingMethod",
      t(language, "sheet.packing", {
        method: display(spec.packagingMethod, language),
        carton: display(spec.cartonRequirement, language),
        quantity: display(spec.cartonQuantity, language),
      }),
    ),
    line(
      "review.section.files",
      t(language, "sheet.files", {
        artwork: display(spec.designReceived, language),
        dieline: display(spec.dielineReceived, language),
        final: display(spec.finalArtwork, language),
        format: display(spec.fileFormat, language),
      }),
    ),
    line(
      "field.deliveryDate",
      t(language, "sheet.delivery", {
        date: display(spec.deliveryDate, language),
        destination: display(spec.destination, language),
        terms: display(spec.tradeTerm, language),
      }),
    ),
    line(
      "findings.missing",
      missing.length
        ? missing.map((item) => translateMissing(item, language)).join(separator)
        : t(language, "sheet.none"),
    ),
    line("findings.risks", riskText),
    line("review.internalNotes", display(meta.notes, language)),
    t(language, "sheet.people", {
      salesperson: display(meta.salesperson, language),
      reviewer: display(meta.reviewer, language),
    }),
    line("sheet.created", display(meta.createdAt, language)),
  ].join("\n");
}

export function reviewOrder(
  spec: OrderSpec,
  orderNo = "PENDING",
  meta: { salesperson?: string; notes?: string; reviewer?: string; createdAt?: string } = {},
  language: Language = "zh",
): ReviewResult {
  const missingFields = findMissingFields(spec);
  const riskItems = findRiskItems(spec);
  const customerQuestions = generateCustomerQuestions(missingFields);
  const internalSummary = buildInternalSummary(spec, missingFields, riskItems, language);
  const reviewSheet = buildReviewSheet(orderNo, spec, missingFields, riskItems, meta, language);
  return { missingFields, riskItems, customerQuestions, internalSummary, reviewSheet };
}
