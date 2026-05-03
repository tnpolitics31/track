import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Tracker from "@/pages/tracker";
import Gallery from "@/pages/gallery";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ThemeInitializer() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Tracker} />
        <Route path="/gallery" component={Gallery} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
