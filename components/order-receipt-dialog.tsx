"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { printPage } from "@/lib/print";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, Tag, Receipt, FileText, Check } from "lucide-react";
import { PetTag } from "@/components/pet-tag";
import { formatTL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export interface PrintableOrder {
  id: string;
  number: string;
  trackingToken: string;
  petName: string;
  breed: string;
  customerName: string;
  customerPhone: string;
  businessName: string;
  groomer?: string | null;
  station?: string | null;
  createdAt: string;
  promisedAt?: string | null;
  total: number;
  paid: number;
  remaining: number;
  items: Array<{ name: string; price: number; detail?: string | null }>;
  qrDataUrl?: string;
}

interface OrderReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PrintableOrder;
}

export function OrderReceiptDialog({
  open,
  onOpenChange,
  order,
}: OrderReceiptDialogProps) {
  const [activeTab, setActiveTab] = useState<"pos" | "tag" | "a4">("pos");

  const handlePrint = () => printPage(`Fiş ${order.number}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print-area max-w-xl max-h-[90dvh] bg-surface border-line p-4 sm:p-6 flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-9 text-ink">
            <span className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-accent-strong" />
              Yazdırma & Etiket Merkezi
            </span>
            <Button size="sm" onClick={handlePrint} className="ml-auto gap-2">
              <Printer className="h-4 w-4" />
              Yazdır
            </Button>
          </DialogTitle>
          <DialogDescription className="text-muted">
            Müşteri teslim fişi veya anahtarlık etiketi seçip yazdırın.
          </DialogDescription>
        </DialogHeader>

        <div className="no-print">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-sunken">
              <TabsTrigger value="pos" className="gap-1.5 text-xs sm:text-sm">
                <Receipt className="h-4 w-4" />
                80mm Termal Fiş
              </TabsTrigger>
              <TabsTrigger value="tag" className="gap-1.5 text-xs sm:text-sm">
                <Tag className="h-4 w-4" />
                Anahtarlık Etiketi
              </TabsTrigger>
              <TabsTrigger value="a4" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                A4 İş Emri
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Printable Preview Container */}
        <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-xl bg-sunken border border-line flex justify-center">
          {activeTab === "pos" && (
            <div className="w-[300px] bg-white text-black p-5 rounded shadow-lg text-xs font-mono space-y-3 leading-relaxed print:w-full print:shadow-none print:p-0">
              <div className="text-center border-b border-dashed border-gray-400 pb-3">
                <h2 className="font-bold text-base tracking-wider uppercase">{order.businessName}</h2>
                <p className="text-[10px] text-gray-600">ARAÇ KABUL FİŞİ</p>
                <p className="text-[11px] font-semibold mt-1">{order.number}</p>
                <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString("tr-TR")}</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-gray-400 pb-3">
                <div className="flex justify-between font-bold text-sm">
                  <span>HAYVAN:</span>
                  <span>{order.petName}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>ARAÇ:</span>
                  <span className="truncate max-w-[170px]">{order.breed}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>MÜŞTERİ:</span>
                  <span>{order.customerName}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>TEL:</span>
                  <span>{formatPhone(order.customerPhone)}</span>
                </div>
                {order.promisedAt && (
                  <div className="flex justify-between text-gray-900 font-bold mt-1">
                    <span>TESLİM SÖZÜ:</span>
                    <span>{new Date(order.promisedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-gray-400 pb-3 space-y-1.5">
                <div className="font-bold border-b border-gray-200 pb-1 flex justify-between text-[11px]">
                  <span>HİZMET / İŞLEM</span>
                  <span>TUTAR</span>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <span className="font-semibold">{formatTL(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Remaining */}
              <div className="space-y-1 border-b border-dashed border-gray-400 pb-3">
                <div className="flex justify-between text-sm">
                  <span>TOPLAM:</span>
                  <span className="font-bold">{formatTL(order.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>TAHSİLAT:</span>
                  <span>{formatTL(order.paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-black pt-1 border-t border-gray-200">
                  <span>KALAN BAKİYE:</span>
                  <span>{formatTL(order.remaining)}</span>
                </div>
              </div>

              {/* QR and footer */}
              <div className="text-center pt-1 space-y-2">
                {order.qrDataUrl && (
                  <img
                    src={order.qrDataUrl}
                    alt="Canlı Takip QR"
                    className="w-24 h-24 mx-auto border border-gray-300 p-1 rounded"
                  />
                )}
                <p className="text-[10px] text-gray-600 font-sans">
                  Bakımın nasıl gittiğini görmek için QR kodu okutun.
                </p>
                <p className="text-[9px] text-gray-500 font-sans">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
              </div>
            </div>
          )}

          {activeTab === "tag" && (
            <div className="w-[280px] bg-white text-black p-4 rounded shadow-lg text-center space-y-3 font-sans border border-gray-300">
              <div className="border-2 border-black rounded-lg p-2 bg-yellow-100/50">
                <p className="text-[10px] uppercase font-bold text-gray-600">ARAÇ ANAHTARLIK ETİKETİ</p>
                <div className="mt-1 mb-1">
                  <PetTag pet={{ name: order.petName }} size="md" />
                </div>
                <p className="text-xs font-bold text-gray-900 truncate">{order.breed}</p>
              </div>

              <div className="text-left text-xs space-y-1 font-mono border-t border-b border-gray-300 py-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">İŞ EMRİ:</span>
                  <span className="font-bold">{order.number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">MÜŞTERİ:</span>
                  <span className="font-semibold truncate max-w-[140px]">{order.customerName}</span>
                </div>
                {order.groomer && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">SORUMLU:</span>
                    <span>{order.groomer}</span>
                  </div>
                )}
              </div>

              {order.qrDataUrl && (
                <div>
                  <img
                    src={order.qrDataUrl}
                    alt="QR"
                    className="w-20 h-20 mx-auto"
                  />
                  <p className="text-[9px] font-mono mt-1 text-gray-600">PP-TAG-SCAN</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "a4" && (
            <div className="w-full bg-white text-black p-6 rounded shadow-lg text-xs space-y-4 font-sans max-w-lg">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h3 className="font-bold text-base uppercase">{order.businessName}</h3>
                  <p className="text-xs text-gray-500">Kabul ve Bakım Fişi</p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono">{order.number}</p>
                  <p className="text-gray-500 text-[11px]">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border">
                <div>
                  <p className="text-[11px] font-bold text-gray-500">ARAÇ</p>
                  <p className="font-bold text-sm">{order.petName}</p>
                  <p className="text-gray-700">{order.breed}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-500">MÜŞTERİ</p>
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-gray-700">{formatPhone(order.customerPhone)}</p>
                </div>
              </div>

              <div>
                <p className="font-bold mb-1.5">Yapılacak İşlemler</p>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="p-2">Hizmet Adı</th>
                        <th className="p-2 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((i, idx) => (
                        <tr key={idx} className="border-b last:border-none">
                          <td className="p-2">
                            <span className="font-medium">{i.name}</span>
                            {i.detail && <span className="block text-[10px] text-gray-500">{i.detail}</span>}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">{formatTL(i.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                <span>Toplam Tutar:</span>
                <span className="text-base font-bold font-mono">{formatTL(order.total)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
