import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GET as listOrders, POST as createOrder } from "@/app/api/orders/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { DEMO_IDS, DEMO_ORDERS, buildDemoClientOrder, getDemoOrder } from "@/lib/demo-orders";
import { prisma } from "@/lib/db";
import { allowsPersistentOrderActions } from "@/lib/public-demo";

describe("统一 Demo 订单", () => {
  it("三个稳定 Demo ID 都可加载", () => {
    expect(DEMO_IDS).toEqual(["folding-carton", "corrugated-box", "rigid-gift-box"]);
    expect(DEMO_IDS.map((id) => getDemoOrder(id)?.id)).toEqual(DEMO_IDS);
    expect(new Set(DEMO_ORDERS.map((order) => order.orderNo)).size).toBe(3);
  });

  it("Demo 数据只有一个源，seed 直接复用", () => {
    const projectRoot = process.cwd();
    expect(existsSync(path.join(projectRoot, "src/lib/demo.ts"))).toBe(false);
    const seedSource = readFileSync(path.join(projectRoot, "prisma/seed.ts"), "utf8");
    expect(seedSource).toContain("../src/lib/demo-orders");
    for (const demo of DEMO_ORDERS) {
      expect(seedSource).not.toContain(demo.spec.customerName);
    }
  });

  it.each(DEMO_IDS)("%s 可运行规则并生成问题与生产评审单", (id) => {
    const definition = getDemoOrder(id)!;
    const order = buildDemoClientOrder(definition, "en");
    expect(order.sourceText.length).toBeGreaterThan(100);
    expect(order.files[0]?.mimeType).toBe("application/pdf");
    expect(order.missingFields.length).toBeGreaterThan(0);
    expect(order.riskItems.length).toBeGreaterThan(0);
    expect(order.customerQuestions.zh.length).toBeGreaterThan(0);
    expect(order.customerQuestions.en.length).toBeGreaterThan(0);
    expect(order.reviewSheet).toContain(order.orderNo);
    expect(order.reviewSheet).toContain("Packaging Production Review Sheet");
  });

  it("Demo 名称和评审单支持中英文", () => {
    const definition = getDemoOrder("rigid-gift-box")!;
    expect(definition.displayName.zh).toBe("天地盖精品礼盒");
    expect(definition.displayName.en).toBe("Rigid Gift Box");
    expect(buildDemoClientOrder(definition, "zh").reviewSheet).toContain("彩盒生产评审单");
    expect(buildDemoClientOrder(definition, "en").reviewSheet).toContain(
      "Packaging Production Review Sheet",
    );
  });
});

describe("Public Demo API", () => {
  it("/api/orders 返回 3 个可搜索、可筛选的只读 Demo", async () => {
    const response = await listOrders(new Request("http://localhost/api/orders"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.publicDemo).toBe(true);
    expect(data.orders).toHaveLength(3);

    const searched = await listOrders(
      new Request("http://localhost/api/orders?search=Northstar&customer=Northstar%20Home"),
    );
    const searchedData = await searched.json();
    expect(searchedData.orders.map((order: { id: string }) => order.id)).toEqual([
      "corrugated-box",
    ]);

    const status = data.orders[0].status;
    const filtered = await listOrders(
      new Request(`http://localhost/api/orders?status=${encodeURIComponent(status)}`),
    );
    expect((await filtered.json()).orders.length).toBeGreaterThan(0);
  });

  it.each(DEMO_IDS)("/api/orders/%s 返回完整 Demo 详情", async (id) => {
    const response = await getOrder(new Request(`http://localhost/api/orders/${id}?lang=en`), {
      params: Promise.resolve({ id }),
    });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe(id);
    expect(data.isDemo).toBe(true);
    expect(data.reviewSheet).toContain("Packaging Production Review Sheet");
  });

  it("禁止写数据库，并隐藏持久化操作", async () => {
    const createSpy = vi.spyOn(prisma.order, "create");
    const response = await createOrder(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(createSpy).not.toHaveBeenCalled();
    expect(allowsPersistentOrderActions()).toBe(false);
    createSpy.mockRestore();
  });
});
