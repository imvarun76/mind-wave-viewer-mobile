
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { Network } from "@capacitor/network";
import { toast } from "@/components/ui/use-toast";

type NetworkStatus = {
  connected: boolean;
  connectionType: string;
};

type NetworkContextType = {
  status: NetworkStatus;
  checkConnection: () => Promise<NetworkStatus>;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>({
    connected: true, // Default to true since web browsers are typically connected
    connectionType: "unknown"
  });
  const networkListenerRef = useRef<any>(null);

  const checkConnection = async (): Promise<NetworkStatus> => {
    try {
      const networkStatus = await Network.getStatus();
      setStatus(networkStatus);
      return networkStatus;
    } catch (error) {
      console.error("Failed to check network connection:", error);
      // Fallback for web
      const fallbackStatus = {
        connected: navigator.onLine,
        connectionType: navigator.onLine ? "wifi" : "none"
      };
      setStatus(fallbackStatus);
      return fallbackStatus;
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up listeners
    const setupNetworkListener = async () => {
      try {
        const listener = await Network.addListener("networkStatusChange", (status) => {
          console.log("Network status changed:", status);
          setStatus(status);
          
          if (!status.connected) {
            toast({
              title: "Network Disconnected",
              description: "You've lost network connection. EEG signals may not update.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Network Connected",
              description: `Connected via ${status.connectionType}`,
              variant: "default"
            });
          }
        });
        
        networkListenerRef.current = listener;
      } catch (error) {
        console.error("Failed to set up network listener:", error);
      }
    };
    
    setupNetworkListener();

    return () => {
      // Cleanup listener when component unmounts
      if (networkListenerRef.current) {
        try {
          networkListenerRef.current.remove();
        } catch (error) {
          console.error("Error removing network listener:", error);
        }
      }
    };
  }, []);

  const value = {
    status,
    checkConnection
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
