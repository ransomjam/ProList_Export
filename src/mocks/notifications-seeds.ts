import { subMinutes, subHours, subDays } from "date-fns";
import type { NotificationItem, NotificationPreferences } from "./types";

const now = new Date();

const iso = (date: Date) => date.toISOString();

export const seedNotifications: NotificationItem[] = [
  {
    id: "notif_001",
    type: "documents",
    title: "Commercial Invoice generated",
    context: "Shipment PL-2025-EX-0004",
    occurredAt: iso(subMinutes(now, 3)),
    unread: true,
    metadata: {
      shipmentId: "s_5004",
      reference: "PL-2025-EX-0004",
      docName: "Commercial Invoice",
      docKey: "commercial_invoice",
    },
  },
  {
    id: "notif_002",
    type: "issues",
    title: "Issue resolved",
    context: "Incorrect HS on Invoice · PL-2025-EX-0004",
    occurredAt: iso(subMinutes(now, 12)),
    unread: true,
    metadata: {
      issueId: "issue_204",
      shipmentId: "s_5004",
      severity: "high",
    },
  },
  {
    id: "notif_003",
    type: "shipments",
    title: "Shipment submitted",
    context: "PL-2025-EX-0005 ready for customs review",
    occurredAt: iso(subMinutes(now, 34)),
    unread: false,
    metadata: {
      shipmentId: "s_5005",
      reference: "PL-2025-EX-0005",
    },
  },
  {
    id: "notif_004",
    type: "payments",
    title: "Payment recorded",
    context: "1,000,000 FCFA via bank transfer · PL-2025-EX-0001",
    occurredAt: iso(subHours(now, 3)),
    unread: true,
    metadata: {
      shipmentId: "s_5001",
      reference: "PL-2025-EX-0001",
      paymentAmount: "1,000,000 FCFA",
      paymentMethod: "bank_transfer",
    },
  },
  {
    id: "notif_005",
    type: "documents",
    title: "Packing List approved",
    context: "PL-2025-EX-0003 · Ready to export",
    occurredAt: iso(subHours(now, 6)),
    unread: false,
    metadata: {
      shipmentId: "s_5003",
      reference: "PL-2025-EX-0003",
      docName: "Packing List",
      docKey: "packing_list",
    },
  },
  {
    id: "notif_006",
    type: "system",
    title: "Daily summary",
    context: "3 docs generated, 1 issue opened, 2 shipments updated",
    occurredAt: iso(subHours(now, 9)),
    unread: false,
    isDigest: true,
    metadata: {
      digestBreakdown: [
        { type: "documents", label: "Documents", value: "3 generated" },
        { type: "issues", label: "Issues", value: "1 opened" },
        { type: "shipments", label: "Shipments", value: "2 updated" },
      ],
    },
  },
  {
    id: "notif_007",
    type: "issues",
    title: "Issue opened",
    context: "Missing certificate of origin · PL-2025-EX-0002",
    occurredAt: iso(subHours(now, 18)),
    unread: false,
    metadata: {
      issueId: "issue_187",
      shipmentId: "s_5002",
      severity: "medium",
    },
  },
  {
    id: "notif_008",
    type: "shipments",
    title: "Shipment cleared",
    context: "PL-2025-EX-0001 released at Douala",
    occurredAt: iso(subDays(now, 1)),
    unread: false,
    metadata: {
      shipmentId: "s_5001",
      reference: "PL-2025-EX-0001",
    },
  },
  {
    id: "notif_009",
    type: "system",
    title: "System maintenance scheduled",
    context: "Planned downtime on 18 Jan, 22:00-23:00 WAT",
    occurredAt: iso(subDays(now, 2)),
    unread: false,
  },
];

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: {
    documents: true,
    issues: true,
    shipments: true,
    payments: true,
    system: true,
  },
  highPriority: ["issues"],
  digest: "daily",
  quietHours: {
    enabled: false,
    start: "21:00",
    end: "07:00",
  },
};
