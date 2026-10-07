// Central Theme & Color Configuration
// Any color change here or via ThemeProvider automatically updates the entire website,
// and automatically calculates contrast text (Light text for dark backgrounds, Dark text for light backgrounds).

export interface ThemeConfig {
  fontFamily: string;
  primary: string; // Brand Primary Color (e.g. #33077C)
  accent: string; // Brand Accent/Action Color (e.g. #4309A2)
  bg: string; // Main Application Canvas Background (e.g. #F5F7FA)
  surface: string; // Card / Panel / Modal Surface Background (e.g. #FFFFFF)
  border?: string; // Border / Divider Color
}

export const DEFAULT_THEME: ThemeConfig = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  primary: '#33077C',
  accent: '#4309A2',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Apex Imperial (Deep Purple & Orange)',
    description: 'Corporate executive purple with high-energy amber accents',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#33077C',
      accent: '#4309A2',
      bg: '#F5F7FA',
      surface: '#FFFFFF',
      border: '#E2E8F0',
    },
  },
  {
    id: 'slate-blue',
    name: 'Modern Slate & Electric Indigo',
    description: 'Crisp technical tech enterprise styling',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#0F172A',
      accent: '#6366F1',
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
    },
  },
  {
    id: 'emerald-dark',
    name: 'Midnight Emerald & Gold',
    description: 'Deep forest green luxury with gilded gold actions',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#064E3B',
      accent: '#F59E0B',
      bg: '#F0FDF4',
      surface: '#FFFFFF',
      border: '#DCFCE7',
    },
  },
  {
    id: 'crimson-teal',
    name: 'Crimson Wine & Cyan',
    description: 'Bold burgundy wine with sharp cyan highlight contrast',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#4C0519',
      accent: '#06B6D4',
      bg: '#FFF1F2',
      surface: '#FFFFFF',
      border: '#FFE4E6',
    },
  },
  {
    id: 'light-minimal',
    name: 'Clean Minimal Light (Light Primary Test)',
    description: 'Demonstrates automatic dark text on light primary backgrounds',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#E2E8F0', // Light slate primary
      accent: '#2563EB',
      bg: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#CBD5E1',
    },
  },
  {
    id: 'dark-canvas',
    name: 'Dark Enterprise Canvas',
    description: 'Full dark mode canvas with automatic light text everywhere',
    theme: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '#1E1B4B',
      accent: '#F97316',
      bg: '#0F172A',
      surface: '#1E293B',
      border: '#334155',
    },
  },
];

/**
 * Standard WCAG Relative Luminance Calculation
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function getLuminance(hexColor: string): number {
  if (!hexColor) return 0.5;
  const hex = hexColor.replace('#', '').trim();
  if (hex.length !== 6 && hex.length !== 3) return 0.5;

  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Calculates optimal contrast text color (like MUI getContrastText).
 * If background is light (high luminance), returns dark text (#0F172A).
 * If background is dark (low luminance), returns white text (#FFFFFF).
 */
export function getContrastText(
  hexColor: string,
  darkText: string = '#0F172A',
  lightText: string = '#FFFFFF'
): string {
  const luminance = getLuminance(hexColor);
  // Threshold 0.38 provides optimal legibility according to WCAG AA guidelines
  return luminance > 0.38 ? darkText : lightText;
}

/**
 * Converts Hex to RGB components
 */
export function hexToRgb(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16) || 0,
      g: parseInt(hex[1] + hex[1], 16) || 0,
      b: parseInt(hex[2] + hex[2], 16) || 0,
    };
  }
  return {
    r: parseInt(hex.substring(0, 2), 16) || 0,
    g: parseInt(hex.substring(2, 4), 16) || 0,
    b: parseInt(hex.substring(4, 6), 16) || 0,
  };
}

/**
 * Adjusts color brightness (positive percent = lighter, negative percent = darker)
 */
export function adjustBrightness(hexColor: string, percent: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  const adjust = (val: number) => {
    const res = percent > 0 ? val + (255 - val) * percent : val * (1 + percent);
    return Math.min(255, Math.max(0, Math.round(res)));
  };
  const nr = adjust(r).toString(16).padStart(2, '0');
  const ng = adjust(g).toString(16).padStart(2, '0');
  const nb = adjust(b).toString(16).padStart(2, '0');
  return `#${nr}${ng}${nb}`;
}

/**
 * Creates rgba string with specified opacity
 */
export function hexToRgba(hexColor: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Applies theme variables and calculated contrast text to document :root
 */
export function applyThemeToDOM(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Font
  if (theme.fontFamily) {
    root.style.setProperty('--font-family-base', theme.fontFamily);
  }

  // Primary
  const primaryContrast = getContrastText(theme.primary);
  const primaryDark = adjustBrightness(theme.primary, -0.25);
  const primaryLight = adjustBrightness(theme.primary, 0.25);
  const primarySurface = adjustBrightness(theme.primary, 0.1);
  const primarySubtle = hexToRgba(theme.primary, 0.08);

  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-contrast', primaryContrast);
  root.style.setProperty('--primary-dark', primaryDark);
  root.style.setProperty('--primary-light', primaryLight);
  root.style.setProperty('--primary-surface', primarySurface);
  root.style.setProperty('--primary-subtle', primarySubtle);

  // Accent
  const accentContrast = getContrastText(theme.accent);
  const accentHover = adjustBrightness(theme.accent, -0.15);
  const accentLight = adjustBrightness(theme.accent, 0.35);
  const accentDark = adjustBrightness(theme.accent, -0.25);
  const accentSubtle = hexToRgba(theme.accent, 0.12);

  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-contrast', accentContrast);
  root.style.setProperty('--accent-hover', accentHover);
  root.style.setProperty('--accent-light', accentLight);
  root.style.setProperty('--accent-dark', accentDark);
  root.style.setProperty('--accent-subtle', accentSubtle);

  // Canvas Background
  const bgContrast = getContrastText(theme.bg);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--bg-contrast', bgContrast);

  // Surface / Cards
  const surfaceContrast = getContrastText(theme.surface);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-contrast', surfaceContrast);

  // Borders & Text
  const isBgDark = getLuminance(theme.bg) < 0.4;
  const borderColor = theme.border || (isBgDark ? '#334155' : '#E2E8F0');
  const textMuted = isBgDark ? '#94A3B8' : '#64748B';

  root.style.setProperty('--border', borderColor);
  root.style.setProperty('--text', bgContrast);
  root.style.setProperty('--text-muted', textMuted);

  // Update body background and color directly
  document.body.style.backgroundColor = theme.bg;
  document.body.style.color = bgContrast;
}
