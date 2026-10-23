"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds only, so development never serves
 * stale cached files. Service workers need a secure context (HTTPS or
 * localhost), so on a plain-HTTP LAN address this quietly does nothing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* offline support is a bonus; never break the app over it */
    });
  }, []);
  return null;
}
