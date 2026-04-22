"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScreenType = "DESKTOP" | "TABLET" | "MOBILE";

interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  color?: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: number | string;
  border?: string;
  textAlign?: string;
  textTransform?: string;
  textDecoration?: string;
  textShadow?: string;
  boxShadow?: string;
}

interface ButtonStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  letterSpacing?: string | number;
  textTransform?: string;
  borderRadius?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  width?: number | string;
  height?: number | string;
  borderWidth?: number | string;
  borderColor?: string;
  borderStyle?: string;
  boxShadow?: string;
  opacity?: number;
}

interface BaseElement {
  id: string;
  type: "TEXT" | "BUTTON";
  zIndex: number;
  positionX: number;
  positionY: number;
  isVisible: boolean;
  isExternal?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
}

interface TextElement extends BaseElement {
  type: "TEXT";
  content: string;
  style: TextStyle;
}

interface ButtonElement extends BaseElement {
  type: "BUTTON";
  label: string;
  href?: string;
  style: ButtonStyle;
}

type BannerElement = TextElement | ButtonElement;

interface Banner {
  id: string;
  name: string;
  screenType?: ScreenType;
  page: string;
  position?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  backgroundSize?: string;
  backgroundPosition?: string;
  elements: BannerElement[];
  priority: number;
}

// ✅ Matches actual API response — createdBy/updatedBy are UUID strings, not objects
interface RawElement {
  id: string;
  type: "TEXT" | "BUTTON";
  zIndex: number;
  positionX: number;
  positionY: number;
  isVisible: boolean;
  isExternal?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  content?: string;
  style?: TextStyle & ButtonStyle;
  label?: string;
  href?: string;
}

