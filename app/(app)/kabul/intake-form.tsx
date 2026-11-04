"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle2, Loader2, MessageCircle, Plus, Printer } from "lucide-react";
import type { PaymentMethod, PetSize, ServiceKind, Temperament } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { Button, buttonStyles, Card, Eyebrow, Field, Input } from "@/components/ui";
import { formatTL, parseTL, sizePrice } from "@/lib/money";
import { formatPhone, isValidPhone, whatsappNumber } from "@/lib/phone";
import { KINDS, type ItemDetails } from "@/lib/service-kinds";
import { SIZES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { createWorkOrder, findOwner, type OwnerMatch, type PetMatch } from "./actions";
import { hasDetails, ItemDetailsFields } from "./item-details";

interface ServiceOption {
  id: string;
  name: string;
  kind: ServiceKind;
  defaultProduct: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  serviceIds: string[];
}

/**
 * A package's price for the pet class, shared out over its services in proportion to their
 * list prices (equally when none has a price), so each item keeps a price of its own and the
 * items add up to the package price exactly.
 */
function spreadPackage(pkg: PackageOption, services: ServiceOption[], factor: number) {
  const target = Math.round(pkg.price * factor);
  const members = pkg.serviceIds.map((id) => services.find((s) => s.id === id)!).filter(Boolean);
  const weights = members.map((s) => s.basePrice);
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = members.map((_, i) => Math.floor(target * (sum > 0 ? weights[i] / sum : 1 / members.length)));
  shares[shares.length - 1] += target - shares.reduce((a, b) => a + b, 0);
  return Object.fromEntries(members.map((s, i) => [s.id, shares[i]]));
}

const SIZE_KEYS = Object.keys(SIZES) as PetSize[];
const TEMPERAMENTS: Array<{ value: Temperament; label: string }> = [
  { value: "CALM", label: "Sakin" },
  { value: "NERVOUS", label: "Ürkek" },
  { value: "BITES", label: "Isırabilir" },
];
const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Nakit" },
  { value: "CARD", label: "Kart" },
  { value: "BANK_TRANSFER", label: "Havale" },
];
// Common in Turkish homes; a suggestion list only, any breed can be typed
const BREEDS = [
  "Maltese Terrier", "Toy Poodle", "Pomeranian", "Yorkshire Terrier", "Shih Tzu", "Golden Retriever", "Labrador", "Chow Chow",
  "Cocker Spaniel", "Samoyed", "Husky", "Sokak köpeği", "İran kedisi", "British Shorthair", "Scottish Fold", "Tekir", "Van kedisi",
];

const tl = (n: number) => formatTL(n);
const priceText = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");

type Lookup = "idle" | "searching" | "found" | "new";

/** Which pet of the owner this intake is for: one on record, or a new one */
const NEW_PET = "new";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-12 rounded-xl px-3 py-2 text-left text-[15px] transition-colors",
        selected ? "border border-accent bg-accent font-semibold text-accent-ink" : "border border-line bg-raised hover:border-line-strong"
      )}
    >
      {children}
    </button>
  );
}

