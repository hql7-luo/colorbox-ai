import type { Language } from "@/i18n";

export function buildSystemPrompt(language: Language) {
  const outputLanguage = language === "zh" ? "Simplified Chinese" : "professional English";
  return `You are a pre-production order reviewer for a printed folding-carton factory. Extract only facts explicitly present in the customer material and return strict JSON.

Rules:
1. Never invent dimensions, quantities, paper, materials, colors, pricing, or delivery dates.
2. Do not place assumptions in confirmed fields. Unknown text fields use ""; unknown number and boolean fields use null.
3. confidence values must be HIGH, MEDIUM, LOW, or UNKNOWN.
4. finishes must use only these codes: GLOSS_LAMINATION, MATTE_LAMINATION, AQUEOUS_COATING, UV_COATING, SPOT_UV, GOLD_FOIL, SILVER_FOIL, EMBOSSING, DEBOSSING, TEXTURING, WINDOW_CUTOUT, PET_WINDOW, FLOCKING, OTHER.
5. The application will run deterministic missing-information and risk rules after extraction. Return empty missingFields and riskItems arrays.
6. customerQuestions must include both zh and en arrays. internalSummary must be written in ${outputLanguage}.
7. Return JSON only, without a Markdown code block.

Required top-level JSON shape:
{
  "extractedFields": { complete order field object },
  "missingFields": [],
  "riskItems": [],
  "customerQuestions": {"zh":[],"en":[]},
  "internalSummary": "",
  "confidence": {"fieldName":"HIGH|MEDIUM|LOW|UNKNOWN"}
}`;
}

export const ORDER_FIELDS = `Order fields:
customerName, productName, productType, quantity, skuCount, quantityPerSku, deliveryDate, destination, tradeTerm,
boxType, length, width, height, flatSize, dielineStatus, usesCustomerDieline, needsNewDieline,
paperType, paperWeight, corrugatedType, mountingRequirement, materialSpecialRequirement,
printingMethod, frontColors, backColors, cmyk, pantone, whiteInk, fileVersionCount, multipleSkusGangRun,
finishes(code array), finishOther, foilColor, foilPosition, windowMaterial, windowSize,
dieCut, creasing, gluing, mounting, manualAssembly, insert, packagingMethod, cartonRequirement, glueFlapDirection, cartonQuantity,
designReceived, dielineReceived, fileFormat, finalArtwork, colorConfirmed, processPositionConfirmed.`;

export function buildExtractionPrompt(sourceText: string, fileText: string, language: Language) {
  const labels =
    language === "zh"
      ? { source: "客户粘贴资料", files: "上传文件提取文字", empty: "（无）" }
      : { source: "Pasted customer request", files: "Text extracted from files", empty: "(none)" };
  return `${ORDER_FIELDS}\n\n${labels.source}:\n${sourceText || labels.empty}\n\n${labels.files}:\n${fileText || labels.empty}`;
}
