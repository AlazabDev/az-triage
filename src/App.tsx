import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import BugCreate from "./pages/BugCreate";
import BugDetail from "./pages/BugDetail";
import BugList from "./pages/BugList";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ReconciliationList from "./pages/ReconciliationList";
import ReconciliationNew from "./pages/ReconciliationNew";
import ReconciliationReview from "./pages/ReconciliationReview";
import SharedReview from "./pages/SharedReview";
import AgentTraining from "./pages/AgentTraining";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/bugs" element={<ProtectedRoute><BugList /></ProtectedRoute>} />
              <Route path="/bugs/new" element={<ProtectedRoute><BugCreate /></ProtectedRoute>} />
              <Route path="/bugs/:id" element={<ProtectedRoute><BugDetail /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/reconciliation" element={<ProtectedRoute><ReconciliationList /></ProtectedRoute>} />
              <Route path="/reconciliation/new" element={<ProtectedRoute><ReconciliationNew /></ProtectedRoute>} />
              <Route path="/reconciliation/:id" element={<ProtectedRoute><ReconciliationReview /></ProtectedRoute>} />
              <Route path="/share/:token" element={<SharedReview />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
