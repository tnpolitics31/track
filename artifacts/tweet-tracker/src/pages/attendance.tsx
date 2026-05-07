import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";
import { PlusCircle, Trash2, ExternalLink, Pencil, CheckCircle2, XCircle, ShieldCheck, Calendar, Video } from "lucide-react";

type Status = "present" | "absent";

interface Member {
  id: number;
  slot: string;
  name: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  conservativeStatus: Status;
  speechUrl: string | null;
  opponent1Status: Status;
  opponent2Status: Status;
  opponent3Status: Status;
  notes: string | null;
  createdAt: string;
}

const SLOTS = ["conservative", "opponent_1", "opponent_2", "opponent_3"] as const;

function StatusPill({ status, onChange }: { status: Status; onChange?: (s: Status) => void }) {
  const isPresent = status === "present";
  const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold select-none transition-all";
  const cls = isPresent
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30";

  if (onChange) {
    return (
      <button
        type="button"
        onClick={() => onChange(isPresent ? "absent" : "present")}
        className={`${base} ${cls} cursor-pointer hover:opacity-80 active:scale-95`}
        title="Click to toggle"
      >
        {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {isPresent ? "Present" : "Absent"}
      </button>
    );
  }

  return (
    <span className={`${base} ${cls}`}>
      {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {isPresent ? "Present" : "Absent"}
    </span>
  );
}

function EditMembersModal({
  open,
  onClose,
  members,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSaved: (updated: Member) => void;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init: Record<string, string> = {};
    members.forEach((m) => { init[m.slot] = m.name; });
    setNames(init);
  }, [members]);

  const handleSave = async (slot: string) => {
    const name = names[slot]?.trim();
    if (!name) return;
    setSaving(slot);
    try {
      const res = await fetch(`/api/attendance/members/${slot}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onSaved(updated);
      toast({ title: "Name updated" });
    } catch {
      toast({ title: "Failed to update name", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const labels: Record<string, string> = {
    conservative: "Conservative Member",
    opponent_1: "Opponent 1",
    opponent_2: "Opponent 2",
    opponent_3: "Opponent 3",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Edit Member Names
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {SLOTS.map((slot) => (
            <div key={slot} className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">{labels[slot]}</label>
              <div className="flex gap-2">
                <Input
                  value={names[slot] ?? ""}
                  onChange={(e) => setNames((n) => ({ ...n, [slot]: e.target.value }))}
                  className="bg-background border-border text-sm h-8"
                  placeholder={labels[slot]}
                  onKeyDown={(e) => e.key === "Enter" && handleSave(slot)}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 shrink-0"
                  disabled={saving === slot || !names[slot]?.trim()}
                  onClick={() => handleSave(slot)}
                >
                  {saving === slot ? "…" : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddRecordModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (r: AttendanceRecord) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [conservativeStatus, setConservativeStatus] = useState<Status>("present");
  const [speechUrl, setSpeechUrl] = useState("");
  const [opponent1Status, setOpponent1Status] = useState<Status>("present");
  const [opponent2Status, setOpponent2Status] = useState<Status>("present");
  const [opponent3Status, setOpponent3Status] = useState<Status>("present");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setDate(today);
    setConservativeStatus("present");
    setSpeechUrl("");
    setOpponent1Status("present");
    setOpponent2Status("present");
    setOpponent3Status("present");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, conservativeStatus, speechUrl: speechUrl || null, opponent1Status, opponent2Status, opponent3Status, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const record = await res.json();
      onAdded(record);
      toast({ title: "Record added" });
      reset();
      onClose();
    } catch (err) {
      toast({ title: "Failed to add record", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); } }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-sm">
            <PlusCircle className="w-4 h-4 text-primary" />
            Add Attendance Record
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" />Session Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="bg-background border-border h-9 text-sm" />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conservative Member</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Attendance</span>
              <StatusPill status={conservativeStatus} onChange={setConservativeStatus} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Video className="w-3 h-3" />Speech Video URL</label>
              <Input
                value={speechUrl}
                onChange={(e) => setSpeechUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-background border-border h-8 text-xs"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opponents</p>
            {([
              ["Opponent 1", opponent1Status, setOpponent1Status],
              ["Opponent 2", opponent2Status, setOpponent2Status],
              ["Opponent 3", opponent3Status, setOpponent3Status],
            ] as [string, Status, (s: Status) => void][]).map(([label, status, setter]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{label}</span>
                <StatusPill status={status} onChange={setter} />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this session..." className="bg-background border-border h-8 text-xs" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-8 text-sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={!date || loading} className="flex-1 h-8 text-sm">
              {loading ? "Saving…" : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Attendance() {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, recordsRes] = await Promise.all([
        fetch("/api/attendance/members"),
        fetch("/api/attendance/records"),
      ]);
      const [membersData, recordsData] = await Promise.all([
        membersRes.json(),
        recordsRes.json(),
      ]);
      setMembers(membersData);
      setRecords(recordsData);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/attendance/records/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error();
      setRecords((r) => r.filter((rec) => rec.id !== id));
      setDeleteTarget(null);
      toast({ title: "Record deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getName = (slot: string) => members.find((m) => m.slot === slot)?.name ?? slot;

  const filtered = filterDate
    ? records.filter((r) => r.date === filterDate)
    : records;

  const conservativeName = getName("conservative");
  const opp1Name = getName("opponent_1");
  const opp2Name = getName("opponent_2");
  const opp3Name = getName("opponent_3");

  const presentCount = (status: Status) => status === "present" ? 1 : 0;
  const totalSessions = records.length;
  const conservativePresent = records.filter((r) => r.conservativeStatus === "present").length;
  const opp1Present = records.filter((r) => r.opponent1Status === "present").length;
  const opp2Present = records.filter((r) => r.opponent2Status === "present").length;
  const opp3Present = records.filter((r) => r.opponent3Status === "present").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Attendance & Speeches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            UN meeting attendance tracker — Conservative vs. Opponent comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditMembers(true)}
              className="gap-1.5 h-8 text-xs"
              data-testid="button-edit-members"
            >
              <Pencil className="w-3 h-3" />
              Edit Names
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 h-8 text-xs"
            data-testid="button-add-record"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {totalSessions > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { name: conservativeName, present: conservativePresent, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { name: opp1Name, present: opp1Present, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
            { name: opp2Name, present: opp2Present, color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20" },
            { name: opp3Name, present: opp3Present, color: "text-pink-500", bg: "bg-pink-500/10 border-pink-500/20" },
          ] as { name: string; present: number; color: string; bg: string }[]).map((m) => (
            <div key={m.name} className={`rounded-xl border p-3 ${m.bg}`}>
              <div className={`text-2xl font-bold tabular-nums ${m.color}`}>
                {m.present}<span className="text-sm font-normal text-muted-foreground">/{totalSessions}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">
                {totalSessions > 0 ? Math.round((m.present / totalSessions) * 100) : 0}% attendance
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Filter by date:</label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-card border-border h-8 text-xs w-36"
          />
          {filterDate && (
            <button onClick={() => setFilterDate("")} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          {filterDate ? ` on ${filterDate}` : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="text-primary">{conservativeName}</span>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Speech</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-orange-500/80 uppercase tracking-wider">{opp1Name}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-violet-500/80 uppercase tracking-wider">{opp2Name}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-pink-500/80 uppercase tracking-wider">{opp3Name}</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-5 bg-muted rounded animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Calendar className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No records yet.</p>
                      <p className="text-muted-foreground/60 text-xs">Click "Add Entry" to log your first attendance session.</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                  data-testid={`row-record-${record.id}`}
                >
                  <td className="px-4 py-3 text-xs text-foreground font-medium whitespace-nowrap">
                    {new Date(record.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.conservativeStatus as Status} />
                  </td>
                  <td className="px-3 py-3">
                    {record.speechUrl ? (
                      <a
                        href={record.speechUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        title={record.speechUrl}
                      >
                        <Video className="w-3 h-3" />
                        Watch
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.opponent1Status as Status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.opponent2Status as Status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.opponent3Status as Status} />
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(record.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        title="Delete record"
                        data-testid={`button-delete-record-${record.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddRecordModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={(r) => setRecords((prev) => [r, ...prev])}
      />

      <EditMembersModal
        open={showEditMembers}
        onClose={() => setShowEditMembers(false)}
        members={members}
        onSaved={(updated) => setMembers((prev) => prev.map((m) => m.slot === updated.slot ? updated : m))}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete this record?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the attendance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget !== null && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
