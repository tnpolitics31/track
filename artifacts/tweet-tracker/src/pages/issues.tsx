import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Plus, Trash2, Search, X, MapPin, ExternalLink, Calendar, User, ChevronRight, TableProperties, Circle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";

interface Issue {
  id: number; title: string; description: string | null; category: string; status: string;
  dateOccurred: string | null; sourceUrl: string | null; location: string | null;
  createdBy: string | null; createdAt: string; actionCount: number;
}

const CATEGORIES = [
  { value: "death", label: "Death / Tragedy", color: "#6b7280", emoji: "🕊️" },
  { value: "protest", label: "Protest", color: "#ef4444", emoji: "✊" },
  { value: "scheme", label: "Govt Scheme", color: "#3b82f6", emoji: "📋" },
  { value: "objection", label: "Objection", color: "#f59e0b", emoji: "⚠️" },
  { value: "disaster", label: "Disaster", color: "#8b5cf6", emoji: "🌊" },
  { value: "controversy", label: "Controversy", color: "#ec4899", emoji: "🔥" },
  { value: "newsletter", label: "Newsletter / Press", color: "#10b981", emoji: "📰" },
  { value: "other", label: "Other", color: "#6b7280", emoji: "📌" },
];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Open", color: "#ef4444", icon: <Circle className="w-3 h-3" /> },
  in_progress: { label: "In Progress", color: "#f59e0b", icon: <Clock className="w-3 h-3" /> },
  resolved: { label: "Resolved", color: "#10b981", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

function CategoryBadge({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
      {meta.emoji} {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
      {meta.icon}{meta.label}
    </span>
  );
}

const emptyForm = { title: "", description: "", category: "other", dateOccurred: "", sourceUrl: "", location: "", createdBy: "" };

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchIssues = () => {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/issues?${params}`)
      .then((r) => r.json())
      .then((d) => { setIssues(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); fetchIssues(); }, [filterCategory, filterStatus]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Issue logged" });
      setShowModal(false);
      setForm(emptyForm);
      fetchIssues();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/issues/${deleteTarget.id}`, { method: "DELETE", headers: getAdminHeaders() });
    if (res.ok) { toast({ title: "Deleted" }); fetchIssues(); }
    setDeleteTarget(null);
  };

  const filtered = issues.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />Issues & Accountability
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{issues.length} issue{issues.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/issues/matrix" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
            <TableProperties className="w-3.5 h-3.5" />Matrix View
          </Link>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />Log Issue
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." className="pl-9 bg-card border-border" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* Status filter */}
          {[{ value: "", label: "All" }, { value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }].map((s) => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === s.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterCategory("")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!filterCategory ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>All Categories</button>
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => setFilterCategory(filterCategory === cat.value ? "" : cat.value)}
            className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
            style={filterCategory === cat.value ? { backgroundColor: `${cat.color}18`, color: cat.color, borderColor: `${cat.color}40` } : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--card)" }}
          >{cat.emoji} {cat.label}</button>
        ))}
      </div>

      {/* Issues list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{search || filterCategory || filterStatus ? "No issues match your filter." : "No issues logged yet."}</p>
          <Button onClick={() => setShowModal(true)} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Log First Issue</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <Link key={issue.id} href={`/issues/${issue.id}`}
              className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:shadow-sm transition-all group flex gap-4 block"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <CategoryBadge category={issue.category} />
                  <StatusBadge status={issue.status} />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{issue.title}</h3>
                {issue.description && <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {issue.dateOccurred && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(issue.dateOccurred).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  {issue.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.location}</span>}
                  {issue.createdBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />{issue.createdBy}</span>}
                  {issue.sourceUrl && <a href={issue.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-3 h-3" />Source</a>}
                  <span className="text-muted-foreground/70">{issue.actionCount} response{issue.actionCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
              {isAdmin && (
                <button onClick={(e) => { e.preventDefault(); setDeleteTarget(issue); }}
                  className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log New Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Describe the issue briefly" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="More context..." className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Occurred</label>
                <Input type="date" value={form.dateOccurred} onChange={(e) => setForm((f) => ({ ...f, dateOccurred: e.target.value }))} className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Chennai" className="bg-background border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source URL</label>
              <Input value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Logged by</label>
              <Input value={form.createdBy} onChange={(e) => setForm((f) => ({ ...f, createdBy: e.target.value }))} placeholder="Your name (optional)" className="bg-background border-border" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title.trim() || saving}>{saving ? "Saving…" : "Log Issue"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete this issue?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This will permanently remove "{deleteTarget?.title}" and all its responses.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
