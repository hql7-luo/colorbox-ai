"use client";

import { useLanguage } from "@/i18n/language-provider";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo";

export function PublicDemoNotice() {
  const { t } = useLanguage();

  if (!PUBLIC_DEMO_MODE) return null;

  return (
    <footer className="no-print border-t border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1280px] px-4 py-4 text-center text-xs leading-5 text-slate-500 sm:px-6 lg:px-8">
        {t("public.warning")}
      </div>
    </footer>
  );
}
