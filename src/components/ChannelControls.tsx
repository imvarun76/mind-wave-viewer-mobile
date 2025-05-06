
import React from 'react';
import { useEegData, type EegChannel } from '@/providers/EegDataProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const ChannelControls: React.FC = () => {
  const { channels, updateChannel, addChannel, removeChannel } = useEegData();
  const isMobile = useIsMobile();

  // Available colors for new channels
  const channelColors = [
    '#FF5151', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  const handleAddChannel = () => {
    // Select a color that's not already in heavy use
    const colorCounts = new Array(channelColors.length).fill(0);
    channels.forEach(channel => {
      const colorIndex = channelColors.indexOf(channel.color);
      if (colorIndex >= 0) {
        colorCounts[colorIndex]++;
      }
    });
    
    // Find the least used color
    let leastUsedColorIndex = 0;
    for (let i = 1; i < colorCounts.length; i++) {
      if (colorCounts[i] < colorCounts[leastUsedColorIndex]) {
        leastUsedColorIndex = i;
      }
    }
    
    addChannel({
      name: `Channel ${channels.length + 1}`,
      color: channelColors[leastUsedColorIndex],
      visible: true,
      data: [],
      min: -100,
      max: 100,
    });
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">EEG Channels</h3>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {channels.map((channel) => (
          <div 
            key={channel.id} 
            className="flex items-center justify-between p-2 border rounded-md bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: channel.color }}
              />
              <span className="font-medium text-sm">{channel.name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Switch
                  checked={channel.visible}
                  onCheckedChange={(checked) => updateChannel(channel.id, { visible: checked })}
                  className="data-[state=checked]:bg-primary"
                />
                {!isMobile && <Label className="text-xs">Visible</Label>}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeChannel(channel.id)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {channels.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            No channels configured
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button onClick={handleAddChannel} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Channel
        </Button>
      </div>
    </div>
  );
};

export default ChannelControls;
