import { useState, useEffect, useMemo, useRef } from "react";
import { Users, FileText, AlertTriangle, BarChart2, Search, ExternalLink, Image, LayoutGrid, HelpCircle, ChevronRight, Lock, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { TweetVoteButtons } from "@/components/tweet-vote-buttons";
import { AppreciationFilter, hasAppreciationTag } from "@/components/appreciation-filter";

interface Party { id: number; name: string; shortName: string; color: string; description: string | null; }
interface Politician { id: number; name: string; twitterHandle: string | null; constituency: string | null; role: string | null; partyColor: string | null; }
interface Tweet { id: number; url: string; authorName: string | null; authorHandle: string | null; content: string | null; type: string; tags: string | null; createdAt: string; }
interface Issue { id: number; title: string; category: string; status: string; dateOccurred: string | null; }
interface Scheme { id: number; title: string; description: string | null; status: string; manifestoPromise: boolean; responseUrl: string | null; newspaperUrl: string | null; youtubeUrl: string | null; dateAnnounced: string | null; }

type SubTab = "overview" | "tweets" | "politicians" | "issues" | "schemes";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-500/15 text-red-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
};

const SCHEME_STATUS_COLORS: Record<string, string> = {
  announced: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-zinc-500/15 text-zinc-400",
};

