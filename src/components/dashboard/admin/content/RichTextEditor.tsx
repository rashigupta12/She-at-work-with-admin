"use client";

import { cn } from "@/lib/utils";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2Off,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  Minus,
  Quote,
  Redo,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  Undo,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ImageUploadModal from "./ImageUploadModal";

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors shrink-0",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        active
          ? "bg-primary text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;
}

// ─── Image Floating Panel ─────────────────────────────────────────────────────

type Alignment = "left" | "center" | "right" | "full";
type SizePreset = "25" | "50" | "75" | "100" | "";

function ImageFloatingPanel({
  editor,
}: {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [locked, setLocked] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [alignment, setAlignment] = useState<Alignment>("center");
  const [sizePreset, setSizePreset] = useState<SizePreset>("100");
  const [lockRatio, setLockRatio] = useState(true);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const computePos = useCallback((domNode: HTMLElement) => {
    const rect = domNode.getBoundingClientRect();
    const panelW = 292;
    const panelH = 420; // Approximate height of panel
    
    // Calculate position - center above the image
    let top = rect.top + window.scrollY - panelH - 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - (panelW / 2);
    
    // If not enough space above, place below
    if (top < window.scrollY + 10) {
      top = rect.bottom + window.scrollY + 10;
    }
    
    // Keep panel within viewport bounds horizontally
    const viewportWidth = window.innerWidth;
    if (left + panelW > viewportWidth - 10) {
      left = viewportWidth - panelW - 10;
    }
    if (left < 10) {
      left = 10;
    }
    
    setPos({ top, left });
  }, []);

  const updateImageAttrs = useCallback((attrs: any) => {
    editor.chain().focus().setImage(attrs).run();
  }, [editor]);

  useEffect(() => {
    const onSelection = () => {
      if (!editor.isActive("image")) {
        if (!panelRef.current?.contains(document.activeElement)) {
          setLocked(false);
        }
        return;
      }

      const attrs = editor.getAttributes("image");
      setImageUrl(attrs.src || "");
      setAltText(attrs.alt || "");

      const w = attrs.width ? String(attrs.width) : "";
      const h = attrs.height ? String(attrs.height) : "";
      setWidth(w);
      setHeight(h);
      
      const align = (attrs["data-align"] as Alignment) || "center";
      setAlignment(align);
      
      const preset = (attrs["data-size"] as SizePreset) || "100";
      setSizePreset(preset);

      const { from } = editor.state.selection;
      const domNode = editor.view.nodeDOM(from) as HTMLElement | null;
      if (domNode) {
        computePos(domNode);
        const img = domNode as HTMLImageElement;
        if (img.naturalWidth) {
          setNaturalW(img.naturalWidth);
          setNaturalH(img.naturalHeight);
        } else {
          img.onload = () => { 
            setNaturalW(img.naturalWidth); 
            setNaturalH(img.naturalHeight); 
          };
        }
      }
      setLocked(true);
    };

    const handleScrollOrResize = () => {
      if (locked && editor.isActive("image")) {
        const { from } = editor.state.selection;
        const domNode = editor.view.nodeDOM(from) as HTMLElement | null;
        if (domNode) {
          computePos(domNode);
        }
      }
    };

    editor.on("selectionUpdate", onSelection);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    
    return () => { 
      editor.off("selectionUpdate", onSelection);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [editor, computePos, locked]);

  const applyUpdate = useCallback(() => {
    if (!imageUrl) return;

    const attrs: Record<string, any> = {
      src: imageUrl,
      alt: altText,
      "data-align": alignment,
      "data-size": sizePreset,
    };
    
    if (width && !sizePreset) {
      attrs.width = Number(width);
    }
    if (height && !sizePreset) {
      attrs.height = Number(height);
    }
    
    updateImageAttrs(attrs);
  }, [imageUrl, altText, alignment, sizePreset, width, height, updateImageAttrs]);

  const handleWidthChange = (val: string) => {
    setWidth(val);
    setSizePreset(""); // Clear preset when custom size is used
    if (lockRatio && naturalW && naturalH && val) {
      const ratio = naturalH / naturalW;
      setHeight(String(Math.round(Number(val) * ratio)));
    }
  };

  const handleHeightChange = (val: string) => {
    setHeight(val);
    setSizePreset(""); // Clear preset when custom size is used
    if (lockRatio && naturalW && naturalH && val) {
      const ratio = naturalW / naturalH;
      setWidth(String(Math.round(Number(val) * ratio)));
    }
  };

  const applyPreset = (preset: SizePreset) => {
    setSizePreset(preset);
    setWidth("");
    setHeight("");
    updateImageAttrs({
      src: imageUrl,
      alt: altText,
      "data-size": preset,
      "data-align": alignment,
      width: null,
      height: null,
    });
  };

  const applyAlignment = (align: Alignment) => {
    setAlignment(align);
    updateImageAttrs({
      src: imageUrl,
      alt: altText,
      "data-size": sizePreset,
      "data-align": align,
      width: width || null,
      height: height || null,
    });
  };

  const handleRemove = () => {
    editor.chain().focus().deleteSelection().run();
    setLocked(false);
  };

  const resetDimensions = () => {
    setWidth("");
    setHeight("");
    setSizePreset("100");
    updateImageAttrs({
      src: imageUrl,
      alt: altText,
      "data-size": "100",
      "data-align": alignment,
      width: null,
      height: null,
    });
  };

  if (!locked) return null;

  const alignOptions: { value: Alignment; label: string }[] = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
    { value: "full", label: "Full" },
  ];

  const presets: { value: SizePreset; label: string }[] = [
    { value: "25", label: "S · 25%" },
    { value: "50", label: "M · 50%" },
    { value: "75", label: "L · 75%" },
    { value: "100", label: "Full" },
  ];

  return (
    <div
      ref={panelRef}
      style={{ 
        position: 'fixed',
        top: `${pos.top}px`, 
        left: `${pos.left}px`,
        zIndex: 9999
      }}
      className="bg-background rounded-xl shadow-xl border border-border w-[292px] overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Image settings</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleRemove}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            title="Delete image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLocked(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Alignment */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Alignment</p>
          <div className="grid grid-cols-4 gap-1">
            {alignOptions.map((opt) => (
              <button
                key={opt.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlignment(opt.value)}
                className={cn(
                  "h-8 rounded-md text-xs font-medium transition-colors border",
                  alignment === opt.value
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size presets */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Size</p>
          <div className="grid grid-cols-4 gap-1">
            {presets.map((p) => (
              <button
                key={p.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyPreset(p.value)}
                className={cn(
                  "h-8 rounded-md text-xs font-medium transition-colors border",
                  sizePreset === p.value
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom dimensions */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Custom size</p>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setLockRatio(!lockRatio)}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors",
                lockRatio ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lock className="h-3 w-3" />
              {lockRatio ? "Locked" : "Unlocked"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={applyUpdate}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUpdate(); } }}
                className="w-full h-8 px-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Auto"
                min="1"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={applyUpdate}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUpdate(); } }}
                className="w-full h-8 px-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Auto"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Alt text */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Alt text</label>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={applyUpdate}
            className="w-full h-8 px-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Describe for accessibility…"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyUpdate}
            className="flex-1 h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Apply changes
          </button>
          {(width || height || (sizePreset !== "100")) && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={resetDimensions}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    setLinkUrl(prev);
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim(), target: "_blank" }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  const addImage = (url: string, alt?: string, caption?: string) => {
    editor.chain().focus().setImage({
      src: url,
      alt: alt || "",
      "data-size": "100",
      "data-align": "center",
      title: caption || ""
    } as any).run();
  };

  return (
    <>
      <div className="border-b border-border bg-muted/20 rounded-t-xl">
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {/* Headings */}
          <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Inline styles */}
          <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Strikethrough" active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Inline code" active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Link */}
          <ToolBtn title="Add link" active={editor.isActive("link")} onClick={setLink}>
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          {editor.isActive("link") && (
            <ToolBtn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
              <Link2Off className="h-3.5 w-3.5" />
            </ToolBtn>
          )}

          {/* Image */}
          <ToolBtn title="Insert image" active={editor.isActive("image")} onClick={() => setImageModalOpen(true)}>
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Lists */}
          <ToolBtn title="Bullet list" active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Numbered list" active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Blockquote" active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Code block" active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <span className="text-[11px] font-mono font-bold">{"<>"}</span>
          </ToolBtn>
          <ToolBtn title="Divider line"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Alignment */}
          <ToolBtn title="Align left" active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Align center" active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Align right" active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Justify" active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* History */}
          <ToolBtn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Clear formatting"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <RemoveFormatting className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>

        {/* Link popover */}
        {linkOpen && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border-t border-border">
            <input
              autoFocus
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                if (e.key === "Escape") { setLinkOpen(false); setLinkUrl(""); }
              }}
              className="flex-1 h-8 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="button" onClick={applyLink}
              className="px-3 h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">
              Apply
            </button>
            <button type="button" onClick={() => { setLinkOpen(false); setLinkUrl(""); }}
              className="px-3 h-8 rounded-lg border border-border text-xs hover:bg-muted">
              Cancel
            </button>
          </div>
        )}
      </div>

      {imageModalOpen && (
        <ImageUploadModal onClose={() => setImageModalOpen(false)} onInsert={addImage} />
      )}
    </>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  error?: boolean;
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write your content here…",
  minHeight = 400,
  className,
  error,
}: RichTextEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Image.extend({
        addAttributes() {
          return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
            "data-size": { default: "100" },
            "data-align": { default: "center" },
          };
        },
      }).configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rte-image",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
      },
      handleKeyDown: (view, event) => {
        if ((event.key === "Delete" || event.key === "Backspace") && editor?.isActive("image")) {
          editor.commands.deleteSelection();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    const newValue = value || "";
    if (newValue !== current) {
      editor.commands.setContent(newValue, { emitUpdate: false });
    }
  }, [value, editor]);

  const wordCount = editor?.storage.characterCount?.words() || 0;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        error
          ? "border-red-400 focus-within:ring-2 focus-within:ring-red-400"
          : "border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        className
      )}
    >
      {editor && <Toolbar editor={editor} />}

      <div ref={contentRef} className="relative">
        {editor && <ImageFloatingPanel editor={editor} containerRef={contentRef} />}

        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className={cn(
            "px-5 py-4 bg-background text-foreground overflow-y-auto",
            "[&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none",

            // Placeholder
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",

            // Headings
            "[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-5 [&_.ProseMirror_h1]:mb-2",
            "[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2",
            "[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1",

            // Text
            "[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-relaxed",
            "[&_.ProseMirror_strong]:font-bold",
            "[&_.ProseMirror_em]:italic",
            "[&_.ProseMirror_u]:underline",
            "[&_.ProseMirror_s]:line-through",

            // Lists
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:my-2",
            "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:my-2",
            "[&_.ProseMirror_li]:my-1",

            // Blockquote
            "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/40",
            "[&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:my-3",
            "[&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:italic",

            // Code
            "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5",
            "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono",
            "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:my-3",
            "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",

            // Links
            "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:cursor-pointer",

            // HR
            "[&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-4",

            // Image styles
            "[&_.ProseMirror_.rte-image]:rounded-lg [&_.ProseMirror_.rte-image]:my-4",
            "[&_.ProseMirror_.rte-image]:cursor-pointer [&_.ProseMirror_.rte-image]:transition-all",
            "[&_.ProseMirror_.rte-image]:hover:ring-2 [&_.ProseMirror_.rte-image]:hover:ring-primary/40",
            "[&_.ProseMirror_.rte-image.ProseMirror-selectednode]:ring-2 [&_.ProseMirror_.rte-image.ProseMirror-selectednode]:ring-primary",
            "[&_.ProseMirror_.rte-image.ProseMirror-selectednode]:ring-offset-2",

            // Size presets via data-size attribute
            "[&_.ProseMirror_.rte-image[data-size='25']]:w-1/4",
            "[&_.ProseMirror_.rte-image[data-size='50']]:w-1/2",
            "[&_.ProseMirror_.rte-image[data-size='75']]:w-3/4",
            "[&_.ProseMirror_.rte-image[data-size='100']]:w-full",

            // Alignment via data-align attribute
            "[&_.ProseMirror_.rte-image[data-align='left']]:float-left [&_.ProseMirror_.rte-image[data-align='left']]:mr-4 [&_.ProseMirror_.rte-image[data-align='left']]:mb-2",
            "[&_.ProseMirror_.rte-image[data-align='center']]:block [&_.ProseMirror_.rte-image[data-align='center']]:mx-auto",
            "[&_.ProseMirror_.rte-image[data-align='right']]:float-right [&_.ProseMirror_.rte-image[data-align='right']]:ml-4 [&_.ProseMirror_.rte-image[data-align='right']]:mb-2",
            "[&_.ProseMirror_.rte-image[data-align='full']]:w-full [&_.ProseMirror_.rte-image[data-align='full']]:block",
          )}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-t border-border">
        <span className="text-[11px] text-muted-foreground">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Click image to edit · Delete/Backspace to remove
          </span>
        </div>
      </div>
    </div>
  );
}