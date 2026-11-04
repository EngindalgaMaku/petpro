import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, Inter } from "next/font/google";
import { MobileShell } from "@/components/mobile-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Semi_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "PetPro · Pet Kuaförü Programı", template: "%s · PetPro" },
  description: "Pet kuaförleri için kabul, hayvan kartı, randevu, iş takibi ve kasa.",
  applicationName: "PetPro",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PetPro",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${inter.variable} ${barlow.variable} ${barlowCondensed.variable}`}
    >
      <body className="min-h-dvh antialiased bg-ground text-ink selection:bg-accent/30 selection:text-accent">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          {children}
          <MobileShell />
        </ThemeProvider>
      </body>
    </html>
  );
}
