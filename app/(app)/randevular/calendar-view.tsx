"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  List,
  Phone,
  Plus,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useEscape } from "@/lib/use-escape";
import { deleteAppointment, saveAppointment, setAppointmentStatus, type AppointmentResult } from "./actions";

export interface CalendarAppointment {
  id: string;
  title: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  status: AppointmentStatus;
  stationId: string | null;
  stationName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  petName: string | null;
  breed: string | null;
  notes: string | null;
}

interface StationOption {
  id: string;
  name: string;
  type: string;
}

interface ServiceQuickOption {
  id: string;
  name: string;
  durationMinutes: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STATUS_MAP: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  BOOKED: { label: "Bekleniyor", bg: "bg-accent/15", text: "text-accent-strong", border: "border-accent/40" },
  ARRIVED: { label: "Geldi", bg: "bg-ready/15", text: "text-ready", border: "border-ready/40" },
  CANCELLED: { label: "İptal", bg: "bg-danger/10", text: "text-danger", border: "border-danger/30" },
  NO_SHOW: { label: "Gelmedi", bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" },
};

export function CalendarView({
  dateKey,
  appointments,
  stations,
  services,
}: {
  dateKey: string;
  appointments: CalendarAppointment[];
  stations: StationOption[];
  services: ServiceQuickOption[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const timelineColumns = `64px repeat(${stations.length + 1}, minmax(130px, 1fr))`;
  // On a phone the list reads better than a chart wider than the screen
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setViewMode("list");
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  useEscape(modalOpen, () => setModalOpen(false));
  const [editingApp, setEditingApp] = useState<CalendarAppointment | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [pending, startTransition] = useTransition();

  const changeDate = (newKey: string) => {
    router.push(`/randevular?tarih=${newKey}`);
  };

  const shiftDate = (days: number) => {
    const d = new Date(dateKey);
    d.setDate(d.getDate() + days);
    changeDate(d.toISOString().slice(0, 10));
  };

  const openNewModal = (stationId?: string, hour?: number) => {
    setEditingApp(null);
    setSelectedStation(stationId ?? "");
    if (hour !== undefined) {
      const hStr = hour.toString().padStart(2, "0") + ":00";
      const endHStr = (hour + 1).toString().padStart(2, "0") + ":00";
      setStartTime(hStr);
      setEndTime(endHStr);
    }
    setModalOpen(true);
  };

  const openEditModal = (app: CalendarAppointment) => {
    setEditingApp(app);
    setSelectedStation(app.stationId ?? "");
    const sDate = new Date(app.startsAt);
    const eDate = new Date(app.endsAt);
    setStartTime(
      sDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })
    );
    setEndTime(
      eDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })
    );
    setModalOpen(true);
  };

  // Form Gönderimi
  const handleSave = (form: FormData) => {
    startTransition(async () => {
      // ISO Date strings
      const sDateTime = new Date(`${dateKey}T${startTime}:00+03:00`).toISOString();
      const eDateTime = new Date(`${dateKey}T${endTime}:00+03:00`).toISOString();
      form.set("startsAt", sDateTime);
      form.set("endsAt", eDateTime);
      if (selectedStation) form.set("stationId", selectedStation);

      const r: AppointmentResult = await saveAppointment(form);
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(editingApp ? "Randevu güncellendi" : "Randevu oluşturuldu");
        setModalOpen(false);
      }
    });
  };

  const handleStatus = (id: string, status: AppointmentStatus) => {
    startTransition(async () => {
      const r = await setAppointmentStatus(id, status);
      if (r.error) toast.error(r.error);
      else toast.success(`Durum güncellendi: ${STATUS_MAP[status].label}`);
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const r = await deleteAppointment(id);
      if (r.error) toast.error(r.error);
      else toast.success("Randevu silindi");
    });
  };

  // Tarih Başlığı Formatı
  const dateFormatted = new Date(`${dateKey}T12:00:00+03:00`).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  });

  return (
    <div className="space-y-6">
      {/* Üst Bar: Başlık, Tarih Seçici ve Görünüm Modları */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl text-ink">Randevu Takvimi</h1>
          <p className="mt-1 text-sm text-muted">İstasyon bazlı zaman çizelgesi ve randevu çakışma önleyici ajanda</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Görünüm Değiştirici */}
          <div className="flex rounded-xl border border-line bg-sunken p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={cn(
                "flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                viewMode === "timeline" ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>İstasyon Çizelgesi</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                viewMode === "list" ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Liste</span>
            </button>
          </div>

          <Button onClick={() => openNewModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Randevu Al
          </Button>
        </div>
      </div>

      {/* Tarih Gezgini */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            aria-label="Önceki gün"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink transition-colors border border-line"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeDate(new Date().toISOString().slice(0, 10))}
            className="h-11 rounded-lg px-3 text-xs font-semibold bg-raised border border-line text-ink hover:border-line-strong transition-colors"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            aria-label="Sonraki gün"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink transition-colors border border-line"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="font-semibold text-sm sm:text-base text-ink ml-2 capitalize">{dateFormatted}</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateKey}
            onChange={(e) => e.target.value && changeDate(e.target.value)}
            className="h-11 rounded-lg border border-line bg-sunken px-2.5 text-xs text-ink focus:border-accent focus:outline-none"
          />
          <span className="rounded-lg bg-raised px-2.5 py-1 text-xs font-medium text-muted border border-line">
            {appointments.length} Randevu
          </span>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* 1. İSTASYON ZAMAN ÇİZELGESİ (TIMELINE MATRIX) */}
      {/* ============================================================ */}
      {viewMode === "timeline" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 64 + (stations.length + 1) * 130 }}>
              {/* İstasyon Sütun Başlıkları */}
              <div style={{ gridTemplateColumns: timelineColumns }} className="grid border-b border-line bg-raised/50 sticky top-0 z-10 text-xs font-semibold">
                <div className="p-3 text-muted text-center border-r border-line">Saat</div>
                {stations.map((st) => (
                  <div key={st.id} className="p-3 border-r border-line text-ink flex items-center justify-between">
                    <span className="truncate">{st.name}</span>
                    <button
                      type="button"
                      title={`${st.name} için randevu ekle`}
                      onClick={() => openNewModal(st.id)}
                      aria-label={`${st.name} için randevu ekle`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded text-muted hover:text-accent-strong"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="p-3 text-muted">Belirtilmemiş</div>
              </div>

              {/* Saat Satırları */}
              <div className="divide-y divide-line/40">
                {HOURS.map((hour) => {
                  const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
                  return (
                    <div
                      key={hour}
                      style={{ gridTemplateColumns: timelineColumns }}
                      className="grid min-h-[72px] hover:bg-raised/20 transition-colors"
                    >
                      {/* Saat Etiketi */}
                      <div className="p-2 border-r border-line/60 text-xs font-mono text-muted text-center flex items-center justify-center">
                        {hourLabel}
                      </div>

                      {/* Her İstasyonun Saat Hücresi */}
                      {stations.map((st) => {
                        // Bu istasyonda ve bu saat aralığında başlayan randevular
                        const matching = appointments.filter((a) => {
                          if (a.stationId !== st.id) return false;
                          const startH = new Date(a.startsAt).getHours();
                          return startH === hour;
                        });

                        return (
                          <div
                            key={st.id}
                            onClick={() => matching.length === 0 && openNewModal(st.id, hour)}
                            className={cn(
                              "p-1.5 border-r border-line/40 relative cursor-pointer group flex flex-col gap-1.5",
                              matching.length === 0 ? "hover:bg-accent/5" : ""
                            )}
                          >
                            {matching.map((app) => {
                              const s = STATUS_MAP[app.status];
                              return (
                                <div
                                  key={app.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(app);
                                  }}
                                  className={cn(
                                    "rounded-xl p-2.5 text-xs border shadow-sm transition-transform hover:scale-[1.02] cursor-pointer",
                                    s.bg,
                                    s.border
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={cn("text-[10px] font-bold uppercase", s.text)}>
                                      {s.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted">
                                      {new Date(app.startsAt).toLocaleTimeString("tr-TR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "Europe/Istanbul",
                                      })}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-ink line-clamp-1">{app.title}</p>
                                  {app.petName && (
                                    <div className="mt-1.5">
                                      <PetTag pet={{ name: app.petName }} size="xs" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {matching.length === 0 && (
                              <div className="h-full w-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted/60 transition-opacity">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* İstasyonsuz Randevular */}
                      {(() => {
                        const matching = appointments.filter((a) => {
                          if (a.stationId !== null) return false;
                          const startH = new Date(a.startsAt).getHours();
                          return startH === hour;
                        });

                        return (
                          <div
                            onClick={() => matching.length === 0 && openNewModal("", hour)}
                            className="p-1.5 cursor-pointer flex flex-col gap-1.5 hover:bg-accent/5"
                          >
                            {matching.map((app) => {
                              const s = STATUS_MAP[app.status];
                              return (
                                <div
                                  key={app.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(app);
                                  }}
                                  className={cn(
                                    "rounded-xl p-2.5 text-xs border shadow-sm transition-transform hover:scale-[1.02] cursor-pointer",
                                    s.bg,
                                    s.border
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={cn("text-[10px] font-bold uppercase", s.text)}>
                                      {s.label}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-ink line-clamp-1">{app.title}</p>
                                  {app.petName && (
                                    <div className="mt-1">
                                      <PetTag pet={{ name: app.petName }} size="xs" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 2. LİSTE GÖRÜNÜMÜ */}
      {/* ============================================================ */}
      {viewMode === "list" && (
        <div>
          {appointments.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted">
              Bu tarihte kayıtlı randevu bulunmuyor.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {appointments.map((app) => {
                const s = STATUS_MAP[app.status];
                const sTime = new Date(app.startsAt).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Istanbul",
                });
                const eTime = new Date(app.endsAt).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Istanbul",
                });

                return (
                  <Card
                    key={app.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-line bg-surface hover:border-line-strong transition-all shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-semibold border",
                            s.bg,
                            s.text,
                            s.border
                          )}
                        >
                          {s.label}
                        </span>
                        <span className="font-mono text-xs font-semibold text-ink">
                          {sTime} - {eTime}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-semibold text-ink text-base">{app.title}</h3>
                        <p className="text-xs text-muted mt-0.5">
                          {app.stationName ? `📍 ${app.stationName}` : "İstasyon atanmadı"}
                        </p>
                      </div>

                      {/* Hayvan ve Müşteri */}
                      {(app.petName || app.customerName) && (
                        <div className="rounded-xl border border-line bg-raised/40 p-2.5 flex items-center justify-between text-xs">
                          <div>
                            {app.customerName && <p className="font-medium text-ink">{app.customerName}</p>}
                            {app.customerPhone && (
                              <p className="text-[11px] text-muted">{formatPhone(app.customerPhone)}</p>
                            )}
                          </div>
                          {app.petName && <PetTag pet={{ name: app.petName }} size="xs" />}
                        </div>
                      )}

                      {app.notes && <p className="text-xs text-muted italic line-clamp-2">“{app.notes}”</p>}
                    </div>

                    {/* Alt Aksiyon Butonları */}
                    <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-4 text-xs">
                      {app.status === "BOOKED" && (
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/kabul?telefon=${app.customerPhone ?? ""}`}
                            className="min-h-10 rounded-lg bg-ready/15 text-ready border border-ready/30 px-2.5 py-1 font-semibold hover:bg-ready/25 transition-colors inline-flex items-center gap-1 text-xs"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Geldi (Kabul Aç)
                          </Link>
                        </div>
                      )}

                      {app.status !== "BOOKED" && <span className="text-muted text-[11px]">{s.label}</span>}

                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(app)}
                          className="h-10 lg:h-7 px-2 text-xs"
                        >
                          Düzenle
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDelete(app.id)}
                          className="grid h-10 w-10 place-items-center text-muted hover:text-danger rounded hover:bg-danger/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. YENİ / DÜZENLEME MODALI */}
      {/* ============================================================ */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Randevu" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 border-accent/60 bg-surface shadow-2xl relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent-strong" />
                <h2 className="font-display text-lg font-bold text-ink">
                  {editingApp ? "Randevuyu Güncelle" : "Yeni Randevu Oluştur"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:text-ink hover:bg-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={handleSave} className="space-y-4">
              {editingApp && <input type="hidden" name="id" value={editingApp.id} />}

              {/* Hızlı Hizmet Seçimi */}
              {services.length > 0 && !editingApp && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted font-medium">Hızlı Hizmet Seçimi (İsteğe Bağlı)</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {services.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => {
                          const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
                          if (titleInput) titleInput.value = srv.name;
                        }}
                        className="rounded-lg bg-raised border border-line px-2 py-1 text-[11px] text-muted hover:text-ink hover:border-line-strong transition-colors"
                      >
                        + {srv.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Randevu Başlığı / Yapılacak İş">
                <Input
                  name="title"
                  required
                  defaultValue={editingApp?.title}
                  placeholder="Örn: Pamuk, komple tıraş"
                  className="bg-sunken"
                />
              </Field>

              {/* İstasyon & Saatler */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="İstasyon / Peron">
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="">Fark etmez</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Başlangıç">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="bg-sunken font-mono"
                  />
                </Field>

                <Field label="Bitiş">
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="bg-sunken font-mono"
                  />
                </Field>
              </div>

              {/* Müşteri & Hayvan Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-line/60">
                <Field label="Müşteri Adı">
                  <Input
                    name="customerName"
                    defaultValue={editingApp?.customerName ?? ""}
                    placeholder="Ali Kaya"
                    className="bg-sunken"
                  />
                </Field>
                <Field label="Müşteri Cep Telefonu">
                  <Input
                    name="customerPhone"
                    defaultValue={editingApp?.customerPhone ?? ""}
                    placeholder="05XX XXX XX XX"
                    className="bg-sunken"
                  />
                </Field>
              </div>

              <Field label="Hayvanın adı">
                <Input
                  name="petName"
                  defaultValue={editingApp?.petName ?? ""}
                  placeholder="34ABC123"
                  className="bg-sunken uppercase font-mono"
                />
              </Field>

              <Field label="Özel Notlar">
                <Input
                  name="notes"
                  defaultValue={editingApp?.notes ?? ""}
                  placeholder="Müşteri erken bırakacak vb."
                  className="bg-sunken"
                />
              </Field>

              {/* Düzenleme modunda durum butonları */}
              {editingApp && (
                <div className="space-y-1.5 pt-2 border-t border-line/60">
                  <span className="text-xs text-muted font-medium">Randevu Durumu:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(STATUS_MAP) as AppointmentStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatus(editingApp.id, st)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors",
                          editingApp.status === st
                            ? STATUS_MAP[st].bg + " " + STATUS_MAP[st].text + " " + STATUS_MAP[st].border
                            : "bg-surface border-line text-muted hover:text-ink"
                        )}
                      >
                        {STATUS_MAP[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Vazgeç
                </Button>
                <Button type="submit" disabled={pending} className="gap-2">
                  <Check className="h-4 w-4" />
                  {editingApp ? "Güncelle" : "Randevuyu Kaydet"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
