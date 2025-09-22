// Issues tab for shipment detail page

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { seedUsers } from '@/mocks/seeds';
import type { Issue, IssueStatus, IssueSeverity, ShipmentWithItems, ShipmentDocument } from '@/mocks/types';
import type { DocKey } from '@/utils/rules';
import { IssueDrawer } from './IssueDrawer';

interface IssuesTabProps {
  shipment: ShipmentWithItems;
  documents?: ShipmentDocument[];
}

const statusOptions = [
  { value: 'open', label: 'Open', variant: 'default' as const },
  { value: 'in_progress', label: 'In Progress', variant: 'secondary' as const },
  { value: 'resolved', label: 'Resolved', variant: 'outline' as const },
  { value: 'closed', label: 'Closed', variant: 'outline' as const },
];

const severityOptions = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
] as const;

export const IssuesTab = ({ shipment, documents = [] }: IssuesTabProps) => {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueSeverity, setNewIssueSeverity] = useState<IssueSeverity>('medium');
  const [newIssueDocKey, setNewIssueDocKey] = useState<'none' | DocKey>('none');
  const [newIssueAssignee, setNewIssueAssignee] = useState('unassigned');
  const queryClient = useQueryClient();

  // Fetch issues for this shipment
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues', { shipment_id: shipment.id }],
    queryFn: () => mockApi.listIssues({ shipment_id: shipment.id }),
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: (issueData: Partial<Issue> & { title: string; shipment_id: string }) =>
      mockApi.createIssue(issueData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setIsNewIssueOpen(false);
      setNewIssueTitle('');
      setNewIssueSeverity('medium');
      setNewIssueDocKey('none');
      setNewIssueAssignee('unassigned');
      toast.success('Issue created successfully');
    },
    onError: () => {
      toast.error('Failed to create issue');
    },
  });

  // Update issue mutation (for quick status toggle)
  const updateIssueMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Issue> }) =>
      mockApi.updateIssue(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue updated');
    },
    onError: () => {
      toast.error('Failed to update issue');
    },
  });

  const handleCreateIssue = () => {
    if (!newIssueTitle.trim()) return;

    createIssueMutation.mutate({
      title: newIssueTitle,
      shipment_id: shipment.id,
      severity: newIssueSeverity,
      doc_key: newIssueDocKey === 'none' ? undefined : newIssueDocKey,
      assignee_id: newIssueAssignee === 'unassigned' ? undefined : newIssueAssignee || undefined,
    });
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDrawerOpen(true);
  };

  const handleStatusToggle = (issue: Issue) => {
    const newStatus: IssueStatus = 
      issue.status === 'open' ? 'in_progress' :
      issue.status === 'in_progress' ? 'resolved' :
      issue.status === 'resolved' ? 'closed' :
      'open';

    updateIssueMutation.mutate({
      id: issue.id,
      updates: { status: newStatus },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getSeverityColor = (severity: IssueSeverity) => {
    const option = severityOptions.find(s => s.value === severity);
    return option?.color || 'text-muted-foreground';
  };

  const getStatusVariant = (status: IssueStatus) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.variant || 'outline';
  };

  const getAssigneeUser = (userId?: string) => {
    return seedUsers.find(u => u.id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Issues</h2>
          <p className="text-muted-foreground">
            Track and resolve compliance issues for this shipment
          </p>
        </div>
        
        <Dialog open={isNewIssueOpen} onOpenChange={setIsNewIssueOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Issue</DialogTitle>
              <DialogDescription>
                Report a compliance issue for shipment {shipment.reference}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={newIssueSeverity} onValueChange={(v: IssueSeverity) => setNewIssueSeverity(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={newIssueAssignee} onValueChange={setNewIssueAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {seedUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="document">Related Document (Optional)</Label>
                  <Select
                    value={newIssueDocKey}
                    onValueChange={(value) => setNewIssueDocKey(value as 'none' | DocKey)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No document</SelectItem>
                      {documents.map(doc => (
                        <SelectItem key={doc.id} value={doc.doc_key}>
                          {doc.doc_key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewIssueOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateIssue}
                disabled={!newIssueTitle.trim() || createIssueMutation.isPending}
              >
                Create Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Issues List */}
      <Card>
        <CardContent className="p-0">
          {issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
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
                        if ((e.target as HTMLElement).closest('button')) return;
                        handleIssueClick(issue);
                      }}
                    >
                      <TableCell className="font-medium">{issue.title}</TableCell>
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusToggle(issue);
                          }}
                          disabled={updateIssueMutation.isPending}
                        >
                          {issue.status === 'open' && <Clock className="h-4 w-4" />}
                          {issue.status === 'in_progress' && <CheckCircle className="h-4 w-4" />}
                          {(issue.status === 'resolved' || issue.status === 'closed') && <X className="h-4 w-4" />}
                        </Button>
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
              <h3 className="text-lg font-medium mb-2">No Issues Reported</h3>
              <p className="text-muted-foreground mb-4">
                No compliance issues have been reported for this shipment yet.
              </p>
              <Button variant="outline" onClick={() => setIsNewIssueOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Report an Issue
              </Button>
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