import {
  confidenceSchema,
  surfaceFinishSchema,
  type Confidence,
  type OrderSpec,
  type SurfaceFinish,
} from "@/lib/order-schema";

const legacyConfidence: Record<string, Confidence> = {
  高: "HIGH",
  中: "MEDIUM",
  低: "LOW",
  未识别: "UNKNOWN",
};

const legacyFinish: Record<string, SurfaceFinish> = {
  亮膜: "GLOSS_LAMINATION",
  哑膜: "MATTE_LAMINATION",
  水性光油: "AQUEOUS_COATING",
  UV: "UV_COATING",
  局部UV: "SPOT_UV",
  "局部 UV": "SPOT_UV",
  烫金: "GOLD_FOIL",
  烫银: "SILVER_FOIL",
  击凸: "EMBOSSING",
  击凹: "DEBOSSING",
  压纹: "TEXTURING",
  开窗: "WINDOW_CUTOUT",
  PET窗口: "PET_WINDOW",
  "PET 窗口": "PET_WINDOW",
  植绒: "FLOCKING",
  其他: "OTHER",
};

export function normalizeConfidenceRecord(value: unknown): Record<string, Confidence> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, raw]) => {
      const parsed = confidenceSchema.safeParse(raw);
      return [key, parsed.success ? parsed.data : legacyConfidence[String(raw)] || "UNKNOWN"];
    }),
  );
}

export function normalizeFinishes(value: unknown): SurfaceFinish[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const parsed = surfaceFinishSchema.safeParse(raw);
    if (parsed.success) return [parsed.data];
    const mapped = legacyFinish[String(raw)];
    return mapped ? [mapped] : [];
  });
}

export function normalizeSpec(raw: Partial<OrderSpec> & { finishes?: unknown }) {
  return { ...raw, finishes: normalizeFinishes(raw.finishes) };
}
