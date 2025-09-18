// Storage utilities for ProList MVP

import type { SavedHsRate } from '@/mocks/seeds';

const STORAGE_PREFIX = 'prolist_mvp_';

export const getStorageKey = (key: string): string => `${STORAGE_PREFIX}${key}`;

export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(getStorageKey(key));
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Specific helpers for saved HS rates
export const getSavedHsRates = (): SavedHsRate[] => {
  return getFromStorage<SavedHsRate[]>('savedHsRates', []);
};

export const setSavedHsRates = (rates: SavedHsRate[]): void => {
  setToStorage('savedHsRates', rates);
};

export const getSavedHsRate = (code: string): SavedHsRate | undefined => {
  const rates = getSavedHsRates();
  return rates.find(r => r.code === code);
};

export const saveHsRate = (code: string, ratePct: number): SavedHsRate => {
  const rates = getSavedHsRates();
  const existingIndex = rates.findIndex(r => r.code === code);
  
  const savedRate: SavedHsRate = {
    code,
    ratePct,
    updated_at: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    rates[existingIndex] = savedRate;
  } else {
    rates.push(savedRate);
  }
  
  setSavedHsRates(rates);
  return savedRate;
};