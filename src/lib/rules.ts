import type { MissingItem, OrderSpec, RiskItem } from "@/lib/order-schema";

// Factory maintainers can adjust deterministic checks in this file. Rules return stable
// codes instead of display text so the UI and exports can translate without rerunning review.

export function findMissingFields(spec: OrderSpec): MissingItem[] {
  const missing: MissingItem[] = [];
  const add = (code: MissingItem["code"]) => missing.push({ code });

  if (!spec.quantity || spec.quantity < 1) add("MISSING_VALID_QUANTITY");
  if (!spec.length || !spec.width || !spec.height) add("MISSING_FINISHED_SIZE");
  if (spec.paperType && !spec.paperWeight) add("MISSING_PAPER_WEIGHT");
  if (!spec.paperType) add("MISSING_PAPER_TYPE");
  if (!spec.boxType) add("MISSING_BOX_STYLE");
  if (!spec.packagingMethod) add("MISSING_PACKING_METHOD");
  if (spec.skuCount && spec.skuCount > 1 && !spec.quantityPerSku) add("MISSING_QUANTITY_PER_SKU");
  if (spec.finishes.includes("GOLD_FOIL") || spec.finishes.includes("SILVER_FOIL")) {
    if (!spec.foilColor) add("MISSING_FOIL_COLOR");
    if (!spec.foilPosition) add("MISSING_FOIL_POSITION");
  }
  if (spec.finishes.includes("WINDOW_CUTOUT") || spec.finishes.includes("PET_WINDOW")) {
    if (!spec.windowMaterial) add("MISSING_WINDOW_MATERIAL");
    if (!spec.windowSize) add("MISSING_WINDOW_SIZE");
  }
  if (spec.dieCut && spec.dielineReceived !== true) add("MISSING_DIELINE");
  const pantonePending =
    /pantone|spot\s*colou?r|专色|brand\s*colou?r/i.test(spec.frontColors) &&
    (!spec.pantone.trim() ||
      spec.pantone.trim() === "待提供" ||
      spec.pantone.trim().toLowerCase() === "to confirm");
  if (pantonePending) add("MISSING_PANTONE");
  if (spec.gluing && !spec.glueFlapDirection) add("MISSING_GLUE_FLAP_DIRECTION");
  if ((spec.packagingMethod || spec.cartonRequirement) && !spec.cartonQuantity)
    add("MISSING_CARTON_QUANTITY");
  if (spec.designReceived !== true) add("MISSING_ARTWORK");
  if (spec.finalArtwork !== true) add("MISSING_FINAL_ARTWORK_STATUS");

  return [...new Map(missing.map((item) => [item.code, item])).values()];
}

export function findRiskItems(spec: OrderSpec): RiskItem[] {
  const risks: RiskItem[] = [];
  const pantonePending =
    /pantone|spot\s*colou?r|专色|brand\s*colou?r/i.test(spec.frontColors) &&
    (!spec.pantone.trim() ||
      spec.pantone.trim() === "待提供" ||
      spec.pantone.trim().toLowerCase() === "to confirm");

  if (spec.skuCount && spec.skuCount > 1 && spec.multipleSkusGangRun === null) {
    risks.push({
      code: "MULTI_SKU_GANG_RUN_UNKNOWN",
      severity: "CONFIRMATION_REQUIRED",
      field: "multipleSkusGangRun",
    });
  }

  if (spec.skuCount && spec.quantity && spec.quantityPerSku) {
    const values = spec.quantityPerSku.match(/\d+/g)?.map(Number) ?? [];
    const sum = values.reduce((total, value) => total + value, 0);
    if (values.length > 0 && (values.length !== spec.skuCount || sum !== spec.quantity)) {
      risks.push({
        code: "SKU_QUANTITY_MISMATCH",
        severity: "CONFIRMATION_REQUIRED",
        field: "quantityPerSku",
      });
    }
  }

  if (
    (spec.finishes.includes("GOLD_FOIL") || spec.finishes.includes("SILVER_FOIL")) &&
    !spec.foilPosition
  ) {
    risks.push({ code: "FOIL_POSITION_UNKNOWN", severity: "IMPORTANT", field: "foilPosition" });
  }
  if (
    (spec.finishes.includes("WINDOW_CUTOUT") || spec.finishes.includes("PET_WINDOW")) &&
    !spec.windowSize
  ) {
    risks.push({
      code: "WINDOW_POSITION_UNKNOWN",
      severity: "IMPORTANT",
      field: "windowSize",
    });
  }
  if (
    spec.paperWeight &&
    spec.length &&
    spec.width &&
    Math.max(spec.length, spec.width) > 350 &&
    spec.paperWeight < 300
  ) {
    risks.push({
      code: "PAPER_WEIGHT_MAY_BE_LOW",
      severity: "IMPORTANT",
      field: "paperWeight",
    });
  }
  if (spec.dieCut && spec.dielineReceived !== true) {
    risks.push({
      code: "DIELINE_NOT_FINAL",
      severity: "CONFIRMATION_REQUIRED",
      field: "dielineReceived",
    });
  }
  if (pantonePending) {
    risks.push({
      code: "PANTONE_MISSING",
      severity: "CONFIRMATION_REQUIRED",
      field: "pantone",
    });
  }
  if (spec.deliveryDate && spec.finalArtwork !== true) {
    risks.push({
      code: "DELIVERY_WITHOUT_FINAL_ARTWORK",
      severity: "IMPORTANT",
      field: "finalArtwork",
    });
  }
  if (spec.quantity && spec.quantity < 1000) {
    risks.push({ code: "SMALL_ORDER_SETUP_COST", severity: "REMINDER", field: "quantity" });
  }
  if (spec.gluing && !spec.glueFlapDirection) {
    risks.push({ code: "GLUE_FLAP_UNKNOWN", severity: "IMPORTANT", field: "glueFlapDirection" });
  }
  if (spec.designReceived && !spec.finalArtwork) {
    risks.push({ code: "ARTWORK_MAY_CHANGE", severity: "REMINDER", field: "finalArtwork" });
  }
  if (
    spec.dielineReceived &&
    spec.designReceived &&
    spec.fileVersionCount &&
    spec.fileVersionCount > 1
  ) {
    risks.push({
      code: "FILE_VERSION_MISMATCH",
      severity: "REMINDER",
      field: "fileVersionCount",
    });
  }

  return risks;
}

export function parseSkuQuantities(input: string): number[] {
  return input.match(/\d+/g)?.map(Number) ?? [];
}

export function skuQuantityMatches(
  spec: Pick<OrderSpec, "quantity" | "skuCount" | "quantityPerSku">,
): boolean {
  if (!spec.quantity || !spec.skuCount || !spec.quantityPerSku) return false;
  const values = parseSkuQuantities(spec.quantityPerSku);
  return (
    values.length === spec.skuCount &&
    values.reduce((sum, value) => sum + value, 0) === spec.quantity
  );
}
