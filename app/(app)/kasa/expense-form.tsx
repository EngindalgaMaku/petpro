"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Eyebrow, Field, Input } from "@/components/ui";
import { EXPENSE_CATEGORIES, METHOD_LABELS } from "@/lib/expenses";
import { addExpense, deleteExpense } from "./actions";

const selectCls = "h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none";

export function ExpenseForm({ today }: { today: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("CASH");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card className="space-y-4 p-4">
      <Eyebrow>Gider ekle</Eyebrow>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addExpense({ amount, category, method, date, description });
            if (r.error) toast.error(r.error);
            else {
              toast.success("Gider kaydedildi");
              setAmount("");
              setDescription("");
              router.refresh();
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tutar (₺)">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" name="amount" />
          </Field>
          <Field label="Gider türü">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} name="category">
              <option value="">Seçin</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ödeme şekli">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls} name="method">
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tarih">
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} name="date" />
          </Field>
        </div>
        <Field label="Açıklama">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="Örn. 5 lt şampuan" name="description" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          Kaydet
        </Button>
      </form>
    </Card>
  );
}

export function DeleteExpense({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Gideri sil"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu gider silinsin mi?")) return;
        start(async () => {
          const r = await deleteExpense(id);
          if (r.error) toast.error(r.error);
          else {
            toast.success("Gider silindi");
            router.refresh();
          }
        });
      }}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-raised hover:text-danger"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
