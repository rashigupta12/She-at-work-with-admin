/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { type ButtonElement } from "@/lib/api/banners";
import { MousePointer, Trash2 } from "lucide-react";
import { ColorRow, Field, Inp, Sel, Toggle } from "./Helper";

export function ButtonPanel({
  el,
  onChange,
  onDelete,
}: {
  el: ButtonElement;
  onChange: (u: ButtonElement) => void;
  onDelete: () => void;
}) {
  const s = el.style;
  const set = (p: Partial<typeof s>) => onChange({ ...el, style: { ...s, ...p } });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-sky-100 rounded flex items-center justify-center">
            <MousePointer className="h-3 w-3 text-sky-600" />
          </div>
          <span className="text-xs font-bold text-slate-700">Button Element</span>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Label */}
      <Field label="Label">
        <Inp
          value={el.label}
          onChange={(e) => onChange({ ...el, label: e.target.value })}
          placeholder="Click Here"
        />
      </Field>

      {/* Link */}
      <Field label="URL (href)">
        <Inp
          value={el.href}
          onChange={(e) => onChange({ ...el, href: e.target.value })}
          placeholder="https://example.com"
        />
      </Field>

      <label className="flex items-center gap-2 cursor-pointer">
        <Toggle value={el.isExternal} onChange={(v) => onChange({ ...el, isExternal: v })} />
        <span className="text-xs font-medium text-slate-500">Open in new tab</span>
      </label>

      {/* Colors */}
      <ColorRow
        label="Background Color"
        value={s.backgroundColor ?? "#4f46e5"}
        onChange={(v) => set({ backgroundColor: v })}
      />
      <ColorRow
        label="Text Color"
        value={s.textColor ?? "#ffffff"}
        onChange={(v) => set({ textColor: v })}
      />
      <ColorRow
        label="Border Color"
        value={s.borderColor ?? "#4f46e5"}
        onChange={(v) => set({ borderColor: v })}
      />

      {/* Hover colors */}
      <ColorRow
        label="Hover BG"
        value={s.hoverBackgroundColor ?? ""}
        onChange={(v) => set({ hoverBackgroundColor: v })}
      />
      <ColorRow
        label="Hover Text"
        value={s.hoverTextColor ?? ""}
        onChange={(v) => set({ hoverTextColor: v })}
      />

      {/* Typography */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Font Size (px)">
          <Inp
            type="number"
            value={s.fontSize ?? 16}
            onChange={(e) => set({ fontSize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Font Weight">
          <Sel value={s.fontWeight ?? "600"} onChange={(e) => set({ fontWeight: e.target.value })}>
            {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
              <option key={w}>{w}</option>
            ))}
          </Sel>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Transform">
          <Sel
            value={s.textTransform ?? "none"}
            onChange={(e) => set({ textTransform: e.target.value })}
          >
            {["none", "uppercase", "lowercase", "capitalize"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Letter Spacing">
          <Inp
            type="number"
            step="0.5"
            value={s.letterSpacing ?? 0}
            onChange={(e) => set({ letterSpacing: Number(e.target.value) })}
          />
        </Field>
      </div>

      {/* Border */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Border Width">
          <Inp
            type="number"
            value={s.borderWidth ?? 0}
            onChange={(e) => set({ borderWidth: Number(e.target.value) })}
          />
        </Field>
        <Field label="Border Style">
          <Sel
            value={s.borderStyle ?? "solid"}
            onChange={(e) => set({ borderStyle: e.target.value })}
          >
            {["solid", "dashed", "dotted", "none"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Radius (px)">
          <Inp
            type="number"
            value={s.borderRadius ?? 6}
            onChange={(e) => set({ borderRadius: Number(e.target.value) })}
          />
        </Field>
        <Field label="Opacity">
          <Inp
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={s.opacity ?? 1}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
          />
        </Field>
      </div>

      {/* Padding */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Padding</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Top (px)">
            <Inp
              type="number"
              value={s.paddingTop ?? 10}
              onChange={(e) => set({ paddingTop: Number(e.target.value) })}
            />
          </Field>
          <Field label="Right (px)">
            <Inp
              type="number"
              value={s.paddingRight ?? 24}
              onChange={(e) => set({ paddingRight: Number(e.target.value) })}
            />
          </Field>
          <Field label="Bottom (px)">
            <Inp
              type="number"
              value={s.paddingBottom ?? 10}
              onChange={(e) => set({ paddingBottom: Number(e.target.value) })}
            />
          </Field>
          <Field label="Left (px)">
            <Inp
              type="number"
              value={s.paddingLeft ?? 24}
              onChange={(e) => set({ paddingLeft: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      {/* Size */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Size & Position</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (px)">
            <Inp
              type="number"
              value={s.width ?? ""}
              placeholder="auto"
              onChange={(e) => set({ width: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="Height (px)">
            <Inp
              type="number"
              value={s.height ?? ""}
              placeholder="auto"
              onChange={(e) => set({ height: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="X (%)">
            <Inp
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={Number(el.positionX).toFixed(2)}
              onChange={(e) => onChange({ ...el, positionX: Number(e.target.value) })}
            />
          </Field>
          <Field label="Y (%)">
            <Inp
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={Number(el.positionY).toFixed(2)}
              onChange={(e) => onChange({ ...el, positionY: Number(e.target.value) })}
            />
          </Field>
          <Field label="Z-Index">
            <Inp
              type="number"
              value={el.zIndex}
              onChange={(e) => onChange({ ...el, zIndex: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>

      {/* Box Shadow */}
      <Field label="Box Shadow">
        <Inp
          value={s.boxShadow ?? ""}
          onChange={(e) => set({ boxShadow: e.target.value })}
          placeholder="0 4px 14px rgba(0,0,0,0.2)"
        />
      </Field>

      {/* Icon */}
      {/* <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Icon (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Icon URL">
            <Inp
              value={el.iconUrl ?? ""}
              onChange={(e) => onChange({ ...el, iconUrl: e.target.value || undefined })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Position">
            <Sel
              value={el.iconPosition ?? "left"}
              onChange={(e) => onChange({ ...el, iconPosition: e.target.value as "left" | "right" })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </Sel>
          </Field>
        </div>
      </div> */}

      {/* Aria Label */}
      <Field label="Aria Label">
        <Inp
          value={el.ariaLabel ?? ""}
          onChange={(e) => onChange({ ...el, ariaLabel: e.target.value || undefined })}
          placeholder="Accessible label"
        />
      </Field>

      {/* Visibility */}
      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <Toggle value={el.isVisible} onChange={(v) => onChange({ ...el, isVisible: v })} />
        <span className="text-xs font-medium text-slate-500">Visible</span>
      </label>
    </div>
  );
}