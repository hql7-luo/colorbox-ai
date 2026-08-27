import type { Language } from "@/i18n";
import {
  emptyOrderSpec,
  orderSpecSchema,
  type Confidence,
  type OrderSpec,
} from "@/lib/order-schema";
import { deriveStatus, reviewOrder } from "@/lib/review";
import type { ClientFile, ClientOrder } from "@/types";

export const DEMO_IDS = ["folding-carton", "corrugated-box", "rigid-gift-box"] as const;
export type DemoId = (typeof DEMO_IDS)[number];

export type DemoOrderDefinition = {
  id: DemoId;
  orderNo: string;
  displayName: Record<Language, string>;
  sampleLines: Record<Language, [string, string, string]>;
  sourceText: string;
  internalNotes: string;
  salesperson: string;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
  spec: OrderSpec;
  files: ClientFile[];
};

function spec(values: Partial<OrderSpec>) {
  return orderSpecSchema.parse({ ...emptyOrderSpec, ...values });
}

export const DEMO_ORDERS: readonly DemoOrderDefinition[] = [
  {
    id: "folding-carton",
    orderNo: "DEMO-CBX-001",
    displayName: { en: "Cosmetic Folding Carton", zh: "化妆品折叠彩盒" },
    sampleLines: {
      en: ["10,000 pcs", "350gsm SBS", "CMYK + Gold Foil"],
      zh: ["10,000 个", "350gsm 白卡纸", "CMYK + 烫金"],
    },
    sourceText:
      "Demo data only. Nova Beauty Co. needs 10,000 cosmetic folding cartons in 2 SKUs. Finished size is approximately 120 × 80 × 40 mm. Use 350gsm SBS with CMYK offset printing, matte lamination and gold foil. Match the existing brand color, but the Pantone reference and foil position are not supplied. Final artwork and customer dieline are attached. Quantity split per SKU and packing method still need confirmation. Delivery is requested to Los Angeles by 18 September 2026 under FOB Shenzhen terms.",
    internalNotes:
      "Fictional demo order. Confirm the SKU quantity split, Pantone reference, foil position and packing method before production.",
    salesperson: "Demo Sales",
    reviewer: "Demo Reviewer",
    createdAt: "2026-08-25T02:00:00.000Z",
    updatedAt: "2026-08-25T04:30:00.000Z",
    spec: spec({
      customerName: "Nova Beauty Co.",
      productName: "Cosmetic Folding Carton",
      productType: "Folding carton",
      quantity: 10000,
      skuCount: 2,
      quantityPerSku: "",
      deliveryDate: "2026-09-18",
      destination: "Los Angeles, United States",
      tradeTerm: "FOB Shenzhen",
      boxType: "Reverse tuck folding carton",
      length: 120,
      width: 80,
      height: 40,
      dielineStatus: "Customer dieline received",
      usesCustomerDieline: true,
      needsNewDieline: false,
      paperType: "SBS",
      paperWeight: 350,
      printingMethod: "Offset printing",
      frontColors: "CMYK + Pantone brand color",
      backColors: "Unprinted",
      cmyk: true,
      pantone: "",
      fileVersionCount: 1,
      multipleSkusGangRun: null,
      finishes: ["MATTE_LAMINATION", "GOLD_FOIL"],
      foilColor: "Gold",
      foilPosition: "",
      dieCut: true,
      creasing: true,
      gluing: true,
      glueFlapDirection: "Right side",
      packagingMethod: "",
      designReceived: true,
      dielineReceived: true,
      fileFormat: "PDF / AI",
      finalArtwork: true,
      colorConfirmed: false,
      processPositionConfirmed: false,
    }),
    files: [
      {
        id: "demo-file-folding-carton",
        originalName: "nova-beauty-folding-carton-brief.pdf",
        storedName: "nova-beauty-folding-carton-brief.pdf",
        mimeType: "application/pdf",
        size: 184320,
        relativePath: "demo/nova-beauty-folding-carton-brief.pdf",
      },
    ],
  },
  {
    id: "corrugated-box",
    orderNo: "DEMO-CBX-002",
    displayName: { en: "Corrugated Retail Box", zh: "瓦楞零售彩盒" },
    sampleLines: {
      en: ["3,000 pcs", "E-Flute", "CMYK + Aqueous Coating"],
      zh: ["3,000 个", "E 楞", "CMYK + 水性光油"],
    },
    sourceText:
      "Demo data only. Northstar Home needs 3,000 corrugated retail boxes for a small kitchen appliance. Finished size is 320 × 210 × 185 mm. Use E-Flute corrugated board with a printed liner, CMYK offset printing and aqueous coating. One SKU. A rough artwork PDF is attached, but the final dieline, liner paper weight, glue-flap direction and packing method are not confirmed. Delivery is requested to Hamburg by 30 September 2026 under FOB Shenzhen terms.",
    internalNotes:
      "Fictional demo order. Engineering must confirm the liner weight, dieline, glue flap and packing specification.",
    salesperson: "Demo Sales",
    reviewer: "Demo Reviewer",
    createdAt: "2026-08-24T03:00:00.000Z",
    updatedAt: "2026-08-24T06:15:00.000Z",
    spec: spec({
      customerName: "Northstar Home",
      productName: "Corrugated Retail Box",
      productType: "Corrugated retail box",
      quantity: 3000,
      skuCount: 1,
      deliveryDate: "2026-09-30",
      destination: "Hamburg, Germany",
      tradeTerm: "FOB Shenzhen",
      boxType: "Corrugated mailer box",
      length: 320,
      width: 210,
      height: 185,
      dielineStatus: "Not supplied — new dieline required",
      usesCustomerDieline: false,
      needsNewDieline: true,
      paperType: "Printed liner",
      paperWeight: null,
      corrugatedType: "E-Flute",
      mountingRequirement: "Printed liner mounted to E-Flute",
      printingMethod: "Offset printing",
      frontColors: "CMYK",
      backColors: "Unprinted",
      cmyk: true,
      finishes: ["AQUEOUS_COATING"],
      dieCut: true,
      creasing: true,
      gluing: true,
      mounting: true,
      glueFlapDirection: "",
      packagingMethod: "",
      designReceived: true,
      dielineReceived: false,
      fileFormat: "PDF",
      finalArtwork: false,
      colorConfirmed: true,
      processPositionConfirmed: true,
    }),
    files: [
      {
        id: "demo-file-corrugated-box",
        originalName: "northstar-corrugated-box-brief.pdf",
        storedName: "northstar-corrugated-box-brief.pdf",
        mimeType: "application/pdf",
        size: 231424,
        relativePath: "demo/northstar-corrugated-box-brief.pdf",
      },
    ],
  },
  {
    id: "rigid-gift-box",
    orderNo: "DEMO-CBX-003",
    displayName: { en: "Rigid Gift Box", zh: "天地盖精品礼盒" },
    sampleLines: {
      en: ["600 pcs", "Greyboard", "Pantone + Silver Foil + Embossing"],
      zh: ["600 个", "灰板", "Pantone + 烫银 + 击凸"],
    },
    sourceText:
      "Demo data only. Lumière Fragrance needs 600 rigid gift boxes for a fragrance launch. Lid-and-base style, finished size 180 × 120 × 65 mm. Use 1200gsm greyboard wrapped with 157gsm art paper, one Pantone brand blue, silver foil and an embossed lid logo. Include a black EVA insert. The exact Pantone number, final dieline, final artwork status and carton quantity are not confirmed. Delivery is requested to Paris by 15 October 2026 under FOB Shenzhen terms.",
    internalNotes:
      "Fictional demo order. Confirm the Pantone reference, production files and export-carton quantity; review setup cost for the short run.",
    salesperson: "Demo Sales",
    reviewer: "Demo Reviewer",
    createdAt: "2026-08-23T01:30:00.000Z",
    updatedAt: "2026-08-23T07:45:00.000Z",
    spec: spec({
      customerName: "Lumière Fragrance",
      productName: "Rigid Gift Box",
      productType: "Rigid lid-and-base gift box",
      quantity: 600,
      skuCount: 1,
      deliveryDate: "2026-10-15",
      destination: "Paris, France",
      tradeTerm: "FOB Shenzhen",
      boxType: "Lid-and-base rigid box",
      length: 180,
      width: 120,
      height: 65,
      dielineStatus: "Final dieline pending",
      usesCustomerDieline: false,
      needsNewDieline: true,
      paperType: "Greyboard with art-paper wrap",
      paperWeight: 1200,
      mountingRequirement: "157gsm printed art paper wrapped over greyboard",
      materialSpecialRequirement: "Black EVA insert",
      printingMethod: "Offset printing",
      frontColors: "1 Pantone brand color",
      backColors: "Unprinted",
      cmyk: false,
      pantone: "",
      finishes: ["SILVER_FOIL", "EMBOSSING"],
      foilColor: "Silver",
      foilPosition: "Lid logo",
      dieCut: true,
      creasing: true,
      manualAssembly: true,
      insert: "Black EVA insert",
      packagingMethod: "Individual tissue wrap in export cartons",
      cartonRequirement: "5-ply export carton",
      cartonQuantity: null,
      designReceived: true,
      dielineReceived: false,
      fileFormat: "PDF",
      finalArtwork: false,
      colorConfirmed: false,
      processPositionConfirmed: true,
    }),
    files: [
      {
        id: "demo-file-rigid-gift-box",
        originalName: "lumiere-rigid-gift-box-brief.pdf",
        storedName: "lumiere-rigid-gift-box-brief.pdf",
        mimeType: "application/pdf",
        size: 206848,
        relativePath: "demo/lumiere-rigid-gift-box-brief.pdf",
      },
    ],
  },
];

