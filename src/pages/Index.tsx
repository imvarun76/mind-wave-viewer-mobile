
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Activity, Signal, Database, Settings } from "lucide-react";
import { useNetwork } from "@/providers/NetworkProvider";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { status: networkStatus } = useNetwork();
  const { toast } = useToast();

  useEffect(() => {
    // Check network status on load
    if (!networkStatus.connected) {
      toast({
        title: "Network Disconnected",
        description: "Connect to a network to use all features of the app.",
        variant: "destructive",
      });
    }
  }, [networkStatus.connected, toast]);

  return (
    <MobileLayout title="MindWave Viewer">
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
          <Activity className="h-12 w-12 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">
          MindWave Viewer
        </h1>
        <p className="text-gray-500 text-center mb-8 px-4">
          Real-time EEG signal visualization for mobile devices
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
        <Button 
          onClick={() => navigate('/viewer')}
          size="lg"
          className="flex items-center h-14"
        >
          <Activity className="mr-2 h-5 w-5" />
          Launch Signal Viewer
        </Button>
        
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => navigate('/settings/connection')}
            variant="outline"
            className="flex flex-col h-24 items-center justify-center space-y-2"
          >
            <Signal className="h-6 w-6" />
            <span>Connection Settings</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/settings/channels')}
            variant="outline"
            className="flex flex-col h-24 items-center justify-center space-y-2"
          >
            <Database className="h-6 w-6" />
            <span>Channel Settings</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
        <h3 className="font-medium text-blue-800 mb-2">How to use:</h3>
        <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
          <li>Connect to your ESP32 device via the Connection Settings.</li>
          <li>Configure your EEG channels in Channel Settings.</li>
          <li>Open Signal Viewer to monitor your EEG signals in real-time.</li>
        </ol>
      </div>
    </MobileLayout>
  );
};

export default Index;
