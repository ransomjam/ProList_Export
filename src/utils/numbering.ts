// Document numbering utilities

const STORAGE_PREFIX = 'prolist_mvp_';

const getStorageKey = (key: string): string => `${STORAGE_PREFIX}${key}`;

const getCurrentYear = (): string => new Date().getFullYear().toString();

const getNextNumber = (type: 'invoice' | 'packing_list'): string => {
  const year = getCurrentYear();
  const key = `${type}_counter_${year}`;
  
  try {
    const stored = localStorage.getItem(getStorageKey(key));
    const current = stored ? parseInt(stored, 10) : 0;
    const next = current + 1;
    
    localStorage.setItem(getStorageKey(key), next.toString());
    
    return next.toString().padStart(4, '0');
  } catch (error) {
    console.error('Failed to generate document number:', error);
    return '0001';
  }
};

export const nextInvoiceNumber = (): string => {
  const year = getCurrentYear();
  const number = getNextNumber('invoice');
  return `INV-${year}-${number}`;
};

export const nextPackingListNumber = (): string => {
  const year = getCurrentYear(); 
  const number = getNextNumber('packing_list');
  return `PKL-${year}-${number}`;
};