"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/i18n/language-provider";
import type { TranslationKey } from "@/i18n";
import { orderStatuses } from "@/lib/order-status";
import type { ClientOrder } from "@/types";
import { allowsPersistentOrderActions, PUBLIC_DEMO_MODE } from "@/lib/public-demo";

type Notice = { key: TranslationKey; params?: Record<string, string | number> } | null;

export function OrderList() {
  const { language, t, formatDate, formatDateTime } = useLanguage();
  const allowPersistenceActions = allowsPersistentOrderActions();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customer, setCustomer] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Notice>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status, customer });
    const response = await fetch(`/api/orders?${params}`, { cache: "no-store" });
    const data = await response.json();
    setOrders(data.orders || []);
    setCustomers(data.customers || []);
    setLoading(false);
  }, [search, status, customer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOrders(), 200);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  async function copyOrder(id: string) {
    const response = await fetch(`/api/orders/${id}?lang=${language}`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return setMessage({ key: "error.loadOrder" });
    setMessage({ key: "orders.copied", params: { orderNo: data.orderNo } });
    await loadOrders();
  }

  async function deleteOrder(order: ClientOrder) {
    if (!window.confirm(t("orders.deleteConfirm", { orderNo: order.orderNo }))) return;
    const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (!response.ok) return setMessage({ key: "orders.deleteFailed" });
    setMessage({ key: "orders.deleted" });
    await loadOrders();
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("orders.eyebrow")}</p>
          <h1 className="font-display text-3xl font-black tracking-tight">{t("orders.title")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("orders.description")}</p>
        </div>
        <Link href="/new" className="btn-primary">
          {t("orders.new")}
        </Link>
      </div>

      {message && (
        <div
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
          role="status"
        >
          {t(message.key, message.params)}
        </div>
      )}

      {PUBLIC_DEMO_MODE && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          {t("public.orders")}
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="grid gap-3 border-b border-line bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_180px_220px]">
          <label>
            <span className="sr-only">{t("orders.search")}</span>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("orders.search")}
            />
          </label>
          <label>
            <span className="sr-only">{t("orders.status")}</span>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{t("orders.allStatuses")}</option>
              {orderStatuses.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t("orders.allCustomers")}</span>
            <select
              className="input"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
            >
              <option value="">{t("orders.allCustomers")}</option>
              {customers.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="border-b border-line bg-white text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-bold">{t("orders.orderNo")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.customer")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.product")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.quantity")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.status")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.created")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.updated")}</th>
                <th className="px-5 py-3 text-right font-bold">{t("orders.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-bold text-navy">
                    <Link href={`/orders/${order.id}`}>{order.orderNo}</Link>
                    {order.isDemo && (
                      <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {t("orders.demo")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">{order.customerName}</td>
                  <td className="px-4 py-4">{order.productName}</td>
                  <td className="px-4 py-4 tabular-nums">
                    {order.quantity?.toLocaleString() || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(order.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3">
                      <Link
                        className="font-semibold text-navy hover:underline"
                        href={`/orders/${order.id}`}
                      >
                        {t("orders.view")}
                      </Link>
                      {allowPersistenceActions && (
                        <>
                          <button
                            className="font-semibold text-slate-600 hover:text-navy"
                            onClick={() => void copyOrder(order.id)}
                          >
                            {t("orders.copy")}
                          </button>
                          <button
                            className="font-semibold text-red-700 hover:underline"
                            onClick={() => void deleteOrder(order)}
                          >
                            {t("orders.delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && orders.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-bold">{t("orders.empty")}</p>
          </div>
        )}
        {loading && (
          <div className="p-12 text-center text-sm text-slate-500">{t("orders.loading")}</div>
        )}
      </section>
    </>
  );
}
