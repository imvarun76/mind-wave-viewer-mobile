import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRecording } from '@/providers/RecordingProvider';
import { useFirebaseRecording, RecordingMetadata } from '@/hooks/useFirebaseRecording';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Download, Trash2, Upload, RefreshCw, Clock, HardDrive } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const RecordingsList: React.FC = () => {
  const { recordingSessions, refreshSessions } = useRecording();
  const { 
    uploadRecordingToFirebase, 
    downloadRecording, 
    deleteRecording, 
    uploadProgress,
    clearUploadProgress 
  } = useFirebaseRecording();
  
  const [cloudRecordings, setCloudRecordings] = useState<RecordingMetadata[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const loadCloudRecordings = async () => {
    setIsLoadingCloud(true);
    try {
      const metaRef = ref(database, 'recordings_meta/esp32_001');
      const snapshot = await get(metaRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const recordings = Object.values(data) as RecordingMetadata[];
        recordings.sort((a, b) => b.created_at - a.created_at);
        setCloudRecordings(recordings);
      } else {
        setCloudRecordings([]);
      }
    } catch (error) {
      console.error('Error loading cloud recordings:', error);
      toast({
        title: "Failed to Load Cloud Recordings",
        description: "Could not fetch recordings from cloud storage",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleUpload = async (session: any) => {
    try {
      await uploadRecordingToFirebase(session.record_id, session);
      await refreshSessions();
      await loadCloudRecordings();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (recording: RecordingMetadata) => {
    try {
      await deleteRecording(recording);
      await loadCloudRecordings();
      await refreshSessions();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  useEffect(() => {
    loadCloudRecordings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Local Sessions */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Sessions
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {recordingSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recordings found</p>
          ) : (
            <div className="space-y-3">
              {recordingSessions.map((session) => {
                const progress = uploadProgress[session.record_id];
                const duration = session.end_timestamp 
                  ? session.end_timestamp - session.start_timestamp 
                  : Date.now() - session.start_timestamp;

                return (
                  <div key={session.record_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{session.record_id}</span>
                        <Badge variant={
                          session.status === 'recording' ? 'destructive' :
                          session.status === 'uploaded' ? 'default' :
                          session.status === 'stopped' ? 'secondary' : 'outline'
                        }>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(duration)}
                        </span>
                        <span>Device: {session.device_id}</span>
                        <span>{new Date(session.start_timestamp).toLocaleString()}</span>
                      </div>
                      {progress && progress.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={progress.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploading... {Math.round(progress.progress)}%
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {session.status === 'stopped' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleUpload(session)}
                          disabled={progress?.status === 'uploading'}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      )}
                      {progress?.status === 'success' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clearUploadProgress(session.record_id)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cloud Recordings */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Cloud Recordings
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCloudRecordings}
            disabled={isLoadingCloud}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCloud ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {cloudRecordings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {isLoadingCloud ? 'Loading...' : 'No cloud recordings found'}
            </p>
          ) : (
            <div className="space-y-3">
              {cloudRecordings.map((recording) => (
                <div key={recording.record_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{recording.record_id}</span>
                      <Badge variant="default">Uploaded</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(recording.duration_ms)}
                      </span>
                      <span>{formatFileSize(recording.size_bytes)}</span>
                      <span>{recording.sample_count.toLocaleString()} samples</span>
                      <span>{new Date(recording.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadRecording(recording)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Recording</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete recording {recording.record_id}? 
                            This action cannot be undone and will remove the file from cloud storage.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(recording)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecordingsList;