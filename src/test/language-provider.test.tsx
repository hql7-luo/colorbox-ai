// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "@/i18n/language-provider";

function LanguageProbe() {
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <span>{language}</span>
      <button type="button" onClick={() => setLanguage("en")}>
        EN
      </button>
      <button type="button" onClick={() => setLanguage("zh")}>
        中
      </button>
    </div>
  );
}

describe("LanguageProvider document language", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    document.documentElement.lang = "zh-CN";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ setting: { defaultLanguage: "Chinese" }, publicDemo: true }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses Chinese by default and synchronizes English and Chinese changes", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    expect(document.documentElement.lang).toBe("zh-CN");
    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(document.documentElement.lang).toBe("en");
    await user.click(screen.getByRole("button", { name: "中" }));
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
