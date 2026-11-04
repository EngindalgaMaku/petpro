"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Eyebrow, Field, Input } from "@/components/ui";
import { updateCustomer } from "../actions";

export function CustomerEdit(props: { id: string; name: string; phone: string; notes: string; marketingConsent: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(props.name);
  const [phone, setPhone] = useState(props.phone);
  const [notes, setNotes] = useState(props.notes);
  const [consent, setConsent] = useState(props.marketingConsent);
  const [pending, start] = useTransition();
  const dirty = name !== props.name || phone !== props.phone || notes !== props.notes || consent !== props.marketingConsent;

  return (
    <Card className="space-y-4 p-4">
      <Eyebrow>Müşteri bilgileri</Eyebrow>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" />
        </Field>
      </div>
      <Field label="Not" hint="Kabulde telefon yazılınca ekranda görünür">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Örn. Köpeği eşi teslim alır"
          className="w-full rounded-xl border border-line bg-sunken px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffb020]" />
        <span>
          Kampanya mesajı almayı kabul etti
          <span className="block text-muted">Onayın ne zaman ve nasıl alındığını kayıt altında tutun.</span>
        </span>
      </label>
      <Button
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            const r = await updateCustomer(props.id, { name, phone, notes, marketingConsent: consent });
            if (r.error) toast.error(r.error);
            else {
              toast.success("Müşteri kaydedildi");
              router.refresh();
            }
          })
        }
      >
        Kaydet
      </Button>
    </Card>
  );
}
