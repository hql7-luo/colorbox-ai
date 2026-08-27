"use client";

import clsx from "clsx";
import { useLanguage } from "@/i18n/language-provider";

export function ProcessSteps({ current }: { current: number }) {
  const { t } = useLanguage();
  const labels = [t("process.import"), t("process.review"), t("process.generate")];
  return (
    <div
      className="card sticky top-20 z-30 overflow-hidden"
      aria-label={t("process.current", { step: current })}
    >
      <ol className="grid grid-cols-3">
        {labels.map((label, index) => {
          const step = index + 1;
          const active = step === current;
          const complete = step < current;
          return (
            <li
              key={label}
              className={clsx(
                "relative flex min-h-16 items-center gap-2 border-r border-line px-2 last:border-r-0 sm:gap-3 sm:px-6",
                active && "bg-navy-soft",
                complete && "bg-slate-50",
              )}
            >
              <span
                className={clsx(
                  "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-black",
                  active
                    ? "border-navy bg-navy text-white"
                    : complete
                      ? "border-green bg-green text-white"
                      : "border-slate-300 bg-white text-slate-500",
                )}
              >
                {complete ? "✓" : step}
              </span>
              <span>
                <span className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">
                  {t("process.step", { step })}
                </span>
                <span
                  className={clsx(
                    "block text-xs font-bold sm:text-sm",
                    active ? "text-navy" : "text-slate-600",
                  )}
                >
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
