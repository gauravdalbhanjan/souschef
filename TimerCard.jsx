import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import TimerIcon from '@mui/icons-material/Timer'
import { C } from '../theme'

export default function TimerCard() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const handleClick = () => {
    if (running) { setRunning(false); setSeconds(0) }
    else setRunning(true)
  }

  return (
    <Box
      onClick={handleClick}
      sx={{
        background: `linear-gradient(145deg, ${C.amber} 0%, ${C.amberDark} 100%)`,
        borderRadius: '20px',
        p: '8px',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
        boxSizing: 'border-box',
        '&:hover': { filter: 'brightness(1.08)' },
      }}
    >
      <Box sx={{
        width: 46, height: 46, borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TimerIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Box>
      <Typography sx={{
        color: '#1a1000',
        fontWeight: 900,
        fontSize: running ? '1.8rem' : '20px',
        lineHeight: 1.1,
        whiteSpace: 'pre-line',
      }}>
        {running
          ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
          : 'Set\nTime'}
      </Typography>
    </Box>
  )
}
