import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define the type for the data we expect from Firebase
export type FirebaseEegData = {
  hr?: number;
  spo2?: number;
  temp?: number;
  timestamp?: number;
  // Channel data in flat format (ch1, ch2, etc.)
  ch1?: number;
  ch2?: number;
  ch3?: number;
  ch4?: number;
  ch5?: number;
  ch6?: number;
  ch7?: number;
  ch8?: number;
  // Support for array format too
  eeg?: number[][];  // For EEG data (array of channels, each with array of values)
  channels?: {
    [key: string]: number[];  // Channel name to array of values
  };
};

// Define the context type
type FirebaseDataContextType = {
  data: FirebaseEegData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  setPollingInterval: (interval: number) => void;
};

// Create the context
const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

// Firebase API endpoint - updated to use eeg_data.json
const FIREBASE_API_URL = 'https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/eeg_data.json';

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FirebaseEegData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(1000); // Default to 1 second
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Function to fetch data from Firebase
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(FIREBASE_API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result: FirebaseEegData = await response.json();
      setData(result);
      setLastUpdated(new Date());
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Data Fetch Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually refresh data
  const refreshData = async () => {
    const result = await fetchData();
    if (result) {
      toast({
        title: "Data Updated",
        description: `Data refreshed at ${new Date().toLocaleTimeString()}`,
      });
    }
  };

  // Set up polling
  useEffect(() => {
    // Clear any existing polling
    if (pollingId !== null) {
      window.clearInterval(pollingId);
    }
    
    // Set up new polling if interval > 0
    if (pollingInterval > 0) {
      const id = window.setInterval(fetchData, pollingInterval);
      setPollingId(id);
      
      // Initial fetch
      fetchData();
    }
    
    // Clean up on unmount
    return () => {
      if (pollingId !== null) {
        window.clearInterval(pollingId);
      }
    };
  }, [pollingInterval]);

  // Handler for changing the polling interval
  const handleSetPollingInterval = (interval: number) => {
    setPollingInterval(interval);
    toast({
      title: "Polling Interval Updated",
      description: interval > 0 
        ? interval < 1000 
          ? `Data will refresh every ${interval} milliseconds` 
          : `Data will refresh every ${interval/1000} seconds`
        : "Automatic polling disabled",
    });
  };

  const value = {
    data,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    setPollingInterval: handleSetPollingInterval,
  };

  return (
    <FirebaseDataContext.Provider value={value}>
      {children}
    </FirebaseDataContext.Provider>
  );
};

// Hook for using the Firebase data
export const useFirebaseData = (): FirebaseDataContextType => {
  const context = useContext(FirebaseDataContext);
  if (context === undefined) {
    throw new Error('useFirebaseData must be used within a FirebaseDataProvider');
  }
  return context;
};
