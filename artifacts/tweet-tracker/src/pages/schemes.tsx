import { useState, useEffect, useCallback } from "react";
import { Plus, ExternalLink, Trash2, Edit2, X, Check, BookOpen, Youtube, Newspaper, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";
import { useToast } from "@/hooks/use-toast";

interface Party { id: number; name: string; shortName: string; color: string; }
interface Scheme {
  id: number;
  title: string;
  description: string | null;
  partyId: number | null;
  partyShortName: string | null;
  partyColor: string | null;
  dateAnnounced: string | null;
  manifestoPromise: boolean;
  status: "announced" | "in_progress" | "completed" | "cancelled";
  responseUrl: string | null;
  newspaperUrl: string | null;
  youtubeUrl: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "announced", label: "Announced", color: "bg-blue-500/15 text-blue-400" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-500/15 text-amber-400" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/15 text-emerald-400" },
  { value: "cancelled", label: "Cancelled", color: "bg-zinc-500/15 text-zinc-400" },
];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${opt?.color ?? "bg-muted text-muted-foreground"}`}>
      {opt?.label ?? status}
    </span>
  );
}

function SchemeForm({
  parties,
  initial,
  onSave,
  onCancel,
}: {
  parties: Party[];
  initial?: Partial<Scheme>;
  onSave: (data: Partial<Scheme>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [partyId, setPartyId] = useState<string>(initial?.partyId ? String(initial.partyId) : "");
  const [dateAnnounced, setDateAnnounced] = useState(initial?.dateAnnounced ?? "");
  const [manifestoPromise, setManifestoPromise] = useState(initial?.manifestoPromise ?? false);
  const [status, setStatus] = useState(initial?.status ?? "announced");
  const [responseUrl, setResponseUrl] = useState(initial?.responseUrl ?? "");
  const [newspaperUrl, setNewspaperUrl] = useState(initial?.newspaperUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title,
        description: description || undefined,
        partyId: partyId ? Number(partyId) : undefined,
        dateAnnounced: dateAnnounced || undefined,
        manifestoPromise,
        status: status as Scheme["status"],
        responseUrl: responseUrl || undefined,
        newspaperUrl: newspaperUrl || undefined,
        youtubeUrl: youtubeUrl || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{initial?.id ? "Edit Scheme" : "Add New Scheme"}</h3>

      <div className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scheme title *" className="text-sm" required />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full min-h-[80px] px-3 py-2 rounded-md text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All parties</option>
            {parties.map((p) => <option key={p.id} value={String(p.id)}>{p.shortName} — {p.name}</option>)}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-md text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <Input
            type="date"
            value={dateAnnounced}
            onChange={(e) => setDateAnnounced(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Manifesto promise toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div
            onClick={() => setManifestoPromise((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${manifestoPromise ? "bg-amber-500" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${manifestoPromise ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">📜 Election Manifesto Promise</span>
            <p className="text-xs text-muted-foreground">Was this scheme promised in the election manifesto?</p>
          </div>
        </label>

        {/* Links */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Links</p>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
            <Input value={responseUrl} onChange={(e) => setResponseUrl(e.target.value)} placeholder="People's response URL" className="pl-9 text-sm" />
          </div>
          <div className="relative">
            <Newspaper className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
            <Input value={newspaperUrl} onChange={(e) => setNewspaperUrl(e.target.value)} placeholder="Newspaper article URL" className="pl-9 text-sm" />
          </div>
          <div className="relative">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-400" />
            <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="YouTube video URL" className="pl-9 text-sm" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={!title.trim() || saving}>
          {saving ? "Saving…" : initial?.id ? "Save Changes" : "Add Scheme"}
        </Button>
      </div>
    </form>
  );
}

function SchemeCard({ scheme, isAdmin, onEdit, onDelete }: {
  scheme: Scheme;
  isAdmin: boolean;
  onEdit: (s: Scheme) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">{scheme.title}</span>
            {scheme.manifestoPromise && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium border border-amber-500/20 flex-shrink-0">
                <BookOpen className="w-3 h-3" />Manifesto
              </span>
            )}
            <StatusBadge status={scheme.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {scheme.partyShortName && (
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${scheme.partyColor}20`, color: scheme.partyColor ?? undefined }}>
                {scheme.partyShortName}
              </span>
            )}
            {scheme.dateAnnounced && <span className="text-xs text-muted-foreground/60">{scheme.dateAnnounced}</span>}
          </div>
          {scheme.description && <p className="text-xs text-muted-foreground leading-relaxed">{scheme.description}</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEdit(scheme)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(scheme.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {(scheme.responseUrl || scheme.newspaperUrl || scheme.youtubeUrl) && (
        <div className="flex gap-3 flex-wrap pt-2 border-t border-border">
          {scheme.responseUrl && (
            <a href={scheme.responseUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
              <Link2 className="w-3 h-3" />People's response
            </a>
          )}
          {scheme.newspaperUrl && (
            <a href={scheme.newspaperUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              <Newspaper className="w-3 h-3" />Newspaper
            </a>
          )}
          {scheme.youtubeUrl && (
            <a href={scheme.youtubeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors">
              <Youtube className="w-3 h-3" />YouTube
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function Schemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterParty, setFilterParty] = useState<number | undefined>(undefined);
  const [filterManifesto, setFilterManifesto] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/schemes");
      const data = await r.json();
      setSchemes(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/parties").then((r) => r.json()).then(setParties).catch(() => {});
  }, []);

  const filtered = schemes
    .filter((s) => !filterParty || s.partyId === filterParty)
    .filter((s) => !filterManifesto || s.manifestoPromise)
    .filter((s) => !filterStatus || s.status === filterStatus)
    .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (data: Partial<Scheme>) => {
    const r = await fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!r.ok) { toast({ title: "Failed to add scheme", variant: "destructive" }); return; }
    toast({ title: "Scheme added" });
    setShowForm(false);
    load();
  };

  const handleEdit = async (data: Partial<Scheme>) => {
    if (!editingScheme) return;
    const r = await fetch(`/api/schemes/${editingScheme.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!r.ok) { toast({ title: "Failed to update scheme", variant: "destructive" }); return; }
    toast({ title: "Scheme updated" });
    setEditingScheme(null);
    load();
  };

  const handleDelete = async (id: number) => {
    const r = await fetch(`/api/schemes/${id}`, { method: "DELETE", headers: getAdminHeaders() });
    if (!r.ok) { toast({ title: "Failed to delete scheme", variant: "destructive" }); return; }
    toast({ title: "Scheme deleted" });
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Government Schemes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} scheme{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && !showForm && !editingScheme && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />Add Scheme
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <SchemeForm parties={parties} onSave={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {/* Party + filter tab bar */}
      <div className="flex gap-1.5 flex-wrap border-b border-border pb-3">
        <button onClick={() => setFilterParty(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!filterParty ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
        >All parties</button>
        {parties.map((party) => (
          <button key={party.id} onClick={() => setFilterParty(filterParty === party.id ? undefined : party.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterParty === party.id ? "text-white border-transparent shadow-sm" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            style={filterParty === party.id ? { backgroundColor: party.color } : {}}
          >{party.shortName}</button>
        ))}
        <button onClick={() => setFilterManifesto((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ml-auto ${filterManifesto ? "bg-amber-500 text-white border-transparent shadow-sm" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
        >📜 Manifesto</button>
      </div>

      {/* Search + status filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schemes…" className="pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[undefined, ...STATUS_OPTIONS.map((s) => s.value)].map((s) => (
            <button key={s ?? "all"} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{s === undefined ? "All status" : STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</button>
          ))}
        </div>
      </div>

      {/* Schemes list */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">No schemes yet</p>
            {isAdmin && <p className="text-muted-foreground/60 text-xs mt-1">Click "Add Scheme" to track government schemes.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((scheme) => (
            editingScheme?.id === scheme.id ? (
              <SchemeForm key={scheme.id} parties={parties} initial={editingScheme} onSave={handleEdit} onCancel={() => setEditingScheme(null)} />
            ) : (
              <SchemeCard key={scheme.id} scheme={scheme} isAdmin={isAdmin} onEdit={setEditingScheme} onDelete={handleDelete} />
            )
          ))}
        </div>
      )}
    </div>
  );
}
