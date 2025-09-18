// Timeline tab for shipment detail page showing events history

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package,
  Send, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  MessageCircle,
  Edit,
  Clock,
  Filter,
  Users,
  Trash2
} from 'lucide-react';
import { mockApi } from '@/mocks/api';
import { seedUsers } from '@/mocks/seeds';
import type { Event, ShipmentWithItems } from '@/mocks/types';

interface TimelineTabProps {
  shipment: ShipmentWithItems;
}

const eventTypeConfig = {
  shipment_created: {
    icon: Package,
    label: 'Shipment Created',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  shipment_updated: {
    icon: Edit,
    label: 'Shipment Updated',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  shipment_submitted: {
    icon: Send,
    label: 'Shipment Submitted',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  shipment_deleted: {
    icon: Trash2,
    label: 'Shipment Deleted',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  doc_generated: {
    icon: FileText,
    label: 'Document Generated',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  doc_approved: {
    icon: CheckCircle,
    label: 'Document Approved',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  issue_opened: {
    icon: AlertTriangle,
    label: 'Issue Opened',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  issue_status_changed: {
    icon: AlertTriangle,
    label: 'Issue Status Changed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  issue_commented: {
    icon: MessageCircle,
    label: 'Issue Commented',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
} as const;

const filterOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'documents', label: 'Documents' },
  { value: 'issues', label: 'Issues' },
  { value: 'workflow', label: 'Workflow' },
] as const;

export const TimelineTab = ({ shipment }: TimelineTabProps) => {
  const [filter, setFilter] = useState<'all' | 'documents' | 'issues' | 'workflow'>('all');

  // Fetch events for this shipment
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', shipment.id],
    queryFn: () => mockApi.listEvents(shipment.id),
  });

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'documents') return event.type.includes('doc_');
    if (filter === 'issues') return event.type.includes('issue_');
    if (filter === 'workflow') return ['shipment_created', 'shipment_submitted', 'shipment_updated'].includes(event.type);
    return true;
  });

  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, Event[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (date.toDateString() === today) return 'Today';
    if (date.toDateString() === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventDescription = (event: Event) => {
    const actor = seedUsers.find(u => u.id === event.by)?.name || 'System';
    
    switch (event.type) {
      case 'shipment_created':
        return `${actor} created shipment ${event.payload?.reference}`;
      case 'shipment_updated':
        return `${actor} updated shipment details`;
      case 'shipment_submitted':
        return `${actor} submitted shipment for processing`;
      case 'doc_generated':
        return `${actor} generated ${event.payload?.doc_key} (v${event.payload?.version})`;
      case 'doc_approved':
        return `${actor} approved ${event.payload?.doc_key} (v${event.payload?.version})`;
      case 'issue_opened':
        return `${actor} opened issue: "${event.payload?.title}"`;
      case 'issue_status_changed':
        return `${actor} changed issue status from ${event.payload?.from_status} to ${event.payload?.to_status}`;
      case 'issue_commented':
        return `${actor} commented on an issue`;
      default:
        return `${actor} performed an action`;
    }
  };

  const getUser = (userId?: string) => {
    return seedUsers.find(u => u.id === userId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Timeline</h2>
          <p className="text-muted-foreground">
            Complete history of events for shipment {shipment.reference}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dayEvents]) => (
            <div key={date} className="space-y-4">
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <Badge variant="outline" className="bg-background">
                  <Clock className="mr-2 h-3 w-3" />
                  {formatDate(date)}
                </Badge>
              </div>

              {/* Events for this day */}
              <div className="space-y-3 ml-4">
                {dayEvents
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map((event, index) => {
                    const config = eventTypeConfig[event.type];
                    const Icon = config.icon;
                    const actor = getUser(event.by);
                    
                    return (
                      <Card key={event.id} className="relative">
                        {index < dayEvents.length - 1 && (
                          <div className="absolute left-5 top-12 w-0.5 h-full bg-border -z-10" />
                        )}
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className={`rounded-full p-2 ${config.bgColor}`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium">
                                  {getEventDescription(event)}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(event.at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {config.label}
                                </Badge>
                                {actor && (
                                  <span className="text-xs text-muted-foreground">
                                    by {actor.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? "No events have been recorded for this shipment yet."
                : `No ${filter} events have been recorded for this shipment yet.`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};