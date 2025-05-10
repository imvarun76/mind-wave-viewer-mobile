import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

// Define channel colors for consistent visualization
const CHANNEL_COLORS = [
  "#FF5733", // Red-Orange
  "#33FF57", // Green
  "#3357FF", // Blue
  "#FF33F5", // Pink
  "#33FFF5", // Cyan
  "#F5FF33", // Yellow
  "#FF5733", // Orange
  "#8B33FF", // Purple
  "#33FF8B", // Mint
  "#FF8B33", // Amber
  "#8BFF33", // Lime
  "#338BFF", // Azure
  "#FF338B", // Rose
  "#33FF8B", // SeaGreen
  "#8B33FF", // Violet
  "#FFBD33", // Gold
];

// Maximum number of data points to keep in history
const MAX_HISTORY_POINTS = 50;

const WaveformChart: React.FC = () => {
  const { data, isLoading } = useFirebaseData();
  const [visibleChannels, setVisibleChannels] = useState<{ [key: string]: boolean }>({
    ch1: true,
    ch2: true,
    ch3: true,
    ch4: true,
    ch5: true,
    ch6: true,
    ch7: true,
    ch8: true,
  });
  
  // State to keep track of historical data
  const [dataHistory, setDataHistory] = useState<Array<any>>([]);
  
  // Update history when new data comes in
  useEffect(() => {
    if (!data || !data.timestamp) return;
    
    // Check if we have channel data in the flat format
    const hasChannelData = 
      data.ch1 !== undefined || 
      data.ch2 !== undefined || 
      data.ch3 !== undefined || 
      data.ch4 !== undefined;
    
    if (!hasChannelData) return;
    
    // Add new data point to history
    setDataHistory(prevHistory => {
      // Create new data point with timestamp and channel values
      const newPoint = {
        time: data.timestamp,
        ch1: data.ch1,
        ch2: data.ch2,
        ch3: data.ch3,
        ch4: data.ch4,
        ch5: data.ch5,
        ch6: data.ch6,
        ch7: data.ch7,
        ch8: data.ch8,
      };
      
      // Add to history and limit size
      const updatedHistory = [...prevHistory, newPoint];
      if (updatedHistory.length > MAX_HISTORY_POINTS) {
        return updatedHistory.slice(updatedHistory.length - MAX_HISTORY_POINTS);
      }
      return updatedHistory;
    });
  }, [data]);
  
  // Toggle channel visibility
  const toggleChannel = (channelName: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName]
    }));
    
    toast({
      title: `Channel ${channelName}`,
      description: visibleChannels[channelName] ? "Hidden from chart" : "Now visible on chart",
    });
  };
  
  // Check if we have any channel data to display
  const hasChannelData = dataHistory.length > 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">EEG Waveforms</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && dataHistory.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasChannelData ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No waveform data available yet. Waiting for channel data from Firebase...
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {Object.keys(visibleChannels).map((channel, index) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Switch
                    id={`channel-${channel}`}
                    checked={visibleChannels[channel]}
                    onCheckedChange={() => toggleChannel(channel)}
                  />
                  <Label 
                    htmlFor={`channel-${channel}`} 
                    className="flex items-center cursor-pointer"
                  >
                    <div 
                      className="w-3 h-3 mr-1 rounded-full" 
                      style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
                    />
                    {channel}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dataHistory}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" 
                         type="number"
                         domain={['dataMin', 'dataMax']} 
                         tickFormatter={(value) => value.toString().slice(-4)} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`${value}`, `${name}`]}
                    labelFormatter={(value) => `Timestamp: ${value}`}
                  />
                  <Legend />
                  {Object.keys(visibleChannels).map((channel, index) => (
                    visibleChannels[channel] && dataHistory.some(point => point[channel] !== undefined) && (
                      <Line
                        key={channel}
                        type="monotone"
                        dataKey={channel}
                        stroke={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    )
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WaveformChart;
