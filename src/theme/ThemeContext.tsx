import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import {
  ThemeConfig,
  DEFAULT_THEME,
  THEME_PRESETS,
  ThemePreset,
  applyThemeToDOM,
  getContrastText,
  getLuminance,
} from './themeConfig';
import { createDynamicMuiTheme } from './muiTheme';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (newTheme: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  applyPreset: (presetId: string) => void;
  presets: ThemePreset[];
  primaryContrast: string;
  accentContrast: string;
  bgContrast: string;
  surfaceContrast: string;
  isBgDark: boolean;
  isPrimaryDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'apex_enterprise_theme_config_v2';

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('apex_enterprise_theme_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fontFamily === '"Poppins", sans-serif' || !parsed.fontFamily) {
          parsed.fontFamily = DEFAULT_THEME.fontFamily;
        }
        return { ...DEFAULT_THEME, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse saved theme', e);
    }
    return DEFAULT_THEME;
  });

  // Apply theme to DOM whenever theme state changes
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const setTheme = (updates: Partial<ThemeConfig>) => {
    setThemeState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const resetTheme = () => {
    setThemeState(DEFAULT_THEME);
  };

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setThemeState(preset.theme);
    }
  };

  const primaryContrast = getContrastText(theme.primary);
  const accentContrast = getContrastText(theme.accent);
  const bgContrast = getContrastText(theme.bg);
  const surfaceContrast = getContrastText(theme.surface);
  const isBgDark = getLuminance(theme.bg) < 0.4;
  const isPrimaryDark = getLuminance(theme.primary) < 0.4;

  const muiThemeInstance = createDynamicMuiTheme(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resetTheme,
        applyPreset,
        presets: THEME_PRESETS,
        primaryContrast,
        accentContrast,
        bgContrast,
        surfaceContrast,
        isBgDark,
        isPrimaryDark,
      }}
    >
      <MuiThemeProvider theme={muiThemeInstance}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};
