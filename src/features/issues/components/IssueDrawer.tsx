// Issue drawer for viewing and editing issues with comments

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Send, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { seedUsers } from '@/mocks/seeds';
import type { Issue, IssueStatus, IssueSeverity, IssueComment } from '@/mocks/types';
import { CommentsThread } from './CommentsThread';

interface IssueDrawerProps {
  issue: Issue;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

export const IssueDrawer = ({ issue, isOpen, onClose, onUpdate }: IssueDrawerProps) => {
  const [title, setTitle] = useState(issue.title);
  const [severity, setSeverity] = useState<IssueSeverity>(issue.severity);
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [assignee, setAssignee] = useState(issue.assignee_id ?? 'unassigned');
  const queryClient = useQueryClient();

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: (updates: Partial<Issue>) => mockApi.updateIssue(issue.id, updates),
    onSuccess: () => {
      onUpdate();
      toast.success('Issue updated successfully');
    },
    onError: () => {
      toast.error('Failed to update issue');
    },
  });

  const handleSave = () => {
    const updates: Partial<Issue> = {};
    const normalizedAssignee = assignee === 'unassigned' ? undefined : assignee;
    
    if (title !== issue.title) updates.title = title;
    if (severity !== issue.severity) updates.severity = severity;
    if (status !== issue.status) updates.status = status;
    if (normalizedAssignee !== issue.assignee_id) updates.assignee_id = normalizedAssignee;
    
    if (Object.keys(updates).length > 0) {
      updateIssueMutation.mutate(updates);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const assigneeUser = seedUsers.find(u => u.id === assignee);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Issue Details</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            View and edit issue details, update status, and manage comments.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={(value: IssueSeverity) => setSeverity(value)}>
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
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: IssueStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {seedUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Link */}
          {issue.doc_key && (
            <div className="space-y-2">
              <Label>Related Document</Label>
              <div className="flex items-center gap-2 p-2 border rounded">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{issue.doc_key}</Badge>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Created: {formatDate(issue.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Updated: {formatDate(issue.updated_at)}</span>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={updateIssueMutation.isPending}
            className="w-full"
          >
            Save Changes
          </Button>

          <Separator />

          {/* Comments Thread */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Comments</h3>
            <CommentsThread issueId={issue.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};