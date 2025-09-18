// Currency formatting utilities

export const formatFcfa = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' FCFA';
};

export const abbreviateFcfa = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B FCFA`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M FCFA`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K FCFA`;
  }
  return `${value} FCFA`;
};