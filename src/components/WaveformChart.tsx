
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

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
  
  // Toggle channel visibility
  const toggleChannel = (channelName: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName]
    }));
  };
  
  // Prepare data for the chart
  const prepareChartData = () => {
    // If we have structured channel data
    if (data.channels) {
      // Get maximum data points to show (based on longest channel)
      const maxDataPoints = Object.values(data.channels).reduce(
        (max, points) => Math.max(max, points.length), 
        0
      );
      
      // Create data points for each time step
      return Array.from({ length: maxDataPoints }, (_, i) => {
        const point: any = { time: i };
        
        // Add value for each channel at this time point
        Object.entries(data.channels).forEach(([channel, values]) => {
          if (i < values.length) {
            point[channel] = values[i];
          }
        });
        
        return point;
      });
    } 
    // If we have flat EEG arrays
    else if (data.eeg && data.eeg.length > 0) {
      // Get maximum data points
      const maxDataPoints = data.eeg.reduce(
        (max, channel) => Math.max(max, channel.length), 
        0
      );
      
      // Create data points for each time step
      return Array.from({ length: maxDataPoints }, (_, i) => {
        const point: any = { time: i };
        
        // Add value for each channel at this time point
        data.eeg.forEach((channel, channelIdx) => {
          const channelName = `ch${channelIdx + 1}`;
          if (i < channel.length) {
            point[channelName] = channel[i];
          }
        });
        
        return point;
      });
    }
    
    // No valid data
    return [];
  };
  
  const chartData = prepareChartData();
  
  // Check if we have any channel data
  const hasChannelData = (data.channels && Object.keys(data.channels).length > 0) || 
                         (data.eeg && data.eeg.length > 0);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">EEG Waveforms</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasChannelData ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No waveform data available. Make sure your Firebase data includes 'eeg' or 'channels' properties.
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
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(visibleChannels).map((channel, index) => (
                    visibleChannels[channel] && (
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
