import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { AlertTriangle, Plus, Trash2, ExternalLink, MapPin, Calendar, User, ArrowLeft, CheckCircle2, XCircle, Plane, Megaphone, ShieldAlert, Star, FileText, HandMetal, HelpCircle, Circle, Clock, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";
import { getCategoryMeta } from "./issues";

interface Party { id: number; name: string; shortName: string; color: string; }
interface Politician { id: number; name: string; partyId: number | null; }
interface IssueAction {
  id: number; issueId: number; partyId: number; politicianId: number; actionType: string;
  description: string | null; sourceUrl: string | null; createdBy: string | null; createdAt: string;
  partyName: string | null; partyShortName: string | null; partyColor: string | null;
  politicianName: string | null;
}
interface LinkedTweet {
  id: number; url: string; authorName: string | null; authorHandle: string | null;
  content: string | null; type: string; sentiment: string | null;
  partyShortName: string | null; partyColor: string | null; createdAt: string;
}
interface IssueDetail {
  id: number; title: string; description: string | null; category: string; status: string;
  dateOccurred: string | null; sourceUrl: string | null; location: string | null;
  createdBy: string | null; createdAt: string; actions: IssueAction[]; linkedTweets: LinkedTweet[];
}

const ACTION_TYPES = [
  { value: "visited", label: "Visited", icon: <CheckCircle2 className="w-4 h-4" />, color: "#10b981" },
  { value: "protested", label: "Protested", icon: <HandMetal className="w-4 h-4" />, color: "#ef4444" },
  { value: "issued_statement", label: "Issued Statement", icon: <FileText className="w-4 h-4" />, color: "#3b82f6" },
  { value: "introduced_scheme", label: "Introduced Scheme", icon: <Star className="w-4 h-4" />, color: "#8b5cf6" },
  { value: "condemned", label: "Condemned", icon: <ShieldAlert className="w-4 h-4" />, color: "#f59e0b" },
  { value: "supported", label: "Supported", icon: <CheckCircle2 className="w-4 h-4" />, color: "#06b6d4" },
  { value: "objected", label: "Objected", icon: <Megaphone className="w-4 h-4" />, color: "#f97316" },
  { value: "absent", label: "Did Nothing / Absent", icon: <XCircle className="w-4 h-4" />, color: "#6b7280" },
  { value: "went_abroad", label: "Went Abroad", icon: <Plane className="w-4 h-4" />, color: "#6b7280" },
  { value: "did_nothing", label: "Silent / No Response", icon: <XCircle className="w-4 h-4" />, color: "#9ca3af" },
  { value: "other", label: "Other", icon: <HelpCircle className="w-4 h-4" />, color: "#6b7280" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "#ef4444", icon: <Circle className="w-3.5 h-3.5" /> },
  { value: "in_progress", label: "In Progress", color: "#f59e0b", icon: <Clock className="w-3.5 h-3.5" /> },
  { value: "resolved", label: "Resolved", color: "#10b981", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export function getActionMeta(value: string) {
  return ACTION_TYPES.find((a) => a.value === value) ?? ACTION_TYPES[ACTION_TYPES.length - 1];
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
      {meta.icon}{meta.label}
    </span>
  );
}

function ActionCard({ action, onDelete, isAdmin }: { action: IssueAction; onDelete: () => void; isAdmin: boolean }) {
  const meta = getActionMeta(action.actionType);
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 group hover:border-border/80 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {action.partyShortName && (
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${action.partyColor}20`, color: action.partyColor ?? undefined }}>
              {action.partyShortName}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          {action.politicianName && <span className="text-xs text-muted-foreground font-medium">{action.politicianName}</span>}
        </div>
        {isAdmin && (
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {action.description && <p className="text-sm text-foreground leading-relaxed">{action.description}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {action.sourceUrl && <a href={action.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><ExternalLink className="w-3 h-3" />Source</a>}
        {action.createdBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />{action.createdBy}</span>}
        <span>{new Date(action.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
}

const emptyForm = { partyId: "", politicianId: "", actionType: "issued_statement", description: "", sourceUrl: "", createdBy: "" };

export default function IssueDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState<IssueAction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linkTweetUrl, setLinkTweetUrl] = useState("");
  const [linking, setLinking] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const fetchIssue = () => {
    fetch(`/api/issues/${params.id}`)
      .then((r) => { if (!r.ok) { navigate("/issues"); return null; } return r.json(); })
      .then((d) => { if (d) { setIssue(d); setLoading(false); } });
  };

  useEffect(() => {
    fetchIssue();
    Promise.all([fetch("/api/parties").then((r) => r.json()), fetch("/api/politicians").then((r) => r.json())])
      .then(([p, pol]) => { setParties(p); setPoliticians(pol); });
  }, [params.id]);

  const handleAddAction = async () => {
    if (!form.actionType) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/issues/${params.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partyId: form.partyId ? Number(form.partyId) : null, politicianId: form.politicianId ? Number(form.politicianId) : null }),
      });
      if (!res.ok) { const d = await res.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Response logged" });
      setShowModal(false);
      setForm(emptyForm);
      fetchIssue();
    } finally { setSaving(false); }
  };

  const handleDeleteAction = async () => {
    if (!deleteAction) return;
    const res = await fetch(`/api/issues/${params.id}/actions/${deleteAction.id}`, { method: "DELETE", headers: getAdminHeaders() });
    if (res.ok) { toast({ title: "Response removed" }); fetchIssue(); }
    setDeleteAction(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIssue((prev) => prev ? { ...prev, status: updated.status } : prev);
        toast({ title: "Status updated" });
      }
    } finally { setUpdatingStatus(false); }
  };

  const handleLinkTweet = async () => {
    if (!linkTweetUrl.trim()) return;
    setLinking(true);
    try {
      // Find tweet by URL
      const res = await fetch(`/api/tweets?url=${encodeURIComponent(linkTweetUrl.trim())}`);
      const data = await res.json();
      const tweets = Array.isArray(data) ? data : (data.tweets ?? []);
      if (tweets.length === 0) {
        toast({ title: "Tweet not found", description: "Make sure this tweet is tracked first.", variant: "destructive" });
        return;
      }
      const tweet = tweets[0];
      const linkRes = await fetch(`/api/issues/${params.id}/tweet-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ tweetId: tweet.id }),
      });
      if (linkRes.status === 409) { toast({ title: "Already linked" }); return; }
      if (!linkRes.ok) { toast({ title: "Failed to link", variant: "destructive" }); return; }
      toast({ title: "Tweet linked" });
      setLinkTweetUrl("");
      setShowLinkModal(false);
      fetchIssue();
    } finally { setLinking(false); }
  };

  const handleUnlinkTweet = async (tweetId: number) => {
    await fetch(`/api/issues/${params.id}/tweet-links/${tweetId}`, { method: "DELETE", headers: getAdminHeaders() });
    fetchIssue();
  };

  const filteredPoliticians = form.partyId ? politicians.filter((p) => !p.partyId || p.partyId === Number(form.partyId)) : politicians;

  const actionsByParty: Record<string, IssueAction[]> = {};
  const unattributed: IssueAction[] = [];
  if (issue) {
    for (const action of issue.actions) {
      if (action.partyShortName) {
        if (!actionsByParty[action.partyShortName]) actionsByParty[action.partyShortName] = [];
        actionsByParty[action.partyShortName].push(action);
      } else {
        unattributed.push(action);
      }
    }
  }

  const categoryMeta = issue ? getCategoryMeta(issue.category) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/issues")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Issues
      </button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : !issue ? null : (
        <>
          {/* Issue header */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {categoryMeta && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-semibold" style={{ backgroundColor: `${categoryMeta.color}18`, color: categoryMeta.color }}>
                  {categoryMeta.emoji} {categoryMeta.label}
                </span>
              )}
              <StatusBadge status={issue.status} />
              {issue.location && <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{issue.location}</span>}
              {issue.dateOccurred && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{new Date(issue.dateOccurred).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>}
            </div>
            <h1 className="text-xl font-bold text-foreground">{issue.title}</h1>
            {issue.description && <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              {issue.sourceUrl && <a href={issue.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="w-3 h-3" />View Source</a>}
              {issue.createdBy && <span className="flex items-center gap-1"><User className="w-3 h-3" />Logged by {issue.createdBy}</span>}
              <span>Logged {new Date(issue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>

            {/* Status change — admin only */}
            {isAdmin && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground">Change status:</span>
                {STATUS_OPTIONS.map((s) => (
                  <button key={s.value}
                    disabled={issue.status === s.value || updatingStatus}
                    onClick={() => handleStatusChange(s.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40"
                    style={issue.status === s.value
                      ? { backgroundColor: `${s.color}18`, color: s.color, borderColor: `${s.color}40` }
                      : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--card)" }}
                  >
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked Tweets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />Linked Tweets
                <span className="text-sm font-normal text-muted-foreground">({issue.linkedTweets?.length ?? 0})</span>
              </h2>
              {isAdmin && (
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowLinkModal(true)}>
                  <Link2 className="w-3.5 h-3.5" />Link Tweet
                </Button>
              )}
            </div>
            {(!issue.linkedTweets || issue.linkedTweets.length === 0) ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                No tweets linked yet. Link tracked tweets as evidence.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                {issue.linkedTweets.map((tweet) => (
                  <div key={tweet.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors group">
                    {tweet.partyShortName && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${tweet.partyColor}25`, color: tweet.partyColor ?? undefined }}>
                        {tweet.partyShortName}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">{tweet.authorName ?? tweet.authorHandle}</div>
                      <div className="text-sm text-foreground line-clamp-2 leading-snug">{tweet.content}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3.5 h-3.5" /></a>
                      {isAdmin && (
                        <button onClick={() => handleUnlinkTweet(tweet.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Party responses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  Party Responses
                  <span className="text-sm font-normal text-muted-foreground">({issue.actions.length} total)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Anyone can log a party's response. Admin can remove incorrect entries.</p>
              </div>
              <Button onClick={() => setShowModal(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Log Response
              </Button>
            </div>

            {issue.actions.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <p className="text-muted-foreground text-sm">No party responses logged yet.</p>
                <Button onClick={() => setShowModal(true)} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Log First Response</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(actionsByParty).map(([partyKey, actions]) => {
                  const color = actions[0]?.partyColor ?? "#6b7280";
                  return (
                    <div key={partyKey} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-bold" style={{ color }}>{partyKey}</span>
                        <span className="text-xs text-muted-foreground">— {actions[0]?.partyName}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                        {actions.map((action) => (
                          <ActionCard key={action.id} action={action} isAdmin={isAdmin} onDelete={() => setDeleteAction(action)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {unattributed.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-muted-foreground">Other / General</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {unattributed.map((action) => (
                        <ActionCard key={action.id} action={action} isAdmin={isAdmin} onDelete={() => setDeleteAction(action)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Response Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log a Party Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">What action did they take? *</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTION_TYPES.map((at) => (
                  <button key={at.value} type="button" onClick={() => setForm((f) => ({ ...f, actionType: at.value }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${form.actionType === at.value ? "border-transparent text-white" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                    style={form.actionType === at.value ? { backgroundColor: at.color } : {}}
                  >
                    <span style={{ color: form.actionType === at.value ? "white" : at.color }}>{at.icon}</span>
                    {at.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Party</label>
                <select value={form.partyId} onChange={(e) => { setForm((f) => ({ ...f, partyId: e.target.value, politicianId: "" })); }} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option value="">— Select —</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.shortName} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Politician (optional)</label>
                <select value={form.politicianId} onChange={(e) => setForm((f) => ({ ...f, politicianId: e.target.value }))} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option value="">— Select —</option>
                  {filteredPoliticians.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What exactly did they do or say? Be specific..." rows={3} className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source URL (tweet / news article)</label>
              <Input value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name / Alias (optional)</label>
              <Input value={form.createdBy} onChange={(e) => setForm((f) => ({ ...f, createdBy: e.target.value }))} placeholder="Anonymous" className="bg-background border-border" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleAddAction} disabled={saving}>{saving ? "Saving…" : "Log Response"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Tweet Modal */}
      <Dialog open={showLinkModal} onOpenChange={(o) => !o && setShowLinkModal(false)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" />Link a Tweet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Paste the URL of a tweet you've already tracked to attach it as evidence for this issue.</p>
            <Input
              value={linkTweetUrl}
              onChange={(e) => setLinkTweetUrl(e.target.value)}
              placeholder="https://x.com/user/status/..."
              className="bg-background border-border"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
              <Button onClick={handleLinkTweet} disabled={linking || !linkTweetUrl.trim()}>
                {linking ? "Linking…" : "Link Tweet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAction} onOpenChange={(o) => !o && setDeleteAction(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove this response?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This will permanently remove the logged party response.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
