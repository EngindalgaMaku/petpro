"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonStyles } from "@/components/ui";
import { closeReminder } from "../is/actions";

/** Sending the WhatsApp message also takes the reminder off the list */
export function ReminderActions({ id, href }: { id: string; href: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const close = (status: "SENT" | "DISMISSED") =>
    start(async () => {
      const r = await closeReminder(id, status);
      if (r.error) toast.error(r.error);
      else router.refresh();
    });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <a href={href} target="_blank" rel="noreferrer" onClick={() => close("SENT")} className={buttonStyles({ size: "sm" })}>
        WhatsApp gönder
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Bu hatırlatmayı listeden kaldırmak istediğinize emin misiniz?")) {
            close("DISMISSED");
          }
        }}
        className={buttonStyles({ size: "sm", variant: "secondary" })}
      >
        Listeden çıkar
      </button>
    </div>
  );
}
