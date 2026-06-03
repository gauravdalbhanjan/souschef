import { Paper } from '@mui/material'
import { C } from '../theme'

export default function DarkCard({ children, sx = {}, onClick, highlight = false }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        background: highlight
          ? `linear-gradient(135deg, ${C.orange} 0%, #7a4e08 100%)`
          : C.card,
        borderRadius: 3,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': onClick
          ? { transform: 'scale(1.02)', boxShadow: '0 6px 24px rgba(0,0,0,.6)' }
          : {},
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}
