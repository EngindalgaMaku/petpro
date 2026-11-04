"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, QrCode, CalendarPlus, Wallet } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";

const BUTTON = "h-12 w-full gap-2 whitespace-nowrap px-3 text-sm sm:w-auto sm:px-5 sm:text-[15px]";

export function QuickActionsRibbon() {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2.5">
        <Link href="/kabul" className={buttonStyles({ variant: "primary", className: `${BUTTON} shadow-md shadow-accent/20` })}>
          <Plus className="h-4 w-4 shrink-0" />
          <span>Yeni Kabul</span>
        </Link>

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className={buttonStyles({ variant: "secondary", className: `${BUTTON} hover:border-accent/40` })}
        >
          <QrCode className="h-4 w-4 shrink-0 text-accent-strong" />
          <span>QR Tara</span>
        </button>

        <Link href="/randevular" className={buttonStyles({ variant: "secondary", className: BUTTON })}>
          <CalendarPlus className="h-4 w-4 shrink-0 text-muted" />
          <span>Randevu</span>
        </Link>

        <Link href="/kasa" className={buttonStyles({ variant: "secondary", className: BUTTON })}>
          <Wallet className="h-4 w-4 shrink-0 text-ready" />
          <span>Kasa & Gider</span>
        </Link>
      </div>

      <QRScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  );
}
