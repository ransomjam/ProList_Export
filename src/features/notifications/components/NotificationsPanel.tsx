import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/mocks/types";
import {
  NOTIFICATION_FILTERS,
  type NotificationFilterKey,
} from "../constants";
import { NotificationCard } from "./NotificationCard";
import { useNotifications } from "../hooks/useNotifications";
import { formatRelativeTime, resolveNotificationDestination, sortNotifications } from "../utils";
import { CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications, isLoading, markRead, markAllRead, unreadCount, preferences, isMarkingAll } =
    useNotifications();
  const [activeFilter, setActiveFilter] = useState<NotificationFilterKey>("all");

  const highPriorityTypes = useMemo(
    () => preferences?.highPriority ?? [],
    [preferences?.highPriority],
  );

  const sortedNotifications = useMemo(
    () => sortNotifications(notifications, highPriorityTypes),
    [notifications, highPriorityTypes],
  );

  const filtered = useMemo(() => {
    if (activeFilter === "all") return sortedNotifications;
    return sortedNotifications.filter(notification => notification.type === activeFilter);
  }, [sortedNotifications, activeFilter]);

  const lastUpdatedLabel = sortedNotifications.length
    ? formatRelativeTime(sortedNotifications[0].occurredAt)
    : 'moments ago';

  const handleItemClick = async (notification: NotificationItem) => {
    if (notification.unread) {
      await markRead({ id: notification.id, read: true });
    }

    const destination = resolveNotificationDestination(notification);
    if (destination) {
      navigate(destination);
    } else {
      toast({
        title: "We're saving your place",
        description: "This notification will open the right workspace soon.",
      });
    }
    onClose();
  };

  const handleViewAll = () => {
    navigate("/notifications");
    onClose();
  };

  const handleOpenSettings = () => {
    navigate("/settings?tab=notifications");
    onClose();
  };

  const handleMarkAll = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    await markAllRead();
  };

  return (
    <SheetContent side="right" className="w-full max-w-full border-l p-0 sm:max-w-lg">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Stay on top of documents, shipments, and issues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || isMarkingAll}
            >
              {isMarkingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenSettings}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </header>

        <div className="border-b px-4 py-3">
          <ScrollArea className="max-w-full">
            <div className="flex w-max gap-2 pr-4">
              {NOTIFICATION_FILTERS.map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    activeFilter === filter.key
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 px-4 py-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-xl border bg-muted/30 p-4"
                >
                  <Skeleton className="mb-3 h-4 w-3/4" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-10 text-center">
                <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">All caught up.</p>
                <p className="text-sm text-muted-foreground">
                  You’ll see updates here as work progresses.
                </p>
              </div>
            ) : (
              filtered.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  highPriority={notification.unread && highPriorityTypes.includes(notification.type)}
                  onClick={() => handleItemClick(notification)}
                  padding="compact"
                />
              ))
            )}
          </div>
        </ScrollArea>

        <footer className="border-t px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {unreadCount} unread · Last update {lastUpdatedLabel}
            </span>
            <Button variant="ghost" size="sm" className="text-primary" onClick={handleViewAll}>
              View all notifications
            </Button>
          </div>
        </footer>
      </div>
    </SheetContent>
  );
};
