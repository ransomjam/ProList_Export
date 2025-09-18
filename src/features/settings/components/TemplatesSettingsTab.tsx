import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { mockApi } from '@/mocks/api';
import type { TemplateKey } from '@/mocks/types';
import { useToast } from '@/hooks/use-toast';
import { downloadDataUrl } from '@/utils/download';
import { CloudUpload, Trash2, Check, Download } from 'lucide-react';

const TEMPLATE_OPTIONS: Array<{ value: TemplateFilterValue; label: string; key: TemplateKey }> = [
  { value: 'commercial_invoice', label: 'Commercial invoice', key: 'INVOICE' },
  { value: 'packing_list', label: 'Packing list', key: 'PACKING_LIST' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin', key: 'COO' },
  { value: 'phytosanitary_certificate', label: 'Phytosanitary certificate', key: 'PHYTO' },
  { value: 'insurance_certificate', label: 'Insurance certificate', key: 'INSURANCE' },
  { value: 'bill_of_lading', label: 'Bill of lading', key: 'BILL_OF_LADING' },
  { value: 'customs_export_declaration', label: 'Customs export declaration', key: 'CUSTOMS_EXPORT_DECLARATION' },
];

const TEMPLATE_LABELS: Record<TemplateKey, string> = TEMPLATE_OPTIONS.reduce((acc, option) => {
  acc[option.key] = option.label;
  return acc;
}, {} as Record<TemplateKey, string>);

type TemplateFilterValue =
  | 'all'
  | 'commercial_invoice'
  | 'packing_list'
  | 'certificate_of_origin'
  | 'phytosanitary_certificate'
  | 'insurance_certificate'
  | 'bill_of_lading'
  | 'customs_export_declaration';

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const TemplatesSettingsTab = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<TemplateFilterValue>('all');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => mockApi.listTemplates(),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ key, file }: { key: TemplateKey; file: File }) => mockApi.uploadTemplate({ key, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template uploaded', description: 'Remember to set it active once you are ready.' });
    },
    onError: () => {
      toast({ title: 'Upload failed', description: 'We could not store that file just now.', variant: 'destructive' });
    },
    onSettled: () => {
      setPendingFile(null);
      setIsConfirmOpen(false);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => mockApi.setActiveTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template set active', description: 'Future documents will reference this file.' });
    },
    onError: () => {
      toast({ title: 'Action failed', description: 'Unable to update the active template.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mockApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template removed', description: 'You can upload a fresh copy at any time.' });
    },
    onError: () => {
      toast({ title: 'Delete failed', description: 'The template could not be removed.', variant: 'destructive' });
    },
  });

  const filteredTemplates = useMemo(() => {
    if (filter === 'all') return templates;
    const option = TEMPLATE_OPTIONS.find(item => item.value === filter);
    if (!option) return templates;
    return templates.filter(template => template.key === option.key);
  }, [templates, filter]);

  const selectedKey = useMemo(() => {
    if (filter === 'all') return null;
    const option = TEMPLATE_OPTIONS.find(item => item.value === filter);
    return option?.key ?? null;
  }, [filter]);

  const handleSelectFile = () => {
    if (!selectedKey) {
      toast({ title: 'Choose a document type', description: 'Select a document type before uploading a template.', variant: 'destructive' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file', description: 'Upload a PDF or DOCX template.', variant: 'destructive' });
      event.target.value = '';
      return;
    }

    setPendingFile(file);
    setIsConfirmOpen(true);
    event.target.value = '';
  };

  const confirmUpload = () => {
    if (!pendingFile || !selectedKey) return;
    uploadMutation.mutate({ key: selectedKey, file: pendingFile });
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (filteredTemplates.length === 0) {
      return (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No templates uploaded for this document yet.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{TEMPLATE_LABELS[template.key] ?? template.key}</TableCell>
                <TableCell className="max-w-[280px] truncate font-mono text-xs">{template.fileName}</TableCell>
                <TableCell>{formatBytes(template.sizeBytes)}</TableCell>
                <TableCell>{new Date(template.uploaded_at).toLocaleString('en-GB')}</TableCell>
                <TableCell>
                  {template.active ? (
                    <Badge className="bg-[var(--brand-primary)] text-[color:var(--brand-primary-contrast)]">
                      <Check className="mr-1 h-3.5 w-3.5" /> Active
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!template.active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateMutation.mutate(template.id)}
                        disabled={activateMutation.isPending}
                      >
                        Set active
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => downloadDataUrl(template.fileName, template.dataUrl)}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download template</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete template</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete template</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {template.fileName}. You can re-upload it later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>Upload official document templates to reference in future exports.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 lg:w-72">
            <label className="text-sm font-medium">Document type</label>
            <Select value={filter} onValueChange={value => setFilter(value as TemplateFilterValue)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All documents</SelectItem>
                {TEMPLATE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full items-center justify-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button onClick={handleSelectFile} className="w-full lg:w-auto">
              <CloudUpload className="mr-2 h-4 w-4" />
              Upload template
            </Button>
          </div>
        </div>

        {renderTable()}

        <p className="text-xs text-muted-foreground">
          Accepted files: PDF, DOC, DOCX. Active templates are highlighted in document workflows.
        </p>
      </CardContent>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFile ? `${pendingFile.name} (${formatBytes(pendingFile.size)})` : 'Select a template to continue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
