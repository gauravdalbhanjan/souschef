import { useState } from 'react'
import {
  Box, Typography, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import CalendarMonthIcon      from '@mui/icons-material/CalendarMonth'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import NotificationsIcon      from '@mui/icons-material/Notifications'
import GoBackButton           from './GoBackButton'
import { C } from '../theme'

const initialEvents = [
  {
    id: 1,
    name: 'Independence Day',
    date: 'July 4, 2026',
    status: 'in-progress',
    reminder: true,
    img: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=700&q=80',
  },
  {
    id: 2,
    name: 'Thanksgiving 2026',
    date: 'November 26, 2026',
    status: 'plan',
    reminder: false,
    img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=700&q=80',
  },
  {
    id: 3,
    name: 'Christmas Eve',
    date: 'December 25, 2026',
    status: 'plan',
    reminder: false,
    img: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=700&q=80',
  },
  {
    id: 4,
    name: "New Year's Eve",
    date: 'December 31, 2026',
    status: 'plan',
    reminder: false,
    img: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=700&q=80',
  },
]

function StatusChip({ status, onClick }) {
  const isProgress = status === 'in-progress'
  return (
    <Chip
      icon={
        isProgress
          ? <RadioButtonCheckedIcon sx={{ fontSize: '13px !important', color: '#fff !important', ml: '5px !important' }} />
          : <RadioButtonCheckedIcon sx={{ fontSize: '13px !important', color: '#fff !important', ml: '5px !important' }} />
      }
      label={isProgress ? 'In Progress' : 'Plan'}
      onClick={onClick}
      size="small"
      sx={{
        background: isProgress ? C.amber : 'rgba(255,255,255,.18)',
        color: isProgress ? '#1a1000' : '#fff',
        fontWeight: 700,
        fontSize: '12px',
        height: 26,
        borderRadius: '13px',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  )
}

function ReminderChip({ set, onClick }) {
  return (
    <Chip
      icon={<NotificationsIcon sx={{ fontSize: '13px !important', color: '#fff !important', ml: '5px !important' }} />}
      label={set ? 'Reminder Set' : 'Remind later'}
      onClick={onClick}
      size="small"
      sx={{
        background: set ? C.amber : 'rgba(255,255,255,.18)',
        color: set ? '#1a1000' : '#fff',
        fontWeight: 700,
        fontSize: '12px',
        height: 26,
        borderRadius: '13px',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        '& .MuiChip-label': { px: '6px' },
      }}
    />
  )
}

function EventCard({ event, onToggleStatus, onToggleReminder }) {
  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '20px',
      overflow: 'hidden',
      height: 200,
      mb: '16px',
      flexShrink: 0,
    }}>
      <Box
        component="img"
        src={event.img}
        alt={event.name}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.3) 60%, transparent 100%)',
      }} />

      <Box sx={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '20px', mb: '8px', textShadow: '0 2px 6px rgba(0,0,0,.8)' }}>
          {event.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date chip */}
          <Chip
            icon={<CalendarMonthIcon sx={{ fontSize: '12px !important', color: '#fff !important', ml: '5px !important' }} />}
            label={event.date}
            size="small"
            sx={{
              background: 'rgba(255,255,255,.18)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '12px',
              height: 26,
              borderRadius: '13px',
              backdropFilter: 'blur(4px)',
              '& .MuiChip-label': { px: '6px' },
            }}
          />
          <StatusChip   status={event.status}   onClick={() => onToggleStatus(event.id)} />
          <ReminderChip set={event.reminder}    onClick={() => onToggleReminder(event.id)} />
        </Box>
      </Box>
    </Box>
  )
}

export default function EventsPage({ onBack }) {
  const [events,   setEvents]  = useState(initialEvents)
  const [addOpen,  setAddOpen] = useState(false)

  const toggleStatus = (id) => {
    setEvents(prev => prev.map(e => e.id === id
      ? { ...e, status: e.status === 'in-progress' ? 'plan' : 'in-progress' }
      : e
    ))
  }
  const toggleReminder = (id) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, reminder: !e.reminder } : e))
  }

  return (
    <Box sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#111',
    }}>

      {/* ── Header ── */}
      <Box sx={{ px: '16px', pt: '16px', pb: '10px', flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: '12px' }}>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px' }}>
              Events
            </Typography>
            <Typography sx={{ color: '#666', fontSize: '13px', mt: '2px' }}>
              Upcoming food celebrations
            </Typography>
          </Box>
          <Button
            onClick={() => setAddOpen(true)}
            size="small"
            sx={{
              background: C.amber, color: '#1a1000',
              borderRadius: '20px', textTransform: 'none',
              fontWeight: 700, fontSize: '13px',
              px: '14px', py: '6px',
              '&:hover': { background: C.amberDark },
            }}
          >
            + Add Event
          </Button>
        </Box>
      </Box>

      {/* ── Event cards (scrollable) ── */}
      <Box sx={{
        flex: 1, overflowY: 'auto', px: '16px', pt: '8px',
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {events.map(ev => (
          <EventCard
            key={ev.id}
            event={ev}
            onToggleStatus={toggleStatus}
            onToggleReminder={toggleReminder}
          />
        ))}
        <Box sx={{ height: '8px' }} />
      </Box>

      {/* ── Add event dialog (placeholder) ── */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { background: '#1e1e1e', borderRadius: '20px', p: 1, minWidth: 300 } }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>
          Add New Event
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#aaa', fontSize: '13px' }}>
            Event creation coming soon. Stay tuned!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}
            sx={{ background: C.amber, color: '#1a1000', borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
