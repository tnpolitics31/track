import { useEffect, useState } from "react";
import { Calendar, Plus, Pencil, Trash2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";

interface PoliticalEvent {
  id: number; name: string; description: string | null;
  startDate: string | null; endDate: string | null;
  createdAt: string; tweetCount: number;
}

const emptyForm = { name: "", description: "", startDate: "", endDate: "" };

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default function Events() {
  const [events, setEvents] = useState<PoliticalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PoliticalEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PoliticalEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchEvents = () => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => { setEvents(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (e: PoliticalEvent) => {
    setEditTarget(e);
    setForm({ name: e.name, description: e.description ?? "", startDate: e.startDate ?? "", endDate: e.endDate ?? "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/events/${editTarget.id}` : "/api/events";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...getAdminHeaders() }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: editTarget ? "Event updated" : "Event created" });
      setShowModal(false);
      fetchEvents();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE", headers: getAdminHeaders() });
    if (res.ok) { toast({ title: "Event deleted" }); fetchEvents(); }
    setDeleteTarget(null);
  };

  const totalTweets = events.reduce((s, e) => s + (e.tweetCount ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Events & Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""} · {totalTweets} tagged tweet{totalTweets !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No events added yet.</p>
          {isAdmin && <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Add First Event</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 hover:border-border/80 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{event.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 bg-muted/50 px-2 py-0.5 rounded">
                    <FileText className="w-3 h-3" />
                    {event.tweetCount} tweet{event.tweetCount !== 1 ? "s" : ""}
                  </div>
                </div>
                {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                {(event.startDate || event.endDate) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {event.startDate && <span>{formatDate(event.startDate)}</span>}
                    {event.startDate && event.endDate && <span>→</span>}
                    {event.endDate && <span>{formatDate(event.endDate)}</span>}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => openEdit(event)}><Pencil className="w-3 h-3" />Edit</Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(event)}><Trash2 className="w-3 h-3" />Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editTarget ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Event Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 2026 Tamil Nadu Elections" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the event..." rows={3} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="bg-background border-border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Create Event"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">Tweets tagged with this event will lose the link but not be deleted.</AlertDialogDescription>
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
