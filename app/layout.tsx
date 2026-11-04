import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { MobileShell } from "@/components/mobile-shell";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-baloo",
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
    { media: "(prefers-color-scheme: light)", color: "#fbf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1a1b" },
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
      className={`${nunito.variable} ${baloo.variable}`}
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
