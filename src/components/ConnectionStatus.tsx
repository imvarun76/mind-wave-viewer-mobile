
import React from 'react';
import { useEegData } from '@/providers/EegDataProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { WifiHigh, WifiOff, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ConnectionStatus: React.FC = () => {
  const { wsStatus, connectWebSocket, disconnectWebSocket, connectionSettings } = useEegData();
  const { status: networkStatus } = useNetwork();
  const navigate = useNavigate();
  
  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500 animate-pulse-signal';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusMessage = () => {
    if (!networkStatus.connected) {
      return 'No network connection';
    }
    
    switch (wsStatus) {
      case 'connected': return 'Connected to EEG device';
      case 'connecting': return 'Connecting to EEG device...';
      case 'error': return 'Connection error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {networkStatus.connected ? 
            <WifiHigh className="h-5 w-5 text-green-500 mr-2" /> : 
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
          }
          <span className="text-sm font-medium">
            {networkStatus.connected ? 'Network Connected' : 'Network Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center">
          <Signal className={cn("h-5 w-5 mr-2", getStatusColor())} />
          <span className="text-sm font-medium">{getStatusMessage()}</span>
        </div>
      </div>
      
      <div className="flex items-center mt-4 space-x-2">
        {wsStatus === 'connected' ? (
          <Button 
            variant="destructive" 
            size="sm"
            className="flex-1"
            onClick={disconnectWebSocket}
          >
            Disconnect
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm"
            className="flex-1"
            onClick={connectWebSocket}
            disabled={!networkStatus.connected || wsStatus === 'connecting'}
          >
            Connect
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1"
          onClick={() => navigate('/settings/connection')}
        >
          Settings
        </Button>
      </div>
      
      <div className="mt-3 text-xs text-muted-foreground truncate">
        Server: {connectionSettings.serverUrl}
      </div>
    </div>
  );
};

export default ConnectionStatus;
