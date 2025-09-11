
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import SingleChannelChart from './SingleChannelChart';
import ClinicalEEGMontage from './ClinicalEEGMontage';
import FilterControls from './FilterControls';
import { FilterConfig, applyFilter, getPresetFilterConfigs } from '@/utils/signalFilters';

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
  
  const [smoothing, setSmoothing] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [chartData, setChartData] = useState<Array<any>>([]);
  
  // Digital filtering state
  const [samplingRate] = useState(250); // Assume 250Hz sampling rate
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    type: 'none',
    samplingRate: samplingRate
  });
  
  const presetFilters = getPresetFilterConfigs(samplingRate);
  
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
  
  // Apply digital filtering to the data
  const getFilteredData = () => {
    const smoothedData = getSmoothedData();
    
    if (filterConfig.type === 'none' || smoothedData.length === 0) {
      return smoothedData;
    }
    
    // Apply digital filter to each channel
    return smoothedData.map((point, index) => {
      const result = { ...point };
      
      Object.keys(visibleChannels).forEach(channel => {
        if (point[channel] !== undefined) {
          // Extract channel data for filtering
          const channelData = smoothedData.map(p => p[channel] || 0);
          const filteredChannelData = applyFilter(channelData, filterConfig);
          result[channel] = filteredChannelData[index];
        }
      });
      
      return result;
    });
  };
  
  const processedData = getFilteredData();
  const hasChannelData = chartData.length > 0;
  
  // Process data for each channel
  const channelData = Object.keys(visibleChannels).map((channelName, index) => {
    return {
      name: channelName,
      color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
      visible: visibleChannels[channelName],
      data: processedData.map(point => ({
        time: point.time,
        [channelName]: point[channelName]
      }))
    };
  });
  
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
        <div className="mb-4 flex justify-end items-start">
          <div className="max-w-xs">
            <FilterControls
              filterConfig={filterConfig}
              onFilterChange={setFilterConfig}
              presetOptions={presetFilters}
            />
          </div>
        </div>
        
        {isLoading && chartData.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasChannelData ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No waveform data available. Make sure data is being sent to the correct Firebase endpoint (eeg_signals).
              </AlertDescription>
            </Alert>
            <div className="h-[260px] w-full flex items-center justify-center text-muted-foreground">
              Waiting for EEG data from Firebase...
            </div>
          </div>
        ) : (
          <div>
            {/* Individual Channel Charts */}
            {channelData.map((channel) => (
              <SingleChannelChart
                key={channel.name}
                channelName={channel.name}
                color={channel.color}
                data={channel.data}
                visible={channel.visible}
                onToggleVisibility={() => toggleChannel(channel.name)}
                smoothing={smoothing}
              />
            ))}
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground text-right">
          {chartData.length > 0 && (
            <span>
              {chartData.length} data points from Firebase
              {filterConfig.type !== 'none' && (
                <> • {filterConfig.type} filter applied</>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EegWaveformViewer;
