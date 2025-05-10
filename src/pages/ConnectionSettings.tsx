
import { useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useEegData } from '@/providers/EegDataProvider';
import { useNetwork } from '@/providers/NetworkProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiHigh, WifiOff, NetworkIcon, Smartphone, Server } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ConnectionSettings = () => {
  const { connectionSettings, updateConnectionSettings, wsStatus, connectWebSocket, disconnectWebSocket } = useEegData();
  const { status: networkStatus, checkConnection } = useNetwork();
  
  // Initialize with default to remote mode for Firebase connectivity
  const [tempSettings, setTempSettings] = useState({ 
    ...connectionSettings,
    remoteMode: true, // Default to remote mode
    serverUrl: connectionSettings.serverUrl || "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/esp32_001.json",
    reconnectInterval: connectionSettings.reconnectInterval || 1000, // Set to 1 second default
  });
  
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
  
  const handleMacAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSettings({ ...tempSettings, deviceMacAddress: e.target.value });
  };
  
  const handleDeviceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSettings({ ...tempSettings, deviceName: e.target.value });
  };
  
  const handleRemoteModeChange = (checked: boolean) => {
    setTempSettings({ ...tempSettings, remoteMode: checked });
  };
  
  const handleChannelCountChange = (value: string) => {
    // Make sure value is not undefined and convert to number
    const channelCount = parseInt(value, 10);
    if (!isNaN(channelCount) && (channelCount === 4 || channelCount === 8 || channelCount === 16)) {
      setTempSettings({ ...tempSettings, channelCount: channelCount as 4 | 8 | 16 });
    }
  };
  
  const saveSettings = () => {
    const isServerUrlChanged = tempSettings.serverUrl !== connectionSettings.serverUrl;
    const wasConnected = wsStatus === 'connected';
    const channelCountChanged = tempSettings.channelCount !== connectionSettings.channelCount;
    
    // Update settings
    updateConnectionSettings(tempSettings);
    
    // If channel count changed, update the channel list
    if (channelCountChanged && typeof tempSettings.channelCount === 'number') {
      // This will trigger the channel count update in EegDataProvider
    }
    
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
  
  // Safely determine channel count for select value
  const getChannelCountValue = () => {
    const count = tempSettings.channelCount;
    if (count === 4 || count === 8 || count === 16) {
      return count.toString();
    }
    return "8"; // Default to 8 channels if invalid
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
            <CardTitle>EEG Device Settings</CardTitle>
            <CardDescription>
              Configure device identification and channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="My EEG Device"
                value={tempSettings.deviceName}
                onChange={handleDeviceNameChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mac-address">MAC Address</Label>
              <Input
                id="mac-address"
                placeholder="00:00:00:00:00:00"
                value={tempSettings.deviceMacAddress}
                onChange={handleMacAddressChange}
              />
              <p className="text-xs text-muted-foreground">
                Used to identify your device when connecting remotely
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channel-count">Channel Count</Label>
              <Select 
                value={getChannelCountValue()} 
                onValueChange={handleChannelCountChange}
              >
                <SelectTrigger id="channel-count">
                  <SelectValue placeholder="Select channel count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 Channels</SelectItem>
                  <SelectItem value="8">8 Channels</SelectItem>
                  <SelectItem value="16">16 Channels</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the number of EEG channels used by your device
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="remote-mode"
                checked={tempSettings.remoteMode}
                onCheckedChange={handleRemoteModeChange}
              />
              <Label htmlFor="remote-mode" className="cursor-pointer">
                Enable Remote Monitoring
              </Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Allow monitoring from different WiFi networks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>WebSocket Connection</CardTitle>
            <CardDescription>
              Configure how to connect to your EEG device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection-type">Connection Type</Label>
              <RadioGroup 
                defaultValue={tempSettings.remoteMode ? "remote" : "local"}
                className="flex space-x-4" 
                onValueChange={(value) => setTempSettings({
                  ...tempSettings, 
                  remoteMode: value === "remote"
                })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="local" id="local" />
                  <Label htmlFor="local" className="cursor-pointer flex items-center">
                    <Smartphone className="h-4 w-4 mr-1" />
                    Local
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remote" id="remote" />
                  <Label htmlFor="remote" className="cursor-pointer flex items-center">
                    <Server className="h-4 w-4 mr-1" />
                    Remote
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="server-url">WebSocket URL</Label>
              <Input
                id="server-url"
                placeholder="https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/esp32_001.json"
                value={tempSettings.serverUrl}
                onChange={handleServerUrlChange}
              />
              <p className="text-xs text-muted-foreground">
                Format: ws://ip-address:port, wss://domain, or https:// for REST APIs
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
                value={tempSettings.reconnectInterval ? tempSettings.reconnectInterval.toString() : "1000"} 
                onValueChange={handleReconnectIntervalChange}
              >
                <SelectTrigger id="reconnect-interval">
                  <SelectValue placeholder="Select reconnect interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">200 milliseconds</SelectItem>
                  <SelectItem value="500">500 milliseconds</SelectItem>
                  <SelectItem value="1000">1 second</SelectItem>
                  <SelectItem value="3000">3 seconds</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set to 200ms or 500ms for smoother waveform updates
              </p>
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
