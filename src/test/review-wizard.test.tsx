// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicDemoProvider } from "@/components/public-demo-provider";
import { AppNav } from "@/components/app-nav";
import { ReviewWizard } from "@/components/review-wizard";
import { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { LanguageProvider } from "@/i18n/language-provider";
import { buildDemoClientOrder, DEMO_IDS, getDemoOrder } from "@/lib/demo-orders";
import { reviewOrder } from "@/lib/review";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => window.location.pathname,
}));

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

function requestPath(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return `${input.pathname}${input.search}`;
  return new URL(input.url).pathname;
}

function orderPersistenceCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input, init]: FetchCall) => {
    const path = requestPath(input);
    const method = init?.method?.toUpperCase() || "GET";
    return /^\/api\/orders(?:\/|$)/.test(path) && ["POST", "PUT", "DELETE"].includes(method);
  });
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = requestPath(input);

    if (path === "/api/settings") {
      return Response.json({
        setting: {
          companyName: "ColorBox Demo Workspace",
          defaultSalesperson: "Demo Sales",
          defaultTradeTerm: "FOB Shenzhen",
          defaultLanguage: "English",
        },
        publicDemo: true,
      });
    }

    if (path === "/api/ai/extract") {
      const demoOrder = buildDemoClientOrder(getDemoOrder("folding-carton")!, "en");
      return Response.json({
        output: {
          extractedFields: demoOrder.spec,
          confidence: demoOrder.confidence,
          missingFields: demoOrder.missingFields,
          riskItems: demoOrder.riskItems,
          customerQuestions: demoOrder.customerQuestions,
          internalSummary: demoOrder.internalSummary,
        },
        noticeCode: "notice.localMode",
      });
    }

    if (path === "/api/review") {
      const body = JSON.parse(String(init?.body || "{}"));
      return Response.json(
        reviewOrder(
          body.spec,
          body.orderNo || "SESSION-PREVIEW",
          {
            salesperson: body.salesperson,
            notes: body.notes,
            reviewer: body.reviewer,
            createdAt: "2026-08-28T08:00:00.000Z",
          },
          body.language,
        ),
      );
    }

    throw new Error(`Unexpected fetch in review wizard test: ${init?.method || "GET"} ${path}`);
  });
}

function renderWizard(publicDemo: boolean) {
  return render(
    <PublicDemoProvider publicDemo={publicDemo}>
      <LanguageProvider>
        <AppNav />
        <ReviewWizard />
      </LanguageProvider>
    </PublicDemoProvider>,
  );
}

async function confirmAndGenerate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Confirm Specs" }));
  await screen.findByRole("heading", { name: "Specifications Confirmed" });
  await user.click(screen.getByRole("button", { name: "Generate Sheet" }));
  await screen.findByRole("heading", { name: "Production Review Sheet Generated" });
}

describe("Public Demo Generate Sheet interaction", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(DEMO_IDS)("%s confirms specs and generates a sheet without persistence", async (id) => {
    window.history.replaceState({}, "", `/new?demo=${id}&lang=en`);
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWizard(false);
    await screen.findByDisplayValue(getDemoOrder(id)!.spec.customerName);
    await confirmAndGenerate(user);

    expect(screen.getByText(getDemoOrder(id)!.orderNo)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print / PDF" })).toBeTruthy();
    expect(orderPersistenceCalls(fetchMock)).toHaveLength(0);
  });

  it("uses the server-provided publicDemo value when NEXT_PUBLIC_DEMO_MODE is false", async () => {
    window.history.replaceState({}, "", "/new?intake=1&lang=en");
    sessionStorage.setItem(
      "colorbox-intake",
      JSON.stringify({
        sourceText:
          "Fictional request: 10,000 folding cartons, 350gsm SBS, CMYK and matte lamination.",
        files: [],
      }),
    );
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWizard(true);
    await screen.findByDisplayValue("Nova Beauty Co.");
    await confirmAndGenerate(user);

    expect(screen.getByText("SESSION-PREVIEW")).toBeTruthy();
    expect(orderPersistenceCalls(fetchMock)).toHaveLength(0);
  });

  it("keeps bilingual, Excel, and print controls available for a generated demo sheet", async () => {
    window.history.replaceState({}, "", "/new?demo=folding-carton&lang=en");
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderWizard(true);
    await confirmAndGenerate(user);

    await user.click(screen.getByRole("button", { name: "中文版" }));
    expect(screen.getByRole("heading", { name: "彩盒生产评审单" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Export Excel" }));
    const XLSX = await import("xlsx");
    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalledOnce());

    await user.click(screen.getByRole("button", { name: "Print / PDF" }));
    expect(printSpy).toHaveBeenCalledOnce();
    expect(orderPersistenceCalls(fetchMock)).toHaveLength(0);
  });

  it("updates the document language without losing the current review state", async () => {
    window.history.replaceState({}, "", "/new?demo=folding-carton");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh");
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWizard(true);
    const productInput = await screen.findByDisplayValue(
      getDemoOrder("folding-carton")!.spec.productName,
    );
    await user.clear(productInput);
    await user.type(productInput, "Edited Cosmetic Carton");

    expect(document.documentElement.lang).toBe("zh-CN");
    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByDisplayValue("Edited Cosmetic Carton")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm Specs" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "中" }));
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(screen.getByDisplayValue("Edited Cosmetic Carton")).toBeTruthy();
    expect(screen.getByRole("button", { name: "确认规格" })).toBeTruthy();
    expect(orderPersistenceCalls(fetchMock)).toHaveLength(0);
  });
});
