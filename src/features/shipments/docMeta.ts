import { type LucideIcon, BadgeCheck, FileBadge2, FileCheck2, FileText, Leaf, PackageCheck, ShieldCheck, Ship } from "lucide-react";

import type { DocKey } from "@/utils/rules";

export interface DocumentMeta {
  label: string;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
}

export const DOC_METADATA: Record<DocKey, DocumentMeta> = {
  INVOICE: {
    label: "Commercial Invoice",
    icon: FileText,
    accent: "text-blue-600",
    accentBg: "bg-blue-100",
  },
  PACKING_LIST: {
    label: "Packing List",
    icon: PackageCheck,
    accent: "text-amber-600",
    accentBg: "bg-amber-100",
  },
  COO: {
    label: "Certificate of Origin",
    icon: BadgeCheck,
    accent: "text-emerald-600",
    accentBg: "bg-emerald-100",
  },
  PHYTO: {
    label: "Phytosanitary Certificate",
    icon: Leaf,
    accent: "text-green-600",
    accentBg: "bg-green-100",
  },
  INSURANCE: {
    label: "Insurance Certificate",
    icon: ShieldCheck,
    accent: "text-sky-600",
    accentBg: "bg-sky-100",
  },
  BILL_OF_LADING: {
    label: "Bill of Lading",
    icon: Ship,
    accent: "text-indigo-600",
    accentBg: "bg-indigo-100",
  },
  CUSTOMS_EXPORT_DECLARATION: {
    label: "Customs Export Declaration",
    icon: FileBadge2,
    accent: "text-purple-600",
    accentBg: "bg-purple-100",
  },
};

export const getDocumentLabel = (key: DocKey): string => DOC_METADATA[key]?.label ?? key;

export const getDocumentIcon = (key: DocKey): LucideIcon => DOC_METADATA[key]?.icon ?? FileText;
