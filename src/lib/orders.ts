import type { Order, UploadFile } from "@prisma/client";
import {
  emptyOrderSpec,
  missingItemSchema,
  orderSpecSchema,
  parseJson,
  type OrderSpec,
  riskItemSchema,
  type UploadedFileInput,
} from "@/lib/order-schema";
import { normalizeConfidenceRecord, normalizeSpec } from "@/lib/legacy";
import { normalizeOrderStatus } from "@/lib/order-status";
import { reviewOrder } from "@/lib/review";
import { z } from "zod";

export type StoredOrder = Order & { files: UploadFile[] };

export function createOrderNo(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `CBX-${day}-${suffix}`;
}

export function fileCreateData(file: UploadedFileInput) {
  return {
    originalName: file.originalName,
    storedName: file.storedName,
    mimeType: file.mimeType,
    size: file.size,
    relativePath: file.relativePath,
  };
}

export function serializeOrder(order: StoredOrder) {
  const rawSpec = parseJson<Partial<OrderSpec> & { finishes?: unknown }>(order.specJson, {});
  const spec = orderSpecSchema.parse({ ...emptyOrderSpec, ...normalizeSpec(rawSpec) });
  const currentReview = reviewOrder(spec, order.orderNo);
  const parsedMissing = z
    .array(missingItemSchema)
    .safeParse(parseJson<unknown>(order.missingJson, []));
  const parsedRisks = z.array(riskItemSchema).safeParse(parseJson<unknown>(order.risksJson, []));
  return {
    ...order,
    status: normalizeOrderStatus(order.status),
    spec,
    confidence: normalizeConfidenceRecord(parseJson<unknown>(order.confidenceJson, {})),
    missingFields: parsedMissing.success ? parsedMissing.data : currentReview.missingFields,
    riskItems: parsedRisks.success ? parsedRisks.data : currentReview.riskItems,
    customerQuestions: {
      zh: parseJson<string[]>(order.questionsZhJson, []),
      en: parseJson<string[]>(order.questionsEnJson, []),
    },
    files: order.files.map((file) => ({
      ...file,
      url:
        order.isDemo && file.relativePath.startsWith("demo/")
          ? undefined
          : `/api/uploads?path=${encodeURIComponent(file.relativePath)}`,
    })),
  };
}
