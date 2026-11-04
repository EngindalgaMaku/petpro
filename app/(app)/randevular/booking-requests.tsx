"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Globe, MessageCircle, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatPhone, whatsappNumber } from "@/lib/phone";
import { answerRequest } from "./actions";

export interface RequestRow {
  id: string;
  title: string;
  when: string;
  stationName: string | null;
  notes: string | null;
  name: string;
  phone: string;
  petName: string;
  detail: string;
}

/** Online requests waiting for an answer. After one, the owner can be told on WhatsApp */
export function BookingRequests({ requests, businessName }: { requests: RequestRow[]; businessName: string }) {
  const [told, setTold] = useState<{ phone: string; text: string; label: string } | null>(null);
  const [pending, start] = useTransition();

  if (requests.length === 0 && !told) return null;

  const answer = (r: RequestRow, approve: boolean) =>
    start(async () => {
      const result = await answerRequest(r.id, approve);
      if (result.error) return void toast.error(result.error);
      toast.success(approve ? "Randevu onaylandı" : "Talep reddedildi");
      setTold({
        phone: r.phone,
        label: r.name,
        text: approve
          ? `Merhaba ${r.name}, ${r.petName} için ${r.when} randevunuz onaylandı. Görüşmek üzere.\n\n${businessName}`
          : `Merhaba ${r.name}, ${r.petName} için ${r.when} saatini maalesef ayıramadık. Size uygun başka bir saat bulalım.\n\n${businessName}`,
      });
    });

  return (
    <section aria-label="Online talepler" data-testid="booking-requests" className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Globe className="h-5 w-5 text-accent-strong" aria-hidden="true" />
        Onay bekleyen online talepler · {requests.length}
      </h2>
      {told && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/60 p-3.5">
          <span className="text-sm">{told.label} kişisine haber verin.</span>
          <a
            href={`https://wa.me/${whatsappNumber(told.phone)}?text=${encodeURIComponent(told.text)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setTold(null)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp&apos;tan yaz
          </a>
        </Card>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {requests.map((r) => (
          <Card key={r.id} className="space-y-3 p-4" data-testid="booking-request">
            <div>
              <p className="font-display text-lg font-bold first-letter:uppercase">{r.when}</p>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted">{[r.detail, r.stationName].filter(Boolean).join(" · ")}</p>
              <p className="mt-1 text-sm">
                {r.name} ·{" "}
                <a href={`tel:${r.phone}`} className="font-medium text-accent-strong">
                  {formatPhone(r.phone)}
                </a>
              </p>
              {r.notes && <p className="mt-2 rounded-lg bg-raised px-3 py-2 text-sm">{r.notes}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={pending} onClick={() => answer(r, true)}>
                <Check className="h-4 w-4" aria-hidden="true" /> Onayla
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => answer(r, false)}>
                <X className="h-4 w-4" aria-hidden="true" /> Reddet
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
