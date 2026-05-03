import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTweets,
  useCreateTweet,
  useDeleteTweet,
  useRefreshTweet,
  useGetTweetStats,
  getListTweetsQueryKey,
  getGetTweetStatsQueryKey,
  getGetTweetGalleryQueryKey,
} from "@workspace/api-client-react";
import type { Tweet } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, RefreshCw, Trash2, ExternalLink, FileText, Image, LayoutGrid, HelpCircle, Search, X, Database } from "lucide-react";

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    text: { label: "Text", className: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: <FileText className="w-3 h-3" /> },
    image: { label: "Image", className: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: <Image className="w-3 h-3" /> },
    mixed: { label: "Mixed", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: <LayoutGrid className="w-3 h-3" /> },
    unknown: { label: "Unknown", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: <HelpCircle className="w-3 h-3" /> },
  };
  const c = config[type] ?? config.unknown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-primary mt-1">{sub}</div>}
    </div>
  );
}

function TweetDetailDialog({
  tweet,
  open,
  onClose,
  onDelete,
  onRefresh,
}: {
  tweet: Tweet | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
  onRefresh: (id: number) => void;
}) {
  if (!tweet) return null;
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
              <img
                src={tweet.screenshotUrl}
                alt="Tweet screenshot"
                className="w-full object-cover"
                data-testid="detail-screenshot"
              />
            </div>
          )}
          {tweet.authorName && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {tweet.authorName[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{tweet.authorName}</div>
                {tweet.authorHandle && <div className="text-xs text-muted-foreground">@{tweet.authorHandle}</div>}
              </div>
            </div>
          )}
          {tweet.content && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border">
              {tweet.content}
            </p>
          )}
          {tweet.notes && (
            <div className="text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Notes: </span>
              {tweet.notes}
            </div>
          )}
          {tweet.tags && (
            <div className="flex flex-wrap gap-1">
              {tweet.tags.split(",").map((tag) => (
                <span key={tag.trim()} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Tracked {new Date(tweet.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(tweet.url, "_blank")}
              data-testid="button-open-tweet"
              className="gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Tweet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(tweet.id)}
              data-testid="button-refresh-tweet"
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(tweet.id); onClose(); }}
              data-testid="button-delete-tweet"
              className="gap-1.5 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Tracker() {
  const [urlInput, setUrlInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selectedTweet, setSelectedTweet] = useState<Tweet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(filterType ? { type: filterType as "text" | "image" | "mixed" } : {}),
    ...(search ? { search } : {}),
  };

  const { data: tweets, isLoading } = useListTweets(params, {
    query: { queryKey: getListTweetsQueryKey(params) },
  });
  const { data: stats } = useGetTweetStats({ query: { queryKey: getGetTweetStatsQueryKey() } });

  const createTweet = useCreateTweet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTweetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
        setUrlInput("");
        setNotesInput("");
        setTagsInput("");
        toast({ title: "Tweet tracked", description: "Successfully analyzed and screenshotted." });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to track tweet.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const deleteTweet = useDeleteTweet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTweetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
        toast({ title: "Tweet removed" });
      },
    },
  });

  const refreshTweet = useRefreshTweet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTweetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
        toast({ title: "Tweet refreshed" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    createTweet.mutate({ data: { url: urlInput.trim(), notes: notesInput || undefined, tags: tagsInput || undefined } });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
    } catch {
      toast({ title: "Paste failed", description: "Allow clipboard access to paste.", variant: "destructive" });
    }
  };

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
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste a Twitter / X URL..."
                className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10"
                data-testid="input-tweet-url"
                disabled={createTweet.isPending}
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePaste}
              data-testid="button-paste"
              title="Paste from clipboard"
              disabled={createTweet.isPending}
            >
              <Clipboard className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              data-testid="input-tags"
              disabled={createTweet.isPending}
            />
            <Input
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Notes (optional)"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              data-testid="input-notes"
              disabled={createTweet.isPending}
            />
            <Button
              type="submit"
              disabled={!urlInput.trim() || createTweet.isPending}
              data-testid="button-submit-tweet"
              className="whitespace-nowrap"
            >
              {createTweet.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                "Track Tweet"
              )}
            </Button>
          </div>
          {createTweet.isPending && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Detecting tweet type and capturing screenshot — this takes 10-15 seconds...
            </p>
          )}
        </form>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tweet content..."
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-1.5">
          {[undefined, "text", "image", "mixed"].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setFilterType(t)}
              data-testid={`filter-${t ?? "all"}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === undefined ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tweet table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Date</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"></td>
                </tr>
              ))}
              {!isLoading && (!tweets || tweets.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Database className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No tweets tracked yet.</p>
                      <p className="text-muted-foreground/60 text-xs">Paste a Twitter/X URL above to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && tweets?.map((tweet) => (
                <tr
                  key={tweet.id}
                  data-testid={`row-tweet-${tweet.id}`}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                  onClick={() => setSelectedTweet(tweet)}
                >
                  <td className="px-4 py-3">
                    <TypeBadge type={tweet.type} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium text-xs truncate max-w-[120px]">
                        {tweet.authorName ?? tweet.authorHandle ?? "—"}
                      </span>
                      {tweet.authorHandle && tweet.authorName && (
                        <span className="text-muted-foreground text-xs">@{tweet.authorHandle}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground text-xs leading-relaxed line-clamp-2 max-w-sm">
                      {tweet.content ?? tweet.url}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tweet.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {tweet.tags.split(",").slice(0, 2).map((tag) => (
                          <span key={tag.trim()} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(tweet.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(tweet.url, "_blank"); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        data-testid={`button-open-${tweet.id}`}
                        title="Open tweet"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(tweet.id); }}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-${tweet.id}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail dialog */}
      <TweetDetailDialog
        tweet={selectedTweet}
        open={!!selectedTweet}
        onClose={() => setSelectedTweet(null)}
        onDelete={(id) => { setDeleteTarget(id); setSelectedTweet(null); }}
        onRefresh={(id) => refreshTweet.mutate({ id })}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove this tweet?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the tweet and its screenshot from your tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget !== null) deleteTweet.mutate({ id: deleteTarget }); setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
