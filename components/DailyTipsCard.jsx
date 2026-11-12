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
        <TipsAndUpdatesIcon sx={{ color: C.amber, fontSize: 22 }} />
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '19px' }}>
          Daily Tips
        </Typography>
      </Box>
      <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: '13px', fontWeight: 500, lineHeight: 1.55 }}>
        {tip}
      </Typography>
    </Box>
  )
}
