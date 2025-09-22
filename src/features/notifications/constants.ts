import type { NotificationType } from "@/mocks/types";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CreditCard,
  FileText,
  Info,
  Package,
} from "lucide-react";

export type NotificationFilterKey = "all" | NotificationType;

export interface NotificationTypeMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  cardTintClass: string;
  dotClass: string;
}

export const NOTIFICATION_FILTERS: Array<{ key: NotificationFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "documents", label: "Documents" },
  { key: "issues", label: "Issues" },
  { key: "shipments", label: "Shipments" },
  { key: "payments", label: "Payments" },
  { key: "system", label: "System" },
];

export const NOTIFICATION_TYPE_META: Record<NotificationType, NotificationTypeMeta> = {
  documents: {
    label: "Documents",
    icon: FileText,
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300",
    iconClass: "text-teal-600 dark:text-teal-300",
    cardTintClass: "data-[unread=true]:bg-teal-50/80 data-[unread=true]:dark:bg-teal-950/20 border-teal-100/80 dark:border-teal-900/40",
    dotClass: "bg-teal-500",
  },
  issues: {
    label: "Issues",
    icon: AlertTriangle,
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200",
    iconClass: "text-amber-600 dark:text-amber-300",
    cardTintClass: "data-[unread=true]:bg-amber-50/70 data-[unread=true]:dark:bg-amber-950/25 border-amber-100/80 dark:border-amber-900/40",
    dotClass: "bg-red-500",
  },
  shipments: {
    label: "Shipments",
    icon: Package,
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-300",
    cardTintClass: "data-[unread=true]:bg-blue-50/70 data-[unread=true]:dark:bg-blue-950/25 border-blue-100/80 dark:border-blue-900/40",
    dotClass: "bg-blue-500",
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200",
    iconClass: "text-emerald-600 dark:text-emerald-300",
    cardTintClass: "data-[unread=true]:bg-emerald-50/70 data-[unread=true]:dark:bg-emerald-950/25 border-emerald-100/80 dark:border-emerald-900/40",
    dotClass: "bg-emerald-500",
  },
  system: {
    label: "System",
    icon: Info,
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200",
    iconClass: "text-slate-500 dark:text-slate-300",
    cardTintClass: "data-[unread=true]:bg-slate-100/70 data-[unread=true]:dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60",
    dotClass: "bg-slate-400",
  },
};

export const READ_FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const;

export const TIME_FILTERS = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

export const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const VIEW_MODES = [
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
] as const;

export const BELL_ICON = Bell;
