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
  deviceMacAddress: string;
  channelCount: 4 | 8 | 16;
  remoteMode: boolean;
  deviceName: string;
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
  setChannelCount: (count: 4 | 8 | 16) => void;
  updateAllChannelData: (data: number[]) => void;
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
  // Additional colors for 16 channels
  '#4F46E5', // Indigo
  '#0EA5E9', // Sky
  '#0891B2', // Cyan
  '#059669', // Emerald
  '#84CC16', // Lime
  '#EAB308', // Amber
  '#D97706', // Amber Dark
  '#DC2626', // Red Dark
];

// Generate channels based on count
const generateChannels = (count: number): EegChannel[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Channel ${i + 1}`,
    color: channelColors[i % channelColors.length],
    visible: true,
    data: [],
    min: -100,
    max: 100
  }));
};

// Initial connection settings
const initialConnectionSettings: ConnectionSettings = {
  serverUrl: 'ws://192.168.1.100:8080',
  protocol: '',
  autoConnect: false,
  reconnectInterval: 5000,
  dataFormat: 'json',
  deviceMacAddress: '',
  channelCount: 4,
  remoteMode: false,
  deviceName: 'EEG Device',
};

const EegDataContext = createContext<EegDataContextType | undefined>(undefined);

export const EegDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [channels, setChannels] = useState<EegChannel[]>(() => {
    // Try to load channels from localStorage
    const savedChannels = localStorage.getItem('eeg-channels');
    return savedChannels ? JSON.parse(savedChannels) : generateChannels(4);
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
  
  // Function to set channel count (4, 8, or 16)
  const setChannelCount = useCallback((count: 4 | 8 | 16) => {
    setConnectionSettings(prev => ({ ...prev, channelCount: count }));
    
    // Generate new channels based on count
    const newChannels = generateChannels(count);
    
    // Preserve existing channel settings when possible
    setChannels(prev => {
      return newChannels.map((newChannel, index) => {
        const existingChannel = prev.find(c => c.id === newChannel.id);
        if (existingChannel) {
          return { 
            ...newChannel, 
            name: existingChannel.name, 
            color: existingChannel.color,
            min: existingChannel.min,
            max: existingChannel.max,
            visible: existingChannel.visible
          };
        }
        return newChannel;
      });
    });
    
    toast({
      title: "Channel Count Updated",
      description: `Using ${count} EEG channels`,
    });
  }, []);
  
  // Function to update all channel data at once
  const updateAllChannelData = useCallback((newData: number[]) => {
    if (newData.length === 0) return;
    
    setChannels(prev => {
      return prev.map((channel, index) => {
        // Only update channels that have corresponding data
        if (index < newData.length) {
          const value = newData[index];
          // Add the new data point to the channel
          const newDataPoints = [...channel.data, value];
          
          // Keep only the last N points based on sampling rate and time window
          const maxPoints = samplingRate * timeWindow;
          const trimmedData = newDataPoints.length > maxPoints 
            ? newDataPoints.slice(newDataPoints.length - maxPoints) 
            : newDataPoints;
          
          return { ...channel, data: trimmedData };
        }
        return channel;
      });
    });
  }, [samplingRate, timeWindow]);
  
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
        
        // If we have a MAC address, send it for device identification
        if (connectionSettings.deviceMacAddress) {
          const identificationMessage = JSON.stringify({
            type: 'identify',
            macAddress: connectionSettings.deviceMacAddress,
            channelCount: connectionSettings.channelCount,
            remoteMode: connectionSettings.remoteMode
          });
          newSocket.send(identificationMessage);
        }
        
        toast({
          title: "Connected to EEG Device",
          description: connectionSettings.deviceName || `Connection established to ${connectionSettings.serverUrl}`,
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
              // Check if the data has a specific format with device info
              if (data.macAddress && data.deviceName) {
                // Update device info if provided
                updateConnectionSettings({
                  deviceMacAddress: data.macAddress,
                  deviceName: data.deviceName
                });
                // Extract the actual EEG data
                data = data.data || [];
              }
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
          
          // Update all channel data at once
          if (Array.isArray(data)) {
            updateAllChannelData(data);
          }
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
  }, [connectionSettings, isRecording, socket, updateAllChannelData, updateConnectionSettings]);
  
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
    setChannelCount,
    updateAllChannelData
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
