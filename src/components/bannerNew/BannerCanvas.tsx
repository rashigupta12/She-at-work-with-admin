/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  type BannerElement,
  type ButtonElement,
  type CreateBannerInput,
  type TextElement,
} from "@/lib/api/banners";
import { Move } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CropRegion, SCREEN_MIN_SIZES } from "./Helper";

function CropCanvas({
  imageUrl, imageWidth, imageHeight, bannerWidth, bannerHeight, onDone, onCancel,
}: {
  imageUrl: string; imageWidth: number; imageHeight: number;
  bannerWidth: number; bannerHeight: number;
  onDone: (crop: CropRegion) => void | Promise<void>;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      setContainerSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const fitScale = Math.min((containerSize.w - 48) / imageWidth, (containerSize.h - 48) / imageHeight, 1);
  const dispW = imageWidth * fitScale;
  const dispH = imageHeight * fitScale;
  const cropDispW = Math.min(bannerWidth * fitScale, dispW);
  const cropDispH = Math.min(bannerHeight * fitScale, dispH);

  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setBoxPos({ x: Math.max(0, (dispW - cropDispW) / 2), y: Math.max(0, (dispH - cropDispH) / 2) });
  }, [dispW, dispH, cropDispW, cropDispH]);

  const dragging = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onBoxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { sx: e.clientX, sy: e.clientY, bx: boxPos.x, by: boxPos.y };
    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setBoxPos({
        x: clamp(dragging.current.bx + (me.clientX - dragging.current.sx), 0, dispW - cropDispW),
        y: clamp(dragging.current.by + (me.clientY - dragging.current.sy), 0, dispH - cropDispH),
      });
    };
    const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleApply = () => {
    onDone({ x: boxPos.x / fitScale, y: boxPos.y / fitScale, w: bannerWidth, h: bannerHeight });
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Crop Background</span>
          <span className="text-xs text-slate-400 hidden sm:inline">Drag the purple box to choose which region to use</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">Cancel</button>
          <button onClick={handleApply} className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all">Apply Crop ✓</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 0, padding: 24 }}>
        <div style={{ position: "relative", width: dispW, height: dispH, flexShrink: 0 }}>
          <img src={imageUrl} alt="Crop source" draggable={false} style={{ width: dispW, height: dispH, display: "block", userSelect: "none", pointerEvents: "none" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <mask id="crop-hole">
                <rect width="100%" height="100%" fill="white" />
                <rect x={boxPos.x} y={boxPos.y} width={cropDispW} height={cropDispH} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#crop-hole)" />
          </svg>
          <div onMouseDown={onBoxMouseDown} style={{ position: "absolute", left: boxPos.x, top: boxPos.y, width: cropDispW, height: cropDispH, border: "2px solid #8b5cf6", boxSizing: "border-box", cursor: "move" }}>
            {[33.33, 66.66].map((p) => (
              <React.Fragment key={p}>
                <div style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "rgba(139,92,246,0.45)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: `${p}%`, left: 0, right: 0, height: 1, background: "rgba(139,92,246,0.45)", pointerEvents: "none" }} />
              </React.Fragment>
            ))}
            {([{ top: -4, left: -4 }, { top: -4, right: -4 }, { bottom: -4, left: -4 }, { bottom: -4, right: -4 }] as React.CSSProperties[]).map((style, i) => (
              <div key={i} style={{ position: "absolute", width: 10, height: 10, background: "#8b5cf6", border: "2px solid white", borderRadius: 2, pointerEvents: "none", ...style }} />
            ))}
            <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(139,92,246,0.92)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px", pointerEvents: "none", fontFamily: "monospace", whiteSpace: "nowrap" }}>
              {bannerWidth} × {bannerHeight}px
            </div>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "rgba(255,255,255,0.45)", fontSize: 26, pointerEvents: "none", lineHeight: 1 }}>⤡</div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 text-center py-2 text-xs text-slate-500 bg-[#1a1a1a] border-t border-white/5">
        Original image: {imageWidth} × {imageHeight}px &nbsp;·&nbsp; Crop area: {bannerWidth} × {bannerHeight}px
      </div>
    </div>
  );
}

