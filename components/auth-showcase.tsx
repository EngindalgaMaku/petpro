"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Link2, PawPrint, Tags } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { PetTag } from "@/components/pet-tag";
import { cn } from "@/lib/utils";

// The left half of the sign-in page on wide screens: what PetPro does, each slide drawn with
// the app's own components (pet tag, cards) rather than screenshots, so it never goes stale.

function IntakePreview() {
  const rows = [
    { name: "Yıkama ve kurutma", price: "₺600", on: true },
    { name: "Komple tıraş · makas kesimi", price: "₺900", on: true },
    { name: "Tırnak kesimi", price: "₺150", on: false },
    { name: "Kulak temizliği", price: "₺150", on: false },
  ];
  return (
    <div className="space-y-3">
      <PetTag pet={{ name: "Pamuk" }} size="lg" className="w-full justify-center" />
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="font-display text-lg font-semibold">Maltese Terrier · Küçük köpek</p>
        <p className="text-sm text-muted">Geçen sefer: makas kesimi, 6 mm · 4. ziyaret</p>
      </div>
      <ul className="space-y-1.5 rounded-card border border-line bg-surface p-2">
        {rows.map((r) => (
          <li key={r.name} className={cn("flex items-center gap-3 rounded-lg px-3 py-2", r.on && "bg-raised")}>
            <span className={cn("h-5 w-5 rounded-md", r.on ? "bg-accent" : "border-2 border-line-strong")} aria-hidden="true" />
            <span className="flex-1 text-sm">{r.name}</span>
            <span className="font-display font-semibold tabular-nums">{r.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoardPreview() {
  const cols = [
    { title: "Yıkama", pets: [["Zeytin", "Hipoalerjenik şampuan", "20 dk", true]] },
    { title: "Bakım", pets: [["Pamuk", "Makas kesimi", "15.30", false], ["Paşa", "Keçe açma", "1 sa", false]] },
    { title: "Hazır", pets: [["Duman", "Haber verildi", "Hazır", false]] },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2">
      {cols.map((c) => (
        <div key={c.title} className="space-y-2 rounded-card bg-sunken p-2">
          <p className="px-1 font-display text-sm font-semibold">{c.title}</p>
          {c.pets.map(([name, work, time, late]) => (
            <div key={name} className="space-y-1.5 rounded-xl border border-line bg-surface p-2">
              <PetTag pet={{ name }} size="xs" />
              <p className="truncate text-xs text-muted">{work}</p>
              <p className={cn("text-xs font-semibold", late ? "text-danger" : c.title === "Hazır" ? "text-ready" : "text-ink")}>{time}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TrackingPreview() {
  return (
    <div className="mx-auto w-[260px] rounded-[28px] border-[6px] border-raised bg-ground p-4">
      <p className="font-display text-sm font-bold">Pati Kuaför</p>
      <div className="mt-3 space-y-3 rounded-card border border-line bg-surface p-3">
        <PetTag pet={{ name: "Pamuk" }} size="sm" />
        <div>
          <p className="text-xs text-muted">Pamuk şu anda</p>
          <p className="font-display text-xl font-bold text-accent-strong">Bakımda</p>
          <p className="text-xs">Tahmini teslim: 15.30</p>
        </div>
        <div className="grid grid-cols-5 gap-1" aria-hidden="true">
          {[1, 1, 1, 0, 0].map((on, i) => (
            <span key={i} className={cn("h-1.5 rounded-full", on ? "bg-accent" : "bg-line")} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between rounded-card border border-line bg-surface p-3 text-sm">
        <span>Kalan</span>
        <span className="font-display font-bold">₺1.500</span>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    badge: "Kabul",
    title: "Telefonu yazın; sahibi, hayvanı ve geçen seferki kesim gelsin",
    text: "Kayıtlı müşteride hayvanın ırkı, mizacı, alerjisi ve son bakımı ekrana düşer. Fiyatlar boya göre hesaplanır, kabulde konuşulan fiyat da yazılır.",
    preview: IntakePreview,
  },
  {
    badge: "Salon panosu",
    title: "Kim yıkamada, kim masada, kim hazır",
    text: "Yıkamadan son kontrole kadar her hayvan bir kart. Kuaför ve istasyon üzerinde yazar; geciken iş kırmızıyla görünür.",
    preview: BoardPreview,
  },
  {
    badge: "Sahibine bağlantı",
    title: "“Ne zaman gelip alayım?” telefonları azalsın",
    text: "Sahibine WhatsApp ile bir bağlantı gider; üye olmadan hangi aşamada olduğunu, yapılan işleri ve kalan tutarı görür.",
    preview: TrackingPreview,
  },
] as const;

export const FEATURES = [
  { icon: PawPrint, title: "Hayvan kartı", text: "Irk, mizaç, alerji, geçmiş" },
  { icon: Tags, title: "Boya göre fiyat", text: "Kediden dev köpeğe" },
  { icon: Link2, title: "Takip bağlantısı", text: "Üyeliksiz, WhatsApp'tan" },
  { icon: BellRing, title: "Tıraş hatırlatma", text: "Zamanı gelen müşteriler" },
];

export function AuthShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[active];
  const Preview = slide.preview;

  return (
    <section
      aria-label="PetPro tanıtımı"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative flex min-h-dvh flex-col justify-between overflow-hidden border-r border-line bg-sunken p-10 xl:p-14"
    >
      <div className="flex items-center justify-between">
        <BrandMark />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted">
          <CalendarClock className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
          Pet kuaförleri için
        </span>
      </div>

      <div className="my-auto grid grid-cols-12 items-center gap-10 py-10">
        <div className="col-span-6 space-y-5" aria-live="polite">
          <span className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-strong">{slide.badge}</span>
          <h2 className="font-display text-[34px] font-bold leading-tight xl:text-[40px]">{slide.title}</h2>
          <p className="leading-relaxed text-muted">{slide.text}</p>
          <div className="flex gap-2 pt-1" role="tablist" aria-label="Tanıtım">
            {SLIDES.map((s, i) => (
              <button
                key={s.badge}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={s.badge}
                onClick={() => setActive(i)}
                className="flex h-11 items-center"
              >
                <span className={cn("block h-2 rounded-full transition-all", i === active ? "w-8 bg-accent" : "w-2.5 bg-line-strong hover:bg-muted")} />
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-6" aria-hidden="true">
          <div key={active} className="animate-[fade_0.35s_ease-out]">
            <Preview />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <ul className="grid grid-cols-4 gap-3 border-t border-line pt-6">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised text-accent-strong">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">© {new Date().getFullYear()} PetPro</p>
      </div>
    </section>
  );
}

/** Phones and portrait tablets have no showcase panel: the four points sit under the form */
export function AuthFeatures() {
  return (
    <section aria-label="PetPro ile" className="mt-10 space-y-4 border-t border-line pt-8 lg:hidden">
      <h2 className="font-display text-lg font-semibold">PetPro ile salonunuz</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-card border border-line bg-surface p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised text-accent-strong">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
