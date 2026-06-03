import { Box, Typography } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import DarkCard from './DarkCard'
import { C } from '../theme'
import { notes, dailyTip } from '../data'

function ShoppingListCard() {
  return (
    <DarkCard
      onClick={() => {}}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.2, background: C.cardDark,
      }}
    >
      <ShoppingCartIcon sx={{ color: C.amberLt, fontSize: 24 }} />
      <Typography sx={{ color: C.amberLt, fontWeight: 600, fontSize: '0.88rem' }}>
        Shopping list
      </Typography>
    </DarkCard>
  )
}

function NotesCard() {
  return (
    <DarkCard sx={{ px: 1.8, py: 1.5, flex: 1 }}>
      <Typography sx={{ color: C.amber, fontWeight: 700, fontSize: '0.8rem', mb: 0.8 }}>
        Notes
      </Typography>
      {notes.map((n, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.8, mb: 0.5 }}>
          <Typography sx={{ color: C.textSec, fontSize: '0.68rem', lineHeight: 1.45, flexShrink: 0 }}>•</Typography>
          <Typography sx={{ color: C.textSec, fontSize: '0.68rem', lineHeight: 1.45 }}>{n}</Typography>
        </Box>
      ))}
    </DarkCard>
  )
}

function DailyTipsCard() {
  return (
    <DarkCard sx={{ px: 1.8, py: 1.5 }}>
      <Typography sx={{ color: C.amber, fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>
        Daily tips
      </Typography>
      <Typography sx={{ color: C.textSec, fontSize: '0.68rem', lineHeight: 1.5 }}>
        {dailyTip}
      </Typography>
    </DarkCard>
  )
}

export default function RightPanel() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
      <ShoppingListCard />
      <NotesCard />
      <DailyTipsCard />
    </Box>
  )
}
