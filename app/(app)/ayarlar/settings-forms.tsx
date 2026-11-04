"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { changePassword, updateBusiness, type SettingsState } from "./actions";

interface BusinessData {
  name: string;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  vatRate: number;
}

export function BusinessSettingsForm({
  business,
  canEdit,
}: {
  business: BusinessData;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateBusiness, {});

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-bold mb-1">İşletme Bilgileri</h2>
      <p className="text-sm text-muted mb-6">Salon unvanı, iletişim ve faturalandırma detayları</p>

      <form action={action} className="space-y-4">
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="rounded-xl bg-ready/10 px-4 py-3 text-sm text-ready">
            {state.success}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="İşletme Adı">
            <Input name="name" defaultValue={business.name} disabled={!canEdit} required />
          </Field>
          <Field label="Telefon">
            <Input name="phone" defaultValue={business.phone ?? ""} disabled={!canEdit} placeholder="0212 XXX XX XX" />
          </Field>
          <Field label="E-posta">
            <Input name="email" type="email" defaultValue={business.email ?? ""} disabled={!canEdit} />
          </Field>
          <Field label="Vergi Kimlik / TC No">
            <Input name="taxNumber" defaultValue={business.taxNumber ?? ""} disabled={!canEdit} />
          </Field>
          <Field label="İl">
            <Input name="city" defaultValue={business.city ?? ""} disabled={!canEdit} placeholder="İstanbul" />
          </Field>
          <Field label="İlçe">
            <Input name="district" defaultValue={business.district ?? ""} disabled={!canEdit} placeholder="Sarıyer" />
          </Field>
        </div>

        <Field label="Adres">
          <Input name="address" defaultValue={business.address ?? ""} disabled={!canEdit} placeholder="Sanayi Sitesi..." />
        </Field>

        <div className="max-w-xs">
          <Field label="KDV Oranı (%)">
            <Input name="vatRate" type="number" min="0" max="100" defaultValue={business.vatRate} disabled={!canEdit} />
          </Field>
        </div>

        {canEdit && (
          <div className="pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-bold mb-1">Şifre ve Güvenlik</h2>
      <p className="text-sm text-muted mb-6">Hesap giriş şifrenizi güncelleyin</p>

      <form action={action} className="space-y-4 max-w-md">
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="rounded-xl bg-ready/10 px-4 py-3 text-sm text-ready">
            {state.success}
          </p>
        )}

        <Field label="Mevcut Şifre">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>

        <Field label="Yeni Şifre">
          <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>

        <Field label="Yeni Şifre (Tekrar)">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>

        <div className="pt-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Güncelleniyor…" : "Şifreyi Değiştir"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
