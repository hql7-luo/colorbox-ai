"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/language-provider";
import type { TranslationKey } from "@/i18n";
import { usePublicDemo } from "@/components/public-demo-provider";

type SettingsData = {
  setting: {
    companyName: string;
    defaultSalesperson: string | null;
    defaultTradeTerm: string | null;
    defaultLanguage: "中文" | "English";
  };
  ai: { configured: boolean; baseUrl: string; model: string };
  uploadDirectory: string;
};

const rules: TranslationKey[] = [
  "settings.rule.quantity",
  "settings.rule.sku",
  "settings.rule.size",
  "settings.rule.paper",
  "settings.rule.foil",
  "settings.rule.window",
  "settings.rule.gang",
  "settings.rule.dieline",
  "settings.rule.pantone",
  "settings.rule.delivery",
  "settings.rule.glue",
  "settings.rule.carton",
];

export function SettingsPanel() {
  const { t } = useLanguage();
  const publicDemo = usePublicDemo();
  const [data, setData] = useState<SettingsData | null>(null);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then(setData)
      .catch(() => setMessage("error.loadSettings"));
  }, []);
  async function save() {
    if (!data) return;
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.setting),
    });
    await response.json();
    setMessage(response.ok ? "settings.saved" : "error.saveSettings");
  }
  if (!data)
    return (
      <div className="card p-12 text-center text-sm text-slate-500">
        {message ? t(message) : t("settings.loading")}
      </div>
    );
  return (
    <>
      <div className="mb-6">
        <p className="eyebrow">{t("settings.eyebrow")}</p>
        <h1 className="font-display text-3xl font-black tracking-tight">{t("settings.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("settings.description")}</p>
      </div>
      {message && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {t(message)}
        </div>
      )}
      {publicDemo && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t("public.settings")}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="section-title">{t("settings.basic")}</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <label>
              <span className="label">{t("settings.company")}</span>
              <input
                className="input"
                disabled={publicDemo}
                value={data.setting.companyName}
                onChange={(event) =>
                  setData({
                    ...data,
                    setting: { ...data.setting, companyName: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span className="label">{t("settings.salesperson")}</span>
              <input
                className="input"
                disabled={publicDemo}
                value={data.setting.defaultSalesperson || ""}
                onChange={(event) =>
                  setData({
                    ...data,
                    setting: { ...data.setting, defaultSalesperson: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span className="label">{t("settings.tradeTerms")}</span>
              <input
                className="input"
                disabled={publicDemo}
                value={data.setting.defaultTradeTerm || ""}
                onChange={(event) =>
                  setData({
                    ...data,
                    setting: { ...data.setting, defaultTradeTerm: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span className="label">{t("settings.defaultLanguage")}</span>
              <select
                className="input"
                disabled={publicDemo}
                value={data.setting.defaultLanguage}
                onChange={(event) =>
                  setData({
                    ...data,
                    setting: {
                      ...data.setting,
                      defaultLanguage: event.target.value as "中文" | "English",
                    },
                  })
                }
              >
                <option value="中文">{t("language.zh")}</option>
                <option value="English">{t("language.en")}</option>
              </select>
            </label>
            <button className="btn-primary" onClick={() => void save()} disabled={publicDemo}>
              {t("settings.save")}
            </button>
          </div>
        </section>
        <div className="space-y-5">
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="section-title">{t("settings.aiStatus")}</h2>
                <p className="mt-1 text-sm text-slate-500">{t("settings.aiPrivacy")}</p>
              </div>
              <span
                className={
                  data.ai.configured
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-green"
                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                }
              >
                {data.ai.configured ? t("settings.configured") : t("settings.notConfigured")}
              </span>
            </div>
            <div className="card-body space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t("settings.model")}</span>
                <strong>{data.ai.model}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t("settings.endpoint")}</span>
                <strong className="max-w-[70%] truncate">{data.ai.baseUrl}</strong>
              </div>
              <p className="rounded-lg bg-slate-50 p-3 leading-6 text-slate-600">
                {t("settings.aiFallback")}
              </p>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="section-title">{t("settings.fileStorage")}</h2>
                <p className="mt-1 text-sm text-slate-500">{t("settings.filePrivacy")}</p>
              </div>
            </div>
            <div className="card-body">
              <p className="rounded-lg bg-slate-50 p-3 font-mono text-sm">{data.uploadDirectory}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">{t("settings.backup")}</p>
            </div>
          </section>
        </div>
        <section className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="section-title">{t("settings.rules")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("settings.rulesHint")}</p>
            </div>
          </div>
          <div className="card-body grid gap-2 md:grid-cols-2">
            {rules.map((rule, index) => (
              <div
                key={rule}
                className="flex gap-3 rounded-lg border border-line px-4 py-3 text-sm"
              >
                <span className="font-black text-navy">{String(index + 1).padStart(2, "0")}</span>
                <span>{t(rule)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
