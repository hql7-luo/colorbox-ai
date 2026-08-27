"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ProcessSteps } from "@/components/process-steps";
import { ProductionReviewSheet } from "@/components/production-review-sheet";
import { ReviewFindings } from "@/components/review-findings";
import { DEMO_CONFIDENCE, DEMO_FILE, DEMO_INQUIRY, DEMO_REVIEW, DEMO_SPEC } from "@/lib/demo";
import {
  emptyOrderSpec,
  surfaceFinishes,
  type Confidence,
  type OrderSpec,
} from "@/lib/order-schema";
import { deriveStatus, reviewOrder, type ReviewResult } from "@/lib/review";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo";
import { useWizardStore } from "@/store/wizard";
import type { ClientFile, ClientOrder } from "@/types";
import { useLanguage } from "@/i18n/language-provider";
import type { TranslationKey } from "@/i18n";
import { translateFinish } from "@/i18n/domain";

type FormValues = {
  customerName: string;
  salesperson: string;
  sourceText: string;
  internalNotes: string;
  reviewer: string;
  spec: OrderSpec;
};

type FieldConfig = {
  name: keyof OrderSpec;
  label: TranslationKey;
  type?: "text" | "number" | "boolean" | "textarea";
  placeholder?: TranslationKey;
};

const moreSections: Array<{ title: TranslationKey; fields: FieldConfig[] }> = [
  {
    title: "review.section.order",
    fields: [
      { name: "productType", label: "field.productType" },
      {
        name: "quantityPerSku",
        label: "field.quantityPerSku",
        placeholder: "placeholder.quantityPerSku",
      },
      { name: "destination", label: "field.destination" },
      { name: "tradeTerm", label: "field.tradeTerm" },
    ],
  },
  {
    title: "review.section.dieline",
    fields: [
      { name: "boxType", label: "field.boxType" },
      { name: "flatSize", label: "field.flatSize" },
      { name: "dielineStatus", label: "field.dielineStatus" },
      { name: "usesCustomerDieline", label: "field.usesCustomerDieline", type: "boolean" },
      { name: "needsNewDieline", label: "field.needsNewDieline", type: "boolean" },
    ],
  },
  {
    title: "review.section.material",
    fields: [
      { name: "corrugatedType", label: "field.corrugatedType" },
      { name: "mountingRequirement", label: "field.mountingRequirement" },
      {
        name: "materialSpecialRequirement",
        label: "field.materialSpecialRequirement",
        type: "textarea",
      },
      { name: "backColors", label: "field.backColors" },
      { name: "cmyk", label: "field.cmyk", type: "boolean" },
      { name: "pantone", label: "field.pantone", placeholder: "placeholder.pantone" },
      { name: "whiteInk", label: "field.whiteInk", type: "boolean" },
      { name: "fileVersionCount", label: "field.fileVersionCount", type: "number" },
      { name: "multipleSkusGangRun", label: "field.multipleSkusGangRun", type: "boolean" },
    ],
  },
  {
    title: "review.section.process",
    fields: [
      { name: "finishOther", label: "field.finishOther" },
      { name: "foilColor", label: "field.foilColor" },
      { name: "foilPosition", label: "field.foilPosition" },
      { name: "windowMaterial", label: "field.windowMaterial" },
      { name: "windowSize", label: "field.windowSize" },
      { name: "mounting", label: "field.mounting", type: "boolean" },
      { name: "insert", label: "field.insert" },
      { name: "glueFlapDirection", label: "field.glueFlapDirection" },
      { name: "cartonRequirement", label: "field.cartonRequirement" },
      { name: "cartonQuantity", label: "field.cartonQuantity", type: "number" },
    ],
  },
  {
    title: "review.section.files",
    fields: [
      { name: "designReceived", label: "field.designReceived", type: "boolean" },
      { name: "dielineReceived", label: "field.dielineReceived", type: "boolean" },
      { name: "fileFormat", label: "field.fileFormat" },
      { name: "finalArtwork", label: "field.finalArtwork", type: "boolean" },
      { name: "colorConfirmed", label: "field.colorConfirmed", type: "boolean" },
      {
        name: "processPositionConfirmed",
        label: "field.processPositionConfirmed",
        type: "boolean",
      },
    ],
  },
];

