import type { Metadata } from "next";
import { Cormorant_Garamond, Caveat, Jost } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: siteConfig.browserTitle,
  description: siteConfig.welcomeMessage,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${caveat.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col paper-texture">{children}</body>
    </html>
  );
}
