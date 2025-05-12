
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

// Define a type for timestamped data from Firebase
export type FirebaseTimestampedData = {
  [timestamp: string]: FirebaseEegData;
};

// Define the context type
type FirebaseDataContextType = {
  data: FirebaseEegData;
  rawTimeseriesData: FirebaseTimestampedData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  setPollingInterval: (interval: number) => void;
};

// Create the context
const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

// Firebase API endpoint - updated to use ordered query
const FIREBASE_API_URL = 'https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/eeg_data_log.json?orderBy="$key"&limitToLast=50';

// Fallback to single data point if log endpoint doesn't work
const FIREBASE_FALLBACK_URL = 'https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/eeg_data.json';

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FirebaseEegData>({});
  const [rawTimeseriesData, setRawTimeseriesData] = useState<FirebaseTimestampedData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(1000); // Default to 1 second
  const [pollingId, setPollingId] = useState<number | null>(null);
  const [useLogEndpoint, setUseLogEndpoint] = useState<boolean>(true);

  // Function to fetch data from Firebase
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try the log endpoint
      const url = useLogEndpoint ? FIREBASE_API_URL : FIREBASE_FALLBACK_URL;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (useLogEndpoint && result) {
        // We're using the log endpoint and got data
        setRawTimeseriesData(result || {});
        
        // Extract the latest data point for backward compatibility
        const timestamps = Object.keys(result || {}).sort();
        if (timestamps.length > 0) {
          const latestTimestamp = timestamps[timestamps.length - 1];
          setData(result[latestTimestamp] || {});
        }
      } else if (!useLogEndpoint && result) {
        // Using the fallback endpoint
        setData(result || {});
        // Update timeseries with a single point
        const timestamp = Date.now().toString();
        setRawTimeseriesData({ [timestamp]: result || {} });
      } else if (useLogEndpoint && !result) {
        // Log endpoint returned no data, try fallback next time
        console.log("Log endpoint returned no data, switching to fallback endpoint");
        setUseLogEndpoint(false);
      }
      
      setLastUpdated(new Date());
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // If we got an error with the log endpoint, try the fallback next time
      if (useLogEndpoint) {
        console.log("Error with log endpoint, switching to fallback endpoint");
        setUseLogEndpoint(false);
      }
      
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
  }, [pollingInterval, useLogEndpoint]);

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
    rawTimeseriesData,
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
