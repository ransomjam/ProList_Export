import type { BrandSettings } from "@/mocks/types";
import { getFromStorage, setToStorage } from "@/utils/storage";

const STORAGE_KEY = "brand_settings";
const THEME_STORAGE_KEY = "theme_preference";

const isBrowser = typeof window !== "undefined";
const isDocument = typeof document !== "undefined";

export type ThemePreference = "light" | "dark";

const getSystemThemePreference = (): ThemePreference => {
  if (!isBrowser) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getThemePreference = (): ThemePreference => {
  const stored = getFromStorage<ThemePreference | null>(THEME_STORAGE_KEY, null);
  return stored ?? getSystemThemePreference();
};

export const applyThemePreference = (theme: ThemePreference) => {
  if (!isDocument) {
    return;
  }

  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
};

export const persistThemePreference = (theme: ThemePreference) => {
  if (!isBrowser) {
    return;
  }

  setToStorage(THEME_STORAGE_KEY, theme);
};

export const ensureInitialThemeApplied = () => {
  const theme = getThemePreference();
  applyThemePreference(theme);
};

type HslTuple = {
  h: number;
  s: number;
  l: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalised = hex.replace("#", "");
  if (!(normalised.length === 6 || normalised.length === 3)) {
    return null;
  }

  const full = normalised.length === 3
    ? normalised.split("").map(ch => ch + ch).join("")
    : normalised;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some(v => Number.isNaN(v))) {
    return null;
  }

  return { r, g, b };
};

const rgbToHsl = (rgb: { r: number; g: number; b: number }): HslTuple => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hexToHsl = (hex: string): HslTuple | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
};

const hslTupleToString = (tuple: HslTuple): string => `${tuple.h} ${tuple.s}% ${tuple.l}%`;

const determineForeground = (tuple: HslTuple): string => {
  // Relative luminance approximation using lightness as heuristic
  return tuple.l > 60 ? "0 0% 12%" : "0 0% 100%";
};

const adjustLightness = (tuple: HslTuple, amount: number): string => {
  const adjusted = { ...tuple, l: clamp(tuple.l + amount, 0, 98) };
  return hslTupleToString(adjusted);
};

const setCssVar = (name: string, value: string) => {
  document.documentElement.style.setProperty(name, value);
};

export function applyBrandToCssVars(brand: BrandSettings) {
  const entries: Array<[string, string]> = [
    ["--brand-primary", brand.primary],
    ["--brand-blue", brand.accentBlue],
    ["--brand-teal", brand.accentTeal],
    ["--brand-green", brand.accentGreen],
    ["--brand-mint", brand.accentMint],
  ];

  entries.forEach(([name, value]) => setCssVar(name, value));

  const primaryHsl = hexToHsl(brand.primary);
  if (primaryHsl) {
    const base = hslTupleToString(primaryHsl);
    setCssVar("--primary", base);
    setCssVar("--ring", base);
    setCssVar("--sidebar-primary", base);

    const hover = adjustLightness(primaryHsl, -8);
    const light = adjustLightness(primaryHsl, 35);

    setCssVar("--primary-hover", hover);
    setCssVar("--primary-light", light);
    setCssVar("--primary-foreground", determineForeground(primaryHsl));
    setCssVar("--sidebar-ring", base);

    const contrast = determineForeground(primaryHsl) === "0 0% 12%" ? "#111827" : "#FFFFFF";
    setCssVar("--brand-primary-contrast", contrast);
    setCssVar("--brand-primary-hover", `hsl(${hover})`);
  }

  const accentMap: Array<[string, string]> = [
    ["--accent-blue", brand.accentBlue],
    ["--accent-teal", brand.accentTeal],
    ["--accent-green", brand.accentGreen],
    ["--accent-mint", brand.accentMint],
  ];

  accentMap.forEach(([name, value]) => {
    const hsl = hexToHsl(value);
    if (hsl) {
      setCssVar(name, hslTupleToString(hsl));
    }
  });
}

export const getInitialBrandSettings = (): BrandSettings => {
  const stored = getFromStorage<BrandSettings | null>(STORAGE_KEY, null);
  if (stored) {
    return stored;
  }
  return {
    primary: "#048ABF",
    accentBlue: "#049DBF",
    accentTeal: "#03A6A6",
    accentGreen: "#0AA66D",
    accentMint: "#0FBF6D",
  };
};

export const ensureInitialBrandApplied = () => {
  const brand = getInitialBrandSettings();
  applyBrandToCssVars(brand);
};
