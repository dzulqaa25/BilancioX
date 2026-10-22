"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (hanya di production) agar aplikasi bisa dibuka saat offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* abaikan: aplikasi tetap berjalan tanpa SW */
    });
  }, []);
  return null;
}
