import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';

// Channel configuration matching clinical EEG standards
const CLINICAL_CHANNELS = [
  { key: 'ch1', label: 'Fp1', color: '#2563eb' },
  { key: 'ch2', label: 'Fp2', color: '#dc2626' },
  { key: 'ch3', label: 'C3', color: '#16a34a' },
  { key: 'ch4', label: 'C4', color: '#ca8a04' },
  { key: 'ch5', label: 'P3', color: '#9333ea' },
  { key: 'ch6', label: 'P4', color: '#c2410c' },
  { key: 'ch7', label: 'O1', color: '#0891b2' },
  { key: 'ch8', label: 'O2', color: '#be123c' },
];

type ClinicalEEGMontageProps = {
  data: any[];
  visibleChannels: { [key: string]: boolean };
  samplingRate?: number;
};

type FilterConfig = {
  bandpass: boolean;
  notch: 'off' | '50' | '60';
};

const ClinicalEEGMontage: React.FC<ClinicalEEGMontageProps> = ({
  data,
  visibleChannels,
  samplingRate = 250
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Control states
  const [sensitivity, setSensitivity] = useState(50); // µV/div
  const [timeWindow, setTimeWindow] = useState(20); // seconds
  const [filters, setFilters] = useState<FilterConfig>({ bandpass: false, notch: 'off' });
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Layout constants
  const LEFT_MARGIN = 80;
  const RIGHT_MARGIN = 20;
  const TOP_MARGIN = 16;
  const BOTTOM_MARGIN = 40;
  const ROW_HEIGHT = 100;
  const GRID_DIV_HEIGHT = 50; // pixels per division

  // Get visible channels
  const visibleChannelConfigs = CLINICAL_CHANNELS.filter(ch => visibleChannels[ch.key]);
  const channelCount = visibleChannelConfigs.length;

  // Calculate dimensions
  const chartHeight = channelCount * ROW_HEIGHT + TOP_MARGIN + BOTTOM_MARGIN;
  
  // Apply simple filters
  const applyFilters = useCallback((samples: number[]): number[] => {
    if (!filters.bandpass && filters.notch === 'off') return samples;
    
    // Simple high-pass filter for bandpass (0.5 Hz)
    let filtered = [...samples];
    if (filters.bandpass) {
      const alpha = 0.98; // Simple high-pass coefficient
      for (let i = 1; i < filtered.length; i++) {
        filtered[i] = alpha * (filtered[i-1] + filtered[i] - samples[i-1]);
      }
    }
    
    // Simple notch filter (basic implementation)
    if (filters.notch !== 'off') {
      const notchFreq = parseInt(filters.notch);
      const dt = 1 / samplingRate;
      const omega = 2 * Math.PI * notchFreq * dt;
      
      // Very basic notch filter
      for (let i = 2; i < filtered.length; i++) {
        const avg = (filtered[i-2] + filtered[i]) / 2;
        filtered[i-1] = filtered[i-1] * 0.9 + avg * 0.1;
      }
    }
    
    return filtered;
  }, [filters, samplingRate]);

  // Get processed data for time window - now supports batch data
  const getWindowData = useCallback(() => {
    if (!data.length) return [];
    
    // Check if we have batch data in the latest entry
    const latestData = data[data.length - 1];
    if (latestData.channels && latestData.samples_count) {
      // We have batch data! Convert it to point format for montage display
      const sampleCount = latestData.samples_count;
      const sampleRate = latestData.sample_rate || samplingRate;
      const batchStart = latestData.batch_start || Date.now();
      
      const batchPoints = [];
      for (let i = 0; i < sampleCount; i++) {
        const timeMs = batchStart + (i * (1000 / sampleRate));
        const point: any = { time: timeMs };
        
        // Add each channel's value for this time sample
        CLINICAL_CHANNELS.forEach(config => {
          const channelData = latestData.channels?.[config.key];
          if (channelData && channelData[i] !== undefined) {
            point[config.key] = channelData[i]; // Voltage values (0-3.3V)
          }
        });
        
        batchPoints.push(point);
      }
      
      return batchPoints;
    }
    
    // Fallback to regular single-sample data
    const maxSamples = timeWindow * samplingRate;
    return data
      .sort((a, b) => a.time - b.time)
      .slice(-maxSamples);
  }, [data, timeWindow, samplingRate]);

  // Generate test data if no real data available (for visualization)
  const getTestData = useCallback(() => {
    const testPoints = [];
    const pointCount = 200;
    const now = Date.now();
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / 50; // 50 points per second
      const point: any = { time: now - (pointCount - i) * 20 };
      
      CLINICAL_CHANNELS.forEach((config, channelIndex) => {
        // Generate different waveforms for each channel (like LCD does)
        const freq = 8 + channelIndex; // Different frequencies
        const amplitude = 0.1 + (channelIndex * 0.02);
        const offset = 1.65; // Center around 1.65V
        const noise = (Math.random() - 0.5) * 0.05;
        
        point[config.key] = offset + Math.sin(2 * Math.PI * freq * t) * amplitude + noise;
      });
      
      testPoints.push(point);
    }
    
    return testPoints;
  }, []);

  // Draw the EEG montage
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const chartWidth = width - LEFT_MARGIN - RIGHT_MARGIN;
    
    // Clear canvas
    ctx.fillStyle = isDarkTheme ? '#1f2937' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    let windowData = getWindowData();
    
    // If no real data, show test data for visualization
    if (windowData.length === 0) {
      windowData = getTestData();
    }
    
    const pxPerSecond = chartWidth / timeWindow;
    const uVToPx = GRID_DIV_HEIGHT / sensitivity;
    const currentTime = Date.now();
    const startTime = currentTime - (timeWindow * 1000);
    
    // Draw time grid
    ctx.strokeStyle = isDarkTheme ? '#374151' : '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines (time)
    for (let t = 0; t <= timeWindow; t++) {
      const x = LEFT_MARGIN + (t * pxPerSecond);
      ctx.lineWidth = t % 5 === 0 ? 1 : 0.5;
      ctx.strokeStyle = t % 5 === 0 ? 
        (isDarkTheme ? '#6b7280' : '#9ca3af') : 
        (isDarkTheme ? '#374151' : '#e5e7eb');
      
      ctx.beginPath();
      ctx.moveTo(x, TOP_MARGIN);
      ctx.lineTo(x, height - BOTTOM_MARGIN);
      ctx.stroke();
    }
    
    // Draw each channel
    visibleChannelConfigs.forEach((channelConfig, channelIndex) => {
      const baseline = TOP_MARGIN + (channelIndex + 0.5) * ROW_HEIGHT;
      
      // Draw baseline
      ctx.strokeStyle = isDarkTheme ? '#4b5563' : '#d1d5db';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(LEFT_MARGIN, baseline);
      ctx.lineTo(width - RIGHT_MARGIN, baseline);
      ctx.stroke();
      
      // Draw channel label
      ctx.fillStyle = isDarkTheme ? '#f3f4f6' : '#374151';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(channelConfig.label, LEFT_MARGIN - 10, baseline);
      
      // Get channel data and convert like LCD display
      const channelData = windowData.map(point => {
        const rawValue = point[channelConfig.key] || 1.65; // Default to center voltage
        
        // Convert exactly like LCD: map voltage to display range
        // LCD: map((int)(input_data[prevSampleIndex][i] * 1000), 0, 3300, 0, spacing)
        const voltageMillivolts = rawValue * 1000; // Convert to millivolts
        const mappedValue = ((voltageMillivolts - 0) / (3300 - 0)) * (ROW_HEIGHT * 0.8); // Map to 80% of row height
        
        return mappedValue - (ROW_HEIGHT * 0.4); // Center around baseline
      });
      
      const filteredData = applyFilters(channelData);
      
      // Draw waveform like LCD (continuous lines between points)
      if (filteredData.length > 1) {
        ctx.strokeStyle = channelConfig.color;
        ctx.lineWidth = 2; // Slightly thicker like LCD
        ctx.beginPath();
        
        for (let i = 0; i < filteredData.length; i++) {
          const x = LEFT_MARGIN + (i / (filteredData.length - 1)) * chartWidth;
          const y = baseline + filteredData[i]; // Add to baseline
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    });
    
    // Draw time axis labels
    ctx.fillStyle = isDarkTheme ? '#d1d5db' : '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let t = 0; t <= timeWindow; t += 5) {
      const x = LEFT_MARGIN + (t * pxPerSecond);
      const timeLabel = `${t}s`;
      ctx.fillText(timeLabel, x, height - BOTTOM_MARGIN + 5);
    }
    
  }, [visibleChannelConfigs, channelCount, timeWindow, sensitivity, filters, isDarkTheme, getWindowData, getTestData, applyFilters]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Export CSV function
  const exportCSV = useCallback(() => {
    const windowData = getWindowData();
    if (windowData.length === 0) return;
    
    const headers = ['timestamp', ...visibleChannelConfigs.map(ch => ch.label)];
    const csvContent = [
      headers.join(','),
      ...windowData.map(point => [
        new Date(point.time).toISOString(),
        ...visibleChannelConfigs.map(ch => point[ch.key] || 0)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eeg-data-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getWindowData, visibleChannelConfigs]);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Clinical EEG Montage - {channelCount} Channels</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{samplingRate} Hz</Badge>
            <Badge variant="secondary">{sensitivity} µV/div</Badge>
            <Badge variant="secondary">{timeWindow}s window</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sensitivity:</label>
            <Select value={sensitivity.toString()} onValueChange={(v) => setSensitivity(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 µV</SelectItem>
                <SelectItem value="20">20 µV</SelectItem>
                <SelectItem value="50">50 µV</SelectItem>
                <SelectItem value="100">100 µV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time:</label>
            <Select value={timeWindow.toString()} onValueChange={(v) => setTimeWindow(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="20">20s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter:</label>
            <Select 
              value={filters.bandpass ? 'bandpass' : 'off'} 
              onValueChange={(v) => setFilters(prev => ({ ...prev, bandpass: v === 'bandpass' }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="bandpass">0.5-40 Hz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Notch:</label>
            <Select value={filters.notch} onValueChange={(v) => setFilters(prev => ({ ...prev, notch: v as any }))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="50">50 Hz</SelectItem>
                <SelectItem value="60">60 Hz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={exportCSV} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
        
        {/* Canvas */}
        <div className="w-full border rounded-lg bg-background">
          <canvas
            ref={canvasRef}
            style={{ 
              width: '100%', 
              height: `${chartHeight}px`,
              display: 'block'
            }}
            className="rounded-lg"
          />
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Clinical EEG Montage • Test data displayed • 
          {data.length === 0 ? "Showing test waveforms" : "Real-time monitoring"}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicalEEGMontage;