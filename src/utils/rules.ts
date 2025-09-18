// Document requirement rules engine

import type { ShipmentWithItems, Product } from '@/mocks/seeds';

export type DocKey =
  | 'COO'
  | 'PHYTO'
  | 'INSURANCE'
  | 'INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'CUSTOMS_EXPORT_DECLARATION';

export interface DocumentRequirement {
  required: DocKey[];
  reasons: Partial<Record<DocKey, string>>;
}

const EU_COUNTRIES = ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'GR', 'IE', 'FI', 'SE', 'DK', 'LU', 'CY', 'MT', 'SI', 'SK', 'EE', 'LV', 'LT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR'];

const AGRICULTURAL_HS_PREFIXES = ['09', '18', '10', '11', '12', '07', '08'];

export const evaluateRules = (
  shipment: ShipmentWithItems,
  products: Product[]
): DocumentRequirement => {
  const required: DocKey[] = [];
  const reasons: Partial<Record<DocKey, string>> = {};

  // Extract destination country from route (assumes format "CM → COUNTRY")
  const destinationMatch = shipment.route.match(/→\s*([A-Z]{2})/);
  const destination = destinationMatch ? destinationMatch[1] : '';

  // Rule 1: COO required if destination in EU
  if (EU_COUNTRIES.includes(destination)) {
    required.push('COO');
    reasons.COO = `Certificate of Origin required for EU destination (${destination})`;
  }

  // Rule 2: Phytosanitary required if any product has agricultural HS code
  const hasAgriculturalProducts = shipment.items?.some(item => {
    const product = products.find(p => p.id === item.product_id);
    return product && AGRICULTURAL_HS_PREFIXES.some(prefix => 
      product.hs_code.startsWith(prefix)
    );
  });

  if (hasAgriculturalProducts) {
    required.push('PHYTO');
    reasons.PHYTO = 'Phytosanitary certificate required for agricultural products';
  }

  // Rule 3: Insurance required if Incoterm is CIF or CIP
  if (['CIF', 'CIP'].includes(shipment.incoterm)) {
    required.push('INSURANCE');
    reasons.INSURANCE = `Insurance certificate required for ${shipment.incoterm} terms`;
  }

  return { required, reasons };
};