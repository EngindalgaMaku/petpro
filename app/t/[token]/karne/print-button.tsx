"use client";

import { Printer } from "lucide-react";
import { printPage } from "@/lib/print";

export function PrintButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      onClick={() => printPage(title)}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-raised px-3.5 text-sm font-semibold"
    >
      <Printer className="h-4 w-4 text-accent-strong" aria-hidden="true" />
      Yazdır / PDF
    </button>
  );
}
