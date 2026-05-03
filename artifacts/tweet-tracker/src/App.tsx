import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Tracker from "@/pages/tracker";
import Gallery from "@/pages/gallery";
import Attendance from "@/pages/attendance";
import Dashboard from "@/pages/dashboard";
import Politicians from "@/pages/politicians";
import PoliticianProfile from "@/pages/politician-profile";
import Events from "@/pages/events";
import Issues from "@/pages/issues";
import IssueDetail from "@/pages/issue-detail";
import IssuesMatrix from "@/pages/issues-matrix";
import Approvals from "@/pages/approvals";
import { AdminProvider } from "@/contexts/admin";
import { useState, useEffect, createContext, useContext } from "react";

const queryClient = new QueryClient();

type Theme = "light" | "dark";
interface ThemeContextType { theme: Theme; toggleTheme: () => void; }
export const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tracker" component={Tracker} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/politicians/:id" component={PoliticianProfile} />
        <Route path="/politicians" component={Politicians} />
        <Route path="/events" component={Events} />
        <Route path="/issues/matrix" component={IssuesMatrix} />
        <Route path="/issues/:id" component={IssueDetail} />
        <Route path="/issues" component={Issues} />
        <Route path="/approvals" component={Approvals} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AdminProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AdminProvider>
    </ThemeContext.Provider>
  );
}

export default App;
