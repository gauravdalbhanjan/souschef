import { Box, Typography } from '@mui/material'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { C, glass } from '../theme'
import { dailyTip } from '../data'

export default function DailyTipsCard({ empty = false }) {
  const tip = empty
    ? 'Start adding your pantry items to see ready-to-cook meals.'
    : dailyTip
  return (
    <Box sx={{
      ...glass('amber', { radius: 20, blur: 20 }),
      p: '12px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.9 }}>
        <TipsAndUpdatesIcon sx={{ color: 'var(--accent-text)', fontSize: 18 }} />
        <Typography sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: '16px' }}>
          Daily Tip
        </Typography>
      </Box>
      <Typography sx={{ color: 'rgba(var(--ink),0.82)', fontSize: '12px', fontWeight: 500, lineHeight: 1.45 }}>
        {tip}
      </Typography>
    </Box>
  )
}
