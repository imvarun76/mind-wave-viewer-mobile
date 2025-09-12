import React, { useState, useEffect, useRef } from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, StopCircle, Download, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  samples: Array<{
    timestamp: number;
    ch1: number;
    ch2: number;
    ch3: number;
    ch4: number;
    ch5: number;
    ch6: number;
    ch7: number;
    ch8: number;
  }>;
  filename: string;
  sampleCount: number;
}

const BatchRecordingControls: React.FC = () => {
  const { data } = useFirebaseData();
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [savedRecordings, setSavedRecordings] = useState<RecordingSession[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load saved recordings from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('eeg-recordings');
    if (saved) {
      try {
        const recordings = JSON.parse(saved);
        setSavedRecordings(recordings);
      } catch (err) {
        console.error('Failed to load saved recordings:', err);
      }
    }
  }, []);
  
  // Save recordings to localStorage whenever they change
  useEffect(() => {
    if (savedRecordings.length > 0) {
      localStorage.setItem('eeg-recordings', JSON.stringify(savedRecordings));
    }
  }, [savedRecordings]);
  
  // Record data when a new batch arrives
  useEffect(() => {
    if (isRecording && currentSession && data.samples) {
      // Add all samples from the latest batch to current recording
      setCurrentSession(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          samples: [...prev.samples, ...data.samples],
          sampleCount: prev.sampleCount + data.samples.length
        };
      });
    }
  }, [data.samples, isRecording, currentSession]);
  
  const startRecording = () => {
    const sessionId = Date.now().toString();
    const startTime = new Date();
    
    const newSession: RecordingSession = {
      id: sessionId,
      startTime,
      samples: [],
      filename: `eeg_recording_${startTime.toISOString().replace(/[:.]/g, '-')}.csv`,
      sampleCount: 0
    };
    
    setCurrentSession(newSession);
    setIsRecording(true);
    
    toast({
      title: "Recording Started",
      description: `Recording session ${sessionId} started`,
    });
  };
  
  const stopRecording = () => {
    if (currentSession) {
      const endTime = new Date();
      const completedSession = {
        ...currentSession,
        endTime
      };
      
      // Add to saved recordings
      setSavedRecordings(prev => [...prev, completedSession]);
      
      setCurrentSession(null);
      setIsRecording(false);
      
      toast({
        title: "Recording Stopped",
        description: `Recording saved with ${completedSession.sampleCount} samples`,
      });
    }
  };
  
  const downloadRecording = (recording: RecordingSession) => {
    // Create CSV content
    const headers = ['timestamp', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
    const csvContent = [
      headers.join(','),
      ...recording.samples.map(sample => 
        [sample.timestamp, sample.ch1, sample.ch2, sample.ch3, sample.ch4, sample.ch5, sample.ch6, sample.ch7, sample.ch8].join(',')
      )
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = recording.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${recording.filename}`,
    });
  };
  
  const deleteRecording = (recordingId: string) => {
    setSavedRecordings(prev => prev.filter(r => r.id !== recordingId));
    toast({
      title: "Recording Deleted",
      description: "Recording removed from local storage",
    });
  };
  
  const deleteAllRecordings = () => {
    setSavedRecordings([]);
    localStorage.removeItem('eeg-recordings');
    toast({
      title: "All Recordings Deleted",
      description: "All recordings removed from local storage",
    });
  };
  
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Batch Recording Controls
            {isRecording && <Badge variant="destructive">Recording</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRecording && currentSession && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Session ID: {currentSession.id}
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: {formatDuration(currentSession.startTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                Samples: {currentSession.sampleCount}
              </p>
            </div>
          )}
          
          <Button
            className="w-full"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Saved Recordings */}
      {savedRecordings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Saved Recordings ({savedRecordings.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteAllRecordings}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{recording.filename}</p>
                    <div className="flex space-x-4 text-xs text-muted-foreground">
                      <span>Duration: {formatDuration(recording.startTime, recording.endTime)}</span>
                      <span>Samples: {recording.sampleCount}</span>
                      <span>Started: {recording.startTime.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadRecording(recording)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRecording(recording.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchRecordingControls;