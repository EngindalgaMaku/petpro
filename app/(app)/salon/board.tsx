"use client";

import { useState } from "react";
import Link from "next/link";
import type { WorkStage } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { formatTL } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface BoardCard {
  id: string;
  stage: WorkStage;
  taxi: boolean;
  petName: string;
  breed: string;
  work: string;
  who: string | null;
  station: string | null;
  inStage: string;
  promised: string | null;
  late: boolean;
  remaining: number;
}

function Card({ c, compact }: { c: BoardCard; compact?: boolean }) {
  const ready = c.stage === "READY";
  return (
    <Link
      href={`/is/${c.id}`}
      className={cn(
        "block space-y-2 rounded-xl border bg-surface p-3 transition-colors hover:border-line-strong",
        c.late ? "border-danger/70" : "border-line"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <PetTag pet={{ name: c.petName }} size={compact ? "xs" : "sm"} />
        {c.taxi && <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-accent-strong">Pet taksi yolda</span>}
      </div>
      {c.breed && <p className="truncate font-semibold">{c.breed}</p>}
      <p className="line-clamp-2 text-sm text-muted">{c.work}</p>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted">{[c.who, c.station].filter(Boolean).join(" · ") || "Kuaför atanmadı"}</span>
        <span className={cn("shrink-0 font-semibold tabular-nums", c.late ? "text-danger" : ready ? "text-ready" : "text-ink")}>
          {ready ? (c.remaining > 0 ? `${formatTL(c.remaining)} kalan` : "Ödendi") : c.inStage}
        </span>
      </div>
      {c.promised && (
        <p className={cn("text-xs", c.late ? "font-semibold text-danger" : "text-muted")}>
          {c.late ? "Gecikti · söz: " : "Teslim: "}
          {c.promised}
        </p>
      )}
    </Link>
  );
}

/**
 * Tablets and wider: the five stages as columns. Phones: the same stages as a two-row filter
 * over one list, so nothing has to be scrolled sideways.
 */
export function Board({ cards, columns }: { cards: BoardCard[]; columns: Array<{ stage: WorkStage; title: string }> }) {
  const [phoneStage, setPhoneStage] = useState<WorkStage | "ALL">("ALL");
  const count = (s: WorkStage) => cards.filter((c) => c.stage === s).length;

  if (cards.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line p-10 text-center text-muted">
        Salonda hayvan yok. Yeni gelen için <Link href="/kabul" className="font-semibold text-accent-strong">Yeni Kabul</Link>.
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Aşama">
          {[{ stage: "ALL" as const, title: "Tümü" }, ...columns].map(({ stage, title }) => (
            <button
              key={stage}
              type="button"
              role="tab"
              aria-selected={phoneStage === stage}
              onClick={() => setPhoneStage(stage)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-full border px-2 text-sm",
                phoneStage === stage ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line bg-surface"
              )}
            >
              {title}
              <span className="text-xs tabular-nums opacity-75">{stage === "ALL" ? cards.length : count(stage)}</span>
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {cards
            .filter((c) => phoneStage === "ALL" || c.stage === phoneStage)
            .map((c) => (
              <li key={c.id}>
                <Card c={c} />
              </li>
            ))}
        </ul>
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        {columns.map(({ stage, title }) => (
          <section key={stage} aria-label={title} className="min-w-0 space-y-2 rounded-card bg-sunken p-2.5">
            <div className="flex items-center justify-between px-1.5 py-1">
              <h2 className="font-display text-[17px] font-semibold">{title}</h2>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-raised px-1.5 text-xs font-semibold text-muted">
                {count(stage)}
              </span>
            </div>
            {cards
              .filter((c) => c.stage === stage)
              .map((c) => (
                <Card key={c.id} c={c} compact />
              ))}
          </section>
        ))}
      </div>
    </>
  );
}
