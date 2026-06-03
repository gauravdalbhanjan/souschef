import { Box, Typography } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ScheduleIcon from '@mui/icons-material/Schedule'
import DarkCard from './DarkCard'
import { C } from '../theme'

const stats = [
  { icon: <RestaurantIcon sx={{ color: C.amber, fontSize: 20 }} />, val: '23', label: 'Meals Prepared' },
  { icon: <ScheduleIcon   sx={{ color: C.amber, fontSize: 20 }} />, val: '43h', label: 'Total hours spend' },
]

export default function StatsCard() {
  return (
    <DarkCard sx={{ height: 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {stats.map((s, i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: C.textSec, fontSize: '0.58rem', display: 'block', mb: 0.5 }}>
              {s.label}
            </Typography>
            <Box sx={{
              width: 42, height: 42, borderRadius: '50%',
              border: `2.5px solid ${C.amber}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 0.5,
            }}>
              {s.icon}
            </Box>
            <Typography sx={{ color: C.textPri, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>
              {s.val}
            </Typography>
          </Box>
        ))}
      </Box>
    </DarkCard>
  )
}
