import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { PlayCircle, StopCircle, Circle, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface RecordedData {
  id: string;
  startTime: number;
  endTime?: number;
  data: any[];
  status: 'recording' | 'stopped';
}

const SimpleRecordingControls: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<RecordedData | null>(null);
  const [recordings, setRecordings] = useState<RecordedData[]>([]);
  const { data: firebaseData } = useFirebaseData();

  const generateId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `rec_${timestamp}_${random}`;
  };

  const startRecording = useCallback(() => {
    if (isRecording) return;

    const newRecording: RecordedData = {
      id: generateId(),
      startTime: Date.now(),
      data: [],
      status: 'recording'
    };

    setCurrentRecording(newRecording);
    setIsRecording(true);

    toast({
      title: "Recording Started",
      description: `Recording ${newRecording.id} has begun`,
    });
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !currentRecording) return;

    const updatedRecording = {
      ...currentRecording,
      endTime: Date.now(),
      status: 'stopped' as const
    };

    setRecordings(prev => [updatedRecording, ...prev]);
    setCurrentRecording(null);
    setIsRecording(false);

    toast({
      title: "Recording Stopped",
      description: `Recording ${updatedRecording.id} saved locally`,
    });
  }, [isRecording, currentRecording]);

  const downloadRecording = useCallback((recording: RecordedData) => {
    const csvContent = recording.data.map(row => 
      `${row.timestamp},${row.ch1 || 0},${row.ch2 || 0},${row.ch3 || 0},${row.ch4 || 0},${row.ch5 || 0},${row.ch6 || 0},${row.ch7 || 0},${row.ch8 || 0}`
    ).join('\n');
    
    const csvData = `timestamp,ch1,ch2,ch3,ch4,ch5,ch6,ch7,ch8\n${csvContent}`;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recording.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: `Recording ${recording.id} downloaded`,
    });
  }, []);

  // Store data when recording
  React.useEffect(() => {
    if (isRecording && currentRecording && firebaseData) {
      const dataPoint = {
        timestamp: Date.now(),
        ch1: firebaseData.ch1,
        ch2: firebaseData.ch2,
        ch3: firebaseData.ch3,
        ch4: firebaseData.ch4,
        ch5: firebaseData.ch5,
        ch6: firebaseData.ch6,
        ch7: firebaseData.ch7,
        ch8: firebaseData.ch8,
      };

      setCurrentRecording(prev => prev ? {
        ...prev,
        data: [...prev.data, dataPoint]
      } : null);
    }
  }, [firebaseData, isRecording, currentRecording]);

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            EEG Recording
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse-signal">
                <Circle className="mr-1 h-2 w-2 fill-current" />
                REC
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentRecording && (
            <div className="text-sm text-muted-foreground">
              <div><span className="font-medium">Session ID:</span> {currentRecording.id}</div>
              <div><span className="font-medium">Duration:</span> {formatDuration(currentRecording.startTime)}</div>
              <div><span className="font-medium">Data Points:</span> {currentRecording.data.length}</div>
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
              Recording EEG data locally. Click stop to save the session.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-foreground">
              Saved Recordings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{recording.id}</span>
                      <Badge variant="secondary">
                        {recording.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Duration: {formatDuration(recording.startTime, recording.endTime)} • 
                      Data Points: {recording.data.length} • 
                      {new Date(recording.startTime).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadRecording(recording)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleRecordingControls;