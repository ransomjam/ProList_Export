import { create } from "zustand";
import { mockApi } from "@/mocks/api";
import type { DocKey } from "@/utils/rules";
import {
  normalizeDocStatus,
  type NormalizedDocStatus,
} from "@/utils/docStatus";

const generateId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

export type ComplianceDocType = "PHYTO" | "COO" | "INSURANCE";

export interface ComplianceAttachment {
  id: string;
  name: string;
  type: "lab" | "invoice" | "certificate" | "evidence" | "supporting";
  uploadedAt: string;
  note?: string;
  sizeLabel?: string;
}

export interface ComplianceEvidence extends ComplianceAttachment {
  source: "upload" | "portal" | "email";
  link?: string;
}

export interface ComplianceTimelineEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  description?: string;
}

export interface ComplianceSubmissionStep {
  id: "submitted" | "received" | "under_review" | "decision";
  label: string;
  status: "pending" | "completed" | "rejected";
  timestamp?: string;
  note?: string;
}

export interface ComplianceSubmissionInfo {
  trackingId: string;
  status: "submitted" | "under_review" | "signed" | "rejected";
  submittedAt: string;
  ackAt?: string;
  decisionAt?: string;
  steps: ComplianceSubmissionStep[];
  ackUrl?: string;
  packetUrl?: string;
  rejectionReason?: string;
}

export interface ComplianceDocumentVersion {
  id: string;
  version: number;
  label: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  status: "draft" | "ready" | "submitted" | "signed";
  fileName?: string;
  fileUrl?: string;
  official?: boolean;
}

export interface PhytoProductLine {
  id: string;
  botanicalName: string;
  commonName: string;
  hsCode?: string;
  quantityValue: string;
  quantityUnit: string;
  packaging: string;
}

export interface PhytoFormValues {
  exporterName: string;
  exporterAddress: string;
  exporterCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  contactEmail: string;
  contactPhone: string;
  originCountry: string;
  destinationCountry: string;
  mode: "SEA" | "AIR" | "ROAD";
  portOfLoading: string;
  portOfDischarge: string;
  departureDate?: string;
  products: PhytoProductLine[];
  treatment: {
    applied: boolean;
    type?: string;
    date?: string;
    chemical?: string;
    duration?: string;
    temperature?: string;
    notes?: string;
  };
  placeOfInspection: string;
  inspectionDate?: string;
  inspectorName?: string;
  additionalDeclarations?: string;
}

export interface CooFormValues {
  exporterName: string;
  exporterAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  transportMode: string;
  vesselOrFlight?: string;
  departureDate?: string;
  originCriteria: string;
  invoiceNumber: string;
  invoiceDate: string;
  grossWeight: string;
  netWeight: string;
  packages: string;
  remarks?: string;
  declarationName: string;
  declarationTitle: string;
  declarationDate: string;
}

export interface InsuranceFormValues {
  policyNumber?: string;
  provider: string;
  coverage: string;
  contact: string;
}

interface BaseComplianceDocument {
  id: string;
  docKey: DocKey;
  shipmentId: string;
  shipmentRef: string;
  title: string;
  status: NormalizedDocStatus;
  dueDate?: string;
  expiryDate?: string | null;
  owner: string;
  ownerRole: string;
  lastUpdated: string;
  portalBehavior: "auto-sign" | "auto-reject" | "manual";
  attachments: ComplianceAttachment[];
  evidence: ComplianceEvidence[];
  timeline: ComplianceTimelineEntry[];
  versions: ComplianceDocumentVersion[];
  currentVersionId?: string;
  submission?: ComplianceSubmissionInfo;
  warnings?: string[];
  notes?: string;
}

export type ComplianceDocument =
  | (BaseComplianceDocument & { docKey: "PHYTO"; form: PhytoFormValues })
  | (BaseComplianceDocument & { docKey: "COO"; form: CooFormValues })
  | (BaseComplianceDocument & { docKey: "INSURANCE"; form: InsuranceFormValues });

export interface ComplianceShipment {
  id: string;
  reference: string;
  buyer: string;
  route: string;
  destination: string;
  incoterm: string;
  mode: "SEA" | "AIR" | "ROAD";
  dueDate: string;
  dueLabel: string;
  issues: number;
  costStatus: "balanced" | "due";
  costNote: string;
  owner: string;
  ownerInitials: string;
  documents: string[];
}

interface ComplianceState {
  shipments: ComplianceShipment[];
  documents: Record<string, ComplianceDocument>;
  initialized: boolean;
  initialize: () => Promise<void>;
  updateForm: (
    docId: string,
    updater: (prev: ComplianceDocument["form"]) => ComplianceDocument["form"]
  ) => void;
  setDocumentStatus: (
    docId: string,
    status: NormalizedDocStatus,
    options?: { note?: string; recordTimeline?: boolean; actor?: string }
  ) => Promise<void>;
  saveDraft: (docId: string) => Promise<void>;
  addAttachment: (docId: string, attachment: ComplianceAttachment) => void;
  removeAttachment: (docId: string, attachmentId: string) => void;
  addEvidence: (docId: string, evidence: ComplianceEvidence) => void;
  addVersion: (docId: string, version: ComplianceDocumentVersion, setCurrent?: boolean) => void;
  setCurrentVersion: (docId: string, versionId: string) => void;
  addTimelineEntry: (docId: string, entry: ComplianceTimelineEntry) => void;
  startSubmission: (
    docId: string,
    submission: Omit<ComplianceSubmissionInfo, "status"> & { status?: ComplianceSubmissionInfo["status"] }
  ) => Promise<void>;
  updateSubmission: (
    docId: string,
    updater: (prev: ComplianceSubmissionInfo) => ComplianceSubmissionInfo
  ) => void;
  clearSubmission: (docId: string) => void;
}

