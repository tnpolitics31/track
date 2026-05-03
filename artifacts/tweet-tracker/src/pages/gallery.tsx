import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTweetGallery,
  useDeleteTweet,
  useRefreshTweet,
  getGetTweetGalleryQueryKey,
  getListTweetsQueryKey,
  getGetTweetStatsQueryKey,
} from "@workspace/api-client-react";
import type { Tweet } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Images, Trash2, ExternalLink, RefreshCw, FileText, Image, LayoutGrid, HelpCircle } from "lucide-react";

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

function TweetCard({
  tweet,
  onDelete,
  onRefresh,
}: {
  tweet: Tweet;
  onDelete: (id: number) => void;
  onRefresh: (id: number) => void;
}) {
  return (
    <div
      data-testid={`card-tweet-${tweet.id}`}
      className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {tweet.screenshotUrl ? (
          <img
            src={tweet.screenshotUrl}
            alt={`Screenshot of ${tweet.authorHandle ?? "tweet"}`}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            data-testid={`img-screenshot-${tweet.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <p className="text-muted-foreground text-xs text-center leading-relaxed line-clamp-6">
              {tweet.content ?? tweet.url}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => window.open(tweet.url, "_blank")}
            className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-md flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            data-testid={`button-open-card-${tweet.id}`}
            title="Open tweet"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRefresh(tweet.id)}
            className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-md flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            data-testid={`button-refresh-card-${tweet.id}`}
            title="Refresh screenshot"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(tweet.id)}
            className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-md flex items-center justify-center text-white hover:bg-destructive/80 transition-colors"
            data-testid={`button-delete-card-${tweet.id}`}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-foreground truncate">
              {tweet.authorName ?? tweet.authorHandle ?? "Unknown"}
            </span>
            {tweet.authorHandle && tweet.authorName && (
              <span className="text-xs text-muted-foreground">@{tweet.authorHandle}</span>
            )}
          </div>
          <TypeBadge type={tweet.type} />
        </div>
        {tweet.content && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {tweet.content}
          </p>
        )}
        <div className="text-xs text-muted-foreground/50">
          {new Date(tweet.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

export default function Gallery() {
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tweets, isLoading } = useGetTweetGallery({
    query: { queryKey: getGetTweetGalleryQueryKey() },
  });

  const deleteTweet = useDeleteTweet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTweetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTweetStatsQueryKey() });
        toast({ title: "Tweet removed" });
      },
    },
  });

  const refreshTweet = useRefreshTweet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTweetGalleryQueryKey() });
        toast({ title: "Screenshot refreshed" });
      },
    },
  });

  const filtered = filterType
    ? (tweets ?? []).filter((t) => t.type === filterType)
    : (tweets ?? []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Screenshot Gallery</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tweets?.length ?? 0} tweet{tweets?.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex gap-1.5">
          {[undefined, "text", "image", "mixed"].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setFilterType(t)}
              data-testid={`gallery-filter-${t ?? "all"}`}
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

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              <Skeleton className="aspect-video w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
            <Images className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">No screenshots yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {filterType
                ? `No ${filterType} tweets tracked.`
                : "Track tweets from the Tracker page to see screenshots here."}
            </p>
          </div>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              onDelete={(id) => setDeleteTarget(id)}
              onRefresh={(id) => refreshTweet.mutate({ id })}
            />
          ))}
        </div>
      )}

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
