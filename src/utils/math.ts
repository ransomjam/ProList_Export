// Mathematical utilities

export const percent = (value: number, pct: number): number => {
  return (value * pct) / 100;
};

export const sum = (...values: number[]): number => {
  return values.reduce((acc, val) => acc + val, 0);
};

export const roundFcfa = (value: number): number => {
  // Round to nearest FCFA (no decimals)
  return Math.round(value);
};

export const safeNumber = (value: unknown): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};