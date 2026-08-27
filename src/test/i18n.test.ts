import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, resolveStoredLanguage, translate, type Language } from "@/i18n";
import { translateRisk, translateStatus } from "@/i18n/domain";
import { languageReducer } from "@/i18n/language-provider";
import { useWizardStore } from "@/store/wizard";

describe("全站中英文切换", () => {
  it("默认使用中文并读取已保存语言", () => {
    expect(DEFAULT_LANGUAGE).toBe("zh");
    expect(resolveStoredLanguage(null)).toBe("zh");
    expect(resolveStoredLanguage("en")).toBe("en");
  });

  it("支持中文切英文和英文切中文", () => {
    let state: { language: Language } = { language: "zh" };
    state = languageReducer(state, { type: "set", language: "en" });
    expect(state.language).toBe("en");
    expect(translate(state.language, "nav.review")).toBe("Review Order");
    state = languageReducer(state, { type: "set", language: "zh" });
    expect(state.language).toBe("zh");
    expect(translate(state.language, "nav.review")).toBe("新建审单");
  });

  it("翻译稳定状态代码和风险代码", () => {
    expect(translateStatus("RISK_FOUND", "zh")).toBe("有风险");
    expect(translateStatus("RISK_FOUND", "en")).toBe("Risk Found");
    const risk = { code: "FOIL_POSITION_UNKNOWN", severity: "IMPORTANT" } as const;
    expect(translateRisk(risk, "zh")).toContain("烫箔位置");
    expect(translateRisk(risk, "en")).toContain("foil position");
  });

  it("切换系统语言不会清空当前审单临时状态", () => {
    useWizardStore.getState().reset();
    useWizardStore.getState().setStep(2);
    useWizardStore.getState().setNotice("notice.demoLoaded");
    const before = useWizardStore.getState();
    languageReducer({ language: "zh" }, { type: "set", language: "en" });
    const after = useWizardStore.getState();
    expect(after.step).toBe(before.step);
    expect(after.notice).toBe("notice.demoLoaded");
  });
});
