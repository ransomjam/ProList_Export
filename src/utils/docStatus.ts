import type { DocStatus } from "@/mocks/seeds";

export type NormalizedDocStatus =
  | "required"
  | "draft"
  | "ready"
  | "submitted"
  | "under_review"
  | "signed"
  | "active"
  | "expired"
  | "rejected";

export const normalizeDocStatus = (status: DocStatus): NormalizedDocStatus => {
  switch (status) {
    case "generated":
      return "ready";
    case "approved":
      return "signed";
    case "signed":
    case "active":
    case "required":
    case "draft":
    case "ready":
    case "submitted":
    case "under_review":
    case "expired":
    case "rejected":
      return status;
    default:
      return "required";
  }
};

const STATUS_META: Record<NormalizedDocStatus, { label: string; className: string; tone: "positive" | "caution" | "neutral" | "negative" }>
  = {
    required: {
      label: "Required",
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300",
      tone: "negative",
    },
    draft: {
      label: "Draft",
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200",
      tone: "caution",
    },
    ready: {
      label: "Ready",
      className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200",
      tone: "positive",
    },
    submitted: {
      label: "Submitted",
      className: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-500/10 dark:text-indigo-200",
      tone: "neutral",
    },
    under_review: {
      label: "Under review",
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200",
      tone: "caution",
    },
    signed: {
      label: "Signed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200",
      tone: "positive",
    },
    active: {
      label: "Active",
      className: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-500/10 dark:text-green-200",
      tone: "positive",
    },
    expired: {
      label: "Expired",
      className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-200",
      tone: "negative",
    },
    rejected: {
      label: "Rejected",
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-200",
      tone: "negative",
    },
  };

export const docStatusLabel = (status: DocStatus | NormalizedDocStatus): string => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return STATUS_META[normalized]?.label ?? "Required";
};

export const docStatusClasses = (status: DocStatus | NormalizedDocStatus): string => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return STATUS_META[normalized]?.className ?? STATUS_META.required.className;
};

export const docStatusTone = (
  status: DocStatus | NormalizedDocStatus,
): "positive" | "caution" | "neutral" | "negative" => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return STATUS_META[normalized]?.tone ?? "neutral";
};

export const isAttentionStatus = (status: DocStatus | NormalizedDocStatus): boolean => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return ["draft", "submitted", "under_review"].includes(normalized);
};

export const isBlockedStatus = (status: DocStatus | NormalizedDocStatus): boolean => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return ["required", "rejected", "expired"].includes(normalized);
};

export const isReadyStatus = (status: DocStatus | NormalizedDocStatus): boolean => {
  const normalized = normalizeDocStatus(status as DocStatus);
  return ["ready", "signed", "active"].includes(normalized);
};

export const docStatusSortOrder = (status: DocStatus | NormalizedDocStatus): number => {
  const normalized = normalizeDocStatus(status as DocStatus);
  const order: NormalizedDocStatus[] = [
    "required",
    "draft",
    "ready",
    "submitted",
    "under_review",
    "signed",
    "active",
    "expired",
    "rejected",
  ];
  return order.indexOf(normalized);
};
