// BuilderView.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BannerAPI,
  type Banner,
  type BannerElement,
  type BannerStatus,
  type ButtonElement,
  type CreateBannerInput,
  type ScreenType,
  type TextElement,
} from "@/lib/api/banners";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Layers,
  Loader2,
  Monitor,
  MousePointer,
  Move,
  PanelLeft,
  Save,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { BannerCanvas } from "./BannerCanvas";
import { ButtonPanel } from "./ButtonPanel";
import {
  CropRegion,
  Field,
  Inp,
  MobilePanel,
  SCREEN_MIN_SIZES,
  SCREEN_PRESETS,
  Sel,
  STATUS_COLORS,
  defaultBanner,
  toSlug,
} from "./Helper";
import { TextPanel } from "./TextPanel";
import { BannerPreviewModal } from "./BannerPreview";

const resolveBannerImageUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("blob:")) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = (process.env.NEXT_PUBLIC_IMAGE_URL || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

type SideTab = "layers" | "properties" | "config";

export function BuilderView({
  initialBanner,
  onBack,
  addToast,
}: {
  initialBanner: CreateBannerInput | Banner | null;
  onBack: () => void;
  addToast: (type: "success" | "error", msg: string) => void;
}) {
  const isEdit = !!(initialBanner && "_id" in initialBanner && initialBanner._id);

  const getBannerForState = (): CreateBannerInput => {
    if (!initialBanner) return defaultBanner();
    if ("_id" in initialBanner) {
      const { _id, __v, createdAt, updatedAt, createdBy, updatedBy, ...rest } = initialBanner as Banner;
      return { ...rest, backgroundImageUrl: resolveBannerImageUrl(rest.backgroundImageUrl) } as CreateBannerInput;
    }
    return initialBanner as CreateBannerInput;
  };

  const [banner, setBanner] = useState<CreateBannerInput>(getBannerForState());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>("layers");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<File | null>(null);
  const [originalBackgroundFile, setOriginalBackgroundFile] = useState<File | null>(null); // original untouched file for reposition
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);
  const [dragBgMode, setDragBgMode] = useState(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── Crop state ─────────────────────────────────────────────────────────────
  // cropPendingUrl = blob URL of the raw uploaded image shown in CropCanvas
  const [cropMode, setCropMode] = useState(false);
  const [cropPendingUrl, setCropPendingUrl] = useState<string | null>(null);
  const [cropPendingFile, setCropPendingFile] = useState<File | null>(null);
  const [cropPendingDims, setCropPendingDims] = useState<{ width: number; height: number } | null>(null);

  const initialRef = useRef(JSON.stringify(getBannerForState()));
  const isDirty = JSON.stringify(banner) !== initialRef.current;

  const handleBack = () => {
    if (isDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    onBack();
  };

  const slugEditedRef = useRef(false);
  const handleNameChange = (name: string) =>
    setBanner((b) => ({ ...b, name, ...(slugEditedRef.current ? {} : { slug: toSlug(name) }) }));
  const handleSlugChange = (slug: string) => {
    slugEditedRef.current = true;
    setBanner((b) => ({ ...b, slug: toSlug(slug) }));
  };

  const minSizes = SCREEN_MIN_SIZES[banner.screenType];
  const widthTooSmall = banner.width < minSizes.width;
  const heightTooSmall = banner.height < minSizes.height;
  const sizeInvalid = widthTooSmall || heightTooSmall;

  const handleWidthChange = (val: number) => {
    if (val < minSizes.width) {
      addToast("error", `Min width for ${banner.screenType} is ${minSizes.width}px`);
      setBanner((b) => ({ ...b, width: minSizes.width }));
      return;
    }
    setBanner((b) => ({ ...b, width: val }));
  };

  const handleHeightChange = (val: number) => {
    if (val < minSizes.height) {
      addToast("error", `Min height for ${banner.screenType} is ${minSizes.height}px`);
      setBanner((b) => ({ ...b, height: minSizes.height }));
      return;
    }
    setBanner((b) => ({ ...b, height: val }));
  };

  // ── Image upload → always show crop UI ────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = reject;
        image.src = url;
      });

      if (img.width < minSizes.width || img.height < minSizes.height) {
        addToast("error", `Image too small! Min ${minSizes.width}×${minSizes.height}px. Got ${img.width}×${img.height}px.`);
        return;
      }

      // Create a stable blob URL for the crop UI (different from preview)
      const blobUrl = URL.createObjectURL(file);
      setCropPendingUrl(blobUrl);
      setCropPendingFile(file);
      setCropPendingDims({ width: img.width, height: img.height });
      setOriginalImageDimensions({ width: img.width, height: img.height });
      setOriginalBackgroundFile(file); // store original for reposition

      // Enter crop mode — CropCanvas takes over the canvas area
      setCropMode(true);
    } catch (err: unknown) {
      addToast("error", (err as Error).message ?? "Failed to load image");
    } finally {
      setBgUploading(false);
      e.target.value = "";
    }
  };

  // Called when user clicks "Apply Crop" in CropCanvas
  // We draw the crop region onto a canvas and produce a new cropped blob.
  // This means backgroundSize/position work normally (cover/contain/etc).
  const handleCropDone = async (crop: CropRegion) => {
    if (!cropPendingUrl || !cropPendingFile || !cropPendingDims) return;
    // Snapshot these before any async ops — state may change
    const srcUrl = cropPendingUrl;
    const srcFile = cropPendingFile;
    try {
      // Load the original image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = srcUrl;
      });

      // Draw only the crop region onto a canvas
      const canvas = document.createElement("canvas");
      canvas.width = crop.w;
      canvas.height = crop.h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

      // Convert to blob
      const croppedBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.95)
      );

      // Create a new File from the cropped blob (for upload)
      const croppedFile = new File([croppedBlob], cropPendingFile!.name, { type: "image/jpeg" });
      const croppedUrl = URL.createObjectURL(croppedBlob);

      // Clean up old blob
      URL.revokeObjectURL(srcUrl);

      setSelectedBackgroundFile(croppedFile);
      setBanner((b) => ({
        ...b,
        backgroundImageUrl: croppedUrl,
        backgroundSize: "cover",       // normal cover — no tricks needed
        backgroundPosition: "center",
      }));

      setCropMode(false);
      setCropPendingUrl(null);
      setCropPendingFile(null);
      setCropPendingDims(null);
      addToast("success", "Background cropped and applied!");
    } catch (err) {
      addToast("error", "Crop failed: " + (err as Error).message);
    }
  };

  // Called when user cancels crop
  const handleCropCancel = () => {
    if (cropPendingUrl) URL.revokeObjectURL(cropPendingUrl);
    setCropMode(false);
    setCropPendingUrl(null);
    setCropPendingFile(null);
    setCropPendingDims(null);
  };

  // ── Reposition = open crop UI again with same file ────────────────────────
  const handleRepositionClick = () => {
    // Always use the original uploaded file — not the cropped one
    if (!originalBackgroundFile || !originalImageDimensions) return;
    const blobUrl = URL.createObjectURL(originalBackgroundFile);
    setCropPendingUrl(blobUrl);
    setCropPendingFile(originalBackgroundFile);
    setCropPendingDims(originalImageDimensions);
    setCropMode(true);
  };

  const handleBgPositionChange = (pos: { x: number; y: number }) => {
    setBanner((b) => ({ ...b, backgroundPosition: `${Math.round(pos.x)}px ${Math.round(pos.y)}px` }));
  };

  const handleBgDragClose = () => {
    setDragBgMode(false);
    addToast("success", "Background position updated");
  };

  // ── Elements ───────────────────────────────────────────────────────────────
  const addText = () => {
    const newEl: TextElement = {
      id: uuidv4(), type: "TEXT",
      zIndex: banner.elements.length,
      content: "New Text", positionX: 5, positionY: 5, isVisible: true,
      style: { fontSize: 32, fontWeight: "700", color: "#1e293b", borderRadius: 0 },
    };
    setBanner((b) => ({ ...b, elements: [...b.elements, newEl as BannerElement] }));
    setSelectedId(newEl.id);
    setSideTab("properties");
  };

  const addButton = () => {
    const newEl: ButtonElement = {
      id: uuidv4(), type: "BUTTON",
      zIndex: banner.elements.length,
      label: "Click Here", href: "#", isExternal: false,
      positionX: 5, positionY: 55, isVisible: true,
      style: {
        backgroundColor: "#4f46e5", textColor: "#ffffff",
        fontSize: 16, fontWeight: "600", borderRadius: 10,
        paddingTop: 12, paddingRight: 28, paddingBottom: 12, paddingLeft: 28, height: 48,
      },
    };
    setBanner((b) => ({ ...b, elements: [...b.elements, newEl as BannerElement] }));
    setSelectedId(newEl.id);
    setSideTab("properties");
  };

  const updateElement = (updated: BannerElement) =>
    setBanner((b) => ({ ...b, elements: b.elements.map((e) => (e.id === updated.id ? updated : e)) }));

  const deleteElement = (id: string) => {
    setBanner((b) => ({ ...b, elements: b.elements.filter((e) => e.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const handlePositionChange = (id: string, x: number, y: number) =>
    setBanner((b) => ({
      ...b,
      elements: b.elements.map((e) => (e.id === id ? { ...e, positionX: x, positionY: y } : e)),
    }));

  const handleScreenChange = (screen: ScreenType) => {
    const preset = SCREEN_PRESETS[screen];
    const hasCustom = banner.width !== SCREEN_PRESETS[banner.screenType].width || banner.height !== SCREEN_PRESETS[banner.screenType].height;
    if (hasCustom && !confirm(`Switch to ${screen}? Resets to ${preset.width}×${preset.height}px.`)) return;
    setBanner((b) => ({ ...b, screenType: screen, ...preset }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!banner.name.trim()) { addToast("error", "Banner name is required"); return; }
    if (!banner.slug.trim()) { addToast("error", "Slug is required"); return; }
    if (sizeInvalid) { addToast("error", `Size too small! Min ${minSizes.width}×${minSizes.height}px for ${banner.screenType}.`); return; }

    setSaving(true);
    try {
      const { backgroundImageUrl: _stripped, ...bannerData } = banner;

      // ✅ FIX: Deep-clean elements — remove undefined/NaN, ensure numbers are numbers
      const cleanElements = banner.elements.map((el) => {
        const cleanStyle: Record<string, unknown> = {};
        Object.entries(el.style ?? {}).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === "number" && isNaN(v)) return;
          cleanStyle[k] = v;
        });

        const base = {
          ...el,
          style: cleanStyle,
          positionX: Number(el.positionX) || 0,
          positionY: Number(el.positionY) || 0,
          zIndex: Number(el.zIndex) || 0,
        };

        if (el.type === "BUTTON") {
          return { ...base, href: (el as ButtonElement).href || "#" };
        }
        return base;
      });

      const cleanBannerData = { ...bannerData, elements: cleanElements };
      if (isEdit && initialBanner && "_id" in initialBanner) {
        await BannerAPI.update((initialBanner as Banner)._id, cleanBannerData, selectedBackgroundFile);
        addToast("success", "Banner updated");
        initialRef.current = JSON.stringify(banner);
      } else {
        await BannerAPI.create(cleanBannerData, selectedBackgroundFile);
        addToast("success", "Banner published");
        onBack();
      }
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const formatForDateTimeInput = (v: string | null | undefined) => {
    if (!v) return "";
    try { const d = new Date(v); if (isNaN(d.getTime())) return ""; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    catch { return ""; }
  };
  const formatDateTimeForAPI = (v: string | null): string | null => {
    if (!v) return null;
    try { const d = new Date(v.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) ? v + ":00" : v); if (!isNaN(d.getTime())) return d.toISOString(); }
    catch { return null; }
    return null;
  };

  const selectedElement = banner.elements.find((e) => e.id === selectedId) ?? null;
  const sortedLayers = [...banner.elements].sort((a, b) => b.zIndex - a.zIndex);
  const isReady = banner.name.trim() && banner.slug.trim() && !sizeInvalid;

  useEffect(() => {
    return () => { if (banner.backgroundImageUrl?.startsWith("blob:")) URL.revokeObjectURL(banner.backgroundImageUrl); };
  }, [banner.backgroundImageUrl]);

  useEffect(() => { if (selectedId) setSideTab("properties"); }, [selectedId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar content
  // ─────────────────────────────────────────────────────────────────────────
  const LayersContent = (
    <div className="p-3 space-y-2">
      <div className="flex gap-2">
        <button onClick={addText} className="flex-1 flex flex-col items-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-semibold text-slate-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50/50 transition-all">
          <Type className="h-4 w-4" /> Text
        </button>
        <button onClick={addButton} className="flex-1 flex flex-col items-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-semibold text-slate-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all">
          <MousePointer className="h-4 w-4" /> Button
        </button>
      </div>

      {banner.elements.length === 0 ? (
        <div className="text-center py-8">
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mx-auto mb-2">
            <Layers className="h-4 w-4 text-slate-300" />
          </div>
          <p className="text-xs text-slate-400">No elements yet</p>
          <p className="text-xs text-slate-300 mt-0.5">Add text or button above</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sortedLayers.map((el) => (
            <div
              key={el.id}
              onClick={() => { if (!dragBgMode) { setSelectedId(el.id === selectedId ? null : el.id); if (el.id !== selectedId) setSideTab("properties"); } }}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-all group ${el.id === selectedId ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "hover:bg-slate-50 text-slate-500"}`}
            >
              {el.type === "TEXT" ? (
                <div className="h-5 w-5 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                  <Type className="h-2.5 w-2.5 text-red-600" />
                </div>
              ) : (
                <div className="h-5 w-5 bg-sky-100 rounded flex items-center justify-center flex-shrink-0">
                  <MousePointer className="h-2.5 w-2.5 text-sky-600" />
                </div>
              )}
              <span className="flex-1 truncate font-medium">
                {el.type === "TEXT" ? (el as TextElement).content?.slice(0, 16) || "Text" : (el as ButtonElement).label || "Button"}
              </span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); if (!dragBgMode) updateElement({ ...el, zIndex: el.zIndex + 1 }); }} className="p-0.5 rounded hover:bg-slate-200 hover:text-red-600 transition-colors" title="Up">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (!dragBgMode) updateElement({ ...el, zIndex: Math.max(0, el.zIndex - 1) }); }} className="p-0.5 rounded hover:bg-slate-200 hover:text-red-600 transition-colors" title="Down">
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (!dragBgMode) updateElement({ ...el, isVisible: !el.isVisible }); }} className="p-0.5 rounded hover:bg-slate-200 transition-colors">
                  {el.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-slate-300" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (!dragBgMode) deleteElement(el.id); }} className="p-0.5 rounded hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const PropertiesContent = (
    <div className="p-3">
      {selectedElement && !dragBgMode ? (
        selectedElement.type === "TEXT" ? (
          <TextPanel el={selectedElement as TextElement} onChange={updateElement} onDelete={() => deleteElement(selectedElement.id)} />
        ) : (
          <ButtonPanel el={selectedElement as ButtonElement} onChange={updateElement} onDelete={() => deleteElement(selectedElement.id)} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="h-12 w-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center mb-3">
            <PanelLeft className="h-5 w-5 text-slate-300" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {dragBgMode ? "Exit drag mode to edit elements" : "Click an element on the canvas to edit its properties"}
          </p>
        </div>
      )}
    </div>
  );

  const ConfigContent = (
    <div className="p-3 space-y-3">
      <Field label="Name *">
        <Inp value={banner.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Summer Sale Banner" className={!banner.name.trim() ? "border-red-300 focus:ring-red-400" : ""} />
      </Field>
      {/* <Field label="Slug *">
        <Inp value={banner.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="summer-sale-banner" className={`font-mono ${!banner.slug.trim() ? "border-red-300 focus:ring-red-400" : ""}`} />
        <p className="text-[10px] text-slate-400 mt-0.5">Auto-generated · editable</p>
      </Field> */}
      <Field label="Page Route">
        <Inp value={banner.page} onChange={(e) => setBanner((b) => ({ ...b, page: e.target.value }))} placeholder="/home" />
      </Field>
      {/* <div className="grid grid-cols-2 gap-2">
        <Field label="Slot">
          <Sel value={banner.position} onChange={(e) => setBanner((b) => ({ ...b, position: e.target.value }))}>
            {["top", "hero", "sidebar", "footer", "popup"].map((p) => <option key={p}>{p}</option>)}
          </Sel>
        </Field>
        <Field label="Priority">
          <Inp type="number" value={banner.priority} onChange={(e) => setBanner((b) => ({ ...b, priority: +e.target.value }))} />
        </Field>
      </div> */}
      <Field label="Starts At">
        <Inp type="datetime-local" value={formatForDateTimeInput(banner.startsAt)} onChange={(e) => setBanner((b) => ({ ...b, startsAt: formatDateTimeForAPI(e.target.value) }))} />
      </Field>
      <Field label="Ends At">
        <Inp type="datetime-local" value={formatForDateTimeInput(banner.endsAt)} onChange={(e) => setBanner((b) => ({ ...b, endsAt: formatDateTimeForAPI(e.target.value) }))} />
      </Field>

      <div className="pt-2 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Canvas Size</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`W (min ${minSizes.width})`}>
            <Inp type="number" value={banner.width} min={minSizes.width} onChange={(e) => handleWidthChange(+e.target.value)} className={widthTooSmall ? "border-red-400 bg-red-50" : ""} />
            {widthTooSmall && <p className="text-[10px] text-red-500 mt-0.5 font-semibold">Min {minSizes.width}px</p>}
          </Field>
          <Field label={`H (min ${minSizes.height})`}>
            <Inp type="number" value={banner.height} min={minSizes.height} onChange={(e) => handleHeightChange(+e.target.value)} className={heightTooSmall ? "border-red-400 bg-red-50" : ""} />
            {heightTooSmall && <p className="text-[10px] text-red-500 mt-0.5 font-semibold">Min {minSizes.height}px</p>}
          </Field>
        </div>
      </div>

      <Field label="Description">
        <textarea className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-y min-h-[52px]" value={banner.description ?? ""} onChange={(e) => setBanner((b) => ({ ...b, description: e.target.value }))} />
      </Field>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // BG toolbar
  // ─────────────────────────────────────────────────────────────────────────
  const BgToolbar = () => (
    <div className="bg-white/90 backdrop-blur border-b border-slate-100 flex-shrink-0">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BG</span>
          <input type="color" value={banner.backgroundColor} onChange={(e) => setBanner((b) => ({ ...b, backgroundColor: e.target.value }))} className="h-6 w-6 rounded-md border border-slate-200 cursor-pointer p-0.5" />
          <Inp value={banner.backgroundColor} onChange={(e) => setBanner((b) => ({ ...b, backgroundColor: e.target.value }))} className="font-mono w-20 text-xs" />
        </div>

        <div className="h-4 w-px bg-slate-200 flex-shrink-0" />

        <label className={`flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 flex-shrink-0 ${bgUploading ? "opacity-60 pointer-events-none" : ""}`}>
          {bgUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          {bgUploading ? "Loading…" : "BG Image"}
          <input type="file" accept="image/*" className="hidden" disabled={bgUploading} onChange={handleFileChange} />
        </label>

        {banner.backgroundImageUrl && (
          <>
            {/* Reposition = crop UI dobara khulta hai */}
            <button
              onClick={handleRepositionClick}
              className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold px-2.5 py-1.5 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-slate-600 transition-all flex-shrink-0"
            >
              <Move className="h-3.5 w-3.5" />
              Reposition
            </button>

            <button
              onClick={() => {
                if (banner.backgroundImageUrl?.startsWith("blob:")) URL.revokeObjectURL(banner.backgroundImageUrl);
                setBanner((b) => ({ ...b, backgroundImageUrl: "", backgroundPosition: "center", backgroundSize: "cover" }));
                setSelectedBackgroundFile(null); setOriginalBackgroundFile(null); setOriginalImageDimensions(null);
              }}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Fit mode preview strip — sirf tab dikhao jab image set ho */}
      {/* {banner.backgroundImageUrl && (
        <div className="flex items-end gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 self-center">Fit</span>
          {["cover", "contain", "auto", "100% 100%"].map((s) => {
            const isActive = banner.backgroundSize === s;
            return (
              <button
                key={s}
                onClick={() => setBanner((b) => ({ ...b, backgroundSize: s }))}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={`rounded-lg overflow-hidden transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-red-500 ring-offset-2 shadow-lg"
                      : "ring-1 ring-slate-200 hover:ring-red-300 opacity-50 hover:opacity-90"
                  }`}
                  style={{
                    width: isActive ? 180 : 72,
                    height: isActive ? 75 : 30,
                    backgroundColor: banner.backgroundColor ?? "#f1f5f9",
                    backgroundImage: `url(${banner.backgroundImageUrl})`,
                    backgroundSize: s,
                    backgroundPosition: banner.backgroundPosition ?? "center",
                    backgroundRepeat: "no-repeat",
                    transition: "all 0.2s ease",
                  }}
                />
                <span className={`text-[10px] font-bold transition-colors ${isActive ? "text-red-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {s === "100% 100%" ? "stretch" : s}
                </span>
              </button>
            );
          })}
        </div>
      )} */}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Left sidebar (desktop)
  // ─────────────────────────────────────────────────────────────────────────
  const LeftSidebar = (
    <div className={`hidden lg:flex flex-col bg-white border-r border-slate-100 flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-10" : "w-72"}`}>
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center pt-3 gap-2">
          <button onClick={() => setSidebarCollapsed(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Expand">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="h-px w-6 bg-slate-100" />
          {(["layers", "properties", "config"] as SideTab[]).map((tab) => {
            const Icon = tab === "layers" ? Layers : tab === "properties" ? SlidersHorizontal : Settings2;
            return (
              <button key={tab} onClick={() => { setSideTab(tab); setSidebarCollapsed(false); }} className={`p-2 rounded-lg transition-colors ${sideTab === tab ? "bg-red-100 text-red-600" : "text-slate-400 hover:bg-slate-100"}`} title={tab}>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex items-center border-b border-slate-100 flex-shrink-0">
            <div className="flex flex-1">
              {(["layers", "properties", "config"] as SideTab[]).map((tab) => {
                const Icon = tab === "layers" ? Layers : tab === "properties" ? SlidersHorizontal : Settings2;
                return (
                  <button key={tab} onClick={() => setSideTab(tab)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${sideTab === tab ? "text-red-600 border-red-500 bg-red-50/50" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {tab === "properties" ? "Props" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSidebarCollapsed(true)} className="p-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" title="Collapse">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sideTab === "layers" && LayersContent}
            {sideTab === "properties" && PropertiesContent}
            {sideTab === "config" && ConfigContent}
          </div>
        </>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col relative" style={{ height: "calc(100vh - 56px)" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-3 sm:px-4 flex items-center gap-2 h-12 flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-800 transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Banners</span>
        </button>
        <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold truncate block ${banner.name ? "text-slate-900" : "text-slate-300"}`}>
            {banner.name || "Untitled"}
            {isDirty && <span className="ml-1.5 text-amber-400 text-xs">●</span>}
          </span>
        </div>

        {/* Screen switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
          {(["DESKTOP", "TABLET", "MOBILE"] as ScreenType[]).map((s) => {
            const Icon = s === "DESKTOP" ? Monitor : s === "TABLET" ? Tablet : Smartphone;
            return (
              <button key={s} onClick={() => handleScreenChange(s)} title={s} className={`p-1.5 rounded-md transition-all ${banner.screenType === s ? "bg-white text-red-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        {/* Status pills */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {(["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED"] as BannerStatus[]).map((s) => (
            <button key={s} onClick={() => setBanner((b) => ({ ...b, status: s }))} className={`px-2 py-1 rounded-xl text-[12px] font-bold transition-all ${banner.status === s ? STATUS_COLORS[s] + " ring-1 ring-inset ring-current rounded-xl" : "text-slate-400 hover:bg-slate-100"}`}>
              {s === "SCHEDULED" ? "SCHED" : s}
            </button>
          ))}
        </div>
        <div className="sm:hidden flex-shrink-0">
          <select value={banner.status || "DRAFT"} onChange={(e) => setBanner((b) => ({ ...b, status: e.target.value as BannerStatus }))} className={`text-xs font-bold rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-red-400 ${STATUS_COLORS[banner.status || "DRAFT"]}`}>
            {(["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED"] as BannerStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Preview button */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all flex-shrink-0"
          title="Preview how it looks on user panel"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || sizeInvalid}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex-shrink-0 ${isReady ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"} disabled:opacity-60`}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{saving ? "Saving…" : isEdit ? "Update" : "Publish"}</span>
        </button>
      </div>

      {/* Drag mode banner */}
      {dragBgMode && !cropMode && (
        <div className="bg-red-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span>👆 Drag mode — fine-tune background position</span>
          <button onClick={handleBgDragClose} className="ml-4 px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-bold">Done ✓</button>
        </div>
      )}

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        {/* LEFT sidebar */}
        {LeftSidebar}

        {/* Canvas */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {!cropMode && <BgToolbar />}
          <BannerCanvas
            banner={banner}
            selectedId={selectedId}
            onSelect={(id) => { if (!dragBgMode) { setSelectedId(id); if (id) setSideTab("properties"); } }}
            onPositionChange={handlePositionChange}
            onElementChange={updateElement}
            cropMode={cropMode}
            cropImageUrl={cropPendingUrl ?? undefined}
            cropImageDimensions={cropPendingDims}
            onCropDone={handleCropDone}
            onCropCancel={handleCropCancel}
            dragBgMode={dragBgMode}
            onBgPositionChange={handleBgPositionChange}
            onBgDragClose={handleBgDragClose}
            originalImageDimensions={originalImageDimensions}
          />
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col flex-1 overflow-hidden min-h-0">
        {!cropMode && <BgToolbar />}
        <div className="flex-1 overflow-hidden min-h-0">
          <BannerCanvas
            banner={banner}
            selectedId={selectedId}
            onSelect={(id) => { if (!dragBgMode) { setSelectedId(id); if (id) setMobilePanel("properties"); } }}
            onPositionChange={handlePositionChange}
            onElementChange={updateElement}
            cropMode={cropMode}
            cropImageUrl={cropPendingUrl ?? undefined}
            cropImageDimensions={cropPendingDims}
            onCropDone={handleCropDone}
            onCropCancel={handleCropCancel}
            dragBgMode={dragBgMode}
            onBgPositionChange={handleBgPositionChange}
            onBgDragClose={handleBgDragClose}
            originalImageDimensions={originalImageDimensions}
          />
        </div>
        {!cropMode && (
          <div className="bg-white border-t border-slate-100 flex items-center flex-shrink-0 z-10">
            {([{ id: "layers" as MobilePanel, label: "Layers", icon: Layers }, { id: "config" as MobilePanel, label: "Config", icon: Settings2 }, { id: "properties" as MobilePanel, label: "Props", icon: SlidersHorizontal }] as { id: MobilePanel; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => {
              const active = mobilePanel === id;
              return (
                <button key={id} onClick={() => setMobilePanel(active ? null : id)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${active ? "text-red-600" : "text-slate-400"}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && <div className="w-4 h-0.5 rounded-full bg-red-500 mt-0.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {mobilePanel !== null && !dragBgMode && !cropMode && (
        <>
          <div className="lg:hidden fixed inset-0 z-20 bg-black/20" onClick={() => setMobilePanel(null)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: "65vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <span className="text-sm font-bold text-slate-700 capitalize">{mobilePanel}</span>
              <button onClick={() => setMobilePanel(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {mobilePanel === "layers" && LayersContent}
              {mobilePanel === "config" && ConfigContent}
              {mobilePanel === "properties" && PropertiesContent}
            </div>
          </div>
        </>
      )}

      {/* ── User Preview Modal ── */}
      {showPreview && (
        <BannerPreviewModal banner={banner} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}