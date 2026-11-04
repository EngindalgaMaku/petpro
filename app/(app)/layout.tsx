import { Sidebar } from "@/components/sidebar";
import { planLabel, planOf, RESTRICTED_MESSAGE, upgradeLink } from "@/lib/plan";
import { requireUser } from "@/lib/session";

// Every signed-in screen: the collapsible sidebar, and room at the bottom on phones for the tab bar
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = planOf(user.business);
  return (
    <div className="min-h-dvh bg-ground lg:flex">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: user.business.name,
        }}
      />
      <main className="min-w-0 flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-10 print:p-0">
        {plan.level === "DEMO" && (
          <p role="note" data-testid="demo-notice" className="no-print border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs font-medium text-ink">
            Demo hesap: veriler her gece 03.00&apos;te sıfırlanır. Gerçek bilgi girmeyin.
          </p>
        )}
        {plan.level === "ENTRY" && (
          <p role="note" data-testid="plan-notice" className="no-print border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs font-medium text-ink">
            {planLabel.ENTRY}: bütün özellikler açık, {plan.daysLeft} gün kaldı.{" "}
            <a href={upgradeLink("PetPro", user.business.name)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Devam etmek için yazın
            </a>
          </p>
        )}
        {plan.level === "RESTRICTED" && (
          <p role="note" data-testid="plan-notice" className="no-print border-b border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm font-medium text-ink">
            {RESTRICTED_MESSAGE}{" "}
            <a href={upgradeLink("PetPro", user.business.name)} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
              WhatsApp&apos;tan yazın
            </a>
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
