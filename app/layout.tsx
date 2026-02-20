import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { OfflineProvider } from "@/components/OfflineProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CalcHub - Smart Calculators",
  description: "Split bills, calculate tips, and manage group expenses with offline support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalcHub",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "CalcHub",
    title: "CalcHub - Smart Calculators",
    description: "Split bills, calculate tips, and manage group expenses with offline support",
  },
  twitter: {
    card: "summary",
    title: "CalcHub - Smart Calculators",
    description: "Split bills, calculate tips, and manage group expenses with offline support",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <OfflineProvider>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </OfflineProvider>
      </body>
    </html>
  );
}
