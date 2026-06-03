import { Box, Typography, Paper, Tooltip } from '@mui/material'
import GridViewIcon      from '@mui/icons-material/GridView'
import ShoppingCartIcon  from '@mui/icons-material/ShoppingCart'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonAddIcon     from '@mui/icons-material/PersonAdd'
import { C } from '../theme'

const items = [
  { label: 'menu',      Icon: GridViewIcon,       tip: 'View all meals'        },
  { label: 'Inventory', Icon: ShoppingCartIcon,   tip: 'Check your inventory'  },
  { label: 'Routine',   Icon: CalendarMonthIcon,  tip: 'Daily cooking routine' },
  { label: 'Events',    Icon: PersonAddIcon,      tip: 'Upcoming events'       },
]

export default function BottomNav({ active = 0, onChange }) {
  return (
    <Box sx={{
      flexShrink: 0,
      px: '16px',
      pb: '12px',
      pt: '6px',
      background: '#111',
    }}>
      <Paper
        elevation={4}
        sx={{
          background: '#2a2a2a',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px',
          py: '10px',
        }}
      >
        {items.map(({ label, Icon, tip }, i) => (
          <Tooltip key={i} title={tip} placement="top" arrow>
            <Box
              onClick={() => onChange?.(i)}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', px: '10px', py: '6px',
                borderRadius: '12px',
                background: active === i ? '#3a3a3a' : 'transparent',
                transition: 'background .2s',
                minWidth: 48,
              }}
            >
              <Icon sx={{ color: active === i ? C.amber : '#888', fontSize: 26, transition: 'color .2s' }} />
              <Typography sx={{
                color: active === i ? C.amber : '#888',
                fontSize: '11px', mt: '3px',
                fontWeight: active === i ? 700 : 400,
                transition: 'color .2s',
              }}>
                {label}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Paper>
    </Box>
  )
}
