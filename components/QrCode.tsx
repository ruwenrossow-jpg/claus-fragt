"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR-Code als Bild (PNG-Data-URL). Farbe: InnoNord-Navy auf Weiß. */
export function useQrDataUrl(text: string, size = 1024): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: "#272a87", light: "#ffffff" } }).then(setUrl, () => setUrl(null));
  }, [text, size]);
  return url;
}

export function QrCode({ text, size = 220, className }: { text: string; size?: number; className?: string }) {
  const url = useQrDataUrl(text);
  return url ? <img src={url} width={size} height={size} alt={`QR-Code: ${text}`} className={className} /> : <div style={{ width: size, height: size }} />;
}
