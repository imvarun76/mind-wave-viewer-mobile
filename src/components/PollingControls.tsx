
import React, { useState } from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const PollingControls = () => {
  const { setPollingInterval } = useFirebaseData();
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  const [interval, setInterval] = useState<number>(1);
  
  const handlePollingToggle = (enabled: boolean) => {
    setIsPollingEnabled(enabled);
    if (enabled) {
      setPollingInterval(interval * 1000);
    } else {
      setPollingInterval(0); // Disable polling
    }
  };
  
  const handleIntervalChange = (values: number[]) => {
    const newInterval = values[0];
    setInterval(newInterval);
    if (isPollingEnabled) {
      // Convert to milliseconds, with special handling for values under 1
      const msInterval = newInterval < 1 ? newInterval * 1000 : newInterval * 1000;
      setPollingInterval(msInterval);
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Data Polling Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="polling-toggle" className="flex flex-col space-y-1">
            <span>Auto Refresh</span>
            <span className="font-normal text-xs text-muted-foreground">Automatically fetch new data</span>
          </Label>
          <Switch
            id="polling-toggle"
            checked={isPollingEnabled}
            onCheckedChange={handlePollingToggle}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="polling-interval">Polling Interval</Label>
            <span className="text-sm font-medium">
              {interval < 1 ? `${interval * 1000} ms` : `${interval} seconds`}
            </span>
          </div>
          <Slider
            id="polling-interval"
            disabled={!isPollingEnabled}
            min={0.2}
            max={5}
            step={0.1}
            value={[interval]}
            onValueChange={handleIntervalChange}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>200ms</span>
            <span>1s</span>
            <span>5s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PollingControls;
