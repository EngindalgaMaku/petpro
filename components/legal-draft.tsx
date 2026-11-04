import Link from "next/link";
import { Card } from "@/components/ui";

// The legal texts need the real data controller (person or business) before launch; until
// then the pages say plainly that they are drafts instead of showing invented details.
export function LegalDraft({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <Card className="space-y-3 p-6 text-sm leading-relaxed text-muted">
        <p className="font-semibold text-ink">Bu metin taslaktır ve yayından önce tamamlanacaktır.</p>
        <p>Veri sorumlusu: [VERİ SORUMLUSU ADI] · İletişim: [E-POSTA]</p>
        <p>
          PetPro; kabulde hayvan bilgisi, sahibinin adı ve telefonu ile muayene fotoğraflarını yalnızca
          hizmeti sunmak için işler.
        </p>
      </Card>
      <Link href="/" className="text-sm font-semibold text-accent-strong">
        Girişe dön
      </Link>
    </main>
  );
}
