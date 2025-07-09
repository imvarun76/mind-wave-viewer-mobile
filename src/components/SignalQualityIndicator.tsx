
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Signal, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SignalQualityProps {
  snr: number;
  artifactRatio: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  channelName: string;
}

const SignalQualityIndicator: React.FC<SignalQualityProps> = ({
  snr,
  artifactRatio,
  quality,
  channelName
}) => {
  const getQualityColor = (qual: string) => {
    switch (qual) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getQualityIcon = (qual: string) => {
    switch (qual) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <Signal className="h-4 w-4" />;
      case 'fair': return <AlertTriangle className="h-4 w-4" />;
      case 'poor': return <XCircle className="h-4 w-4" />;
      default: return <Signal className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getQualityColor(quality)}`} />
            <span className="text-sm font-medium">{channelName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getQualityIcon(quality)}
              <span className="ml-1 capitalize">{quality}</span>
            </Badge>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <div>SNR: {snr.toFixed(1)} dB</div>
          <div>Artifacts: {(artifactRatio * 100).toFixed(1)}%</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalQualityIndicator;
