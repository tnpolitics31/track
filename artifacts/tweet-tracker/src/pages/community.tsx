import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Trophy, ThumbsUp, ThumbsDown, Star, TrendingUp, Clock, Flame } from "lucide-react";
import { TweetVoteButtons } from "@/components/tweet-vote-buttons";
import { AppreciationFilter, APPRECIATION_TAGS, hasAppreciationTag } from "@/components/appreciation-filter";

interface Tweet {
  id: number;
  url: string;
  authorName: string | null;
  authorHandle: string | null;
  content: string | null;
  type: string;
  tags: string | null;
  screenshotUrl: string | null;
  createdAt: string;
}

interface RankedTweet {
  tweet: Tweet;
  likes: number;
  dislikes: number;
  score: number;
}

interface BestWeekData {
  tweet: Tweet | null;
  likes: number;
  dislikes: number;
  leaderboard: RankedTweet[];
}

function TweetCard({ item, rank }: { item: RankedTweet; rank?: number }) {
  const { tweet, likes, dislikes, score } = item;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {rank !== undefined && (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              rank === 0 ? "bg-amber-500/20 text-amber-500" :
              rank === 1 ? "bg-zinc-400/20 text-zinc-400" :
              rank === 2 ? "bg-orange-600/20 text-orange-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{tweet.authorName ?? tweet.authorHandle ?? "Unknown"}</span>
              {tweet.authorHandle && tweet.authorName && (
                <span className="text-xs text-muted-foreground flex-shrink-0">@{tweet.authorHandle}</span>
              )}
            </div>
            {tweet.tags && (
              <div className="flex gap-1 flex-wrap mt-0.5">
                {tweet.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => {
                  const appreciationMeta = APPRECIATION_TAGS.find((a) => a.value === tag.toLowerCase());
                  if (appreciationMeta) {
                    return (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${appreciationMeta.color}18`, color: appreciationMeta.color }}>
                        {appreciationMeta.emoji} {appreciationMeta.label}
                      </span>
                    );
                  }
                  return (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {tweet.screenshotUrl && (
        <a href={tweet.url} target="_blank" rel="noreferrer">
          <img src={tweet.screenshotUrl} alt="Tweet screenshot" className="w-full rounded-lg object-cover border border-border max-h-48 hover:opacity-90 transition-opacity" />
        </a>
      )}

      {tweet.content && (
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4 bg-muted/30 rounded-lg p-3 border border-border">
          {tweet.content}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <TweetVoteButtons tweetId={tweet.id} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <ThumbsUp className="w-3 h-3" />{likes}
          </span>
          <span className="flex items-center gap-1 text-red-400 font-medium">
            <ThumbsDown className="w-3 h-3" />{dislikes}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className={`font-semibold ${score > 0 ? "text-emerald-500" : score < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {score > 0 ? "+" : ""}{score} net
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroTweetCard({ tweet, likes, dislikes }: { tweet: Tweet; likes: number; dislikes: number }) {
  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-card to-card border-2 border-amber-500/30 rounded-2xl p-5 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-0.5">Best Tweet of the Week</div>
          <div className="text-base font-bold text-foreground truncate">{tweet.authorName ?? tweet.authorHandle ?? "Unknown"}</div>
          {tweet.authorHandle && tweet.authorName && (
            <div className="text-xs text-muted-foreground">@{tweet.authorHandle}</div>
          )}
        </div>
        <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-amber-500 transition-colors flex-shrink-0">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {tweet.screenshotUrl && (
        <a href={tweet.url} target="_blank" rel="noreferrer">
          <img src={tweet.screenshotUrl} alt="Best tweet screenshot" className="w-full rounded-xl border border-amber-500/20 object-cover max-h-64 hover:opacity-90 transition-opacity" />
        </a>
      )}

      {tweet.content && (
        <p className="text-sm text-foreground leading-relaxed bg-amber-500/5 rounded-xl p-4 border border-amber-500/15">
          {tweet.content}
        </p>
      )}

      {tweet.tags && (
        <div className="flex gap-1 flex-wrap">
          {tweet.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => {
            const a = APPRECIATION_TAGS.find((x) => x.value === tag.toLowerCase());
            return a ? (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${a.color}18`, color: a.color }}>
                {a.emoji} {a.label}
              </span>
            ) : (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <TweetVoteButtons tweetId={tweet.id} />
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
            <ThumbsUp className="w-4 h-4" />{likes} likes
          </span>
          <span className="flex items-center gap-1.5 text-red-400 font-semibold">
            <ThumbsDown className="w-4 h-4" />{dislikes} dislikes
          </span>
        </div>
      </div>
    </div>
  );
}

type TabId = "week" | "alltime" | "all";

export default function Community() {
  const [tab, setTab] = useState<TabId>("week");
  const [bestWeek, setBestWeek] = useState<BestWeekData | null>(null);
  const [allTime, setAllTime] = useState<RankedTweet[]>([]);
  const [allTweets, setAllTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [appreciationFilter, setAppreciationFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [weekRes, allTimeRes, tweetsRes] = await Promise.all([
        fetch("/api/votes/best-week").then((r) => r.json()),
        fetch("/api/votes/all-time").then((r) => r.json()),
        fetch("/api/tweets").then((r) => r.json()),
      ]);
      setBestWeek(weekRes);
      setAllTime(Array.isArray(allTimeRes) ? allTimeRes : []);
      setAllTweets(Array.isArray(tweetsRes) ? tweetsRes : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredAllTweets = allTweets.filter((t) => {
    if (!appreciationFilter) return true;
    return hasAppreciationTag(t.tags, appreciationFilter);
  });

  const TABS = [
    { id: "week" as TabId, label: "Tweet of the Week", icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: "alltime" as TabId, label: "All-Time Top", icon: <Flame className="w-3.5 h-3.5" /> },
    { id: "all" as TabId, label: "Browse & Vote", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Community Ratings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vote on tweets, discover the best of the week, and filter by appreciation source.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-20 bg-muted rounded" />
              <div className="h-6 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* WEEK TAB */}
          {tab === "week" && (
            <div className="space-y-6">
              {bestWeek?.tweet ? (
                <HeroTweetCard tweet={bestWeek.tweet} likes={bestWeek.likes} dislikes={bestWeek.dislikes} />
              ) : (
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No votes yet this week</p>
                  <p className="text-xs mt-1">Be the first to vote on a tweet below!</p>
                </div>
              )}

              {bestWeek?.leaderboard && bestWeek.leaderboard.length > 1 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />Weekly Leaderboard
                  </h2>
                  {bestWeek.leaderboard.map((item, i) => (
                    <TweetCard key={item.tweet.id} item={item} rank={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ALL-TIME TAB */}
          {tab === "alltime" && (
            <div className="space-y-3">
              {allTime.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
                  <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No votes yet</p>
                  <p className="text-xs mt-1">Switch to "Browse & Vote" to start rating tweets.</p>
                </div>
              ) : (
                allTime.map((item, i) => (
                  <TweetCard key={item.tweet.id} item={item} rank={i} />
                ))
              )}
            </div>
          )}

          {/* BROWSE TAB */}
          {tab === "all" && (
            <div className="space-y-4">
              <AppreciationFilter value={appreciationFilter} onChange={setAppreciationFilter} />

              <p className="text-xs text-muted-foreground">
                {filteredAllTweets.length} tweet{filteredAllTweets.length !== 1 ? "s" : ""} — tap 👍 or 👎 to rate
              </p>

              {filteredAllTweets.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tweets match this filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAllTweets.map((tweet) => (
                    <div key={tweet.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/20 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">{tweet.authorName ?? tweet.authorHandle ?? "Unknown"}</span>
                            {tweet.authorHandle && tweet.authorName && (
                              <span className="text-xs text-muted-foreground">@{tweet.authorHandle}</span>
                            )}
                          </div>
                          {tweet.tags && (
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {tweet.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => {
                                const a = APPRECIATION_TAGS.find((x) => x.value === tag.toLowerCase());
                                return a ? (
                                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${a.color}18`, color: a.color }}>
                                    {a.emoji} {a.label}
                                  </span>
                                ) : (
                                  <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      {tweet.content && (
                        <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">{tweet.content}</p>
                      )}
                      <div className="pt-1">
                        <TweetVoteButtons tweetId={tweet.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
