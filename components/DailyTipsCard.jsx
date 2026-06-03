import { Box, Typography } from '@mui/material'
import { C } from '../theme'
import { dailyTip } from '../data'

export default function DailyTipsCard() {
  return (
    <Box sx={{
      background: C.amber,
      borderRadius: '20px',
      p: '8px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <Typography sx={{ color: '#1a1000', fontWeight: 800, fontSize: '20px', mb: 0.7 }}>
        Daily Tips
      </Typography>
      <Typography sx={{ color: '#1a1000', fontSize: '13px', fontWeight: 500, lineHeight: 1.55 }}>
        • {dailyTip}
      </Typography>
    </Box>
  )
}
