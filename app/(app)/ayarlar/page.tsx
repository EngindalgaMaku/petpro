import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, KeyRound, Sparkles, User, Users } from "lucide-react";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/session";
import { BusinessSettingsForm, PasswordChangeForm } from "./settings-forms";
import { StationsManager } from "./stations-manager";

export const metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = { OWNER: "İşletme Sahibi", MANAGER: "Yönetici", GROOMER: "Pet Kuaförü", DRIVER: "Şoför" };

export default async function SettingsPage() {
  const user = await requireUser();
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: {
      stations: { orderBy: { sortOrder: "asc" } },
      users: { select: { id: true, name: true, email: true, role: true, commissionRate: true, isActive: true } },
    },
  });

  if (!business) notFound();

  const isManager = canManage(user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted">İşletme profili, şifre ve salon yapılandırması</p>
      </header>

      {/* Hızlı Kısayol Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/hizmetler" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised/40">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-accent-strong">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">Hizmetler & Fiyatlar</p>
            <p className="text-xs text-muted">Fiyat listesi ve size çarpanları</p>
          </div>
        </Link>

        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-ink">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">{business.stations.length} İstasyon / Peron</p>
            <p className="text-xs text-muted">Salon çalışma alanları</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-ink">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">{business.users.length} Ekip Üyesi</p>
            <p className="text-xs text-muted">Kuaför ve personel kadrosu</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol 2 Sütun: İşletme Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          <BusinessSettingsForm
            canEdit={isManager}
            business={{
              name: business.name,
              phone: business.phone,
              email: business.email,
              taxNumber: business.taxNumber,
              address: business.address,
              city: business.city,
              district: business.district,
              vatRate: Number(business.vatRate),
            }}
          />

          {/* Salon İstasyonları Kartı (Dinamik Yönetim) */}
          <StationsManager stations={business.stations} canEdit={isManager} />
        </div>

        {/* Sağ Sütun: Şifre & Kullanıcı Bilgisi */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold mb-1">Oturum Bilgileri</h2>
            <p className="text-sm text-muted mb-4">Şu anki aktif profiliniz</p>
            <div className="space-y-3 rounded-xl border border-line bg-raised/40 p-3.5 text-sm">
              <div>
                <span className="text-xs text-muted block">Ad Soyad</span>
                <span className="font-medium text-ink">{user.name}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">E-posta</span>
                <span className="font-medium text-ink">{user.email}</span>
              </div>
              <div>
                <span className="text-xs text-muted block">Rol</span>
                <span className="font-medium text-accent-strong">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            </div>
          </Card>

          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
