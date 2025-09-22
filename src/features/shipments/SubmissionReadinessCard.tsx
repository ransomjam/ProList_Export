import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react';

export type ReadinessStatus = 'ready' | 'attention' | 'blocked' | 'loading';

export interface ReadinessChecklistItem {
  id: string;
  title: string;
  status: ReadinessStatus;
  statusLabel: string;
  detail?: string | string[];
  actionLabel?: string;
  onAction?: () => void;
}

interface SubmissionReadinessCardProps {
  isReady: boolean;
  items: ReadinessChecklistItem[];
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  submittedAt?: string | null;
  submittedByName?: string;
  onReopen?: () => void;
  isReopening?: boolean;
  onDownloadPack?: () => void;
}

const statusConfig: Record<ReadinessStatus, {
  icon: typeof CheckCircle2;
  iconClass: string;
  bubbleClass: string;
  badgeClass: string;
}> = {
  ready: {
    icon: CheckCircle2,
    iconClass: 'text-green-600',
    bubbleClass: 'bg-green-100/70',
    badgeClass: 'border-green-200 bg-green-50 text-green-700',
  },
  attention: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    bubbleClass: 'bg-amber-100/60',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  blocked: {
    icon: XCircle,
    iconClass: 'text-red-600',
    bubbleClass: 'bg-red-100/70',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
  },
  loading: {
    icon: Loader2,
    iconClass: 'text-muted-foreground animate-spin',
    bubbleClass: 'bg-muted',
    badgeClass: 'border-muted bg-muted/60 text-muted-foreground',
  },
};

const formatSubmittedMeta = (submittedAt?: string | null, submittedByName?: string) => {
  if (!submittedAt) {
    return submittedByName ? `Submitted by ${submittedByName}.` : 'Submitted.';
  }

  const submittedDate = new Date(submittedAt);
  const formatted = submittedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (submittedByName) {
    return `Submitted on ${formatted} by ${submittedByName}.`;
  }

  return `Submitted on ${formatted}.`;
};

const renderDetail = (detail?: string | string[]): ReactNode => {
  if (!detail) return null;
  if (Array.isArray(detail)) {
    return (
      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
        {detail.map((entry, index) => (
          <li key={`${entry}-${index}`} className="list-disc list-inside">
            {entry}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="mt-1 text-sm text-muted-foreground">{detail}</p>;
};

export const SubmissionReadinessCard = ({
  isReady,
  items,
  onSubmit,
  isSubmitting,
  isSubmitted,
  submittedAt,
  submittedByName,
  onReopen,
  isReopening,
  onDownloadPack,
}: SubmissionReadinessCardProps) => {
  const hasBlocked = items.some(item => item.status === 'blocked');
  const hasAttention = items.some(item => item.status === 'attention');
  const overallColor = isSubmitted || isReady
    ? 'text-green-700'
    : hasBlocked
      ? 'text-red-600'
      : hasAttention
        ? 'text-amber-600'
        : 'text-muted-foreground';

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">Submission readiness</CardTitle>
            {onReopen && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-primary"
                onClick={onReopen}
                disabled={isReopening}
              >
                Reopen for edits
              </Button>
            )}
          </div>
          <p className={cn('text-sm font-medium', overallColor)}>
            All checks passed. Shipment is locked for processing.
          </p>
          <p className="text-sm text-green-700/80">
            {formatSubmittedMeta(submittedAt, submittedByName)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {items.map(item => {
              const config = statusConfig[item.status] ?? statusConfig.ready;
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-green-200/80 bg-white/80 p-4 shadow-sm"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      config.bubbleClass
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.iconClass)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-green-900">{item.title}</p>
                    {renderDetail(item.detail)}
                  </div>
                </div>
              );
            })}
          </div>
          {onDownloadPack && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="group h-auto w-fit gap-2 px-0 text-primary"
              onClick={onDownloadPack}
            >
              <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Download submission pack
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Submission readiness</CardTitle>
        <p className={cn('text-sm font-medium', overallColor)}>
          {isReady
            ? "All checks passed. You're ready to submit."
            : 'Action needed before submission.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map(item => {
            const config = statusConfig[item.status] ?? statusConfig.ready;
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-10 w-10 items-center justify-center rounded-full',
                      config.bubbleClass
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.iconClass)} />
                  </div>
                  <div>
                    <p className="font-medium text-base text-foreground">{item.title}</p>
                    {renderDetail(item.detail)}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Badge className={cn('px-3 py-1 text-xs font-semibold uppercase tracking-wide', config.badgeClass)}>
                    {item.statusLabel}
                  </Badge>
                  {item.actionLabel && item.onAction && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-primary"
                      onClick={item.onAction}
                    >
                      {item.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isReady
              ? 'We\'ll lock the shipment once you submit.'
              : 'Finish these steps to enable submission.'}
          </p>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!isReady || isSubmitting}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            Submit shipment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

