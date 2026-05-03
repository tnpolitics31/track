import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Trash2, RefreshCw, Clock, ExternalLink, AlertTriangle, CheckCheck, Square, CheckSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/admin";

interface PendingTweet {
  id: number;
  url: string;
  tweetId: string;
  authorHandle: string | null;
  authorName: string | null;
  content: string | null;
  type: string;
  sentiment: string | null;
  submittedByHandle: string | null;
  partyId: number | null;
  politicianId: number | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function getAdminHeaders(): Record<string, string> {
  const pw = sessionStorage.getItem("admin_password");
  return pw ? { "x-admin-password": pw, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    attack: { label: "Attack", className: "bg-red-500/15 text-red-500" },
    negative: { label: "Negative", className: "bg-orange-500/15 text-orange-500" },
    promise: { label: "Promise", className: "bg-blue-500/15 text-blue-500" },
    positive: { label: "Positive", className: "bg-emerald-500/15 text-emerald-500" },
    neutral: { label: "Neutral", className: "bg-muted text-muted-foreground" },
  };
  if (!sentiment) return null;
  const s = map[sentiment] ?? map.neutral;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.className}`}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">Approved</span>;
  if (status === "rejected") return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-500">Rejected</span>;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">Pending</span>;
}

export default function Approvals() {
  const [tweets, setTweets] = useState<PendingTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actioning, setActioning] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pending");
      const d = await r.json();
      setTweets(d);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? tweets : tweets.filter((t) => t.status === filter);
  const pendingCount = tweets.filter((t) => t.status === "pending").length;
  const pendingFiltered = filtered.filter((t) => t.status === "pending");

  const allSelected = pendingFiltered.length > 0 && pendingFiltered.every((t) => selected.has(t.id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingFiltered.map((t) => t.id)));
    }
  };

  const pollMentions = async () => {
    setPolling(true);
    try {
      const r = await fetch("/api/sync/mentions", { method: "POST", headers: getAdminHeaders() });
      const d = await r.json() as { queued: number; skipped: number; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Poll failed");
      toast({ title: `Mentions polled: ${d.queued} new submission${d.queued !== 1 ? "s" : ""} queued` });
      await load();
    } catch (e: unknown) {
      toast({ title: "Poll failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPolling(false);
    }
  };

  const action = async (id: number, endpoint: string, label: string) => {
    setActioning((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`/api/pending/${id}/${endpoint}`, { method: "POST", headers: getAdminHeaders() });
      if (!r.ok) throw new Error("Failed");
      toast({ title: label });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActioning((p) => ({ ...p, [id]: false }));
    }
  };

  const remove = async (id: number) => {
    setActioning((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`/api/pending/${id}`, { method: "DELETE", headers: getAdminHeaders() });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "Deleted" });
      await load();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setActioning((p) => ({ ...p, [id]: false }));
    }
  };

  const bulkAction = async (actionType: "approve" | "reject" | "delete", ids?: number[]) => {
    const targetIds = ids ?? Array.from(selected);
    if (targetIds.length === 0) return;
    setBulkActioning(true);
    try {
      const r = await fetch("/api/pending/bulk", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ ids: targetIds, action: actionType }),
      });
      const d = await r.json() as { ok: boolean; done: number };
      if (!r.ok) throw new Error("Bulk action failed");
      const label = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "deleted";
      toast({ title: `${d.done} submission${d.done !== 1 ? "s" : ""} ${label}` });
      await load();
    } catch (e: unknown) {
      toast({ title: "Bulk action failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBulkActioning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Community Submissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tweets submitted when users tag the bot account in a reply
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={pollMentions} disabled={polling || !isAdmin} className="gap-1.5 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${polling ? "animate-spin" : ""}`} />
          Poll Mentions
        </Button>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Log in as admin to approve or reject submissions and poll for new mentions.
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelected(new Set()); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "pending" && pendingCount > 0 ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="ml-auto">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={load} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Bulk action toolbar — shown when there are pending items */}
      {isAdmin && !loading && pendingFiltered.length > 0 && (
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2.5 flex-wrap">
          {/* Select all toggle */}
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            {allSelected ? "Deselect all" : `Select all (${pendingFiltered.length})`}
          </button>

          <div className="w-px h-4 bg-border" />

          {/* Approve All */}
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => bulkAction("approve", pendingFiltered.map((t) => t.id))}
            disabled={bulkActioning}
            title="Approve all pending"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Approve All
          </Button>

          {/* Reject All */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => bulkAction("reject", pendingFiltered.map((t) => t.id))}
            disabled={bulkActioning}
            title="Reject all pending"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject All
          </Button>

          {/* Selected actions — only shown when something is selected */}
          {someSelected && (
            <>
              <div className="w-px h-4 bg-border" />
              <span className="text-xs text-muted-foreground shrink-0">{selected.size} selected</span>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => bulkAction("approve")}
                disabled={bulkActioning}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => bulkAction("reject")}
                disabled={bulkActioning}
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => bulkAction("delete")}
                disabled={bulkActioning}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No {filter === "all" ? "" : filter} submissions</p>
          {filter === "pending" && (
            <p className="text-xs mt-1 opacity-70">When someone tags the bot in a reply, the parent tweet will appear here</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tweet) => {
            const isPending = tweet.status === "pending";
            const isSelected = selected.has(tweet.id);
            return (
              <div
                key={tweet.id}
                className={`bg-card border rounded-xl p-4 space-y-3 transition-colors ${
                  isSelected ? "border-primary/50 bg-primary/5" : "border-border"
                }`}
              >
                {/* Top row */}
                <div className="flex items-start gap-2">
                  {/* Checkbox — only for pending items in admin mode */}
                  {isAdmin && isPending && (
                    <button
                      onClick={() => toggleSelect(tweet.id)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{tweet.authorName ?? tweet.authorHandle ?? "Unknown"}</span>
                      {tweet.authorHandle && <span className="text-xs text-muted-foreground">@{tweet.authorHandle}</span>}
                      <SentimentBadge sentiment={tweet.sentiment} />
                      <StatusBadge status={tweet.status} />
                    </div>
                    {tweet.submittedByHandle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Submitted by <span className="font-medium">@{tweet.submittedByHandle}</span>
                      </p>
                    )}
                  </div>

                  <a
                    href={tweet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="View tweet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Content */}
                {tweet.content && (
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4 bg-muted/30 rounded-lg px-3 py-2">
                    {tweet.content}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="capitalize bg-muted px-1.5 py-0.5 rounded">{tweet.type}</span>
                  <span>{new Date(tweet.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>

                {/* Per-card actions — admin + pending only */}
                {isAdmin && isPending && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => action(tweet.id, "approve", "Tweet approved and added to tracker")}
                      disabled={actioning[tweet.id]}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => action(tweet.id, "reject", "Submission rejected")}
                      disabled={actioning[tweet.id]}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => remove(tweet.id)}
                      disabled={actioning[tweet.id]}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Revoke — admin only, rejected items */}
                {isAdmin && tweet.status === "rejected" && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => action(tweet.id, "revoke", "Rejection revoked — back to pending")}
                      disabled={actioning[tweet.id]}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revoke Rejection
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => remove(tweet.id)}
                      disabled={actioning[tweet.id]}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
