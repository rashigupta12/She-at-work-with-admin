// Helper.ts
import React from "react";
import { BannerStatus, CreateBannerInput, ScreenType } from "@/lib/api/banners";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Inp({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all placeholder:text-slate-300 ${className}`}
      {...props}
    />
  );
}

export function Sel({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`h-5 w-9 rounded-full relative cursor-pointer flex-shrink-0 transition-colors duration-200 ${
        value ? "bg-violet-500" : "bg-slate-200"
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded-md border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
        />
        <Inp
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </Field>
  );
}

export type View = "list" | "builder";
export type MobilePanel = "layers" | "config" | "properties";

export const SCREEN_MIN_SIZES: Record<ScreenType, { width: number; height: number }> = {
  DESKTOP: { width: 1920, height: 750 },
  TABLET: { width: 1024, height: 480 },
  MOBILE: { width: 1080 , height: 1600 },
};

export const SCREEN_PRESETS: Record<ScreenType, { width: number; height: number }> = {
  DESKTOP: { width: 1920, height: 750 },
  TABLET: { width: 1024, height: 480 },
  MOBILE: { width: 1080 , height: 1600 },
};

export const STATUS_COLORS: Record<BannerStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-red-100 text-red-600",
  SCHEDULED: "bg-amber-100 text-amber-700",
};

export const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export const defaultBanner = (): CreateBannerInput => ({
  name: "",
  slug: "",
  description: "",
  screenType: "DESKTOP",
  page: "/blogs",
  position: "top",
  width: 3156,
  height: 750,
  backgroundColor: "#f1f5f9",
  backgroundImageUrl: "",
  backgroundImageAlt: "",
  backgroundSize: "cover",
  backgroundPosition: "center",
  elements: [],
  status: "DRAFT",
  startsAt: null,
  endsAt: null,
  priority: 0,
});

export type CropRegion = { x: number; y: number; w: number; h: number };