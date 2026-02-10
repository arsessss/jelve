import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NetworkStatus } from "@/components/NetworkStatus";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Student from "./pages/Student";
import Parent from "./pages/Parent";
import Sport from "./pages/Sport";
import SportLogin from "./pages/SportLogin";
import PishSabtenam from "./pages/PishSabtenam";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <NetworkStatus />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/student" element={<Student />} />
          <Route path="/parent" element={<Parent />} />
          <Route path="/sport" element={<Sport />} />
          <Route path="/sport/login" element={<SportLogin />} />
          <Route path="/pish-sabtenam/:id" element={<PishSabtenam />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;