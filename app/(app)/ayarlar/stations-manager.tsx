"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Sparkles, Trash2, X, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { deleteStation, saveStation } from "./actions";

export interface StationItem {
  id: string;
  name: string;
  type: "TUB" | "TABLE" | "DRYER" | "CAT_ROOM";
  sortOrder: number;
}

const STATION_TYPES: Array<{
  value: "TUB" | "TABLE" | "DRYER" | "CAT_ROOM";
  label: string;
  badgeClass: string;
}> = [
  {
    value: "TUB",
    label: "Yıkama Küveti",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  },
  {
    value: "TABLE",
    label: "Tıraş Masası",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  },
  {
    value: "DRYER",
    label: "Kurutma",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  {
    value: "CAT_ROOM",
    label: "Kedi Odası",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  },
];

export function StationsManager({
  stations,
  canEdit,
}: {
  stations: StationItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeStation = stations.find((s) => s.id === editingId);

  const handleSubmit = (form: FormData) => {
    startTransition(async () => {
      const res = await saveStation(form);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "İstasyon kaydedildi.");
        setEditingId(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`"${name}" istasyonunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteStation(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "İstasyon silindi.");
        router.refresh();
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Salon İstasyonları</h2>
          <p className="text-sm text-muted">
            Kabulde, salon panosunda ve randevularda kullanılan çalışma alanları
          </p>
        </div>
        {canEdit && editingId !== "new" && (
          <Button
            size="sm"
            onClick={() => setEditingId("new")}
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Yeni İstasyon Ekle
          </Button>
        )}
      </div>

      {/* Düzenleme / Ekleme Formu */}
      {editingId && (
        <form
          action={handleSubmit}
          className="mb-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-line/60">
            <span className="font-semibold text-sm text-ink">
              {editingId === "new" ? "Yeni İstasyon Ekle" : "İstasyonu Düzenle"}
            </span>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg p-1 text-muted hover:bg-raised hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeStation && <input type="hidden" name="id" value={activeStation.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="İstasyon / Peron Adı">
              <Input
                name="name"
                required
                defaultValue={activeStation?.name || ""}
                placeholder="Örn: Tıraş Masası 2"
                className="bg-sunken"
              />
            </Field>

            <Field label="İstasyon Türü">
              <select
                name="type"
                defaultValue={activeStation?.type || "TABLE"}
                className="h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none"
              >
                {STATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingId(null)}
            >
              Vazgeç
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {editingId === "new" ? "İstasyonu Ekle" : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>
      )}

      {/* İstasyon Listesi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stations.map((s) => {
          const typeMeta = STATION_TYPES.find((t) => t.value === s.type) ?? STATION_TYPES[0];

          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-raised/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-ink truncate">{s.name}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border mt-1",
                    typeMeta.badgeClass
                  )}
                >
                  {typeMeta.label}
                </span>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="İstasyonu Düzenle"
                    aria-label="Düzenle"
                    onClick={() => setEditingId(s.id)}
                    className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-accent/40 hover:bg-raised hover:text-ink transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    title="İstasyonu Sil"
                    aria-label="Sil"
                    disabled={isPending}
                    onClick={() => handleDelete(s.id, s.name)}
                    className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:border-danger/40 hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
