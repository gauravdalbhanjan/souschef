import { Box, Typography } from '@mui/material'
import DarkCard from './DarkCard'
import { C } from '../theme'

export default function LastMadeCard() {
  return (
    <DarkCard sx={{ height: 130, position: 'relative' }}>
      <Box
        component="img"
        src="https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80"
        alt="Bacon ham sandwich"
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }}
      />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.2) 100%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{ position: 'absolute', top: 8, left: 10 }}>
        <Typography variant="caption" sx={{ color: C.textSec, fontSize: '0.6rem', display: 'block' }}>
          Last made
        </Typography>
        <Typography variant="caption" sx={{ color: C.textPri, fontWeight: 700, fontSize: '0.72rem' }}>
          Bacon ham sandwich
        </Typography>
      </Box>
    </DarkCard>
  )
}
