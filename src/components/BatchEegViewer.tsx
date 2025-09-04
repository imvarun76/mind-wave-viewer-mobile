import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';

// Channel configuration matching clinical EEG standards
const CHANNEL_CONFIGS = [
  { key: 'ch1', label: 'Fp1', color: '#2563eb' },
  { key: 'ch2', label: 'Fp2', color: '#dc2626' },
  { key: 'ch3', label: 'C3', color: '#16a34a' },
  { key: 'ch4', label: 'C4', color: '#ca8a04' },
  { key: 'ch5', label: 'P3', color: '#9333ea' },
  { key: 'ch6', label: 'P4', color: '#c2410c' },
  { key: 'ch7', label: 'O1', color: '#0891b2' },
  { key: 'ch8', label: 'O2', color: '#be123c' },
];

type BatchEegViewerProps = {
  visibleChannels: { [key: string]: boolean };
};

const BatchEegViewer: React.FC<BatchEegViewerProps> = ({ visibleChannels }) => {
  const { data } = useFirebaseData();

  // Process batch data for smooth waveform display
  const chartData = useMemo(() => {
    if (!data.channels || !data.samples_count) {
      return [];
    }

    const sampleCount = data.samples_count;
    const sampleRate = data.sample_rate || 100;
    const batchStart = data.batch_start || 0;

    // Create array of data points, each representing one time sample
    const processedData = [];
    
    for (let i = 0; i < sampleCount; i++) {
      const timeMs = batchStart + (i * (1000 / sampleRate));
      const timeSeconds = (i / sampleRate).toFixed(2);
      
      const dataPoint: any = {
        time: timeMs,
        timeLabel: `${timeSeconds}s`,
        sampleIndex: i,
      };

      // Add each channel's value for this time sample
      CHANNEL_CONFIGS.forEach(config => {
        const channelData = data.channels?.[config.key];
        if (channelData && channelData[i] !== undefined) {
          // Convert voltage to microvolts and center around midpoint (like LCD)
          const voltage = channelData[i];
          const microvolts = (voltage - 1.65) * 1000000; // Center around 1.65V, convert to µV
          dataPoint[config.key] = microvolts;
        } else {
          dataPoint[config.key] = 0;
        }
      });

      processedData.push(dataPoint);
    }

    return processedData;
  }, [data]);

  // Get visible channels
  const visibleChannelConfigs = CHANNEL_CONFIGS.filter(ch => visibleChannels[ch.key]);

  // Custom tooltip for detailed info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{`Time: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value.toFixed(1)} µV`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Smooth EEG Waveforms - Batch Data</span>
          <div className="flex items-center gap-2">
            {data.sample_rate && (
              <Badge variant="secondary">{data.sample_rate} Hz</Badge>
            )}
            {data.samples_count && (
              <Badge variant="secondary">{data.samples_count} samples</Badge>
            )}
            <Badge variant="secondary">{chartData.length} points</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-muted/10 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">No Batch Data Available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Waiting for ESP32 to send batch data with channel arrays...
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Amplitude (µV)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Render lines for visible channels */}
                {visibleChannelConfigs.map((config) => (
                  <Line
                    key={config.key}
                    type="linear"
                    dataKey={config.key}
                    stroke={config.color}
                    strokeWidth={1.5}
                    dot={false}
                    name={config.label}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Smooth EEG visualization from batched ESP32 data • 
          {data.sample_rate || 100} Hz sampling • 
          Similar to LCD display rendering
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchEegViewer;