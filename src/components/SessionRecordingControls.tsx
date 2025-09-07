import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecording } from '@/providers/RecordingProvider';
import { PlayCircle, StopCircle, Circle } from 'lucide-react';

const SessionRecordingControls: React.FC = () => {
  const { isRecording, currentRecordId, startRecording, stopRecording } = useRecording();

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          Session Recording
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse-signal">
              <Circle className="mr-1 h-2 w-2 fill-current" />
              REC
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentRecordId && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Session ID:</span> {currentRecordId}
          </div>
        )}
        
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full ${
            isRecording 
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          size="lg"
        >
          {isRecording ? (
            <>
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Recording
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Recording
            </>
          )}
        </Button>
        
        {isRecording && (
          <div className="text-xs text-muted-foreground text-center">
            Data is being stored locally and will be uploaded when stopped
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionRecordingControls;