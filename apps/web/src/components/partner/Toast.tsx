"use client";

import { useEffect, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  return { message, show: setMessage };
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-[60] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-full border border-partner-border bg-white px-5 py-3 text-sm font-semibold text-partner-heading shadow-[0_12px_30px_-12px_rgba(30,60,70,0.25)] transition-all duration-200"
      style={{
        bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
        opacity: message ? 1 : 0,
        transform: `translate(-50%, ${message ? 0 : 16}px)`,
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
