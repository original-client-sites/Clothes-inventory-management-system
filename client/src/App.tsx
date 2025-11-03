import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Inventory from "@/pages/inventory";
import Orders from "@/pages/orders";
import NotFound from "@/pages/not-found";
import StockHistory from "@/pages/stock-history";
import { Navigation } from "@/components/navigation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Inventory} />
      <Route path="/orders" component={Orders} />
      <Route path="/stock-history" component={StockHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen">
          <Navigation />
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
