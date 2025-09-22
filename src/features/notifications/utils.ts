import { differenceInHours, differenceInMinutes, differenceInDays, isToday } from "date-fns";
import type {
  IssueSeverity,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
} from "@/mocks/types";
import type { NotificationFilterKey } from "./constants";

export type ReadFilterValue = "all" | "read" | "unread";
export type TimeFilterValue = "any" | "today" | "7d" | "30d";
export type SeverityFilterValue = "all" | IssueSeverity;

export const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  const minutes = differenceInMinutes(new Date(), date);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = differenceInHours(new Date(), date);
  if (hours < 24) {
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }

  if (isToday(date)) {
    return "Today";
  }

  const days = differenceInDays(new Date(), date);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

export const sortNotifications = (
  notifications: NotificationItem[],
  highPriorityTypes: NotificationType[] = [],
): NotificationItem[] => {
  return [...notifications].sort((a, b) => {
    const aPinned = a.unread && highPriorityTypes.includes(a.type);
    const bPinned = b.unread && highPriorityTypes.includes(b.type);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });
};

const matchesSearch = (notification: NotificationItem, term: string) => {
  if (!term) return true;
  const haystack = `${notification.title} ${notification.context}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
};

const matchesType = (notification: NotificationItem, filter: NotificationFilterKey) => {
  if (filter === "all") return true;
  return notification.type === filter;
};

const matchesRead = (notification: NotificationItem, read: ReadFilterValue) => {
  if (read === "all") return true;
  if (read === "read") return !notification.unread;
  return notification.unread;
};

const matchesTime = (notification: NotificationItem, time: TimeFilterValue) => {
  if (time === "any") return true;

  const date = new Date(notification.occurredAt);

  if (time === "today") {
    return isToday(date);
  }

  if (time === "7d") {
    const diff = differenceInDays(new Date(), date);
    return diff <= 7;
  }

  if (time === "30d") {
    const diff = differenceInDays(new Date(), date);
    return diff <= 30;
  }

  return true;
};

const matchesSeverity = (notification: NotificationItem, severity: SeverityFilterValue) => {
  if (severity === "all") return true;
  return notification.metadata?.severity === severity;
};

export interface NotificationFilterState {
  search: string;
  filter: NotificationFilterKey;
  read: ReadFilterValue;
  time: TimeFilterValue;
  severity: SeverityFilterValue;
}

export const filterNotifications = (
  notifications: NotificationItem[],
  filters: NotificationFilterState,
): NotificationItem[] => {
  return notifications.filter(notification =>
    matchesType(notification, filters.filter) &&
    matchesRead(notification, filters.read) &&
    matchesTime(notification, filters.time) &&
    matchesSeverity(notification, filters.severity) &&
    matchesSearch(notification, filters.search),
  );
};

export const buildQuietHoursLabel = (preferences?: NotificationPreferences) => {
  if (!preferences) return "";
  if (!preferences.quietHours.enabled) {
    return "Quiet hours off";
  }
  return `Quiet hours ${preferences.quietHours.start}–${preferences.quietHours.end}`;
};

export const getSeverityBadgeVariant = (severity?: IssueSeverity) => {
  switch (severity) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
    default:
      return "outline";
  }
};

export const resolveNotificationDestination = (
  notification: NotificationItem,
): string | undefined => {
  const shipmentId = notification.metadata?.shipmentId;

  switch (notification.type) {
    case "documents":
    case "payments":
    case "shipments":
      return shipmentId ? `/shipments/${shipmentId}` : "/shipments";
    case "issues":
      return shipmentId ? `/shipments/${shipmentId}` : "/issues";
    case "system":
    default:
      return "/notifications";
  }
};
