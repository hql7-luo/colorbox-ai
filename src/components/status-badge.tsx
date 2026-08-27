import clsx from "clsx";
import { useLanguage } from "@/i18n/language-provider";
import { translateStatus } from "@/i18n/domain";
import { normalizeOrderStatus, type OrderStatus } from "@/lib/order-status";

const styles: Record<OrderStatus, string> = {
  PENDING_EXTRACTION: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_CONFIRMATION: "bg-blue-50 text-blue-800 border-blue-200",
  RISK_FOUND: "bg-orange-soft text-orange border-orange-200",
  COMPLETED: "bg-emerald-50 text-green border-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  const { language } = useLanguage();
  const normalized = normalizeOrderStatus(status);
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
        styles[normalized],
      )}
    >
      {translateStatus(normalized, language)}
    </span>
  );
}
