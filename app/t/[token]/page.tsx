import Link from "next/link";
import { notFound } from "next/navigation";
import { BookHeart } from "lucide-react";
import { PetTag } from "@/components/pet-tag";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { whatsappNumber } from "@/lib/phone";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { BOARD_STAGES, STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { CONDITION_KINDS, PART_LABELS } from "@/lib/pet-parts";
import { CatFace, DogFace, STAGE_ICONS } from "@/components/pet-art";
import { PetDiagram } from "@/components/pet-diagram";
import { ApproveButton } from "./approve-button";

// The customer's page, opened from the WhatsApp link: no sign-in, so it shows the pet and
// the work only — never the owner's phone or address
export const metadata = { title: "Bakım takibi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) notFound();
  const order = await prisma.workOrder.findUnique({
    where: { trackingToken: token },
    include: {
      business: { select: { name: true, phone: true } },
      pet: { select: { name: true, breed: true, size: true } },
      items: { select: { id: true, name: true, totalPrice: true, kind: true, details: true, packageName: true } },
      payments: { select: { amount: true } },
      inspection: {
        include: {
          marks: { orderBy: { number: "asc" }, include: { photos: { select: { id: true } } } },
        },
      },
      photos: { where: { kind: { in: ["BEFORE", "AFTER"] } }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true } },
    },
  });
  if (!order) notFound();
  const ins = order.inspection;
  const photoUrl = (id: string) => `/api/photos/${id}?t=${token}`;
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(order.totalAmount);
  const remaining = Math.max(0, total - paid);
  const stageIndex = BOARD_STAGES.indexOf(order.stage);
  const finished = order.stage === "DELIVERED" || order.stage === "TAXI_DELIVERY";
  const steps = ["Kabul", "Yıkama", "Bakım", "Kontrol", "Hazır"];

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <span className="font-display text-lg font-bold">{order.business.name}</span>
        <span className="text-xs text-muted">Üyelik gerekmez</span>
      </header>

      <Card className="paw-bg space-y-4 overflow-hidden p-4">
        <div className="flex items-center gap-3">
          {order.pet.size === "CAT" ? <CatFace className="h-14 w-14 shrink-0" /> : <DogFace className="h-14 w-14 shrink-0" />}
          <PetTag pet={order.pet} size="md" />
          <span className="text-sm text-muted">{order.pet.breed}</span>
        </div>
        <div>
          <p className="text-sm text-muted">{order.pet.name} şu anda</p>
          <p className={cn("font-display text-[26px] font-bold", order.stage === "READY" || order.stage === "DELIVERED" ? "text-ready" : order.stage === "CANCELLED" ? "text-danger" : "text-accent-strong")}>
            {STAGES[order.stage].customerLabel}
          </p>
          {order.promisedAt && !finished && order.stage !== "CANCELLED" && (
            <p className="text-sm">
              Tahmini teslim:{" "}
              <strong>
                {order.promisedAt.toLocaleString("tr-TR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
              </strong>
            </p>
          )}
        </div>
        {order.stage !== "CANCELLED" && (
          <ol aria-label="Aşamalar" className="grid grid-cols-5 gap-1">
            {steps.map((label, i) => {
              const reached = finished || i <= stageIndex;
              const Icon = STAGE_ICONS[BOARD_STAGES[i]];
              return (
                <li key={label} aria-current={i === stageIndex ? "step" : undefined} className="text-center">
                  <span className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-full", reached ? "bg-accent text-accent-ink" : "bg-raised text-muted", i === stageIndex && "ring-2 ring-accent/40 ring-offset-2 ring-offset-surface")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className={cn("mt-1.5 block text-[11px]", i === stageIndex ? "font-semibold text-ink" : "text-muted")}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {order.stage === "DELIVERED" && (
        <Link
          href={`/t/${token}/karne`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          <BookHeart className="h-5 w-5" aria-hidden="true" />
          {order.pet.name} için bakım karnesi
        </Link>
      )}

      {ins && (ins.marks.length > 0 || ins.customerApprovedAt || order.stage === "RECEIVED") && (
        <Card className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Kabulde kayda geçenler</h2>
            <span className="text-xs text-muted">
              {ins.createdAt.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
            </span>
          </div>
          {ins.marks.length === 0 ? (
            <p className="text-sm text-muted">Kabulde kayda geçen bir şey yok.</p>
          ) : (
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <PetDiagram className="w-full" marks={ins.marks} />
              <ol className="space-y-2">
                {ins.marks.map((m) => (
                  <li key={m.id} className="space-y-1.5 text-sm">
                    <p>
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-danger-ink">{m.number}</span>
                      {PART_LABELS[m.part]} · {CONDITION_KINDS[m.kind]}
                    </p>
                    {m.note && <p className="text-xs text-muted">{m.note}</p>}
                    {m.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {m.photos.map((p) => (
                          <a key={p.id} href={photoUrl(p.id)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md bg-raised">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoUrl(p.id)} alt={`${m.number} numaralı işaret`} className="h-full w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {ins.customerApprovedAt ? (
            <p className="rounded-xl bg-ready/15 px-3 py-2 text-sm font-semibold text-ready">
              Onayladınız ·{" "}
              {ins.customerApprovedAt.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {order.pet.name} bu durumda teslim alındı. Bu kayıt teşhis değildir. Bir itirazınız varsa aşağıdan bize yazın; doğruysa onaylayın.
              </p>
              <ApproveButton token={token} />
            </>
          )}
        </Card>
      )}

      {order.photos.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Öncesi ve sonrası</h2>
          {(["BEFORE", "AFTER"] as const).map((k) => {
            const list = order.photos.filter((p) => p.kind === k);
            if (!list.length) return null;
            return (
              <div key={k} className="space-y-1.5">
                <p className="text-sm text-muted">{k === "BEFORE" ? "Öncesi" : "Sonrası"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {list.map((p) => (
                    <a key={p.id} href={photoUrl(p.id)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(p.id)} alt={k === "BEFORE" ? "İşlem öncesi" : "İşlem sonrası"} className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 font-display text-lg font-semibold">Yapılan işler</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i) => {
            const detail = detailSummary(i.kind, i.details as ItemDetails | null);
            return (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block">{i.name}</span>
                  {(detail || i.packageName) && (
                    <span className="block text-xs text-muted">{[i.packageName && `Paket: ${i.packageName}`, detail].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{formatTL(i.totalPrice)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
          <p className="flex justify-between">
            <span className="text-muted">Toplam</span>
            <span className="font-semibold tabular-nums">{formatTL(total)}</span>
          </p>
          {paid > 0 && (
            <p className="flex justify-between">
              <span className="text-muted">Ödenen</span>
              <span className="font-semibold text-ready tabular-nums">{formatTL(paid)}</span>
            </p>
          )}
          <p className="flex justify-between text-base">
            <span>Kalan</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatTL(remaining)}</span>
          </p>
        </div>
      </Card>

      {order.business.phone && (
        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${order.business.phone}`} className="flex h-12 items-center justify-center rounded-xl border border-line font-medium">
            Ara
          </a>
          <a
            href={`https://wa.me/${whatsappNumber(order.business.phone)}?text=${encodeURIComponent(`Merhaba, ${order.pet.name} (${order.number}) hakkında yazıyorum.`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl border border-line font-medium"
          >
            WhatsApp
          </a>
        </div>
      )}
    </main>
  );
}
