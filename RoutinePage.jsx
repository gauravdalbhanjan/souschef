import { useState } from 'react'
import {
  Box, Typography, Button, Dialog,
  DialogTitle, DialogContent, DialogActions,
  TextField, useMediaQuery, useTheme,
} from '@mui/material'
import EditIcon     from '@mui/icons-material/Edit'
import GoBackButton from './GoBackButton'
import { C } from '../theme'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const initialRoutines = [
  {
    id: 1,
    meal: 'Breakfast',
    time: '7 - 8:00 AM',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700&q=80',
  },
  {
    id: 2,
    meal: 'Dinner',
    time: '5:30 - 6:30 PM',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=700&q=80',
  },
  {
    id: 3,
    meal: 'Lunch',
    time: '12:00 - 1:00 PM',
    activeDays: [1, 2, 3, 4, 5],
    img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
  },
]

function RoutineCard({ routine, onEdit, onToggleDay }) {
  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '20px',
      overflow: 'hidden',
      height: 190,
      mb: '16px',
    }}>
      <Box
        component="img"
        src={routine.img}
        alt={routine.meal}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.35) 60%, transparent 100%)',
      }} />
      <Box sx={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
        <Typography sx={{ color: '#ddd', fontWeight: 600, fontSize: '14px', mb: '2px' }}>
          {routine.meal}
        </Typography>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '26px', lineHeight: 1.1, mb: '10px' }}>
          {routine.time}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => (
            <Box
              key={i}
              onClick={() => onToggleDay(routine.id, i)}
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                background: routine.activeDays.includes(i) ? '#fff' : 'rgba(255,255,255,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background .15s',
              }}
            >
              <Typography sx={{
                color: routine.activeDays.includes(i) ? '#111' : 'rgba(255,255,255,.5)',
                fontSize: '11px', fontWeight: 800, pointerEvents: 'none',
              }}>
                {d}
              </Typography>
            </Box>
          ))}
          <Button
            onClick={() => onEdit(routine)}
            startIcon={<EditIcon sx={{ fontSize: '12px !important' }} />}
            size="small"
            sx={{
              background: 'rgba(255,255,255,.18)', color: '#fff',
              borderRadius: '20px', textTransform: 'none',
              fontWeight: 600, fontSize: '12px',
              px: '10px', py: '3px', ml: '2px',
              backdropFilter: 'blur(4px)',
              '&:hover': { background: 'rgba(255,255,255,.28)' },
            }}
          >
            Edit Plan
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default function RoutinePage({ onBack }) {
  const muiTheme  = useTheme()
  const isMobile  = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const [routines, setRoutines] = useState(initialRoutines)
  const [editing,  setEditing]  = useState(null)
  const [editTime, setEditTime] = useState('')

  const openEdit = (r) => { setEditing(r); setEditTime(r.time) }
  const saveEdit = () => {
    setRoutines(prev => prev.map(r => r.id === editing.id ? { ...r, time: editTime } : r))
    setEditing(null)
  }
  const toggleDay = (routineId, dayIdx) => {
    setRoutines(prev => prev.map(r => {
      if (r.id !== routineId) return r
      const days = r.activeDays.includes(dayIdx)
        ? r.activeDays.filter(d => d !== dayIdx)
        : [...r.activeDays, dayIdx]
      return { ...r, activeDays: days }
    }))
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#111' }}>

      {/* ── Header ── */}
      <Box sx={{ px: '16px', pt: '16px', pb: '10px', flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '20px', mt: '12px' }}>
          Routine
        </Typography>
        <Typography sx={{ color: '#666', fontSize: '13px', mt: '2px' }}>
          Your daily meal schedule
        </Typography>
      </Box>

      {/* ── Cards ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: '16px', pt: '4px', '&::-webkit-scrollbar': { display: 'none' } }}>
        {routines.map(r => (
          <RoutineCard key={r.id} routine={r} onEdit={openEdit} onToggleDay={toggleDay} />
        ))}
        <Box sx={{ height: '8px' }} />
      </Box>

      {/* ── Edit dialog ── */}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        PaperProps={{ sx: { background: '#1e1e1e', borderRadius: '20px', p: 1, minWidth: 300 } }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>
          Edit {editing?.meal} Plan
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#aaa', fontSize: '13px', mb: 1.5 }}>Time slot</Typography>
          <TextField
            fullWidth value={editTime}
            onChange={e => setEditTime(e.target.value)}
            placeholder="e.g. 7 - 8:00 AM"
            variant="outlined" size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff', borderRadius: '12px',
                '& fieldset': { borderColor: '#333' },
                '&:hover fieldset': { borderColor: C.amber },
                '&.Mui-focused fieldset': { borderColor: C.amber },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setEditing(null)} sx={{ color: '#888', textTransform: 'none', borderRadius: '12px' }}>
            Cancel
          </Button>
          <Button onClick={saveEdit}
            sx={{ background: C.amber, color: '#1a1000', borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
