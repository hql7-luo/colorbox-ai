"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { formatDateTime, translate, type Language, type TranslationKey } from "@/i18n";
import { translateFinish, translateMissing, translateRisk, translateSeverity } from "@/i18n/domain";
import { useLanguage } from "@/i18n/language-provider";
import type { OrderSpec } from "@/lib/order-schema";
import { buildInternalSummary, type ReviewResult } from "@/lib/review";
import { buildExcelRows } from "@/lib/export";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo";
import type { ClientOrder } from "@/types";

function copyWithTextarea(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyText(text: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
  } catch {
    copyWithTextarea(text);
  }
}

export function ProductionReviewSheet({
  spec,
  review,
  order,
}: {
  spec: OrderSpec;
  review: ReviewResult;
  order: ClientOrder;
}) {
  const { language, t } = useLanguage();
  const [exportLanguage, setExportLanguage] = useState<Language>(language);
  const [customerLanguage, setCustomerLanguage] = useState<Language>("en");
  const [copied, setCopied] = useState<"summary" | "questions" | null>(null);
  const exportLanguageTouched = useRef(false);

  useEffect(() => {
    if (!exportLanguageTouched.current) setExportLanguage(language);
  }, [language]);

  const sheetT = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(exportLanguage, key, params);
  const show = (value: unknown) => {
    if (value === null || value === undefined || value === "") return sheetT("review.toConfirm");
    if (typeof value === "boolean") return sheetT(value ? "review.yes" : "review.no");
    return String(value);
  };
  const size =
    spec.length && spec.width && spec.height
      ? `${spec.length} × ${spec.width} × ${spec.height} mm`
      : sheetT("review.toConfirm");
  const finishing =
    spec.finishes
      .map((finish) => translateFinish(finish, exportLanguage))
      .join(exportLanguage === "zh" ? "、" : " / ") || sheetT("result.none");
  const postProcessing = [
    spec.dieCut && sheetT("field.dieCut"),
    spec.creasing && sheetT("field.creasing"),
    spec.gluing && sheetT("field.gluing"),
    spec.mounting && sheetT("field.mounting"),
    spec.manualAssembly && sheetT("field.manualAssembly"),
  ]
    .filter(Boolean)
    .join(" / ");
  const rows = [
    [sheetT("field.customerName"), show(spec.customerName)],
    [sheetT("field.productName"), show(spec.productName)],
    [
      sheetT("field.quantity"),
      `${show(spec.quantity)} ${sheetT("sheet.pieces")}${spec.skuCount ? ` / ${spec.skuCount} ${sheetT("sheet.skus")}` : ""}`,
    ],
    [sheetT("review.finishedSize"), size],
    [sheetT("field.paperType"), `${show(spec.paperWeight)}gsm ${show(spec.paperType)}`],
    [sheetT("field.printingMethod"), `${show(spec.printingMethod)} / ${show(spec.frontColors)}`],
    [sheetT("review.finishes"), finishing],
    [sheetT("review.postProcessing"), postProcessing || sheetT("review.toConfirm")],
    [sheetT("field.packagingMethod"), show(spec.packagingMethod)],
    [sheetT("field.deliveryDate"), show(spec.deliveryDate)],
  ];
  const summary = buildInternalSummary(
    spec,
    review.missingFields,
    review.riskItems,
    exportLanguage,
  );
  const selectedQuestions = review.customerQuestions[customerLanguage];

  async function handleCopy(kind: "summary" | "questions", value: string) {
    await copyText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function exportSessionExcel() {
    const XLSX = await import("xlsx");
    const rows = buildExcelRows(
      order.orderNo,
      spec,
      review.missingFields,
      review.riskItems,
      {
        salesperson: order.salesperson || "",
        notes: order.internalNotes || "",
        reviewer: order.reviewer || "",
        createdAt: formatDateTime(order.createdAt, exportLanguage),
      },
      exportLanguage,
    );
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 28 }, { wch: 90 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      exportLanguage === "zh" ? "生产评审单" : "Review Sheet",
    );
    XLSX.writeFile(workbook, `${order.orderNo}-${exportLanguage}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-green">
          {t("result.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {t("result.title")}
        </h1>
        <p className="mt-4 text-base font-semibold text-slate-600">
          {t("review.foundSummary", {
            missing: review.missingFields.length,
            risks: review.riskItems.length,
          })}
        </p>
        {order.isDemo && (
          <p className="mt-3 text-xs font-semibold text-slate-500">{t("public.demoData")}</p>
        )}
      </header>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
        <span className="text-sm font-bold text-slate-600">{t("result.exportLanguage")}</span>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(["zh", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                exportLanguageTouched.current = true;
                setExportLanguage(option);
              }}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-bold",
                exportLanguage === option ? "bg-white text-navy shadow-sm" : "text-slate-500",
              )}
              aria-pressed={exportLanguage === option}
            >
              {option === "zh" ? t("result.zhVersion") : t("result.enVersion")}
            </button>
          ))}
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_18px_45px_rgba(23,32,51,0.07)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {sheetT("result.document")}
            </p>
            <h2 className="mt-1 text-2xl font-black">{sheetT("result.sheetTitle")}</h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-navy">{order.orderNo}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateTime(order.createdAt, exportLanguage)}
            </p>
          </div>
        </div>

        <dl className="grid sm:grid-cols-2">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={clsx(
                "grid grid-cols-[130px_1fr] border-b border-line px-6 py-4 sm:px-8",
                index % 2 === 0 && "sm:border-r",
              )}
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="text-sm font-semibold leading-6 text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid lg:grid-cols-2">
          <section className="border-b border-line px-6 py-5 sm:px-8 lg:border-b-0 lg:border-r">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {sheetT("result.missing")}
            </h3>
            <ol className="mt-3 space-y-2 text-sm leading-6">
              {review.missingFields.length ? (
                review.missingFields.map((item, index) => (
                  <li key={item.code}>
                    <span className="mr-2 font-mono text-slate-400">{index + 1}.</span>
                    {translateMissing(item, exportLanguage)}
                  </li>
                ))
              ) : (
                <li className="text-green">{sheetT("result.noneMissing")}</li>
              )}
            </ol>
          </section>
          <section className="px-6 py-5 sm:px-8">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {sheetT("result.risks")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {review.riskItems.length ? (
                review.riskItems.map((item) => (
                  <li key={item.code}>
                    <strong
                      className={
                        item.severity === "CONFIRMATION_REQUIRED" ? "text-red-700" : "text-orange"
                      }
                    >
                      {translateSeverity(item.severity, exportLanguage)}:{" "}
                    </strong>
                    {translateRisk(item, exportLanguage)}
                  </li>
                ))
              ) : (
                <li className="text-green">{sheetT("result.noneRisks")}</li>
              )}
            </ul>
          </section>
        </div>
      </article>

      <section className="no-print mt-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-ink">{t("question.title")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("question.language")}</p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["zh", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCustomerLanguage(option)}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-bold",
                  customerLanguage === option ? "bg-white text-navy shadow-sm" : "text-slate-500",
                )}
                aria-pressed={customerLanguage === option}
              >
                {option === "zh" ? t("question.zh") : t("question.en")}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
          {selectedQuestions.map((question, index) => (
            <li key={question}>
              <span className="mr-2 font-mono text-slate-400">{index + 1}.</span>
              {question}
            </li>
          ))}
        </ol>
        <button
          className="btn-secondary mt-4"
          type="button"
          onClick={() => void handleCopy("questions", selectedQuestions.join("\n"))}
        >
          {copied === "questions" ? t("question.copied") : t("question.copy")}
        </button>
      </section>

      <div className="no-print mt-6 flex flex-wrap items-center justify-center gap-3">
        {PUBLIC_DEMO_MODE ? (
          <>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => void exportSessionExcel()}
            >
              {t("result.excel")}
            </button>
            <button className="btn-secondary" type="button" onClick={() => window.print()}>
              {t("result.print")}
            </button>
          </>
        ) : (
          <>
            <a
              className="btn-secondary"
              href={`/api/orders/${order.id}/excel?lang=${exportLanguage}`}
            >
              {t("result.excel")}
            </a>
            <Link
              className="btn-secondary"
              href={`/orders/${order.id}/print?auto=1&lang=${exportLanguage}`}
              target="_blank"
            >
              {t("result.print")}
            </Link>
          </>
        )}
        <button
          className="btn-secondary"
          type="button"
          onClick={() => void handleCopy("summary", summary)}
        >
          {copied === "summary" ? t("result.copied") : t("result.copySummary")}
        </button>
      </div>
    </div>
  );
}
