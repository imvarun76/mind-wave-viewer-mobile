
import { useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import ConnectionStatus from '@/components/ConnectionStatus';
import EegSignalChart from '@/components/EegSignalChart';
import RecordingControls from '@/components/RecordingControls';
import { useEegData } from '@/providers/EegDataProvider';
import { Button } from '@/components/ui/button';
import { Sliders } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ChannelControls from '@/components/ChannelControls';

const SignalViewer = () => {
  const { channels } = useEegData();
  const visibleChannels = channels.filter(ch => ch.visible);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Calculate dynamic chart height based on number of visible channels
  const getChartHeight = () => {
    const baseHeight = 200;  // Minimum height
    const heightPerChannel = 60; // Additional height per channel
    return Math.max(baseHeight, baseHeight + visibleChannels.length * heightPerChannel);
  };
  
  return (
    <MobileLayout 
      title="Signal Viewer" 
      showBack={true}
      rightAction={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Sliders className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] sm:w-[385px]">
            <div className="py-6">
              <h3 className="text-lg font-medium mb-4">Channel Controls</h3>
              <ChannelControls />
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-4">
        <ConnectionStatus />
        
        {channels.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">EEG Signals</h3>
              <div className="text-sm text-muted-foreground">
                {visibleChannels.length} channel{visibleChannels.length !== 1 && 's'}
              </div>
            </div>
            <EegSignalChart height={getChartHeight()} />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-muted-foreground">
              No channels available. Add channels in the channel settings.
            </p>
          </div>
        )}
        
        <RecordingControls />
      </div>
    </MobileLayout>
  );
};

export default SignalViewer;
