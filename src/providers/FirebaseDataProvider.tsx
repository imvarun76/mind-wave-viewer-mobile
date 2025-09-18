import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define the type for batch EEG data from firmware
export type FirebaseEegBatch = {
  ch1: number[];  // 256 float samples
  ch2: number[];
  ch3: number[];
  ch4: number[];
  ch5: number[];
  ch6: number[];
  ch7: number[];
  ch8: number[];
  timestamp_ms: number;
  sampling_rate: number;
  batch_size: number;
};

// Define the type for processed sample data
export type ProcessedEegSample = {
  timestamp: number;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
  ch5: number;
  ch6: number;
  ch7: number;
  ch8: number;
};

// Define the type for the data we expect from Firebase
export type FirebaseEegData = {
  hr?: number;
  spo2?: number;
  temp?: number;
  timestamp?: number;
  // Current batch data
  latestBatch?: FirebaseEegBatch;
  // Processed samples for visualization
  samples?: ProcessedEegSample[];
  // Backward compatibility fields
  ch1?: number;
  ch2?: number;
  ch3?: number;
  ch4?: number;
  ch5?: number;
  ch6?: number;
  ch7?: number;
  ch8?: number;
  channels?: {
    [key: string]: number[];
  };
  sample_rate?: number;
  samples_count?: number;
  batch_start?: number;
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
const LATEST_BATCH_URL = `${FIREBASE_BASE_URL}/eeg_signals.json`;

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

  // Function to process batch data into individual samples with timestamps
  const processBatchData = (batch: FirebaseEegBatch): ProcessedEegSample[] => {
    const samples: ProcessedEegSample[] = [];
    const { timestamp_ms, sampling_rate, batch_size } = batch;
    
    for (let i = 0; i < batch_size; i++) {
      const sampleTimestamp = timestamp_ms + i * (1000 / sampling_rate);
      samples.push({
        timestamp: sampleTimestamp,
        ch1: batch.ch1[i] || 0,
        ch2: batch.ch2[i] || 0,
        ch3: batch.ch3[i] || 0,
        ch4: batch.ch4[i] || 0,
        ch5: batch.ch5[i] || 0,
        ch6: batch.ch6[i] || 0,
        ch7: batch.ch7[i] || 0,
        ch8: batch.ch8[i] || 0,
      });
    }
    
    return samples;
  };

  // Function to convert batch data for visualization (backward compatibility)
  const getVisualizationData = (data: FirebaseEegData) => {
    if (!data.samples || data.samples.length === 0) {
      return {
        ch1: 0, ch2: 0, ch3: 0, ch4: 0, ch5: 0, ch6: 0, ch7: 0, ch8: 0,
        channels: { ch1: [], ch2: [], ch3: [], ch4: [], ch5: [], ch6: [], ch7: [], ch8: [] },
        sample_rate: 256,
        samples_count: 0,
        batch_start: 0
      };
    }
    
    // Get latest values for single channel display
    const latestSample = data.samples[data.samples.length - 1];
    
    // Create channel arrays for waveform display
    const channels = {
      ch1: data.samples.map(s => s.ch1),
      ch2: data.samples.map(s => s.ch2), 
      ch3: data.samples.map(s => s.ch3),
      ch4: data.samples.map(s => s.ch4),
      ch5: data.samples.map(s => s.ch5),
      ch6: data.samples.map(s => s.ch6),
      ch7: data.samples.map(s => s.ch7),
      ch8: data.samples.map(s => s.ch8),
    };
    
    return {
      ch1: latestSample.ch1,
      ch2: latestSample.ch2,
      ch3: latestSample.ch3,
      ch4: latestSample.ch4,
      ch5: latestSample.ch5,
      ch6: latestSample.ch6,
      ch7: latestSample.ch7,
      ch8: latestSample.ch8,
      channels,
      sample_rate: data.latestBatch?.sampling_rate || 256,
      samples_count: data.samples.length,
      batch_start: data.latestBatch?.timestamp_ms || Date.now()
    };
  };

  // Function to fetch data from the ESP32's latest batch endpoint
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching EEG batch data from:', LATEST_BATCH_URL);
      
      // Fetch latest batch data
      const batchResponse = await fetch(LATEST_BATCH_URL);
      console.log('📡 Batch Response status:', batchResponse.status);
      
      let combinedData: FirebaseEegData = {
        timestamp: Date.now(),
      };

      if (batchResponse.ok) {
        const batchData = await batchResponse.json();
        console.log('🧠 Batch Data received:', batchData);
        
        if (batchData && batchData.ch1 && batchData.timestamp) {
          // Convert the Firebase structure to our expected batch format
          const convertedBatch: FirebaseEegBatch = {
            ch1: batchData.ch1 || [],
            ch2: batchData.ch2 || [],
            ch3: batchData.ch3 || [],
            ch4: batchData.ch4 || [],
            ch5: batchData.ch5 || [],
            ch6: batchData.ch6 || [],
            ch7: batchData.ch7 || [],
            ch8: batchData.ch8 || [],
            timestamp_ms: batchData.timestamp * 1000, // Convert to milliseconds if needed
            sampling_rate: 256, // Default sampling rate
            batch_size: batchData.ch1 ? batchData.ch1.length : 256
          };
          
          // Process batch into individual samples
          const samples = processBatchData(convertedBatch);
          
          combinedData = {
            ...combinedData,
            latestBatch: convertedBatch,
            samples: samples,
            timestamp: convertedBatch.timestamp_ms,
          };
        }
      } else {
        console.warn('⚠️ Failed to fetch EEG batch data:', batchResponse.status);
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

      // Update current data with visualization compatibility
      const visualData = { ...combinedData, ...getVisualizationData(combinedData) };
      setData(visualData);

      // Update timeseries data with the new data point
      const timestamp = Date.now().toString();
      setRawTimeseriesData(prev => {
        const newTimeseries = { ...prev, [timestamp]: visualData };
        
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
      return visualData;
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
