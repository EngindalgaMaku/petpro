import Link from "next/link";
import { buttonStyles, Card } from "@/components/ui";

/** Placeholder for screens in the build plan that are not written yet, so the nav never 404s */
export function ComingNext({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 md:px-8">
      <h1 className="font-display text-[28px] font-bold">{title}</h1>
      <Card className="space-y-3 p-6">
        <p className="font-semibold">Bu ekran yapım aşamasında.</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <Link href="/bugun" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          Bugün&apos;e dön
        </Link>
      </Card>
    </div>
  );
}
