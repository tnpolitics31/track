import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Twitter, MapPin, Briefcase, FileText, ExternalLink, Users, TrendingUp, Smile, Frown, Meh, Swords, Star, Lock, CreditCard, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Input } from "@/components/ui/input";
import { TweetVoteButtons } from "@/components/tweet-vote-buttons";
import { AppreciationFilter, hasAppreciationTag } from "@/components/appreciation-filter";

interface Politician {
  id: number; name: string; twitterHandle: string | null; role: string | null;
  constituency: string | null; bio: string | null; partyId: number | null;
  partyName: string | null; partyShortName: string | null; partyColor: string | null;
}

interface Tweet {
  id: number; url: string; authorName: string | null; authorHandle: string | null;
  content: string | null; type: string; sentiment: string | null; tags: string | null; createdAt: string;
  partyShortName: string | null; partyColor: string | null;
}

interface ProfileData {
  politician: Politician;
  tweets: Tweet[];
  tweetCount: number;
  sentimentCounts: Record<string, number>;
}

const SENTIMENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  positive: { label: "Positive", color: "#10b981", icon: <Smile className="w-3.5 h-3.5" /> },
  negative: { label: "Negative", color: "#ef4444", icon: <Frown className="w-3.5 h-3.5" /> },
  neutral: { label: "Neutral", color: "#6b7280", icon: <Meh className="w-3.5 h-3.5" /> },
  attack: { label: "Attack", color: "#f59e0b", icon: <Swords className="w-3.5 h-3.5" /> },
  promise: { label: "Promise", color: "#8b5cf6", icon: <Star className="w-3.5 h-3.5" /> },
};

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const meta = SENTIMENT_META[sentiment];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
      {meta.icon}{meta.label}
    </span>
  );
}

function PaymentGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500">
          <Lock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Monthly infographic is locked</h3>
          <p className="text-xs text-muted-foreground mt-1">Unlock this with a dummy Razorpay payment flow for now.</p>
        </div>
      </div>
      <button onClick={onUnlock} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-colors">
        <CreditCard className="w-4 h-4" />
        Pay & Generate
      </button>
    </div>
  );
}

