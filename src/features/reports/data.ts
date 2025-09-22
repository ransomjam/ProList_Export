export type ShipmentStatus = 'draft' | 'submitted' | 'cleared';
export type ShipmentMode = 'SEA' | 'AIR' | 'ROAD';
export type Incoterm = 'FOB' | 'CIF' | 'CIP';

export type IssueStatus = 'open' | 'in_review' | 'resolved';
export type DocumentStatus = 'Draft' | 'Generated' | 'Approved' | 'Pending' | 'Rejected';

export interface ReportIssue {
  id: string;
  title: string;
  status: IssueStatus;
}

export interface ReportShipment {
  id: string;
  reference: string;
  buyer: string;
  incoterm: Incoterm;
  mode: ShipmentMode;
  route: string;
  destination: string;
  status: ShipmentStatus;
  value: number;
  balanceDue: number;
  updatedAt: string;
  issues: ReportIssue[];
}

export interface ReportDocument {
  id: string;
  shipmentId: string;
  shipmentReference: string;
  type: string;
  status: DocumentStatus;
  version: number;
  updatedAt: string;
}

export const reportShipments: ReportShipment[] = [
  {
    id: 'ship-001',
    reference: 'PL-2025-EX-101',
    buyer: 'EuroFoods SARL',
    incoterm: 'FOB',
    mode: 'SEA',
    route: 'Douala → Marseille',
    destination: 'France',
    status: 'draft',
    value: 24500000,
    balanceDue: 12500000,
    updatedAt: '2025-01-17',
    issues: [
      { id: 'issue-001', title: 'Pending export permit upload', status: 'open' },
    ],
  },
  {
    id: 'ship-002',
    reference: 'PL-2025-EX-102',
    buyer: 'German Trading GmbH',
    incoterm: 'CIP',
    mode: 'AIR',
    route: 'Douala → Frankfurt',
    destination: 'Germany',
    status: 'submitted',
    value: 18200000,
    balanceDue: 6200000,
    updatedAt: '2025-02-03',
    issues: [
      { id: 'issue-002', title: 'Awaiting airline booking confirmation', status: 'in_review' },
    ],
  },
  {
    id: 'ship-003',
    reference: 'PL-2025-EX-103',
    buyer: 'Mediterraneo SpA',
    incoterm: 'CIF',
    mode: 'SEA',
    route: 'Douala → Genoa',
    destination: 'Italy',
    status: 'cleared',
    value: 36900000,
    balanceDue: -1200000,
    updatedAt: '2025-02-21',
    issues: [],
  },
  {
    id: 'ship-004',
    reference: 'PL-2025-EX-104',
    buyer: 'Iberia Foods SL',
    incoterm: 'FOB',
    mode: 'ROAD',
    route: 'Bamenda → Valencia',
    destination: 'Spain',
    status: 'submitted',
    value: 21000000,
    balanceDue: 8400000,
    updatedAt: '2025-03-12',
    issues: [
      { id: 'issue-004', title: 'Missing phytosanitary certificate', status: 'open' },
    ],
  },
  {
    id: 'ship-005',
    reference: 'PL-2025-EX-105',
    buyer: 'EuroFoods SARL',
    incoterm: 'FOB',
    mode: 'SEA',
    route: 'Douala → Le Havre',
    destination: 'France',
    status: 'draft',
    value: 31800000,
    balanceDue: 31800000,
    updatedAt: '2025-04-02',
    issues: [
      { id: 'issue-005', title: 'Draft invoice requires validation', status: 'in_review' },
    ],
  },
  {
    id: 'ship-006',
    reference: 'PL-2025-EX-106',
    buyer: 'Nordic Trade AB',
    incoterm: 'CIF',
    mode: 'SEA',
    route: 'Douala → Rotterdam',
    destination: 'Netherlands',
    status: 'cleared',
    value: 40200000,
    balanceDue: 0,
    updatedAt: '2025-04-27',
    issues: [],
  },
  {
    id: 'ship-007',
    reference: 'PL-2025-EX-107',
    buyer: 'Nordic Trade AB',
    incoterm: 'CIP',
    mode: 'AIR',
    route: 'Douala → Stockholm',
    destination: 'Sweden',
    status: 'submitted',
    value: 22800000,
    balanceDue: 2280000,
    updatedAt: '2025-05-09',
    issues: [],
  },
  {
    id: 'ship-008',
    reference: 'PL-2025-EX-108',
    buyer: 'Mediterraneo SpA',
    incoterm: 'CIF',
    mode: 'SEA',
    route: 'Douala → Livorno',
    destination: 'Italy',
    status: 'cleared',
    value: 45200000,
    balanceDue: -4500000,
    updatedAt: '2025-06-14',
    issues: [
      { id: 'issue-008', title: 'Quality inspection follow-up', status: 'resolved' },
    ],
  },
  {
    id: 'ship-009',
    reference: 'PL-2025-EX-109',
    buyer: 'EuroFoods SARL',
    incoterm: 'FOB',
    mode: 'SEA',
    route: 'Douala → Marseille',
    destination: 'France',
    status: 'submitted',
    value: 37600000,
    balanceDue: 18900000,
    updatedAt: '2025-07-08',
    issues: [
      { id: 'issue-009', title: 'Buyer requested packing change', status: 'in_review' },
    ],
  },
  {
    id: 'ship-010',
    reference: 'PL-2025-EX-110',
    buyer: 'BelgoMarket NV',
    incoterm: 'CIP',
    mode: 'ROAD',
    route: 'Douala → Antwerp',
    destination: 'Belgium',
    status: 'draft',
    value: 16800000,
    balanceDue: 16800000,
    updatedAt: '2025-07-25',
    issues: [
      { id: 'issue-010', title: 'Awaiting SGS inspection slot', status: 'open' },
    ],
  },
  {
    id: 'ship-011',
    reference: 'PL-2025-EX-111',
    buyer: 'Atlantic Imports Ltd',
    incoterm: 'FOB',
    mode: 'SEA',
    route: 'Douala → Felixstowe',
    destination: 'United Kingdom',
    status: 'cleared',
    value: 51200000,
    balanceDue: -8200000,
    updatedAt: '2025-08-16',
    issues: [],
  },
  {
    id: 'ship-012',
    reference: 'PL-2025-EX-112',
    buyer: 'German Trading GmbH',
    incoterm: 'CIP',
    mode: 'AIR',
    route: 'Douala → Munich',
    destination: 'Germany',
    status: 'submitted',
    value: 24900000,
    balanceDue: 8300000,
    updatedAt: '2025-09-05',
    issues: [],
  },
  {
    id: 'ship-013',
    reference: 'PL-2025-EX-113',
    buyer: 'Mediterraneo SpA',
    incoterm: 'CIF',
    mode: 'SEA',
    route: 'Douala → Trieste',
    destination: 'Italy',
    status: 'cleared',
    value: 53800000,
    balanceDue: -12000000,
    updatedAt: '2025-09-18',
    issues: [],
  },
  {
    id: 'ship-014',
    reference: 'PL-2025-EX-114',
    buyer: 'EuroFoods SARL',
    incoterm: 'FOB',
    mode: 'SEA',
    route: 'Douala → Bordeaux',
    destination: 'France',
    status: 'draft',
    value: 29800000,
    balanceDue: 29800000,
    updatedAt: '2025-09-26',
    issues: [],
  },
];

