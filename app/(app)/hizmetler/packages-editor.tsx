"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Edit3, Package, Percent, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatTL, parseTL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deletePackage, savePackage, type ActionResult } from "./actions";

export interface PackageRow {
  id: string;
  name: string;
  price: number;
  serviceIds: string[];
}

interface ServiceLite {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
}

const listTotal = (ids: string[], services: ServiceLite[]) =>
  ids.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.basePrice ?? 0), 0);

function PackageForm({
  pkg,
  services,
  onDone,
}: {
  pkg?: PackageRow;
  services: ServiceLite[];
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [ids, setIds] = useState<string[]>(pkg?.serviceIds ?? []);
  const [price, setPrice] = useState(pkg ? String(pkg.price).replace(".", ",") : "");
  const sum = listTotal(ids, services);
  const p = parseTL(price);
  const discountAmount = p !== null && p > 0 && sum > p ? sum - p : 0;
  const discountPercent = sum > 0 && discountAmount > 0 ? Math.round((discountAmount / sum) * 100) : 0;

  const submit = (form: FormData) =>
    start(async () => {
      const r: ActionResult = await savePackage(form);
      if (r.error) toast.error(r.error);
      else {
        toast.success(pkg ? "Paket kaydedildi" : "Paket eklendi");
        onDone();
      }
    });

  return (
    <Card className="border-accent/60 bg-surface p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink font-bold">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              {pkg ? "Paketi Düzenle" : "Yeni Hizmet Paketi Oluştur"}
            </h3>
            <p className="text-xs text-muted">Birden fazla hizmeti tek fiyata avantajlı bir paket yapın</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form action={submit} className="space-y-5">
        {pkg && <input type="hidden" name="id" value={pkg.id} />}
        {ids.map((id) => (
          <input key={id} type="hidden" name="serviceIds" value={id} />
        ))}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Paket Adı">
            <Input
              name="name"
              required
              defaultValue={pkg?.name}
              placeholder="Örn: Tam bakım paketi"
              className="bg-sunken"
            />
          </Field>
          <Field label="Paket Fiyatı (Küçük Köpek)">
            <Input
              name="price"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Örn: 48.000"
              className="font-display text-lg font-bold text-accent-strong bg-sunken"
            />
          </Field>
        </div>

        {/* Canlı İndirim / Karşılaştırma Şeridi */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-raised/50 p-3.5 text-sm">
          <div>
            <span className="text-xs text-muted block">Pakete Dahil Hizmetlerin Toplam Liste Fiyatı</span>
            <span className="font-semibold text-ink text-base">{sum > 0 ? formatTL(sum) : "—"}</span>
          </div>

          {discountAmount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-ready/15 px-3 py-1 font-semibold text-ready text-xs">
                {formatTL(discountAmount)} İndirim (%{discountPercent} Tasarruf)
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted">Paket fiyatı girildiğinde indirim oranı hesaplanır</span>
          )}
        </div>

        {/* Dahil Hizmetler Seçim Listesi */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Pakete Dahil Edilecek Hizmetler (En az 2 seçin)</span>
            <span className="text-xs text-muted">{ids.length} hizmet seçildi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {services
              .filter((s) => s.isActive || ids.includes(s.id))
              .map((s) => {
                const on = ids.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setIds(on ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 text-left transition-all border",
                      on
                        ? "bg-accent/10 border-accent/70 text-ink shadow-sm"
                        : "bg-surface border-line text-muted hover:border-line-strong hover:bg-raised/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors",
                        on ? "bg-accent border-accent text-accent-ink" : "border-line-strong"
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium text-sm text-ink">{s.name}</span>
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted shrink-0">
                      {s.basePrice > 0 ? formatTL(s.basePrice) : "—"}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={pending || ids.length < 2}>
            <Check className="h-4 w-4" />
            {pkg ? "Değişiklikleri Kaydet" : "Paketi Oluştur"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Vazgeç
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PackagesEditor({
  packages,
  services,
  canEdit,
}: {
  packages: PackageRow[];
  services: ServiceLite[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const getService = (id: string) => services.find((s) => s.id === id);

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Kampanyalı Paketler</h2>
          <p className="text-sm text-muted">
            Birden çok hizmeti bir araya getirerek müşteriye avantajlı paket fiyatı sunun
          </p>
        </div>
        {canEdit && open !== "new" && (
          <Button onClick={() => setOpen("new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Paket Oluştur
          </Button>
        )}
      </div>

      {open === "new" && <PackageForm services={services} onDone={() => setOpen(null)} />}

      {packages.length === 0 && open !== "new" && (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-raised border border-line text-muted mb-3">
            <Package className="h-6 w-6" />
          </div>
          <p className="font-semibold text-ink">Henüz tanımlı paket bulunmuyor</p>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Yıkama, tıraş ve tırnak gibi hizmetlerinizi birleştirerek ilk paketinizi oluşturun.
          </p>
          {canEdit && (
            <Button onClick={() => setOpen("new")} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              İlk Paketi Ekle
            </Button>
          )}
        </Card>
      )}

      {/* Vitrin Paket Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const isEditing = open === pkg.id;
          const sum = listTotal(pkg.serviceIds, services);
          const diff = sum > pkg.price ? sum - pkg.price : 0;
          const percent = sum > 0 && diff > 0 ? Math.round((diff / sum) * 100) : 0;

          if (isEditing) {
            return (
              <div key={pkg.id} className="col-span-full">
                <PackageForm pkg={pkg} services={services} onDone={() => setOpen(null)} />
              </div>
            );
          }

          return (
            <Card
              key={pkg.id}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-lg"
            >
              <div>
                {/* Kart Başlık & Fiyat */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted mb-1.5">
                      <Sparkles className="h-3 w-3 text-accent-strong" />
                      Paket
                    </div>
                    <h3 className="font-display text-lg font-bold text-ink leading-tight">{pkg.name}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display text-2xl font-bold tabular-nums text-accent-strong">
                      {formatTL(pkg.price)}
                    </span>
                    <span className="block text-[10px] text-muted uppercase">Küçük Köpek Fiyatı</span>
                  </div>
                </div>

                {/* Pakete Dahil Olan Hizmetler */}
                <div className="space-y-1.5 py-3 border-y border-line/60 my-3">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                    Dahil Hizmetler ({pkg.serviceIds.length})
                  </span>
                  {pkg.serviceIds.map((sid) => {
                    const s = getService(sid);
                    return (
                      <div key={sid} className="flex items-center justify-between text-xs gap-2">
                        <span className="flex items-center gap-1.5 text-ink truncate">
                          <Check className="h-3.5 w-3.5 text-accent-strong shrink-0" strokeWidth={2.6} />
                          <span className="truncate">{s?.name ?? "Silinmiş Hizmet"}</span>
                        </span>
                        {s && s.basePrice > 0 && (
                          <span className="text-muted tabular-nums shrink-0">{formatTL(s.basePrice)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alt Bilgi: Tasarruf ve İşlemler */}
              <div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-muted">
                    Ayrı ayrı: <span className="line-through">{formatTL(sum)}</span>
                  </span>
                  {percent > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-ready/15 px-2 py-0.5 font-semibold text-ready text-[11px]">
                      <Percent className="h-3 w-3" />
                      %{percent} Tasarruf
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-line/60 mt-2">
                    <button
                      type="button"
                      title="Paketi Düzenle"
                      aria-label="Düzenle"
                      onClick={() => setOpen(pkg.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-accent/40 hover:bg-raised hover:text-ink transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      title="Paketi Sil"
                      aria-label="Sil"
                      onClick={() => {
                        if (window.confirm(`"${pkg.name}" paketi silinsin mi?`)) {
                          start(async () => {
                            const r = await deletePackage(pkg.id);
                            if (r.error) toast.error(r.error);
                            else toast.success("Paket silindi");
                          });
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-danger/40 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
