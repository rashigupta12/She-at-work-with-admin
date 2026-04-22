/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { type TextElement } from "@/lib/api/banners";
import { Trash2, Type } from "lucide-react";
import { ColorRow, Field, Inp, Sel, Toggle } from "./Helper";

export function TextPanel({
  el,
  onChange,
  onDelete,
}: {
  el: TextElement;
  onChange: (u: TextElement) => void;
  onDelete: () => void;
}) {
  const s = el.style;
  const set = (p: Partial<typeof s>) => onChange({ ...el, style: { ...s, ...p } });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-violet-100 rounded flex items-center justify-center">
            <Type className="h-3 w-3 text-violet-600" />
          </div>
          <span className="text-xs font-bold text-slate-700">Text Element</span>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <Field label="Content">
        <textarea
          className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y min-h-[52px]"
          value={el.content}
          onChange={(e) => onChange({ ...el, content: e.target.value })}
        />
      </Field>

      {/* Font */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size (px)">
          <Inp
            type="number"
            value={s.fontSize ?? 16}
            onChange={(e) => set({ fontSize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Weight">
          <Sel value={s.fontWeight ?? "400"} onChange={(e) => set({ fontWeight: e.target.value })}>
            {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
              <option key={w}>{w}</option>
            ))}
          </Sel>
        </Field>
      </div>

      {/* Colors */}
      <ColorRow label="Text Color" value={s.color ?? "#000000"} onChange={(v) => set({ color: v })} />
      <ColorRow
        label="Background"
        value={s.backgroundColor ?? "#ffffff"}
        onChange={(v) => set({ backgroundColor: v })}
      />

      {/* Text style */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Align">
          <Sel value={s.textAlign ?? "left"} onChange={(e) => set({ textAlign: e.target.value })}>
            {["left", "center", "right", "justify"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Sel>
        </Field>
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
      </div>

      {/* Decoration & Style */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Style">
          <Sel
            value={s.fontStyle ?? "normal"}
            onChange={(e) => set({ fontStyle: e.target.value })}
          >
            {["normal", "italic", "oblique"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Decoration">
          <Sel
            value={s.textDecoration ?? "none"}
            onChange={(e) => set({ textDecoration: e.target.value })}
          >
            {["none", "underline", "line-through", "overline"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Sel>
        </Field>
      </div>

      {/* Line height & letter spacing */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Line Height">
          <Inp
            type="number"
            step="0.1"
            value={s.lineHeight ?? 1.2}
            onChange={(e) => set({ lineHeight: Number(e.target.value) })}
          />
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

      {/* Box & Border */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Radius (px)">
          <Inp
            type="number"
            value={s.borderRadius ?? 0}
            onChange={(e) => set({ borderRadius: Number(e.target.value) })}
          />
        </Field>
        <Field label="Padding">
          <Inp
            value={s.padding ?? "0px"}
            onChange={(e) => set({ padding: e.target.value })}
            placeholder="8px 16px"
          />
        </Field>
      </div>

      {/* Shadow */}
      <Field label="Text Shadow">
        <Inp
          value={s.textShadow ?? ""}
          onChange={(e) => set({ textShadow: e.target.value })}
          placeholder="2px 2px 4px rgba(0,0,0,0.3)"
        />
      </Field>

      <Field label="Box Shadow">
        <Inp
          value={s.boxShadow ?? ""}
          onChange={(e) => set({ boxShadow: e.target.value })}
          placeholder="0 4px 6px rgba(0,0,0,0.1)"
        />
      </Field>

      {/* Position */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Position & Size</p>
        <div className="grid grid-cols-2 gap-2">
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
          <Field label="Width (px)">
            <Inp
              type="number"
              value={el.width ?? ""}
              placeholder="auto"
              onChange={(e) =>
                onChange({ ...el, width: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </Field>
          <Field label="Max Width (px)">
            <Inp
              type="number"
              value={el.maxWidth ?? ""}
              placeholder="auto"
              onChange={(e) =>
                onChange({ ...el, maxWidth: e.target.value ? Number(e.target.value) : undefined })
              }
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

      {/* Visibility */}
      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <Toggle value={el.isVisible} onChange={(v) => onChange({ ...el, isVisible: v })} />
        <span className="text-xs font-medium text-slate-500">Visible</span>
      </label>
    </div>
  );
}