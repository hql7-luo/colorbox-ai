"use client";

import { useEffect } from "react";

export function PrintAuto({ enabled, label }: { enabled: boolean; label: string }) {
  useEffect(() => {
    if (enabled) setTimeout(() => window.print(), 250);
  }, [enabled]);
  return (
    <button className="btn-primary no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
