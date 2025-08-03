import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, ZoomIn, ZoomOut } from 'lucide-react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { EnhancedFilterChain, FilterConfig, assessSignalQuality } from '@/utils/signalFilters';

// Professional EEG visualization inspired by Backyard Brains Spike Recorder
const ProfessionalEegChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const { rawTimeseriesData, isLoading } = useFirebaseData();
  
  // Chart state
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeScale, setTimeScale] = useState(10); // seconds
  const [amplitudeScale, setAmplitudeScale] = useState(100); // microvolts
  const [sweepSpeed, setSweepSpeed] = useState(25); // mm/s equivalent
  const [showGrid, setShowGrid] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  
  // Channel configuration - all enabled but smart detection for active channels
  const [visibleChannels, setVisibleChannels] = useState({
    ch1: true, ch2: true, ch3: true, ch4: true,
    ch5: true, ch6: true, ch7: true, ch8: true
  });
  
  // Filter configuration for professional signal cleaning
  const [filterConfig] = useState<FilterConfig>({
    type: 'advanced',
    lowCutoff: 0.5,
    highCutoff: 40,
    samplingRate: 250,
    enableDCBlock: true,
    enableArtifactRemoval: true,
    enablePowerLineRemoval: true
  });
  
  // Data processing
  const [processedData, setProcessedData] = useState<{[key: string]: number[]}>({});
  const [filterChains, setFilterChains] = useState<{[key: string]: EnhancedFilterChain}>({});
  const [signalQuality, setSignalQuality] = useState<{[key: string]: any}>({});
  
  // Channel colors - professional medical colors
  const channelColors = {
    ch1: '#E53E3E', // Red
    ch2: '#3182CE', // Blue  
    ch3: '#38A169', // Green
    ch4: '#D69E2E', // Orange
    ch5: '#805AD5', // Purple
    ch6: '#DD6B20', // Orange-red
    ch7: '#319795', // Teal
    ch8: '#E53E3E'  // Pink
  };
  
  // Initialize filter chains
  useEffect(() => {
    const chains: {[key: string]: EnhancedFilterChain} = {};
    Object.keys(visibleChannels).forEach(channel => {
      chains[channel] = new EnhancedFilterChain(filterConfig);
    });
    setFilterChains(chains);
  }, [filterConfig]);
  
  // Process incoming data with professional filtering and smart channel detection
  useEffect(() => {
    if (!rawTimeseriesData || Object.keys(rawTimeseriesData).length === 0) return;
    
    const timestamps = Object.keys(rawTimeseriesData).sort();
    const latest = rawTimeseriesData[timestamps[timestamps.length - 1]];
    
    if (!latest) return;
    
    // Process each channel through its filter chain
    const newProcessedData = { ...processedData };
    const newQuality: {[key: string]: any} = {};
    
    Object.keys(visibleChannels).forEach(channel => {
      if (latest[channel] !== undefined && filterChains[channel]) {
        // Detect signal type for smart optimization
        const rawValue = latest[channel];
        let signalType = 'normal';
        
        if (rawValue === 4095) signalType = 'floating'; // Unconnected pin
        else if (rawValue === 0) signalType = 'grounded'; // Grounded or no signal
        else if (rawValue > 10 && rawValue < 4080) signalType = 'active'; // Real signal
        
        // Apply different processing based on signal type
        let filteredValue = rawValue;
        if (signalType === 'active') {
          // Apply full professional filtering for active signals
          filteredValue = filterChains[channel].process(rawValue);
        } else if (signalType === 'floating') {
          // Suppress floating noise completely
          filteredValue = 0;
          console.log(`🔇 Suppressing floating channel ${channel}: ${rawValue} -> ${filteredValue}`);
        } else if (signalType === 'grounded') {
          // Keep grounded signals as-is
          filteredValue = rawValue;
        }
        
        // Debug logging for channel 3
        if (channel === 'ch3') {
          console.log(`📊 CH3 Debug - Raw: ${rawValue}, Type: ${signalType}, Filtered: ${filteredValue}`);
        }
        
        // Maintain rolling buffer
        if (!newProcessedData[channel]) newProcessedData[channel] = [];
        newProcessedData[channel] = [...newProcessedData[channel], filteredValue];
        
        // Keep only last N seconds of data
        const maxPoints = filterConfig.samplingRate * timeScale;
        if (newProcessedData[channel].length > maxPoints) {
          newProcessedData[channel] = newProcessedData[channel].slice(-maxPoints);
        }
        
        // Assess signal quality with signal type info
        if (newProcessedData[channel].length > 100) {
          const quality = assessSignalQuality(newProcessedData[channel].slice(-100));
          newQuality[channel] = { ...quality, signalType };
        } else {
          newQuality[channel] = { signalType };
        }
      }
    });
    
    setProcessedData(newProcessedData);
    setSignalQuality(newQuality);
  }, [rawTimeseriesData, filterChains, processedData, timeScale, filterConfig.samplingRate, visibleChannels]);
  
  // Professional EEG rendering with oscilloscope-style display
  const renderEegChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size with high DPI support
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear with professional background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);
    
    // Draw professional grid
    if (showGrid) {
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 0.5;
      
      // Time grid (vertical lines)
      const timeStep = width / timeScale;
      for (let i = 0; i <= timeScale; i++) {
        const x = i * timeStep;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Major time markers
      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 1;
      for (let i = 0; i <= timeScale; i += 5) {
        const x = i * timeStep;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }
    
    // Calculate visible channels and their layout
    const activeChannels = Object.keys(visibleChannels).filter(ch => visibleChannels[ch]);
    const channelHeight = height / activeChannels.length;
    
    // Draw channel separators
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1;
    for (let i = 1; i < activeChannels.length; i++) {
      const y = i * channelHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Render each channel with professional styling
    activeChannels.forEach((channel, index) => {
      const data = processedData[channel];
      if (!data || data.length < 2) return;
      
      const channelY = (index + 0.5) * channelHeight;
      const color = channelColors[channel];
      const quality = signalQuality[channel];
      
      // Auto-scale amplitude if enabled
      let scale = amplitudeScale;
      if (autoScale && data.length > 0) {
        const max = Math.max(...data.map(Math.abs));
        scale = max > 0 ? (channelHeight * 0.4) / max : amplitudeScale;
      } else {
        scale = (channelHeight * 0.4) / amplitudeScale;
      }
      
      // Draw waveform with anti-aliasing
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Apply signal quality-based alpha
      const alpha = quality ? Math.max(0.6, Math.min(1.0, quality.snr / 10)) : 1.0;
      ctx.globalAlpha = alpha;
      
      ctx.beginPath();
      
      // Draw the waveform
      const pointsToShow = Math.min(data.length, width);
      const xStep = width / pointsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const dataIndex = data.length - pointsToShow + i;
        const value = data[dataIndex];
        const x = i * xStep;
        const y = channelY - (value * scale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      
      // Draw channel label with quality and signal type indicator
      ctx.fillStyle = color;
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      
      const signalType = quality?.signalType || 'unknown';
      const statusIcon = signalType === 'active' ? '●' : 
                        signalType === 'floating' ? '⚠' : 
                        signalType === 'grounded' ? '○' : '?';
      
      ctx.fillText(
        `${statusIcon} ${channel.toUpperCase()}${quality?.quality ? ` (${quality.quality})` : ''}`, 
        5, 
        channelY - channelHeight * 0.4 + 15
      );
      
      // Draw baseline
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, channelY);
      ctx.lineTo(width, channelY);
      ctx.stroke();
    });
    
    // Draw time markers
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const now = Date.now();
    for (let i = 0; i <= timeScale; i += 1) {
      const x = (i / timeScale) * width;
      const timeAgo = timeScale - i;
      ctx.fillText(`-${timeAgo}s`, x, height - 5);
    }
    
  }, [processedData, visibleChannels, timeScale, amplitudeScale, showGrid, autoScale, signalQuality, channelColors]);
  
  // Animation loop for real-time display
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        renderEegChart();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, renderEegChart]);
  
  const toggleChannel = (channel: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Professional EEG Display</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProcessedData({})}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Control Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted rounded-lg">
          {/* Time Scale */}
          <div className="space-y-2">
            <Label className="text-xs">Time Scale</Label>
            <Select value={timeScale.toString()} onValueChange={(v) => setTimeScale(Number(v))}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5s</SelectItem>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="20">20s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Amplitude Scale */}
          <div className="space-y-2">
            <Label className="text-xs">Amplitude (μV)</Label>
            <Select value={amplitudeScale.toString()} onValueChange={(v) => setAmplitudeScale(Number(v))}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50μV</SelectItem>
                <SelectItem value="100">100μV</SelectItem>
                <SelectItem value="200">200μV</SelectItem>
                <SelectItem value="500">500μV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Auto Scale */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-scale"
              checked={autoScale}
              onCheckedChange={setAutoScale}
            />
            <Label htmlFor="auto-scale" className="text-xs">Auto Scale</Label>
          </div>
          
          {/* Grid */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-grid"
              checked={showGrid}
              onCheckedChange={setShowGrid}
            />
            <Label htmlFor="show-grid" className="text-xs">Grid</Label>
          </div>
        </div>
        
        {/* Channel Controls */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.keys(visibleChannels).map((channel) => (
            <div key={channel} className="flex items-center space-x-2">
              <Switch
                id={`channel-${channel}`}
                checked={visibleChannels[channel]}
                onCheckedChange={() => toggleChannel(channel)}
              />
              <Label htmlFor={`channel-${channel}`} className="text-xs flex items-center">
                <div 
                  className="w-3 h-3 mr-1 rounded" 
                  style={{ backgroundColor: channelColors[channel] }}
                />
                {channel.toUpperCase()}
              </Label>
            </div>
          ))}
        </div>
        
        {/* Main Chart */}
        <div className="relative bg-black rounded-lg overflow-hidden border">
          <canvas
            ref={canvasRef}
            className="w-full h-[400px] cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Status Overlay */}
          <div className="absolute top-2 right-2 bg-black/80 rounded px-2 py-1">
            <div className="text-xs text-green-400 font-mono">
              {isPlaying ? '● RECORDING' : '⏸ PAUSED'}
            </div>
          </div>
        </div>
        
        {/* Signal Quality Indicators */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          {Object.keys(visibleChannels).filter(ch => visibleChannels[ch]).map(channel => {
            const quality = signalQuality[channel];
            if (!quality) return null;
            
            const signalType = quality.signalType || 'unknown';
            const statusColor = signalType === 'active' ? 'text-green-500' :
                              signalType === 'floating' ? 'text-orange-500' :
                              signalType === 'grounded' ? 'text-gray-500' : 'text-red-500';
            
            return (
              <div key={channel} className="text-xs p-2 bg-muted rounded">
                <div className="font-mono flex items-center gap-1">
                  <span className={statusColor}>
                    {signalType === 'active' ? '●' : 
                     signalType === 'floating' ? '⚠' : 
                     signalType === 'grounded' ? '○' : '?'}
                  </span>
                  {channel.toUpperCase()}
                </div>
                {quality.quality && (
                  <div className={`font-semibold ${
                    quality.quality === 'excellent' ? 'text-green-500' :
                    quality.quality === 'good' ? 'text-blue-500' :
                    quality.quality === 'fair' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {quality.quality.toUpperCase()}
                  </div>
                )}
                {quality.snr && (
                  <div className="text-muted-foreground">
                    SNR: {quality.snr.toFixed(1)}
                  </div>
                )}
                <div className="text-muted-foreground capitalize">
                  {signalType}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalEegChart;
