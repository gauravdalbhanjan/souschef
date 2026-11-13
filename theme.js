import { createTheme } from '@mui/material/styles'

// ── SousChef "Liquid Glass" design system ──────────────────────────────────
// Frosted translucent surfaces floating over an animated fluid gradient.
// All surfaces share: rgba fill + backdrop blur + hairline top-lit border.

export const C = {
  // legacy names (kept so existing components keep working)
  bg:        'transparent',
  card:      'rgba(var(--ink),0.06)',
  // Mirrors --accent in theme.css (MUI palette needs literal colours).
  amber:     '#F59E0B',
  amberDark: '#D97706',
  orange:    '#F59E0B',
  red:       '#ff5f6d',
  green:     '#2e9e6b',
  greenBg:   'rgba(46,158,107,0.14)',
  textPri:   '#ffffff',
  textSec:   'var(--text-2)',
  topCard:   '#F59E0B',
  topCardText: '#1a1000',

  // glass palette
  glassBg:      'rgba(var(--ink),0.07)',
  glassBgSoft:  'rgba(var(--ink),0.045)',
  glassBorder:  'var(--surface-border)',
  glassBorderStrong: 'rgba(var(--ink),0.24)',
  shellBg:      'var(--paper)',

  // amber liquid-glass (for accent tiles like Timer / To-Do)
  amberGlass:   'rgba(var(--accent-rgb),0.22)',
  amberGlassBorder: 'rgba(var(--accent-rgb),0.55)',
  amberText:    '#ffd98a',

  // accents
  blue:      '#4d7cff',
  blueDark:  '#3a63d8',
  textFaint: 'var(--text-3)',
}

// Frosted glass surface generator.
//  tint: 'neutral' | 'amber' | 'green' | 'blue' | 'dark'
//  a:    fill alpha override (optional)
export function glass(tint = 'neutral', { radius = 20, blur = 22, a } = {}) {
  const fills = {
    neutral: a != null ? `rgba(var(--ink),${a})` : 'var(--surface)',
    amber:   `rgba(var(--accent-rgb),${a ?? 0.2})`,
    green:   `rgba(46,158,107,${a ?? 0.16})`,
    blue:    `rgba(77,124,255,${a ?? 0.22})`,
    dark:    `rgba(var(--deep),${a ?? 0.55})`,
  }
  const borders = {
    neutral: 'var(--surface-border)',
    amber:   'rgba(var(--accent-rgb),0.5)',
    green:   'rgba(46,158,107,0.42)',
    blue:    'rgba(77,124,255,0.5)',
    dark:    'var(--surface-border)',
  }
  return {
    background: fills[tint] || fills.neutral,
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
    border: `1px solid ${borders[tint] || borders.neutral}`,
    borderRadius: `${radius}px`,
    boxShadow: 'var(--shadow)',
  }
}

// ── Type + spacing scale ────────────────────────────────────────────────────
// Spec was 12px titles / 10px subtitle / 8px chips with 8px padding. Bumped a
// touch for on-screen readability while keeping the tight, dense hierarchy.
export const T = {
  title:   13,   // card / section titles  (spec 12)
  heading: 20,   // page headings / hero name
  sub:     11,   // subtitles / secondary   (spec 10)
  chip:    10,   // chips / tertiary        (spec 8)
  body:    12,   // body copy
  weightTitle: 700,
  weightBody:  500,
}
export const PAD = 8 // global 8px padding unit

// Shared glass text-field styling for MUI TextField
export const glassField = {
  '& .MuiOutlinedInput-root': {
    background: 'rgba(var(--ink),0.06)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    color: 'var(--fg)',
    '& fieldset': { borderColor: 'rgba(var(--ink),0.14)' },
    '&:hover fieldset': { borderColor: 'rgba(var(--ink),0.3)' },
    '&.Mui-focused fieldset': { borderColor: C.amber },
  },
  '& .MuiInputLabel-root': { color: 'var(--text-2)' },
  '& .MuiInputLabel-root.Mui-focused': { color: C.amber },
}

// Palette values must be real colours (MUI runs alpha()/emphasize() on them),
// so they're concrete per mode; component styles use the CSS tokens instead.
export const makeTheme = (mode = 'dark') => createTheme({
  palette: mode === 'light' ? {
    mode: 'light',
    background: { default: '#F1F4F9', paper: '#ffffff' },
    primary: { main: '#D97706' },
    secondary: { main: '#4F46E5' },
    text: { primary: '#0F172A', secondary: '#475569' },
  } : {
    mode: 'dark',
    background: { default: '#0B0F19', paper: '#111623' },
    primary: { main: '#F59E0B' },
    secondary: { main: '#6366F1' },
    text: { primary: '#F8FAFC', secondary: '#CBD5E1' },
  },
  typography: { fontFamily: "'Montserrat', sans-serif", fontWeightRegular: 400 },
  shape: { borderRadius: 18 },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'var(--paper)',
          color: 'var(--fg)',           // was MUI's default white: invisible on light paper
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(var(--ink),0.12)',
          boxShadow: 'var(--shadow)',
          fontSize: '12px',
          fontWeight: 600,
        },
        arrow: { color: 'var(--paper)' },
      },
    },
  },
})

export const theme = makeTheme('dark')
