import { NextResponse } from "next/server";
import { z } from "zod";
import { orderSpecSchema } from "@/lib/order-schema";
import { reviewOrder } from "@/lib/review";
import { formatDateTime, translate, type Language } from "@/i18n";

const schema = z.object({
  spec: orderSpecSchema,
  orderNo: z.string().optional(),
  salesperson: z.string().optional(),
  notes: z.string().optional(),
  reviewer: z.string().optional(),
  language: z.enum(["zh", "en"]).default("zh"),
});

export async function POST(request: Request) {
  let language: Language = "zh";
  try {
    const input = schema.parse(await request.json());
    language = input.language;
    return NextResponse.json(
      reviewOrder(
        input.spec,
        input.orderNo,
        {
          salesperson: input.salesperson,
          notes: input.notes,
          reviewer: input.reviewer,
          createdAt: formatDateTime(new Date(), language),
        },
        language,
      ),
    );
  } catch {
    return NextResponse.json({ error: translate(language, "error.review") }, { status: 400 });
  }
}
