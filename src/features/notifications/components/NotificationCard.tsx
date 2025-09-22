import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/mocks/types";
import { NOTIFICATION_TYPE_META } from "../constants";
import { formatRelativeTime, getSeverityBadgeVariant } from "../utils";

interface NotificationCardProps {
  notification: NotificationItem;
  highPriority?: boolean;
  onClick?: () => void;
  actionSlot?: React.ReactNode;
  selectionControl?: React.ReactNode;
  padding?: "compact" | "comfortable";
}

const renderDigestEntry = (
  notificationId: string,
  type: NotificationType,
  label: string,
  value: string,
) => {
  const meta = NOTIFICATION_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <span
      key={`${notificationId}-${type}-${value}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
        meta.badgeClass,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}:</span> {value}
    </span>
  );
};

export const NotificationCard = ({
  notification,
  highPriority = false,
  onClick,
  actionSlot,
  selectionControl,
  padding = "compact",
}: NotificationCardProps) => {
  const meta = NOTIFICATION_TYPE_META[notification.type];
  const Icon = meta.icon;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-unread={notification.unread}
      className={cn(
        "group relative flex gap-3 rounded-xl border bg-card/80 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/80",
        meta.cardTintClass,
        onClick && "cursor-pointer",
        padding === "compact" ? "p-3" : "p-4",
      )}
    >
      {selectionControl ? (
        <div className="pt-1" onClick={event => event.stopPropagation()}>
          {selectionControl}
        </div>
      ) : null}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/70">
        <Icon className={cn("h-5 w-5", meta.iconClass)} aria-hidden />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {notification.title}
              </p>
              {notification.unread ? (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-muted/80 text-[10px] font-semibold uppercase tracking-wide"
                >
                  New
                </Badge>
              ) : null}
              {highPriority && notification.unread ? (
                <Badge
                  variant="destructive"
                  className="uppercase tracking-wide text-[10px]"
                >
                  High priority
                </Badge>
              ) : null}
              {notification.metadata?.severity ? (
                <Badge
                  variant={getSeverityBadgeVariant(notification.metadata.severity)}
                  className="capitalize text-[10px]"
                >
                  {notification.metadata.severity}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {notification.context}
            </p>
            {notification.metadata?.paymentAmount ? (
              <p className="text-xs text-muted-foreground">
                Recorded amount:{" "}
                <span className="font-medium text-foreground">
                  {notification.metadata.paymentAmount}
                </span>
              </p>
            ) : null}
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatRelativeTime(notification.occurredAt)}
          </span>
        </div>

        {notification.metadata?.digestBreakdown?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {notification.metadata.digestBreakdown.map(entry =>
              renderDigestEntry(notification.id, entry.type, entry.label, entry.value),
            )}
          </div>
        ) : null}
      </div>

      {notification.unread ? (
        <span
          className={cn(
            "absolute right-3 top-3 h-2.5 w-2.5 rounded-full",
            highPriority ? "bg-destructive" : meta.dotClass,
          )}
          aria-hidden
        />
      ) : null}

      {actionSlot ? (
        <div
          className="shrink-0 self-start"
          onClick={event => event.stopPropagation()}
        >
          {actionSlot}
        </div>
      ) : null}
    </div>
  );
};

export const NotificationCardAction = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    size="sm"
    className="rounded-full"
    onClick={event => {
      event.stopPropagation();
      onClick?.();
    }}
  >
    {children}
  </Button>
);