const initialShipments: ComplianceShipment[] = [
  {
    id: "s_5001",
    reference: "PL-2025-EX-0001",
    buyer: "EuroFoods SARL",
    route: "Douala → Le Havre",
    destination: "France",
    incoterm: "FOB",
    mode: "SEA",
    dueDate: "2025-09-20",
    dueLabel: "in 3 days",
    issues: 1,
    costStatus: "due",
    costNote: "Balance due 1.2M FCFA",
    owner: "Jam Ransom",
    ownerInitials: "JR",
    documents: ["doc_phyto_s5001", "doc_coo_s5001", "doc_ins_s5001"],
  },
  {
    id: "s_5002",
    reference: "PL-2025-EX-0002",
    buyer: "Nordic Trade AB",
    route: "Douala → Stockholm",
    destination: "Sweden",
    incoterm: "CIP",
    mode: "AIR",
    dueDate: "2025-09-22",
    dueLabel: "in 5 days",
    issues: 0,
    costStatus: "balanced",
    costNote: "All costs cleared",
    owner: "Alex Broker",
    ownerInitials: "AB",
    documents: ["doc_phyto_s5002", "doc_coo_s5002", "doc_ins_s5002"],
  },
  {
    id: "s_5003",
    reference: "PL-2025-EX-0003",
    buyer: "Mediterraneo SpA",
    route: "Douala → Genoa",
    destination: "Italy",
    incoterm: "CIF",
    mode: "SEA",
    dueDate: "2025-09-26",
    dueLabel: "in 9 days",
    issues: 0,
    costStatus: "due",
    costNote: "Insurance renewal pending",
    owner: "Jam Ransom",
    ownerInitials: "JR",
    documents: ["doc_phyto_s5003", "doc_coo_s5003", "doc_ins_s5003"],
  },
  {
    id: "s_5004",
    reference: "PL-2025-EX-0004",
    buyer: "Atlantic Imports Ltd",
    route: "Douala → Felixstowe",
    destination: "United Kingdom",
    incoterm: "FOB",
    mode: "SEA",
    dueDate: "2025-09-18",
    dueLabel: "overdue 2 days",
    issues: 2,
    costStatus: "due",
    costNote: "Docs blocked by rejection",
    owner: "Alex Broker",
    ownerInitials: "AB",
    documents: ["doc_phyto_s5004", "doc_coo_s5004", "doc_ins_s5004"],
  },
  {
    id: "s_5005",
    reference: "PL-2025-EX-0005",
    buyer: "German Trading GmbH",
    route: "Douala → Frankfurt",
    destination: "Germany",
    incoterm: "CIP",
    mode: "AIR",
    dueDate: "2025-09-28",
    dueLabel: "in 11 days",
    issues: 0,
    costStatus: "balanced",
    costNote: "Ready to submit",
    owner: "Sam Finance",
    ownerInitials: "SF",
    documents: ["doc_phyto_s5005", "doc_coo_s5005", "doc_ins_s5005"],
  },
];

