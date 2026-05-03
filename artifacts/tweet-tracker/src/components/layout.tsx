import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, Database, Images, Sun, Moon, ShieldCheck, ShieldOff, ClipboardList, Users, Calendar, AlertTriangle } from "lucide-react";
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
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, logout } = useAdmin();
  const [showAdminModal, setShowAdminModal] = useState(false);

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
              return (
                <Link key={href} href={href} data-testid={testId}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
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

      {/* ── Page content — extra bottom padding on mobile for the nav bar ── */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* ── Mobile bottom nav — hidden on md+ ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
        {/* Right-fade hint that nav is scrollable */}
        <div className="relative">
          <div className="flex overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(({ href, label, icon: Icon, testId }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link key={href} href={href} data-testid={testId}
                  className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2.5 min-w-[70px] flex-shrink-0 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {/* Active top indicator bar */}
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                  <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.2 : 1.7} />
                  <span className={`text-[10px] leading-none whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Fade gradient on the right to hint scrollability */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/95 to-transparent" />
        </div>
      </nav>

      <AdminLoginModal open={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
}