const primaryFields: Record<string, FieldConfig> = {
  customerName: { name: "customerName", label: "field.customerName" },
  productName: { name: "productName", label: "field.productName" },
  quantity: { name: "quantity", label: "field.quantity", type: "number" },
  skuCount: { name: "skuCount", label: "field.skuCount", type: "number" },
  paperType: { name: "paperType", label: "field.paperType" },
  paperWeight: { name: "paperWeight", label: "field.paperWeight", type: "number" },
  printingMethod: { name: "printingMethod", label: "field.printingMethod" },
  frontColors: { name: "frontColors", label: "field.frontColors" },
  packagingMethod: { name: "packagingMethod", label: "field.packagingMethod" },
  deliveryDate: { name: "deliveryDate", label: "field.deliveryDate" },
};

const positiveNumberFields = [
  "quantity",
  "skuCount",
  "length",
  "width",
  "height",
  "paperWeight",
  "fileVersionCount",
  "cartonQuantity",
] as const satisfies ReadonlyArray<keyof OrderSpec>;

function normalizeNumbers(spec: OrderSpec): OrderSpec {
  const normalized = { ...spec };
  for (const field of positiveNumberFields) {
    const value = normalized[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      normalized[field] = null as never;
    }
  }
  return normalized;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function reviewFromAiOutput(output: {
  missingFields: ReviewResult["missingFields"];
  riskItems: ReviewResult["riskItems"];
  customerQuestions: ReviewResult["customerQuestions"];
  internalSummary: string;
}): ReviewResult {
  return { ...output, reviewSheet: "" };
}

export function ReviewWizard() {
  const { language, t } = useLanguage();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id") || "";
  const isDemo = searchParams.get("demo") === "1";
  const showDemoSheet = isDemo && searchParams.get("stage") === "sheet";
  const hasHomeIntake = searchParams.get("intake") === "1";
  const initialized = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [generated, setGenerated] = useState(false);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const {
    step,
    files,
    confidence,
    notice,
    review,
    savedOrder,
    setStep,
    setFiles,
    setConfidence,
    setNotice,
    setReview,
    setSavedOrder,
    reset: resetStore,
  } = useWizardStore();

  const { register, getValues, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      customerName: "",
      salesperson: "",
      sourceText: "",
      internalNotes: "",
      reviewer: "",
      spec: { ...emptyOrderSpec },
    },
  });
  const finishes = watch("spec.finishes") || [];

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    resetStore();

    async function initialize() {
      if (editingId) {
        setBusy(true);
        try {
          const response = await fetch(`/api/orders/${editingId}`, { cache: "no-store" });
          const order = (await response.json()) as ClientOrder & { error?: string };
          if (!response.ok || order.error) throw new Error("load failed");
          reset({
            customerName: order.customerName,
            salesperson: order.salesperson || "",
            sourceText: order.sourceText || "",
            internalNotes: order.internalNotes || "",
            reviewer: order.reviewer || "",
            spec: order.spec,
          });
          setFiles(order.files);
          setConfidence(order.confidence);
          setReview({
            missingFields: order.missingFields,
            riskItems: order.riskItems,
            customerQuestions: order.customerQuestions,
            internalSummary: order.internalSummary || "",
            reviewSheet: order.reviewSheet || "",
          });
          setSavedOrder(order);
          setNotice("notice.savedLoaded");
          setStep(2);
        } catch {
          setMessage("error.loadOrder");
        } finally {
          setBusy(false);
        }
        return;
      }

      if (isDemo) {
        const demoCreatedAt = "2026-08-27T08:00:00.000Z";
        const demoReview = reviewOrder(
          DEMO_SPEC,
          "DEMO-CBX-001",
          { salesperson: "Demo Sales", reviewer: "Demo Reviewer", createdAt: demoCreatedAt },
          language,
        );
        reset({
          customerName: DEMO_SPEC.customerName,
          salesperson: "Demo Sales",
          sourceText: DEMO_INQUIRY,
          internalNotes: "",
          reviewer: "Demo Reviewer",
          spec: { ...DEMO_SPEC },
        });
        setFiles([DEMO_FILE]);
        setConfidence(DEMO_CONFIDENCE);
        setReview(showDemoSheet ? demoReview : DEMO_REVIEW);
        setNotice("notice.demoLoaded");
        if (showDemoSheet && PUBLIC_DEMO_MODE) {
          setSavedOrder({
            id: "public-demo-session",
            orderNo: "DEMO-CBX-001",
            isDemo: true,
            customerName: DEMO_SPEC.customerName,
            productName: DEMO_SPEC.productName,
            quantity: DEMO_SPEC.quantity,
            status: deriveStatus("reviewed", demoReview.missingFields, demoReview.riskItems),
            salesperson: "Demo Sales",
            sourceText: DEMO_INQUIRY,
            internalNotes: "",
            reviewer: "Demo Reviewer",
            internalSummary: demoReview.internalSummary,
            reviewSheet: demoReview.reviewSheet,
            createdAt: demoCreatedAt,
            updatedAt: demoCreatedAt,
            spec: DEMO_SPEC,
            confidence: DEMO_CONFIDENCE,
            missingFields: demoReview.missingFields,
            riskItems: demoReview.riskItems,
            customerQuestions: demoReview.customerQuestions,
            files: [DEMO_FILE],
          });
          setGenerated(true);
        }
        setStep(2);
        if (showDemoSheet && PUBLIC_DEMO_MODE) setStep(3);
        return;
      }

      const settingsResponse = await fetch("/api/settings");
      const settingsData = await settingsResponse.json();
      const defaults = {
        salesperson: settingsData.setting?.defaultSalesperson || "",
        tradeTerm: settingsData.setting?.defaultTradeTerm || "",
      };

      if (hasHomeIntake) {
        const raw = sessionStorage.getItem("colorbox-intake");
        sessionStorage.removeItem("colorbox-intake");
        if (raw) {
          try {
            const intake = JSON.parse(raw) as { sourceText: string; files: ClientFile[] };
            setBusy(true);
            setFiles(intake.files || []);
            const response = await fetch("/api/ai/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sourceText: intake.sourceText,
                customerName: "",
                files: intake.files || [],
                language,
              }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error("extract failed");
            const spec = {
              ...data.output.extractedFields,
              tradeTerm: data.output.extractedFields.tradeTerm || defaults.tradeTerm,
            };
            reset({
              customerName: spec.customerName,
              salesperson: defaults.salesperson,
              sourceText: intake.sourceText,
              internalNotes: "",
              reviewer: "",
              spec,
            });
            setConfidence(data.output.confidence);
            setReview(reviewFromAiOutput(data.output));
            setNotice(data.noticeCode as TranslationKey);
            setStep(2);
          } catch {
            setMessage("error.extract");
            setStep(1);
          } finally {
            setBusy(false);
          }
          return;
        }
      }

      setValue("salesperson", defaults.salesperson);
      setValue("spec.tradeTerm", defaults.tradeTerm);
    }

    void initialize();
  }, [
    editingId,
    hasHomeIntake,
    isDemo,
    language,
    reset,
    resetStore,
    setConfidence,
    setFiles,
    setNotice,
    setReview,
    setSavedOrder,
    setStep,
    setValue,
    showDemoSheet,
  ]);

  async function uploadFiles(selected: FileList | File[]) {
    const list = Array.from(selected);
    if (!list.length) return;
    if (PUBLIC_DEMO_MODE) {
      setMessage("public.uploadDisabled");
      return;
    }
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    list.forEach((file) => formData.append("files", file));
    formData.append("sessionId", sessionId);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error("upload failed");
      setFiles([...files, ...data.files]);
    } catch {
      setMessage("error.upload");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(file: ClientFile) {
    if (!file.id) {
      await fetch(`/api/uploads?path=${encodeURIComponent(file.relativePath)}`, {
        method: "DELETE",
      });
    }
    setFiles(files.filter((item) => item.relativePath !== file.relativePath));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void uploadFiles(event.dataTransfer.files);
  }

  async function startExtraction() {
    const values = getValues();
    if (!values.sourceText.trim() && !files.length) {
      setMessage("error.intakeRequired");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: values.sourceText,
          customerName: values.customerName,
          files,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("extract failed");
      const spec = {
        ...data.output.extractedFields,
        customerName: data.output.extractedFields.customerName || values.customerName,
        tradeTerm: data.output.extractedFields.tradeTerm || values.spec.tradeTerm,
      };
      reset({ ...values, customerName: spec.customerName, spec });
      setConfidence(data.output.confidence);
      setReview(reviewFromAiOutput(data.output));
      setNotice(data.noticeCode as TranslationKey);
      setStep(2);
    } catch {
      setMessage("error.extract");
    } finally {
      setBusy(false);
    }
  }

  function confidenceFor(name: keyof OrderSpec): Confidence {
    return confidence[name] || "UNKNOWN";
  }

  function renderField(field: FieldConfig) {
    const confidenceValue = confidenceFor(field.name);
    const fieldPath = `spec.${field.name}` as const;
    const commonClass = clsx(
      field.type === "textarea" ? "textarea" : "input",
      (confidenceValue === "LOW" || confidenceValue === "UNKNOWN") &&
        "border-orange/40 bg-orange-soft/30",
    );
    return (
      <label key={field.name}>
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{t(field.label)}</span>
          <ConfidenceBadge value={confidenceValue} />
        </span>
        {field.type === "boolean" ? (
          <select
            className={commonClass}
            value={String(watch(fieldPath) ?? "")}
            onChange={(event) =>
              setValue(
                fieldPath,
                event.target.value === "" ? null : event.target.value === "true",
                { shouldDirty: true },
              )
            }
          >
            <option value="">{t("review.toConfirm")}</option>
            <option value="true">{t("review.yes")}</option>
            <option value="false">{t("review.no")}</option>
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            className={commonClass}
            placeholder={field.placeholder ? t(field.placeholder) : undefined}
            {...register(fieldPath)}
          />
        ) : (
          <input
            className={commonClass}
            type={field.type === "number" ? "number" : "text"}
            step={field.type === "number" ? "any" : undefined}
            placeholder={field.placeholder ? t(field.placeholder) : undefined}
            {...register(
              fieldPath,
              field.type === "number"
                ? {
                    setValueAs: (value) =>
                      value === "" || value === null || value === undefined ? null : Number(value),
                  }
                : undefined,
            )}
          />
        )}
      </label>
    );
  }

  async function runReview() {
    const values = getValues();
    const spec = normalizeNumbers(values.spec);
    if (!spec.customerName.trim()) return setMessage("error.customerRequired");
    if (!spec.productName.trim()) return setMessage("error.productRequired");
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          orderNo: savedOrder?.orderNo,
          salesperson: values.salesperson,
          notes: values.internalNotes,
          reviewer: values.reviewer,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("review failed");
      setReview(data as ReviewResult);
      setGenerated(false);
      setStep(3);
    } catch {
      setMessage("error.review");
    } finally {
      setBusy(false);
    }
  }

  async function generateOrder() {
    if (!review) return;
    const values = getValues();
    const normalizedSpec = normalizeNumbers(values.spec);
    if (PUBLIC_DEMO_MODE) {
      const orderNo = isDemo ? "DEMO-CBX-001" : "SESSION-PREVIEW";
      const createdAt = new Date().toISOString();
      const publicReview = reviewOrder(
        normalizedSpec,
        orderNo,
        {
          salesperson: values.salesperson,
          notes: values.internalNotes,
          reviewer: values.reviewer,
          createdAt,
        },
        language,
      );
      setSavedOrder({
        id: "public-demo-session",
        orderNo,
        isDemo,
        customerName: normalizedSpec.customerName,
        productName: normalizedSpec.productName,
        quantity: normalizedSpec.quantity,
        status: deriveStatus("reviewed", publicReview.missingFields, publicReview.riskItems),
        salesperson: values.salesperson,
        sourceText: values.sourceText,
        internalNotes: values.internalNotes,
        reviewer: values.reviewer,
        internalSummary: publicReview.internalSummary,
        reviewSheet: publicReview.reviewSheet,
        createdAt,
        updatedAt: createdAt,
        spec: normalizedSpec,
        confidence,
        missingFields: publicReview.missingFields,
        riskItems: publicReview.riskItems,
        customerQuestions: publicReview.customerQuestions,
        files,
      });
      setReview(publicReview);
      setGenerated(true);
      setMessage(null);
      return;
    }
    const payload = {
      customerName: values.spec.customerName,
      productName: values.spec.productName,
      salesperson: values.salesperson,
      sourceText: values.sourceText,
      internalNotes: values.internalNotes,
      reviewer: values.reviewer,
      spec: normalizedSpec,
      confidence,
      files,
      language,
    };
    setBusy(true);
    setMessage(null);
    try {
      const targetId = savedOrder?.id || editingId;
      const response = await fetch(targetId ? `/api/orders/${targetId}` : "/api/orders", {
        method: targetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("generate failed");
      setSavedOrder(data);
      setReview({
        missingFields: data.missingFields,
        riskItems: data.riskItems,
        customerQuestions: data.customerQuestions,
        internalSummary: data.internalSummary,
        reviewSheet: data.reviewSheet,
      });
      setGenerated(true);
      setMessage(null);
    } catch {
      setMessage("error.generate");
    } finally {
      setBusy(false);
    }
  }

  if (busy && step === 1 && (editingId || hasHomeIntake)) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm font-bold text-navy">{t("review.extracting")}</p>
        <p className="mt-2 text-sm text-slate-500">{t("review.extractingHint")}</p>
      </div>
    );
  }

  return (
    <>
      {!(step === 3 && generated) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{t("review.eyebrow")}</p>
            <h1 className="font-display text-3xl font-black tracking-tight">
              {editingId ? t("review.savedTitle") : t("review.title")}
            </h1>
          </div>
          {savedOrder && (
            <Link
              href={`/orders/${savedOrder.id}`}
              className="text-sm font-semibold text-slate-500 hover:text-navy"
            >
              {t("review.viewHistory")}
            </Link>
          )}
        </div>
      )}

      {!(step === 3 && generated) && <ProcessSteps current={step} />}

      {PUBLIC_DEMO_MODE && !(step === 3 && generated) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>{t("public.mode")}</span>
          {isDemo && <strong className="text-navy">{t("public.demoData")}</strong>}
        </div>
      )}

      {(message || notice) && !(step === 3 && generated) && (
        <div
          className={clsx(
            "mt-5 rounded-lg border px-4 py-3 text-sm",
            message
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-white text-slate-600",
          )}
          role="status"
        >
          {message ? t(message) : notice ? t(notice) : null}
        </div>
      )}

      {step === 1 && (
        <section className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-6 py-5 sm:px-8">
            <h2 className="section-title">{t("review.uploadTitle")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("review.uploadDescription")}</p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            <div
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-navy"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <p className="font-bold">{t("home.dropTitle")}</p>
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t("home.uploading") : t("home.chooseFiles")}
              </button>
              <input
                ref={inputRef}
                className="hidden"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.doc,.docx,.txt"
                onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
              />
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <span
                    key={file.relativePath}
                    className="rounded-md border border-line px-3 py-2 text-sm"
                  >
                    {file.originalName} · {formatBytes(file.size)}
                    <button
                      type="button"
                      className="ml-2 text-slate-400 hover:text-red-700"
                      onClick={() => void removeFile(file)}
                      aria-label={t("home.removeFile", { name: file.originalName })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label>
              <span className="label">{t("home.pasteLabel")}</span>
              <textarea
                className="textarea min-h-40"
                placeholder={t("review.pastePlaceholder")}
                {...register("sourceText")}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">{t("review.customerOptional")}</span>
                <input className="input" {...register("customerName")} />
              </label>
              <label>
                <span className="label">{t("review.salesperson")}</span>
                <input className="input" {...register("salesperson")} />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-primary min-w-40"
                onClick={() => void startExtraction()}
                disabled={busy || uploading}
              >
                {busy ? t("review.starting") : t("review.start")}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                <div>
                  <h2 className="section-title">{t("review.specTitle")}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t("review.specDescription")}</p>
                </div>
                {files.length > 0 && (
                  <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    {files[0].originalName}
                    {files.length > 1 ? ` +${files.length - 1}` : ""}
                  </span>
                )}
              </div>
              <div className="space-y-7 p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {renderField(primaryFields.customerName)}
                  {renderField(primaryFields.productName)}
                  {renderField(primaryFields.quantity)}
                  {renderField(primaryFields.skuCount)}
                </div>

                <fieldset>
                  <legend className="label">{t("review.finishedSize")}</legend>
                  <div className="grid grid-cols-3 gap-3">
                    {renderField({ name: "length", label: "field.length", type: "number" })}
                    {renderField({ name: "width", label: "field.width", type: "number" })}
                    {renderField({ name: "height", label: "field.height", type: "number" })}
                  </div>
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  {renderField(primaryFields.paperType)}
                  {renderField(primaryFields.paperWeight)}
                  {renderField(primaryFields.printingMethod)}
                  {renderField(primaryFields.frontColors)}
                </div>

                <fieldset>
                  <legend className="label">{t("review.finishes")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {surfaceFinishes.map((finish) => {
                      const active = finishes.includes(finish);
                      return (
                        <button
                          type="button"
                          key={finish}
                          onClick={() =>
                            setValue(
                              "spec.finishes",
                              active
                                ? finishes.filter((item) => item !== finish)
                                : [...finishes, finish],
                              { shouldDirty: true },
                            )
                          }
                          className={clsx(
                            "rounded-md border px-3 py-2 text-sm font-semibold",
                            active
                              ? "border-navy bg-navy text-white"
                              : "border-slate-300 bg-white hover:border-navy",
                          )}
                        >
                          {active ? "✓ " : ""}
                          {translateFinish(finish, language)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="label">{t("review.postProcessing")}</legend>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {renderField({ name: "dieCut", label: "field.dieCut", type: "boolean" })}
                    {renderField({ name: "creasing", label: "field.creasing", type: "boolean" })}
                    {renderField({ name: "gluing", label: "field.gluing", type: "boolean" })}
                    {renderField({
                      name: "manualAssembly",
                      label: "field.manualAssembly",
                      type: "boolean",
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  {renderField(primaryFields.packagingMethod)}
                  {renderField(primaryFields.deliveryDate)}
                </div>
              </div>
            </section>

            <details className="group overflow-hidden rounded-xl border border-line bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold hover:bg-slate-50 sm:px-6">
                <span>{t("review.more")}</span>
                <span className="text-slate-400 group-open:rotate-45">＋</span>
              </summary>
              <div className="space-y-8 border-t border-line p-5 sm:p-6">
                {moreSections.map((section) => (
                  <section key={section.title}>
                    <h3 className="mb-4 text-sm font-black text-ink">{t(section.title)}</h3>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {section.fields.map(renderField)}
                    </div>
                  </section>
                ))}
                <section>
                  <h3 className="mb-4 text-sm font-black text-ink">
                    {t("review.section.internal")}
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="label">{t("review.reviewer")}</span>
                      <input className="input" {...register("reviewer")} />
                    </label>
                    <label>
                      <span className="label">{t("review.internalNotes")}</span>
                      <textarea className="textarea min-h-24" {...register("internalNotes")} />
                    </label>
                  </div>
                </section>
              </div>
            </details>

            {watch("sourceText") && (
              <details className="group overflow-hidden rounded-xl border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold hover:bg-slate-50 sm:px-6">
                  <span>{t("review.originalRequest")}</span>
                  <span className="text-slate-400 group-open:rotate-45">＋</span>
                </summary>
                <pre className="whitespace-pre-wrap border-t border-line p-5 font-sans text-sm leading-6 text-slate-600 sm:p-6">
                  {watch("sourceText")}
                </pre>
              </details>
            )}
          </div>

          <aside className="rounded-2xl border border-line bg-white p-5 sm:p-6 lg:sticky lg:top-24">
            <p className="eyebrow">{t("review.checkEyebrow")}</p>
            <h2 className="section-title">{t("review.checkTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("review.checkDescription")}</p>
            <div className="mt-6">
              <ReviewFindings review={review} compact />
            </div>
          </aside>

          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-card lg:col-span-2">
            <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
              {t("review.back")}
            </button>
            <button
              className="btn-primary min-w-36"
              type="button"
              onClick={() => void runReview()}
              disabled={busy}
            >
              {busy ? t("review.checking") : t("review.confirm")}
            </button>
          </div>
        </div>
      )}

      {step === 3 && review && !generated && (
        <section className="mx-auto mt-8 max-w-4xl">
          <div className="text-center">
            <p className="eyebrow">{t("review.confirmedEyebrow")}</p>
            <h2 className="font-display text-3xl font-black tracking-tight">
              {t("review.confirmedTitle")}
            </h2>
            <p className="mt-3 text-base font-semibold text-slate-600">
              {t("review.foundSummary", {
                missing: review.missingFields.length,
                risks: review.riskItems.length,
              })}
            </p>
          </div>
          <div className="mt-7 rounded-2xl border border-line bg-white p-5 sm:p-7">
            <ReviewFindings review={review} />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setGenerated(false);
                setStep(2);
              }}
            >
              {t("review.edit")}
            </button>
            <button
              className="btn-primary min-w-36"
              type="button"
              onClick={() => void generateOrder()}
              disabled={busy}
            >
              {busy ? t("review.generating") : t("review.generate")}
            </button>
          </div>
        </section>
      )}

      {step === 3 && review && generated && savedOrder && (
        <ProductionReviewSheet spec={getValues("spec")} review={review} order={savedOrder} />
      )}
    </>
  );
}
