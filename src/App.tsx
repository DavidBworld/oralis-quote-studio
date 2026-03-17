import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import QuoteForm from "./pages/QuoteForm";
import QuotePreview from "./pages/QuotePreview";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import QuotesList from "./pages/QuotesList";
import Factures from "./pages/Factures";
import Commandes from "./pages/Commandes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            }
          />
          <Route
            path="/devis/nouveau"
            element={
              <AppLayout>
                <QuoteForm />
              </AppLayout>
            }
          />
          <Route
            path="/devis/:id"
            element={
              <AppLayout>
                <QuoteForm />
              </AppLayout>
            }
          />
          <Route path="/devis/:id/apercu" element={<QuotePreview />} />
          <Route
            path="/parametres"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
