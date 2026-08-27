export const orderStatuses = [
  "PENDING_EXTRACTION",
  "PENDING_CONFIRMATION",
  "RISK_FOUND",
  "COMPLETED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const legacyStatuses: Record<string, OrderStatus> = {
  待提取: "PENDING_EXTRACTION",
  待确认: "PENDING_CONFIRMATION",
  有风险: "RISK_FOUND",
  已完成: "COMPLETED",
};

export function normalizeOrderStatus(status: string): OrderStatus {
  if (orderStatuses.includes(status as OrderStatus)) return status as OrderStatus;
  return legacyStatuses[status] ?? "PENDING_CONFIRMATION";
}

export function statusStorageValues(status: OrderStatus): string[] {
  const legacy = Object.entries(legacyStatuses).find(([, current]) => current === status)?.[0];
  return legacy ? [status, legacy] : [status];
}
