"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, ImageIcon, Link2, Loader2, UploadCloud, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ImageUploadModalProps {
  onClose: () => void;
  onInsert: (url: string, alt?: string, caption?: string) => void;
}

type Tab = "upload" | "url";
type UploadState = "idle" | "signing" | "uploading" | "done" | "error";

export default function ImageUploadModal({ onClose, onInsert }: ImageUploadModalProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewSize, setPreviewSize] = useState("");
  const [previewName, setPreviewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, GIF, WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    setPreviewSize(sizeMB > 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`);
    setPreviewName(file.name);
    setError(null);
    setProgress(0);
    setState("signing");

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    if (!altText) {
      setAltText(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }

    try {
      const signRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "editor-images" }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();

      setState("uploading");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      const data = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      setImageUrl(data.secure_url);
      setState("done");
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setState("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setImageUrl("");
    setPreviewName("");
    setPreviewSize("");
    setState("idle");
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsert = () => {
    if (!imageUrl) return;
    onInsert(imageUrl, altText, caption);
    onClose();
  };

  const isLoading = state === "signing" || state === "uploading";
  const hasImage = !!imageUrl && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-[460px] border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">Insert image</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 pb-0">
          {([["upload", "Upload file"], ["url", "Paste URL"]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                tab === t
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t === "upload" ? <UploadCloud className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Upload tab */}
          {tab === "upload" && (
            <div>
              {state === "idle" || state === "error" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[0.99]"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors",
                    isDragging ? "bg-primary/15" : "bg-muted"
                  )}>
                    <UploadCloud className={cn("h-6 w-6 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isDragging ? "Drop it here!" : "Drop image here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP · max 10 MB</p>
                </div>
              ) : null}

              {/* Uploading state */}
              {isLoading && (
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{previewName}</p>
                      <p className="text-xs text-muted-foreground">
                        {state === "signing" ? "Preparing upload…" : `Uploading ${progress}%`}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${state === "signing" ? 8 : progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Done / preview */}
              {state === "done" && imageUrl && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="w-full max-h-36 object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[11px] px-2 py-1 rounded-md">
                      <CheckCircle2 className="h-3 w-3" />
                      {previewSize}
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
              />
            </div>
          )}

          {/* URL tab */}
          {tab === "url" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Image URL</label>
                <input
                  autoFocus
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {imageUrl && imageUrl.startsWith("http") && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-36 object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <X className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Alt text & caption — always visible */}
          <div className="space-y-3 pt-1 border-t border-border">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Alt text
                <span className="text-muted-foreground font-normal ml-1.5">for accessibility</span>
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for screen readers…"
                className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Caption
                <span className="text-muted-foreground font-normal ml-1.5">optional</span>
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Photo: Jane Smith / Unsplash"
                className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!hasImage}
            className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert image
          </button>
        </div>
      </div>
    </div>
  );
}