"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, QrCode, Search, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerDialog({ open, onOpenChange }: QRScannerDialogProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const requestRef = useRef<number | null>(null);

  // Stop camera when dialog closes
  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualInput("");
      setCameraError(null);
    }
  }, [open]);

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setIsScanning(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Kamera açılamadı. Lütfen kamera izinlerini kontrol edin veya iş emri numarasını veya hayvanın adını yazın."
      );
      stopCamera();
    }
  };

  const handleScanSuccess = (code: string) => {
    stopCamera();
    onOpenChange(false);
    toast.success(`Kod okundu: ${code}`);

    // Determine target based on scanned code shape
    const clean = code.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const url = new URL(clean);
        router.push(url.pathname);
        return;
      } catch {}
    }

    if (/^PP-/i.test(clean)) {
      router.push(`/is/no/${encodeURIComponent(clean)}`);
    } else {
      // Anything else is a pet, an owner or a phone typed by hand
      router.push(`/musteriler?q=${encodeURIComponent(clean)}`);
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (qrCode && qrCode.data) {
        handleScanSuccess(qrCode.data);
        return;
      }
    }

    requestRef.current = requestAnimationFrame(scanFrame);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanSuccess(manualInput.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-line bg-surface p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ink">
            <QrCode className="h-5 w-5 text-accent-strong" />
            İş Emri & QR Tarayıcı
          </DialogTitle>
          <DialogDescription className="text-muted">
            Kabul fişi, anahtarlık barkodu veya müşteri takip kodunu kamerayla okutun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View Area */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-sunken flex items-center justify-center">
            {/* Always in the page: the stream needs somewhere to go before it starts playing */}
            <video ref={videoRef} muted playsInline className={cameraActive ? "h-full w-full object-cover" : "hidden"} />
            <canvas ref={canvasRef} className="hidden" />
            {cameraActive ? (
              <>
                {/* Scanner Target Box */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-44 w-44 rounded-xl border-2 border-accent/80 shadow-2xl">
                    <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-accent -translate-x-1 -translate-y-1" />
                    <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-accent translate-x-1 -translate-y-1" />
                    <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-accent -translate-x-1 translate-y-1" />
                    <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-accent translate-x-1 translate-y-1" />
                    <div className="h-0.5 w-full bg-accent/90 shadow-lg shadow-accent animate-pulse mt-20" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Camera className="h-10 w-10 text-muted/60" />
                {cameraError ? (
                  <p className="text-xs text-danger flex items-center gap-1.5 max-w-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {cameraError}
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    Hızlı tarama için kamerayı başlatın.
                  </p>
                )}
                <Button
                  type="button"
                  onClick={startCamera}
                  disabled={isScanning && !cameraError}
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                >
                  {isScanning && !cameraError ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-accent-strong" />
                      Kamera Açılıyor...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Kamerayı Başlat
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-line" />
            </div>
            <span className="relative bg-surface px-2 text-xs uppercase text-muted font-medium">
              veya manuel girin
            </span>
          </div>

          {/* Manual Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="İş emri no (PP-...) veya hayvan adı"
              className="h-11 uppercase"
            />
            <Button type="submit" size="sm" className="h-11 px-4 gap-2">
              <Search className="h-4 w-4" />
              Git
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
