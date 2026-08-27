"use client";

import { DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { ClientFile } from "@/types";
import { useLanguage } from "@/i18n/language-provider";
import type { TranslationKey } from "@/i18n";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo";

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function HomeReview() {
  const router = useRouter();
  const { t } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const [sourceText, setSourceText] = useState("");
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);

  async function uploadFiles(selected: FileList | File[]) {
    const selectedFiles = Array.from(selected);
    if (!selectedFiles.length) return;
    if (PUBLIC_DEMO_MODE) {
      setMessage("public.uploadDisabled");
      return;
    }
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("sessionId", sessionId);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "upload failed");
      setFiles((current) => [...current, ...data.files]);
    } catch {
      setMessage("error.upload");
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(event.dataTransfer.files);
  }

  async function removeFile(file: ClientFile) {
    if (!file.id) {
      await fetch(`/api/uploads?path=${encodeURIComponent(file.relativePath)}`, {
        method: "DELETE",
      });
    }
    setFiles((current) => current.filter((item) => item.relativePath !== file.relativePath));
  }

  function startReview() {
    if (!sourceText.trim() && files.length === 0) {
      setMessage("error.intakeRequired");
      return;
    }
    sessionStorage.setItem("colorbox-intake", JSON.stringify({ sourceText, files }));
    router.push("/new?intake=1");
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-green">
          {t("home.eyebrow")}
        </p>
        <h1 className="font-display text-5xl font-black tracking-[-0.04em] text-ink sm:text-6xl">
          ColorBox AI
        </h1>
        <p className="mt-5 text-xl font-semibold tracking-tight text-slate-700 sm:text-2xl">
          {t("home.subtitle")}
        </p>
        <p className="mt-3 text-base leading-7 text-slate-500">{t("home.description")}</p>
      </section>

      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_20px_50px_rgba(23,32,51,0.08)]">
        <div
          className={clsx(
            "m-4 flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors sm:m-6",
            dragging ? "border-navy bg-navy-soft" : "border-slate-300 bg-slate-50/70",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <p className="text-lg font-bold text-ink">{t("home.dropTitle")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("home.dropHint")}</p>
          <button
            type="button"
            className="btn-secondary mt-5"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? t("home.uploading") : t("home.chooseFiles")}
          </button>
          <input
            ref={fileInput}
            className="hidden"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.doc,.docx,.txt"
            onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
          />
          {PUBLIC_DEMO_MODE && (
            <p className="mt-4 text-xs leading-5 text-slate-500">{t("public.mode")}</p>
          )}
        </div>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-7">
            {files.map((file) => (
              <span
                key={file.relativePath}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm"
              >
                <strong className="max-w-56 truncate">{file.originalName}</strong>
                <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="ml-1 text-slate-400 hover:text-red-700"
                  onClick={() => void removeFile(file)}
                  aria-label={t("home.removeFile", { name: file.originalName })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-line p-5 sm:p-7">
          <label>
            <span className="label">{t("home.pasteLabel")}</span>
            <textarea
              className="textarea min-h-28"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder={t("home.pastePlaceholder")}
            />
          </label>
          {message && (
            <p
              className="mt-3 rounded-lg bg-orange-soft px-3 py-2 text-sm text-orange"
              role="status"
            >
              {t(message)}
            </p>
          )}
          <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/new?demo=1")}
            >
              {t("home.tryDemo")}
            </button>
            <button
              type="button"
              className="btn-primary min-w-40 px-7"
              onClick={startReview}
              disabled={uploading}
            >
              {t("home.start")}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-16 border-y border-line py-9">
        <ol className="grid gap-8 md:grid-cols-3">
          {[
            ["01", t("home.step1.title"), t("home.step1.description")],
            ["02", t("home.step2.title"), t("home.step2.description")],
            ["03", t("home.step3.title"), t("home.step3.description")],
          ].map(([number, title, description]) => (
            <li key={number} className="grid grid-cols-[36px_1fr] gap-3">
              <span className="font-mono text-xs font-bold text-slate-400">{number}</span>
              <span>
                <strong className="block text-sm text-ink">{title}</strong>
                <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <p className="eyebrow">{t("home.why")}</p>
        <ul className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3">
          <li>{t("home.value1")}</li>
          <li>{t("home.value2")}</li>
          <li>{t("home.value3")}</li>
        </ul>
      </section>
    </div>
  );
}
