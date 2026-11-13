import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import TimerIcon from '@mui/icons-material/Timer'
import { C, glass } from '../theme'

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
        ...glass('amber', { radius: 20, blur: 20, a: running ? 0.3 : 0.2 }),
        p: '12px',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'background .3s, filter .15s',
        '&:hover': { filter: 'brightness(1.12)' },
      }}
    >
      <Box sx={{
        width: 46, height: 46, borderRadius: '50%',
        background: 'rgba(var(--ink),0.14)',
        border: '1px solid rgba(var(--ink),0.28)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TimerIcon sx={{ color: 'var(--accent-text)', fontSize: 28 }} />
      </Box>
      <Typography sx={{
        color: 'var(--fg)',
        fontWeight: 900,
        fontSize: running ? '1.9rem' : '20px',
        lineHeight: 1.1,
        whiteSpace: 'pre-line',
        textShadow: '0 2px 12px rgba(var(--accent-rgb),0.5)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {running
          ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
          : 'Set\nTime'}
      </Typography>
    </Box>
  )
}
