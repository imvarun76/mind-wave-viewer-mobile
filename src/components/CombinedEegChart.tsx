import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Professional EEG channel colors (similar to the reference image)
const PROFESSIONAL_COLORS = {
  ch1: "#FF6B6B", // F1 - Red
  ch2: "#4ECDC4", // F2 - Teal  
  ch3: "#45B7D1", // F3 - Blue
  ch4: "#96CEB4", // L1 - Green
  ch5: "#FFEAA7", // R1 - Yellow
  ch6: "#DDA0DD", // B1 - Purple
  ch7: "#98D8C8", // B2 - Mint
  ch8: "#F7DC6F", // B3 - Gold
};

const CHANNEL_LABELS = {
  ch1: "F1",
  ch2: "F2", 
  ch3: "F3",
  ch4: "L1",
  ch5: "R1",
  ch6: "B1",
  ch7: "B2",
  ch8: "B3",
};

type CombinedEegChartProps = {
  data: any[];
  visibleChannels: { [key: string]: boolean };
  samplingRate?: number;
};

const CombinedEegChart: React.FC<CombinedEegChartProps> = ({
  data,
  visibleChannels,
  samplingRate = 250
}) => {
  // Get visible channels in order
  const visibleChannelKeys = Object.keys(visibleChannels).filter(key => visibleChannels[key]);
  const channelSpacing = 100; // Much larger spacing between channels like in professional EEG
  
  // Transform data to separate each channel into its own Y-space with proper baselines
  const transformedData = data.map(point => {
    const result = { time: point.time };
    
    visibleChannelKeys.forEach((channelKey, index) => {
      const rawValue = point[channelKey] || 0;
      // Create baseline for each channel (higher index = higher on screen)
      const baseline = (visibleChannelKeys.length - 1 - index) * channelSpacing;
      // Scale the signal amplitude to be visible but not overlap (typical EEG range)
      const signalAmplitude = (rawValue - 1650000) * 0.001; // Adjust for visible EEG-like waves
      result[channelKey] = baseline + signalAmplitude;
    });
    
    return result;
  });

  // Create Y-axis ticks for channel labels at each baseline
  const channelTicks = visibleChannelKeys.map((_, index) => 
    (visibleChannelKeys.length - 1 - index) * channelSpacing
  );

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 border border-gray-600 shadow-lg rounded-md">
          <p className="text-xs font-medium mb-2">
            Time: {new Date(label).toLocaleTimeString()}
          </p>
          {payload.map((entry: any, index: number) => {
            const originalValue = data.find(d => d.time === entry.payload.time)?.[entry.dataKey] || 0;
            return (
              <p key={index} className="text-xs" style={{ color: entry.color }}>
                {CHANNEL_LABELS[entry.dataKey as keyof typeof CHANNEL_LABELS]}: {Math.round(originalValue)}μV
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-6 bg-gray-900 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex justify-between items-center">
          <span>Combined EEG Signals - 8 Channels</span>
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <span>{samplingRate} Hz</span>
            <div className="flex items-center gap-2">
              <span>Artifacts: 0</span>
              <span>Alpha: 0.0%</span>
              <span>Beta: 0.0%</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[600px] w-full bg-gray-800 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transformedData}
              margin={{ top: 20, right: 30, left: 60, bottom: 40 }}
            >
              <XAxis 
                dataKey="time" 
                type="number"
                domain={['auto', 'auto']} 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getSeconds()}s`;
                }}
                stroke="#9CA3AF" 
                fontSize={10}
                tick={{ fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[-50, (visibleChannelKeys.length - 1) * channelSpacing + 50]}
                ticks={channelTicks}
                tickFormatter={(value) => {
                  const channelIndex = Math.round(value / channelSpacing);
                  const reversedIndex = visibleChannelKeys.length - 1 - channelIndex;
                  const channelKey = visibleChannelKeys[reversedIndex];
                  return channelKey ? CHANNEL_LABELS[channelKey as keyof typeof CHANNEL_LABELS] : '';
                }}
                stroke="#9CA3AF" 
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
                axisLine={{ stroke: '#9CA3AF' }}
                tickLine={false}
                width={50}
              />
              <Tooltip content={renderCustomTooltip} />
              
              {Object.keys(visibleChannels).map((channelKey) => {
                if (!visibleChannels[channelKey]) return null;
                
                return (
                  <Line
                    key={channelKey}
                    type="monotone"
                    dataKey={channelKey}
                    stroke={PROFESSIONAL_COLORS[channelKey as keyof typeof PROFESSIONAL_COLORS]}
                    strokeWidth={1.2}
                    dot={false}
                    activeDot={{ r: 3, fill: PROFESSIONAL_COLORS[channelKey as keyof typeof PROFESSIONAL_COLORS] }}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-gray-400 text-center">
          Professional EEG Visualization • {data.length} data points • Real-time monitoring
        </div>
      </CardContent>
    </Card>
  );
};

export default CombinedEegChart;