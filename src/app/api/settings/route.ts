import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAiConfigStatus } from "@/lib/ai/service";
import { PUBLIC_DEMO_MODE } from "@/lib/public-demo-server";

const settingSchema = z.object({
  companyName: z.string().min(1),
  defaultSalesperson: z.string().default(""),
  defaultTradeTerm: z.string().default(""),
  defaultLanguage: z.enum(["中文", "English"]),
});

export async function GET() {
  if (PUBLIC_DEMO_MODE) {
    return NextResponse.json({
      setting: {
        id: 1,
        companyName: "ColorBox Demo Workspace",
        defaultSalesperson: "Demo Sales",
        defaultTradeTerm: "FOB Shenzhen",
        defaultLanguage: "English",
      },
      ai: { configured: false, baseUrl: "Server-side only", model: "Pre-generated demo" },
      uploadDirectory: "Disabled in public demo",
      publicDemo: true,
    });
  }
  const setting = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return NextResponse.json({
    setting,
    ai: getAiConfigStatus(),
    uploadDirectory: "storage/uploads",
    publicDemo: false,
  });
}

export async function PUT(request: Request) {
  if (PUBLIC_DEMO_MODE)
    return NextResponse.json(
      { error: "Settings are read-only in the public demo." },
      { status: 403 },
    );
  try {
    const data = settingSchema.parse(await request.json());
    const setting = await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return NextResponse.json({ setting });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存设置失败" },
      { status: 400 },
    );
  }
}
