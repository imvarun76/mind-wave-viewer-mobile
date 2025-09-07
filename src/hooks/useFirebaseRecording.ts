import { useState, useCallback } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, set, remove } from 'firebase/database';
import { storage, database } from '@/lib/firebase';
import { useIndexedDB, EegBatch, RecordingSession } from '@/hooks/useIndexedDB';
import { toast } from '@/components/ui/use-toast';

export interface RecordingMetadata {
  record_id: string;
  device_id: string;
  user_id?: string;
  start_ts: number;
  end_ts: number;
  sampling_rate: number;
  sample_count: number;
  size_bytes: number;
  storage_path: string;
  download_url: string;
  created_at: number;
  duration_ms: number;
}

export interface UploadProgress {
  recordId: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export const useFirebaseRecording = () => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const { getBatchesForRecord, updateSessionStatus, deleteSession } = useIndexedDB();

  const assembleCSVFromBatches = useCallback(async (recordId: string): Promise<{
    blob: Blob;
    size: number;
    sample_count: number;
    sampling_rate: number;
    start_ts: number;
    end_ts: number;
  }> => {
    const batches = await getBatchesForRecord(recordId);
    if (!batches || batches.length === 0) {
      throw new Error('No batches found for this recording');
    }

    const samplingRate = batches[0].sampling_rate_hz || 100;
    const intervalMs = Math.round(1000 / samplingRate);

    // CSV header
    const rows: string[] = [];
    rows.push(['timestamp_ms', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].join(','));

    let totalSamples = 0;

    for (const batch of batches) {
      const batchSize = batch.batch_size || (batch.ch1 ? batch.ch1.length : 0);
      
      for (let i = 0; i < batchSize; i++) {
        const ts = batch.timestamp_ms + i * intervalMs;
        const vals = [
          ts.toString(),
          batch.ch1?.[i]?.toString() ?? '',
          batch.ch2?.[i]?.toString() ?? '',
          batch.ch3?.[i]?.toString() ?? '',
          batch.ch4?.[i]?.toString() ?? '',
          batch.ch5?.[i]?.toString() ?? '',
          batch.ch6?.[i]?.toString() ?? '',
          batch.ch7?.[i]?.toString() ?? '',
          batch.ch8?.[i]?.toString() ?? ''
        ];
        rows.push(vals.join(','));
        totalSamples++;
      }
    }

    const csvText = rows.join('\n');
    const blob = new Blob([csvText], { type: 'text/csv' });
    
    const lastBatch = batches[batches.length - 1];
    const lastBatchSize = lastBatch.batch_size || (lastBatch.ch1 ? lastBatch.ch1.length : 0);
    const endTs = lastBatch.timestamp_ms + (lastBatchSize - 1) * intervalMs;

    return {
      blob,
      size: blob.size,
      sample_count: totalSamples,
      sampling_rate: samplingRate,
      start_ts: batches[0].timestamp_ms,
      end_ts: endTs
    };
  }, [getBatchesForRecord]);

  const uploadRecordingToFirebase = useCallback(async (
    recordId: string,
    session: RecordingSession
  ): Promise<RecordingMetadata> => {
    try {
      setUploadProgress(prev => ({
        ...prev,
        [recordId]: { recordId, progress: 0, status: 'uploading' }
      }));

      // Assemble CSV from batches
      const csvData = await assembleCSVFromBatches(recordId);
      
      // Create storage path
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const fileName = `${session.device_id}_${timestamp}_${recordId}.csv`;
      const storagePath = `recordings/${session.device_id}/${fileName}`;
      const fileRef = storageRef(storage, storagePath);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(fileRef, csvData.blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({
              ...prev,
              [recordId]: { recordId, progress, status: 'uploading' }
            }));
          },
          (error) => {
            console.error('Upload error:', error);
            setUploadProgress(prev => ({
              ...prev,
              [recordId]: { recordId, progress: 0, status: 'error', error: error.message }
            }));
            reject(error);
          },
          async () => {
            try {
              // Upload completed successfully
              const downloadURL = await getDownloadURL(fileRef);
              
              // Create metadata
              const metadata: RecordingMetadata = {
                record_id: recordId,
                device_id: session.device_id,
                start_ts: csvData.start_ts,
                end_ts: csvData.end_ts,
                sampling_rate: csvData.sampling_rate,
                sample_count: csvData.sample_count,
                size_bytes: csvData.size,
                storage_path: storagePath,
                download_url: downloadURL,
                created_at: Date.now(),
                duration_ms: csvData.end_ts - csvData.start_ts
              };

              // Save metadata to Realtime Database
              const metaRef = dbRef(database, `recordings_meta/${session.device_id}/${recordId}`);
              await set(metaRef, metadata);

              // Update session status
              await updateSessionStatus(recordId, 'uploaded');

              setUploadProgress(prev => ({
                ...prev,
                [recordId]: { recordId, progress: 100, status: 'success' }
              }));

              toast({
                title: "Recording Uploaded",
                description: `Recording ${recordId} uploaded successfully`,
              });

              resolve(metadata);
            } catch (error) {
              console.error('Metadata save error:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Upload preparation error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [recordId]: { recordId, progress: 0, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
      }));
      throw error;
    }
  }, [assembleCSVFromBatches, updateSessionStatus]);

  const downloadRecording = useCallback(async (metadata: RecordingMetadata): Promise<void> => {
    try {
      if (metadata.download_url) {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = metadata.download_url;
        link.download = `recording_${metadata.record_id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download Started",
          description: `Downloading recording ${metadata.record_id}`,
        });
      } else {
        throw new Error('Download URL not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, []);

  const deleteRecording = useCallback(async (metadata: RecordingMetadata): Promise<void> => {
    try {
      // Delete from Storage
      const fileRef = storageRef(storage, metadata.storage_path);
      await deleteObject(fileRef);

      // Delete metadata from Database
      const metaRef = dbRef(database, `recordings_meta/${metadata.device_id}/${metadata.record_id}`);
      await remove(metaRef);

      // Delete from local IndexedDB
      await deleteSession(metadata.record_id);

      toast({
        title: "Recording Deleted",
        description: `Recording ${metadata.record_id} deleted successfully`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  }, [deleteSession]);

  const clearUploadProgress = useCallback((recordId: string) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[recordId];
      return newProgress;
    });
  }, []);

  return {
    uploadRecordingToFirebase,
    downloadRecording,
    deleteRecording,
    uploadProgress,
    clearUploadProgress,
  };
};