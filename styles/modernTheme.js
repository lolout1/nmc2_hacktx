/**
 * Modern F1 Dashboard Theme
 * Black background with electric blue accents
 * Glass-morphism effects for depth
 */

export const modernTheme = {
  // Colors
  colors: {
    // Primary backgrounds
    bg: {
      primary: '#0a0a0f',      // Deep black
      secondary: '#12121a',    // Lighter black
      tertiary: '#1a1a26',     // Card background
      glass: 'rgba(18, 18, 26, 0.7)', // Glass effect
    },
    
    // Blue accents
    blue: {
      primary: '#00b4ff',      // Electric blue
      secondary: '#0099ff',    // Bright blue
      tertiary: '#0077cc',     // Deep blue
      glow: 'rgba(0, 180, 255, 0.3)', // Glow effect
      dim: 'rgba(0, 180, 255, 0.1)',  // Subtle highlight
    },
    
    // Text
    text: {
      primary: '#ffffff',
      secondary: '#b4b4c8',
      tertiary: '#8080a0',
      dim: '#505060',
    },
    
    // Status colors
    status: {
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff3355',
      info: '#00b4ff',
    },
    
    // Borders
    border: {
      default: 'rgba(0, 180, 255, 0.15)',
      strong: 'rgba(0, 180, 255, 0.3)',
      subtle: 'rgba(255, 255, 255, 0.05)',
    },
  },
  
  // Spacing (in pixels, convert to rem in usage)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // Border radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(0, 180, 255, 0.3)',
    glowStrong: '0 0 40px rgba(0, 180, 255, 0.5)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Backdrop blur
  blur: {
    sm: 'blur(8px)',
    md: 'blur(12px)',
    lg: 'blur(16px)',
  },
  
  // Font sizes
  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    xxl: '24px',
    xxxl: '32px',
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// CSS Custom Properties for global use
export const themeVariables = `
  :root {
    /* Colors */
    --color-bg-primary: ${modernTheme.colors.bg.primary};
    --color-bg-secondary: ${modernTheme.colors.bg.secondary};
    --color-bg-tertiary: ${modernTheme.colors.bg.tertiary};
    --color-bg-glass: ${modernTheme.colors.bg.glass};
    
    --color-blue-primary: ${modernTheme.colors.blue.primary};
    --color-blue-secondary: ${modernTheme.colors.blue.secondary};
    --color-blue-tertiary: ${modernTheme.colors.blue.tertiary};
    --color-blue-glow: ${modernTheme.colors.blue.glow};
    --color-blue-dim: ${modernTheme.colors.blue.dim};
    
    --color-text-primary: ${modernTheme.colors.text.primary};
    --color-text-secondary: ${modernTheme.colors.text.secondary};
    --color-text-tertiary: ${modernTheme.colors.text.tertiary};
    --color-text-dim: ${modernTheme.colors.text.dim};
    
    --color-success: ${modernTheme.colors.status.success};
    --color-warning: ${modernTheme.colors.status.warning};
    --color-error: ${modernTheme.colors.status.error};
    --color-info: ${modernTheme.colors.status.info};
    
    --color-border-default: ${modernTheme.colors.border.default};
    --color-border-strong: ${modernTheme.colors.border.strong};
    --color-border-subtle: ${modernTheme.colors.border.subtle};
    
    /* Spacing */
    --spacing-xs: ${modernTheme.spacing.xs};
    --spacing-sm: ${modernTheme.spacing.sm};
    --spacing-md: ${modernTheme.spacing.md};
    --spacing-lg: ${modernTheme.spacing.lg};
    --spacing-xl: ${modernTheme.spacing.xl};
    --spacing-xxl: ${modernTheme.spacing.xxl};
    
    /* Border Radius */
    --radius-sm: ${modernTheme.radius.sm};
    --radius-md: ${modernTheme.radius.md};
    --radius-lg: ${modernTheme.radius.lg};
    --radius-xl: ${modernTheme.radius.xl};
    --radius-full: ${modernTheme.radius.full};
    
    /* Shadows */
    --shadow-sm: ${modernTheme.shadows.sm};
    --shadow-md: ${modernTheme.shadows.md};
    --shadow-lg: ${modernTheme.shadows.lg};
    --shadow-glow: ${modernTheme.shadows.glow};
    --shadow-glow-strong: ${modernTheme.shadows.glowStrong};
    
    /* Transitions */
    --transition-fast: ${modernTheme.transitions.fast};
    --transition-normal: ${modernTheme.transitions.normal};
    --transition-slow: ${modernTheme.transitions.slow};
    
    /* Blur */
    --blur-sm: ${modernTheme.blur.sm};
    --blur-md: ${modernTheme.blur.md};
    --blur-lg: ${modernTheme.blur.lg};
    
    /* Font Sizes */
    --font-xs: ${modernTheme.fontSize.xs};
    --font-sm: ${modernTheme.fontSize.sm};
    --font-base: ${modernTheme.fontSize.base};
    --font-lg: ${modernTheme.fontSize.lg};
    --font-xl: ${modernTheme.fontSize.xl};
    --font-xxl: ${modernTheme.fontSize.xxl};
    --font-xxxl: ${modernTheme.fontSize.xxxl};
    
    /* Font Weights */
    --font-normal: ${modernTheme.fontWeight.normal};
    --font-medium: ${modernTheme.fontWeight.medium};
    --font-semibold: ${modernTheme.fontWeight.semibold};
    --font-bold: ${modernTheme.fontWeight.bold};
  }
`;

export default modernTheme;

