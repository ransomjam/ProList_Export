// HS Code utilities

export const abbrHs = (code: string): string => {
  // Add spacing to HS code for readability (e.g., 090111 -> 09 01 11)
  return code.replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3');
};

export const isPhytoHs = (code: string): boolean => {
  // Phytosanitary certificate required for codes starting with 09 or 18
  return code.startsWith('09') || code.startsWith('18');
};

export const formatHsCode = (code: string): string => {
  // Ensure HS code is properly formatted as 6 digits
  return code.padStart(6, '0');
};

export const validateHsCode = (code: string): boolean => {
  // Basic validation for HS code format
  const cleaned = code.replace(/\s/g, '');
  return /^\d{6}$/.test(cleaned);
};