
import { useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useEegData } from '@/providers/EegDataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Trash2, Plus, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

type ChannelEditState = {
  name: string;
  color: string;
  min: number;
  max: number;
};

const ChannelSettings = () => {
  const { channels, updateChannel, addChannel, removeChannel } = useEegData();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [channelEdit, setChannelEdit] = useState<ChannelEditState>({
    name: '',
    color: '#FF5151',
    min: -100,
    max: 100,
  });
  
  // Available colors for channel selection
  const availableColors = [
    { name: 'Red', value: '#FF5151' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Orange', value: '#F97316' },
  ];
  
  const handleEditChannel = (channelId: number) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      setEditingChannelId(channelId);
      setChannelEdit({
        name: channel.name,
        color: channel.color,
        min: channel.min,
        max: channel.max,
      });
      setIsEditDialogOpen(true);
    }
  };
  
  const handleAddNewChannel = () => {
    setEditingChannelId(null);
    setChannelEdit({
      name: `Channel ${channels.length + 1}`,
      color: availableColors[Math.floor(Math.random() * availableColors.length)].value,
      min: -100,
      max: 100,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleSaveChannel = () => {
    if (editingChannelId !== null) {
      // Update existing channel
      updateChannel(editingChannelId, channelEdit);
      toast({
        title: "Channel Updated",
        description: `${channelEdit.name} has been updated.`,
      });
    } else {
      // Add new channel
      addChannel({
        ...channelEdit,
        visible: true,
        data: [],
      });
      toast({
        title: "Channel Added",
        description: `${channelEdit.name} has been added.`,
      });
    }
    setIsEditDialogOpen(false);
  };
  
  const handleDeleteChannel = (channelId: number) => {
    const channel = channels.find(ch => ch.id === channelId);
    removeChannel(channelId);
    toast({
      title: "Channel Removed",
      description: `${channel?.name || 'Channel'} has been removed.`,
      variant: "destructive",
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChannelEdit(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleMinMaxChange = (value: number[]) => {
    setChannelEdit(prev => ({
      ...prev,
      min: value[0],
      max: value[1],
    }));
  };
  
  return (
    <MobileLayout title="Channel Settings" showBack={true} backTo="/">
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">EEG Channels</h2>
          <Button onClick={handleAddNewChannel} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Channel
          </Button>
        </div>
        
        {channels.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No channels configured. Add a channel to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: channel.color }}
                    />
                    {channel.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Range:</span>{' '}
                      {channel.min} to {channel.max}
                    </div>
                    <div className="text-sm flex justify-end">
                      <Switch
                        checked={channel.visible}
                        onCheckedChange={(checked) => updateChannel(channel.id, { visible: checked })}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="ml-2">Visible</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteChannel(channel.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditChannel(channel.id)}
                  >
                    Edit Channel
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannelId !== null ? 'Edit Channel' : 'Add New Channel'}
            </DialogTitle>
            <DialogDescription>
              Configure the channel settings below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                name="name"
                value={channelEdit.name}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Channel Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-full h-10 rounded-md border-2 ${
                      channelEdit.color === color.value ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setChannelEdit(prev => ({ ...prev, color: color.value }))}
                    aria-label={`Select ${color.name}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>
                Signal Range: {channelEdit.min} to {channelEdit.max}
              </Label>
              <Slider
                value={[channelEdit.min, channelEdit.max]}
                min={-1000}
                max={1000}
                step={10}
                onValueChange={handleMinMaxChange}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-1000</span>
                <span>0</span>
                <span>1000</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSaveChannel}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default ChannelSettings;
