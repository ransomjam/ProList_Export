// Settings page with demo reset functionality

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/mocks/api';
import { RotateCcw, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

export const SettingsPage = () => {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleDemoReset = async () => {
    setIsResetting(true);
    
    try {
      await mockApi.resetDemo();
      
      toast({
        title: "Demo Reset Complete",
        description: "All demo data has been reset to initial state.",
        duration: 5000,
      });
      
      // Reload the page to reflect the reset data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Demo reset failed:', error);
      
      toast({
        title: "Reset Failed",
        description: "Failed to reset demo data. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace configuration</p>
      </div>

      {/* Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Demo Environment
          </CardTitle>
          <CardDescription>
            This is a demonstration environment with mock data. You can reset the demo data at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Demo mode is active. All data is stored locally and will not affect real systems.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Reset Demo Data</h4>
            <p className="text-sm text-muted-foreground">
              This will restore all shipments, KPIs, and other demo data to their initial state. 
              This action cannot be undone.
            </p>
            
            <Button 
              onClick={handleDemoReset}
              disabled={isResetting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset Demo Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage your profile, preferences, and account security settings.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Compliance Rules</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure custom compliance rules and document requirements.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Invite team members and manage user permissions.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with external systems and APIs for automated workflows.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Environment:</strong> This is a demonstration version of ProList. 
          Features marked as "Coming soon" are not yet implemented in this preview.
        </AlertDescription>
      </Alert>
    </div>
  );
};