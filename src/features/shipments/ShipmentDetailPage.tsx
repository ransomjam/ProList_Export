// Shipment detail page with tabs and overview

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Package,
  Users,
  DollarSign,
  Weight,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  Download,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { formatFcfa } from '@/utils/currency';
import { evaluateRules, type DocKey } from '@/utils/rules';
import { DocumentsTab } from '@/features/documents/DocumentsTab';
import { IssuesTab } from '@/features/issues/components/IssuesTab';
import { TimelineTab } from '@/features/issues/components/TimelineTab';
import { CostsTab } from '@/features/costs/CostsTab';
import { HsQuickPicker } from '@/features/hs/components/HsQuickPicker';
import type { ShipmentWithItems, Product, ShipmentDocument, DocStatus } from '@/mocks/seeds';
import { seedUsers } from '@/mocks/seeds';
import { SubmissionReadinessCard, type ReadinessChecklistItem } from '@/features/shipments/SubmissionReadinessCard';
import { SubmissionPackSummaryCard } from '@/features/shipments/components/SubmissionPackSummaryCard';
import { SubmissionPackPreview } from '@/features/shipments/components/SubmissionPackPreview';
import { DownloadCentreSheet } from '@/features/shipments/components/DownloadCentreSheet';
import { ShareSubmissionPackDialog } from '@/features/shipments/components/ShareSubmissionPackDialog';
import { getDocumentLabel } from '@/features/shipments/docMeta';
import type {
  SubmissionPackDocumentSummary,
  SubmissionPackSummary as SubmissionPackSummaryType,
} from '@/features/shipments/types';
import { DocStatusBadge } from '@/components/documents/DocStatusBadge';
import { docStatusLabel, normalizeDocStatus } from '@/utils/docStatus';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'cleared':
      return 'default';
    case 'submitted':
      return 'secondary';
    case 'draft':
    default:
      return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'cleared':
      return 'text-green-600';
    case 'submitted':
      return 'text-blue-600';
    case 'draft':
    default:
      return 'text-orange-600';
  }
};

const ensureSentence = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const missingDocCopy = (
  docKey: DocKey,
  shipment?: ShipmentWithItems,
  fallback?: string
): string => {
  switch (docKey) {
    case 'INVOICE':
      return 'Commercial Invoice missing — generate it in Documents';
    case 'PACKING_LIST':
      return 'Packing List missing — upload the signed version';
    case 'PHYTO':
      return 'Phytosanitary certificate required (cocoa/coffee)';
    case 'COO':
      return shipment?.route
        ? `Certificate of Origin required for ${shipment.route}`
        : 'Certificate of Origin required for this destination';
    case 'INSURANCE':
      return shipment?.incoterm
        ? `Insurance certificate required for ${shipment.incoterm} terms`
        : 'Insurance certificate required for these terms';
    case 'BILL_OF_LADING':
      return 'Bill of Lading not yet uploaded';
    case 'CUSTOMS_EXPORT_DECLARATION':
      return 'Customs export declaration pending completion';
    default:
      return fallback || `${getDocumentLabel(docKey)} missing`;
  }
};

const ComingSoonTab = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Clock className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md">
      This feature is coming soon. We're working hard to bring you comprehensive 
      shipment management tools.
    </p>
  </div>
);