export const reportDocuments: ReportDocument[] = [
  { id: 'doc-001', shipmentId: 'ship-001', shipmentReference: 'PL-2025-EX-101', type: 'Commercial Invoice', status: 'Draft', version: 1, updatedAt: '2025-01-18' },
  { id: 'doc-002', shipmentId: 'ship-001', shipmentReference: 'PL-2025-EX-101', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-01-18' },
  { id: 'doc-003', shipmentId: 'ship-001', shipmentReference: 'PL-2025-EX-101', type: 'Phyto Certificate', status: 'Pending', version: 0, updatedAt: '2025-01-19' },
  { id: 'doc-004', shipmentId: 'ship-002', shipmentReference: 'PL-2025-EX-102', type: 'Commercial Invoice', status: 'Generated', version: 1, updatedAt: '2025-02-04' },
  { id: 'doc-005', shipmentId: 'ship-002', shipmentReference: 'PL-2025-EX-102', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-02-04' },
  { id: 'doc-006', shipmentId: 'ship-002', shipmentReference: 'PL-2025-EX-102', type: 'Air Waybill', status: 'Approved', version: 2, updatedAt: '2025-02-05' },
  { id: 'doc-007', shipmentId: 'ship-003', shipmentReference: 'PL-2025-EX-103', type: 'Commercial Invoice', status: 'Approved', version: 2, updatedAt: '2025-02-22' },
  { id: 'doc-008', shipmentId: 'ship-003', shipmentReference: 'PL-2025-EX-103', type: 'Packing List', status: 'Approved', version: 2, updatedAt: '2025-02-22' },
  { id: 'doc-009', shipmentId: 'ship-003', shipmentReference: 'PL-2025-EX-103', type: 'Certificate of Origin', status: 'Approved', version: 1, updatedAt: '2025-02-23' },
  { id: 'doc-010', shipmentId: 'ship-004', shipmentReference: 'PL-2025-EX-104', type: 'Commercial Invoice', status: 'Generated', version: 1, updatedAt: '2025-03-13' },
  { id: 'doc-011', shipmentId: 'ship-004', shipmentReference: 'PL-2025-EX-104', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-03-13' },
  { id: 'doc-012', shipmentId: 'ship-004', shipmentReference: 'PL-2025-EX-104', type: 'Phyto Certificate', status: 'Pending', version: 0, updatedAt: '2025-03-14' },
  { id: 'doc-013', shipmentId: 'ship-005', shipmentReference: 'PL-2025-EX-105', type: 'Commercial Invoice', status: 'Draft', version: 0, updatedAt: '2025-04-02' },
  { id: 'doc-014', shipmentId: 'ship-005', shipmentReference: 'PL-2025-EX-105', type: 'Packing List', status: 'Draft', version: 0, updatedAt: '2025-04-02' },
  { id: 'doc-015', shipmentId: 'ship-005', shipmentReference: 'PL-2025-EX-105', type: 'Quality Certificate', status: 'Pending', version: 0, updatedAt: '2025-04-03' },
  { id: 'doc-016', shipmentId: 'ship-006', shipmentReference: 'PL-2025-EX-106', type: 'Commercial Invoice', status: 'Approved', version: 3, updatedAt: '2025-04-28' },
  { id: 'doc-017', shipmentId: 'ship-006', shipmentReference: 'PL-2025-EX-106', type: 'Packing List', status: 'Approved', version: 3, updatedAt: '2025-04-28' },
  { id: 'doc-018', shipmentId: 'ship-006', shipmentReference: 'PL-2025-EX-106', type: 'Bill of Lading', status: 'Approved', version: 1, updatedAt: '2025-04-29' },
  { id: 'doc-019', shipmentId: 'ship-007', shipmentReference: 'PL-2025-EX-107', type: 'Commercial Invoice', status: 'Generated', version: 1, updatedAt: '2025-05-10' },
  { id: 'doc-020', shipmentId: 'ship-007', shipmentReference: 'PL-2025-EX-107', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-05-10' },
  { id: 'doc-021', shipmentId: 'ship-007', shipmentReference: 'PL-2025-EX-107', type: 'Air Waybill', status: 'Generated', version: 1, updatedAt: '2025-05-11' },
  { id: 'doc-022', shipmentId: 'ship-008', shipmentReference: 'PL-2025-EX-108', type: 'Commercial Invoice', status: 'Approved', version: 2, updatedAt: '2025-06-15' },
  { id: 'doc-023', shipmentId: 'ship-008', shipmentReference: 'PL-2025-EX-108', type: 'Packing List', status: 'Approved', version: 2, updatedAt: '2025-06-15' },
  { id: 'doc-024', shipmentId: 'ship-008', shipmentReference: 'PL-2025-EX-108', type: 'Certificate of Origin', status: 'Approved', version: 1, updatedAt: '2025-06-16' },
  { id: 'doc-025', shipmentId: 'ship-009', shipmentReference: 'PL-2025-EX-109', type: 'Commercial Invoice', status: 'Generated', version: 1, updatedAt: '2025-07-09' },
  { id: 'doc-026', shipmentId: 'ship-009', shipmentReference: 'PL-2025-EX-109', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-07-09' },
  { id: 'doc-027', shipmentId: 'ship-009', shipmentReference: 'PL-2025-EX-109', type: 'Phyto Certificate', status: 'Pending', version: 0, updatedAt: '2025-07-10' },
  { id: 'doc-028', shipmentId: 'ship-010', shipmentReference: 'PL-2025-EX-110', type: 'Commercial Invoice', status: 'Draft', version: 0, updatedAt: '2025-07-25' },
  { id: 'doc-029', shipmentId: 'ship-010', shipmentReference: 'PL-2025-EX-110', type: 'Packing List', status: 'Draft', version: 0, updatedAt: '2025-07-25' },
  { id: 'doc-030', shipmentId: 'ship-010', shipmentReference: 'PL-2025-EX-110', type: 'Quality Certificate', status: 'Pending', version: 0, updatedAt: '2025-07-26' },
  { id: 'doc-031', shipmentId: 'ship-011', shipmentReference: 'PL-2025-EX-111', type: 'Commercial Invoice', status: 'Approved', version: 2, updatedAt: '2025-08-17' },
  { id: 'doc-032', shipmentId: 'ship-011', shipmentReference: 'PL-2025-EX-111', type: 'Packing List', status: 'Approved', version: 2, updatedAt: '2025-08-17' },
  { id: 'doc-033', shipmentId: 'ship-011', shipmentReference: 'PL-2025-EX-111', type: 'Bill of Lading', status: 'Approved', version: 1, updatedAt: '2025-08-18' },
  { id: 'doc-034', shipmentId: 'ship-012', shipmentReference: 'PL-2025-EX-112', type: 'Commercial Invoice', status: 'Generated', version: 1, updatedAt: '2025-09-06' },
  { id: 'doc-035', shipmentId: 'ship-012', shipmentReference: 'PL-2025-EX-112', type: 'Packing List', status: 'Generated', version: 1, updatedAt: '2025-09-06' },
  { id: 'doc-036', shipmentId: 'ship-012', shipmentReference: 'PL-2025-EX-112', type: 'Air Waybill', status: 'Approved', version: 2, updatedAt: '2025-09-06' },
  { id: 'doc-037', shipmentId: 'ship-013', shipmentReference: 'PL-2025-EX-113', type: 'Commercial Invoice', status: 'Approved', version: 3, updatedAt: '2025-09-19' },
  { id: 'doc-038', shipmentId: 'ship-013', shipmentReference: 'PL-2025-EX-113', type: 'Packing List', status: 'Approved', version: 3, updatedAt: '2025-09-19' },
  { id: 'doc-039', shipmentId: 'ship-013', shipmentReference: 'PL-2025-EX-113', type: 'Certificate of Origin', status: 'Approved', version: 1, updatedAt: '2025-09-20' },
  { id: 'doc-040', shipmentId: 'ship-014', shipmentReference: 'PL-2025-EX-114', type: 'Commercial Invoice', status: 'Draft', version: 0, updatedAt: '2025-09-26' },
  { id: 'doc-041', shipmentId: 'ship-014', shipmentReference: 'PL-2025-EX-114', type: 'Packing List', status: 'Draft', version: 0, updatedAt: '2025-09-26' },
  { id: 'doc-042', shipmentId: 'ship-014', shipmentReference: 'PL-2025-EX-114', type: 'Phyto Certificate', status: 'Pending', version: 0, updatedAt: '2025-09-27' },
];
