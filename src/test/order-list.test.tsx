// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderList } from "@/components/order-list";
import { PublicDemoProvider } from "@/components/public-demo-provider";
import { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { LanguageProvider } from "@/i18n/language-provider";
import { getDemoClientOrders } from "@/lib/demo-orders";

function renderOrders() {
  render(
    <PublicDemoProvider publicDemo>
      <LanguageProvider>
        <OrderList />
      </LanguageProvider>
    </PublicDemoProvider>,
  );
}

describe("Order list loading", () => {
  beforeEach(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    window.history.replaceState({}, "", "/orders");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(["network", "http", "invalid-json"])(
    "settles loading and shows an error after a %s failure",
    async (failure) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          if (failure === "network") throw new Error("offline");
          if (failure === "http") return Response.json({ error: "unavailable" }, { status: 500 });
          return new Response("invalid json", { headers: { "Content-Type": "application/json" } });
        }),
      );

      renderOrders();

      expect(await screen.findByRole("status")).toHaveProperty(
        "textContent",
        "Could not load orders. Please try again.",
      );
      expect(screen.queryByText("Loading orders…")).toBeNull();
      expect(screen.queryByText("No orders found.")).toBeNull();
    },
  );

  it("ignores an older response after a search has changed", async () => {
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const orders = getDemoClientOrders();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (!url.searchParams.get("search")) return firstResponse;
      return Response.json({ orders: [orders[1]], customers: [orders[1].customerName] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderOrders();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await user.type(screen.getByRole("textbox"), "Northstar");
    expect(await screen.findByText(orders[1].orderNo)).toBeTruthy();

    await act(async () => {
      resolveFirst(Response.json({ orders: [orders[0]], customers: [orders[0].customerName] }));
      await firstResponse;
    });

    expect(screen.queryByText(orders[0].orderNo)).toBeNull();
    expect(screen.getByText(orders[1].orderNo)).toBeTruthy();
    expect(screen.queryByText("Loading orders…")).toBeNull();
  });
});
