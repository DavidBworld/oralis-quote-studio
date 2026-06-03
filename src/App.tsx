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
import FacturePreview from "./pages/FacturePreview";
import Commandes from "./pages/Commandes";
import Fournisseurs from "./pages/Fournisseurs";
import Login from "./pages/Login";
import { AuthGuard } from "@/components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/devis/nouveau"
            element={
              <AuthGuard>
                <AppLayout>
                  <QuoteForm />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/devis/:id"
            element={
              <AuthGuard>
                <AppLayout>
                  <QuoteForm />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/devis/:id/apercu"
            element={
              <AuthGuard>
                <QuotePreview />
              </AuthGuard>
            }
          />
          <Route
            path="/parametres"
            element={
              <AuthGuard>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/clients"
            element={
              <AuthGuard>
                <AppLayout>
                  <Clients />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <AuthGuard>
                <AppLayout>
                  <Clients />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/devis"
            element={
              <AuthGuard>
                <AppLayout>
                  <QuotesList />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/factures"
            element={
              <AuthGuard>
                <AppLayout>
                  <Factures />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/factures/:id"
            element={
              <AuthGuard>
                <AppLayout>
                  <Factures />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/factures/:id/apercu"
            element={
              <AuthGuard>
                <FacturePreview />
              </AuthGuard>
            }
          />
          <Route
            path="/commandes"
            element={
              <AuthGuard>
                <AppLayout>
                  <Commandes />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/commandes/:id"
            element={
              <AuthGuard>
                <AppLayout>
                  <Commandes />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/fournisseurs"
            element={
              <AuthGuard>
                <AppLayout>
                  <Fournisseurs />
                </AppLayout>
              </AuthGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
