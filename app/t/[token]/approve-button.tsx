"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { approveInspection } from "./actions";

export function ApproveButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await approveInspection(token);
          if (r.error) alert(r.error);
          router.refresh();
        })
      }
    >
      Kaydı onaylıyorum
    </Button>
  );
}
