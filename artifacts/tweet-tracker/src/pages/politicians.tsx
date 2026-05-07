import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Plus, Pencil, Trash2, Search, Twitter, MapPin, Briefcase, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";

interface Party { id: number; name: string; shortName: string; color: string; }
interface Politician {
  id: number; name: string; partyId: number | null; twitterHandle: string | null;
  constituency: string | null; role: string | null; bio: string | null; createdAt: string;
  partyName: string | null; partyShortName: string | null; partyColor: string | null;
}

function profileCompletion(pol: Politician): number {
  const fields = [pol.name, pol.twitterHandle, pol.role, pol.constituency, pol.bio, pol.partyId];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

const emptyForm = { name: "", partyId: "", twitterHandle: "", constituency: "", role: "", bio: "" };

export default function Politicians() {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterParty, setFilterParty] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Politician | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Politician | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchAll = async () => {
    const [polRes, partyRes] = await Promise.all([fetch("/api/politicians"), fetch("/api/parties")]);
    const [pols, parties] = await Promise.all([polRes.json(), partyRes.json()]);
    setPoliticians(pols);
    setParties(parties);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: Politician) => {
    setEditTarget(p);
    setForm({ name: p.name, partyId: p.partyId?.toString() ?? "", twitterHandle: p.twitterHandle ?? "", constituency: p.constituency ?? "", role: p.role ?? "", bio: p.bio ?? "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/politicians/${editTarget.id}` : "/api/politicians";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...getAdminHeaders() }, body: JSON.stringify({ ...form, partyId: form.partyId ? Number(form.partyId) : null }) });
      if (!res.ok) { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: editTarget ? "Politician updated" : "Politician added" });
      setShowModal(false);
      fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/politicians/${deleteTarget.id}`, { method: "DELETE", headers: getAdminHeaders() });
    if (res.ok) { toast({ title: "Deleted" }); fetchAll(); }
    setDeleteTarget(null);
  };

  const filtered = politicians.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.twitterHandle?.toLowerCase().includes(search.toLowerCase());
    const matchParty = filterParty === null || p.partyId === filterParty;
    return matchSearch && matchParty;
  });

  const incompleteCount = politicians.filter((p) => profileCompletion(p) < 100).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />Politicians
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {politicians.length} tracked
            {incompleteCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                <AlertCircle className="w-3.5 h-3.5" />{incompleteCount} incomplete profile{incompleteCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />Add Politician
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or handle..." className="pl-9 bg-card border-border" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterParty(null)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterParty === null ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>All</button>
          {parties.map((party) => (
            <button key={party.id} onClick={() => setFilterParty(filterParty === party.id ? null : party.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors border ${filterParty === party.id ? "text-white border-transparent" : "text-muted-foreground hover:text-foreground border-border bg-card"}`}
              style={filterParty === party.id ? { backgroundColor: party.color, borderColor: party.color } : {}}
            >{party.shortName}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{search || filterParty ? "No politicians match your filter." : "No politicians added yet."}</p>
          {isAdmin && !search && !filterParty && <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Add First Politician</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((pol) => {
            const pct = profileCompletion(pol);
            return (
              <div key={pol.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-border/80 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/politicians/${pol.id}`} className="flex-1 min-w-0 hover:underline">
                    <div className="font-semibold text-foreground truncate">{pol.name}</div>
                    {pol.twitterHandle && (
                      <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                        <Twitter className="w-3 h-3" />@{pol.twitterHandle}
                      </div>
                    )}
                  </Link>
                  {pol.partyShortName && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${pol.partyColor}20`, color: pol.partyColor ?? undefined }}>
                      {pol.partyShortName}
                    </span>
                  )}
                </div>
                {pol.role && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Briefcase className="w-3 h-3 flex-shrink-0" /><span className="truncate">{pol.role}</span></div>}
                {pol.constituency && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{pol.constituency}</span></div>}
                {pol.bio && <p className="text-xs text-muted-foreground line-clamp-2">{pol.bio}</p>}

                {/* Profile completion bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Profile</span>
                    <span className={pct === 100 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : "text-red-400"}>{pct}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 flex-1" onClick={() => openEdit(pol)}><Pencil className="w-3 h-3" />Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive flex-1" onClick={() => setDeleteTarget(pol)}><Trash2 className="w-3 h-3" />Delete</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editTarget ? "Edit Politician" : "Add Politician"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. M.K. Stalin" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Party</label>
              <select value={form.partyId} onChange={(e) => setForm((f) => ({ ...f, partyId: e.target.value }))} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">
                <option value="">— Select party —</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.shortName})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Twitter / X Handle</label>
              <Input value={form.twitterHandle} onChange={(e) => setForm((f) => ({ ...f, twitterHandle: e.target.value }))} placeholder="@handle (without @)" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Role / Position</label>
                <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Chief Minister" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Constituency</label>
                <Input value={form.constituency} onChange={(e) => setForm((f) => ({ ...f, constituency: e.target.value }))} placeholder="e.g. Kolathur" className="bg-background border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio (optional)</label>
              <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Short description..." rows={3} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Add Politician"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This will permanently remove the politician. Associated tweet tags will remain but lose the link.</AlertDialogDescription>
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
