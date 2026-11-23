// "Version SC_… [LITE]": the version with the tier pill on its right.
import { Box, Typography } from '@mui/material'
import { T } from '../theme'
import { APP_VERSION } from '../lib/appInfo.js'
import { TIER } from '../lib/features.js'

export default function VersionLine({ align = 'center', sx }) {
  return (
    <Typography component="div" aria-label={`Version ${APP_VERSION}, SousChef ${TIER}`}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '6px', color: 'var(--text-3)', fontSize: `${T.sub}px`, ...sx }}>
      <span aria-hidden>Version {APP_VERSION}</span>
      {TIER && (
        <Box component="span" aria-hidden sx={{ display: 'inline-flex', alignItems: 'center', height: 16, px: '6px', borderRadius: '8px', background: 'var(--accent)', color: 'var(--accent-fg)',
          fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{TIER}</Box>
      )}
    </Typography>
  )
}