export function getDemoOrder(id: string | null | undefined) {
  return DEMO_ORDERS.find((order) => order.id === id);
}

export function createDemoConfidence(specification: OrderSpec): Record<string, Confidence> {
  return Object.fromEntries(
    Object.entries(specification).map(([key, value]) => [
      key,
      value === null || value === "" || (Array.isArray(value) && value.length === 0)
        ? "UNKNOWN"
        : "HIGH",
    ]),
  );
}

export function buildDemoClientOrder(
  demo: DemoOrderDefinition,
  language: Language = "zh",
): ClientOrder {
  const review = reviewOrder(
    demo.spec,
    demo.orderNo,
    {
      salesperson: demo.salesperson,
      notes: demo.internalNotes,
      reviewer: demo.reviewer,
      createdAt: demo.createdAt,
    },
    language,
  );
  return {
    id: demo.id,
    orderNo: demo.orderNo,
    isDemo: true,
    customerName: demo.spec.customerName,
    productName: demo.spec.productName,
    quantity: demo.spec.quantity,
    status: deriveStatus("reviewed", review.missingFields, review.riskItems),
    salesperson: demo.salesperson,
    sourceText: demo.sourceText,
    internalNotes: demo.internalNotes,
    reviewer: demo.reviewer,
    internalSummary: review.internalSummary,
    reviewSheet: review.reviewSheet,
    createdAt: demo.createdAt,
    updatedAt: demo.updatedAt,
    spec: { ...demo.spec, finishes: [...demo.spec.finishes] },
    confidence: createDemoConfidence(demo.spec),
    missingFields: review.missingFields,
    riskItems: review.riskItems,
    customerQuestions: review.customerQuestions,
    files: demo.files.map((file) => ({ ...file })),
  };
}

export function getDemoClientOrder(id: string | null | undefined, language: Language = "zh") {
  const demo = getDemoOrder(id);
  return demo ? buildDemoClientOrder(demo, language) : undefined;
}

export function getDemoClientOrders(language: Language = "zh") {
  return DEMO_ORDERS.map((demo) => buildDemoClientOrder(demo, language));
}
