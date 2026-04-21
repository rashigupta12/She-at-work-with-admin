// components/dashboard/admin/contact-submissions/ContactSubmissionsList.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BookOpen, Check, Eye, Mail, MessageSquare,
  RefreshCw, Search, Trash2, User, X, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContactItem = {
  id:           string;
  name:         string;
  email:        string;
  phone:        string | null;
  subject:      string | null;
  message:      string;
  isResolved:   boolean;
  resolvedAt:   string | null;
  notes:        string | null;
  submittedAt:  string;
  resolverName: string | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const TABS = [
  { label: "Unresolved", value: "false" },
  { label: "Resolved",   value: "true"  },
  { label: "All",        value: ""      },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ContactSubmissionsList() {
  const searchParams = useSearchParams();

  const [items,      setItems]      = useState<ContactItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page:1, limit:20, total:0, totalPages:0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [isResolved, setIsResolved] = useState(searchParams.get("resolved") ?? "false");
  const [search,     setSearch]     = useState("");
  const [debSearch,  setDebSearch]  = useState("");
  const [page,       setPage]       = useState(1);
  const [toast,      setToast]      = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const debRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const msg = searchParams.get("msg");
    if (msg) showToast(decodeURIComponent(msg));
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [search]);

  useEffect(() => { 
    setPage(1); 
    setSelectedIds(new Set()); // Clear selection when tab changes
    setSelectAll(false);
  }, [isResolved]);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (isResolved !== "") sp.set("isResolved", isResolved);
      if (debSearch)         sp.set("search",     debSearch);
      const res = await fetch(`/api/admin/contact-submissions?${sp}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.data ?? []);
      setPagination(data.pagination ?? { page:1, limit:20, total:0, totalPages:0 });
      setSelectedIds(new Set()); // Clear selection on new data
      setSelectAll(false);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, isResolved, debSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      const allIds = items.map(item => item.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  }, [selectAll, items]);

  // Handle individual selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(false);
  };

  // Quick-resolve directly from list without leaving page
  const quickResolve = async (item: ContactItem) => {
    try {
      const res = await fetch(`/api/admin/contact-submissions/${item.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: !item.isResolved }),
      });
      if (!res.ok) throw new Error();
      showToast(item.isResolved ? "Marked as unresolved" : "Marked as resolved");
      fetchData();
    } catch {
      showToast("Action failed");
    }
  };

  // Bulk delete with confirmation
  const bulkDelete = async () => {
    if (selectedIds.size === 0) {
      showToast("No messages selected", true);
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Messages?',
      html: `Are you sure you want to delete <strong>${selectedIds.size}</strong> message${selectedIds.size !== 1 ? 's' : ''}?<br/><br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/admin/contact-submissions/bulk-delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        showToast(`Successfully deleted ${data.deletedCount} message${data.deletedCount !== 1 ? 's' : ''}`);
        
        // Refresh data and clear selection
        fetchData();
        
        // Show success confirmation
        await Swal.fire({
          title: 'Deleted!',
          text: `${data.deletedCount} message${data.deletedCount !== 1 ? 's have' : ' has'} been deleted.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Bulk delete error:', error);
        showToast('Failed to delete messages', true);
        await Swal.fire({
          title: 'Error!',
          text: 'Failed to delete messages. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      }
    }
  };

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
          toast.includes("Failed") ? "bg-red-600 text-white" : "bg-green-600 text-white"
        )}>
          {toast.includes("Failed") ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />} 
          {toast}
        </div>
      )}

      {/* Search + refresh + bulk actions */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, subject or message…"
            value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        {/* Bulk Delete Button */}
        {selectedIds.size > 0 && (
          <Button 
            variant="destructive" 
            onClick={bulkDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedIds.size})
          </Button>
        )}
        
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title="Refresh">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 items-center flex-wrap">
        {TABS.map((t) => (
          <button key={t.value}
            onClick={() => setIsResolved(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              isResolved === t.value
                ? "bg-primary text-white border-primary"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
            )}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {pagination.total} message{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-52">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <XCircle className="h-9 w-9 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load messages</p>
          <Button variant="outline" size="sm" onClick={fetchData}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <BookOpen className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isResolved === "false" ? "No unresolved messages — all clear!" : "No messages found"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => setSelectAll(e.target.checked)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sender</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Received</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
               </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/20",
                    item.isResolved && "opacity-70"
                  )}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  
                  {/* Sender */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{item.email}</span>
                    </div>
                   </td>

                  {/* Subject */}
                  <td className="px-4 py-3 hidden md:table-cell max-w-[180px]">
                    <p className="line-clamp-1 text-sm">
                      {item.subject ?? <span className="text-muted-foreground italic">No subject</span>}
                    </p>
                   </td>

                  {/* Message preview */}
                  <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                   </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                      item.isResolved
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    )}>
                      {item.isResolved ? <Check className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {item.isResolved ? "Resolved" : "Open"}
                    </span>
                   </td>

                  {/* Date */}
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.submittedAt), "MMM d, yyyy")}
                    {item.isResolved && item.resolvedAt && (
                      <p className="text-[10px] mt-0.5 text-green-700">
                        Resolved {format(new Date(item.resolvedAt), "MMM d")}
                        {item.resolverName ? ` by ${item.resolverName}` : ""}
                      </p>
                    )}
                   </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/admin/contact-submissions/${item.id}`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </Link>
                      {/* Quick toggle resolve without navigating */}
                      <Button variant="ghost" size="sm"
                        className={cn(
                          "h-8 w-8 p-0",
                          item.isResolved
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        )}
                        onClick={() => quickResolve(item)}
                        title={item.isResolved ? "Mark unresolved" : "Mark resolved"}>
                        {item.isResolved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                   </td>
                 </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="outline" size="sm"
              onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}