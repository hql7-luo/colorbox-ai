import { z } from "zod";

const text = z.string().default("");
const number = z.number().nullable().default(null);
const bool = z.boolean().nullable().default(null);

export const confidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const surfaceFinishSchema = z.enum([
  "GLOSS_LAMINATION",
  "MATTE_LAMINATION",
  "AQUEOUS_COATING",
  "UV_COATING",
  "SPOT_UV",
  "GOLD_FOIL",
  "SILVER_FOIL",
  "EMBOSSING",
  "DEBOSSING",
  "TEXTURING",
  "WINDOW_CUTOUT",
  "PET_WINDOW",
  "FLOCKING",
  "OTHER",
]);
export type SurfaceFinish = z.infer<typeof surfaceFinishSchema>;

export const orderSpecSchema = z.object({
  customerName: text,
  productName: text,
  productType: text,
  quantity: number,
  skuCount: number,
  quantityPerSku: text,
  deliveryDate: text,
  destination: text,
  tradeTerm: text,

  boxType: text,
  length: number,
  width: number,
  height: number,
  flatSize: text,
  dielineStatus: text,
  usesCustomerDieline: bool,
  needsNewDieline: bool,

  paperType: text,
  paperWeight: number,
  corrugatedType: text,
  mountingRequirement: text,
  materialSpecialRequirement: text,

  printingMethod: text,
  frontColors: text,
  backColors: text,
  cmyk: bool,
  pantone: text,
  whiteInk: bool,
  fileVersionCount: number,
  multipleSkusGangRun: bool,

  finishes: z.array(surfaceFinishSchema).default([]),
  finishOther: text,
  foilColor: text,
  foilPosition: text,
  windowMaterial: text,
  windowSize: text,

  dieCut: bool,
  creasing: bool,
  gluing: bool,
  mounting: bool,
  manualAssembly: bool,
  insert: text,
  packagingMethod: text,
  cartonRequirement: text,
  glueFlapDirection: text,
  cartonQuantity: number,

  designReceived: bool,
  dielineReceived: bool,
  fileFormat: text,
  finalArtwork: bool,
  colorConfirmed: bool,
  processPositionConfirmed: bool,
});

export type OrderSpec = z.infer<typeof orderSpecSchema>;

export const emptyOrderSpec: OrderSpec = orderSpecSchema.parse({});

export const missingCodeSchema = z.enum([
  "MISSING_VALID_QUANTITY",
  "MISSING_FINISHED_SIZE",
  "MISSING_PAPER_WEIGHT",
  "MISSING_PAPER_TYPE",
  "MISSING_BOX_STYLE",
  "MISSING_PACKING_METHOD",
  "MISSING_QUANTITY_PER_SKU",
  "MISSING_FOIL_COLOR",
  "MISSING_FOIL_POSITION",
  "MISSING_WINDOW_MATERIAL",
  "MISSING_WINDOW_SIZE",
  "MISSING_DIELINE",
  "MISSING_PANTONE",
  "MISSING_GLUE_FLAP_DIRECTION",
  "MISSING_CARTON_QUANTITY",
  "MISSING_ARTWORK",
  "MISSING_FINAL_ARTWORK_STATUS",
]);
export type MissingCode = z.infer<typeof missingCodeSchema>;

export const missingItemSchema = z.object({
  code: missingCodeSchema,
  params: z.record(z.union([z.string(), z.number()])).optional(),
});
export type MissingItem = z.infer<typeof missingItemSchema>;

export const riskCodeSchema = z.enum([
  "MULTI_SKU_GANG_RUN_UNKNOWN",
  "SKU_QUANTITY_MISMATCH",
  "FOIL_POSITION_UNKNOWN",
  "WINDOW_POSITION_UNKNOWN",
  "PAPER_WEIGHT_MAY_BE_LOW",
  "DIELINE_NOT_FINAL",
  "PANTONE_MISSING",
  "DELIVERY_WITHOUT_FINAL_ARTWORK",
  "SMALL_ORDER_SETUP_COST",
  "GLUE_FLAP_UNKNOWN",
  "ARTWORK_MAY_CHANGE",
  "FILE_VERSION_MISMATCH",
]);
export type RiskCode = z.infer<typeof riskCodeSchema>;

export const severitySchema = z.enum(["REMINDER", "IMPORTANT", "CONFIRMATION_REQUIRED"]);
export type Severity = z.infer<typeof severitySchema>;

export const riskItemSchema = z.object({
  code: riskCodeSchema,
  severity: severitySchema,
  field: z.string().optional(),
  params: z.record(z.union([z.string(), z.number()])).optional(),
});

export type RiskItem = z.infer<typeof riskItemSchema>;

export const aiOutputSchema = z.object({
  extractedFields: orderSpecSchema,
  missingFields: z.array(missingItemSchema),
  riskItems: z.array(riskItemSchema),
  customerQuestions: z.object({
    zh: z.array(z.string()),
    en: z.array(z.string()),
  }),
  internalSummary: z.string(),
  confidence: z.record(confidenceSchema),
});

export type AiOutput = z.infer<typeof aiOutputSchema>;

export const uploadedFileSchema = z.object({
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  relativePath: z.string(),
  url: z.string().optional(),
});

export type UploadedFileInput = z.infer<typeof uploadedFileSchema>;

export const orderInputSchema = z.object({
  id: z.string().optional(),
  customerName: z.string().min(1, "请填写客户名称"),
  productName: z.string().min(1, "请填写产品名称"),
  salesperson: z.string().default(""),
  sourceText: z.string().default(""),
  internalNotes: z.string().default(""),
  reviewer: z.string().default(""),
  spec: orderSpecSchema,
  confidence: z.record(confidenceSchema).default({}),
  files: z.array(uploadedFileSchema).default([]),
  language: z.enum(["zh", "en"]).default("zh"),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export const surfaceFinishes = surfaceFinishSchema.options;

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
