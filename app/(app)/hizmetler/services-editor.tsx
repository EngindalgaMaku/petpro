"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  PawPrint,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import type { ServiceKind, StationType, PetSize } from "@prisma/client";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatTL, parseTL, sizePrice } from "@/lib/money";
import { KINDS, PRODUCT_KINDS } from "@/lib/service-kinds";
import { SIZES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { deleteService, saveMultipliers, saveService, setServiceActive, type ActionResult } from "./actions";
import { PackagesEditor, type PackageRow } from "./packages-editor";

export interface ServiceRow {
  id: string;
  name: string;
  kind: ServiceKind;
  defaultProduct: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  stationType: StationType | "";
  reminderWeeks: number | null;
  isActive: boolean;
}

const STATIONS: Array<{ value: StationType | ""; label: string }> = [
  { value: "", label: "Fark etmez" },
  { value: "TUB", label: "Yıkama küveti" },
  { value: "TABLE", label: "Tıraş masası" },
  { value: "DRYER", label: "Kurutma" },
  { value: "CAT_ROOM", label: "Kedi odası" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240];
const durationLabel = (m: number) => {
  if (!m || m <= 0) return "0 dk";
  if (m < 60) return `${Math.round(m)} dk`;
  if (m < 480) {
    const hours = Math.floor(m / 60);
    const mins = Math.round(m % 60);
    if (mins === 0) return `${hours} sa`;
    if (mins === 30) return `${hours},5 sa`;
    return `${hours} sa ${mins} dk`;
  }
  const days = Math.floor(m / 480);
  const remMinutes = Math.round(m % 480);
  if (remMinutes === 0) return `${days} gün`;
  if (remMinutes === 240) return `${days},5 gün`;
  const remHours = Math.round(remMinutes / 60);
  if (remHours === 0) return `${days} gün`;
  return `${days} gün ${remHours} sa`;
};

const REMINDERS = [null, 4, 6, 8, 12];
const SIZE_KEYS = Object.keys(SIZES) as PetSize[];

// Kategori Görsel Temaları (Renk ve İkonlar)
const KIND_THEMES: Record<ServiceKind, { badgeBg: string; textColor: string; borderColor: string }> = {
  BATH: { badgeBg: "bg-sky-500/10", textColor: "text-sky-700 dark:text-sky-400", borderColor: "border-sky-500/20" },
  HAIRCUT: { badgeBg: "bg-purple-500/10", textColor: "text-purple-700 dark:text-purple-400", borderColor: "border-purple-500/20" },
  DEMATTING: { badgeBg: "bg-amber-500/10", textColor: "text-amber-800 dark:text-amber-400", borderColor: "border-amber-500/20" },
  NAILS: { badgeBg: "bg-indigo-500/10", textColor: "text-indigo-700 dark:text-indigo-400", borderColor: "border-indigo-500/20" },
  EARS: { badgeBg: "bg-emerald-500/10", textColor: "text-emerald-700 dark:text-emerald-400", borderColor: "border-emerald-500/20" },
  TEETH: { badgeBg: "bg-slate-500/15", textColor: "text-slate-700 dark:text-slate-300", borderColor: "border-slate-500/30" },
  PARASITE: { badgeBg: "bg-orange-500/10", textColor: "text-orange-700 dark:text-orange-400", borderColor: "border-orange-500/20" },
  OTHER: { badgeBg: "bg-zinc-500/10", textColor: "text-zinc-400", borderColor: "border-zinc-500/20" },
};

const selectClass =
  "h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none";

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(success);
        after?.();
      }
    });
  return { pending, run };
}

