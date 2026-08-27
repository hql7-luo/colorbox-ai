"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { TranslationKey } from "@/i18n";
import { useLanguage } from "@/i18n/language-provider";

const links = [
  { href: "/new", label: "nav.review" },
  { href: "/orders", label: "nav.orders" },
] as const satisfies Array<{ href: string; label: TranslationKey }>;

export function AppNav() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={t("nav.home")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy font-display text-sm font-black tracking-tight text-white">
            CB
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block font-display text-lg font-black leading-5 tracking-tight">
              ColorBox AI
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">{t("brand.tagline")}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label={t("nav.main")}>
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "whitespace-nowrap rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm",
                  active
                    ? "bg-navy-soft text-navy"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                )}
              >
                {t(link.label)}
              </Link>
            );
          })}
          <a
            href="https://github.com/hql7-luo/colorbox-ai"
            target="_blank"
            rel="noreferrer"
            className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-ink md:block"
          >
            GitHub
          </a>
          <Link
            href="/settings"
            className={clsx(
              "grid size-9 place-items-center rounded-lg text-base text-slate-500 hover:bg-slate-100 hover:text-ink",
              pathname.startsWith("/settings") && "bg-slate-100 text-navy",
            )}
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
          >
            ⚙
          </Link>
          <div
            className="ml-0.5 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:ml-1"
            aria-label={t("language.switcher")}
          >
            <button
              type="button"
              className={clsx(
                "min-h-8 rounded-md px-1.5 text-[11px] font-black sm:px-2.5 sm:text-xs",
                language === "zh" ? "bg-white text-navy shadow-sm" : "text-slate-500",
              )}
              onClick={() => setLanguage("zh")}
              aria-pressed={language === "zh"}
            >
              中
            </button>
            <button
              type="button"
              className={clsx(
                "min-h-8 rounded-md px-1.5 text-[11px] font-black sm:px-2.5 sm:text-xs",
                language === "en" ? "bg-white text-navy shadow-sm" : "text-slate-500",
              )}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
