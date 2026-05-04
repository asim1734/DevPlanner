"use client";

import { useEffect } from "react";
import { sendClientLog } from "@/lib/logger";

export default function ClientLogger() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      sendClientLog("error", event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      sendClientLog("error", "Unhandled promise rejection", { reason: event.reason });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
