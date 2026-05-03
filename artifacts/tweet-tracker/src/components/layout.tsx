import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, Database, Images, Sun, Moon, ShieldCheck, ShieldOff, ClipboardList, Users, Calendar, AlertTriangle, Search, X, FileText, User, Inbox } from "lucide-react";
import { useTheme } from "@/App";
import { useAdmin } from "@/contexts/admin";
import AdminLoginModal from "@/components/admin-login-modal";

interface LayoutProps { children: React.ReactNode; }

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart2, testId: "nav-dashboard" },
  { href: "/tracker", label: "Tracker", icon: Database, testId: "nav-tracker" },
  { href: "/issues", label: "Issues", icon: AlertTriangle, testId: "nav-issues" },
  { href: "/politicians", label: "Politicians", icon: Users, testId: "nav-politicians" },
  { href: "/events", label: "Events", icon: Calendar, testId: "nav-events" },
  { href: "/gallery", label: "Gallery", icon: Images, testId: "nav-gallery" },
  { href: "/attendance", label: "Attendance", icon: ClipboardList, testId: "nav-attendance" },
  { href: "/approvals", label: "Approvals", icon: Inbox, testId: "nav-approvals" },
];

interface SearchResult {
  tweets: { id: number; url: string; authorName: string | null; authorHandle: string | null; content: string | null; partyShortName: string | null; partyColor: string | null }[];
  politicians: { id: number; name: string; twitterHandle: string | null; partyShortName: string | null; partyColor: string | null }[];
  issues: { id: number; title: string; category: string; status: string }[];
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        setResults(d);
      } finally { setLoading(false); }
    }, 300);
  }, [query]);

  const hasResults = results && (results.tweets.length > 0 || results.politicians.length > 0 || results.issues.length > 0);

  const close = () => { setOpen(false); setQuery(""); setResults(null); };

  const goTo = (path: string) => { navigate(path); close(); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Global search"
      >
        <Search className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4" onClick={close}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tweets, politicians, issues…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={(e) => e.key === "Escape" && close()}
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</div>
              )}
              {!loading && query.length >= 2 && !hasResults && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</div>
              )}
              {!loading && !query && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Type at least 2 characters to search</div>
              )}

              {!loading && results && (
                <div className="py-1">
                  {/* Politicians */}
                  {results.politicians.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Politicians</div>
                      {results.politicians.map((p) => (
                        <button key={p.id} onClick={() => goTo(`/politicians/${p.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                            {p.twitterHandle && <div className="text-xs text-muted-foreground">@{p.twitterHandle}</div>}
                          </div>
                          {p.partyShortName && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${p.partyColor}20`, color: p.partyColor ?? undefined }}>
                              {p.partyShortName}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Issues */}
                  {results.issues.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issues</div>
                      {results.issues.map((issue) => (
                        <button key={issue.id} onClick={() => goTo(`/issues/${issue.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{issue.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">{issue.category} · {issue.status?.replace("_", " ")}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tweets */}
                  {results.tweets.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tweets</div>
                      {results.tweets.map((t) => (
                        <a key={t.id} href={t.url} target="_blank" rel="noreferrer"
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={close}
                        >
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground">{t.authorName ?? t.authorHandle}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{t.content}</div>
                          </div>
                          {t.partyShortName && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: `${t.partyColor}20`, color: t.partyColor ?? undefined }}>
                              {t.partyShortName}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch_ = () => fetch("/api/pending/count").then((r) => r.json()).then((d) => setCount(d.count ?? 0)).catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, []);
  return count;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, logout } = useAdmin();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const pendingCount = usePendingCount();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Top header ── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">TN</span>
            </div>
            <span className="font-semibold text-sm tracking-wide text-foreground">tn-politics</span>
          </div>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon, testId }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              const isApprovals = href === "/approvals";
              return (
                <Link key={href} href={href} data-testid={testId}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                  {isApprovals && pendingCount > 0 && (
                    <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <GlobalSearch />
            <div className="w-px h-5 bg-border" />
            {isAdmin ? (
              <button onClick={logout} data-testid="button-admin-logout" title="Exit admin mode"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Admin</span>
              </button>
            ) : (
              <button onClick={() => setShowAdminModal(true)} data-testid="button-admin-login" title="Admin login"
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <ShieldOff className="w-4 h-4" />
              </button>
            )}
            <div className="w-px h-5 bg-border" />
            <button onClick={toggleTheme} data-testid="button-toggle-theme" title={theme === "light" ? "Dark mode" : "Light mode"}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
        <div className="relative">
          <div className="flex overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(({ href, label, icon: Icon, testId }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              const isApprovals = href === "/approvals";
              return (
                <Link key={href} href={href} data-testid={testId}
                  className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2.5 min-w-[70px] flex-shrink-0 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.2 : 1.7} />
                    {isApprovals && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] leading-none whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/95 to-transparent" />
        </div>
      </nav>

      <AdminLoginModal open={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
}
