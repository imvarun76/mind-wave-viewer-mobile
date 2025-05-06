
import React, { useRef, useEffect } from 'react';
import { useEegData } from '@/providers/EegDataProvider';

type EegSignalChartProps = {
  height?: number;
};

const EegSignalChart: React.FC<EegSignalChartProps> = ({ height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { channels, samplingRate, timeWindow } = useEegData();
  const visibleChannels = channels.filter(ch => ch.visible);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * pixelRatio;
    const scaledHeight = height * pixelRatio;
    
    // Set canvas width and height considering device pixel ratio
    canvas.width = width;
    canvas.height = scaledHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, scaledHeight);
    
    // Draw grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E2E8F0';
    
    // Vertical grid lines (time divisions)
    const timeStep = 1; // 1 second per division
    const pixelsPerSecond = width / timeWindow;
    
    for (let t = 0; t <= timeWindow; t += timeStep) {
      const x = Math.floor(t * pixelsPerSecond);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, scaledHeight);
      ctx.stroke();
    }
    
    // Horizontal grid lines (amplitude divisions)
    const channelHeight = scaledHeight / visibleChannels.length;
    
    for (let i = 0; i <= visibleChannels.length; i++) {
      const y = Math.floor(i * channelHeight);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw channel data
    visibleChannels.forEach((channel, index) => {
      if (channel.data.length < 2) return; // Need at least 2 points to draw a line
      
      const yCenter = channelHeight * (index + 0.5);
      const yScale = channelHeight * 0.4 / (channel.max - channel.min);
      
      ctx.strokeStyle = channel.color;
      ctx.lineWidth = 2 * pixelRatio;
      ctx.beginPath();
      
      // Calculate points
      const dataPoints = channel.data;
      const pointsToShow = Math.min(dataPoints.length, samplingRate * timeWindow);
      const startIndex = dataPoints.length - pointsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const dataIndex = startIndex + i;
        const value = dataPoints[dataIndex];
        const x = (i / pointsToShow) * width;
        const y = yCenter - ((value - (channel.min + channel.max) / 2) * yScale);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw channel label
      ctx.font = `${12 * pixelRatio}px sans-serif`;
      ctx.fillStyle = channel.color;
      ctx.fillText(channel.name, 10 * pixelRatio, yCenter - channelHeight * 0.35);
    });
    
  }, [channels, height, samplingRate, timeWindow, visibleChannels]);
  
  return (
    <div className="relative w-full bg-eeg-bg rounded-md overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export default EegSignalChart;