const initialDocuments: ComplianceDocument[] = [
  {
    id: "doc_phyto_s5001",
    docKey: "PHYTO",
    shipmentId: "s_5001",
    shipmentRef: "PL-2025-EX-0001",
    title: "Phytosanitary Certificate",
    status: "draft",
    dueDate: "2025-09-18",
    expiryDate: "2025-12-18",
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-10T08:00:00Z",
    portalBehavior: "auto-sign",
    attachments: [
      {
        id: "att_phyto_lab_1",
        name: "Lab analysis 09-08.pdf",
        type: "lab",
        uploadedAt: "2025-09-08T09:30:00Z",
        note: "Cocoa beans residue analysis",
        sizeLabel: "1.4 MB",
      },
    ],
    evidence: [],
    timeline: [
      {
        id: "tl_phyto_draft",
        at: "2025-09-10T08:00:00Z",
        actor: "Jam Ransom",
        action: "Draft created",
        description: "Initial draft captured from shipment data",
      },
      {
        id: "tl_phyto_lab",
        at: "2025-09-08T09:30:00Z",
        actor: "Jam Ransom",
        action: "Lab results attached",
        description: "Residue analysis uploaded for inspection",
      },
    ],
    versions: [
      {
        id: "ver_phyto_s5001_v1",
        version: 1,
        label: "Draft",
        createdAt: "2025-09-10T08:00:00Z",
        createdBy: "Jam Ransom",
        note: "Draft auto-filled from shipment",
        status: "draft",
        fileName: "PHYTO-PL-2025-EX-0001-draft.pdf",
      },
    ],
    currentVersionId: "ver_phyto_s5001_v1",
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      exporterCountry: "Cameroon",
      consigneeName: "EuroFoods SARL",
      consigneeAddress: "12 Rue de la République, Lyon",
      consigneeCountry: "France",
      contactEmail: "export.ops@prolist.example",
      contactPhone: "+237 655 000 111",
      originCountry: "Cameroon",
      destinationCountry: "France",
      mode: "SEA",
      portOfLoading: "Douala Port",
      portOfDischarge: "Le Havre",
      departureDate: "2025-09-21",
      products: [
        {
          id: "prod_phyto_1",
          botanicalName: "Theobroma cacao",
          commonName: "Cocoa beans",
          hsCode: "180100",
          quantityValue: "5000",
          quantityUnit: "kg",
          packaging: "200 bags × 25kg",
        },
      ],
      treatment: {
        applied: true,
        type: "Fumigation",
        date: "2025-09-12",
        chemical: "Phosphine",
        duration: "48h exposure",
        temperature: "25°C",
        notes: "Ventilated 24h before inspection.",
      },
      placeOfInspection: "Douala Export Warehouse",
      inspectionDate: "2025-09-16",
      inspectorName: "Inspection team TBD",
      additionalDeclarations: "Shipment free from quarantine pests.",
    },
  },
  {
    id: "doc_coo_s5001",
    docKey: "COO",
    shipmentId: "s_5001",
    shipmentRef: "PL-2025-EX-0001",
    title: "Certificate of Origin",
    status: "ready",
    dueDate: "2025-09-18",
    expiryDate: null,
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-11T10:20:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_coo_ready",
        at: "2025-09-11T10:20:00Z",
        actor: "Jam Ransom",
        action: "Marked ready",
        description: "All mandatory fields validated.",
      },
    ],
    versions: [
      {
        id: "ver_coo_s5001_v1",
        version: 1,
        label: "Draft",
        createdAt: "2025-09-10T08:50:00Z",
        createdBy: "Jam Ransom",
        status: "draft",
      },
      {
        id: "ver_coo_s5001_v2",
        version: 2,
        label: "Ready for submission",
        createdAt: "2025-09-11T10:20:00Z",
        createdBy: "Jam Ransom",
        status: "ready",
        note: "Validated details",
        fileName: "COO-PL-2025-EX-0001-ready.pdf",
      },
    ],
    currentVersionId: "ver_coo_s5001_v2",
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      consigneeName: "EuroFoods SARL",
      consigneeAddress: "12 Rue de la République, Lyon",
      transportMode: "Sea freight",
      vesselOrFlight: "MV ATLANTIC HOPE",
      departureDate: "2025-09-21",
      originCriteria: "Wholly obtained",
      invoiceNumber: "INV-2025-0910",
      invoiceDate: "2025-09-10",
      grossWeight: "5,250 kg",
      netWeight: "5,000 kg",
      packages: "200 sacks",
      remarks: "Stamp upon signing",
      declarationName: "Jam Ransom",
      declarationTitle: "Export Manager",
      declarationDate: "2025-09-11",
    },
  },
  {
    id: "doc_ins_s5001",
    docKey: "INSURANCE",
    shipmentId: "s_5001",
    shipmentRef: "PL-2025-EX-0001",
    title: "Insurance Certificate",
    status: "active",
    dueDate: "2025-09-18",
    expiryDate: "2026-03-18",
    owner: "Sam Finance",
    ownerRole: "Finance",
    lastUpdated: "2025-09-05T12:00:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [
      {
        id: "evi_ins_policy",
        name: "Policy ACK.pdf",
        type: "certificate",
        uploadedAt: "2025-09-05T12:00:00Z",
        source: "portal",
        link: "#",
      },
    ],
    timeline: [
      {
        id: "tl_ins_signed",
        at: "2025-09-05T12:00:00Z",
        actor: "Sam Finance",
        action: "Signed policy received",
      },
    ],
    versions: [
      {
        id: "ver_ins_s5001_v1",
        version: 1,
        label: "Signed copy",
        createdAt: "2025-09-05T12:00:00Z",
        createdBy: "Sam Finance",
        status: "signed",
        official: true,
        fileName: "INS-PL-2025-EX-0001.pdf",
      },
    ],
    currentVersionId: "ver_ins_s5001_v1",
    form: {
      policyNumber: "POL-88451",
      provider: "Maritime Alliance",
      coverage: "All risk marine cover",
      contact: "underwriting@maritime-alliance.example",
    },
  },
  {
    id: "doc_phyto_s5002",
    docKey: "PHYTO",
    shipmentId: "s_5002",
    shipmentRef: "PL-2025-EX-0002",
    title: "Phytosanitary Certificate",
    status: "submitted",
    dueDate: "2025-09-19",
    expiryDate: "2025-12-19",
    owner: "Alex Broker",
    ownerRole: "Broker",
    lastUpdated: "2025-09-14T07:50:00Z",
    portalBehavior: "auto-sign",
    attachments: [
      {
        id: "att_phyto2_lab",
        name: "Coffee lab report.pdf",
        type: "lab",
        uploadedAt: "2025-09-12T13:00:00Z",
        sizeLabel: "980 KB",
      },
    ],
    evidence: [
      {
        id: "evi_phyto2_ack",
        name: "Portal ACK.pdf",
        type: "certificate",
        uploadedAt: "2025-09-14T07:55:00Z",
        source: "portal",
        link: "#",
      },
    ],
    timeline: [
      {
        id: "tl_phyto2_sub",
        at: "2025-09-14T07:50:00Z",
        actor: "Alex Broker",
        action: "Submitted to state portal",
        description: "Tracking ID ABC-123",
      },
      {
        id: "tl_phyto2_ack",
        at: "2025-09-14T07:55:00Z",
        actor: "State Portal",
        action: "Acknowledgement received",
      },
    ],
    versions: [
      {
        id: "ver_phyto_s5002_v1",
        version: 1,
        label: "Ready pack",
        createdAt: "2025-09-13T16:10:00Z",
        createdBy: "Alex Broker",
        status: "ready",
      },
    ],
    currentVersionId: "ver_phyto_s5002_v1",
    submission: {
      trackingId: "ABC-123",
      status: "submitted",
      submittedAt: "2025-09-14T07:50:00Z",
      ackAt: "2025-09-14T07:55:00Z",
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: "2025-09-14T07:50:00Z" },
        { id: "received", label: "Received", status: "completed", timestamp: "2025-09-14T07:55:00Z" },
        { id: "under_review", label: "Under review", status: "pending" },
        { id: "decision", label: "Signed & returned", status: "pending" },
      ],
      ackUrl: "#",
      packetUrl: "#",
    },
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      exporterCountry: "Cameroon",
      consigneeName: "Nordic Trade AB",
      consigneeAddress: "Storgatan 15, Stockholm",
      consigneeCountry: "Sweden",
      contactEmail: "export.ops@prolist.example",
      contactPhone: "+237 655 000 111",
      originCountry: "Cameroon",
      destinationCountry: "Sweden",
      mode: "AIR",
      portOfLoading: "Douala International",
      portOfDischarge: "Stockholm Arlanda",
      departureDate: "2025-09-18",
      products: [
        {
          id: "prod_phyto2_1",
          botanicalName: "Coffea arabica",
          commonName: "Green coffee beans",
          hsCode: "090111",
          quantityValue: "3000",
          quantityUnit: "kg",
          packaging: "50 bags × 60kg",
        },
      ],
      treatment: {
        applied: true,
        type: "Heat treatment",
        date: "2025-09-13",
        duration: "30 min at 60°C",
        temperature: "60°C",
        notes: "Performed per EU coffee protocol.",
      },
      placeOfInspection: "Douala Air Cargo Terminal",
      inspectionDate: "2025-09-15",
      inspectorName: "To be assigned",
      additionalDeclarations: "Botanical name helps authorities verify species.",
    },
  },
  {
    id: "doc_coo_s5002",
    docKey: "COO",
    shipmentId: "s_5002",
    shipmentRef: "PL-2025-EX-0002",
    title: "Certificate of Origin",
    status: "under_review",
    dueDate: "2025-09-19",
    expiryDate: null,
    owner: "Alex Broker",
    ownerRole: "Broker",
    lastUpdated: "2025-09-14T07:40:00Z",
    portalBehavior: "auto-sign",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_coo2_submit",
        at: "2025-09-13T12:10:00Z",
        actor: "Alex Broker",
        action: "Submitted to chamber",
        description: "Portal tracking COO-442",
      },
      {
        id: "tl_coo2_review",
        at: "2025-09-14T07:40:00Z",
        actor: "Chamber Reviewer",
        action: "Under review",
        description: "Assigned to Marie Dupont",
      },
    ],
    versions: [
      {
        id: "ver_coo_s5002_v1",
        version: 1,
        label: "Ready",
        createdAt: "2025-09-13T09:30:00Z",
        createdBy: "Alex Broker",
        status: "ready",
        fileName: "COO-PL-2025-EX-0002.pdf",
      },
    ],
    currentVersionId: "ver_coo_s5002_v1",
    submission: {
      trackingId: "COO-442",
      status: "under_review",
      submittedAt: "2025-09-13T12:10:00Z",
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: "2025-09-13T12:10:00Z" },
        { id: "received", label: "Received", status: "completed", timestamp: "2025-09-13T12:15:00Z" },
        { id: "under_review", label: "Under review", status: "completed", timestamp: "2025-09-14T07:40:00Z" },
        { id: "decision", label: "Signed & returned", status: "pending" },
      ],
      packetUrl: "#",
    },
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      consigneeName: "Nordic Trade AB",
      consigneeAddress: "Storgatan 15, Stockholm",
      transportMode: "Air freight",
      vesselOrFlight: "SK 582",
      departureDate: "2025-09-21",
      originCriteria: "Wholly obtained",
      invoiceNumber: "INV-2025-0911",
      invoiceDate: "2025-09-11",
      grossWeight: "3,050 kg",
      netWeight: "3,000 kg",
      packages: "50 bags",
      remarks: "Awaiting chamber signature",
      declarationName: "Alex Broker",
      declarationTitle: "Customs Broker",
      declarationDate: "2025-09-13",
    },
  },
  {
    id: "doc_ins_s5002",
    docKey: "INSURANCE",
    shipmentId: "s_5002",
    shipmentRef: "PL-2025-EX-0002",
    title: "Insurance Certificate",
    status: "ready",
    dueDate: "2025-09-20",
    expiryDate: "2026-03-20",
    owner: "Sam Finance",
    ownerRole: "Finance",
    lastUpdated: "2025-09-12T11:00:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_ins2_ready",
        at: "2025-09-12T11:00:00Z",
        actor: "Sam Finance",
        action: "Certificate issued",
      },
    ],
    versions: [
      {
        id: "ver_ins_s5002_v1",
        version: 1,
        label: "Issued",
        createdAt: "2025-09-12T11:00:00Z",
        createdBy: "Sam Finance",
        status: "ready",
        fileName: "INS-PL-2025-EX-0002.pdf",
      },
    ],
    currentVersionId: "ver_ins_s5002_v1",
    form: {
      policyNumber: "POL-77821",
      provider: "Nordic Marine",
      coverage: "Air freight door-to-door",
      contact: "ops@nordicmarine.example",
    },
  },
  {
    id: "doc_phyto_s5003",
    docKey: "PHYTO",
    shipmentId: "s_5003",
    shipmentRef: "PL-2025-EX-0003",
    title: "Phytosanitary Certificate",
    status: "active",
    dueDate: "2025-09-21",
    expiryDate: "2025-12-21",
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-05T09:00:00Z",
    portalBehavior: "auto-sign",
    attachments: [],
    evidence: [
      {
        id: "evi_phyto3_signed",
        name: "Phyto signed.pdf",
        type: "certificate",
        uploadedAt: "2025-09-05T09:00:00Z",
        source: "portal",
      },
    ],
    timeline: [
      {
        id: "tl_phyto3_signed",
        at: "2025-09-05T09:00:00Z",
        actor: "State Portal",
        action: "Signed copy returned",
        description: "Signature ref PHY-991",
      },
    ],
    versions: [
      {
        id: "ver_phyto_s5003_v1",
        version: 1,
        label: "Signed official",
        createdAt: "2025-09-05T09:00:00Z",
        createdBy: "State Portal",
        status: "signed",
        official: true,
        note: "Signed copy received — replaced as current version.",
        fileName: "PHYTO-PL-2025-EX-0003-signed.pdf",
      },
    ],
    currentVersionId: "ver_phyto_s5003_v1",
    submission: {
      trackingId: "PHY-991",
      status: "signed",
      submittedAt: "2025-09-03T10:00:00Z",
      decisionAt: "2025-09-05T09:00:00Z",
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: "2025-09-03T10:00:00Z" },
        { id: "received", label: "Received", status: "completed", timestamp: "2025-09-03T10:05:00Z" },
        { id: "under_review", label: "Under review", status: "completed", timestamp: "2025-09-04T14:10:00Z" },
        { id: "decision", label: "Signed & returned", status: "completed", timestamp: "2025-09-05T09:00:00Z" },
      ],
      ackUrl: "#",
      packetUrl: "#",
    },
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      exporterCountry: "Cameroon",
      consigneeName: "Mediterraneo SpA",
      consigneeAddress: "Via Roma 42, Milano",
      consigneeCountry: "Italy",
      contactEmail: "export.ops@prolist.example",
      contactPhone: "+237 655 000 111",
      originCountry: "Cameroon",
      destinationCountry: "Italy",
      mode: "SEA",
      portOfLoading: "Douala Port",
      portOfDischarge: "Port of Genoa",
      departureDate: "2025-09-22",
      products: [
        {
          id: "prod_phyto3_1",
          botanicalName: "Milicia excelsa",
          commonName: "Sawn timber",
          hsCode: "440710",
          quantityValue: "18",
          quantityUnit: "tonne",
          packaging: "25 crates strapped",
        },
      ],
      treatment: {
        applied: true,
        type: "Kiln drying",
        date: "2025-09-02",
        duration: "72h cycle",
        temperature: "56°C core",
        notes: "Kiln certificate attached in evidence.",
      },
      placeOfInspection: "Douala Forestry Inspection Yard",
      inspectionDate: "2025-09-04",
      inspectorName: "Luca Romano",
      additionalDeclarations: "Kiln dried prior to export.",
    },
  },
  {
    id: "doc_coo_s5003",
    docKey: "COO",
    shipmentId: "s_5003",
    shipmentRef: "PL-2025-EX-0003",
    title: "Certificate of Origin",
    status: "active",
    dueDate: "2025-09-21",
    expiryDate: null,
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-06T11:40:00Z",
    portalBehavior: "auto-sign",
    attachments: [],
    evidence: [
      {
        id: "evi_coo3_signed",
        name: "COO signed.pdf",
        type: "certificate",
        uploadedAt: "2025-09-06T11:40:00Z",
        source: "portal",
      },
    ],
    timeline: [
      {
        id: "tl_coo3_signed",
        at: "2025-09-06T11:40:00Z",
        actor: "Chamber of Commerce",
        action: "Signed copy returned",
        description: "Signed by Marie Dupont",
      },
    ],
    versions: [
      {
        id: "ver_coo_s5003_v1",
        version: 1,
        label: "Signed official",
        createdAt: "2025-09-06T11:40:00Z",
        createdBy: "Chamber of Commerce",
        status: "signed",
        official: true,
        note: "Stamped and sealed copy",
        fileName: "COO-PL-2025-EX-0003-signed.pdf",
      },
    ],
    currentVersionId: "ver_coo_s5003_v1",
    submission: {
      trackingId: "COO-511",
      status: "signed",
      submittedAt: "2025-09-04T09:00:00Z",
      decisionAt: "2025-09-06T11:40:00Z",
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: "2025-09-04T09:00:00Z" },
        { id: "received", label: "Received", status: "completed", timestamp: "2025-09-04T09:05:00Z" },
        { id: "under_review", label: "Under review", status: "completed", timestamp: "2025-09-05T16:00:00Z" },
        { id: "decision", label: "Signed & returned", status: "completed", timestamp: "2025-09-06T11:40:00Z" },
      ],
      ackUrl: "#",
      packetUrl: "#",
    },
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      consigneeName: "Mediterraneo SpA",
      consigneeAddress: "Via Roma 42, Milano",
      transportMode: "Sea freight",
      vesselOrFlight: "MV ATLANTIC HOPE",
      departureDate: "2025-09-22",
      originCriteria: "Wholly obtained",
      invoiceNumber: "INV-2025-0905",
      invoiceDate: "2025-09-05",
      grossWeight: "18,600 kg",
      netWeight: "18,000 kg",
      packages: "25 crates",
      remarks: "Signed copy stored",
      declarationName: "Jam Ransom",
      declarationTitle: "Export Manager",
      declarationDate: "2025-09-04",
    },
  },
  {
    id: "doc_ins_s5003",
    docKey: "INSURANCE",
    shipmentId: "s_5003",
    shipmentRef: "PL-2025-EX-0003",
    title: "Insurance Certificate",
    status: "expired",
    dueDate: "2025-09-15",
    expiryDate: "2025-09-10",
    owner: "Sam Finance",
    ownerRole: "Finance",
    lastUpdated: "2025-09-10T08:00:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_ins3_expired",
        at: "2025-09-10T08:00:00Z",
        actor: "System",
        action: "Certificate expired",
      },
    ],
    versions: [
      {
        id: "ver_ins_s5003_v1",
        version: 1,
        label: "Expired policy",
        createdAt: "2025-03-10T08:00:00Z",
        createdBy: "Sam Finance",
        status: "signed",
        fileName: "INS-PL-2025-EX-0003.pdf",
      },
    ],
    currentVersionId: "ver_ins_s5003_v1",
    form: {
      policyNumber: "POL-66042",
      provider: "Mediterranean Underwriters",
      coverage: "Door to port",
      contact: "claims@medunderwriters.example",
    },
  },
  {
    id: "doc_phyto_s5004",
    docKey: "PHYTO",
    shipmentId: "s_5004",
    shipmentRef: "PL-2025-EX-0004",
    title: "Phytosanitary Certificate",
    status: "rejected",
    dueDate: "2025-09-15",
    expiryDate: null,
    owner: "Alex Broker",
    ownerRole: "Broker",
    lastUpdated: "2025-09-14T16:45:00Z",
    portalBehavior: "auto-reject",
    attachments: [
      {
        id: "att_phyto4_lab",
        name: "Revised lab results.pdf",
        type: "lab",
        uploadedAt: "2025-09-15T09:20:00Z",
      },
    ],
    evidence: [
      {
        id: "evi_phyto4_reject",
        name: "Portal rejection.pdf",
        type: "certificate",
        uploadedAt: "2025-09-14T16:45:00Z",
        source: "portal",
        note: "HS description mismatch",
      },
    ],
    timeline: [
      {
        id: "tl_phyto4_submit",
        at: "2025-09-13T11:00:00Z",
        actor: "Alex Broker",
        action: "Submitted to state portal",
      },
      {
        id: "tl_phyto4_reject",
        at: "2025-09-14T16:45:00Z",
        actor: "State Portal",
        action: "Rejected",
        description: "HS description doesn't match invoice",
      },
    ],
    versions: [
      {
        id: "ver_phyto_s5004_v1",
        version: 1,
        label: "Ready",
        createdAt: "2025-09-13T09:15:00Z",
        createdBy: "Alex Broker",
        status: "ready",
      },
    ],
    currentVersionId: "ver_phyto_s5004_v1",
    submission: {
      trackingId: "PHY-777",
      status: "rejected",
      submittedAt: "2025-09-13T11:00:00Z",
      decisionAt: "2025-09-14T16:45:00Z",
      rejectionReason: "HS description doesn't match invoice. Fix & resubmit.",
      steps: [
        { id: "submitted", label: "Submitted", status: "completed", timestamp: "2025-09-13T11:00:00Z" },
        { id: "received", label: "Received", status: "completed", timestamp: "2025-09-13T11:05:00Z" },
        { id: "under_review", label: "Under review", status: "completed", timestamp: "2025-09-14T14:20:00Z" },
        { id: "decision", label: "Rejected", status: "rejected", timestamp: "2025-09-14T16:45:00Z" },
      ],
      ackUrl: "#",
      packetUrl: "#",
    },
    warnings: ["Fix HS description to match the commercial invoice."],
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      exporterCountry: "Cameroon",
      consigneeName: "Atlantic Imports Ltd",
      consigneeAddress: "25 King Street, London",
      consigneeCountry: "United Kingdom",
      contactEmail: "export.ops@prolist.example",
      contactPhone: "+237 655 000 111",
      originCountry: "Cameroon",
      destinationCountry: "United Kingdom",
      mode: "SEA",
      portOfLoading: "Douala Port",
      portOfDischarge: "Port of Felixstowe",
      departureDate: "2025-09-24",
      products: [
        {
          id: "prod_phyto4_1",
          botanicalName: "Theobroma cacao",
          commonName: "Cocoa butter",
          hsCode: "180400",
          quantityValue: "7200",
          quantityUnit: "kg",
          packaging: "120 drums × 60kg",
        },
      ],
      treatment: {
        applied: true,
        type: "Fumigation",
        date: "2025-09-10",
        chemical: "Phosphine",
        duration: "48h exposure",
        temperature: "24°C warehouse",
        notes: "Update HS description to match invoice.",
      },
      placeOfInspection: "Douala Export Warehouse",
      inspectionDate: "2025-09-12",
      inspectorName: "Inspector TBD",
      additionalDeclarations: "HS description to be aligned before resubmitting.",
    },
  },
  {
    id: "doc_coo_s5004",
    docKey: "COO",
    shipmentId: "s_5004",
    shipmentRef: "PL-2025-EX-0004",
    title: "Certificate of Origin",
    status: "draft",
    dueDate: "2025-09-18",
    expiryDate: null,
    owner: "Alex Broker",
    ownerRole: "Broker",
    lastUpdated: "2025-09-12T15:00:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_coo4_draft",
        at: "2025-09-12T15:00:00Z",
        actor: "Alex Broker",
        action: "Draft saved",
      },
    ],
    versions: [
      {
        id: "ver_coo_s5004_v1",
        version: 1,
        label: "Draft",
        createdAt: "2025-09-12T15:00:00Z",
        createdBy: "Alex Broker",
        status: "draft",
      },
    ],
    currentVersionId: "ver_coo_s5004_v1",
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      consigneeName: "Atlantic Imports Ltd",
      consigneeAddress: "25 King Street, London",
      transportMode: "Sea freight",
      vesselOrFlight: "MV ATLANTIC STAR",
      departureDate: "2025-09-24",
      originCriteria: "Wholly obtained",
      invoiceNumber: "INV-2025-0912",
      invoiceDate: "2025-09-12",
      grossWeight: "7,500 kg",
      netWeight: "7,200 kg",
      packages: "120 drums",
      remarks: "Awaiting corrected HS code",
      declarationName: "Alex Broker",
      declarationTitle: "Customs Broker",
      declarationDate: "2025-09-12",
    },
  },
  {
    id: "doc_ins_s5004",
    docKey: "INSURANCE",
    shipmentId: "s_5004",
    shipmentRef: "PL-2025-EX-0004",
    title: "Insurance Certificate",
    status: "required",
    dueDate: "2025-09-18",
    expiryDate: null,
    owner: "Sam Finance",
    ownerRole: "Finance",
    lastUpdated: "2025-09-10T08:00:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [],
    versions: [],
    form: {
      provider: "",
      coverage: "Marine",
      contact: "",
    },
  },
  {
    id: "doc_phyto_s5005",
    docKey: "PHYTO",
    shipmentId: "s_5005",
    shipmentRef: "PL-2025-EX-0005",
    title: "Phytosanitary Certificate",
    status: "ready",
    dueDate: "2025-09-22",
    expiryDate: "2025-12-22",
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-15T09:00:00Z",
    portalBehavior: "auto-sign",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_phyto5_ready",
        at: "2025-09-15T09:00:00Z",
        actor: "Jam Ransom",
        action: "Validation passed",
      },
    ],
    versions: [
      {
        id: "ver_phyto_s5005_v1",
        version: 1,
        label: "Ready",
        createdAt: "2025-09-15T09:00:00Z",
        createdBy: "Jam Ransom",
        status: "ready",
      },
    ],
    currentVersionId: "ver_phyto_s5005_v1",
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      exporterCountry: "Cameroon",
      consigneeName: "German Trading GmbH",
      consigneeAddress: "Hauptstraße 123, Berlin",
      consigneeCountry: "Germany",
      contactEmail: "export.ops@prolist.example",
      contactPhone: "+237 655 000 111",
      originCountry: "Cameroon",
      destinationCountry: "Germany",
      mode: "AIR",
      portOfLoading: "Douala International",
      portOfDischarge: "Frankfurt Main",
      departureDate: "2025-09-19",
      products: [
        {
          id: "prod_phyto5_1",
          botanicalName: "Coffea canephora",
          commonName: "Green coffee",
          hsCode: "090111",
          quantityValue: "4800",
          quantityUnit: "kg",
          packaging: "80 bags × 60kg",
        },
      ],
      treatment: {
        applied: true,
        type: "Fumigation",
        date: "2025-09-14",
        chemical: "Phosphine",
        duration: "48h exposure",
        temperature: "22°C warehouse",
        notes: "All checks passed. You're ready to submit.",
      },
      placeOfInspection: "Douala Export Warehouse",
      inspectionDate: "2025-09-16",
      inspectorName: "Assigned",
      additionalDeclarations: "Inspection date required before submission.",
    },
  },
  {
    id: "doc_coo_s5005",
    docKey: "COO",
    shipmentId: "s_5005",
    shipmentRef: "PL-2025-EX-0005",
    title: "Certificate of Origin",
    status: "ready",
    dueDate: "2025-09-22",
    expiryDate: null,
    owner: "Jam Ransom",
    ownerRole: "Broker",
    lastUpdated: "2025-09-15T10:15:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [],
    timeline: [
      {
        id: "tl_coo5_ready",
        at: "2025-09-15T10:15:00Z",
        actor: "Jam Ransom",
        action: "Marked ready",
      },
    ],
    versions: [
      {
        id: "ver_coo_s5005_v1",
        version: 1,
        label: "Ready",
        createdAt: "2025-09-15T10:15:00Z",
        createdBy: "Jam Ransom",
        status: "ready",
      },
    ],
    currentVersionId: "ver_coo_s5005_v1",
    form: {
      exporterName: "ProList Manufacturing Ltd",
      exporterAddress: "Mile 3 Nkwen, Bamenda, Cameroon",
      consigneeName: "German Trading GmbH",
      consigneeAddress: "Hauptstraße 123, Berlin",
      transportMode: "Air freight",
      vesselOrFlight: "LH 843",
      departureDate: "2025-09-23",
      originCriteria: "Wholly obtained",
      invoiceNumber: "INV-2025-0915",
      invoiceDate: "2025-09-15",
      grossWeight: "5,100 kg",
      netWeight: "4,800 kg",
      packages: "80 bags",
      remarks: "Ready to submit pack",
      declarationName: "Jam Ransom",
      declarationTitle: "Export Manager",
      declarationDate: "2025-09-15",
    },
  },
  {
    id: "doc_ins_s5005",
    docKey: "INSURANCE",
    shipmentId: "s_5005",
    shipmentRef: "PL-2025-EX-0005",
    title: "Insurance Certificate",
    status: "ready",
    dueDate: "2025-09-25",
    expiryDate: "2026-03-25",
    owner: "Sam Finance",
    ownerRole: "Finance",
    lastUpdated: "2025-09-14T08:30:00Z",
    portalBehavior: "manual",
    attachments: [],
    evidence: [
      {
        id: "evi_ins5_quote",
        name: "Premium receipt.pdf",
        type: "invoice",
        uploadedAt: "2025-09-14T08:30:00Z",
        source: "upload",
      },
    ],
    timeline: [
      {
        id: "tl_ins5_ready",
        at: "2025-09-14T08:30:00Z",
        actor: "Sam Finance",
        action: "Premium receipt added",
      },
    ],
    versions: [
      {
        id: "ver_ins_s5005_v1",
        version: 1,
        label: "Issued",
        createdAt: "2025-09-14T08:30:00Z",
        createdBy: "Sam Finance",
        status: "ready",
        fileName: "INS-PL-2025-EX-0005.pdf",
      },
    ],
    currentVersionId: "ver_ins_s5005_v1",
    form: {
      policyNumber: "POL-90211",
      provider: "Continental Shield",
      coverage: "Air freight all risks",
      contact: "support@continentalshield.example",
    },
  },
];
const documentsById = initialDocuments.reduce<Record<string, ComplianceDocument>>((acc, doc) => {
  acc[doc.id] = doc;
  return acc;
}, {});

