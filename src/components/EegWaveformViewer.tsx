import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
];

// Maximum number of data points to keep in history
const MAX_HISTORY_POINTS = 100;

const EegWaveformViewer = () => {
  const { data, isLoading, lastUpdated } = useFirebaseData();
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
  
  const [smoothing, setSmoothing] = useState<'none' | 'low' | 'medium' | 'high'>('medium');
  const [dataHistory, setDataHistory] = useState<Array<any>>([]);
  
  // Update history when new data comes in
  React.useEffect(() => {
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
  
  // Function to toggle channel visibility
  const toggleChannel = (channelName: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName]
    }));
  };
  
  // Apply smoothing to the data
  const getSmoothedData = () => {
    if (smoothing === 'none' || dataHistory.length <= 2) {
      return dataHistory;
    }
    
    // Get smoothing window size based on selected level
    const windowSize = 
      smoothing === 'low' ? 2 : 
      smoothing === 'medium' ? 3 : 
      5; // high
    
    // If we don't have enough points for the window, return original data
    if (dataHistory.length <= windowSize) {
      return dataHistory;
    }
    
    // Apply moving average smoothing
    return dataHistory.map((point, index) => {
      // For first and last few points, return as-is (not enough surrounding points)
      if (index < windowSize/2 || index >= dataHistory.length - windowSize/2) {
        return point;
      }
      
      // For each channel, calculate the moving average
      const result = { ...point };
      Object.keys(visibleChannels).forEach(channel => {
        if (!visibleChannels[channel]) return;
        
        let sum = 0;
        let count = 0;
        
        // Calculate sum of points in window
        for (let i = Math.max(0, index - Math.floor(windowSize/2)); 
             i <= Math.min(dataHistory.length - 1, index + Math.floor(windowSize/2)); 
             i++) {
          if (dataHistory[i][channel] !== undefined) {
            sum += dataHistory[i][channel];
            count++;
          }
        }
        
        // Calculate average if we have data
        if (count > 0) {
          result[channel] = sum / count;
        }
      });
      
      return result;
    });
  };
  
  const smoothedData = getSmoothedData();
  const hasChannelData = dataHistory.length > 0;
  
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium">Time: {label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {Math.round(entry.value * 100) / 100}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Enhanced EEG Waveforms</span>
          {lastUpdated && (
            <span className="text-xs font-normal text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(visibleChannels).slice(0, 8).map((channel, index) => (
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
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="smoothing" className="text-sm">Smoothing:</Label>
            <Select value={smoothing} onValueChange={(value: any) => setSmoothing(value)}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue placeholder="Medium" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading && dataHistory.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasChannelData ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No waveform data available yet. Waiting for channel data from Firebase...
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={smoothedData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  domain={['dataMin', 'dataMax']} 
                  tickFormatter={(value) => value.toString().slice(-4)}
                  stroke="#888888" 
                  fontSize={10}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={10}
                />
                <Tooltip content={renderCustomTooltip} />
                {Object.keys(visibleChannels).map((channel, index) => (
                  visibleChannels[channel] && smoothedData.some(point => point[channel] !== undefined) && (
                    <Line
                      key={channel}
                      type="monotone"
                      dataKey={channel}
                      stroke={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                      connectNulls={true}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground text-right">
          {dataHistory.length > 0 && (
            <span>{dataHistory.length} data points | {MAX_HISTORY_POINTS} max</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EegWaveformViewer;
