"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductionReviewSheet } from "@/components/production-review-sheet";
import { useLanguage } from "@/i18n/language-provider";
import { allowsPersistentOrderActions } from "@/lib/public-demo";
import { usePublicDemo } from "@/components/public-demo-provider";
import type { ClientOrder } from "@/types";

export function OrderDetail({ id }: { id: string }) {
  const { t } = useLanguage();
  const publicDemo = usePublicDemo();
  const allowPersistenceActions = allowsPersistentOrderActions(publicDemo);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/orders/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("load failed");
        setOrder(data);
      })
      .catch(() => setError(t("error.loadOrder")));
  }, [id, t]);
  if (error) return <div className="card p-10 text-center text-red-700">{error}</div>;
  if (!order)
    return (
      <div className="card p-10 text-center text-sm text-slate-500">{t("detail.loading")}</div>
    );
  const review = {
    missingFields: order.missingFields,
    riskItems: order.riskItems,
    customerQuestions: order.customerQuestions,
    internalSummary: order.internalSummary || "",
    reviewSheet: order.reviewSheet || "",
  };
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link className="text-sm font-semibold text-slate-500 hover:text-navy" href="/orders">
          ← {t("detail.back")}
        </Link>
        {allowPersistenceActions && (
          <Link
            className="text-sm font-semibold text-slate-500 hover:text-navy"
            href={`/new?id=${order.id}`}
          >
            {t("detail.edit")}
          </Link>
        )}
      </div>
      <ProductionReviewSheet spec={order.spec} review={review} order={order} />
      {(order.sourceText || order.files.length > 0) && (
        <details className="mt-8 rounded-xl border border-line bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold">
            {t("detail.more")}
          </summary>
          <div className="border-t border-line p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {order.sourceText || t("detail.noOriginal")}
            </p>
            {order.files.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("detail.files")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {order.files.map((file) =>
                    file.url ? (
                      <a
                        key={file.id || file.relativePath}
                        className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-navy hover:border-navy"
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.originalName}
                      </a>
                    ) : (
                      <span
                        key={file.id || file.relativePath}
                        className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600"
                      >
                        {file.originalName}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </>
  );
}
