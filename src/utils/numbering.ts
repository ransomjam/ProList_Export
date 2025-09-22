// Document numbering utilities

const STORAGE_PREFIX = 'prolist_mvp_';

const getStorageKey = (key: string): string => `${STORAGE_PREFIX}${key}`;

const getCurrentYear = (): string => new Date().getFullYear().toString();

const getStoredCounter = (type: 'invoice' | 'packing_list'): number => {
  const year = getCurrentYear();
  const key = `${type}_counter_${year}`;
  const stored = localStorage.getItem(getStorageKey(key));
  return stored ? parseInt(stored, 10) : 0;
};

const persistCounter = (type: 'invoice' | 'packing_list', value: number): void => {
  const year = getCurrentYear();
  const key = `${type}_counter_${year}`;
  localStorage.setItem(getStorageKey(key), value.toString());
};

const formatNumber = (prefix: string, sequence: number): string => {
  const year = getCurrentYear();
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
};

const getNextNumber = (type: 'invoice' | 'packing_list', prefix: string): string => {
  try {
    const current = getStoredCounter(type);
    const next = current + 1;
    persistCounter(type, next);
    return formatNumber(prefix, next);
  } catch (error) {
    console.error('Failed to generate document number:', error);
    return `${prefix}-${getCurrentYear()}-0001`;
  }
};

const peekNextNumber = (type: 'invoice' | 'packing_list', prefix: string): string => {
  try {
    const current = getStoredCounter(type);
    return formatNumber(prefix, current + 1);
  } catch (error) {
    console.error('Failed to preview document number:', error);
    return `${prefix}-${getCurrentYear()}-0001`;
  }
};

export const nextInvoiceNumber = (): string => getNextNumber('invoice', 'INV');
export const nextPackingListNumber = (): string => getNextNumber('packing_list', 'PKL');

export const previewInvoiceNumber = (): string => peekNextNumber('invoice', 'INV');
export const previewPackingListNumber = (): string => peekNextNumber('packing_list', 'PKL');
