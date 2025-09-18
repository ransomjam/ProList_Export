import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { mockApi } from '@/mocks/api';
import { useToast } from '@/hooks/use-toast';
import { downloadDataUrl } from '@/utils/download';
import { FileDown, FileUp, RotateCcw, Trash2 } from 'lucide-react';

export const WorkspaceSettingsTab = () => {
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await mockApi.exportWorkspace();
      downloadDataUrl(result.fileName, result.dataUrl);
      toast({ title: 'Workspace exported', description: 'A JSON snapshot has been downloaded.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Export failed', description: 'Unable to export data at the moment.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSelect = () => {
    importInputRef.current?.click();
  };

  const onImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportDialogOpen(true);
    event.target.value = '';
  };

  const confirmImport = async () => {
    if (!importFile) return;
    try {
      setIsImporting(true);
      await mockApi.importWorkspace(importFile);
      toast({ title: 'Workspace imported', description: 'Reloading with the imported data.' });
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      console.error(error);
      toast({ title: 'Import failed', description: 'Check the file and try again.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      setImportDialogOpen(false);
      setImportFile(null);
    }
  };

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      await mockApi.resetDemo();
      toast({ title: 'Demo data restored', description: 'The workspace will now refresh.' });
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      console.error(error);
      toast({ title: 'Reset failed', description: 'We could not reset the demo content.', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearStorage = () => {
    mockApi.clearStorage();
    toast({ title: 'Storage cleared', description: 'Reloading to apply the clean slate.' });
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export workspace</CardTitle>
          <CardDescription>Download a JSON snapshot of all demo data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The export contains every <code className="rounded bg-muted px-1 py-0.5">prolist_mvp_*</code> entry so you can back up your session.
          </p>
          <Button onClick={handleExport} disabled={isExporting} className="w-full md:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            {isExporting ? 'Preparing…' : 'Download workspace JSON'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import workspace</CardTitle>
          <CardDescription>Replace current storage with a JSON export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will overwrite local data. Keep a backup before importing.
          </p>
          <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFileChange} />
          <Button onClick={handleImportSelect} className="w-full md:w-auto">
            <FileUp className="mr-2 h-4 w-4" />
            Select JSON file
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset demo data</CardTitle>
          <CardDescription>Restore the baseline dataset provided with ProList.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All shipments, templates, and settings will be replaced with the original demo seed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto" disabled={isResetting}>
                <RotateCcw className={`mr-2 h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Resetting…' : 'Reset demo'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action replaces all current data with the original sample workspace. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDemo} disabled={isResetting}>
                  Confirm reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Clear storage</CardTitle>
          <CardDescription>Remove every saved item and reload the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is irreversible. Only use when you want to start again from a clean state.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full md:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear storage
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  All ProList demo entries will be removed immediately. You will need to import or reset to continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearStorage}>Confirm clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import workspace data?</AlertDialogTitle>
            <AlertDialogDescription>
              {importFile ? `${importFile.name} (${(importFile.size / 1024).toFixed(1)} KB)` : 'Select a JSON export to continue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} disabled={isImporting}>
              {isImporting ? 'Importing…' : 'Import and reload'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
