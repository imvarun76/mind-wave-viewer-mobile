import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { useIndexedDB, EegBatch, RecordingSession } from '@/hooks/useIndexedDB';
import { toast } from '@/components/ui/use-toast';

interface RecordingContextType {
  isRecording: boolean;
  currentRecordId: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  recordingSessions: RecordingSession[];
  refreshSessions: () => Promise<void>;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [recordingSessions, setRecordingSessions] = useState<RecordingSession[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);

  const { data: firebaseData } = useFirebaseData();
  const { 
    storeBatch, 
    storeSession, 
    getAllSessions, 
    updateSessionStatus 
  } = useIndexedDB();

  const generateRecordId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `rec_${timestamp}_${random}`;
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const sessions = await getAllSessions();
      setRecordingSessions(sessions);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  }, [getAllSessions]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const recordId = generateRecordId();
      const deviceId = 'esp32_001'; // You can make this configurable
      
      const session: RecordingSession = {
        record_id: recordId,
        device_id: deviceId,
        start_timestamp: Date.now(),
        status: 'recording',
        batch_count: 0,
        sampling_rate: 100, // Default, will be updated with actual data
      };

      await storeSession(session);
      setCurrentRecordId(recordId);
      setIsRecording(true);
      setBatchIndex(0);

      toast({
        title: "Recording Started",
        description: `Recording ${recordId} has begun`,
      });

      await refreshSessions();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Failed to start recording",
        variant: "destructive",
      });
    }
  }, [isRecording, generateRecordId, storeSession, refreshSessions]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !currentRecordId) return;

    try {
      await updateSessionStatus(currentRecordId, 'stopped');
      setIsRecording(false);
      setCurrentRecordId(null);
      setBatchIndex(0);

      toast({
        title: "Recording Stopped",
        description: `Recording ${currentRecordId} has been stopped`,
      });

      await refreshSessions();
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Stop Recording Failed",
        description: "Failed to stop recording",
        variant: "destructive",
      });
    }
  }, [isRecording, currentRecordId, updateSessionStatus, refreshSessions]);

  // Store incoming data as batches when recording
  useEffect(() => {
    if (!isRecording || !currentRecordId || !firebaseData) return;

    // Check if we have batch data or single channel data
    const hasChannels = firebaseData.channels && Object.keys(firebaseData.channels).length > 0;
    const hasSingleValues = firebaseData.ch1 !== undefined;

    if (!hasChannels && !hasSingleValues) return;

    try {
      let batch: EegBatch;

      if (hasChannels && firebaseData.channels) {
        // Use batch data from ESP32
        batch = {
          record_id: currentRecordId,
          batch_index: batchIndex,
          timestamp_ms: firebaseData.timestamp || Date.now(),
          sampling_rate_hz: firebaseData.sample_rate || 100,
          batch_size: firebaseData.samples_count || 100,
          device_id: 'esp32_001',
          ch1: firebaseData.channels.ch1 || [],
          ch2: firebaseData.channels.ch2 || [],
          ch3: firebaseData.channels.ch3 || [],
          ch4: firebaseData.channels.ch4 || [],
          ch5: firebaseData.channels.ch5 || [],
          ch6: firebaseData.channels.ch6 || [],
          ch7: firebaseData.channels.ch7 || [],
          ch8: firebaseData.channels.ch8 || [],
        };
      } else {
        // Create single-sample batch from individual channel values
        batch = {
          record_id: currentRecordId,
          batch_index: batchIndex,
          timestamp_ms: firebaseData.timestamp || Date.now(),
          sampling_rate_hz: 1, // 1 sample per update
          batch_size: 1,
          device_id: 'esp32_001',
          ch1: [firebaseData.ch1 || 0],
          ch2: [firebaseData.ch2 || 0],
          ch3: [firebaseData.ch3 || 0],
          ch4: [firebaseData.ch4 || 0],
          ch5: [firebaseData.ch5 || 0],
          ch6: [firebaseData.ch6 || 0],
          ch7: [firebaseData.ch7 || 0],
          ch8: [firebaseData.ch8 || 0],
        };
      }

      storeBatch(batch);
      setBatchIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error storing batch:', error);
    }
  }, [firebaseData, isRecording, currentRecordId, batchIndex, storeBatch]);

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const value: RecordingContextType = {
    isRecording,
    currentRecordId,
    startRecording,
    stopRecording,
    recordingSessions,
    refreshSessions,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = (): RecordingContextType => {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};