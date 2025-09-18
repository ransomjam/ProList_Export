// Global Issues console page

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Search, Filter, AlertTriangle, Clock, CheckCircle, X, Plus, Users, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { seedUsers } from '@/mocks/seeds';
import type { Issue, IssueStatus, IssueSeverity } from '@/mocks/types';
import { IssueDrawer } from './components/IssueDrawer';

const statusOptions: { value: IssueStatus; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }[] = [
  { value: 'open', label: 'Open', variant: 'default' },
  { value: 'in_progress', label: 'In Progress', variant: 'secondary' },
  { value: 'resolved', label: 'Resolved', variant: 'outline' },
  { value: 'closed', label: 'Closed', variant: 'outline' },
];

const severityOptions: { value: IssueSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

const getSeverityColor = (severity: IssueSeverity) => {
  const option = severityOptions.find(s => s.value === severity);
  return option?.color || 'text-muted-foreground';
};

const getStatusVariant = (status: IssueStatus) => {
  const option = statusOptions.find(s => s.value === status);
  return option?.variant || 'outline';
};

export const IssuesPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>(['open', 'in_progress']);
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues', { search, statusFilter, severityFilter, assigneeFilter }],
    queryFn: () => mockApi.listIssues({
      search: search || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      severity: severityFilter.length > 0 ? severityFilter : undefined,
      assignee_id: assigneeFilter === 'all' ? undefined : assigneeFilter,
    }),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  // Bulk actions mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ issueIds, updates }: { issueIds: string[]; updates: Partial<Issue> }) => {
      return Promise.all(issueIds.map(id => mockApi.updateIssue(id, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setSelectedIssues(new Set());
      toast.success('Issues updated successfully');
    },
    onError: () => {
      toast.error('Failed to update issues');
    },
  });

  const handleStatusFilterChange = (status: IssueStatus, checked: boolean) => {
    setStatusFilter(prev => 
      checked 
        ? [...prev, status]
        : prev.filter(s => s !== status)
    );
  };

  const handleSeverityFilterChange = (severity: IssueSeverity, checked: boolean) => {
    setSeverityFilter(prev => 
      checked 
        ? [...prev, severity]
        : prev.filter(s => s !== severity)
    );
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  };

  const handleSelectIssue = (issueId: string, selected: boolean) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(issueId);
      } else {
        newSet.delete(issueId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIssues(new Set(issues.map(i => i.id)));
    } else {
      setSelectedIssues(new Set());
    }
  };

  const handleBulkClose = () => {
    bulkUpdateMutation.mutate({
      issueIds: Array.from(selectedIssues),
      updates: { status: 'closed' },
    });
    setIsBulkDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getShipmentRef = (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    return shipment?.reference || 'Unknown';
  };

  const getAssigneeUser = (userId?: string) => {
    return seedUsers.find(u => u.id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">Track and resolve compliance blockers</p>
        </div>
        
        {selectedIssues.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIssues.size} selected
            </span>
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="mr-2 h-4 w-4" />
                  Close Selected
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close Issues</DialogTitle>
                </DialogHeader>
                <p>Are you sure you want to close {selectedIssues.size} selected issues?</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkClose}>Close Issues</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or shipment reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <Label className="text-sm font-medium">Status:</Label>
              {statusOptions.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={statusFilter.includes(status.value)}
                    onCheckedChange={(checked) => 
                      handleStatusFilterChange(status.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm">
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex flex-wrap gap-2">
              <Label className="text-sm font-medium">Severity:</Label>
              {severityOptions.map((severity) => (
                <div key={severity.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${severity.value}`}
                    checked={severityFilter.includes(severity.value)}
                    onCheckedChange={(checked) => 
                      handleSeverityFilterChange(severity.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={`severity-${severity.value}`} className="text-sm">
                    {severity.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Assignee Filter */}
            <div className="min-w-[200px]">
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {seedUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardContent className="p-0">
          {issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIssues.size === issues.length && issues.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Shipment Ref</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const assignee = getAssigneeUser(issue.assignee_id);
                  return (
                    <TableRow
                      key={issue.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        handleIssueClick(issue);
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIssues.has(issue.id)}
                          onCheckedChange={(checked) => 
                            handleSelectIssue(issue.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{issue.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {getShipmentRef(issue.shipment_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {issue.doc_key ? (
                          <Badge variant="secondary" className="text-xs">
                            {issue.doc_key}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                          {severityOptions.find(s => s.value === issue.severity)?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(issue.status)} className="capitalize">
                          {issue.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {assignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(issue.updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter.length > 0 || severityFilter.length > 0 || assigneeFilter
                  ? "Try adjusting your filters to see more issues."
                  : "No issues have been reported yet. Create issues from shipment documents to track compliance blockers."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedIssue(null);
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
          }}
        />
      )}
    </div>
  );
};