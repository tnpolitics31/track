import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Plus, Trash2, Search, X, Filter, MapPin, ExternalLink, Calendar, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";

interface Issue {
  id: number; title: string; description: string | null; category: string;
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

const emptyForm = { title: "", description: "", category: "other", dateOccurred: "", sourceUrl: "", location: "", createdBy: "" };

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchIssues = () => {
    const params = filterCategory ? `?category=${filterCategory}` : "";
    fetch(`/api/issues${params}`)
      .then((r) => r.json())
      .then((d) => { setIssues(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); fetchIssues(); }, [filterCategory]);

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
    if (res.ok) { toast({ title: "Issue deleted" }); fetchIssues(); }
    setDeleteTarget(null);
  };

  const filtered = issues.filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Issues & Accountability
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {issues.length} issue{issues.length !== 1 ? "s" : ""} tracked · anyone can log · admin can delete
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log an Issue
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterCategory("")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!filterCategory ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => setFilterCategory(filterCategory === cat.value ? "" : cat.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${filterCategory === cat.value ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            style={filterCategory === cat.value ? { backgroundColor: cat.color } : {}}
          >{cat.emoji} {cat.label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." className="pl-9 bg-card border-border" />
        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{search ? "No issues match your search." : "No issues logged yet."}</p>
          <Button onClick={() => setShowModal(true)} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Log First Issue</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <Link key={issue.id} href={`/issues/${issue.id}`}>
              <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={issue.category} />
                      {issue.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{issue.location}
                        </span>
                      )}
                      {issue.dateOccurred && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />{new Date(issue.dateOccurred).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{issue.title}</h3>
                    {issue.description && <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{issue.actionCount} party response{issue.actionCount !== 1 ? "s" : ""}</span>
                      {issue.createdBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />{issue.createdBy}</span>}
                      {issue.sourceUrl && (
                        <a href={issue.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary">
                          <ExternalLink className="w-3 h-3" />Source
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(issue); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Issue Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Issue Title *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Factory fire in Sivakasi kills 6 workers" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happened? Provide context..." rows={4} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Occurred</label>
                <Input type="date" value={form.dateOccurred} onChange={(e) => setForm((f) => ({ ...f, dateOccurred: e.target.value }))} className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Chennai, Tamil Nadu" className="bg-background border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source URL (news article / tweet)</label>
              <Input value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name / Alias (optional)</label>
              <Input value={form.createdBy} onChange={(e) => setForm((f) => ({ ...f, createdBy: e.target.value }))} placeholder="Anonymous" className="bg-background border-border" />
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
            <AlertDialogDescription className="text-muted-foreground">This will permanently delete the issue and all party responses logged against it.</AlertDialogDescription>
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
