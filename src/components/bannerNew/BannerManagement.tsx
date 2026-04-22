/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { type Banner } from "@/lib/api/banners";
import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { BannerListView } from "./BannerListView";
import { BuilderView } from "./BuilderView";
import { View } from "./Helper";
import { Toast, ToastContainer } from "./ToastContainer";

// ── Root ──────────────────────────────────────────────────────────────────────
export default function BannerManagement() {
  const [view, setView] = useState<View>("list");
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = uuidv4();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {view === "list" ? (
        <BannerListView
          onCreateNew={() => {
            setEditingBanner(null);
            setView("builder");
          }}
          onEdit={(b) => {
            setEditingBanner(b);
            setView("builder");
          }}
          addToast={addToast}
        />
      ) : (
        <BuilderView
          initialBanner={editingBanner}
          onBack={() => {
            setEditingBanner(null);
            setView("list");
          }}
          addToast={addToast}
        />
      )}
      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    </div>
  );
}
