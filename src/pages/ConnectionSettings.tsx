
import { useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useEegData } from '@/providers/EegDataProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiHigh, WifiOff, NetworkIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ConnectionSettings = () => {
  const { connectionSettings, updateConnectionSettings, wsStatus, connectWebSocket, disconnectWebSocket } = useEegData();
  const { status: networkStatus, checkConnection } = useNetwork();
  
  const [tempSettings, setTempSettings] = useState({ ...connectionSettings });
  
  const handleServerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSettings({ ...tempSettings, serverUrl: e.target.value });
  };
  
  const handleAutoConnectChange = (checked: boolean) => {
    setTempSettings({ ...tempSettings, autoConnect: checked });
  };
  
  const handleReconnectIntervalChange = (value: string) => {
    setTempSettings({ ...tempSettings, reconnectInterval: parseInt(value, 10) });
  };
  
  const handleDataFormatChange = (value: string) => {
    setTempSettings({ ...tempSettings, dataFormat: value as 'json' | 'binary' | 'csv' });
  };
  
  const handleProtocolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSettings({ ...tempSettings, protocol: e.target.value });
  };
  
  const saveSettings = () => {
    const isServerUrlChanged = tempSettings.serverUrl !== connectionSettings.serverUrl;
    const wasConnected = wsStatus === 'connected';
    
    // Update settings
    updateConnectionSettings(tempSettings);
    
    // If server URL changed and we were connected, disconnect and reconnect
    if (isServerUrlChanged && wasConnected) {
      disconnectWebSocket();
      setTimeout(() => {
        connectWebSocket();
      }, 500);
    }
    
    toast({
      title: "Settings Saved",
      description: "Your connection settings have been updated.",
    });
  };
  
  const handleRefreshNetworkStatus = async () => {
    const status = await checkConnection();
    
    toast({
      title: status.connected ? "Network Connected" : "Network Disconnected",
      description: status.connected ? 
        `Connected via ${status.connectionType}` : 
        "No network connection detected.",
      variant: status.connected ? "default" : "destructive",
    });
  };
  
  return (
    <MobileLayout title="Connection Settings" showBack={true} backTo="/">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {networkStatus.connected ? 
                <WifiHigh className="h-5 w-5 mr-2 text-green-500" /> : 
                <WifiOff className="h-5 w-5 mr-2 text-red-500" />}
              Network Status
            </CardTitle>
            <CardDescription>
              Current network connectivity status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {networkStatus.connected ? 'Connected' : 'Disconnected'}
                </p>
                {networkStatus.connected && (
                  <p className="text-sm text-muted-foreground">
                    Type: {networkStatus.connectionType}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshNetworkStatus}
              >
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>EEG Device Connection</CardTitle>
            <CardDescription>
              Configure how to connect to your EEG device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">WebSocket URL</Label>
              <Input
                id="server-url"
                placeholder="ws://192.168.1.100:8080"
                value={tempSettings.serverUrl}
                onChange={handleServerUrlChange}
              />
              <p className="text-xs text-muted-foreground">
                Format: ws://ip-address:port or wss://domain
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="protocol">WebSocket Protocol (Optional)</Label>
              <Input
                id="protocol"
                placeholder="eeg-protocol"
                value={tempSettings.protocol}
                onChange={handleProtocolChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data-format">Data Format</Label>
              <Select 
                value={tempSettings.dataFormat} 
                onValueChange={handleDataFormatChange}
              >
                <SelectTrigger id="data-format">
                  <SelectValue placeholder="Select data format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="binary">Binary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the format that matches your ESP32 data transmission
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reconnect-interval">Reconnect Interval</Label>
              <Select 
                value={tempSettings.reconnectInterval.toString()} 
                onValueChange={handleReconnectIntervalChange}
              >
                <SelectTrigger id="reconnect-interval">
                  <SelectValue placeholder="Select reconnect interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1 second</SelectItem>
                  <SelectItem value="3000">3 seconds</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="10000">10 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-connect"
                checked={tempSettings.autoConnect}
                onCheckedChange={handleAutoConnectChange}
              />
              <Label htmlFor="auto-connect" className="cursor-pointer">
                Auto-reconnect on disconnect
              </Label>
            </div>
            
            <div className="pt-4">
              <Button className="w-full" onClick={saveSettings}>
                Save Connection Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default ConnectionSettings;
