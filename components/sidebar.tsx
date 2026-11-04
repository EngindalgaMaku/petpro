"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Calendar,
  CalendarDays,
  Columns3,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { useEscape } from "@/lib/use-escape";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

export interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessName: string;
}

const NAV_ITEMS = [
  { href: "/bugun", label: "Bugün", icon: CalendarDays },
  { href: "/salon", label: "Salon", icon: Columns3 },
  { href: "/kabul", label: "Yeni Kabul", icon: Plus, primary: true },
  { href: "/randevular", label: "Randevu Takvimi", icon: Calendar },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/hizmetler", label: "Hizmetler & Paketler", icon: Sparkles },
  { href: "/kasa", label: "Kasa & Finans", icon: Wallet },
  { href: "/personel", label: "Personel & Prim", icon: BadgePercent },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

const MOBILE_ITEMS = [
  { href: "/bugun", label: "Bugün", icon: CalendarDays },
  { href: "/salon", label: "Salon", icon: Columns3 },
  { href: "/kabul", label: "Kabul", icon: Plus, primary: true },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/kasa", label: "Kasa", icon: Wallet },
] as const;

const ROLE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  OWNER: {
    label: "İşletme Sahibi",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/25",
  },
  MANAGER: {
    label: "Yönetici",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25",
  },
  GROOMER: {
    label: "Kuaför",
    badgeClass: "bg-accent/15 text-accent-strong border border-accent/25",
  },
  DRIVER: {
    label: "Şoför",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
  },
};

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  useEscape(mobileMenuOpen, () => setMobileMenuOpen(false));

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("petpro_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("petpro_sidebar_collapsed", String(next));
  };

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)$/, "").trim() : "Kullanıcı";
  const initial = cleanName.charAt(0).toUpperCase();
  const roleInfo = ROLE_CONFIG[user.role] ?? {
    label: user.role,
    badgeClass: "bg-raised text-muted border border-line",
  };

  return (
    <>
      {/* Mobil Üst Bar */}
      <header className="no-print fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-line bg-sunken/95 px-4 backdrop-blur lg:hidden pt-[env(safe-area-inset-top)]">
        <Link href="/bugun" className="flex min-h-11 items-center gap-2">
          <BrandMark withName={true} />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="QR / Barkod tara"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-accent-strong transition hover:bg-raised"
          >
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menüyü aç"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:bg-raised"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobil Slide-over Menü (Çekmece) */}
      {mobileMenuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menü" className="fixed inset-0 z-50 lg:hidden">
          {/* Karartma Katmanı */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menü Paneli */}
          <div className="fixed inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-sunken p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <BrandMark withName={true} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Menüyü kapat"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Kullanıcı Kartı */}
            <div className="my-3 flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 font-bold text-accent-strong shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-ink">{cleanName}</p>
                  <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide shrink-0", roleInfo.badgeClass)}>
                    {roleInfo.label}
                  </span>
                </div>
                <p className="truncate text-xs text-muted mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Tam Menü Navigasyonu */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pt-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
                const active = isActive(pathname, href);
                const isPrimary = "primary" in rest;

                if (isPrimary) {
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="my-1.5 flex h-11 items-center gap-3 rounded-xl bg-accent px-3 font-semibold text-accent-ink shadow-sm"
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                      <span className="truncate text-sm">{label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      active ? "border border-line bg-raised font-semibold text-ink" : "text-muted hover:bg-raised/70 hover:text-ink"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-accent-strong" : "")} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Çıkış Yap */}
            <div className="border-t border-line pt-3">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 text-xs font-semibold text-danger transition hover:bg-danger/20"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Çıkış Yap
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobil Alt Menü */}
      <nav
        aria-label="Mobil ana menü"
        className="no-print hide-on-keyboard fixed inset-x-0 bottom-0 z-40 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-line bg-sunken pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {MOBILE_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(pathname, href);
          if ("primary" in rest) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="justify-self-center flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-accent-ink shadow-lg shadow-accent/20 transition-transform active:scale-95"
              >
                <Icon className="h-7 w-7" strokeWidth={2.6} aria-hidden="true" />
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] transition-colors",
                active ? "font-semibold text-accent-strong" : "text-muted hover:text-ink"
              )}
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Masaüstü Katlanabilir Sidebar */}
      <aside
        aria-label="Sol menü"
        className={cn(
          "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-sunken transition-[width] duration-200 ease-in-out lg:flex",
          collapsed ? "w-20 p-3" : "w-64 p-4"
        )}
      >
        {/* Üst Logo ve Katlama Butonu */}
        <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
          <Link href="/bugun" className="inline-flex items-center gap-2 overflow-hidden">
            <BrandMark withName={!collapsed} />
          </Link>
          {mounted && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
              className={cn(
                "rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink transition-colors",
                collapsed && "mt-2"
              )}
              title={collapsed ? "Genişlet" : "Daralt"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="mb-4 px-2">
            <p className="truncate text-xs font-semibold text-muted uppercase tracking-wider">{user.businessName}</p>
          </div>
        )}

        {/* Menü Linkleri */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
            const active = isActive(pathname, href);
            const isPrimary = "primary" in rest;

            if (isPrimary) {
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "my-2 flex h-11 items-center gap-3 rounded-xl font-semibold text-accent-ink transition-all",
                    collapsed ? "justify-center px-0 bg-accent hover:bg-accent-hover" : "px-3 bg-accent hover:bg-accent-hover shadow-sm"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                  {!collapsed && <span className="truncate text-sm">{label}</span>}
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-raised font-semibold text-ink border border-line"
                    : "text-muted hover:bg-raised/70 hover:text-ink"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-accent-strong" : "")} aria-hidden="true" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* QR Scanner Trigger */}
        <div className="my-2">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            title={collapsed ? "Barkod / QR Tara" : undefined}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl border border-line bg-surface text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:bg-raised",
              collapsed ? "justify-center px-0" : "px-3"
            )}
          >
            <QrCode className="h-5 w-5 shrink-0 text-accent-strong" aria-hidden="true" />
            {!collapsed && <span className="truncate">Barkod / QR Tara</span>}
          </button>
        </div>

        {/* Alt Kullanıcı Kartı ve Çıkış */}
        <div className="border-t border-line pt-3 mt-auto">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${cleanName} (${roleInfo.label})`}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-sm font-bold text-accent-strong shadow-sm"
              >
                {initial}
              </div>
              <ThemeToggle className="h-9 w-9" />
              <form action={signOut}>
                <button
                  type="submit"
                  title="Çıkış yap"
                  className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-sm font-bold text-accent-strong shadow-sm">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-ink">{cleanName}</p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide shrink-0",
                        roleInfo.badgeClass
                      )}
                    >
                      {roleInfo.label}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted mt-0.5">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/ayarlar"
                    title="Sistem ve İşletme Ayarları"
                    aria-label="Ayarlar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-accent/40 hover:bg-raised hover:text-ink transition-colors"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <ThemeToggle className="h-8 w-8" />
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    title="Oturumu Kapat (Çıkış Yap)"
                    aria-label="Çıkış yap"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-danger/40 hover:bg-danger/10 hover:text-danger transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>

      <QRScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  );
}
