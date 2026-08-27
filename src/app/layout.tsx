import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { PublicDemoNotice } from "@/components/public-demo-notice";
import { LanguageProvider } from "@/i18n/language-provider";

export const metadata: Metadata = {
  title: "ColorBox AI — Packaging Order Review",
  description: "AI-assisted production order review for packaging manufacturers.",
  metadataBase: new URL("https://colorbox-ai.vercel.app"),
  openGraph: {
    title: "ColorBox AI — Packaging Order Review",
    description: "AI-assisted production order review for packaging manufacturers.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ColorBox AI workflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ColorBox AI — Packaging Order Review",
    description: "AI-assisted production order review for packaging manufacturers.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>
          <AppNav />
          <main>{children}</main>
          <PublicDemoNotice />
        </LanguageProvider>
      </body>
    </html>
  );
}
