// Mock data seeds for ProList

import type { DocKey } from '@/utils/rules';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'exporter_admin' | 'broker' | 'finance' | 'viewer';
}

export interface Shipment {
  id: string;
  reference: string;
  buyer: string;
  incoterm: 'FOB' | 'CIF' | 'CIP';
  mode: 'SEA' | 'AIR' | 'ROAD';
  route: string;
  value_fcfa: number;
  status: 'draft' | 'submitted' | 'cleared';
  updated_at: string;
}

export interface KPI {
  label: string;
  value: string;
  trend: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  hs_code: string;
  unit_price_fcfa: number;
  weight_kg?: number;
}

export interface Partner {
  id: string;
  name: string;
  country: string;
  type: 'buyer' | 'supplier';
  address?: string;
}

export type DocStatus = 'required' | 'generated' | 'approved' | 'rejected';

export interface DocVersion {
  id: string;
  version: number;
  created_at: string;
  created_by: string;
  fileDataUrl: string;
  fileName: string;
  note?: string;
}

export interface ShipmentDocument {
  id: string;
  shipment_id: string;
  doc_key: DocKey;
  status: DocStatus;
  current_version?: number;
  versions: DocVersion[];
}

export interface Company {
  name: string;
  address: string;
  tin: string;
}

export interface HsCode {
  code: string;
  description: string;
  uom: string;
  defaultDutyRate: number;
}

export interface SavedHsRate {
  code: string;
  ratePct: number;
  updated_at: string;
}

export interface ShipmentItem {
  id: string;
  product_id: string;
  quantity: number;
}

export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

// Seed users
export const seedUsers: User[] = [
  { 
    id: 'u_1', 
    email: 'jam@prolist.example', 
    name: 'Jam Ransom', 
    role: 'exporter_admin' 
  },
  { 
    id: 'u_2', 
    email: 'broker@prolist.example', 
    name: 'Alex Broker', 
    role: 'broker' 
  },
  { 
    id: 'u_3', 
    email: 'finance@prolist.example', 
    name: 'Sam Finance', 
    role: 'finance' 
  },
];

// Seed shipments
export const seedShipments: ShipmentWithItems[] = [
  { 
    id: 's_5001', 
    reference: 'PL-2025-EX-0001', 
    buyer: 'EuroFoods SARL', 
    incoterm: 'FOB', 
    mode: 'SEA', 
    route: 'CM → FR', 
    value_fcfa: 54000000, 
    status: 'draft',    
    updated_at: '2025-09-10',
    items: [
      { id: 'item_1', product_id: 'p_1', quantity: 200 },
      { id: 'item_2', product_id: 'p_2', quantity: 100 }
    ]
  },
  { 
    id: 's_5002', 
    reference: 'PL-2025-EX-0002', 
    buyer: 'Nordic Trade AB', 
    incoterm: 'CIP', 
    mode: 'AIR', 
    route: 'CM → SE', 
    value_fcfa: 18500000, 
    status: 'submitted',
    updated_at: '2025-09-12',
    items: [
      { id: 'item_3', product_id: 'p_2', quantity: 50 }
    ]
  },
  { 
    id: 's_5003', 
    reference: 'PL-2025-EX-0003', 
    buyer: 'Mediterraneo SpA',
    incoterm: 'CIF', 
    mode: 'SEA', 
    route: 'CM → IT', 
    value_fcfa: 33300000, 
    status: 'cleared',  
    updated_at: '2025-09-14',
    items: [
      { id: 'item_4', product_id: 'p_3', quantity: 25 }
    ]
  },
  { 
    id: 's_5004', 
    reference: 'PL-2025-EX-0004', 
    buyer: 'Atlantic Imports Ltd', 
    incoterm: 'FOB', 
    mode: 'SEA', 
    route: 'CM → UK', 
    value_fcfa: 28700000, 
    status: 'submitted',
    updated_at: '2025-09-15',
    items: [
      { id: 'item_5', product_id: 'p_1', quantity: 150 }
    ]
  },
  { 
    id: 's_5005', 
    reference: 'PL-2025-EX-0005', 
    buyer: 'German Trading GmbH', 
    incoterm: 'CIP', 
    mode: 'AIR', 
    route: 'CM → DE', 
    value_fcfa: 42000000, 
    status: 'draft',
    updated_at: '2025-09-16',
    items: [
      { id: 'item_6', product_id: 'p_2', quantity: 80 },
      { id: 'item_7', product_id: 'p_3', quantity: 30 }
    ]
  },
];

