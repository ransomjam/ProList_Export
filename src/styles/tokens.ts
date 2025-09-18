// ProList Design Tokens
export const designTokens = {
  // Spacing (8-pt scale)
  spacing: {
    1: '0.25rem', // 4px
    2: '0.5rem',  // 8px
    3: '0.75rem', // 12px
    4: '1rem',    // 16px
    6: '1.5rem',  // 24px
    8: '2rem',    // 32px
    12: '3rem',   // 48px
    16: '4rem',   // 64px
  },

  // Border radius
  radii: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
  },

  // Typography scale
  typography: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.25rem',   // 20px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    '3xl': '2.5rem', // 40px
    '4xl': '3.5rem', // 56px
  },

  // Font weights
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Shadows
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  // Brand colors (converted to HSL)
  colors: {
    primary: 'hsl(199, 95%, 38%)',      // #048ABF
    accentBlue: 'hsl(195, 95%, 40%)',   // #049DBF
    accentTeal: 'hsl(180, 95%, 33%)',   // #03A6A6
    accentGreen: 'hsl(150, 85%, 35%)',  // #0AA66D
    accentMint: 'hsl(145, 85%, 40%)',   // #0FBF6D
  },
} as const;

export type DesignTokens = typeof designTokens;