// Extended types for ProList Issues and Timeline functionality

import type { DocKey } from '@/utils/rules';
import type { User } from './seeds';

// Re-export existing types from seeds for convenience
export type { User, Shipment, Product, Partner, ShipmentWithItems, ShipmentItem, ShipmentDocument, DocVersion, DocStatus, Company, HsCode, SavedHsRate } from './seeds';

// New Issue types
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  id: string;
  shipment_id: string;
  title: string;
  doc_key?: DocKey; // optional link to a document
  severity: IssueSeverity;
  status: IssueStatus;
  assignee_id?: string; // user id
  created_at: string;
  updated_at: string;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

// Cost types
export type CostType = 'freight' | 'insurance' | 'fees' | 'other';

export interface CostLine {
  id: string;
  shipment_id: string;
  type: CostType;
  label: string;                 // e.g., "Port handling", "Export fee"
  amount_fcfa: number;
  taxable: boolean;              // include in taxable base?
  tax_rate_pct: number;          // 0–19.25 typical; use 0 for demo unless set
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'card';

export interface Payment {
  id: string;
  shipment_id: string;
  method: PaymentMethod;
  amount_fcfa: number;
  reference?: string;            // transaction ref
  paid_at: string;               // ISO
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CostSummary {
  subtotal_fcfa: number;
  tax_fcfa: number;
  total_fcfa: number;
  paid_fcfa: number;
  balance_fcfa: number;
}

// Timeline Events
export interface Event {
  id: string;
  shipment_id: string;
  type:
    | 'shipment_created'
    | 'shipment_updated'
    | 'shipment_submitted'
    | 'shipment_deleted'
    | 'doc_generated'
    | 'doc_approved'
    | 'issue_opened'
    | 'issue_status_changed'
    | 'issue_commented'
    | 'costline_created'
    | 'costline_updated'
    | 'costline_deleted'
    | 'payment_created'
    | 'payment_deleted'
    | 'pdf_generated';
  at: string;
  by?: string; // user id
  payload?: Record<string, unknown>;
}

export interface OrgSettings {
  name: string;
  email?: string;
  phone?: string;
  tax_id?: string;
  country?: string;
  city?: string;
  address?: string;
  logoDataUrl?: string;
}

export interface BrandSettings {
  primary: string;
  accentBlue: string;
  accentTeal: string;
  accentGreen: string;
  accentMint: string;
}

export type TemplateKey = DocKey;

export interface TemplateMeta {
  id: string;
  key: TemplateKey;
  fileName: string;
  sizeBytes: number;
  uploaded_at: string;
  uploaded_by: string;
  dataUrl: string;
  active: boolean;
}

export type AppRole = User['role'];

export interface AppUserSummary {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  created_at: string;
}

export type NotificationType = "documents" | "issues" | "shipments" | "payments" | "system";

export type NotificationDigestFrequency = "daily" | "weekly" | "off";

export interface NotificationDigestEntry {
  type: NotificationType;
  label: string;
  value: string;
}

export interface NotificationMetadata {
  shipmentId?: string;
  reference?: string;
  docKey?: DocKey;
  docName?: string;
  issueId?: string;
  severity?: IssueSeverity;
  paymentAmount?: string;
  paymentMethod?: PaymentMethod;
  digestBreakdown?: NotificationDigestEntry[];
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  context: string;
  occurredAt: string;
  unread: boolean;
  isDigest?: boolean;
  metadata?: NotificationMetadata;
}

export interface NotificationPreferences {
  enabled: Record<NotificationType, boolean>;
  highPriority: NotificationType[];
  digest: NotificationDigestFrequency;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}