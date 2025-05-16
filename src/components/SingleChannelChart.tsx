
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type SingleChannelChartProps = {
  channelName: string;
  color: string;
  data: any[];
  visible: boolean;
  onToggleVisibility: () => void;
  smoothing: 'none' | 'low' | 'medium' | 'high';
};

const SingleChannelChart: React.FC<SingleChannelChartProps> = ({
  channelName,
  color,
  data,
  visible,
  onToggleVisibility,
  smoothing,
}) => {
  // Custom tooltip for the chart
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="text-xs font-medium">Time: {new Date(label).toLocaleTimeString()}</p>
          <p className="text-xs" style={{ color }}>
            {channelName}: {Math.round(payload[0].value * 100) / 100}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!visible) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <span className="font-medium">{channelName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id={`channel-${channelName}`}
              checked={visible}
              onCheckedChange={onToggleVisibility}
            />
            <Label htmlFor={`channel-${channelName}`}>Visible</Label>
          </div>
        </div>
        
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
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
              <Line
                type="monotone"
                dataKey={channelName}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SingleChannelChart;
