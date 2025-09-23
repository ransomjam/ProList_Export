import type { DocKey } from "@/utils/rules";

export interface SubmissionPackDocumentSummary {
  key: DocKey;
  label: string;
  versionLabel?: string;
  statusLabel?: string;
  note?: string;
}

export interface SubmissionPackSummary {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  contents: SubmissionPackDocumentSummary[];
  shareUrl: string;
  helperLine?: string;
  isPrimary?: boolean;
}
