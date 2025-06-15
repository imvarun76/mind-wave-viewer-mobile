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

// Firebase URLs matching your ESP32 code
const FIREBASE_BASE_URL = 'https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app';
const EEG_SIGNALS_URL = `${FIREBASE_BASE_URL}/devices/eeg_signals.json`;

// Health data endpoints (keeping these separate as they might exist)
const HEALTH_ENDPOINTS = {
  hr: `${FIREBASE_BASE_URL}/devices/esp32_001/hr.json`,
  spo2: `${FIREBASE_BASE_URL}/devices/esp32_001/spo2.json`,
  temp: `${FIREBASE_BASE_URL}/devices/esp32_001/temp.json`,
};

export const FirebaseDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FirebaseEegData>({});
  const [rawTimeseriesData, setRawTimeseriesData] = useState<FirebaseTimestampedData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(500); // Default to 500ms
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Function to fetch data from the ESP32's eeg_signals endpoint
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching EEG data from:', EEG_SIGNALS_URL);
      
      // Fetch EEG signals data
      const eegResponse = await fetch(EEG_SIGNALS_URL);
      console.log('📡 EEG Response status:', eegResponse.status);
      
      let combinedData: FirebaseEegData = {
        timestamp: Date.now(),
      };

      if (eegResponse.ok) {
        const eegData = await eegResponse.json();
        console.log('🧠 EEG Data received:', eegData);
        
        if (eegData) {
          // Extract channel data from the ESP32 format
          combinedData = {
            ...combinedData,
            ch1: eegData.ch1,
            ch2: eegData.ch2,
            ch3: eegData.ch3,
            ch4: eegData.ch4,
            ch5: eegData.ch5,
            ch6: eegData.ch6,
            ch7: eegData.ch7,
            ch8: eegData.ch8,
            timestamp: eegData.timestamp || Date.now(),
          };
        }
      } else {
        console.warn('⚠️ Failed to fetch EEG data:', eegResponse.status);
      }

      // Fetch health data in parallel (optional)
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

      // Wait for health data
      const healthResults = await Promise.all(healthPromises);
      
      // Add health data
      healthResults.forEach(result => {
        Object.assign(combinedData, result);
      });

      console.log('📊 Combined data:', combinedData);

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
      console.error('❌ Error fetching data:', errorMessage);
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
