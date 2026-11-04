"use client";

import type { ServiceKind } from "@prisma/client";
import { Input } from "@/components/ui";
import { BODY_ZONES, CUT_STYLES, type ItemDetails } from "@/lib/service-kinds";
import { cn } from "@/lib/utils";

// The kind-specific questions under a picked service at intake: which shampoo, which cut, how
// long. The next visit shows them back. Everything is a tap; only product and length are typed.

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("min-h-11 rounded-lg px-3 text-sm", on ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-sunken")}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const toggle = (list: string[] | undefined, value: string) =>
  list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

export function hasDetails(kind: ServiceKind) {
  return ["BATH", "PARASITE", "HAIRCUT", "DEMATTING"].includes(kind);
}

export function ItemDetailsFields({
  kind,
  value,
  onChange,
  label,
}: {
  kind: ServiceKind;
  value: ItemDetails;
  onChange: (next: ItemDetails) => void;
  label: string;
}) {
  const set = (patch: Partial<ItemDetails>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
      {(kind === "BATH" || kind === "PARASITE") && (
        <label className="block space-y-1.5">
          <span className="block text-xs font-medium text-muted">{kind === "BATH" ? "Şampuan" : "Ürün"}</span>
          <Input
            value={value.product ?? ""}
            onChange={(e) => set({ product: e.target.value })}
            placeholder={kind === "BATH" ? "Örn. Hipoalerjenik şampuan" : "Örn. Pire ve kene şampuanı"}
            maxLength={80}
            aria-label={`${label} ürünü`}
            className="h-11"
          />
        </label>
      )}

      {kind === "HAIRCUT" && (
        <>
          <Row label="Kesim">
            {CUT_STYLES.map((c) => (
              <Choice key={c} on={value.style === c} onClick={() => set({ style: value.style === c ? undefined : c })}>
                {c}
              </Choice>
            ))}
          </Row>
          <label className="block space-y-1.5">
            <span className="block text-xs font-medium text-muted">Tüy uzunluğu (mm)</span>
            <Input
              value={value.lengthMm ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
                set({ lengthMm: n >= 1 && n <= 100 ? n : undefined });
              }}
              inputMode="numeric"
              placeholder="Örn. 6"
              aria-label={`${label} tüy uzunluğu`}
              className="h-11 w-28"
            />
          </label>
        </>
      )}

      {kind === "DEMATTING" && (
        <Row label="Bölgeler">
          {BODY_ZONES.map((z) => (
            <Choice key={z} on={!!value.zones?.includes(z)} onClick={() => set({ zones: toggle(value.zones, z) })}>
              {z}
            </Choice>
          ))}
        </Row>
      )}
    </div>
  );
}
