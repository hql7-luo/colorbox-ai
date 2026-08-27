"use client";

import clsx from "clsx";
import type { Confidence } from "@/lib/order-schema";
import { translateConfidence } from "@/i18n/domain";
import { useLanguage } from "@/i18n/language-provider";

const styles: Record<Confidence, string> = {
  HIGH: "border-emerald-200 bg-emerald-50 text-green",
  MEDIUM: "border-blue-200 bg-blue-50 text-blue-700",
  LOW: "border-orange-200 bg-orange-soft text-orange",
  UNKNOWN: "border-slate-300 bg-slate-100 text-slate-600",
};

export function ConfidenceBadge({ value }: { value: Confidence }) {
  const { language } = useLanguage();
  return (
    <span className={clsx("rounded border px-1.5 py-0.5 text-[10px] font-bold", styles[value])}>
      {translateConfidence(value, language)}
    </span>
  );
}