function ServiceForm({
  service,
  multipliers,
  onDone,
}: {
  service?: ServiceRow;
  multipliers: Record<PetSize, number>;
  onDone: () => void;
}) {
  const { pending, run } = useAction();
  const [price, setPrice] = useState(
    service && service.basePrice > 0 ? String(service.basePrice).replace(".", ",") : ""
  );
  const [kind, setKind] = useState<ServiceKind>(service?.kind ?? "OTHER");
  const parsed = parseTL(price);

  return (
    <Card className="border-accent/60 bg-surface p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink font-bold">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              {service ? "Hizmeti Düzenle" : "Yeni Hizmet Ekle"}
            </h3>
            <p className="text-xs text-muted">Hizmet ayrıntılarını, küçük köpek fiyatını ve süresini belirleyin</p>
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

      <form
        action={(form) => run(() => saveService(form), service ? "Hizmet kaydedildi" : "Hizmet eklendi", onDone)}
        className="space-y-5"
      >
        {service && <input type="hidden" name="id" value={service.id} />}
        <input type="hidden" name="kind" value={kind} />

        {/* Hizmet Türü Butonları */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-ink">Hizmet Kategorisi</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group">
            {(Object.keys(KINDS) as ServiceKind[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex flex-col items-start rounded-xl p-2.5 text-left text-xs transition-all border",
                  kind === k
                    ? "bg-accent border-accent text-accent-ink font-semibold shadow-sm"
                    : "bg-sunken border-line text-muted hover:bg-raised hover:text-ink hover:border-line-strong"
                )}
              >
                <span className="font-semibold text-sm">{KINDS[k].label}</span>
                <span className={cn("text-[10px] mt-0.5 line-clamp-1", kind === k ? "text-accent-ink/80" : "text-muted")}>
                  {KINDS[k].hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hizmet Adı ve Fiyat */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Field label="Hizmet Adı">
            <Input
              name="name"
              required
              defaultValue={service?.name}
              placeholder="Örn: Komple tıraş"
              className="bg-sunken"
            />
          </Field>
          <Field label="Küçük Köpek Fiyatı (TL)">
            <Input
              name="basePrice"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="6.500"
              className="font-display text-lg font-bold text-accent-strong bg-sunken"
            />
          </Field>
        </div>

        {/* Canlı Size Fiyat Önizlemesi */}
        {parsed !== null && parsed > 0 && (
          <div className="rounded-xl border border-line bg-raised/50 p-3.5">
            <span className="text-xs text-muted block mb-2 font-medium">Bu fiyatla diğer sınıflar:</span>
            <div className="flex flex-wrap gap-2 text-xs">
              {SIZE_KEYS.filter((s) => s !== "SMALL").map((s) => (
                <div key={s} className="rounded-lg bg-surface border border-line px-2.5 py-1">
                  <span className="text-muted">{SIZES[s].label}: </span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatTL(Math.round(parsed * multipliers[s]))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Süre, İstasyon, Hatırlatma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Uygulama Süresi">
            <select name="durationMinutes" defaultValue={service?.durationMinutes ?? 60} className={selectClass}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {durationLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="İstasyon / Peron">
            <select name="stationType" defaultValue={service?.stationType ?? ""} className={selectClass}>
              {STATIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Periyodik Hatırlatma" hint="Müşteri çağırma süresi">
            <select name="reminderWeeks" defaultValue={service?.reminderWeeks ?? ""} className={selectClass}>
              {REMINDERS.map((m) => (
                <option key={m ?? "none"} value={m ?? ""}>
                  {m ? `${m} hafta sonra` : "Yok"}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Ürün (yıkama ve banyo için) */}
        {PRODUCT_KINDS.includes(kind) && (
          <Field label="Varsayılan Şampuan / Ürün" hint="Kabulde değiştirilebilir">
            <Input
              name="defaultProduct"
              defaultValue={service?.defaultProduct}
              placeholder="Örn: Hipoalerjenik şampuan"
              maxLength={80}
              className="bg-sunken"
            />
          </Field>
        )}

        <Field label="Kısa Açıklama" hint="Kabul fişinde ve müşteri takip ekranında gösterilir">
          <Input
            name="description"
            defaultValue={service?.description}
            placeholder="Örn: Yıkama, kurutma ve ırkına uygun kesim"
            maxLength={160}
            className="bg-sunken"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            <Check className="h-4 w-4" />
            {service ? "Değişiklikleri Kaydet" : "Hizmeti Ekle"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Vazgeç
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ServicesEditor({
  services,
  packages,
  multipliers,
  canEdit,
}: {
  services: ServiceRow[];
  packages: PackageRow[];
  multipliers: Record<PetSize, number>;
  canEdit: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"services" | "packages" | "multipliers">("services");
  const [selectedKind, setSelectedKind] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { pending, run } = useAction();

  // İstatistikler
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.isActive).length;
  const unpricedServices = services.filter((s) => s.isActive && s.basePrice <= 0).length;
  const totalPackages = packages.length;
  const avgDuration =
    services.length > 0
      ? Math.round(services.reduce((acc, s) => acc + s.durationMinutes, 0) / services.length)
      : 0;

  // Filtreleme
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchKind = selectedKind === "ALL" || s.kind === selectedKind;
      const matchSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.defaultProduct.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKind && matchSearch;
    });
  }, [services, selectedKind, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl text-ink">Hizmetler ve Fiyatlar</h1>
          <p className="mt-1 text-sm text-muted">
            Hizmetler, paketler ve boya göre fiyat katsayıları
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {activeTab === "services" && open !== "new" && (
              <Button onClick={() => setOpen("new")} className="shrink-0 whitespace-nowrap gap-2">
                <Plus className="h-4 w-4" />
                Yeni Hizmet Ekle
              </Button>
            )}
          </div>
        )}
      </header>

      {/* KPI Özet Metrikleri */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-accent-strong">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-ink">{activeServices}</p>
            <p className="text-xs text-muted">Aktif Hizmet ({totalServices} Toplam)</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-accent-strong">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-ink">{totalPackages}</p>
            <p className="text-xs text-muted">Kampanyalı Paket</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-ink">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-ink whitespace-nowrap">{durationLabel(avgDuration)}</p>
            <p className="text-xs text-muted">Ortalama İşlem Süresi</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              unpricedServices > 0 ? "bg-danger/10 border-danger/20 text-danger" : "bg-ready/10 border-ready/20 text-ready"
            )}
          >
            {unpricedServices > 0 ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <p
              className={cn(
                "font-display text-2xl font-bold tabular-nums",
                unpricedServices > 0 ? "text-danger" : "text-ready"
              )}
            >
              {unpricedServices > 0 ? `${unpricedServices} Eksik` : "Eksiksiz"}
            </p>
            <p className="text-xs text-muted">{unpricedServices > 0 ? "Fiyat Girilmeyenler" : "Tüm Fiyatlar Hazır"}</p>
          </div>
        </Card>
      </div>

      {/* 3'lü Modern Tab Menü */}
      <div className="flex rounded-xl border border-line bg-sunken p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => {
            setActiveTab("services");
            setOpen(null);
          }}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 transition-colors text-xs sm:text-sm",
            activeTab === "services" ? "bg-accent font-semibold text-accent-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          <Wrench className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Hizmetler</span>
            <span className="hidden sm:inline">Hizmet Kataloğu</span>
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] shrink-0",
              activeTab === "services" ? "bg-accent-ink/20 text-accent-ink" : "bg-raised text-muted"
            )}
          >
            {services.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("packages");
            setOpen(null);
          }}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 transition-colors text-xs sm:text-sm",
            activeTab === "packages" ? "bg-accent font-semibold text-accent-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Paketler</span>
            <span className="hidden sm:inline">Kampanyalı Paketler</span>
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] shrink-0",
              activeTab === "packages" ? "bg-accent-ink/20 text-accent-ink" : "bg-raised text-muted"
            )}
          >
            {packages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("multipliers");
            setOpen(null);
          }}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 transition-colors text-xs sm:text-sm",
            activeTab === "multipliers" ? "bg-accent font-semibold text-accent-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          <PawPrint className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Katsayılar</span>
            <span className="hidden sm:inline">Fiyat Sınıfları</span>
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SEKME 1: HİZMET KATALOĞU */}
      {/* ============================================================ */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {/* Yeni Hizmet Formu Açıkken */}
          {open === "new" && (
            <div className="mb-4">
              <ServiceForm multipliers={multipliers} onDone={() => setOpen(null)} />
            </div>
          )}

          {/* Arama & Kategori Hapları */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hizmet adı, ürün veya açıklama ara..."
                className="pl-10 h-11 bg-surface border-line"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Kategori Filtre Butonları */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedKind("ALL")}
                className={cn(
                  "min-h-10 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedKind === "ALL"
                    ? "bg-accent font-semibold text-accent-ink"
                    : "bg-surface border border-line text-muted hover:text-ink hover:bg-raised"
                )}
              >
                Tümü ({services.length})
              </button>

              {(Object.keys(KINDS) as ServiceKind[]).map((k) => {
                const count = services.filter((s) => s.kind === k).length;
                if (count === 0 && selectedKind !== k) return null;
                const isSelected = selectedKind === k;

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedKind(k)}
                    className={cn(
                      "min-h-10 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                      isSelected
                        ? "bg-accent font-semibold text-accent-ink"
                        : "bg-surface border border-line text-muted hover:text-ink hover:bg-raised"
                    )}
                  >
                    <span>{KINDS[k].label}</span>
                    <span className={cn("text-[10px]", isSelected ? "text-accent-ink/70" : "text-muted")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hizmet Listesi */}
          {filteredServices.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted">
              {searchQuery || selectedKind !== "ALL"
                ? "Filtrelerle eşleşen hizmet bulunamadı."
                : "Henüz hizmet tanımlanmamış."}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredServices.map((s) => {
                const isOpen = open === s.id;
                const theme = KIND_THEMES[s.kind] ?? KIND_THEMES.OTHER;

                if (isOpen) {
                  return (
                    <div key={s.id} className="col-span-full">
                      <ServiceForm service={s} multipliers={multipliers} onDone={() => setOpen(null)} />
                    </div>
                  );
                }

                return (
                  <Card
                    key={s.id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-4 transition-all hover:border-line-strong hover:bg-raised/30 hover:shadow-md",
                      !s.isActive ? "opacity-60 border-line bg-surface/50" : "border-line bg-surface"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Üst Başlık & Tür Rozeti & Fiyat */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] font-semibold border",
                                theme.badgeBg,
                                theme.textColor,
                                theme.borderColor
                              )}
                            >
                              {KINDS[s.kind].label}
                            </span>
                            {!s.isActive && (
                              <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
                                Gizli
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-ink text-base truncate">{s.name}</h3>
                          {s.description && (
                            <p className="text-xs text-muted line-clamp-1 mt-0.5">{s.description}</p>
                          )}
                        </div>

                        {/* Fiyat Alanı */}
                        <div className="text-right shrink-0">
                          {s.basePrice > 0 ? (
                            <div>
                              <span className="font-display text-xl font-bold tabular-nums text-accent-strong">
                                {formatTL(s.basePrice)}
                              </span>
                              <span className="block text-[10px] text-muted">Orta köpek: {formatTL(Math.round(s.basePrice * multipliers.MEDIUM))}</span>
                            </div>
                          ) : (
                            <span className="rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent-strong">
                              Fiyat Girin
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hap Rozetler (Süre, İstasyon, Ürün) */}
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-muted border border-line">
                          <Clock className="h-3 w-3 text-muted" />
                          {durationLabel(s.durationMinutes)}
                        </span>

                        {s.stationType && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-muted border border-line">
                            📍 {STATIONS.find((x) => x.value === s.stationType)?.label}
                          </span>
                        )}

                        
                        {s.defaultProduct && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-ink border border-line font-medium truncate max-w-[180px]">
                            💎 {s.defaultProduct}
                          </span>
                        )}

                        {s.reminderWeeks && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-muted border border-line">
                            🔔 {s.reminderWeeks} Haftada Bir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Alt İşlem Butonları */}
                    {canEdit && (
                      <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-3">
                        <button
                          type="button"
                          disabled={pending}
                          title={s.isActive ? "Hizmeti listeden gizle" : "Hizmeti listede göster"}
                          aria-label={s.isActive ? "Gizle" : "Listede Göster"}
                          onClick={() =>
                            run(
                              () => setServiceActive(s.id, !s.isActive),
                              s.isActive ? "Hizmet gizlendi" : "Hizmet listede gösteriliyor"
                            )
                          }
                          className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-raised transition-colors"
                        >
                          {s.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted/60" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Hizmeti Düzenle"
                            aria-label="Düzenle"
                            onClick={() => setOpen(s.id)}
                            className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-accent/40 hover:bg-raised hover:text-ink transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={pending}
                            title="Hizmeti Sil"
                            aria-label="Sil"
                            onClick={() => {
                              if (window.confirm(`"${s.name}" hizmetini silmek istediğinize emin misiniz?`)) {
                                run(() => deleteService(s.id), "Hizmet silindi", () => setOpen(null));
                              }
                            }}
                            className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-danger/40 hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SEKME 2: KAMPANYALI PAKETLER */}
      {/* ============================================================ */}
      {activeTab === "packages" && (
        <PackagesEditor packages={packages} services={services} canEdit={canEdit} />
      )}

      {/* ============================================================ */}
      {/* SEKME 3: ARAÇ SINIFLARI & CANLI FİYAT MATRİSİ */}
      {/* ============================================================ */}
      {activeTab === "multipliers" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-3 border-b border-line">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Fiyat Sınıfı Katsayıları</h2>
                <p className="text-sm text-muted">
                  Küçük köpek fiyatı 1,00 kabul edilir. Boy ve işçilik farkına göre diğer sınıfların çarpanını belirleyin.
                </p>
              </div>
            </div>

            <form
              action={(form) => run(() => saveMultipliers(form), "Katsayılar başarıyla kaydedildi")}
              className="space-y-5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {SIZE_KEYS.map((s) => (
                  <Field key={s} label={SIZES[s].label}>
                    <Input
                      name={s}
                      inputMode="decimal"
                      defaultValue={multipliers[s].toFixed(2).replace(".", ",")}
                      disabled={!canEdit}
                      className="font-display text-lg font-bold tabular-nums bg-sunken"
                    />
                  </Field>
                ))}
              </div>

              {canEdit && (
                <Button type="submit" disabled={pending} className="gap-2">
                  <Check className="h-4 w-4" />
                  Katsayı Değişikliklerini Kaydet
                </Button>
              )}
            </form>
          </Card>

          {/* Canlı Fiyat Karşılaştırma Matrisi Tablosu */}
          <Card className="p-6 overflow-hidden">
            <div className="mb-4">
              <h3 className="font-display text-lg font-bold text-ink">Canlı Fiyat Karşılaştırma Matrisi</h3>
              <p className="text-xs text-muted">
                Hizmetlerinizin mevcut katsayılarla sınıflara göre otomatik hesaplanan nihai satış fiyatları
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-raised/50 text-muted uppercase tracking-wider">
                    <th className="py-3 px-3 font-semibold">Hizmet Adı</th>
                    <th className="py-3 px-3 font-semibold">Kategori</th>
                    <th className="py-3 px-3 font-semibold text-right">Küçük (1,00)</th>
                    <th className="py-3 px-3 font-semibold text-right">Kedi ({multipliers.CAT})</th>
                    <th className="py-3 px-3 font-semibold text-right text-accent-strong">Orta ({multipliers.MEDIUM})</th>
                    <th className="py-3 px-3 font-semibold text-right">Büyük ({multipliers.LARGE})</th>
                    <th className="py-3 px-3 font-semibold text-right">Dev ({multipliers.GIANT})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {services
                    .filter((s) => s.isActive && s.basePrice > 0)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-raised/30 transition-colors">
                        <td className="py-3 px-3 font-medium text-ink truncate max-w-[200px]">{s.name}</td>
                        <td className="py-3 px-3 text-muted">{KINDS[s.kind].label}</td>
                        <td className="py-3 px-3 text-right font-semibold text-ink font-mono">
                          {formatTL(s.basePrice)}
                        </td>
                        <td className="py-3 px-3 text-right text-muted font-mono">
                          {formatTL(Math.round(s.basePrice * multipliers.CAT))}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-accent-strong font-mono">
                          {formatTL(Math.round(s.basePrice * multipliers.MEDIUM))}
                        </td>
                        <td className="py-3 px-3 text-right text-muted font-mono">
                          {formatTL(Math.round(s.basePrice * multipliers.LARGE))}
                        </td>
                        <td className="py-3 px-3 text-right text-muted font-mono">
                          {formatTL(Math.round(s.basePrice * multipliers.GIANT))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