// Seed products
export const seedProducts: Product[] = [
  {
    id: 'p_1',
    name: 'Cocoa 25kg',
    hs_code: '180100',
    unit_price_fcfa: 85000,
    weight_kg: 25,
  },
  {
    id: 'p_2',
    name: 'Coffee 60kg',
    hs_code: '090111',
    unit_price_fcfa: 105000,
    weight_kg: 60,
  },
  {
    id: 'p_3',
    name: 'Timber 1m³',
    hs_code: '440710',
    unit_price_fcfa: 200000,
    weight_kg: 800,
  },
];

// Seed partners
export const seedPartners: Partner[] = [
  { id: 'partner_1', name: 'EuroFoods SARL', country: 'FR', type: 'buyer', address: '12 Rue de la République, 69002 Lyon, France' },
  { id: 'partner_2', name: 'Nordic Trade AB', country: 'SE', type: 'buyer', address: 'Storgatan 15, 111 51 Stockholm, Sweden' },
  { id: 'partner_3', name: 'Mediterraneo SpA', country: 'IT', type: 'buyer', address: 'Via Roma 42, 20121 Milano, Italy' },
  { id: 'partner_4', name: 'Atlantic Imports Ltd', country: 'UK', type: 'buyer', address: '25 King Street, London SW1Y 6QX, United Kingdom' },
  { id: 'partner_5', name: 'German Trading GmbH', country: 'DE', type: 'buyer', address: 'Hauptstraße 123, 10115 Berlin, Germany' },
];

// Seed company data
export const seedCompany: Company = {
  name: 'ProList Manufacturing Ltd',
  address: 'Mile 3 Nkwen, Bamenda, Cameroon',
  tin: 'CM-PL-009988',
};

// Seed HS codes
export const seedHsCodes: HsCode[] = [
  {
    code: '180100',
    description: 'Cocoa beans, whole or broken, raw or roasted',
    uom: 'KG',
    defaultDutyRate: 2.5,
  },
  {
    code: '090111',
    description: 'Coffee, not roasted, not decaffeinated',
    uom: 'KG',
    defaultDutyRate: 3.0,
  },
  {
    code: '440710',
    description: 'Wood sawn lengthwise, sliced or peeled, of tropical wood',
    uom: 'M3',
    defaultDutyRate: 1.5,
  },
  {
    code: '090121',
    description: 'Coffee, roasted, not decaffeinated',
    uom: 'KG',
    defaultDutyRate: 4.0,
  },
  {
    code: '090122',
    description: 'Coffee, roasted, decaffeinated',
    uom: 'KG',
    defaultDutyRate: 4.5,
  },
  {
    code: '180310',
    description: 'Cocoa paste, not defatted',
    uom: 'KG',
    defaultDutyRate: 3.5,
  },
  {
    code: '200819',
    description: 'Nuts and other seeds, prepared or preserved, n.e.s.',
    uom: 'KG',
    defaultDutyRate: 5.0,
  },
  {
    code: '151110',
    description: 'Palm oil, crude',
    uom: 'KG',
    defaultDutyRate: 2.0,
  },
  {
    code: '081320',
    description: 'Prunes, dried',
    uom: 'KG',
    defaultDutyRate: 3.8,
  },
];

// Helper functions
export const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M FCFA`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K FCFA`;
  }
  return `${value} FCFA`;
};

export const calculateKPIs = (shipments: ShipmentWithItems[]): KPI[] => {
  const draft = shipments.filter(s => s.status === 'draft').length;
  const submitted = shipments.filter(s => s.status === 'submitted').length;
  const cleared = shipments.filter(s => s.status === 'cleared').length;
  const totalValue = shipments.reduce((sum, s) => sum + s.value_fcfa, 0);

  return [
    {
      label: 'Draft',
      value: draft.toString(),
      trend: '+2 this week',
      icon: 'FileText',
    },
    {
      label: 'Submitted',
      value: submitted.toString(),
      trend: '+1 this week',
      icon: 'Send',
    },
    {
      label: 'Cleared',
      value: cleared.toString(),
      trend: '+1 this week',
      icon: 'CheckCircle',
    },
    {
      label: 'Total Value',
      value: formatCurrency(totalValue),
      trend: '+15% this month',
      icon: 'DollarSign',
    },
  ];
};