export const useComplianceStore = create<ComplianceState>((set, get) => ({
  shipments: initialShipments,
  documents: documentsById,
  initialized: false,
  async initialize() {
    if (get().initialized) return;
    const { documents } = get();
    await Promise.all(
      Object.values(documents).map(doc =>
        mockApi.setDocumentStatus(doc.shipmentId, doc.docKey, doc.status)
      )
    );
    set({ initialized: true });
  },
  updateForm(docId, updater) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      const updatedForm = updater(doc.form);
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            form: updatedForm,
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  async setDocumentStatus(docId, status, options) {
    const state = get();
    const doc = state.documents[docId];
    if (!doc) return;
    const normalized = normalizeDocStatus(status);
    const updatedTimeline = options?.recordTimeline
      ? [
          ...doc.timeline,
          {
            id: generateId("tl"),
            at: new Date().toISOString(),
            actor: options?.actor ?? "System",
            action: `Status set to ${normalized}`,
            description: options?.note,
          },
        ]
      : doc.timeline;

    set(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docId]: {
          ...doc,
          status: normalized,
          lastUpdated: new Date().toISOString(),
          timeline: updatedTimeline,
        },
      },
    }));

    await mockApi.setDocumentStatus(doc.shipmentId, doc.docKey, normalized, options?.note);
  },
  async saveDraft(docId) {
    await get().setDocumentStatus(docId, "draft", {
      note: "Saved as draft",
      recordTimeline: true,
      actor: "You",
    });
  },
  addAttachment(docId, attachment) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            attachments: [...doc.attachments, attachment],
            lastUpdated: new Date().toISOString(),
            timeline: [
              ...doc.timeline,
              {
                id: generateId("tl"),
                at: attachment.uploadedAt,
                actor: "You",
                action: "Attachment added",
                description: attachment.name,
              },
            ],
          },
        },
      };
    });
  },
  removeAttachment(docId, attachmentId) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            attachments: doc.attachments.filter(item => item.id !== attachmentId),
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  addEvidence(docId, evidence) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            evidence: [...doc.evidence, evidence],
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  addVersion(docId, version, setCurrent = false) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      const versions = [...doc.versions, version];
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            versions,
            currentVersionId: setCurrent ? version.id : doc.currentVersionId ?? version.id,
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  setCurrentVersion(docId, versionId) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            currentVersionId: versionId,
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  addTimelineEntry(docId, entry) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            timeline: [...doc.timeline, entry],
            lastUpdated: entry.at,
          },
        },
      };
    });
  },
  async startSubmission(docId, submission) {
    const state = get();
    const doc = state.documents[docId];
    if (!doc) return;
    const status = normalizeDocStatus(submission.status ?? "submitted");
    set(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docId]: {
          ...doc,
          submission: {
            ...submission,
            status: submission.status ?? "submitted",
          },
          status,
          lastUpdated: submission.submittedAt,
          timeline: [
            ...doc.timeline,
            {
              id: generateId("tl"),
              at: submission.submittedAt,
              actor: "You",
              action: "Submitted to state portal",
              description: `Tracking ID ${submission.trackingId}`,
            },
          ],
        },
      },
    }));

    await mockApi.setDocumentStatus(doc.shipmentId, doc.docKey, status);
  },
  updateSubmission(docId, updater) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc || !doc.submission) return state;
      const updatedSubmission = updater(doc.submission);
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            submission: updatedSubmission,
            status: normalizeDocStatus(updatedSubmission.status),
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
  clearSubmission(docId) {
    set(state => {
      const doc = state.documents[docId];
      if (!doc) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          [docId]: {
            ...doc,
            submission: undefined,
            lastUpdated: new Date().toISOString(),
          },
        },
      };
    });
  },
}));