function TypeIcon({ type }: { type: string }) {
  if (type === "text") return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  if (type === "image") return <Image className="w-3.5 h-3.5 text-purple-400" />;
  if (type === "mixed") return <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />;
  return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className="text-2xl font-bold" style={color ? { color } : {}}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
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
          <p className="text-xs text-muted-foreground mt-1">
            Unlock this with a dummy Razorpay payment flow for now.
          </p>
        </div>
      </div>
      <button
        onClick={onUnlock}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-colors"
      >
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

function PartyOverview({ party, tweets, politicians, issues, schemes }: {
  party: Party; tweets: Tweet[]; politicians: Politician[]; issues: Issue[]; schemes: Scheme[];
}) {
  const manifestoCount = schemes.filter((s) => s.manifestoPromise).length;
  const completedSchemes = schemes.filter((s) => s.status === "completed").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tweets" value={tweets.length} color={party.color} />
        <StatCard label="Politicians" value={politicians.length} color={party.color} />
        <StatCard label="Issues" value={issues.length} color={party.color} />
        <StatCard label="Schemes" value={schemes.length} color={party.color} />
      </div>
      {schemes.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Scheme Summary</h3>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{manifestoCount}</strong> from manifesto</span>
            <span><strong className="text-foreground">{completedSchemes}</strong> completed</span>
            <span><strong className="text-foreground">{schemes.length - completedSchemes}</strong> pending</span>
          </div>
        </div>
      )}
      {politicians.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Key Politicians</h3>
          <div className="divide-y divide-border">
            {politicians.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/politicians/${p.id}`} className="flex items-center justify-between py-2 hover:text-primary transition-colors">
                <div>
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                  {p.role && <div className="text-xs text-muted-foreground">{p.role}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TweetsTab({ tweets }: { tweets: Tweet[] }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterMeme, setFilterMeme] = useState(false);
  const [appreciationFilter, setAppreciationFilter] = useState<string | null>(null);

  const filtered = tweets
    .filter((t) => !filterType || t.type === filterType)
    .filter((t) => !filterMeme || (t.tags ?? "").split(",").map((s) => s.trim().toLowerCase()).includes("meme"))
    .filter((t) => !appreciationFilter || hasAppreciationTag(t.tags, appreciationFilter))
    .filter((t) => !search || [t.authorName, t.authorHandle, t.content].some((f) => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tweets..." className="pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[undefined, "text", "image", "mixed"].map((t) => (
            <button key={t ?? "all"} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{t === undefined ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
          <button onClick={() => setFilterMeme((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${filterMeme ? "bg-pink-500 text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >🎭 Memes</button>
        </div>
      </div>

      {/* Appreciation / Source filter */}
      <AppreciationFilter value={appreciationFilter} onChange={setAppreciationFilter} />

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">No tweets found.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((tweet) => (
              <div key={tweet.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="mt-0.5 flex-shrink-0"><TypeIcon type={tweet.type} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{tweet.authorName ?? tweet.authorHandle ?? "Unknown"}</span>
                    {tweet.authorHandle && tweet.authorName && <span className="text-xs text-muted-foreground">@{tweet.authorHandle}</span>}
                    {tweet.tags && tweet.tags.split(",").map((s) => s.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} className={`text-xs px-1.5 py-0.5 rounded font-medium ${tag.toLowerCase() === "meme" ? "bg-pink-500/15 text-pink-400" : "bg-muted text-muted-foreground"}`}>{tag}</span>
                    ))}
                  </div>
                  {tweet.content && <p className="text-xs text-foreground/70 mt-0.5 line-clamp-2 leading-relaxed">{tweet.content}</p>}
                  <div className="mt-1.5">
                    <TweetVoteButtons tweetId={tweet.id} compact />
                  </div>
                </div>
                <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PoliticiansTab({ politicians }: { politicians: Politician[] }) {
  const [search, setSearch] = useState("");
  const filtered = politicians.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.role?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search politicians..." className="pl-9 text-sm" />
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">No politicians found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/politicians/${p.id}`} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all block">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {p.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  {p.role && <div className="text-xs text-muted-foreground truncate">{p.role}</div>}
                  {p.constituency && <div className="text-xs text-muted-foreground/60 truncate">{p.constituency}</div>}
                  {p.twitterHandle && <div className="text-xs text-primary/70 mt-0.5">@{p.twitterHandle}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function IssuesTab({ issues }: { issues: Issue[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const filtered = issues
    .filter((i) => !filterStatus || i.status === filterStatus)
    .filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." className="pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {[undefined, "open", "in_progress", "resolved"].map((s) => (
            <button key={s ?? "all"} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{s === undefined ? "All" : s.replace("_", " ")}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">No issues found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((issue) => (
            <Link key={issue.id} href={`/issues/${issue.id}`} className="block bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{issue.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground capitalize">{issue.category}</span>
                    {issue.dateOccurred && <span className="text-xs text-muted-foreground/60">{issue.dateOccurred}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_COLORS[issue.status] ?? "bg-muted text-muted-foreground"}`}>
                  {issue.status.replace("_", " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemesTab({ schemes, party }: { schemes: Scheme[]; party: Party }) {
  const [search, setSearch] = useState("");
  const [filterManifesto, setFilterManifesto] = useState<boolean | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const filtered = schemes
    .filter((s) => filterManifesto === undefined || s.manifestoPromise === filterManifesto)
    .filter((s) => !filterStatus || s.status === filterStatus)
    .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schemes..." className="pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[undefined, "announced", "in_progress", "completed", "cancelled"].map((s) => (
            <button key={s ?? "all"} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >{s === undefined ? "All status" : s.replace("_", " ")}</button>
          ))}
          <button onClick={() => setFilterManifesto(filterManifesto === undefined ? true : undefined)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${filterManifesto !== undefined ? "bg-amber-500 text-white border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >📜 Manifesto only</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">No schemes found. Add one from the Schemes page.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((scheme) => (
            <div key={scheme.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{scheme.title}</span>
                    {scheme.manifestoPromise && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium border border-amber-500/20">📜 Manifesto</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SCHEME_STATUS_COLORS[scheme.status] ?? "bg-muted text-muted-foreground"}`}>
                      {scheme.status.replace("_", " ")}
                    </span>
                  </div>
                  {scheme.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{scheme.description}</p>}
                  {scheme.dateAnnounced && <p className="text-xs text-muted-foreground/60 mt-1">Announced: {scheme.dateAnnounced}</p>}
                </div>
              </div>
              {(scheme.responseUrl || scheme.newspaperUrl || scheme.youtubeUrl) && (
                <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
                  {scheme.responseUrl && (
                    <a href={scheme.responseUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink className="w-3 h-3" />People's response
                    </a>
                  )}
                  {scheme.newspaperUrl && (
                    <a href={scheme.newspaperUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      <ExternalLink className="w-3 h-3" />Newspaper
                    </a>
                  )}
                  {scheme.youtubeUrl && (
                    <a href={scheme.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <ExternalLink className="w-3 h-3" />YouTube
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: "tweets", label: "Tweets", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "politicians", label: "Politicians", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "issues", label: "Issues", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: "schemes", label: "Schemes", icon: <BarChart2 className="w-3.5 h-3.5" /> },
];

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isUnlocked, setIsUnlocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const monthLabel = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [month]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedParty) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 1200;
    const height = 1500;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = selectedParty.color;
    ctx.fillRect(0, 0, width, 180);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(selectedParty.name, 60, 100);
    ctx.font = "28px sans-serif";
    ctx.fillText(monthLabel, 60, 150);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "32px sans-serif";
    ctx.fillText(`Tweets: ${tweets.length}`, 60, 280);
    ctx.fillText(`Politicians: ${politicians.length}`, 60, 340);
    ctx.fillText(`Issues: ${issues.length}`, 60, 400);
    ctx.fillText(`Schemes: ${schemes.length}`, 60, 460);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px sans-serif";
    ctx.fillText("Generated in tn-politics", 60, 1440);
    await downloadDataUrl(canvas.toDataURL("image/png"), `${selectedParty.shortName}-${month}.png`);
  };

  useEffect(() => {
    fetch("/api/parties").then((r) => r.json()).then((data: Party[]) => {
      setParties(data);
      if (data.length > 0) setSelectedParty(data[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedParty) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tweets?party_id=${selectedParty.id}`).then((r) => r.json()),
      fetch(`/api/politicians?party_id=${selectedParty.id}`).then((r) => r.json()),
      fetch(`/api/issues?party_id=${selectedParty.id}`).then((r) => r.json()),
      fetch(`/api/schemes?party_id=${selectedParty.id}`).then((r) => r.json()),
    ]).then(([tw, po, is, sc]) => {
      setTweets(tw ?? []);
      setPoliticians(po ?? []);
      setIssues(is ?? []);
      setSchemes(sc ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedParty]);

  const selectParty = (party: Party) => {
    setSelectedParty(party);
    setSubTab("overview");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Party tab bar */}
      <div className="flex gap-2 flex-wrap">
        {parties.map((party) => (
          <button
            key={party.id}
            onClick={() => selectParty(party)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedParty?.id === party.id ? "text-white border-transparent shadow-md scale-105" : "bg-card border-border text-muted-foreground hover:text-foreground hover:shadow-sm"}`}
            style={selectedParty?.id === party.id ? { backgroundColor: party.color } : {}}
          >
            {party.shortName}
          </button>
        ))}
      </div>

      {/* Party header */}
      {selectedParty && (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg" style={{ backgroundColor: selectedParty.color }}>
            {selectedParty.shortName[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{selectedParty.name}</h1>
            {selectedParty.description && <p className="text-sm text-muted-foreground">{selectedParty.description}</p>}
          </div>
        </div>
      )}

      {selectedParty && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Generate Monthly Infographic</h2>
              <p className="text-xs text-muted-foreground">Pick a month and unlock the download with Razorpay.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 text-sm" />
              {isUnlocked && (
                <button onClick={handleDownload} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold">
                  <Image className="w-4 h-4" />
                  Download PNG
                </button>
              )}
            </div>
          </div>
          {!isUnlocked ? (
            <PaymentGate onUnlock={() => setIsUnlocked(true)} />
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-emerald-500">Payment approved</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedParty.shortName} infographic for {monthLabel} is ready.
              </div>
            </div>
          )}
        <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Sub-tabs */}
      {selectedParty && (
        <div className="border-b border-border">
          <div className="flex gap-0">
            {SUB_TABS.map((tab) => {
              const counts: Record<SubTab, number | null> = {
                overview: null,
                tweets: tweets.length,
                politicians: politicians.length,
                issues: issues.length,
                schemes: schemes.length,
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 ${subTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab.icon}
                  {tab.label}
                  {counts[tab.id] !== null && (
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${subTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {counts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab content */}
      {selectedParty && (
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading…</div>
          ) : (
            <>
              {subTab === "overview" && <PartyOverview party={selectedParty} tweets={tweets} politicians={politicians} issues={issues} schemes={schemes} />}
              {subTab === "tweets" && <TweetsTab tweets={tweets} />}
              {subTab === "politicians" && <PoliticiansTab politicians={politicians} />}
              {subTab === "issues" && <IssuesTab issues={issues} />}
              {subTab === "schemes" && <SchemesTab schemes={schemes} party={selectedParty} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
