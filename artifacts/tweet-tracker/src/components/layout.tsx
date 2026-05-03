import { Link, useLocation } from "wouter";
import { Database, Images, Sun, Moon } from "lucide-react";
import { useTheme } from "@/App";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">X</span>
            </div>
            <span className="font-semibold text-sm tracking-wide text-foreground">TweetTracker</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              data-testid="nav-tracker"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location === "/"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Database className="w-4 h-4" />
              Tracker
            </Link>
            <Link
              href="/gallery"
              data-testid="nav-gallery"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location === "/gallery"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Images className="w-4 h-4" />
              Gallery
            </Link>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={toggleTheme}
              data-testid="button-toggle-theme"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
