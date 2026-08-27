import { translate, type Language, type TranslationKey } from "@/i18n";
import type {
  Confidence,
  MissingItem,
  RiskItem,
  Severity,
  SurfaceFinish,
} from "@/lib/order-schema";
import type { OrderStatus } from "@/lib/order-status";

export function translateMissing(item: MissingItem, language: Language) {
  return translate(language, `missing.${item.code}` as TranslationKey, item.params);
}

export function translateRisk(item: RiskItem, language: Language) {
  return translate(language, `risk.${item.code}` as TranslationKey, item.params);
}

export function translateSeverity(severity: Severity, language: Language) {
  return translate(language, `severity.${severity}` as TranslationKey);
}

export function translateConfidence(confidence: Confidence, language: Language) {
  return translate(language, `confidence.${confidence}` as TranslationKey);
}

export function translateFinish(finish: SurfaceFinish, language: Language) {
  return translate(language, `finish.${finish}` as TranslationKey);
}

export function translateStatus(status: OrderStatus, language: Language) {
  return translate(language, `status.${status}` as TranslationKey);
}
