/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  type BannerStatus,
  type CreateBannerInput,
  type ScreenType
} from "@/lib/api/banners";
import {
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";


export interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}



// ── Toast ─────────────────────────────────────────────────────────────────────
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="ml-1 opacity-70 hover:opacity-100 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}