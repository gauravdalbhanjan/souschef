import { Button } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

export default function GoBackButton({ onClick }) {
  return (
    <Button
      onClick={onClick}
      startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '13px !important' }} />}
      sx={{
        background: 'rgba(60,60,70,0.88)',
        color: '#fff',
        borderRadius: '20px',
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '14px',
        px: '16px',
        py: '7px',
        backdropFilter: 'blur(6px)',
        '&:hover': { background: 'rgba(80,80,90,0.95)' },
      }}
    >
      Go Back
    </Button>
  )
}
