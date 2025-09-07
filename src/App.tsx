
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Network } from "@capacitor/network";

import Index from "./pages/Index";
import SignalViewer from "./pages/SignalViewer";
import ConnectionSettings from "./pages/ConnectionSettings";
import ChannelSettings from "./pages/ChannelSettings";
import FirebaseDataView from "./pages/FirebaseDataView";
import NotFound from "./pages/NotFound";
import { NetworkProvider } from "./providers/NetworkProvider";
import { EegDataProvider } from "./providers/EegDataProvider";
import { FirebaseDataProvider } from "./providers/FirebaseDataProvider";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Enable iOS overscroll behavior
    document.body.classList.add("overscroll-y-none");
    
    // Check network status on startup
    const checkNetwork = async () => {
      const status = await Network.getStatus();
      console.log("Network status:", status);
    };
    
    checkNetwork();
    
    return () => {
      document.body.classList.remove("overscroll-y-none");
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <NetworkProvider>
            <EegDataProvider>
              <FirebaseDataProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/viewer" element={<SignalViewer />} />
                  <Route path="/settings/connection" element={<ConnectionSettings />} />
                  <Route path="/settings/channels" element={<ChannelSettings />} />
                  <Route path="/firebase-data" element={<FirebaseDataView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </BrowserRouter>
              </FirebaseDataProvider>
            </EegDataProvider>
          </NetworkProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
