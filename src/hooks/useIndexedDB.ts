import { useCallback } from 'react';

export interface EegBatch {
  record_id: string;
  batch_index: number;
  timestamp_ms: number;
  sampling_rate_hz: number;
  batch_size: number;
  device_id: string;
  ch1: number[];
  ch2: number[];
  ch3: number[];
  ch4: number[];
  ch5: number[];
  ch6: number[];
  ch7: number[];
  ch8: number[];
}

export interface RecordingSession {
  record_id: string;
  device_id: string;
  start_timestamp: number;
  end_timestamp?: number;
  status: 'recording' | 'stopped' | 'uploaded' | 'error';
  batch_count: number;
  sampling_rate: number;
}

const DB_NAME = 'EEGRecordings';
const DB_VERSION = 1;
const BATCHES_STORE = 'batches';
const SESSIONS_STORE = 'sessions';

export const useIndexedDB = () => {
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create batches store
        if (!db.objectStoreNames.contains(BATCHES_STORE)) {
          const batchStore = db.createObjectStore(BATCHES_STORE, { 
            keyPath: ['record_id', 'batch_index'] 
          });
          batchStore.createIndex('record_id', 'record_id', { unique: false });
          batchStore.createIndex('timestamp', 'timestamp_ms', { unique: false });
        }
        
        // Create sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionStore = db.createObjectStore(SESSIONS_STORE, { 
            keyPath: 'record_id' 
          });
          sessionStore.createIndex('status', 'status', { unique: false });
          sessionStore.createIndex('start_timestamp', 'start_timestamp', { unique: false });
        }
      };
    });
  }, []);

  const storeBatch = useCallback(async (batch: EegBatch): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction([BATCHES_STORE], 'readwrite');
    const store = transaction.objectStore(BATCHES_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put(batch);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }, [openDB]);

  const storeSession = useCallback(async (session: RecordingSession): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put(session);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }, [openDB]);

  const getBatchesForRecord = useCallback(async (recordId: string): Promise<EegBatch[]> => {
    const db = await openDB();
    const transaction = db.transaction([BATCHES_STORE], 'readonly');
    const store = transaction.objectStore(BATCHES_STORE);
    const index = store.index('record_id');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(recordId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const batches = request.result as EegBatch[];
        // Sort by batch_index to ensure correct order
        batches.sort((a, b) => a.batch_index - b.batch_index);
        resolve(batches);
      };
    });
  }, [openDB]);

  const getSession = useCallback(async (recordId: string): Promise<RecordingSession | null> => {
    const db = await openDB();
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(recordId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }, [openDB]);

  const getAllSessions = useCallback(async (): Promise<RecordingSession[]> => {
    const db = await openDB();
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result as RecordingSession[];
        // Sort by start timestamp (newest first)
        sessions.sort((a, b) => b.start_timestamp - a.start_timestamp);
        resolve(sessions);
      };
    });
  }, [openDB]);

  const deleteSession = useCallback(async (recordId: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction([BATCHES_STORE, SESSIONS_STORE], 'readwrite');
    
    // Delete all batches for this record
    const batchStore = transaction.objectStore(BATCHES_STORE);
    const batchIndex = batchStore.index('record_id');
    const batchRequest = batchIndex.openCursor(recordId);
    
    batchRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Delete the session
    const sessionStore = transaction.objectStore(SESSIONS_STORE);
    sessionStore.delete(recordId);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }, [openDB]);

  const updateSessionStatus = useCallback(async (recordId: string, status: RecordingSession['status']): Promise<void> => {
    const session = await getSession(recordId);
    if (session) {
      session.status = status;
      if (status === 'stopped') {
        session.end_timestamp = Date.now();
      }
      await storeSession(session);
    }
  }, [getSession, storeSession]);

  return {
    storeBatch,
    storeSession,
    getBatchesForRecord,
    getSession,
    getAllSessions,
    deleteSession,
    updateSessionStatus,
  };
};