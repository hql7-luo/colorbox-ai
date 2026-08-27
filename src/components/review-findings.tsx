"use client";

import clsx from "clsx";
import type { ReviewResult } from "@/lib/review";
import { translateMissing, translateRisk, translateSeverity } from "@/i18n/domain";
import { useLanguage } from "@/i18n/language-provider";

export function ReviewFindings({
  review,
  compact = false,
}: {
  review: ReviewResult | null;
  compact?: boolean;
}) {
  const { language, t } = useLanguage();
  if (!review) {
    return (
      <div className="rounded-xl border border-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
        {t("findings.empty")}
      </div>
    );
  }

  return (
    <div className={clsx("space-y-6", compact && "space-y-5")}>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-ink">{t("findings.missing")}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {review.missingFields.length}
          </span>
        </div>
        {review.missingFields.length ? (
          <ul className="space-y-2">
            {review.missingFields.map((item) => (
              <li
                key={item.code}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-5 text-slate-700"
              >
                {translateMissing(item, language)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-green">
            {t("findings.noMissing")}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold text-ink">{t("findings.risks")}</h3>
          <span className="rounded-full bg-orange-soft px-2.5 py-1 text-xs font-bold text-orange">
            {review.riskItems.length}
          </span>
        </div>
        {review.riskItems.length ? (
          <ul className="space-y-2">
            {review.riskItems.map((item, index) => (
              <li
                key={`${item.code}-${index}`}
                className={clsx(
                  "rounded-lg border px-3.5 py-3 text-sm leading-5",
                  item.severity === "CONFIRMATION_REQUIRED"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : item.severity === "IMPORTANT"
                      ? "border-orange-200 bg-orange-soft text-amber-950"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider opacity-70">
                  {translateSeverity(item.severity, language)}
                </span>
                {translateRisk(item, language)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-green">
            {t("findings.noRisks")}
          </p>
        )}
      </section>
    </div>
  );
}
