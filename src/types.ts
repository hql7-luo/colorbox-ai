import type { Confidence, MissingItem, OrderSpec, RiskItem } from "@/lib/order-schema";
import type { OrderStatus } from "@/lib/order-status";

export type ClientFile = {
  id?: string;
  orderId?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  relativePath: string;
  url?: string;
  createdAt?: string;
};

export type ClientOrder = {
  id: string;
  orderNo: string;
  isDemo: boolean;
  customerName: string;
  productName: string;
  quantity: number | null;
  status: OrderStatus;
  salesperson?: string | null;
  sourceText?: string | null;
  internalNotes?: string | null;
  reviewer?: string | null;
  internalSummary?: string | null;
  reviewSheet?: string | null;
  createdAt: string;
  updatedAt: string;
  spec: OrderSpec;
  confidence: Record<string, Confidence>;
  missingFields: MissingItem[];
  riskItems: RiskItem[];
  customerQuestions: { zh: string[]; en: string[] };
  files: ClientFile[];
};
