
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const EegWaveformViewer = () => {
  const { rawTimeseriesData, isLoading, lastUpdated } = useFirebaseData();
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
  const [chartData, setChartData] = useState<Array<any>>([]);
  
  // Convert Firebase timeseries data to chart-friendly format
  useEffect(() => {
    if (!rawTimeseriesData || Object.keys(rawTimeseriesData).length === 0) return;
    
    // Sort timestamps to ensure chronological order
    const timestamps = Object.keys(rawTimeseriesData).sort();
    
    // Convert to array format for the chart
    const formattedData = timestamps.map(timestamp => {
      const dataPoint = rawTimeseriesData[timestamp];
      return {
        time: parseInt(timestamp),
        timestamp,
        ch1: dataPoint.ch1,
        ch2: dataPoint.ch2,
        ch3: dataPoint.ch3,
        ch4: dataPoint.ch4,
        ch5: dataPoint.ch5,
        ch6: dataPoint.ch6,
        ch7: dataPoint.ch7,
        ch8: dataPoint.ch8,
      };
    });
    
    setChartData(formattedData);
  }, [rawTimeseriesData]);
  
  // Function to toggle channel visibility
  const toggleChannel = (channelName: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName]
    }));
  };
  
  // Apply smoothing to the data
  const getSmoothedData = () => {
    if (smoothing === 'none' || chartData.length <= 2) {
      return chartData;
    }
    
    // Get smoothing window size based on selected level
    const windowSize = 
      smoothing === 'low' ? 2 : 
      smoothing === 'medium' ? 3 : 
      5; // high
    
    // If we don't have enough points for the window, return original data
    if (chartData.length <= windowSize) {
      return chartData;
    }
    
    // Apply moving average smoothing
    return chartData.map((point, index) => {
      // For first and last few points, return as-is (not enough surrounding points)
      if (index < windowSize/2 || index >= chartData.length - windowSize/2) {
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
             i <= Math.min(chartData.length - 1, index + Math.floor(windowSize/2)); 
             i++) {
          if (chartData[i][channel] !== undefined) {
            sum += chartData[i][channel];
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
  const hasChannelData = chartData.length > 0;
  
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium">Time: {new Date(label).toLocaleTimeString()}</p>
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
          <span>EEG Waveforms</span>
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
        
        {isLoading && chartData.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasChannelData ? (
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No waveform data available. Make sure data is being sent to the correct Firebase endpoint (eeg_data_log).
              </AlertDescription>
            </Alert>
            <div className="h-[260px] w-full flex items-center justify-center text-muted-foreground">
              Waiting for EEG data from Firebase...
            </div>
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
                  domain={['auto', 'auto']} 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
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
          {chartData.length > 0 && (
            <span>{chartData.length} data points from Firebase</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EegWaveformViewer;
