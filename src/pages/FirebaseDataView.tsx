
import React from 'react';
import { useFirebaseData } from '@/providers/FirebaseDataProvider';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Heart, ThermometerSun } from 'lucide-react';
import PollingControls from '@/components/PollingControls';

const FirebaseDataView = () => {
  const { data, isLoading, lastUpdated, refreshData } = useFirebaseData();
  
  return (
    <MobileLayout 
      title="Firebase Data" 
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
        
        <PollingControls />
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Raw Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                JSON.stringify(data, null, 2)
              )}
            </pre>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default FirebaseDataView;
