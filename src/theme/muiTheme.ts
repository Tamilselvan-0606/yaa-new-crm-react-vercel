import { createTheme } from '@mui/material/styles';
import { ThemeConfig, DEFAULT_THEME, getContrastText, adjustBrightness } from './themeConfig';

export const createDynamicMuiTheme = (config: ThemeConfig = DEFAULT_THEME) => {
  const primaryContrast = getContrastText(config.primary);
  const accentContrast = getContrastText(config.accent);
  const bgContrast = getContrastText(config.bg);

  return createTheme({
    palette: {
      primary: {
        main: config.primary,
        dark: adjustBrightness(config.primary, -0.2),
        light: adjustBrightness(config.primary, 0.2),
        contrastText: primaryContrast,
      },
      secondary: {
        main: config.accent,
        dark: adjustBrightness(config.accent, -0.15),
        light: adjustBrightness(config.accent, 0.25),
        contrastText: accentContrast,
      },
      background: {
        default: config.bg,
        paper: config.surface,
      },
      text: {
        primary: bgContrast,
        secondary: bgContrast === '#FFFFFF' ? '#94A3B8' : '#64748B',
      },
      divider: config.border || '#E2E8F0',
    },
    typography: {
      fontFamily: config.fontFamily || 'var(--font-family-base, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      fontSize: 14.5,
      body1: {
        fontSize: '0.95rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.55,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: 4,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.75rem',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            borderRadius: 4,
            padding: '6px 10px',
          },
          arrow: {
            color: '#1E293B',
          },
        },
      },
    },
  });
};

export const muiTheme = createDynamicMuiTheme(DEFAULT_THEME);