interface RawBanner {
  _id: string;
  id: string;
  name: string;
  screenType?: ScreenType;
  page: string;
  position?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  // ✅ Full Cloudinary URL from backend — no prefix needed
  backgroundImageUrl?: string | null;
  backgroundImageAlt?: string | null;
  backgroundSize?: string;
  backgroundPosition?: string;
  elements: RawElement[];
  priority: number;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SCHEDULED";
  startsAt?: string | null;
  endsAt?: string | null;
  // ✅ createdBy is a UUID string in new API (not an object)
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ActiveBannersResponse {
  success: boolean;
  data: RawBanner[];
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapRawToBanner(raw: RawBanner): Banner {
  return {
    // ✅ Use id (uuid) — _id is an alias, both are same value
    id: raw.id ?? raw._id,
    name: raw.name,
    screenType: raw.screenType,
    page: raw.page,
    position: raw.position,
    width: raw.width,
    height: raw.height,
    backgroundColor: raw.backgroundColor,
    // ✅ backgroundImageUrl is already a full Cloudinary URL — use as-is
    backgroundImageUrl: raw.backgroundImageUrl ?? null,
    backgroundSize: raw.backgroundSize,
    backgroundPosition: raw.backgroundPosition,
    priority: raw.priority,
    elements: raw.elements.map((el) => {
      const base: BaseElement = {
        id: el.id,
        type: el.type,
        zIndex: el.zIndex,
        positionX: el.positionX,
        positionY: el.positionY,
        isVisible: el.isVisible,
        isExternal: el.isExternal,
        width: el.width,
        height: el.height,
        maxWidth: el.maxWidth,
      };
      if (el.type === "TEXT") {
        return {
          ...base,
          type: "TEXT",
          content: el.content ?? "",
          style: el.style ?? {},
        } as TextElement;
      }
      return {
        ...base,
        type: "BUTTON",
        label: el.label ?? "",
        href: el.href,
        style: el.style ?? {},
      } as ButtonElement;
    }),
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchActiveBanners(
  screenType: ScreenType,
  page: string,
  position?: string
): Promise<Banner[]> {
  // ✅ Pass all filters to API — reduces over-fetching
  const params = new URLSearchParams({ screenType, page });
  if (position) params.set("position", position);

  const res = await fetch(`/api/banners/active?${params.toString()}`, {
    // ✅ next.js cache: revalidate every 60s — matches server-side cache-control
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Banner fetch failed: ${res.status}`);

  const json: ActiveBannersResponse = await res.json();
  if (!json.success) throw new Error("Banner API returned success=false");

  // API already filters + sorts by priority desc — just map
  return json.data.map(mapRawToBanner);
}

// ── Screen type hook ──────────────────────────────────────────────────────────

function getScreenType(width: number): ScreenType {
  if (width < 768) return "MOBILE";
  if (width < 1024) return "TABLET";
  return "DESKTOP";
}

function useScreenType(override?: ScreenType): ScreenType {
  const [screenType, setScreenType] = useState<ScreenType>(() => {
    if (override) return override;
    if (typeof window === "undefined") return "DESKTOP";
    return getScreenType(window.innerWidth);
  });

  useEffect(() => {
    if (override) return;
    const update = () => setScreenType(getScreenType(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [override]);

  return screenType;
}

// ── BannerDisplay ─────────────────────────────────────────────────────────────

interface BannerDisplayProps {
  page: string;
  screenType?: ScreenType;
  position?: string;
  autoPlayInterval?: number;
}

export function BannerDisplay({
  page,
  screenType: override,
  position,
  autoPlayInterval = 4000,
}: BannerDisplayProps) {
  const screenType = useScreenType(override);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // ✅ Pass page + position to fetch — API handles filtering now
        const data = await fetchActiveBanners(screenType, page, position);
        if (cancelled) return;
        // ✅ No need to re-filter client-side — API already did it
        // ✅ No need to re-sort — API already sorted by priority desc
        setBanners(data);
        setCurrent(0);
      } catch (err) {
        if (!cancelled) console.error("[BannerDisplay] Failed to load banners:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, screenType, position]);

  const total = banners.length;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      resetTimer();
      setCurrent(idx);
    },
    [resetTimer]
  );

  useEffect(() => {
    if (total <= 1 || autoPlayInterval === 0 || isHovered) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, autoPlayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, autoPlayInterval, isHovered, current]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (total === 0) return null;
  if (total === 1) return <BannerRenderer banner={banners[0]} screenType={screenType} />;

  const bannerWidth = banners[0].width || 1920;
  const bannerHeight = banners[0].height || 750;
  const aspectPct = (bannerHeight / bannerWidth) * 100;

  return (
    <div
      className="relative w-full select-none"
      style={{ paddingBottom: `${aspectPct}%`, height: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0">
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            className="absolute inset-0"
            style={{
              opacity: idx === current ? 1 : 0,
              transition: "opacity 0.7s ease-in-out",
              pointerEvents: idx === current ? "auto" : "none",
              zIndex: idx === current ? 1 : 0,
            }}
          >
            <BannerRenderer banner={banner} screenType={screenType} />
          </div>
        ))}
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Go to banner ${idx + 1}`}
            className="transition-all duration-300 rounded-full cursor-pointer"
            style={{
              width: idx === current ? 28 : 8,
              height: 8,
              backgroundColor:
                idx === current ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── BannerRenderer ────────────────────────────────────────────────────────────
// HOW SCALING WORKS:
// Banner designed at nativeWidth x nativeHeight (e.g. 1920x750).
// We render inner div at full native size, then CSS transform scale() it down
// to fit the container. All px values stay as px — no conversion needed.

export function BannerRenderer({
  banner,
  screenType = "DESKTOP",
}: {
  banner: Banner;
  screenType?: ScreenType;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const nativeW = banner.width || 1920;
  const nativeH = banner.height || 750;

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      setScale(containerRef.current.offsetWidth / nativeW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [nativeW]);

  const sortedElements = [...banner.elements].sort((a, b) => a.zIndex - b.zIndex);
  const hasImage = !!banner.backgroundImageUrl;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: nativeH * scale }}
    >
      {/* Native-size inner div, scaled down via CSS transform */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: nativeW,
          height: nativeH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundColor: banner.backgroundColor ?? "#f1f5f9",
          ...(hasImage
            ? {
                backgroundImage: `url(${banner.backgroundImageUrl})`,
                backgroundSize: banner.backgroundSize ?? "cover",
                backgroundPosition: banner.backgroundPosition ?? "center",
                backgroundRepeat: "no-repeat",
              }
            : {}),
        }}
      >
        {sortedElements.map((element) => {
          if (!element.isVisible) return null;

          const baseStyle: React.CSSProperties = {
            position: "absolute",
            left: `${element.positionX}%`,
            top: `${element.positionY}%`,
            zIndex: 10 + element.zIndex,
          };

          if (element.type === "TEXT") {
            const textEl = element as TextElement;
            const s = textEl.style;
            return (
              <div
                key={element.id}
                style={{
                  ...baseStyle,
                  fontSize: s.fontSize != null ? `${s.fontSize}px` : "16px",
                  fontFamily: s.fontFamily,
                  fontWeight: s.fontWeight,
                  fontStyle: s.fontStyle,
                  lineHeight: s.lineHeight,
                  letterSpacing:
                    s.letterSpacing != null
                      ? typeof s.letterSpacing === "number"
                        ? `${s.letterSpacing}px`
                        : s.letterSpacing
                      : undefined,
                  color: s.color,
                  backgroundColor: s.backgroundColor,
                  padding: s.padding,
                  borderRadius: s.borderRadius,
                  border: s.border,
                  textAlign: s.textAlign as React.CSSProperties["textAlign"],
                  textTransform:
                    s.textTransform as React.CSSProperties["textTransform"],
                  textDecoration: s.textDecoration,
                  textShadow: s.textShadow,
                  boxShadow: s.boxShadow,
                  width:
                    textEl.width != null
                      ? typeof textEl.width === "number"
                        ? `${textEl.width}px`
                        : textEl.width
                      : "max-content",
                  maxWidth:
                    textEl.maxWidth != null
                      ? typeof textEl.maxWidth === "number"
                        ? `${textEl.maxWidth}px`
                        : textEl.maxWidth
                      : undefined,
                  height:
                    textEl.height != null
                      ? typeof textEl.height === "number"
                        ? `${textEl.height}px`
                        : textEl.height
                      : "auto",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {textEl.content}
              </div>
            );
          }

          if (element.type === "BUTTON") {
            const btnEl = element as ButtonElement;
            const s = btnEl.style;
            const buttonStyle: React.CSSProperties = {
              ...baseStyle,
              fontSize: s.fontSize != null ? `${s.fontSize}px` : "14px",
              fontFamily: s.fontFamily,
              fontWeight: s.fontWeight,
              letterSpacing:
                s.letterSpacing != null
                  ? typeof s.letterSpacing === "number"
                    ? `${s.letterSpacing}px`
                    : s.letterSpacing
                  : undefined,
              textTransform:
                s.textTransform as React.CSSProperties["textTransform"],
              backgroundColor: s.backgroundColor,
              color: s.textColor,
              borderRadius:
                s.borderRadius != null
                  ? typeof s.borderRadius === "number"
                    ? `${s.borderRadius}px`
                    : s.borderRadius
                  : undefined,
              paddingTop:
                s.paddingTop != null
                  ? typeof s.paddingTop === "number"
                    ? `${s.paddingTop}px`
                    : s.paddingTop
                  : "10px",
              paddingRight:
                s.paddingRight != null
                  ? typeof s.paddingRight === "number"
                    ? `${s.paddingRight}px`
                    : s.paddingRight
                  : "24px",
              paddingBottom:
                s.paddingBottom != null
                  ? typeof s.paddingBottom === "number"
                    ? `${s.paddingBottom}px`
                    : s.paddingBottom
                  : "10px",
              paddingLeft:
                s.paddingLeft != null
                  ? typeof s.paddingLeft === "number"
                    ? `${s.paddingLeft}px`
                    : s.paddingLeft
                  : "24px",
              width:
                s.width != null
                  ? typeof s.width === "number"
                    ? `${s.width}px`
                    : s.width
                  : "auto",
              height:
                s.height != null
                  ? typeof s.height === "number"
                    ? `${s.height}px`
                    : s.height
                  : "auto",
              borderWidth:
                s.borderWidth != null
                  ? typeof s.borderWidth === "number"
                    ? `${s.borderWidth}px`
                    : s.borderWidth
                  : undefined,
              borderColor: s.borderColor,
              borderStyle: (
                s.borderStyle ?? (s.borderWidth ? "solid" : undefined)
              ) as React.CSSProperties["borderStyle"],
              boxShadow: s.boxShadow,
              opacity: s.opacity ?? 1,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "opacity 0.2s ease",
            };

            if (btnEl.isExternal) {
              return (
                <a
                  key={element.id}
                  href={btnEl.href}
                  style={buttonStyle}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {btnEl.label}
                </a>
              );
            }
            return (
              <Link key={element.id} href={btnEl.href || "#"} style={buttonStyle}>
                {btnEl.label}
              </Link>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}