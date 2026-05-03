import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTweets,
  useRefreshTweet,
  useGetTweetStats,
  getListTweetsQueryKey,
  getGetTweetStatsQueryKey,
  getGetTweetGalleryQueryKey,
} from "@workspace/api-client-react";
import type { Tweet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin, getAdminHeaders } from "@/contexts/admin";
import { Clipboard, RefreshCw, Trash2, ExternalLink, FileText, Image, LayoutGrid, HelpCircle, Search, X, Database, Download, Loader2, AlertTriangle, CheckCircle2, User } from "lucide-react";

interface TweetPreview {
  tweetId: string;
  authorHandle: string | null;
  authorName: string | null;
  content: string | null;
  isDuplicate: boolean;
  existingId: number | null;
  detectedPoliticianId: number | null;
  detectedPoliticianName: string | null;
  detectedPartyId: number | null;
  detectedPartyShortName: string | null;
}

interface Party { id: number; name: string; shortName: string; color: string; }
interface Politician { id: number; name: string; partyId: number | null; twitterHandle: string | null; }
interface PoliticalEvent { id: number; name: string; }

interface TrackedTweet extends Tweet {
  partyId?: number | null;
  politicianId?: number | null;
  eventId?: number | null;
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    text: { label: "Text", className: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: <FileText className="w-3 h-3" /> },
    image: { label: "Image", className: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: <Image className="w-3 h-3" /> },
    mixed: { label: "Mixed", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: <LayoutGrid className="w-3 h-3" /> },
    unknown: { label: "Unknown", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: <HelpCircle className="w-3 h-3" /> },
  };
  const c = config[type] ?? config.unknown;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>{c.icon}{c.label}</span>;
}

