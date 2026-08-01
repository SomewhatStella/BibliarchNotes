import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Lora,
  Nunito,
  Caveat,
  Playfair_Display,
} from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ColorProvider } from "@/components/providers/color-provider";
import { NetworkStatusProvider } from "@/components/providers/network-status-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonts users can pick per node from the node's right-click menu.
// All self-hosted by next/font - no external requests at runtime.
const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-rounded",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bibliarch",
  description: "Create immersive, interactive stories with AI-powered character simulations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${nunito.variable} ${caveat.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <ColorProvider>
              <NetworkStatusProvider>
                {children}
              </NetworkStatusProvider>
            </ColorProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
