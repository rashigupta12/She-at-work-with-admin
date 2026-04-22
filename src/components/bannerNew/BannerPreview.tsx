/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  type CreateBannerInput,
  type TextElement,
  type ButtonElement,
  type ScreenType,
} from "@/lib/api/banners";
import { X } from "lucide-react";
import React from "react";

// Preview widths matching real device breakpoints
const PREVIEW_WIDTHS: Record<ScreenType, number> = {
  DESKTOP: 1280,
  TABLET: 768,
  MOBILE: 375,
};

export function BannerPreviewModal({
  banner,
  onClose,
}: {
  banner: CreateBannerInput;
  onClose: () => void;
}) {
  // Use the banner's own screenType — no switcher needed
  const screenType: ScreenType = banner.screenType ?? "DESKTOP";
  const previewW = PREVIEW_WIDTHS[screenType];

  const nativeW = banner.width || 1920;
  const nativeH = banner.height || 750;
  const previewScale = previewW / nativeW;
  const previewH = nativeH * previewScale;

  const sorted = [...banner.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">User Preview</span>
          <span className="text-xs text-slate-400">
            {screenType} · {previewW}px wide · {Math.round(previewScale * 100)}% of {nativeW}×{nativeH}px
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-start p-8 bg-[#0a0a0a]">
        {/* Browser mockup */}
        <div
          className="bg-white rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
          style={{ width: previewW, maxWidth: "calc(100vw - 64px)" }}
        >
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f0f0] border-b border-slate-200 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono mx-2 truncate">
              yourwebsite.com
            </div>
          </div>

          {/* Banner — transform scale: all px values render at native size, scaled down */}
          <div style={{ position: "relative", width: "100%", height: previewH, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: 0, left: 0,
                width: nativeW,
                height: nativeH,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                backgroundColor: banner.backgroundColor ?? "#f1f5f9",
                ...(banner.backgroundImageUrl ? {
                  backgroundImage: `url(${banner.backgroundImageUrl})`,
                  backgroundSize: banner.backgroundSize ?? "cover",
                  backgroundPosition: banner.backgroundPosition ?? "center",
                  backgroundRepeat: "no-repeat",
                } : {}),
              }}
            >
              {sorted.map((el) => {
                if (!el.isVisible) return null;

                const base: React.CSSProperties = {
                  position: "absolute",
                  left: `${el.positionX}%`,
                  top: `${el.positionY}%`,
                  zIndex: 10 + el.zIndex,
                };

                if (el.type === "TEXT") {
                  const s = (el as TextElement).style;
                  return (
                    <div key={el.id} style={{
                      ...base,
                      fontSize: s.fontSize != null ? `${s.fontSize}px` : "16px",
                      fontFamily: s.fontFamily,
                      fontWeight: s.fontWeight,
                      fontStyle: s.fontStyle,
                      lineHeight: s.lineHeight,
                      letterSpacing: s.letterSpacing != null
                        ? typeof s.letterSpacing === "number" ? `${s.letterSpacing}px` : s.letterSpacing
                        : undefined,
                      color: s.color,
                      backgroundColor: s.backgroundColor,
                      padding: s.padding,
                      borderRadius: s.borderRadius,
                      border: s.border,
                      textAlign: s.textAlign as any,
                      textTransform: s.textTransform as any,
                      textDecoration: s.textDecoration,
                      textShadow: s.textShadow,
                      boxShadow: s.boxShadow,
                      width: (el as TextElement).width != null ? `${(el as TextElement).width}px` : "max-content",
                      maxWidth: (el as TextElement).maxWidth != null ? `${(el as TextElement).maxWidth}px` : undefined,
                      height: (el as TextElement).height != null ? `${(el as TextElement).height}px` : "auto",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      overflow: "hidden",
                    }}>
                      {(el as TextElement).content}
                    </div>
                  );
                }

                if (el.type === "BUTTON") {
                  const s = (el as ButtonElement).style;
                  return (
                    <div key={el.id} style={{
                      ...base,
                      fontSize: s.fontSize != null ? `${s.fontSize}px` : "14px",
                      fontFamily: s.fontFamily,
                      fontWeight: s.fontWeight,
                      letterSpacing: s.letterSpacing != null
                        ? typeof s.letterSpacing === "number" ? `${s.letterSpacing}px` : s.letterSpacing
                        : undefined,
                      textTransform: s.textTransform as any,
                      backgroundColor: s.backgroundColor,
                      color: s.textColor,
                      borderRadius: s.borderRadius != null ? `${s.borderRadius}px` : undefined,
                      paddingTop: s.paddingTop != null ? `${s.paddingTop}px` : "10px",
                      paddingRight: s.paddingRight != null ? `${s.paddingRight}px` : "24px",
                      paddingBottom: s.paddingBottom != null ? `${s.paddingBottom}px` : "10px",
                      paddingLeft: s.paddingLeft != null ? `${s.paddingLeft}px` : "24px",
                      width: s.width != null ? `${s.width}px` : "auto",
                      height: s.height != null ? `${s.height}px` : "auto",
                      borderWidth: s.borderWidth != null ? `${s.borderWidth}px` : undefined,
                      borderColor: s.borderColor,
                      borderStyle: (s.borderStyle ?? (s.borderWidth ? "solid" : undefined)) as any,
                      boxShadow: s.boxShadow,
                      opacity: s.opacity ?? 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}>
                      {(el as ButtonElement).label}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}