function DraggableBg({ imageUrl, containerWidth, containerHeight, imageWidth, imageHeight, position, onPositionChange, onClose }: {
  imageUrl: string; containerWidth: number; containerHeight: number;
  imageWidth: number; imageHeight: number;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onClose: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const ds = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const ratio = imageWidth / imageHeight, contR = containerWidth / containerHeight;
  let dw: number, dh: number;
  if (ratio > contR) { dh = containerHeight; dw = dh * ratio; } else { dw = containerWidth; dh = dw / ratio; }
  const maxX = Math.max(0, (dw - containerWidth) / 2);
  const maxY = Math.max(0, (dh - containerHeight) / 2);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const onDown = (e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); ds.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }; };
  const onMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !ds.current) return;
    onPositionChange({ x: clamp(ds.current.px + (e.clientX - ds.current.x), -maxX, 0), y: clamp(ds.current.py + (e.clientY - ds.current.y), -maxY, 0) });
  }, [isDragging, maxX, maxY, onPositionChange]);
  const onUp = useCallback(() => { setIsDragging(false); ds.current = null; }, []);
  useEffect(() => {
    if (isDragging) { window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, onMove, onUp]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: isDragging ? "grabbing" : "grab", backgroundColor: "#000", zIndex: 100 }} onMouseDown={onDown}>
      <img src={imageUrl} alt="" draggable={false} style={{ position: "absolute", width: dw, height: dh, left: "50%", top: "50%", transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`, pointerEvents: "none", userSelect: "none" }} />
      <div style={{ position: "absolute", inset: 0, border: "2px solid #8b5cf6", boxSizing: "border-box", pointerEvents: "none", borderRadius: "inherit" }} />
      <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", color: "white", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", gap: 12, alignItems: "center", backdropFilter: "blur(4px)", zIndex: 60 }}>
        <span>👆 Fine-tune position</span>
        <button onClick={onClose} style={{ background: "#8b5cf6", border: "none", color: "white", padding: "4px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );
}

export function BannerCanvas({
  banner, selectedId, onSelect, onPositionChange, onElementChange,
  cropMode, cropImageUrl, cropImageDimensions, onCropDone, onCropCancel,
  dragBgMode, onBgPositionChange, onBgDragClose, originalImageDimensions,
}: {
  banner: CreateBannerInput;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onElementChange: (el: BannerElement) => void;
  cropMode?: boolean;
  cropImageUrl?: string;
  cropImageDimensions?: { width: number; height: number } | null;
  onCropDone?: (crop: CropRegion) => void | Promise<void>;
  onCropCancel?: () => void;
  dragBgMode?: boolean;
  onBgPositionChange?: (pos: { x: number; y: number }) => void;
  onBgDragClose?: () => void;
  originalImageDimensions?: { width: number; height: number } | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const elementsRef = useRef(banner.elements);
  useEffect(() => { elementsRef.current = banner.elements; }, [banner.elements]);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth - 64;
      const h = containerRef.current.clientHeight - 80;
      setScale(Math.min(w / banner.width, h / banner.height, 1));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [banner.width, banner.height]);

  // ── Element drag ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent, id: string, ex: number, ey: number) => {
      if (dragBgMode || !canvasRef.current) return;
      e.preventDefault(); e.stopPropagation();
      onSelect(id);
      const rect = canvasRef.current.getBoundingClientRect();
      let lx = e.clientX, ly = e.clientY, cx = ex, cy = ey;
      let raf: number | null = null;
      const move = (me: MouseEvent) => {
        const dx = ((me.clientX - lx) / rect.width) * 100;
        const dy = ((me.clientY - ly) / rect.height) * 100;
        lx = me.clientX; ly = me.clientY;
        cx = Math.max(0, Math.min(100, cx + dx));
        cy = Math.max(0, Math.min(100, cy + dy));
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => onPositionChange(id, cx, cy));
      };
      const up = () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [onSelect, onPositionChange, dragBgMode]
  );

  // ── Resize — 8 directional handles ───────────────────────────────────────
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string, direction: string) => {
      e.preventDefault(); e.stopPropagation();
      const el = elementsRef.current.find((x) => x.id === id);
      if (!el) return;
      const domEl = canvasRef.current?.querySelector(`[data-el-id="${id}"]`) as HTMLElement | null;
      const sx = e.clientX, sy = e.clientY;
      const sw = el.type === "TEXT"
        ? ((el as TextElement).width ?? domEl?.offsetWidth ?? 120)
        : ((el as ButtonElement).style?.width ?? domEl?.offsetWidth ?? 120);
      const sh = el.type === "TEXT"
        ? ((el as TextElement).height ?? domEl?.offsetHeight ?? 40)
        : ((el as ButtonElement).style?.height ?? domEl?.offsetHeight ?? 44);
      const sp = { x: el.positionX, y: el.positionY };

      let raf: number | null = null;
      const move = (me: MouseEvent) => {
        const dx = (me.clientX - sx) / scale;
        const dy = (me.clientY - sy) / scale;

        let nw = sw, nh = sh, nx = sp.x, ny = sp.y;

        if (direction.includes("e")) nw = Math.max(20, sw + dx);
        if (direction.includes("w")) {
          nw = Math.max(20, sw - dx);
          nx = sp.x + ((sw - nw) / banner.width) * 100;
        }
        if (direction.includes("s")) nh = Math.max(16, sh + dy);
        if (direction.includes("n")) {
          nh = Math.max(16, sh - dy);
          ny = sp.y + ((sh - nh) / banner.height) * 100;
        }

        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (el.type === "TEXT") {
            onElementChange({ ...el, width: nw, height: nh, positionX: nx, positionY: ny } as BannerElement);
          } else {
            onElementChange({ ...el, positionX: nx, positionY: ny, style: { ...(el as ButtonElement).style, width: nw, height: nh } } as BannerElement);
          }
        });
      };
      const up = () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [scale, banner.width, banner.height, onElementChange]
  );

  // 8 handles: 4 corners + 4 edges
  const ResizeHandle = ({ id, color }: { id: string; color: string }) => {
    const handles: { dir: string; cursor: string; style: React.CSSProperties }[] = [
      { dir: "nw", cursor: "nw-resize", style: { top: -5, left: -5 } },
      { dir: "ne", cursor: "ne-resize", style: { top: -5, right: -5 } },
      { dir: "sw", cursor: "sw-resize", style: { bottom: -5, left: -5 } },
      { dir: "se", cursor: "se-resize", style: { bottom: -5, right: -5 } },
      { dir: "n",  cursor: "n-resize",  style: { top: -5,    left: "50%", transform: "translateX(-50%)" } },
      { dir: "s",  cursor: "s-resize",  style: { bottom: -5, left: "50%", transform: "translateX(-50%)" } },
      { dir: "w",  cursor: "w-resize",  style: { top: "50%", left: -5,    transform: "translateY(-50%)" } },
      { dir: "e",  cursor: "e-resize",  style: { top: "50%", right: -5,   transform: "translateY(-50%)" } },
    ];
    return (
      <>
        {handles.map(({ dir, cursor, style }) => (
          <div
            key={dir}
            onMouseDown={(e) => onResizeMouseDown(e, id, dir)}
            style={{
              position: "absolute",
              width: 10, height: 10,
              backgroundColor: color,
              border: "2px solid white",
              borderRadius: 2,
              cursor,
              zIndex: 9999,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              ...style,
            }}
          />
        ))}
      </>
    );
  };

  const sorted = [...banner.elements].sort((a, b) => a.zIndex - b.zIndex);
  const bgPos = getBgPosition(banner.backgroundPosition);

  if (cropMode && cropImageUrl && cropImageDimensions && onCropDone && onCropCancel) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <CropCanvas
          imageUrl={cropImageUrl}
          imageWidth={cropImageDimensions.width}
          imageHeight={cropImageDimensions.height}
          bannerWidth={banner.width}
          bannerHeight={banner.height}
          onDone={onCropDone}
          onCancel={onCropCancel}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex flex-col items-center justify-start pt-6 pb-6 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:20px_20px] px-6"
      style={{ minHeight: 0 }}
    >
      {dragBgMode && (
        <div className="mb-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
          ✋ Drag mode — fine-tune background position
        </div>
      )}

      <div style={{ width: banner.width * scale, height: banner.height * scale, flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: banner.width, height: banner.height }}>
          <div
            ref={canvasRef}
            onClick={(e) => { if (e.target === e.currentTarget && !dragBgMode) onSelect(null); }}
            style={{
              width: banner.width, height: banner.height,
              backgroundColor: banner.backgroundColor,
              position: "relative", overflow: "hidden",
              boxShadow: "0 32px 64px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)",
              borderRadius: 16,
              cursor: dragBgMode ? "grab" : "default",
            }}
          >
            {!dragBgMode && banner.backgroundImageUrl && (
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${banner.backgroundImageUrl})`,
                backgroundSize: banner.backgroundSize,
                backgroundPosition: banner.backgroundPosition,
                backgroundRepeat: "no-repeat",
                pointerEvents: "none",
              }} />
            )}

            {dragBgMode && banner.backgroundImageUrl && onBgPositionChange && onBgDragClose && (
              <DraggableBg
                imageUrl={banner.backgroundImageUrl}
                containerWidth={banner.width}
                containerHeight={banner.height}
                imageWidth={originalImageDimensions?.width ?? banner.width * 2}
                imageHeight={originalImageDimensions?.height ?? banner.height * 2}
                position={bgPos}
                onPositionChange={onBgPositionChange}
                onClose={onBgDragClose}
              />
            )}

            {!dragBgMode && sorted.map((el) => {
              if (!el.isVisible) return null;
              const isSelected = el.id === selectedId;
              const isEditing = editingId === el.id;
              const base: React.CSSProperties = {
                position: "absolute",
                left: `${el.positionX}%`,
                top: `${el.positionY}%`,
                outline: isSelected ? "2px solid #8b5cf6" : "2px solid transparent",
                outlineOffset: 3,
                userSelect: isEditing ? "text" : "none",
                zIndex: el.zIndex,
                pointerEvents: "auto",
              };

              if (el.type === "TEXT") {
                const s = (el as TextElement).style;
                return (
                  <div key={el.id} data-el-id={el.id}
                    style={{
                      ...base,
                      fontFamily: s.fontFamily,
                      fontSize: s.fontSize != null ? `${s.fontSize}px` : undefined,
                      fontWeight: s.fontWeight,
                      fontStyle: s.fontStyle,
                      lineHeight: s.lineHeight,
                      letterSpacing: s.letterSpacing != null ? `${s.letterSpacing}px` : undefined,
                      textAlign: s.textAlign as any,
                      textDecoration: s.textDecoration,
                      textTransform: s.textTransform as any,
                      color: s.color ?? "#000",
                      backgroundColor: s.backgroundColor,
                      padding: s.padding,
                      borderRadius: s.borderRadius,
                      border: s.border,
                      textShadow: s.textShadow,
                      boxShadow: s.boxShadow,
                      width: (el as TextElement).width != null ? `${(el as TextElement).width}px` : "max-content",
                      maxWidth: (el as TextElement).maxWidth != null ? `${(el as TextElement).maxWidth}px` : undefined,
                      height: (el as TextElement).height != null ? `${(el as TextElement).height}px` : undefined,
                      whiteSpace: "normal", wordBreak: "break-word",
                      cursor: isEditing ? "text" : "move", overflow: "hidden",
                    }}
                    onMouseDown={(e) => { if (isEditing) return; onMouseDown(e, el.id, el.positionX, el.positionY); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(el.id); }}
                  >
                    {isEditing ? (
                      <span contentEditable suppressContentEditableWarning autoFocus
                        onBlur={(e) => { onElementChange({ ...el, content: e.currentTarget.textContent ?? "" } as BannerElement); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Escape") (e.currentTarget as HTMLElement).blur(); e.stopPropagation(); }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ outline: "none", display: "block", minWidth: 20, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >{(el as TextElement).content}</span>
                    ) : (
                      (el as TextElement).content || <span className="opacity-30 italic text-sm">Empty text</span>
                    )}
                    {isSelected && !isEditing && <ResizeHandle id={el.id} color="#8b5cf6" />}
                  </div>
                );
              }

              if (el.type === "BUTTON") {
                const s = (el as ButtonElement).style;
                return (
                  <div key={el.id} data-el-id={el.id}
                    style={{
                      ...base,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: s.fontSize != null ? `${s.fontSize}px` : undefined,
                      fontFamily: s.fontFamily,
                      fontWeight: s.fontWeight,
                      textTransform: s.textTransform as any,
                      letterSpacing: s.letterSpacing != null ? `${s.letterSpacing}px` : undefined,
                      backgroundColor: s.backgroundColor ?? "#4f46e5",
                      color: s.textColor ?? "#fff",
                      borderRadius: s.borderRadius ?? 6,
                      borderWidth: s.borderWidth ?? 0,
                      borderColor: s.borderColor,
                      borderStyle: (s.borderStyle ?? "solid") as any,
                      paddingTop: isEditing ? 0 : (s.paddingTop ?? 10),
                      paddingRight: isEditing ? 0 : (s.paddingRight ?? 24),
                      paddingBottom: isEditing ? 0 : (s.paddingBottom ?? 10),
                      paddingLeft: isEditing ? 0 : (s.paddingLeft ?? 24),
                      boxShadow: s.boxShadow,
                      opacity: s.opacity ?? 1,
                      width: s.width != null ? `${s.width}px` : undefined,
                      height: s.height != null ? `${s.height}px` : undefined,
                      cursor: isEditing ? "text" : "move", overflow: "hidden",
                    }}
                    onMouseDown={(e) => { if (isEditing) return; onMouseDown(e, el.id, el.positionX, el.positionY); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(el.id); }}
                  >
                    {isEditing ? (
                      <span contentEditable suppressContentEditableWarning autoFocus
                        onBlur={(e) => { onElementChange({ ...el, label: e.currentTarget.textContent ?? "" } as BannerElement); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } if (e.key === "Escape") (e.currentTarget as HTMLElement).blur(); e.stopPropagation(); }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ outline: "none", display: "inline-block", minWidth: 20, whiteSpace: "nowrap", textAlign: "center", color: s.textColor ?? "#fff", padding: `${s.paddingTop ?? 10}px ${s.paddingRight ?? 24}px ${s.paddingBottom ?? 10}px ${s.paddingLeft ?? 24}px` }}
                      >{(el as ButtonElement).label}</span>
                    ) : (
                      (el as ButtonElement).label || "Button"
                    )}
                    {isSelected && !isEditing && <ResizeHandle id={el.id} color="#0ea5e9" />}
                  </div>
                );
              }
              return null;
            })}

            {/* {banner.elements.length === 0 && !dragBgMode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="h-14 w-14 rounded-2xl bg-white/60 backdrop-blur border border-slate-200 flex items-center justify-center">
                  <Move className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Add elements from the side panel</p>
              </div>
            )} */}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 text-[11px] text-slate-400 font-mono">
        <span>{banner.width} × {banner.height}px</span>
        <span className="opacity-40">·</span>
        <span>{banner.screenType}</span>
        <span className="opacity-40">·</span>
        <span>{Math.round(scale * 100)}%</span>
        {!dragBgMode && (
          <>
            <span className="opacity-40">·</span>
            <span className="font-sans text-slate-300">Drag · Dbl-click to edit · 8-handle resize</span>
          </>
        )}
      </div>
    </div>
  );
}

function getBgPosition(pos: string | undefined): { x: number; y: number } {
  if (!pos || pos === "center") return { x: 0, y: 0 };
  const m = pos.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
}