async function downloadDataUrl(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TweetList({ tweets }: { tweets: Tweet[] }) {
  const [appreciationFilter, setAppreciationFilter] = useState<string | null>(null);
  const filtered = tweets.filter((t) => !appreciationFilter || hasAppreciationTag(t.tags, appreciationFilter));
  return (
    <div className="space-y-3 p-4">
      <AppreciationFilter value={appreciationFilter} onChange={setAppreciationFilter} />
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No tweets match this filter.</div>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((tweet) => (
            <div key={tweet.id} className="py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <SentimentBadge sentiment={tweet.sentiment} />
                  <span className="text-xs text-muted-foreground">{new Date(tweet.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <a href={tweet.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
              {tweet.content && <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{tweet.content}</p>}
              <div className="mt-2"><TweetVoteButtons tweetId={tweet.id} compact /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PoliticianProfile() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isUnlocked, setIsUnlocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/politicians/${id}`).then((r) => r.json()),
      fetch(`/api/tweets?politicianId=${id}&limit=50`).then((r) => r.json()),
    ])
      .then(([pol, tweetsResp]) => {
        const tweets: Tweet[] = Array.isArray(tweetsResp) ? tweetsResp : (tweetsResp.tweets ?? []);
        const sentimentCounts: Record<string, number> = {};
        for (const t of tweets) if (t.sentiment) sentimentCounts[t.sentiment] = (sentimentCounts[t.sentiment] ?? 0) + 1;
        setData({ politician: pol, tweets, tweetCount: tweets.length, sentimentCounts });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-6 space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  if (!data?.politician) return <div className="max-w-3xl mx-auto px-4 py-12 text-center"><p className="text-muted-foreground">Politician not found.</p><Link href="/politicians" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to Politicians</Link></div>;

  const { politician, tweets, sentimentCounts } = data;
  const color = politician.partyColor ?? "#6b7280";
  const sentimentChartData = Object.entries(sentimentCounts).map(([key, val]) => ({ name: SENTIMENT_META[key]?.label ?? key, value: val, color: SENTIMENT_META[key]?.color ?? "#6b7280" })).sort((a, b) => b.value - a.value);
  const monthLabel = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [month]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 1200;
    const height = 1500;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, 180);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(politician.name, 60, 100);
    ctx.font = "28px sans-serif";
    ctx.fillText(monthLabel, 60, 150);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "32px sans-serif";
    ctx.fillText(`Tweets: ${tweets.length}`, 60, 280);
    ctx.fillText(`Positive: ${sentimentCounts.positive ?? 0}`, 60, 340);
    ctx.fillText(`Attacks: ${sentimentCounts.attack ?? 0}`, 60, 400);
    ctx.fillText(`Neutral: ${sentimentCounts.neutral ?? 0}`, 60, 460);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px sans-serif";
    ctx.fillText("Generated in tn-politics", 60, 1440);
    await downloadDataUrl(canvas.toDataURL("image/png"), `${politician.twitterHandle ?? politician.name}-${month}.png`);
  };

  const profileFields = [politician.name, politician.twitterHandle, politician.role, politician.constituency, politician.bio, politician.partyId];
  const filledCount = profileFields.filter(Boolean).length;
  const completionPct = Math.round((filledCount / profileFields.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/politicians" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Politicians</Link>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: color }}>{politician.name.charAt(0)}</div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{politician.name}</h1>
              {politician.twitterHandle && <a href={`https://x.com/${politician.twitterHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline"><Twitter className="w-3.5 h-3.5" />@{politician.twitterHandle}</a>}
            </div>
          </div>
          {politician.partyShortName && <span className="text-sm font-bold px-2.5 py-1 rounded" style={{ backgroundColor: `${color}20`, color }}>{politician.partyShortName}</span>}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {politician.role && <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />{politician.role}</span>}
          {politician.constituency && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{politician.constituency}</span>}
          {politician.partyName && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{politician.partyName}</span>}
        </div>
        {politician.bio && <p className="text-sm text-muted-foreground leading-relaxed">{politician.bio}</p>}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground font-medium">Profile completion</span><span className={`font-semibold ${completionPct === 100 ? "text-emerald-500" : completionPct >= 60 ? "text-amber-500" : "text-red-400"}`}>{completionPct}%</span></div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: completionPct === 100 ? "#10b981" : completionPct >= 60 ? "#f59e0b" : "#ef4444" }} /></div>
          {completionPct < 100 && <p className="text-xs text-muted-foreground">Missing: {[!politician.twitterHandle && "Twitter handle", !politician.role && "Role", !politician.constituency && "Constituency", !politician.bio && "Bio", !politician.partyId && "Party"].filter(Boolean).join(", ")}</p>}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div><h2 className="text-sm font-semibold text-foreground">Generate Monthly Infographic</h2><p className="text-xs text-muted-foreground">Pick a month and unlock the download with Razorpay.</p></div>
          <div className="flex items-center gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 text-sm" />{isUnlocked && <button onClick={handleDownload} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"><Image className="w-4 h-4" />Download PNG</button>}</div>
        </div>
        {!isUnlocked ? <PaymentGate onUnlock={() => setIsUnlocked(true)} /> : <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="text-sm font-semibold text-emerald-500">Payment approved</div><div className="text-xs text-muted-foreground mt-1">{politician.name} infographic for {monthLabel} is ready.</div></div>}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center"><div className="text-2xl font-bold tabular-nums" style={{ color }}>{tweets.length}</div><div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><FileText className="w-3 h-3" />Tracked Tweets</div></div>
        <div className="bg-card border border-border rounded-xl p-4 text-center"><div className="text-2xl font-bold tabular-nums text-emerald-500">{sentimentCounts.positive ?? 0}</div><div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Smile className="w-3 h-3" />Positive</div></div>
        <div className="bg-card border border-border rounded-xl p-4 text-center"><div className="text-2xl font-bold tabular-nums text-amber-500">{sentimentCounts.attack ?? 0}</div><div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Swords className="w-3 h-3" />Attacks</div></div>
      </div>
      {sentimentChartData.length > 0 && <div className="bg-card border border-border rounded-xl p-4 space-y-3"><h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Sentiment Breakdown</h2><ResponsiveContainer width="100%" height={120}><BarChart data={sentimentChartData} barSize={32}><XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)", opacity: 0.4 }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{sentimentChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div>}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Tracked Tweets</h2>{politician.twitterHandle && <a href={`https://x.com/${politician.twitterHandle}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View on X</a>}</div>
        <TweetList tweets={tweets} />
      </div>
    </div>
  );
}