function PartyBadge({ parties, partyId }: { parties: Party[]; partyId?: number | null }) {
  const party = parties.find((p) => p.id === partyId);
  if (!party) return null;
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: `${party.color}20`, color: party.color }}>
      {party.shortName}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function TweetDetailDialog({ tweet, open, onClose, onDelete, onRefresh, isAdmin, parties, politicians, events, onTagsUpdate }: {
  tweet: TrackedTweet | null; open: boolean; onClose: () => void;
  onDelete: (id: number) => void; onRefresh: (id: number) => void; isAdmin: boolean;
  parties: Party[]; politicians: Politician[]; events: PoliticalEvent[];
  onTagsUpdate: () => void;
}) {
  const [partyId, setPartyId] = useState<string>("");
  const [politicianId, setPoliticianId] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tweet) {
      setPartyId(tweet.partyId?.toString() ?? "");
      setPoliticianId(tweet.politicianId?.toString() ?? "");
      setEventId(tweet.eventId?.toString() ?? "");
    }
  }, [tweet]);

  if (!tweet) return null;

  const filteredPoliticians = partyId ? politicians.filter((p) => !p.partyId || p.partyId === Number(partyId)) : politicians;

  const handleSaveTags = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tweets/${tweet.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ partyId: partyId ? Number(partyId) : null, politicianId: politicianId ? Number(politicianId) : null, eventId: eventId ? Number(eventId) : null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Tags updated" });
      onTagsUpdate();
    } catch {
      toast({ title: "Failed to update tags", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <TypeBadge type={tweet.type} />
            <span className="text-sm font-normal text-muted-foreground truncate">{tweet.url}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {tweet.screenshotUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={tweet.screenshotUrl} alt="Tweet screenshot" className="w-full object-cover" />
            </div>
          )}
          {tweet.authorName && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{tweet.authorName[0]?.toUpperCase()}</div>
              <div>
                <div className="text-sm font-medium text-foreground">{tweet.authorName}</div>
                {tweet.authorHandle && <div className="text-xs text-muted-foreground">@{tweet.authorHandle}</div>}
              </div>
            </div>
          )}
          {tweet.content && <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border">{tweet.content}</p>}
          {tweet.notes && <div className="text-sm text-muted-foreground"><span className="text-xs uppercase tracking-wider text-muted-foreground/60">Notes: </span>{tweet.notes}</div>}
          {tweet.tags && (
            <div className="flex flex-wrap gap-1">
              {tweet.tags.split(",").map((tag) => <span key={tag.trim()} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{tag.trim()}</span>)}
            </div>
          )}

          {/* Tag assignment — admin only */}
          {isAdmin && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Tags</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Party</label>
                  <select value={partyId} onChange={(e) => { setPartyId(e.target.value); setPoliticianId(""); }} className="w-full rounded border border-border bg-background text-foreground text-xs px-2 py-1.5">
                    <option value="">None</option>
                    {parties.map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Politician</label>
                  <select value={politicianId} onChange={(e) => setPoliticianId(e.target.value)} className="w-full rounded border border-border bg-background text-foreground text-xs px-2 py-1.5">
                    <option value="">None</option>
                    {filteredPoliticians.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Event</label>
                  <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded border border-border bg-background text-foreground text-xs px-2 py-1.5">
                    <option value="">None</option>
                    {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <Button size="sm" onClick={handleSaveTags} disabled={saving} className="text-xs h-7">{saving ? "Saving…" : "Save Tags"}</Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Tracked {new Date(tweet.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => window.open(tweet.url, "_blank")} className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" />Open Tweet</Button>
            <Button variant="outline" size="sm" onClick={() => onRefresh(tweet.id)} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
            {isAdmin && <Button variant="destructive" size="sm" onClick={() => { onDelete(tweet.id); onClose(); }} className="gap-1.5 ml-auto"><Trash2 className="w-3.5 h-3.5" />Delete</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function exportCSV(tweets: TrackedTweet[], parties: Party[], politicians: Politician[], events: PoliticalEvent[]) {
  const header = ["ID", "URL", "Author", "Handle", "Content", "Type", "Party", "Politician", "Event", "Tags", "Notes", "Date"];
  const rows = tweets.map((t) => [
    t.id,
    t.url,
    t.authorName ?? "",
    t.authorHandle ?? "",
    (t.content ?? "").replace(/"/g, '""'),
    t.type,
    parties.find((p) => p.id === t.partyId)?.shortName ?? "",
    politicians.find((p) => p.id === t.politicianId)?.name ?? "",
    events.find((e) => e.id === t.eventId)?.name ?? "",
    t.tags ?? "",
    t.notes ?? "",
    new Date(t.createdAt).toISOString(),
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `tweets-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Tracker() {
  const [urlInput, setUrlInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [partyIdInput, setPartyIdInput] = useState("");
  const [politicianIdInput, setPoliticianIdInput] = useState("");
  const [eventIdInput, setEventIdInput] = useState("");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterParty, setFilterParty] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selectedTweet, setSelectedTweet] = useState<TrackedTweet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [preview, setPreview] = useState<{ loading: boolean; data: TweetPreview | null; error: string | null }>({
    loading: false, data: null, error: null,
  });
  const previewAbortRef = useRef<AbortController | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [parties, setParties] = useState<Party[]>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [events, setEvents] = useState<PoliticalEvent[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    Promise.all([fetch("/api/parties").then((r) => r.json()), fetch("/api/politicians").then((r) => r.json()), fetch("/api/events").then((r) => r.json())])
      .then(([p, pol, ev]) => { setParties(p); setPoliticians(pol); setEvents(ev); });
  }, []);

  // Debounced preview fetch when URL input changes
  useEffect(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (previewAbortRef.current) previewAbortRef.current.abort();

    const trimmed = urlInput.trim();
    const isTweet = /(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/.test(trimmed);

    if (!trimmed || !isTweet) {
      setPreview({ loading: false, data: null, error: null });
      return;
    }

    setPreview({ loading: true, data: null, error: null });

    previewTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      previewAbortRef.current = controller;
      try {
        const res = await fetch(`/api/tweets/preview?url=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) {
          setPreview({ loading: false, data: null, error: data.error ?? "Could not read tweet" });
          return;
        }
        setPreview({ loading: false, data: data as TweetPreview, error: null });
        // Auto-fill party/politician dropdowns if not already set
        if (data.detectedPartyId && !partyIdInput) setPartyIdInput(String(data.detectedPartyId));
        if (data.detectedPoliticianId && !politicianIdInput) setPoliticianIdInput(String(data.detectedPoliticianId));
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setPreview({ loading: false, data: null, error: "Could not read tweet" });
      }
    }, 600);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput]);

  const params = {
    ...(filterType ? { type: filterType as "text" | "image" | "mixed" } : {}),
    ...(search ? { search } : {}),
  };

  const { data: rawTweets, isLoading } = useListTweets(params, { query: { queryKey: getListTweetsQueryKey(params) } });
  const { data: stats } = useGetTweetStats({ query: { queryKey: getGetTweetStatsQueryKey() } });

  const tweets: TrackedTweet[] = (rawTweets ?? []) as TrackedTweet[];

  const filteredTweets = filterParty ? tweets.filter((t) => t.partyId === filterParty) : tweets;

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTweetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTweetStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
  }, [queryClient]);

  const refreshTweet = useRefreshTweet({ mutation: { onSuccess: () => { refreshList(); toast({ title: "Tweet refreshed" }); } } });

  const isProfileUrl = (url: string) => /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?$/.test(url.trim());
  const isTweetUrl = (url: string) => /(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/.test(url.trim());
  const isTwitterDomain = (url: string) => url.includes("twitter.com") || url.includes("x.com");

  const urlError: string | null = (() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return null;
    if (isProfileUrl(trimmed)) return "That's a profile URL — paste a link to a specific tweet instead.";
    if (isTwitterDomain(trimmed) && !isTweetUrl(trimmed)) return "URL must link to a specific tweet (e.g. x.com/user/status/…).";
    return null;
  })();

  const clearForm = () => {
    setUrlInput(""); setNotesInput(""); setTagsInput("");
    setPartyIdInput(""); setPoliticianIdInput(""); setEventIdInput("");
    setPreview({ loading: false, data: null, error: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || urlError || submitting) return;
    if (preview.data?.isDuplicate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          notes: notesInput || undefined,
          tags: tagsInput || undefined,
          partyId: partyIdInput ? Number(partyIdInput) : undefined,
          politicianId: politicianIdInput ? Number(politicianIdInput) : undefined,
          eventId: eventIdInput ? Number(eventIdInput) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error ?? "Failed to track tweet.", variant: "destructive" }); return; }
      clearForm();
      refreshList();
      toast({ title: "Tweet tracked", description: "Successfully analyzed and screenshotted." });
    } finally { setSubmitting(false); }
  };

  const handlePaste = async () => {
    try { const text = await navigator.clipboard.readText(); setUrlInput(text); }
    catch { toast({ title: "Paste failed", description: "Allow clipboard access.", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/tweets/${id}`, { method: "DELETE", headers: getAdminHeaders() });
      if (!res.ok) throw new Error();
      refreshList();
      setDeleteTarget(null);
      toast({ title: "Tweet removed" });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const filteredPoliticians = partyIdInput ? politicians.filter((p) => !p.partyId || p.partyId === Number(partyIdInput)) : politicians;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <StatCard label="Total Tracked" value={stats.total} />
          <StatCard label="Text Only" value={stats.textOnly} />
          <StatCard label="Image Based" value={stats.imageBased} />
          <StatCard label="Mixed" value={stats.mixed} />
          <StatCard label="Screenshots" value={stats.withScreenshots} />
          <StatCard label="Added Today" value={stats.recentlyAdded} />
        </div>
      )}

      {/* Input form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Track a Tweet</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste a Twitter / X tweet URL..."
                className={`bg-background border-border text-foreground placeholder:text-muted-foreground pr-10 ${urlError ? "border-destructive focus-visible:ring-destructive/30" : preview.data && !preview.data.isDuplicate ? "border-emerald-500/50" : ""}`}
                disabled={submitting}
              />
              {preview.loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
              {urlInput && !preview.loading && <button type="button" onClick={clearForm} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
              {urlError && <p className="absolute left-0 -bottom-5 text-xs text-destructive">{urlError}</p>}
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handlePaste} title="Paste from clipboard" disabled={submitting}><Clipboard className="w-4 h-4" /></Button>
          </div>

          {/* Live preview card */}
          {(preview.loading || preview.data || preview.error) && (
            <div className={`rounded-lg border p-3 text-sm transition-all ${
              preview.loading ? "border-border bg-muted/20" :
              preview.data?.isDuplicate ? "border-amber-500/40 bg-amber-500/5" :
              preview.error ? "border-destructive/40 bg-destructive/5" :
              "border-emerald-500/40 bg-emerald-500/5"
            }`}>
              {preview.loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading tweet…
                </div>
              )}
              {preview.error && (
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {preview.error}
                </div>
              )}
              {preview.data && (
                <div className="space-y-2">
                  {/* Duplicate warning */}
                  {preview.data.isDuplicate && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Already tracked — this tweet is in the database.
                    </div>
                  )}
                  {!preview.data.isDuplicate && (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Tweet found · ready to track
                      {preview.data.detectedPoliticianName && (
                        <span className="text-muted-foreground font-normal ml-1">
                          · auto-detected: <strong>{preview.data.detectedPoliticianName}</strong>
                          {preview.data.detectedPartyShortName && ` (${preview.data.detectedPartyShortName})`}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Author + content */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                      {preview.data.authorName ? preview.data.authorName[0]?.toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{preview.data.authorName ?? "Unknown"}</span>
                        {preview.data.authorHandle && <span className="text-xs text-muted-foreground">@{preview.data.authorHandle}</span>}
                        {preview.data.detectedPartyShortName && (() => {
                          const party = parties.find((p) => p.shortName === preview.data!.detectedPartyShortName);
                          return party ? (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${party.color}20`, color: party.color }}>{party.shortName}</span>
                          ) : null;
                        })()}
                      </div>
                      {preview.data.content && (
                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed line-clamp-3 whitespace-pre-wrap">{preview.data.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags / Notes row */}
          <div className={`grid grid-cols-2 gap-2 ${urlError ? "mt-6" : ""}`}>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma-sep)" className="bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9" disabled={submitting} />
            <Input value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Notes (optional)" className="bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9" disabled={submitting} />
          </div>
          {/* Dropdowns + submit row */}
          <div className="grid grid-cols-3 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <Select value={partyIdInput} onValueChange={(v) => { setPartyIdInput(v === "__none" ? "" : v); setPoliticianIdInput(""); }} disabled={submitting}>
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="Party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">All parties</SelectItem>
                {parties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.shortName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={politicianIdInput} onValueChange={(v) => setPoliticianIdInput(v === "__none" ? "" : v)} disabled={submitting}>
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="Politician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">All</SelectItem>
                {filteredPoliticians.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={eventIdInput} onValueChange={(v) => setEventIdInput(v === "__none" ? "" : v)} disabled={submitting}>
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No event</SelectItem>
                {events.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={!urlInput.trim() || !!urlError || submitting || preview.data?.isDuplicate === true}
              className="whitespace-nowrap col-span-3 sm:col-span-1 h-9"
            >
              {submitting ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</span> : "Track Tweet"}
            </Button>
          </div>
          {submitting && <p className="text-xs text-muted-foreground animate-pulse">Detecting tweet type and capturing screenshot — this takes 10-15 seconds…</p>}
        </form>
      </div>

      {/* Filters + CSV export */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search content..." className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[undefined, "text", "image", "mixed"].map((t) => (
            <button key={t ?? "all"} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{t === undefined ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterParty(undefined)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterParty === undefined ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>All parties</button>
          {parties.map((party) => (
            <button key={party.id} onClick={() => setFilterParty(filterParty === party.id ? undefined : party.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors border ${filterParty === party.id ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
              style={filterParty === party.id ? { backgroundColor: party.color } : {}}
            >{party.shortName}</button>
          ))}
        </div>
        {tweets.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs ml-auto" onClick={() => exportCSV(filteredTweets, parties, politicians, events)}>
            <Download className="w-3.5 h-3.5" />Export CSV
          </Button>
        )}
      </div>

      {/* Tweet table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Party</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Date</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))}
              {!isLoading && filteredTweets.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Database className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No tweets found.</p>
                  </div>
                </td></tr>
              )}
              {!isLoading && filteredTweets.map((tweet) => (
                <tr key={tweet.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => setSelectedTweet(tweet)}>
                  <td className="px-4 py-3"><TypeBadge type={tweet.type} /></td>
                  <td className="px-4 py-3"><PartyBadge parties={parties} partyId={tweet.partyId} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium text-xs truncate max-w-[120px]">{tweet.authorName ?? tweet.authorHandle ?? "—"}</span>
                      {tweet.authorHandle && tweet.authorName && <span className="text-muted-foreground text-xs">@{tweet.authorHandle}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-foreground text-xs leading-relaxed line-clamp-2 max-w-sm">{tweet.content ?? tweet.url}</span></td>
                  <td className="px-4 py-3">
                    {tweet.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {tweet.tags.split(",").slice(0, 2).map((tag) => <span key={tag.trim()} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{tag.trim()}</span>)}
                      </div>
                    ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(tweet.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={(e) => { e.stopPropagation(); window.open(tweet.url, "_blank"); }} className="p-1 text-muted-foreground hover:text-foreground" title="Open tweet"><ExternalLink className="w-3.5 h-3.5" /></button>
                      {isAdmin && <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(tweet.id); }} className="p-1 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TweetDetailDialog tweet={selectedTweet} open={!!selectedTweet} onClose={() => setSelectedTweet(null)}
        onDelete={(id) => { setDeleteTarget(id); setSelectedTweet(null); }}
        onRefresh={(id) => refreshTweet.mutate({ id })}
        isAdmin={isAdmin} parties={parties} politicians={politicians} events={events}
        onTagsUpdate={() => { refreshList(); setSelectedTweet(null); }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove this tweet?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This will permanently remove the tweet and its screenshot from your tracker.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget !== null) handleDelete(deleteTarget); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
