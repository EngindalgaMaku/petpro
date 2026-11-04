"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dog, PawPrint, Plus, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/bugun", label: "Bugün", icon: CalendarDays },
  { href: "/salon", label: "Salon", icon: PawPrint },
  { href: "/kabul", label: "Yeni Kabul", icon: Plus, primary: true },
  { href: "/musteriler", label: "Müşteriler", icon: Dog },
  { href: "/kasa", label: "Kasa", icon: Wallet },
] as const;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Phones: a bottom bar with Yeni Kabul in the middle. Tablets and up: a rail on the left. */
export function AppNav({ businessName }: { businessName: string }) {
  const pathname = usePathname() || "/";
  return (
    <>
      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 items-center border-t border-line bg-sunken pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(pathname, href);
          if ("primary" in rest) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="justify-self-center flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-accent-ink"
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
                "flex flex-col items-center gap-1 text-[11px]",
                active ? "font-semibold text-accent-strong" : "text-muted"
              )}
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Ana menü"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-sunken p-4 md:flex"
      >
        <div className="mb-6 px-2 pt-1">
          <BrandMark />
          <p className="mt-2 truncate text-sm text-muted">{businessName}</p>
        </div>
        {ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                "primary" in rest
                  ? "my-2 bg-accent font-semibold text-accent-ink hover:bg-accent-hover"
                  : active
                    ? "bg-raised font-semibold text-ink"
                    : "text-muted hover:bg-raised hover:text-ink"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
