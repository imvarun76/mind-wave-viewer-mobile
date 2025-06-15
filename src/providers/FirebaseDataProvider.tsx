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

// Firebase base URL for individual channel paths
const FIREBASE_BASE_URL = 'https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/esp32_001';

// Individual channel endpoints
const CHANNEL_ENDPOINTS = [
  `${FIREBASE_BASE_URL}/ch1.json`,
  `${FIREBASE_BASE_URL}/ch2.json`,
  `${FIREBASE_BASE_URL}/ch3.json`,
  `${FIREBASE_BASE_URL}/ch4.json`,
  `${FIREBASE_BASE_URL}/ch5.json`,
  `${FIREBASE_BASE_URL}/ch6.json`,
  `${FIREBASE_BASE_URL}/ch7.json`,
  `${FIREBASE_BASE_URL}/ch8.json`,
];

// Health data endpoints
const HEALTH_ENDPOINTS = {
  hr: `${FIREBASE_BASE_URL}/hr.json`,
  spo2: `${FIREBASE_BASE_URL}/spo2.json`,
  temp: `${FIREBASE_BASE_URL}/temp.json`,
};

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FirebaseEegData>({});
  const [rawTimeseriesData, setRawTimeseriesData] = useState<FirebaseTimestampedData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(500); // Default to 500ms
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Function to fetch data from all individual channel endpoints
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all channel data in parallel
      const channelPromises = CHANNEL_ENDPOINTS.map(async (url, index) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`Failed to fetch ch${index + 1}: ${response.status}`);
            return { [`ch${index + 1}`]: null };
          }
          const value = await response.json();
          return { [`ch${index + 1}`]: value };
        } catch (err) {
          console.warn(`Error fetching ch${index + 1}:`, err);
          return { [`ch${index + 1}`]: null };
        }
      });

      // Fetch health data in parallel
      const healthPromises = Object.entries(HEALTH_ENDPOINTS).map(async ([key, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`Failed to fetch ${key}: ${response.status}`);
            return { [key]: null };
          }
          const value = await response.json();
          return { [key]: value };
        } catch (err) {
          console.warn(`Error fetching ${key}:`, err);
          return { [key]: null };
        }
      });

      // Wait for all requests to complete
      const [channelResults, healthResults] = await Promise.all([
        Promise.all(channelPromises),
        Promise.all(healthPromises)
      ]);

      // Combine all results into a single data object
      const combinedData: FirebaseEegData = {
        timestamp: Date.now(),
      };

      // Add channel data
      channelResults.forEach(result => {
        Object.assign(combinedData, result);
      });

      // Add health data
      healthResults.forEach(result => {
        Object.assign(combinedData, result);
      });

      // Update current data
      setData(combinedData);

      // Update timeseries data with the new data point
      const timestamp = Date.now().toString();
      setRawTimeseriesData(prev => {
        const newTimeseries = { ...prev, [timestamp]: combinedData };
        
        // Keep only the last 100 data points to prevent memory issues
        const timestamps = Object.keys(newTimeseries).sort();
        if (timestamps.length > 100) {
          const trimmedTimeseries: FirebaseTimestampedData = {};
          timestamps.slice(-100).forEach(ts => {
            trimmedTimeseries[ts] = newTimeseries[ts];
          });
          return trimmedTimeseries;
        }
        
        return newTimeseries;
      });
      
      setLastUpdated(new Date());
      return combinedData;
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
