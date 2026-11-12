import { createTheme } from '@mui/material/styles'

// ── SousChef "Liquid Glass" design system ──────────────────────────────────
// Frosted translucent surfaces floating over an animated fluid gradient.
// All surfaces share: rgba fill + backdrop blur + hairline top-lit border.

export const C = {
  // legacy names (kept so existing components keep working)
  bg:        'transparent',
  card:      'rgba(255,255,255,0.06)',
  amber:     '#f5a623',
  amberDark: '#e8960e',
  orange:    '#f5a623',
  red:       '#ff5f6d',
  green:     '#2e9e6b',
  greenBg:   'rgba(46,158,107,0.14)',
  textPri:   '#ffffff',
  textSec:   'rgba(255,255,255,0.62)',
  topCard:   '#f5a623',
  topCardText: '#1a1000',

  // glass palette
  glassBg:      'rgba(255,255,255,0.07)',
  glassBgSoft:  'rgba(255,255,255,0.045)',
  glassBorder:  'rgba(255,255,255,0.14)',
  glassBorderStrong: 'rgba(255,255,255,0.24)',
  shellBg:      'rgba(14,18,26,0.35)',

  // amber liquid-glass (for accent tiles like Timer / To-Do)
  amberGlass:   'rgba(245,166,35,0.22)',
  amberGlassBorder: 'rgba(245,166,35,0.55)',
  amberText:    '#ffd98a',

  // accents
  blue:      '#4d7cff',
  blueDark:  '#3a63d8',
  textFaint: 'rgba(255,255,255,0.42)',
}

// Frosted glass surface generator.
//  tint: 'neutral' | 'amber' | 'green' | 'blue' | 'dark'
//  a:    fill alpha override (optional)
export function glass(tint = 'neutral', { radius = 20, blur = 22, a } = {}) {
  const fills = {
    neutral: `rgba(255,255,255,${a ?? 0.07})`,
    amber:   `rgba(245,166,35,${a ?? 0.2})`,
    green:   `rgba(46,158,107,${a ?? 0.16})`,
    blue:    `rgba(77,124,255,${a ?? 0.22})`,
    dark:    `rgba(14,18,26,${a ?? 0.55})`,
  }
  const borders = {
    neutral: 'rgba(255,255,255,0.14)',
    amber:   'rgba(245,166,35,0.5)',
    green:   'rgba(46,158,107,0.42)',
    blue:    'rgba(77,124,255,0.5)',
    dark:    'rgba(255,255,255,0.1)',
  }
  return {
    background: fills[tint] || fills.neutral,
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
    border: `1px solid ${borders[tint] || borders.neutral}`,
    borderRadius: `${radius}px`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 30px rgba(0,0,0,0.35)',
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
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: C.amber },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiInputLabel-root.Mui-focused': { color: C.amber },
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: 'transparent', paper: 'rgba(255,255,255,0.07)' },
    primary: { main: '#f5a623' },
    secondary: { main: '#4d7cff' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.62)' },
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
          background: 'rgba(20,24,32,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '12px',
        },
        arrow: { color: 'rgba(20,24,32,0.85)' },
      },
    },
  },
})
