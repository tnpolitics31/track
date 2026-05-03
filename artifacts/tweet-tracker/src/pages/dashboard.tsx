import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BarChart2, Users, Calendar, FileText, ExternalLink, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PartyStats {
  id: number; name: string; shortName: string; color: string; description: string | null;
  tweetCount: number; politicianCount: number;
}
interface TopPolitician {
  id: number; name: string; twitterHandle: string | null; constituency: string | null;
  role: string | null; partyName: string | null; partyShortName: string | null;
  partyColor: string | null; tweetCount: number;
}
interface RecentTweet {
  id: number; url: string; authorName: string | null; authorHandle: string | null;
  content: string | null; type: string; screenshotUrl: string | null; createdAt: string;
  partyName: string | null; partyShortName: string | null; partyColor: string | null;
}
interface DashboardStats {
  totalTweets: number; totalPoliticians: number; totalEvents: number;
  partyStats: PartyStats[]; topPoliticians: TopPolitician[]; recentTweets: RecentTweet[];
}

function PartyCard({ party }: { party: PartyStats }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: party.color }} />
        <span className="font-bold text-foreground text-lg">{party.shortName}</span>
        {party.description && (
          <span className="text-xs text-muted-foreground truncate">{party.description}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/40 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold tabular-nums" style={{ color: party.color }}>{party.tweetCount}</div>
          <div className="text-xs text-muted-foreground">Tweets</div>
        </div>
        <div className="bg-muted/40 rounded-lg p-2 text-center">
          <div className="text-2xl font-bold tabular-nums" style={{ color: party.color }}>{party.politicianCount}</div>
          <div className="text-xs text-muted-foreground">Politicians</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalPartyTweets = data?.partyStats.reduce((s, p) => s + p.tweetCount, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tweets", value: data?.totalTweets ?? 0, icon: <FileText className="w-5 h-5" />, color: "text-blue-500" },
          { label: "Tweets Tagged", value: totalPartyTweets, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-500" },
          { label: "Politicians", value: data?.totalPoliticians ?? 0, icon: <Users className="w-5 h-5" />, color: "text-violet-500" },
          { label: "Events", value: data?.totalEvents ?? 0, icon: <Calendar className="w-5 h-5" />, color: "text-amber-500" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className={card.color}>{card.icon}</div>
            <div>
              {loading ? <Skeleton className="h-7 w-12 mb-1" /> : <div className="text-2xl font-bold text-foreground tabular-nums">{card.value}</div>}
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Party comparison */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Party Activity
          </h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data?.partyStats.map((party) => <PartyCard key={party.id} party={party} />)}
          </div>
        )}
        {/* Bar chart visual */}
        {!loading && data && totalPartyTweets > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tweet distribution by party</p>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
              {data.partyStats.filter((p) => p.tweetCount > 0).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-center text-white text-xs font-bold transition-all"
                  style={{ backgroundColor: p.color, width: `${(p.tweetCount / totalPartyTweets) * 100}%`, minWidth: p.tweetCount > 0 ? "2rem" : "0" }}
                  title={`${p.shortName}: ${p.tweetCount}`}
                >
                  {p.tweetCount > 0 && `${p.shortName}`}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {data.partyStats.filter((p) => p.tweetCount > 0).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.shortName} ({p.tweetCount})
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Top politicians */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Top Politicians by Tracked Tweets
          </h2>
          <Link href="/politicians" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : data?.topPoliticians.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No politicians added yet. <Link href="/politicians" className="text-primary hover:underline">Add politicians</Link> to see rankings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data?.topPoliticians.map((pol, i) => (
              <div key={pol.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground/50 text-xs font-bold tabular-nums">#{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">{pol.name}</div>
                      {pol.twitterHandle && <div className="text-xs text-muted-foreground">@{pol.twitterHandle}</div>}
                    </div>
                  </div>
                  {pol.partyShortName && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${pol.partyColor}25`, color: pol.partyColor ?? undefined }}>
                      {pol.partyShortName}
                    </span>
                  )}
                </div>
                {pol.constituency && <div className="text-xs text-muted-foreground truncate">{pol.constituency}</div>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span className="font-semibold text-foreground tabular-nums">{pol.tweetCount}</span> tracked tweets
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent tweets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Recently Tracked
          </h2>
          <Link href="/" className="text-xs text-primary hover:underline">Tracker →</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : data?.recentTweets.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No tweets tracked yet. <Link href="/" className="text-primary hover:underline">Go to Tracker</Link> to start.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
            {data?.recentTweets.map((tweet) => (
              <div key={tweet.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                {tweet.partyShortName && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${tweet.partyColor}25`, color: tweet.partyColor ?? undefined }}>
                    {tweet.partyShortName}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {tweet.authorName ?? tweet.authorHandle ?? "Unknown"}
                    {tweet.authorHandle && tweet.authorName && <span className="text-muted-foreground font-normal ml-1">@{tweet.authorHandle}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{tweet.content ?? tweet.url}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(tweet.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                  <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
