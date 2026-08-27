import {
  aiOutputSchema,
  emptyOrderSpec,
  type AiOutput,
  type Confidence,
  type OrderSpec,
} from "@/lib/order-schema";
import { reviewOrder } from "@/lib/review";
import type { Language } from "@/i18n";

function found(
  confidence: Record<string, Confidence>,
  field: keyof OrderSpec,
  value: unknown,
  level: Confidence = "MEDIUM",
) {
  if (value !== "" && value !== null && value !== false) confidence[field] = level;
}

export function extractWithLocalRules(
  source: string,
  customerName = "",
  language: Language = "zh",
): AiOutput {
  const spec: OrderSpec = { ...emptyOrderSpec, customerName };
  const confidence: Record<string, Confidence> = {};
  const content = source.replace(/,/g, "");

  const quantity = content.match(/(?:数量|qty|quantity)\s*[:：]?\s*(\d{1,9})/i);
  if (quantity) spec.quantity = Number(quantity[1]);

  const size = content.match(
    /(?:尺寸|size)?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)(?:\s*mm)?/i,
  );
  if (size)
    [spec.length, spec.width, spec.height] = [Number(size[1]), Number(size[2]), Number(size[3])];

  const gsm = content.match(/(\d{2,4})\s*gsm/i);
  if (gsm) spec.paperWeight = Number(gsm[1]);
  if (/白卡|SBS|ivory board/i.test(content)) spec.paperType = "SBS";
  if (/牛皮纸|kraft/i.test(content)) spec.paperType = "Kraft paper";
  if (/灰板|greyboard/i.test(content)) spec.paperType = "Greyboard";
  const flute = content.match(/([A-F])\s*(?:楞|flute)/i);
  if (flute) spec.corrugatedType = `${flute[1].toUpperCase()} flute`;

  if (/折叠彩盒|folding carton/i.test(content)) spec.boxType = "Folding carton";
  if (/天地盖|rigid.*box|lid.*base/i.test(content)) spec.boxType = "Rigid lid-and-base box";
  if (/瓦楞彩盒|corrugated.*box/i.test(content)) spec.boxType = "Corrugated box";
  spec.productType = spec.boxType;

  if (/CMYK|四色/i.test(content)) {
    spec.cmyk = true;
    spec.printingMethod = "Offset printing";
    spec.frontColors = "CMYK";
  }
  const pantone = content.match(/Pantone\s*([A-Za-z0-9\s-]{2,16})/i);
  if (pantone) spec.pantone = `Pantone ${pantone[1].trim()}`;
  const finishes = [
    ["亮膜", "GLOSS_LAMINATION"],
    ["哑膜", "MATTE_LAMINATION"],
    ["水性光油", "AQUEOUS_COATING"],
    ["局部UV", "SPOT_UV"],
    ["烫金", "GOLD_FOIL"],
    ["烫银", "SILVER_FOIL"],
    ["击凸", "EMBOSSING"],
    ["击凹", "DEBOSSING"],
    ["压纹", "TEXTURING"],
    ["开窗", "WINDOW_CUTOUT"],
    ["PET窗口", "PET_WINDOW"],
    ["植绒", "FLOCKING"],
  ] as const;
  for (const [sourceName, code] of finishes)
    if (content.includes(sourceName)) spec.finishes.push(code);
  if (/matte lamination/i.test(content)) spec.finishes.push("MATTE_LAMINATION");
  if (/gloss lamination/i.test(content)) spec.finishes.push("GLOSS_LAMINATION");
  if (/aqueous coating|water-based varnish/i.test(content)) spec.finishes.push("AQUEOUS_COATING");
  if (/spot uv/i.test(content)) spec.finishes.push("SPOT_UV");
  if (/hot foil|gold foil/i.test(content)) spec.finishes.push("GOLD_FOIL");
  if (/silver foil/i.test(content)) spec.finishes.push("SILVER_FOIL");
  spec.finishes = [...new Set(spec.finishes)];

  const sku = content.match(/(?:SKU|款数|共)\s*[:：]?\s*(\d+)\s*(?:款|个)?/i);
  if (sku) spec.skuCount = Number(sku[1]);
  const date = content.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)/);
  if (date) spec.deliveryDate = date[1];
  if (/刀模|dieline/i.test(content)) spec.dieCut = true;
  if (/糊盒|gluing/i.test(content)) spec.gluing = true;
  if (/压痕|creasing/i.test(content)) spec.creasing = true;
  if (/设计稿.*(?:已|有)|artwork attached/i.test(content)) spec.designReceived = true;
  if (/最终版|final artwork/i.test(content)) spec.finalArtwork = true;

  for (const key of Object.keys(spec) as Array<keyof OrderSpec>) found(confidence, key, spec[key]);
  if (customerName) confidence.customerName = "HIGH";
  const review = reviewOrder(spec, "PENDING", {}, language);
  return aiOutputSchema.parse({
    extractedFields: spec,
    missingFields: review.missingFields,
    riskItems: review.riskItems,
    customerQuestions: review.customerQuestions,
    internalSummary: review.internalSummary,
    confidence,
  });
}
