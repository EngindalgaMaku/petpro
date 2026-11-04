"use client";

import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck, QrCode } from "lucide-react";
import { PetDiagram } from "@/components/pet-diagram";
import { formatTL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { printPage } from "@/lib/print";
import { CONDITION_KINDS, PART_LABELS } from "@/lib/pet-parts";

export interface PrintWorkOrderData {
  order: {
    id: string;
    number: string;
    trackingToken: string;
    createdAt: string;
    promisedAt: string | null;
    weightKg: number | null;
    notes: string | null;
    totalAmount: number;
    paid: number;
    remaining: number;
    groomerName: string | null;
    stationName: string | null;
  };
  pet: {
    name: string;
    breed: string | null;
    birthYear: number | null;
    color: string | null;
    size: string;
    temperament: string;
    allergies: string | null;
  };
  customer: {
    name: string;
    phone: string;
  };
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    taxNumber: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    packageName: string | null;
    detail: string | null;
    price: number;
  }>;
  marks: Array<{
    id: string;
    number: number;
    part: string;
    kind: string;
    note: string | null;
  }>;
  qrDataUrl: string;
  trackUrl: string;
}

export function PrintWorkOrderView({ data }: { data: PrintWorkOrderData }) {
  const { order, pet, customer, business, items, marks, qrDataUrl, trackUrl } = data;

  const handlePrint = () => printPage(`İş emri ${order.number}`);

  return (
    <div className="min-h-screen bg-ground p-4 print:bg-white print:p-0">
      {/* On-screen control bar (hidden in print) */}
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-xl border border-line bg-surface p-4 text-ink shadow-lg">
        <Link
          href={`/is/${order.id}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          İş Emrine Dön
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:inline">
            Yazdırırken &quot;Arka plan grafikleri&quot; açık olmalıdır.
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </button>
        </div>
      </div>

      {/* The Printable A4 Document Sheet */}
      <div className="mx-auto max-w-[210mm] overflow-x-auto border border-slate-300 bg-white p-3 text-slate-900 sm:p-6 print:overflow-visible print:p-0 shadow-xl print:m-0 print:max-w-none print:border-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wider text-slate-950">
              {business.name}
            </h1>
            <p className="text-xs text-slate-600">
              {[business.address, business.city].filter(Boolean).join(", ")}
              {business.phone && ` · Tel: ${formatPhone(business.phone)}`}
              {business.taxNumber && ` · VKN: ${business.taxNumber}`}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-slate-900 bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-900" />
              Kabul ve Bakım Fişi
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div className="space-y-0.5 text-xs">
              <p className="font-mono font-bold text-slate-950 text-sm">#{order.number}</p>
              <p className="text-slate-600">
                Kabul: {new Date(order.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              {order.promisedAt && (
                <p className="font-semibold text-slate-900">
                  Tahmini Teslim: {new Date(order.promisedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Takip QR" className="h-16 w-16 rounded border border-slate-300 p-0.5" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded border border-slate-300 text-slate-500">
                <QrCode className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        {/* Pet & Customer Identity Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 border border-slate-300 bg-slate-50 p-3 text-xs">
          <div>
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Müşteri Bilgileri</p>
            <p className="text-sm font-bold text-slate-950">{customer.name}</p>
            <p className="text-slate-700">{formatPhone(customer.phone)}</p>
            <p className="text-slate-600 mt-1">
              Atanan Kuaför: <strong className="text-slate-900">{order.groomerName || "Genel Ekip"}</strong>
              {order.stationName && ` · ${order.stationName}`}
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Hayvan Bilgileri</p>
            <p className="text-sm font-bold text-slate-950">{pet.name}</p>
            <p className="text-slate-600">
              {[pet.breed, pet.size, pet.color, pet.birthYear && `${pet.birthYear} doğumlu`].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-slate-700">
              Mizaç: <strong>{pet.temperament}</strong>
              {order.weightKg !== null && (
                <>
                  {" · "}
                  Kilo: <strong>{order.weightKg.toLocaleString("tr-TR")} kg</strong>
                </>
              )}
            </p>
            {pet.allergies && (
              <p className="mt-1 text-slate-700">
                Alerji: <strong>{pet.allergies}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Work Order Items / Services */}
        <div className="mt-4">
          <table className="w-full border-collapse border border-slate-300 text-left text-xs">
            <thead>
              <tr className="bg-slate-200 text-slate-900">
                <th className="border border-slate-300 px-2 py-1.5 font-bold w-8 text-center">#</th>
                <th className="border border-slate-300 px-2 py-1.5 font-bold">Yapılacak Hizmet</th>
                <th className="border border-slate-300 px-2 py-1.5 font-bold w-48">Paket / Not</th>
                <th className="border border-slate-300 px-2 py-1.5 font-bold w-28 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className="border-b border-slate-200">
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-900">{it.name}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{it.packageName || it.detail || "Standart"}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-bold text-slate-950">{formatTL(it.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-950">
                <td colSpan={3} className="border border-slate-300 px-2 py-1.5 text-right">Toplam Tutar:</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-sm">{formatTL(order.totalAmount)}</td>
              </tr>
              <tr className="text-slate-700">
                <td colSpan={3} className="border border-slate-300 px-2 py-1 text-right text-[11px]">Tahsil Edilen:</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono text-xs text-emerald-700 font-semibold">{formatTL(order.paid)}</td>
              </tr>
              <tr className="text-slate-900 font-bold bg-amber-50">
                <td colSpan={3} className="border border-slate-300 px-2 py-1 text-right text-[11px]">Kalan Bakiye:</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono text-xs text-rose-700">{formatTL(order.remaining)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order.notes && (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50/70 p-2 text-xs">
            <span className="font-bold text-amber-900">Not: </span>
            <span className="text-slate-800">{order.notes}</span>
          </div>
        )}

        {/* Intake check */}
        <div className="mt-4 border border-slate-300 p-3">
          <p className="font-bold text-slate-950 uppercase tracking-wider text-xs border-b border-slate-200 pb-1 mb-2">
            Kabul Muayenesi
          </p>

          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 items-start">
            {/* Top-down schematic diagram */}
            <div className="flex flex-col items-center">
              <PetDiagram
                marks={marks.map((m) => ({ number: m.number, part: m.part }))}
                className="w-28 drop-shadow-sm"
                theme="print"
              />
              <span className="mt-1 text-[9px] text-slate-500 text-center">Üstten görünüm, baş yukarıda</span>
            </div>

            {/* Marks and Gauge Details */}
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-slate-800 text-[11px] mb-1">
                  Kayda geçenler ({marks.length})
                </p>
                {marks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Kabul sırasında kayda geçen bir şey yok.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    {marks.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 rounded">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                          {m.number}
                        </span>
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-slate-900">{PART_LABELS[m.part] || m.part}: </span>
                          <span className="text-slate-700">{CONDITION_KINDS[m.kind as keyof typeof CONDITION_KINDS] || m.kind}</span>
                          {m.note && <span className="text-slate-500"> ({m.note})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Acceptance */}
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-2 text-[10px] leading-tight text-slate-600 space-y-1">
          <p>Yukarıda işaretlenenleri gördüm. Bu kayıt teşhis değildir; sağlıkla ilgili kararlar için veterinerinize danışın.</p>
        </div>

        {/* Dual Signature Blocks */}
        <div className="mt-4 grid grid-cols-2 gap-8 pt-2">
          <div className="border-t border-slate-900 pt-1 text-center">
            <p className="font-bold text-slate-900 text-xs">Teslim Eden (Sahibi)</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{customer.name}</p>
            <div className="mt-8 border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-500">
              İmza
            </div>
          </div>

          <div className="border-t border-slate-900 pt-1 text-center">
            <p className="font-bold text-slate-900 text-xs">Teslim Alan (Salon)</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{business.name}</p>
            <div className="mt-8 border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-500">
              Kaşe / İmza
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-500">
          <span>Takip: {trackUrl}</span>
          <span suppressHydrationWarning>Basım: {new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
        </div>
      </div>
    </div>
  );
}