export const ShipmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam ?? 'overview');
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isHsPickerOpen, setIsHsPickerOpen] = useState(false);
  const [isDownloadCentreOpen, setIsDownloadCentreOpen] = useState(false);
  const [isPackPreviewOpen, setIsPackPreviewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePack, setSharePack] = useState<SubmissionPackSummaryType | null>(null);
  const [packs, setPacks] = useState<SubmissionPackSummaryType[]>([]);

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => mockApi.getShipment(id!),
    enabled: !!id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: mockApi.listProducts,
  });

  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['shipment-documents', id],
    queryFn: async () => {
      if (!id) return [] as ShipmentDocument[];
      return mockApi.listShipmentDocuments(id);
    },
    enabled: !!id,
  });

  const { data: issues = [], isLoading: isLoadingIssues } = useQuery({
    queryKey: ['issues', 'shipment', id],
    queryFn: () => mockApi.listIssues({ shipment_id: id! }),
    enabled: !!id,
  });

  const { data: costSummary, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['costSummary', id],
    queryFn: () => mockApi.getCostSummary(id!),
    enabled: !!id,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: mockApi.getCurrentUser,
  });

  const documentRequirements = useMemo(() => {
    if (!shipment) {
      return { required: [] as DocKey[], reasons: {} as Partial<Record<DocKey, string>> };
    }
    return evaluateRules(shipment, products);
  }, [shipment, products]);

  const documentChecklist = useMemo(
    () => {
      const combined: DocKey[] = ['INVOICE', 'PACKING_LIST', ...documentRequirements.required];
      const unique: DocKey[] = [];
      combined.forEach(key => {
        if (!unique.includes(key)) unique.push(key);
      });
      return unique.map(key => {
        const doc = documents.find(document => document.doc_key === key);
        return {
          key,
          status: doc?.status ?? 'required',
          reason: documentRequirements.reasons[key],
          doc,
        };
      });
    },
    [documents, documentRequirements]
  );

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value !== 'documents') {
      next.delete('highlight');
    }
    setSearchParams(next, { replace: true });
  };

  // Update shipment mutation
  const updateShipmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ShipmentWithItems> }) =>
      mockApi.updateShipment(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      const statusUpdate = variables?.updates?.status;

      if (statusUpdate === 'submitted') {
        toast.success('Shipment submitted successfully');
        setIsSubmitDialogOpen(false);
      } else if (statusUpdate === 'draft') {
        toast.success('Shipment reopened for edits');
        setIsReopenDialogOpen(false);
      } else {
        toast.success('Shipment updated successfully');
      }
    },
    onError: () => {
      toast.error('Failed to update shipment');
    },
  });

  // Delete shipment mutation
  const deleteShipmentMutation = useMutation({
    mutationFn: (id: string) => mockApi.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted successfully');
      navigate('/shipments');
    },
    onError: () => {
      toast.error('Failed to delete shipment');
    },
  });

  const handleSubmitConfirm = () => {
    if (!shipment) return;
    updateShipmentMutation.mutate({
      id: shipment.id,
      updates: { status: 'submitted' },
    });
  };

  const handleReopenConfirm = () => {
    if (!shipment) return;
    updateShipmentMutation.mutate({
      id: shipment.id,
      updates: { status: 'draft', submitted_at: null, submitted_by: null },
    });
  };

  const handleDownloadSubmissionPack = () => {
    handleDownloadPack();
  };

  const handleDelete = () => {
    if (!shipment) return;
    deleteShipmentMutation.mutate(shipment.id);
  };

  const handleAddAdHocProduct = (product: Product) => {
    if (!shipment) return;
    
    // Add the new product as an item to the shipment
    const newItem = {
      id: `item_${Date.now()}`,
      product_id: product.id,
      quantity: 1,
    };
    
    const updatedItems = [...(shipment.items || []), newItem];
    
    updateShipmentMutation.mutate({
      id: shipment.id,
      updates: { items: updatedItems },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTimeWithTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate totals
  const totals = (shipment?.items ?? []).reduce((acc, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      acc.value += product.unit_price_fcfa * item.quantity;
      acc.weight += (product.weight_kg || 0) * item.quantity;
      acc.items += 1;
    }
    return acc;
  }, { value: 0, weight: 0, items: 0 });

  const goToDocuments = () => handleTabChange('documents');
  const goToIssues = () => handleTabChange('issues');
  const goToCosts = () => handleTabChange('costs');

  const documentStatusSummaries = useMemo(() => {
    return documentChecklist.map(item => {
      const docName = getDocumentLabel(item.key);
      const doc = item.doc;
      const versions = doc?.versions ?? [];
      const currentVersion = doc?.current_version
        ? versions.find(version => version.version === doc.current_version) ?? null
        : versions[versions.length - 1] ?? null;
      const versionLabel = currentVersion?.version ? ` (v${currentVersion.version})` : '';
      const note = currentVersion?.note ? ` — ${currentVersion.note}` : '';
      const normalizedStatus = normalizeDocStatus(item.status);

      switch (normalizedStatus) {
        case 'signed':
          return {
            key: item.key,
            ready: true,
            text: ensureSentence(`${docName} signed${versionLabel}${note}`),
          };
        case 'active':
          return {
            key: item.key,
            ready: true,
            text: ensureSentence(`${docName} active${versionLabel}${note}`),
          };
        case 'ready':
          return {
            key: item.key,
            ready: true,
            text: ensureSentence(`${docName} ready to submit${versionLabel}${note}`),
          };
        case 'submitted':
          return {
            key: item.key,
            ready: false,
            text: ensureSentence(`${docName} submitted to authority — awaiting receipt`),
          };
        case 'under_review':
          return {
            key: item.key,
            ready: false,
            text: ensureSentence(`${docName} under review by authority`),
          };
        case 'draft':
          return {
            key: item.key,
            ready: false,
            text: ensureSentence(`${docName} still in draft — mark ready before submission`),
          };
        case 'rejected':
          return {
            key: item.key,
            ready: false,
            text: ensureSentence(`${docName} rejected — upload a corrected version`),
          };
        case 'expired':
          return {
            key: item.key,
            ready: false,
            text: ensureSentence(`${docName} expired — renewal required`),
          };
        case 'required':
        default:
          return {
            key: item.key,
            ready: ['ready', 'signed', 'active'].includes(normalizedStatus),
            text: ensureSentence(missingDocCopy(item.key, shipment, item.reason)),
          };
      }
    });
  }, [documentChecklist, shipment]);

  const missingDocSummaries = documentStatusSummaries.filter(summary => !summary.ready);
  const readyDocSummaries = documentStatusSummaries.filter(summary => summary.ready);

  const packDocuments = useMemo<SubmissionPackDocumentSummary[]>(() => {
    return documentChecklist.map(item => {
      const doc = item.doc;
      const versions = doc?.versions ?? [];
      const currentVersion = doc?.current_version
        ? versions.find(version => version.version === doc.current_version) ?? null
        : versions[versions.length - 1] ?? null;
      const summary = documentStatusSummaries.find(summaryItem => summaryItem.key === item.key);
      const versionLabel = currentVersion?.version ? `v${currentVersion.version}` : undefined;
      const summaryText = summary?.text?.replace(/\.$/, '') ?? undefined;
      const note = currentVersion?.note?.trim()
        ? currentVersion.note.trim()
        : summaryText && summaryText !== getDocumentLabel(item.key)
          ? summaryText
          : undefined;

      return {
        key: item.key,
        label: getDocumentLabel(item.key),
        versionLabel,
        statusLabel: docStatusLabel(item.status),
        note,
      } satisfies SubmissionPackDocumentSummary;
    });
  }, [documentChecklist, documentStatusSummaries]);

  let documentsDetail: string | undefined;
  if (isLoadingDocuments) {
    documentsDetail = 'Checking latest documents…';
  } else if (missingDocSummaries.length > 0) {
    const [first, ...rest] = missingDocSummaries;
    documentsDetail = rest.length > 0 ? `${first.text} + ${rest.length} more.` : first.text;
  } else if (readyDocSummaries.length > 0) {
    const readyPreview = readyDocSummaries
      .slice(0, 2)
      .map(summary => summary.text.replace(/\.$/, ''));
    documentsDetail = readyPreview.join(' • ');
  }

  const documentsReady =
    !isLoadingDocuments && missingDocSummaries.length === 0 && documentChecklist.length > 0;
  const documentsStatus: ReadinessChecklistItem = {
    id: 'documents',
    title: 'Required documents',
    status: isLoadingDocuments ? 'loading' : documentsReady ? 'ready' : 'blocked',
    statusLabel: isLoadingDocuments
      ? 'Checking…'
      : documentsReady
        ? 'Ready'
        : missingDocSummaries.length > 1
          ? `${missingDocSummaries.length} missing`
          : 'Missing',
    detail: documentsDetail,
    actionLabel: documentsReady ? 'View documents' : 'Go to Documents',
    onAction: goToDocuments,
  };

  const openIssues = issues.filter(
    issue => issue.status === 'open' || issue.status === 'in_progress'
  );
  const openIssuesCount = openIssues.length;
  const issuesDetail = isLoadingIssues
    ? 'Checking issues…'
    : openIssuesCount === 0
      ? 'No open issues right now.'
      : `${openIssuesCount === 1 ? '1 issue still open' : `${openIssuesCount} issues open`} — “${openIssues[0].title}”.`;
  const issuesStatus: ReadinessChecklistItem = {
    id: 'issues',
    title: 'Issues',
    status: isLoadingIssues ? 'loading' : openIssuesCount === 0 ? 'ready' : 'attention',
    statusLabel: isLoadingIssues
      ? 'Checking…'
      : openIssuesCount === 0
        ? 'Clear'
        : `${openIssuesCount} open`,
    detail: issuesDetail,
    actionLabel: openIssuesCount > 0 ? 'Open issues' : 'View issues',
    onAction: goToIssues,
  };

  const balanceFcfa = costSummary?.balance_fcfa ?? 0;
  const costsDetail = isLoadingCosts
    ? 'Loading latest balance…'
    : balanceFcfa <= 0
      ? balanceFcfa < 0
        ? `Overpaid by ${formatFcfa(Math.abs(balanceFcfa))}.`
        : 'Balance cleared — ready to submit.'
      : `Balance due ${formatFcfa(balanceFcfa)}. Record payment before submission.`;
  const costsStatus: ReadinessChecklistItem = {
    id: 'costs',
    title: 'Costs & payments',
    status: isLoadingCosts ? 'loading' : balanceFcfa <= 0 ? 'ready' : 'attention',
    statusLabel: isLoadingCosts
      ? 'Checking…'
      : balanceFcfa <= 0
        ? balanceFcfa < 0
          ? 'Overpaid'
          : 'Clear'
        : `Due ${formatFcfa(balanceFcfa)}`,
    detail: costsDetail,
    actionLabel: 'Review costs',
    onAction: goToCosts,
  };

  const readinessItems: ReadinessChecklistItem[] = [
    documentsStatus,
    issuesStatus,
    costsStatus,
  ];
  const readinessHighlights = useMemo(() => {
    const highlights: string[] = [];
    readyDocSummaries.forEach(summary => {
      const cleaned = summary.text.replace(/\.$/, '');
      if (cleaned) {
        highlights.push(cleaned);
      }
    });
    const issuesHighlight = typeof issuesStatus.detail === 'string' ? issuesStatus.detail : undefined;
    if (issuesHighlight && !issuesHighlight.toLowerCase().includes('checking')) {
      highlights.push(issuesHighlight.replace(/\.$/, ''));
    }
    const costsHighlight = typeof costsStatus.detail === 'string' ? costsStatus.detail : undefined;
    if (costsHighlight && !costsHighlight.toLowerCase().includes('loading')) {
      highlights.push(costsHighlight.replace(/\.$/, ''));
    }
    return highlights.filter(Boolean).slice(0, 5);
  }, [readyDocSummaries, issuesStatus.detail, costsStatus.detail]);
  const isReadyForSubmission = readinessItems.every(item => item.status === 'ready');
  const isSubmitted = shipment ? shipment.status !== 'draft' : false;

  const fallbackUserName = currentUser?.name ?? seedUsers[0]?.name ?? 'Jam Ransom';
  const submittedByName = shipment && isSubmitted
    ? shipment.submitted_by
      ? seedUsers.find(user => user.id === shipment.submitted_by)?.name ??
        (currentUser &&
        (shipment.submitted_by === currentUser.id || shipment.submitted_by === 'current_user')
          ? currentUser.name
          : fallbackUserName)
      : fallbackUserName
    : undefined;
  const submittedDateTimeText = shipment?.submitted_at
    ? formatDateTimeWithTime(shipment.submitted_at)
    : shipment
      ? formatDateTimeWithTime(shipment.updated_at)
      : formatDateTimeWithTime(new Date().toISOString());

  const packHistory = useMemo<SubmissionPackSummaryType[]>(() => {
    if (!shipment || !isSubmitted) return [];
    const createdAt = shipment.submitted_at ?? shipment.updated_at;
    const createdBy = submittedByName ?? fallbackUserName;
    const helperLine = formatDateTimeWithTime(createdAt);
    const primaryPack: SubmissionPackSummaryType = {
      id: `${shipment.id}-pack-1`,
      name: 'Submission Pack #1',
      createdAt,
      createdBy,
      contents: packDocuments,
      shareUrl: `https://demo.prolist.example/shipments/${shipment.id}/packs/1`,
      helperLine,
      isPrimary: true,
    };

    const previousDate = new Date(createdAt);
    previousDate.setDate(previousDate.getDate() - 7);
    const previousPack: SubmissionPackSummaryType = {
      id: `${shipment.id}-pack-0`,
      name: 'Submission Pack #0',
      createdAt: previousDate.toISOString(),
      createdBy,
      contents: packDocuments.map((doc, index) => ({
        ...doc,
        note: doc.note ?? (index === 0 ? 'Earlier buyer copy archived' : undefined),
      })),
      shareUrl: `https://demo.prolist.example/shipments/${shipment.id}/packs/0`,
      helperLine: formatDateTimeWithTime(previousDate.toISOString()),
      isPrimary: false,
    };

    return [primaryPack, previousPack];
  }, [shipment, isSubmitted, packDocuments, submittedByName, fallbackUserName]);

  const readyDocListForDialog = (readyDocSummaries.length > 0
    ? readyDocSummaries
    : documentStatusSummaries
  ).map(summary => summary.text.replace(/\.$/, ''));
  const issuesDialogSummary = isLoadingIssues
    ? 'Checking…'
    : openIssuesCount === 0
      ? 'None open'
      : `${openIssuesCount} open`;
  const balanceDialogSummary = costSummary
    ? `${formatFcfa(costSummary.balance_fcfa)}${costSummary.balance_fcfa > 0 ? ' — resolve before submission.' : ''}`
    : '0 FCFA';

  const openSubmitDialog = () => setIsSubmitDialogOpen(true);
  const openReopenDialog = () => setIsReopenDialogOpen(true);

  useEffect(() => {
    setPacks(prev => {
      if (packHistory.length === 0) {
        return prev.length === 0 ? prev : [];
      }

      if (prev.length === 0) {
        return packHistory;
      }

      if (packHistory[0]?.id !== prev[0]?.id) {
        return packHistory;
      }

      return prev;
    });
  }, [packHistory]);

  const primaryPack = packs.find(pack => pack.isPrimary) ?? packHistory.find(pack => pack.isPrimary) ?? null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shipments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Shipment not found or failed to load. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const docsIncludedCount = primaryPack?.contents.length ?? packDocuments.length;

  const handleDownloadPack = (pack?: SubmissionPackSummaryType | null) => {
    const targetPack = pack ?? primaryPack;
    if (!targetPack) {
      toast.info('Submission pack will be available once submitted.');
      return;
    }
    toast.success(`${targetPack.name} download started (demo).`);
  };

  const handleSharePack = (pack?: SubmissionPackSummaryType | null) => {
    const targetPack = pack ?? primaryPack;
    if (!targetPack) return;
    setSharePack(targetPack);
    setShareDialogOpen(true);
  };

  const handleDeletePack = (pack: SubmissionPackSummaryType) => {
    setPacks(prev => prev.filter(item => item.id !== pack.id));
    toast.success(`${pack.name} removed from Download Centre`);
  };

  const handleShareCopy = (_link: string) => {
    toast.success('Link copied');
  };

  return (
    <>
      <div className="space-y-6">
      {shipment.status === 'submitted' && (
        <Alert className="border-green-200 bg-green-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full bg-white p-2 shadow-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <AlertTitle className="text-green-800">Submitted</AlertTitle>
                <AlertDescription className="text-green-700">
                  Submitted on {submittedDateTimeText}
                  {submittedByName ? ` by ${submittedByName}` : ''}.
                </AlertDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 bg-white text-green-700 shadow-sm hover:bg-green-100"
                onClick={() => handleDownloadPack()}
              >
                <Download className="mr-2 h-4 w-4" /> Download submission pack
              </Button>
              <Button
                size="sm"
                variant="link"
                className="text-green-700 hover:text-green-800"
                onClick={() => handleSharePack()}
              >
                <Share2 className="mr-1 h-4 w-4" /> Share link
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shipments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shipment.reference}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(shipment.status)} className="capitalize">
                {shipment.status}
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{shipment.route}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <Badge variant="outline">{shipment.incoterm}</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete shipment {shipment.reference}? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isSubmitted && primaryPack ? (
        <SubmissionPackSummaryCard
          pack={primaryPack}
          submittedAtText={submittedDateTimeText}
          submittedBy={submittedByName ?? fallbackUserName}
          documentsCount={docsIncludedCount}
          onDownload={() => handleDownloadPack(primaryPack)}
          onViewDetails={() => setIsPackPreviewOpen(true)}
          onOpenDownloadCentre={() => setIsDownloadCentreOpen(true)}
          onShare={() => handleSharePack(primaryPack)}
          helperLine={primaryPack.helperLine}
          onReopen={shipment.status === 'submitted' ? openReopenDialog : undefined}
          isReopening={shipment.status === 'submitted' ? updateShipmentMutation.isPending : false}
        />
      ) : (
        <SubmissionReadinessCard
          isReady={isReadyForSubmission}
          items={readinessItems}
          onSubmit={!isSubmitted ? openSubmitDialog : undefined}
          isSubmitting={updateShipmentMutation.isPending}
          isSubmitted={isSubmitted}
          submittedAt={shipment.submitted_at}
          submittedByName={submittedByName}
          onReopen={shipment.status === 'submitted' ? openReopenDialog : undefined}
          isReopening={shipment.status === 'submitted' ? updateShipmentMutation.isPending : false}
          onDownloadPack={isSubmitted ? handleDownloadSubmissionPack : undefined}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatFcfa(totals.value)}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Weight</p>
                <p className="text-2xl font-bold">{totals.weight.toFixed(0)} kg</p>
              </div>
              <div className="rounded-full bg-secondary/10 p-3">
                <Weight className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-2xl font-bold">{totals.items}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <Package className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyer</p>
                <p className="text-lg font-medium">{shipment.buyer}</p>
                <p className="text-sm text-muted-foreground">Updated {formatDate(shipment.updated_at)}</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Items Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button 
                  onClick={() => setIsHsPickerOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shipment.items && shipment.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>HS Code</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Weight (kg)</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.items.map((item, index) => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return null;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {product.hs_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatFcfa(product.unit_price_fcfa)}</TableCell>
                          <TableCell className="text-right">
                            {((product.weight_kg || 0) * item.quantity).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatFcfa(product.unit_price_fcfa * item.quantity)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No items found for this shipment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documentChecklist.length > 0 ? (
                <div className="space-y-3">
                  {documentChecklist.map(item => {
                    const versions = item.doc?.versions ?? [];
                    const currentVersion = item.doc?.current_version
                      ? versions.find(version => version.version === item.doc?.current_version) ?? null
                      : versions[versions.length - 1] ?? null;

                    const normalizedStatus = normalizeDocStatus(item.status);
                    const helperText = (() => {
                      if (['signed', 'ready', 'active'].includes(normalizedStatus)) {
                        if (currentVersion?.note) return currentVersion.note;
                        if (currentVersion?.fileName) return `Latest file: ${currentVersion.fileName}`;
                        return normalizedStatus === 'active'
                          ? 'Active document — keep an eye on the expiry date.'
                          : 'Ready for submission';
                      }
                      if (normalizedStatus === 'submitted') {
                        return 'Submitted to state portal — awaiting acknowledgement.';
                      }
                      if (normalizedStatus === 'under_review') {
                        return 'Under review by authority.';
                      }
                      if (normalizedStatus === 'draft') {
                        return 'Draft version saved — mark ready when complete.';
                      }
                      if (normalizedStatus === 'rejected') {
                        return 'Rejected — upload a corrected version.';
                      }
                      if (normalizedStatus === 'expired') {
                        return 'Expired — renew required before shipment moves.';
                      }
                      return item.reason ?? missingDocCopy(item.key, shipment);
                    })();

                    return (
                      <div key={item.key} className="flex items-center justify-between rounded-xl border p-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {getDocumentLabel(item.key)}
                          </span>
                          {helperText && (
                            <span className="text-sm text-muted-foreground">{helperText}</span>
                          )}
                        </div>
                        <DocStatusBadge status={item.status} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 p-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">No special documents required</h3>
                  <p className="text-muted-foreground">
                    Based on the destination and products, no additional compliance documents are required.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            shipment={shipment}
            products={products}
            onOpenDownloadCentre={() => setIsDownloadCentreOpen(true)}
          />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesTab shipment={shipment} />
        </TabsContent>

        <TabsContent value="costs">
          <CostsTab shipment={shipment} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab shipment={shipment} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit shipment</AlertDialogTitle>
            <AlertDialogDescription>
              We'll lock editable fields and mark this shipment as Submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Docs included</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {readyDocListForDialog.map(line => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <span>Issues: {issuesDialogSummary}</span>
              <span>Balance: {balanceDialogSummary}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateShipmentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitConfirm}
              disabled={!isReadyForSubmission || updateShipmentMutation.isPending}
            >
              {updateShipmentMutation.isPending ? 'Submitting…' : 'Submit shipment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen for edits</AlertDialogTitle>
            <AlertDialogDescription>
              Reopening changes status to Draft. Make sure you notify your team if documents changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateShipmentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopenConfirm}
              disabled={updateShipmentMutation.isPending}
            >
              {updateShipmentMutation.isPending ? 'Reopening…' : 'Reopen shipment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HS Quick Picker */}
      <HsQuickPicker
        isOpen={isHsPickerOpen}
        onClose={() => setIsHsPickerOpen(false)}
        onProductCreated={handleAddAdHocProduct}
      />
    </div>

    <DownloadCentreSheet
      open={isDownloadCentreOpen}
      onOpenChange={setIsDownloadCentreOpen}
      packs={packs}
      onDownload={pack => handleDownloadPack(pack)}
      onShare={pack => handleSharePack(pack)}
      onDelete={handleDeletePack}
    />

    <ShareSubmissionPackDialog
      pack={sharePack}
      open={shareDialogOpen}
      onOpenChange={open => {
        setShareDialogOpen(open);
        if (!open) {
          setSharePack(null);
        }
      }}
      onCopy={handleShareCopy}
    />

    <Dialog open={isPackPreviewOpen} onOpenChange={setIsPackPreviewOpen}>
      <DialogContent className="max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission pack preview</DialogTitle>
          <DialogDescription>First page preview before downloading or sharing.</DialogDescription>
        </DialogHeader>
        {primaryPack ? (
          <SubmissionPackPreview
            packName={primaryPack.name}
            shipmentReference={shipment.reference}
            submittedAtText={submittedDateTimeText}
            submittedBy={submittedByName ?? fallbackUserName}
            route={shipment.route}
            mode={shipment.mode}
            incoterm={shipment.incoterm}
            buyer={shipment.buyer}
            readinessHighlights={readinessHighlights}
            documents={primaryPack.contents}
            helperLine={primaryPack.helperLine}
          />
        ) : (
          <SubmissionPackPreview
            packName="Submission Pack"
            shipmentReference={shipment.reference}
            submittedAtText={submittedDateTimeText}
            submittedBy={submittedByName ?? fallbackUserName}
            route={shipment.route}
            mode={shipment.mode}
            incoterm={shipment.incoterm}
            buyer={shipment.buyer}
            readinessHighlights={readinessHighlights}
            documents={packDocuments}
            helperLine={packHistory[0]?.helperLine}
          />
        )}
      </DialogContent>
    </Dialog>
  </>
  );
};