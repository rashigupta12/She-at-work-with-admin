/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BannerAPI,
  type Banner,
  type BannerStatus,
  type ScreenType
} from "@/lib/api/banners";
import {
  Copy,
  Edit,
  Layout,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { STATUS_COLORS } from "./Helper";

// ✅ Resolves stored S3 path to full image URL — same pattern as expertise section
const resolveBannerImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('blob:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}${path}`;
};

// ── Banner List ───────────────────────────────────────────────────────────────
export function BannerListView({
  onCreateNew,
  onEdit,
  addToast,
}: {
  onCreateNew: () => void;
  onEdit: (b: Banner) => void;
  addToast: (type: "success" | "error", msg: string) => void;
}) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [screenFilter, setScreenFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BannerAPI.list({
        page,
        limit,
        search: search || undefined,
        status: (statusFilter as BannerStatus) || undefined,
        screenType: (screenFilter as ScreenType) || undefined,
      });
      setBanners(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (error) {
      addToastRef.current("error", error instanceof Error ? error.message : "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, screenFilter]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setActionId(id);
    try {
      await BannerAPI.delete(id);
      addToast("success", `"${name}" deleted`);
      fetchBanners();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    setActionId(id);
    try {
      await BannerAPI.duplicate(id);
      addToast("success", `"${name}" duplicated`);
      fetchBanners();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to duplicate");
    } finally {
      setActionId(null);
    }
  };

  const handleToggleStatus = async (b: Banner) => {
    const next: BannerStatus = b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionId(b._id);
    try {
      await BannerAPI.setStatus(b._id, next);
      addToast("success", `Status → ${next}`);
      fetchBanners();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  const FilterSelects = () => (
    <>
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <option value="">All Statuses</option>
        {["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <select
        value={screenFilter}
        onChange={(e) => { setScreenFilter(e.target.value); setPage(1); }}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <option value="">All Screens</option>
        {["DESKTOP", "TABLET", "MOBILE"].map((s) => <option key={s}>{s}</option>)}
      </select>
    </>
  );

  // ✅ Shared thumbnail style — used in both desktop table and mobile cards
  const thumbnailStyle = (b: Banner): React.CSSProperties => ({
    backgroundColor: b.backgroundColor,
    backgroundImage: b.backgroundImageUrl
      ? `url(${resolveBannerImageUrl(b.backgroundImageUrl)})`
      : undefined,
  });

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Banners</h2>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-violet-200"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Banner</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Search row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search banners..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`sm:hidden flex items-center gap-1.5 px-3 border rounded-xl text-sm font-medium transition-colors ${showFilters ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-500"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <div className="hidden sm:flex gap-2"><FilterSelects /></div>
      </div>
      {showFilters && <div className="sm:hidden flex gap-2 mb-3"><FilterSelects /></div>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-slate-400">
            <Layout className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-semibold">No banners found</p>
            <button onClick={onCreateNew} className="mt-4 text-violet-600 text-sm hover:underline font-medium">
              Create your first banner →
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Name", "Screen",  "Status","Page", "Elements",""].map((h) => (
                      <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {banners.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* ✅ resolveBannerImageUrl applied */}
                          <div
                            className="h-10 w-16 rounded-lg flex-shrink-0 border border-slate-200 bg-cover bg-center"
                            style={thumbnailStyle(b)}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{b.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{b.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{b.screenType}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">{b.page}</td>

                      <td className="px-5 py-4 text-sm text-slate-600">{b.elements.length}</td>
                      {/* <td className="px-5 py-4 text-sm text-slate-600">{b.priority}</td> */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-0.5 justify-end">
                          {actionId === b._id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-violet-400 mx-2" />
                          ) : (
                            <>
                              <button onClick={() => onEdit(b)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleToggleStatus(b)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                {b.status === "ACTIVE" ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                              </button>
                              <button onClick={() => handleDuplicate(b._id, b.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"><Copy className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(b._id, b.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-50">
              {banners.map((b) => (
                <div key={b._id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* ✅ resolveBannerImageUrl applied — was missing here before */}
                    <div
                      className="h-12 w-20 rounded-xl flex-shrink-0 border border-slate-200 bg-cover bg-center"
                      style={thumbnailStyle(b)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{b.name}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">{b.slug}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{b.screenType}</span>
                        <span className="text-xs text-slate-400 font-mono">{b.page}</span>
                        <span className="text-xs text-slate-400">{b.elements.length} els · p{b.priority}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {actionId === b._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400 mx-auto" />
                    ) : (
                      <>
                        <button onClick={() => onEdit(b)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => handleToggleStatus(b)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                          {b.status === "ACTIVE" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {b.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleDuplicate(b._id, b.name)} className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(b._id, b.name)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">Prev</button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
        </div>
      )}
    </div>
  );
}