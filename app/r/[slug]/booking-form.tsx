"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, MessageCircle } from "lucide-react";
import type { PetSize } from "@prisma/client";
import { CatFace, DogFace, SizeIcon } from "@/components/pet-art";
import { Button, buttonStyles, Card, Field, Input } from "@/components/ui";
import { formatTL, sizePrice } from "@/lib/money";
import { isValidPhone, whatsappNumber } from "@/lib/phone";
import { SIZES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { requestAppointment, slotsFor } from "./actions";

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
}

const SIZE_KEYS = Object.keys(SIZES) as PetSize[];

const dayLabel = (day: string, options: Intl.DateTimeFormatOptions) => new Date(`${day}T12:00:00+03:00`).toLocaleDateString("tr-TR", { ...options, timeZone: "Europe/Istanbul" });

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">{number}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function BookingForm({
  slug,
  businessName,
  businessPhone,
  days,
  factors,
  services,
}: {
  slug: string;
  businessName: string;
  businessPhone: string | null;
  days: Array<{ day: string; open: boolean }>;
  factors: Record<PetSize, number>;
  services: ServiceOption[];
}) {
  const [size, setSize] = useState<PetSize | null>(null);
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, startSaving] = useTransition();

  const chosen = services.filter((s) => picked.includes(s.id));
  const minutes = chosen.reduce((sum, s) => sum + s.durationMinutes, 0);
  const priced = size ? chosen.map((s) => sizePrice(s.basePrice, factors[size])) : [];
  const total = priced.reduce((sum, p) => sum + p, 0);
  const unpriced = priced.some((p) => p === 0);
  const pickedKey = picked.join(",");

  // Free times depend on how long the job takes
  useEffect(() => {
    setTime(null);
    if (!day || !pickedKey) return setSlots(null);
    let cancelled = false;
    setSlots(null);
    slotsFor(slug, day, pickedKey.split(",")).then((list) => {
      if (!cancelled) setSlots(list);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, day, pickedKey]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const missing = [
    !size && "boyu",
    !petName.trim() && "dostunuzun adını",
    picked.length === 0 && "hizmeti",
    !time && "günü ve saati",
    name.trim().length < 2 && "adınızı",
    !isValidPhone(phone) && "telefonunuzu",
    !consent && "aydınlatma metni onayını",
  ].filter(Boolean) as string[];

  const summary = day && time ? `${dayLabel(day, { day: "numeric", month: "long", weekday: "long" })} ${time}` : "";

  const submit = () => {
    if (missing.length) return setError(`Eksik: ${missing.join(", ")}`);
    setError("");
    startSaving(async () => {
      const result = await requestAppointment({
        slug,
        day: day!,
        time: time!,
        serviceIds: picked,
        size: size!,
        petName,
        breed: breed || undefined,
        name,
        phone,
        note: note || undefined,
        consent: true,
        website,
      });
      if ("error" in result) {
        setError(result.error);
        // A slot that just filled must leave the list
        if (day) slotsFor(slug, day, picked).then(setSlots);
        setTime(null);
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0 });
    });
  };

  if (done) {
    const message = `Merhaba, ${petName.trim()} için ${summary} randevu talebi bıraktım. Adım: ${name.trim()}`;
    return (
      <Card className="space-y-4 p-6 text-center" data-testid="booking-done">
        <span className="flex justify-center" aria-hidden="true">
          {size === "CAT" ? <CatFace className="h-20 w-20" /> : <DogFace className="h-20 w-20" />}
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">Talebiniz alındı</h2>
          <p className="mt-1 text-muted">
            {petName.trim()} · {summary}
          </p>
        </div>
        <p className="text-sm">Bu saat sizin için tutuldu. {businessName} onaylayınca randevunuz kesinleşir.</p>
        {businessPhone && (
          <a href={`https://wa.me/${whatsappNumber(businessPhone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Salona WhatsApp&apos;tan haber verin
          </a>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Step number={1} title="Dostunuz">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Boyu">
          {SIZE_KEYS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={size === s}
              onClick={() => setSize(s)}
              className={cn("min-h-14 rounded-xl px-3 py-2 text-left", size === s ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-raised")}
            >
              <span className="flex items-center gap-1.5 leading-tight">
                <SizeIcon size={s} className="shrink-0" />
                {SIZES[s].label}
              </span>
              {SIZES[s].hint && <span className="block text-xs opacity-75">{SIZES[s].hint}</span>}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Adı">
            <Input value={petName} onChange={(e) => setPetName(e.target.value)} maxLength={40} autoComplete="off" />
          </Field>
          <Field label="Irkı">
            <Input value={breed} onChange={(e) => setBreed(e.target.value)} maxLength={60} placeholder="Biliyorsanız" autoComplete="off" />
          </Field>
        </div>
      </Step>

      <Step number={2} title="Hizmet">
        <ul className="space-y-1">
          {services.map((s) => {
            const on = picked.includes(s.id);
            const price = size ? sizePrice(s.basePrice, factors[size]) : 0;
            return (
              <li key={s.id}>
                <button type="button" aria-pressed={on} onClick={() => toggle(s.id)} className={cn("flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left", on && "bg-raised")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", on ? "bg-accent text-accent-ink" : "border-2 border-line-strong")} aria-hidden="true">
                    {on && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-sm text-muted">{[s.description, `${s.durationMinutes} dk`].filter(Boolean).join(" · ")}</span>
                  </span>
                  {price > 0 && <span className="shrink-0 font-display font-semibold tabular-nums">{formatTL(price)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {!size && <p className="text-sm text-muted">Fiyatlar boya göre değişir; boyu seçince görünür.</p>}
        {chosen.length > 0 && size && (
          <p className="flex justify-between gap-3 border-t border-line pt-3 text-sm" data-testid="booking-total">
            <span className="text-muted">Yaklaşık {minutes} dk</span>
            <span className="font-semibold">{total > 0 ? `Tahmini ${formatTL(total)}${unpriced ? " ve üzeri" : ""}` : "Fiyatı salonda belirlenir"}</span>
          </p>
        )}
      </Step>

      <Step number={3} title="Gün ve saat">
        {picked.length === 0 ? (
          <p className="text-sm text-muted">Önce hizmet seçin; boş saatler işin süresine göre hesaplanır.</p>
        ) : (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Gün">
              {days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  disabled={!d.open}
                  aria-pressed={day === d.day}
                  onClick={() => setDay(d.day)}
                  className={cn("min-h-16 w-16 shrink-0 rounded-xl px-1 text-center disabled:opacity-35", day === d.day ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-raised")}
                >
                  <span className="block text-xs">{dayLabel(d.day, { weekday: "short" })}</span>
                  <span className="block font-display text-lg font-bold leading-tight">{dayLabel(d.day, { day: "numeric" })}</span>
                  <span className="block text-xs">{dayLabel(d.day, { month: "short" })}</span>
                </button>
              ))}
            </div>
            {day && slots === null && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Boş saatlere bakılıyor
              </p>
            )}
            {day && slots?.length === 0 && <p className="text-sm text-muted">Bu günde uygun saat kalmamış. Başka bir gün seçin.</p>}
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Saat">
                {slots.map((t) => (
                  <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={cn("min-h-11 rounded-lg text-sm tabular-nums", time === t ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-raised")}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Step>

      <Step number={4} title="Size nasıl ulaşalım?">
        <Field label="Adınız">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        </Field>
        <Field label="Telefonunuz">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="0532 111 22 33" autoComplete="tel" />
        </Field>
        <Field label="Notunuz">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Keçe var, fön sesinden korkuyor…" className="w-full rounded-xl border border-line bg-sunken px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
        </Field>
        {/* Only scripts fill this */}
        <input value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
          <span>
            Bilgilerimin randevu için işlenmesine ilişkin{" "}
            <Link href="/kvkk" target="_blank" className="font-semibold text-accent-strong underline underline-offset-2">
              aydınlatma metnini
            </Link>{" "}
            okudum.
          </span>
        </label>
      </Step>

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button size="lg" className="w-full" disabled={saving} onClick={submit}>
        {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        Randevu talebi gönder
      </Button>
      <p className="text-center text-xs text-muted">Ödeme alınmaz. Salon onaylayınca randevunuz kesinleşir.</p>
    </div>
  );
}
