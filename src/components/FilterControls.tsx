
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { FilterType, FilterConfig } from '@/utils/signalFilters';
import { Filter } from 'lucide-react';

interface FilterControlsProps {
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
  presetOptions: Record<string, FilterConfig>;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filterConfig,
  onFilterChange,
  presetOptions
}) => {
  const handlePresetChange = (presetName: string) => {
    if (presetName in presetOptions) {
      onFilterChange(presetOptions[presetName]);
    }
  };

  const handleCustomFilterChange = (updates: Partial<FilterConfig>) => {
    onFilterChange({ ...filterConfig, ...updates });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Signal Filtering
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Filter Selection */}
        <div className="space-y-2">
          <Label htmlFor="filter-preset" className="text-xs">Filter Preset</Label>
          <Select 
            value={Object.keys(presetOptions).find(key => 
              JSON.stringify(presetOptions[key]) === JSON.stringify(filterConfig)
            ) || 'custom'} 
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Filter</SelectItem>
              <SelectItem value="low-noise">Low Noise (40Hz LPF)</SelectItem>
              <SelectItem value="dc-remove">DC Remove (0.5Hz HPF)</SelectItem>
              <SelectItem value="eeg-band">EEG Band (0.5-40Hz)</SelectItem>
              <SelectItem value="notch-50hz">50Hz Notch</SelectItem>
              <SelectItem value="notch-60hz">60Hz Notch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Filter Type */}
        <div className="space-y-2">
          <Label htmlFor="filter-type" className="text-xs">Filter Type</Label>
          <Select 
            value={filterConfig.type} 
            onValueChange={(value: FilterType) => handleCustomFilterChange({ type: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="lowpass">Low Pass</SelectItem>
              <SelectItem value="highpass">High Pass</SelectItem>
              <SelectItem value="bandpass">Band Pass</SelectItem>
              <SelectItem value="notch">Notch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* High-pass cutoff */}
        {(filterConfig.type === 'highpass' || filterConfig.type === 'bandpass') && (
          <div className="space-y-2">
            <Label className="text-xs">High-pass Cutoff: {filterConfig.lowCutoff?.toFixed(1)}Hz</Label>
            <Slider
              value={[filterConfig.lowCutoff || 0.5]}
              onValueChange={([value]) => handleCustomFilterChange({ lowCutoff: value })}
              min={0.1}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        {/* Low-pass cutoff */}
        {(filterConfig.type === 'lowpass' || filterConfig.type === 'bandpass') && (
          <div className="space-y-2">
            <Label className="text-xs">Low-pass Cutoff: {filterConfig.highCutoff?.toFixed(0)}Hz</Label>
            <Slider
              value={[filterConfig.highCutoff || 40]}
              onValueChange={([value]) => handleCustomFilterChange({ highCutoff: value })}
              min={10}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Notch frequency */}
        {filterConfig.type === 'notch' && (
          <div className="space-y-2">
            <Label className="text-xs">Notch Frequency: {filterConfig.notchFreq?.toFixed(0)}Hz</Label>
            <Slider
              value={[filterConfig.notchFreq || 50]}
              onValueChange={([value]) => handleCustomFilterChange({ notchFreq: value })}
              min={45}
              max={65}
              step={1}
              className="w-full"
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Sampling Rate: {filterConfig.samplingRate}Hz
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterControls;
