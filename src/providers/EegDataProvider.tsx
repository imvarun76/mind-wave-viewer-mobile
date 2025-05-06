import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define the type for a single channel's data
export type EegChannel = {
  id: number;
  name: string;
  color: string;
  visible: boolean;
  data: number[];
  min: number;
  max: number;
};

// Define the type for the WebSocket connection settings
export type ConnectionSettings = {
  serverUrl: string;
  protocol: string;
  autoConnect: boolean;
  reconnectInterval: number;
  dataFormat: 'json' | 'binary' | 'csv';
};

// Define the type for the EEG data context
type EegDataContextType = {
  channels: EegChannel[];
  connectionSettings: ConnectionSettings;
  wsStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isRecording: boolean;
  samplingRate: number;
  timeWindow: number;
  updateChannel: (channelId: number, updates: Partial<EegChannel>) => void;
  addChannel: (channel: Omit<EegChannel, 'id'>) => void;
  removeChannel: (channelId: number) => void;
  updateConnectionSettings: (settings: Partial<ConnectionSettings>) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  toggleRecording: () => void;
  setTimeWindow: (seconds: number) => void;
  resetData: () => void;
};

// Initial channel colors (from tailwind config)
const channelColors = [
  '#FF5151', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// Initial channels configuration
const initialChannels: EegChannel[] = [
  { id: 1, name: 'Channel 1', color: channelColors[0], visible: true, data: [], min: -100, max: 100 },
  { id: 2, name: 'Channel 2', color: channelColors[1], visible: true, data: [], min: -100, max: 100 },
  { id: 3, name: 'Channel 3', color: channelColors[2], visible: true, data: [], min: -100, max: 100 },
  { id: 4, name: 'Channel 4', color: channelColors[3], visible: true, data: [], min: -100, max: 100 },
];

// Initial connection settings
const initialConnectionSettings: ConnectionSettings = {
  serverUrl: 'ws://192.168.1.100:8080',
  protocol: '',
  autoConnect: false,
  reconnectInterval: 5000,
  dataFormat: 'json',
};

const EegDataContext = createContext<EegDataContextType | undefined>(undefined);

export const EegDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [channels, setChannels] = useState<EegChannel[]>(() => {
    // Try to load channels from localStorage
    const savedChannels = localStorage.getItem('eeg-channels');
    return savedChannels ? JSON.parse(savedChannels) : initialChannels;
  });
  
  const [connectionSettings, setConnectionSettings] = useState<ConnectionSettings>(() => {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem('eeg-connection-settings');
    return savedSettings ? JSON.parse(savedSettings) : initialConnectionSettings;
  });
  
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [samplingRate, setSamplingRate] = useState(250); // 250 Hz default
  const [timeWindow, setTimeWindow] = useState(5); // 5 seconds of data
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  // Save channels to localStorage when they change
  useEffect(() => {
    localStorage.setItem('eeg-channels', JSON.stringify(channels));
  }, [channels]);
  
  // Save connection settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('eeg-connection-settings', JSON.stringify(connectionSettings));
  }, [connectionSettings]);
  
  // Function to update a channel
  const updateChannel = useCallback((channelId: number, updates: Partial<EegChannel>) => {
    setChannels(prev => 
      prev.map(channel => 
        channel.id === channelId ? { ...channel, ...updates } : channel
      )
    );
  }, []);
  
  // Function to add a new channel
  const addChannel = useCallback((channel: Omit<EegChannel, 'id'>) => {
    setChannels(prev => {
      const nextId = Math.max(0, ...prev.map(c => c.id)) + 1;
      return [...prev, { ...channel, id: nextId }];
    });
  }, []);
  
  // Function to remove a channel
  const removeChannel = useCallback((channelId: number) => {
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
  }, []);
  
  // Function to update connection settings
  const updateConnectionSettings = useCallback((settings: Partial<ConnectionSettings>) => {
    setConnectionSettings(prev => ({ ...prev, ...settings }));
  }, []);
  
  // WebSocket connection handling
  const connectWebSocket = useCallback(() => {
    if (socket) {
      socket.close();
    }
    
    try {
      setWsStatus('connecting');
      
      const newSocket = new WebSocket(connectionSettings.serverUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setWsStatus('connected');
        toast({
          title: "Connected to EEG Device",
          description: `Connection established to ${connectionSettings.serverUrl}`,
        });
      };
      
      newSocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWsStatus('disconnected');
        
        // Auto-reconnect if enabled
        if (connectionSettings.autoConnect) {
          setTimeout(connectWebSocket, connectionSettings.reconnectInterval);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to EEG device. Check your settings and try again.",
          variant: "destructive"
        });
      };
      
      newSocket.onmessage = (event) => {
        if (!isRecording) return;
        
        try {
          let data;
          
          // Parse data based on the configured format
          switch (connectionSettings.dataFormat) {
            case 'json':
              data = JSON.parse(event.data);
              break;
            case 'csv':
              data = event.data.split(',').map(Number);
              break;
            case 'binary':
              // Convert binary data to array of numbers
              const buffer = event.data;
              data = new Float32Array(buffer);
              break;
            default:
              data = JSON.parse(event.data);
          }
          
          // Update channel data
          setChannels(prev => {
            return prev.map((channel, index) => {
              // Only add data if we have data for this channel
              if (data[index] !== undefined) {
                const newData = [...channel.data, data[index]];
                
                // Keep only the last N points based on sampling rate and time window
                const maxPoints = samplingRate * timeWindow;
                const trimmedData = newData.length > maxPoints 
                  ? newData.slice(newData.length - maxPoints) 
                  : newData;
                
                return {
                  ...channel,
                  data: trimmedData,
                };
              }
              return channel;
            });
          });
        } catch (error) {
          console.error('Error processing EEG data:', error);
        }
      };
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsStatus('error');
      toast({
        title: "Connection Failed",
        description: "Could not establish connection to the EEG device.",
        variant: "destructive"
      });
    }
  }, [connectionSettings, isRecording, socket, timeWindow, samplingRate]);
  
  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setWsStatus('disconnected');
    }
  }, [socket]);
  
  // Toggle recording state
  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
  }, []);
  
  // Reset all channel data
  const resetData = useCallback(() => {
    setChannels(prev => 
      prev.map(channel => ({ ...channel, data: [] }))
    );
  }, []);
  
  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);
  
  const value = {
    channels,
    connectionSettings,
    wsStatus,
    isRecording,
    samplingRate,
    timeWindow,
    updateChannel,
    addChannel,
    removeChannel,
    updateConnectionSettings,
    connectWebSocket,
    disconnectWebSocket,
    toggleRecording,
    setTimeWindow,
    resetData,
  };
  
  return <EegDataContext.Provider value={value}>{children}</EegDataContext.Provider>;
};

export const useEegData = (): EegDataContextType => {
  const context = useContext(EegDataContext);
  if (context === undefined) {
    throw new Error('useEegData must be used within an EegDataProvider');
  }
  return context;
};
