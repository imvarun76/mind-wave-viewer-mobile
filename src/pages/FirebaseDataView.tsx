import React, { useState } from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Heart, ThermometerSun, ChevronDown, ChevronUp } from 'lucide-react';
import PollingControls from '@/components/PollingControls';
import EegWaveformViewer from '@/components/EegWaveformViewer';
import BatchEegViewer from '@/components/BatchEegViewer';
import ClinicalEEGMontage from '@/components/ClinicalEEGMontage';
import FilterControls from '@/components/FilterControls';
import SessionRecordingControls from '@/components/SessionRecordingControls';
import RecordingsList from '@/components/RecordingsList';
import { FilterConfig } from '@/utils/signalFilters';

const FirebaseDataView = () => {
  const { data, rawTimeseriesData, isLoading, lastUpdated, refreshData } = useFirebaseData();
  const [showRawData, setShowRawData] = useState(false);
  
  // Default all channels visible for the batch viewer
  const [visibleChannels] = useState({
    ch1: true,
    ch2: true, 
    ch3: true,
    ch4: true,
    ch5: true,
    ch6: true,
    ch7: true,
    ch8: true,
  });

  // Filter configuration state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    type: 'none',
    samplingRate: 250,
    lowCutoff: 0.5,
    highCutoff: 40,
    notchFreq: 50,
    enableDCBlock: false,
    enableArtifactRemoval: false,
    enablePowerLineRemoval: false,
  });

  // Filter presets
  const filterPresets: Record<string, FilterConfig> = {
    none: { type: 'none', samplingRate: 250 },
    'low-noise': { type: 'lowpass', samplingRate: 250, highCutoff: 40 },
    'dc-remove': { type: 'highpass', samplingRate: 250, lowCutoff: 0.5 },
    'eeg-band': { type: 'bandpass', samplingRate: 250, lowCutoff: 0.5, highCutoff: 40 },
    'notch-50hz': { type: 'notch', samplingRate: 250, notchFreq: 50 },
    'notch-60hz': { type: 'notch', samplingRate: 250, notchFreq: 60 },
    'advanced-clean': { 
      type: 'advanced', 
      samplingRate: 250, 
      lowCutoff: 0.5, 
      highCutoff: 40,
      enableDCBlock: true,
      enableArtifactRemoval: true,
      enablePowerLineRemoval: true 
    },
  };
  
  return (
    <MobileLayout 
      title="Firebase EEG Data" 
      showBack={true}
      rightAction={
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9" 
          onClick={() => refreshData()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      <div className="space-y-4 pb-6">
        <div className="text-sm text-muted-foreground text-right">
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Recording Controls and Polling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SessionRecordingControls />
          <PollingControls />
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Health Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-4 border rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">Heart Rate</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{data.hr || '--'} <span className="text-sm text-muted-foreground">bpm</span></div>
              )}
            </div>
            
            <div className="flex flex-col items-center p-4 border rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-sm text-muted-foreground">SpO2</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{data.spo2 || '--'} <span className="text-sm text-muted-foreground">%</span></div>
              )}
            </div>
            
            <div className="col-span-2 flex flex-col items-center p-4 border rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <ThermometerSun className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Temperature</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{data.temp || '--'} <span className="text-sm text-muted-foreground">°C</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="visualization" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visualization">Data Visualization</TabsTrigger>
            <TabsTrigger value="recordings">Session Recordings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visualization" className="space-y-4">
            {/* Filter Controls */}
            <FilterControls
              filterConfig={filterConfig}
              onFilterChange={setFilterConfig}
              presetOptions={filterPresets}
            />

            {/* EEG Visualizations */}
            <div className="grid lg:grid-cols-4 gap-4">
              <div className="lg:col-span-4">
                <ClinicalEEGMontage 
                  data={rawTimeseriesData} 
                  visibleChannels={visibleChannels}
                  filterConfig={filterConfig}
                  samplingRate={250}
                />
              </div>
            </div>
            
            <EegWaveformViewer />
            
            <BatchEegViewer visibleChannels={visibleChannels} />
            
            {/* Raw Data Section */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Raw Data</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowRawData(!showRawData)}
                >
                  {showRawData ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              {showRawData && (
                <CardContent>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                    {isLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      JSON.stringify(rawTimeseriesData, null, 2)
                    )}
                  </pre>
                </CardContent>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="recordings">
            <RecordingsList />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default FirebaseDataView;