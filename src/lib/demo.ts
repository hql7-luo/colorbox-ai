import { emptyOrderSpec, type Confidence, type OrderSpec } from "@/lib/order-schema";
import { reviewOrder } from "@/lib/review";
import type { ClientFile } from "@/types";

export const DEMO_INQUIRY =
  "Need 10,000 cosmetic folding boxes, 350gsm SBS, CMYK printing, matte lamination and gold foil. Size approx. 120x80x40mm. Delivery needed next month.";

export const DEMO_SPEC: OrderSpec = {
  ...emptyOrderSpec,
  customerName: "Nova Beauty Co.",
  productName: "Cosmetic Folding Carton",
  productType: "Folding carton",
  quantity: 10000,
  skuCount: 1,
  quantityPerSku: "10000",
  deliveryDate: "Next month",
  boxType: "Reverse tuck folding box",
  length: 120,
  width: 80,
  height: 40,
  dielineStatus: "Customer PDF received — final version pending",
  usesCustomerDieline: true,
  needsNewDieline: false,
  paperType: "SBS",
  paperWeight: 350,
  printingMethod: "Offset printing",
  frontColors: "CMYK + brand color",
  backColors: "Unprinted",
  cmyk: true,
  pantone: "",
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
  fileFormat: "PDF",
  finalArtwork: true,
  colorConfirmed: false,
  processPositionConfirmed: false,
};

export const DEMO_FILE: ClientFile = {
  id: "demo-file",
  originalName: "nova-beauty-carton-brief.pdf",
  storedName: "nova-beauty-carton-brief.pdf",
  mimeType: "application/pdf",
  size: 184320,
  relativePath: "demo/nova-beauty-carton-brief.pdf",
};

export const DEMO_REVIEW = reviewOrder(DEMO_SPEC, "DEMO-PREVIEW");

export const DEMO_CONFIDENCE = Object.fromEntries(
  Object.entries(DEMO_SPEC).map(([key, value]) => [
    key,
    value === null || value === "" || (Array.isArray(value) && value.length === 0)
      ? "UNKNOWN"
      : "HIGH",
  ]),
) as Record<string, Confidence>;
