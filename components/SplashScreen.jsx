import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'

// ── Cloche SVG icon (serving dome — replaces "e" in "chef") ────────────────
// Matches the reference: circle on top + dome arc below
function ClocheIcon({ size = 64, color = '#aaa' }) {
  const s = size
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      sx={{ width: s, height: s, display: 'inline-block', flexShrink: 0 }}
    >
      {/* Knob / circle on top */}
      <circle cx="32" cy="12" r="6" fill={color} />
      {/* Dome arc */}
      <path
        d="M8 42 Q8 18 32 18 Q56 18 56 42"
        fill={color}
        stroke="none"
      />
      {/* Base line */}
      <rect x="6" y="42" width="52" height="5" rx="2.5" fill={color} />
    </Box>
  )
}

// ── Logo component ─────────────────────────────────────────────────────────
// "Sous" small, sitting above+left of the large "chef" text
// The "e" in chef is replaced by the cloche icon
// "Cooking made easy" subtitle centered below
// tier: optional pill on the "Sous" line (off by default; the tier shows
// next to the version in Settings and About).
export function Logo({ size = 'large', splashMode = false, tier = null }) {
  // On splash: greys (matching the reference image exactly)
  // On login:  amber accent for "Sous" + icon
  // Theme tokens, so the wordmark stays sharp on light and dark.
  const textColor   = 'var(--fg)'
  const accentColor = 'var(--accent)'
  const sousColor   = 'var(--accent-text)'
  const subColor    = 'var(--text-2)'

  const chSize   = size === 'large' ? 72  : 38
  const sousSize = size === 'large' ? 16  : 10
  const subSize  = size === 'large' ? 14  : 9
  const iconSize = size === 'large' ? 68  : 36

  return (
    // Adaptive wrapper: a soft drop-shadow lifts the hat + wordmark off any canvas.
    <Box role="img" aria-label={`SousChef${tier ? ` ${tier}` : ''}, cooking made easy`}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: splashMode ? 'none' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.22))' }}>

      {/* Row: "Sous" sits top-left relative to the chef text */}
      <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end' }}>

        {/* "Sous" label — positioned top-left of the word */}
        <Typography sx={{
          color: sousColor,
          fontSize: sousSize,
          fontWeight: 600,
          letterSpacing: '0.08em',
          lineHeight: 1,
          position: 'absolute',
          top: size === 'large' ? -20 : -12,
          left: 0,
        }}>
          Sous
        </Typography>

        {/* "ch" */}
        <Typography sx={{
          color: textColor,
          fontSize: chSize,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Georgia', serif",
        }}>
          ch
        </Typography>

        {/* Cloche icon replacing "e" */}
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'flex-end',
          mb: size === 'large' ? '4px' : '2px',
          mx: size === 'large' ? '2px' : '1px',
        }}>
          <ClocheIcon size={iconSize} color={accentColor} />
        </Box>

        {/* "f" */}
        <Typography sx={{
          color: textColor,
          fontSize: chSize,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "'Georgia', serif",
        }}>
          f
        </Typography>

        {/* Tier pill: on the same line as "Sous", flush with the right edge of
            the wordmark (its centre lines up with the centre of "Sous"). */}
        {tier && (
          <Box component="span" sx={{
            position: 'absolute', right: 0, top: size === 'large' ? -24 : -15,
            px: size === 'large' ? '10px' : '6px', height: size === 'large' ? 24 : 15, display: 'inline-flex', alignItems: 'center',
            borderRadius: '12px', background: accentColor, color: 'var(--accent-fg)',
            fontSize: size === 'large' ? 13 : 8, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
          }}>
            {tier}
          </Box>
        )}
      </Box>

      {/* Subtitle */}
      <Typography sx={{
        color: subColor,
        fontSize: subSize,
        fontWeight: 400,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        mt: size === 'large' ? '12px' : '6px',
      }}>
        Cooking made easy
      </Typography>
    </Box>
  )
}

// ── Splash screen ──────────────────────────────────────────────────────────
// Logo fades in 1.5s → hold → the whole splash (canvas + logo) dissolves 0.5s
// → removed. The overlay itself fades (not just the logo) and nothing on it
// uses filter / backdrop-filter: iOS could leave a filtered logo painted after
// its parent faded out.
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('start') // start | in | out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('in'),  50)    // logo fades in
    const t2 = setTimeout(() => setPhase('out'), 2500)   // everything dissolves
    const t3 = setTimeout(() => onDone(),        3000)   // done (unmounted)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <Box aria-hidden={phase === 'out'} sx={{
      position: 'fixed', inset: 0,
      background: 'var(--canvas)', backgroundColor: 'var(--canvas-base)', // same canvas as the app
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: phase === 'out' ? 0 : 1,
      visibility: phase === 'out' ? 'hidden' : 'visible',
      transition: phase === 'out' ? 'opacity 0.5s ease-out, visibility 0s linear 0.5s' : 'none',
      pointerEvents: phase === 'out' ? 'none' : 'auto',
    }}>
      <Box sx={{ opacity: phase === 'start' ? 0 : 1, transition: 'opacity 1.5s ease-in' }}>
        <Logo size="large" splashMode />
      </Box>
    </Box>
  )
}
