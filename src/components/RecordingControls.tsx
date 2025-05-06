
import React from 'react';
import { useEegData } from '@/providers/EegDataProvider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlayCircle, StopCircle, RefreshCw } from 'lucide-react';

const RecordingControls: React.FC = () => {
  const { isRecording, toggleRecording, timeWindow, setTimeWindow, resetData, wsStatus } = useEegData();
  
  const handleTimeWindowChange = (value: string) => {
    setTimeWindow(parseInt(value, 10));
  };
  
  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Recording Controls</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="time-window">Time Window (s)</Label>
          <Select value={timeWindow.toString()} onValueChange={handleTimeWindowChange}>
            <SelectTrigger id="time-window">
              <SelectValue placeholder="Select time window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 second</SelectItem>
              <SelectItem value="3">3 seconds</SelectItem>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2 flex items-end">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={resetData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Clear Data
          </Button>
        </div>
      </div>
      
      <div className="mt-4">
        <Button 
          className={`w-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          onClick={toggleRecording}
          disabled={wsStatus !== 'connected'}
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
      </div>
    </div>
  );
};

export default RecordingControls;
