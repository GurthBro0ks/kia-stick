import type { Metadata, Viewport } from "next";
import { PRODUCT_VERSION } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: `KIA Stick ${PRODUCT_VERSION}`,
  description: "Fake-doc source-governed local PWA with private-vault governance scaffold.",
  applicationName: "KIA Stick",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#123f74",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
