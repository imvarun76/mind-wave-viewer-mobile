import React, { useState } from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import SingleChannelChart from './SingleChannelChart';

interface RawEegViewerProps {
  enableSmoothing?: boolean;
  onSmoothingChange?: (enabled: boolean) => void;
}

const RawEegViewer: React.FC<RawEegViewerProps> = ({ 
  enableSmoothing = false, 
  onSmoothingChange 
}) => {
  const { data, isLoading, lastUpdated } = useFirebaseData();
  const [visibleChannels, setVisibleChannels] = useState({
    ch1: true, ch2: true, ch3: true, ch4: true,
    ch5: true, ch6: true, ch7: true, ch8: true
  });

  const toggleChannelVisibility = (channel: string) => {
    setVisibleChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  // Convert samples to chart data format
  const getChannelData = (channel: string) => {
    if (!data.samples || data.samples.length === 0) return [];
    
    return data.samples.map(sample => ({
      time: sample.timestamp,
      [channel]: sample[channel as keyof typeof sample]
    }));
  };

  const channelColors = {
    ch1: '#FF6B6B', ch2: '#4ECDC4', ch3: '#45B7D1', ch4: '#96CEB4',
    ch5: '#FECA57', ch6: '#FF9FF3', ch7: '#54A0FF', ch8: '#5F27CD'
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raw EEG Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Raw EEG Viewer
            <Badge variant="secondary">256Hz</Badge>
          </CardTitle>
          <div className="flex items-center space-x-4">
            {onSmoothingChange && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="smoothing-toggle"
                  checked={enableSmoothing}
                  onCheckedChange={onSmoothingChange}
                />
                <Label htmlFor="smoothing-toggle">Smoothing</Label>
              </div>
            )}
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(visibleChannels).map(([channel, visible]) => (
            <SingleChannelChart
              key={channel}
              channelName={channel}
              color={channelColors[channel as keyof typeof channelColors]}
              data={getChannelData(channel)}
              visible={visible}
              onToggleVisibility={() => toggleChannelVisibility(channel)}
              smoothing={enableSmoothing ? 'low' : 'none'}
            />
          ))}
        </div>
        
        {data.samples && data.samples.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Samples: {data.samples.length}</p>
            <p>Sample Rate: {data.latestBatch?.sampling_rate || 256}Hz</p>
            <p>Latest Timestamp: {new Date(data.samples[data.samples.length - 1]?.timestamp || 0).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RawEegViewer;