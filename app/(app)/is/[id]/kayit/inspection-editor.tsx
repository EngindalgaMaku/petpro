"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, Loader2, Lock, Trash2 } from "lucide-react";
import type { ConditionKind, PetSize } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { Button, Card, Eyebrow, Input } from "@/components/ui";
import { PetDiagram } from "@/components/pet-diagram";
import { uploadPhoto } from "@/lib/upload-photo";
import { cn } from "@/lib/utils";
import { CONDITION_KINDS, PART_LABELS } from "@/lib/pet-parts";
import { addMark, deleteMark, deletePhoto, type ActionResult } from "../../inspection-actions";

interface Mark {
  id: string;
  number: number;
  part: string;
  kind: ConditionKind;
  note: string | null;
  photoIds: string[];
}

type Tab = "condition" | "photos";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "condition", label: "Muayene" },
  { value: "photos", label: "Öncesi / sonrası" },
];

function Thumb({ id, onDelete, disabled }: { id: string; onDelete?: () => void; disabled?: boolean }) {
  return (
    <span className="relative block aspect-square overflow-hidden rounded-lg bg-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
      {onDelete && !disabled && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Fotoğrafı sil"
          className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg bg-ground/80 text-ink"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/** A camera button: phones open the camera straight away */
function PhotoButton({ onFile, busy, label = "Fotoğraf çek" }: { onFile: (f: File) => void; busy: boolean; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="light" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
        {label}
      </Button>
    </>
  );
}

export function InspectionEditor({
  orderId,
  pet,
  breed,
  approvedAt,
  marks,
  photos,
}: {
  orderId: string;
  pet: { name: string; size: PetSize };
  breed: string;
  approvedAt: string | null;
  marks: Mark[];
  photos: Array<{ id: string; kind: "CONDITION" | "BEFORE" | "AFTER" }>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("condition");
  const [part, setPart] = useState<string | null>(null);
  const [kind, setKind] = useState<ConditionKind>("MATTED");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = !!approvedAt;

  const run = (fn: () => Promise<ActionResult>, success?: string, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        if (success) toast.success(success);
        after?.(r);
        router.refresh();
      }
    });

  const upload = async (file: File, kindOf: "CONDITION" | "BEFORE" | "AFTER", conditionMarkId?: string) => {
    setUploading(conditionMarkId ?? kindOf);
    const r = await uploadPhoto(file, { workOrderId: orderId, kind: kindOf, conditionMarkId });
    setUploading(null);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Fotoğraf eklendi");
      router.refresh();
    }
  };

  const partMarks = part ? marks.filter((m) => m.part === part) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8">
      <Link href={`/is/${orderId}`} className="mb-3 inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> İş emri
      </Link>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PetTag pet={pet} size="md" />
          <span className="text-sm text-muted">{breed}</span>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ready/15 px-3 py-1 text-sm font-semibold text-ready">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Müşteri onayladı · {new Date(approvedAt!).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
          </span>
        )}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-sunken p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setTab(t.value);
              setPart(null);
            }}
            className={cn("h-11 rounded-lg text-sm font-medium", tab === t.value ? "bg-raised text-ink" : "text-muted")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "condition" && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card className="p-3">
            <PetDiagram
              className="mx-auto block max-h-[52vh] w-full max-w-[300px]"
              marks={marks}
              selected={part}
              onSelect={setPart}
            />
            <p className="mt-2 text-center text-xs text-muted">{part ? PART_LABELS[part] : "Bir bölgeye dokunun"}</p>
          </Card>

          <div className="min-w-0 space-y-4">
              <>
                {part && !locked && (
                  <Card className="space-y-3 border-accent/60 p-4">
                    <p className="font-semibold">{PART_LABELS[part]}</p>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="İşaret türü">
                      {(Object.keys(CONDITION_KINDS) as ConditionKind[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={kind === k}
                          onClick={() => setKind(k)}
                          className={cn("min-h-11 rounded-lg px-2 text-sm", kind === k ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-sunken")}
                        >
                          {CONDITION_KINDS[k]}
                        </button>
                      ))}
                    </div>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı): kulak arkası, küçük…" maxLength={200} />
                    <Button
                      className="w-full"
                      disabled={pending}
                      onClick={() => run(() => addMark(orderId, part, kind, note), "İşaretlendi", () => setNote(""))}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" /> İşaretle
                    </Button>
                  </Card>
                )}

                <Card className="p-4">
                  <Eyebrow>Kayda geçenler · {marks.length}</Eyebrow>
                  {marks.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">İşaret yok. Bir şey gördüyseniz şemada bölgeye dokunup türünü seçin. Bu kayıt teşhis değildir.</p>
                  ) : (
                    <ol className="mt-2 space-y-3">
                      {(part && partMarks.length ? partMarks : marks).map((m) => (
                        <li key={m.id} className="space-y-2 rounded-xl bg-raised p-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-sm font-bold text-danger-ink">{m.number}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">
                                {PART_LABELS[m.part]} · {CONDITION_KINDS[m.kind]}
                              </span>
                              {m.note && <span className="block text-sm text-muted">{m.note}</span>}
                            </span>
                            {!locked && (
                              <button
                                type="button"
                                aria-label={`${m.number} numaralı işareti sil`}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-line"
                                onClick={() => window.confirm(`${m.number} numaralı işaret silinsin mi?`) && run(() => deleteMark(orderId, m.id), "İşaret silindi")}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          {m.photoIds.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {m.photoIds.map((pid) => (
                                <Thumb
                                  key={pid}
                                  id={pid}
                                  disabled={locked}
                                  onDelete={() =>
                                    window.confirm("Bu fotoğraf silinsin mi?") &&
                                    run(() => deletePhoto(orderId, pid), "Fotoğraf silindi")
                                  }
                                />
                              ))}
                            </div>
                          )}
                          {!locked && <PhotoButton busy={uploading === m.id} onFile={(f) => upload(f, "CONDITION", m.id)} label="Yakından fotoğraf" />}
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </>

          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(["BEFORE", "AFTER"] as const).map((k) => {
            const list = photos.filter((p) => p.kind === k);
            return (
              <Card key={k} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow>{k === "BEFORE" ? "İşlem öncesi" : "İşlem sonrası"}</Eyebrow>
                  <PhotoButton busy={uploading === k} onFile={(f) => upload(f, k)} />
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted">Henüz fotoğraf yok.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((p) => (
                      <Thumb
                        key={p.id}
                        id={p.id}
                        onDelete={() =>
                          window.confirm("Bu fotoğraf silinsin mi?") &&
                          run(() => deletePhoto(orderId, p.id), "Fotoğraf silindi")
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
