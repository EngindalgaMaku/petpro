"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Globe } from "lucide-react";
import { Button, buttonStyles, Card, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { updateBooking, type SettingsState } from "./actions";

// Monday first, as Turkish calendars show it. Values are JavaScript's getDay()
const WEEK = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cmt" },
  { value: 0, label: "Paz" },
];

export function BookingSettings({
  slug,
  enabled,
  openTime,
  closeTime,
  closedDays,
  canEdit,
  restricted,
}: {
  slug: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
  closedDays: string;
  canEdit: boolean;
  restricted: boolean;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateBooking, {});
  const [closed, setClosed] = useState(closedDays.split(",").filter(Boolean).map(Number));
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/r/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Bağlantı kopyalandı");
    } catch {
      window.prompt("Bağlantı:", link);
    }
  };

  return (
    <Card className="space-y-4 p-6" data-testid="booking-settings">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Globe className="h-5 w-5 text-accent-strong" aria-hidden="true" />
          Online randevu
        </h2>
        <p className="text-sm text-muted">Bu bağlantıyı Instagram profilinize koyun. Müşteriniz boş saatleri görür, talep bırakır, siz onaylarsınız.</p>
      </div>
      {restricted && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">Kısıtlı modda online randevu kapalıdır. Tam kullanım için bize yazın.</p>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-raised/40 p-3">
        <span className="min-w-0 flex-1 break-all font-mono text-sm" data-testid="booking-link">
          {link}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Kopyala
        </Button>
        <a href={`/r/${slug}`} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Aç
        </a>
      </div>
      <form action={action} className="space-y-4">
        <label className="flex min-h-11 items-center gap-3 font-medium">
          <input type="checkbox" name="enabled" defaultChecked={enabled} disabled={!canEdit} className="h-5 w-5 accent-[var(--color-accent)]" />
          Online randevu alınsın
        </label>
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Field label="Açılış">
            <Input type="time" name="openTime" defaultValue={openTime} step={1800} disabled={!canEdit} />
          </Field>
          <Field label="Kapanış">
            <Input type="time" name="closeTime" defaultValue={closeTime} step={1800} disabled={!canEdit} />
          </Field>
        </div>
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Kapalı günler</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kapalı günler">
            {WEEK.map((d) => {
              const on = closed.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={on}
                  onClick={() => setClosed(on ? closed.filter((x) => x !== d.value) : [...closed, d.value])}
                  className={cn("h-11 min-w-11 rounded-lg px-2 text-sm", on ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-sunken")}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="closedDays" value={closed.join(",")} />
        </div>
        {state.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
        {state.success && <p role="status" className="text-sm font-medium text-ready">{state.success}</p>}
        {canEdit && <Button type="submit" disabled={pending}>Kaydet</Button>}
      </form>
    </Card>
  );
}
