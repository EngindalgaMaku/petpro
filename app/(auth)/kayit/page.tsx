"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signUp, type FormState } from "../actions";

export default function SignUpPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const f = state.fields ?? {};
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Salonunuzu kaydedin</h1>
      <p className="mt-1 text-muted">Hizmet listesi ve istasyonlar hazır gelir; fiyatları siz girersiniz.</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="İşletme adı">
          <Input name="businessName" required autoComplete="organization" defaultValue={f.businessName} />
        </Field>
        <Field label="Adınız soyadınız">
          <Input name="name" required autoComplete="name" defaultValue={f.name} />
        </Field>
        <Field label="Cep telefonu">
          <Input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="0532 111 22 33" defaultValue={f.phone} />
        </Field>
        <Field label="E-posta">
          <Input name="email" type="email" required autoComplete="email" defaultValue={f.email} />
        </Field>
        <Field label="Şifre" hint="En az 8 karakter">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffb020]" defaultChecked={f.terms === "on"} />
          <span>
            <Link href="/kullanim-sartlari" className="text-accent-strong">Kullanım şartlarını</Link> ve{" "}
            <Link href="/kvkk" className="text-accent-strong">KVKK aydınlatma metnini</Link> okudum, onaylıyorum.
          </span>
        </label>
        <p className="text-sm text-muted">Bu bir tanıtım sürümüdür. Gerçek müşteri bilgisi girmeyin. Bir hafta kullanılmayan hesaplar silinir.</p>
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Hesap açılıyor…" : "Hesabı aç"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız var mı?{" "}
        <Link href="/" className="font-semibold text-accent-strong hover:text-accent-hover">
          Giriş yapın
        </Link>
      </p>
    </>
  );
}