export function IntakeForm({
  services,
  packages,
  multipliers,
  stations,
  businessName,
  initialPhone,
}: {
  services: ServiceOption[];
  packages: PackageOption[];
  multipliers: Record<PetSize, number>;
  stations: Array<{ id: string; name: string }>;
  businessName: string;
  initialPhone: string;
}) {
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [lookup, setLookup] = useState<Lookup>("idle");
  const [owner, setOwner] = useState<OwnerMatch | null>(null);
  const [petChoice, setPetChoice] = useState<string>(NEW_PET);
  const [customerName, setCustomerName] = useState("");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [size, setSize] = useState<PetSize>("SMALL");
  const [temperament, setTemperament] = useState<Temperament>("CALM");
  const [allergies, setAllergies] = useState("");
  const [vaccineDue, setVaccineDue] = useState("");
  const [weight, setWeight] = useState("");
  // serviceId → the price typed for it (starts at the list price for the pet class)
  const [picked, setPicked] = useState<Record<string, string>>({});
  // serviceId → what was applied (shampoo, cut, length…), for kinds that record it
  const [details, setDetails] = useState<Record<string, ItemDetails>>({});
  // serviceId → the package it came in with; its price is the package's share
  const [fromPackage, setFromPackage] = useState<Record<string, string>>({});
  const [promisedDate, setPromisedDate] = useState("");
  const [promisedTime, setPromisedTime] = useState("17:00");
  const [stationId, setStationId] = useState("");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<{ id: string; number: string; trackingToken: string; total: number; petName: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const phoneRef = useRef<HTMLInputElement>(null);

  const listPrice = (s: ServiceOption, seg = size) => sizePrice(s.basePrice, multipliers[seg]);

  const fillPet = (pet: PetMatch | null) => {
    setPetChoice(pet?.petId ?? NEW_PET);
    setPetName(pet?.name ?? "");
    setBreed(pet?.breed ?? "");
    setColor(pet?.color ?? "");
    setBirthYear(pet?.birthYear ? String(pet.birthYear) : "");
    setTemperament(pet?.temperament ?? "CALM");
    setAllergies(pet?.allergies ?? "");
    setVaccineDue(pet?.vaccineDue ?? "");
    if (pet) changeSize(pet.size);
  };

  // Look the owner up as soon as the number is whole; formatting it on blur is not a new number
  const phoneDigits = customerPhone.replace(/\D/g, "");
  useEffect(() => {
    if (!isValidPhone(customerPhone)) {
      setLookup("idle");
      setOwner(null);
      return;
    }
    setLookup("searching");
    const wanted = customerPhone;
    const timer = setTimeout(async () => {
      const found = await findOwner(wanted);
      setOwner(found);
      setLookup(found ? "found" : "new");
      if (found) {
        setCustomerName(found.name);
        // A single pet is who came; with several, the salon picks
        fillPet(found.pets.length === 1 ? found.pets[0] : null);
      } else {
        fillPet(null);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneDigits]);

  const chosen = owner?.pets.find((p) => p.petId === petChoice) ?? null;

  const packageShares = (seg: PetSize) =>
    Object.fromEntries(
      packages
        .filter((p) => Object.values(fromPackage).includes(p.name))
        .flatMap((p) => Object.entries(spreadPackage(p, services, multipliers[seg])))
    );

  // A different pet class moves untouched prices to the new list price (package shares too)
  const changeSize = (next: PetSize) => {
    const oldShares = packageShares(size);
    const newShares = packageShares(next);
    setPicked((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, price]) => {
          const s = services.find((x) => x.id === id)!;
          if (fromPackage[id]) {
            const untouched = parseTL(price) === oldShares[id];
            return [id, untouched ? priceText(newShares[id]) : price];
          }
          const untouched = parseTL(price) === listPrice(s) || price === "";
          return [id, untouched ? priceText(listPrice(s, next)) : price];
        })
      )
    );
    setSize(next);
  };

  const defaultDetails = (s: ServiceOption): ItemDetails =>
    Object.fromEntries(
      Object.entries({ product: s.defaultProduct || undefined }).filter(([, v]) => v !== undefined)
    );

  const toggle = (s: ServiceOption) => {
    const on = s.id in picked;
    setPicked((prev) => {
      const next = { ...prev };
      if (on) delete next[s.id];
      else next[s.id] = priceText(listPrice(s));
      return next;
    });
    if (!on && hasDetails(s.kind)) setDetails((d) => ({ ...d, [s.id]: d[s.id] ?? defaultDetails(s) }));
    // Taking a service out of a package ends the package price for the rest
    if (on && fromPackage[s.id]) {
      const pkgName = fromPackage[s.id];
      setFromPackage((f) => Object.fromEntries(Object.entries(f).filter(([, n]) => n !== pkgName)));
      setPicked((prev) => {
        const next = { ...prev };
        for (const [id, n] of Object.entries(fromPackage)) {
          if (n === pkgName && id !== s.id) next[id] = priceText(listPrice(services.find((x) => x.id === id)!));
        }
        return next;
      });
    }
  };

  const activePackages = new Set(Object.values(fromPackage));
  const togglePackage = (pkg: PackageOption) => {
    if (activePackages.has(pkg.name)) {
      setPicked((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => fromPackage[id] !== pkg.name)));
      setFromPackage((f) => Object.fromEntries(Object.entries(f).filter(([, n]) => n !== pkg.name)));
      return;
    }
    const shares = spreadPackage(pkg, services, multipliers[size]);
    setPicked((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(shares).map(([id, p]) => [id, priceText(p)])) }));
    setFromPackage((f) => ({ ...f, ...Object.fromEntries(pkg.serviceIds.map((id) => [id, pkg.name])) }));
    setDetails((d) => {
      const next = { ...d };
      for (const id of pkg.serviceIds) {
        const s = services.find((x) => x.id === id);
        if (s && hasDetails(s.kind) && !next[id]) next[id] = defaultDetails(s);
      }
      return next;
    });
  };

  const total = useMemo(
    () => Object.values(picked).reduce((sum, p) => sum + (parseTL(p) ?? 0), 0),
    [picked]
  );
  const depositValue = parseTL(deposit) ?? 0;

  const problems = [
    !isValidPhone(customerPhone) && "Telefon",
    customerName.trim().length < 2 && "Sahip adı",
    !petName.trim() && "Hayvan adı",
    Object.keys(picked).length === 0 && "Hizmet",
    Object.values(picked).some((p) => parseTL(p) === null) && "Hizmet fiyatı",
  ].filter(Boolean) as string[];

  const submit = () => {
    if (problems.length) {
      toast.error(`Eksik: ${problems.join(", ")}`);
      return;
    }
    startSaving(async () => {
      const result = await createWorkOrder({
        petId: petChoice === NEW_PET ? undefined : petChoice,
        petName,
        breed: breed || undefined,
        color: color || undefined,
        birthYear: birthYear ? Number(birthYear) : undefined,
        size,
        temperament,
        allergies: allergies || undefined,
        vaccineDue: vaccineDue || undefined,
        customerName,
        customerPhone,
        weightKg: parseTL(weight) ?? undefined,
        items: Object.entries(picked).map(([serviceId, price]) => ({
          serviceId,
          price: parseTL(price) ?? 0,
          details: details[serviceId],
          packageName: fromPackage[serviceId],
        })),
        promisedAt: promisedDate ? `${promisedDate}T${promisedTime || "17:00"}:00+03:00` : undefined,
        stationId: stationId || undefined,
        deposit: depositValue || undefined,
        depositMethod,
        notes: notes || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDone({ id: result.id, number: result.number, trackingToken: result.trackingToken, total, petName: petName.trim() });
      window.scrollTo({ top: 0 });
    });
  };

  const reset = () => {
    setDone(null);
    setCustomerPhone("");
    setLookup("idle");
    setOwner(null);
    fillPet(null);
    setSize("SMALL");
    setCustomerName("");
    setWeight("");
    setPicked({});
    setDetails({});
    setFromPackage({});
    setPromisedDate("");
    setStationId("");
    setDeposit("");
    setNotes("");
    setTimeout(() => phoneRef.current?.focus(), 50);
  };

  if (done) {
    const link = `${window.location.origin}/t/${done.trackingToken}`;
    const message = `Merhaba ${customerName}, ${done.petName} bize emanet. Bakımının nasıl gittiğini buradan görebilirsiniz:\n${link}\n\n${businessName}`;
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 pt-10 text-center md:px-8">
        <CheckCircle2 className="mx-auto h-14 w-14 text-ready" aria-hidden="true" />
        <div>
          <h1 className="font-display text-[28px] font-bold">Kabul tamam</h1>
          <p className="mt-1 font-mono text-sm text-muted">{done.number}</p>
        </div>
        <div className="flex justify-center">
          <PetTag pet={{ name: done.petName, size }} size="md" />
        </div>
        <p className="font-display text-2xl font-bold text-accent-strong">{tl(done.total)}</p>
        <div className="space-y-2">
          {/* The check is recorded before the link goes out, so the owner sees it when they open it */}
          <Link href={`/is/${done.id}/kayit`} className={buttonStyles({ size: "lg", className: "w-full" })}>
            Kabul muayenesine geç
          </Link>
          <a
            href={`https://wa.me/${whatsappNumber(customerPhone)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Takip bağlantısını WhatsApp&apos;tan gönder
          </a>
          <Link
            href={`/is/${done.id}/yazdir`}
            target="_blank"
            className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}
          >
            <Printer className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            Kabul Fişini Yazdır (A4)
          </Link>
          <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Yeni kabul
          </Button>
          <Link href={`/is/${done.id}`} className={buttonStyles({ variant: "ghost", size: "lg", className: "w-full" })}>
            İş emrini aç
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold">Yeni kabul</h1>
        <p className="hidden text-sm text-muted sm:block">Sahibi, hayvanı ve yapılacak işler</p>
      </header>

      {/* Phone: one column. Tablet: pet on the left, services and payment on the right. Wide: three columns */}
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_340px]">
        {/* Pet and customer */}
        <section aria-label="Sahip ve hayvan" className="min-w-0 space-y-4 lg:row-span-2 2xl:row-span-1">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Sahibinin telefonu</span>
            <input
              ref={phoneRef}
              autoFocus
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onBlur={() => isValidPhone(customerPhone) && setCustomerPhone(formatPhone(customerPhone))}
              type="tel"
              inputMode="tel"
              placeholder="0532 111 22 33"
              autoComplete="off"
              className="h-[68px] w-full rounded-2xl border-2 border-line-strong bg-sunken px-4 text-center font-display text-[28px] font-bold tabular-nums text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
            />
          </label>

          <Card className="space-y-4 p-4">
            {lookup === "idle" && <p className="text-sm text-muted">Telefonu yazın; kayıtlı müşteriyse hayvanları gelir.</p>}
            {lookup === "searching" && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Aranıyor
              </p>
            )}
            {lookup === "new" && <p className="text-sm font-semibold text-accent-strong">Yeni müşteri: bilgileri girin</p>}
            {lookup === "found" && owner?.notes && <p className="text-sm text-accent-strong">{owner.notes}</p>}

            {(lookup === "found" || lookup === "new") && (
              <>
                <Field label="Sahibinin adı">
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="off" />
                </Field>

                {lookup === "found" && owner && (
                  <div className="space-y-2" role="group" aria-label="Hangi hayvan">
                    <Eyebrow>Hangi hayvan?</Eyebrow>
                    {owner.pets.map((pet) => (
                      <Chip key={pet.petId} selected={petChoice === pet.petId} onClick={() => fillPet(pet)}>
                        <span className="block font-semibold leading-tight">{pet.name}</span>
                        <span className="block text-xs opacity-75">
                          {[pet.breed, `${pet.visits}. ziyaret`].filter(Boolean).join(" · ")}
                        </span>
                      </Chip>
                    ))}
                    <Chip selected={petChoice === NEW_PET} onClick={() => fillPet(null)}>
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" aria-hidden="true" /> Yeni hayvan
                      </span>
                    </Chip>
                  </div>
                )}

                {chosen?.lastVisit && (
                  <p className="rounded-xl bg-raised p-3 text-sm">
                    <span className="font-semibold">Geçen sefer ({chosen.lastVisit.date}):</span> {chosen.lastVisit.summary}
                  </p>
                )}
                {chosen?.openOrder && (
                  <p className="flex gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {chosen.name} zaten salonda ({chosen.openOrder.number}). Yine de yeni kabul açabilirsiniz.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <Field label="Hayvanın adı">
                    <Input value={petName} onChange={(e) => setPetName(e.target.value)} autoComplete="off" maxLength={40} />
                  </Field>
                  <Field label="Irk">
                    <Input value={breed} onChange={(e) => setBreed(e.target.value)} list="breeds" autoComplete="off" />
                  </Field>
                  <Field label="Renk">
                    <Input value={color} onChange={(e) => setColor(e.target.value)} />
                  </Field>
                  <Field label="Doğum yılı">
                    <Input value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
                  </Field>
                </div>
                <datalist id="breeds">
                  {BREEDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="space-y-2">
                  <Eyebrow>Fiyat sınıfı</Eyebrow>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZE_KEYS.map((s) => (
                      <Chip key={s} selected={size === s} onClick={() => changeSize(s)}>
                        <span className="block leading-tight">{SIZES[s].label}</span>
                        <span className="block text-xs opacity-70">
                          {[SIZES[s].hint, `× ${multipliers[s].toLocaleString("tr-TR")}`].filter(Boolean).join(" · ")}
                        </span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Eyebrow>Mizaç</Eyebrow>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPERAMENTS.map((t) => (
                      <Chip key={t.value} selected={temperament === t.value} onClick={() => setTemperament(t.value)}>
                        <span className="block text-center">{t.label}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 border-t border-line pt-4">
                  <Field label="Alerji, hassasiyet">
                    <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Sahibinin söylediği" maxLength={500} />
                  </Field>
                  <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                    <Field label="Aşı bitiş tarihi">
                      <Input type="date" value={vaccineDue} onChange={(e) => setVaccineDue(e.target.value)} />
                    </Field>
                    <Field label="Kilo (kg)">
                      <Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="6,5" />
                    </Field>
                  </div>
                  {vaccineDue && new Date(`${vaccineDue}T23:59:59+03:00`) < new Date() && (
                    <p className="flex gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Aşı tarihi geçmiş görünüyor. Sahibine sorun.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* Services */}
        <section aria-label="Hizmetler" className="min-w-0">
          <Card className="flex h-full flex-col">
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-xl font-semibold">Hizmetler</h2>
              <span className="text-sm text-muted">Fiyatlar {SIZES[size].label} için</span>
            </div>
            {services.length === 0 ? (
              <p className="p-6 text-sm text-muted">
                Hizmet yok. <Link href="/hizmetler" className="text-accent-strong">Hizmet ekleyin</Link>.
              </p>
            ) : (
              <>
              {packages.length > 0 && (
                <div className="space-y-2 border-b border-line p-3">
                  <Eyebrow>Paketler</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {packages.map((p) => (
                      <Chip key={p.id} selected={activePackages.has(p.name)} onClick={() => togglePackage(p)}>
                        <span className="block leading-tight">{p.name}</span>
                        <span className="block text-xs opacity-75">{tl(Math.round(p.price * multipliers[size]))}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <ul className="space-y-1 p-2">
                {services.map((s) => {
                  const on = s.id in picked;
                  const list = listPrice(s);
                  const pkg = fromPackage[s.id];
                  return (
                    <li key={s.id} className={cn("rounded-xl", on && "bg-raised")}>
                      <button
                        type="button"
                        onClick={() => toggle(s)}
                        aria-pressed={on}
                        className="flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            on ? "bg-accent text-accent-ink" : "border-2 border-line-strong"
                          )}
                          aria-hidden="true"
                        >
                          {on && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{s.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {pkg ? `Paket: ${pkg}` : [KINDS[s.kind].label, s.description].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {!on && (
                          <span className={cn("font-display text-lg font-semibold tabular-nums", list === 0 && "text-sm text-accent-strong")}>
                            {list > 0 ? tl(list) : "Fiyat yok"}
                          </span>
                        )}
                      </button>
                      {on && (
                        <div className="flex items-center justify-end gap-2 px-3 pb-3">
                          {list > 0 && parseTL(picked[s.id]) !== list && (
                            <span className="text-xs text-muted line-through">{tl(list)}</span>
                          )}
                          <label className="flex items-center gap-1">
                            <span className="sr-only">{s.name} fiyatı</span>
                            <span className="text-muted">₺</span>
                            <Input
                              value={picked[s.id]}
                              onChange={(e) => setPicked({ ...picked, [s.id]: e.target.value })}
                              inputMode="decimal"
                              placeholder="Fiyat"
                              aria-invalid={parseTL(picked[s.id]) === null}
                              className={cn(
                                "h-11 w-32 text-right font-display text-lg font-semibold",
                                parseTL(picked[s.id]) === null && "border-danger focus:border-danger"
                              )}
                            />
                          </label>
                        </div>
                      )}
                      {on && hasDetails(s.kind) && (
                        <div className="px-3 pb-3">
                          <ItemDetailsFields
                            kind={s.kind}
                            label={s.name}
                            value={details[s.id] ?? {}}
                            onChange={(next) => setDetails({ ...details, [s.id]: next })}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </Card>
        </section>

        {/* Delivery and payment */}
        <section aria-label="Teslim ve ödeme" className="min-w-0 space-y-4">
          <Card className="space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">Teslim ve ödeme</h2>
            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
              <Field label="Teslim günü">
                <Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} />
              </Field>
              <Field label="Saat">
                <Input type="time" value={promisedTime} onChange={(e) => setPromisedTime(e.target.value)} step={900} />
              </Field>
            </div>
            <Field label="İstasyon">
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none"
              >
                <option value="">Sonra seçilecek</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kapora (₺)" hint={total > 0 ? `Kalan: ${tl(Math.max(0, total - depositValue))}` : undefined}>
              <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" placeholder="0" />
            </Field>
            {depositValue > 0 && (
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Kapora ödeme şekli">
                {METHODS.map((m) => (
                  <Chip key={m.value} selected={depositMethod === m.value} onClick={() => setDepositMethod(m.value)}>
                    <span className="block text-center">{m.label}</span>
                  </Chip>
                ))}
              </div>
            )}
            <Field label="Not">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Örn. Kulak çevresi kısa olmasın, fön sevmiyor"
                className="w-full rounded-xl border border-line bg-sunken px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
              />
            </Field>
          </Card>
        </section>
      </div>

      {/* Total and the one action, always in reach */}
      <div className="hide-on-keyboard sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-5 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-t-2xl md:border-x">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {Object.keys(picked).length} hizmet{depositValue > 0 && ` · kapora ${tl(depositValue)}`}
            </p>
            <p className="font-display text-[28px] font-bold leading-tight text-accent-strong tabular-nums">{tl(total)}</p>
          </div>
          <Button size="lg" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
            Kabulü Bitir
          </Button>
        </div>
      </div>
    </div>
  );
}
