
import React from 'react';
import { Link } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Settings, Database } from 'lucide-react';

const Index = () => {
  return (
    <MobileLayout title="Mind Wave Viewer">
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Link to="/firebase-data">
                <Button variant="default" className="w-full justify-between group">
                  Firebase Health Data
                  <Database className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Link to="/settings/connection">
                <Button variant="outline" className="w-full justify-between group">
                  Connection Settings
                  <Settings className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </Button>
              </Link>
              
              <Link to="/settings/channels">
                <Button variant="outline" className="w-full justify-between group">
                  Channel Settings
                  <Settings className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Index;
