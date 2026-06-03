import { useState } from 'react'
import {
  Box, Typography, Chip, Modal, IconButton,
  TextField, Button, Snackbar, Avatar,
} from '@mui/material'
import AccessTimeIcon  from '@mui/icons-material/AccessTime'
import CloseIcon       from '@mui/icons-material/Close'
import DragHandleIcon  from '@mui/icons-material/DragHandle'
import AddIcon         from '@mui/icons-material/Add'
import ShareIcon       from '@mui/icons-material/Share'
import { C } from '../theme'
import { todoItems as initialItems } from '../data'

// Sample favorite contacts
const CONTACTS = [
  { name: 'Mom',  initials: 'M',  color: '#e53935' },
  { name: 'Dad',  initials: 'D',  color: '#1565c0' },
  { name: 'Alex', initials: 'A',  color: '#2e7d32' },
  { name: 'Jo',   initials: 'J',  color: '#6a1b9a' },
]

// Convert todoItems (with time chips) to plain editable strings
function itemsToStrings(items) {
  return items.map(it => it.time ? `${it.text} [${it.time}]` : it.text)
}

export default function TodoCard() {
  // Saved list state (shown in the card preview)
  const [savedItems, setSavedItems] = useState(initialItems)
  // Editor open state
  const [open, setOpen] = useState(false)
  // Draft list while editing (plain strings)
  const [draft, setDraft] = useState([])
  // Snackbar
  const [snack, setSnack] = useState({ open: false, msg: '' })

  const openEditor = () => {
    setDraft(itemsToStrings(savedItems))
    setOpen(true)
  }

  const closeEditor = () => setOpen(false)

  const handleSave = () => {
    // Convert plain strings back to todoItems format (no time chips for new items)
    const newItems = draft
      .map(s => s.trim())
      .filter(Boolean)
      .map(text => ({ text, time: null, timeColor: null }))
    setSavedItems(newItems)
    setOpen(false)
  }

  const handleShare = () => {
    const text = draft.filter(Boolean).join('\n')
    if (navigator.share) {
      navigator.share({ title: 'To Do List', text }).catch(() => {})
    } else {
      alert('To Do List:\n\n' + text)
    }
  }

  const handleContactShare = (contact) => {
    setSnack({ open: true, msg: `Shared with ${contact.name}!` })
  }

  const updateItem = (idx, val) => {
    setDraft(d => d.map((item, i) => i === idx ? val : item))
  }

  const deleteItem = (idx) => {
    setDraft(d => d.filter((_, i) => i !== idx))
  }

  const addItem = () => {
    setDraft(d => [...d, ''])
  }

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      fontSize: '15px',
      '& fieldset': { borderColor: 'transparent' },
      '&:hover fieldset': { borderColor: '#333' },
      '&.Mui-focused fieldset': { borderColor: C.amber },
    },
    '& .MuiInputBase-input': { py: '8px', px: '4px' },
  }

  return (
    <>
      {/* ── Dashboard card (clickable preview) ── */}
      <Box
        onClick={openEditor}
        sx={{
          background: C.amber,
          borderRadius: '20px',
          p: '8px',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          cursor: 'pointer',
          '&:hover': { filter: 'brightness(0.95)' },
          transition: 'filter 0.15s',
        }}
      >
        <Typography sx={{ color: '#1a1000', fontWeight: 800, fontSize: '20px', mb: 0.7 }}>
          To Do List:
        </Typography>
        {savedItems.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.45, flexWrap: 'wrap' }}>
            <Typography sx={{ color: '#1a1000', fontSize: '13px', fontWeight: 500 }}>•</Typography>
            <Typography sx={{ color: '#1a1000', fontSize: '13px', fontWeight: 500 }}>{item.text}</Typography>
            {item.time && (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '11px !important', color: '#fff !important' }} />}
                label={item.time}
                size="small"
                sx={{
                  background: item.timeColor,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  height: 20,
                  '& .MuiChip-label': { px: 0.7 },
                }}
              />
            )}
          </Box>
        ))}
      </Box>

      {/* ── Bottom-sheet editor modal ── */}
      <Modal
        open={open}
        onClose={closeEditor}
        sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '100%',
          maxWidth: 648,
          maxHeight: '90dvh',
          background: '#1a1a1a',
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
          animation: 'slideUp 0.25s ease-out',
          '@keyframes slideUp': {
            from: { transform: 'translateY(100%)' },
            to:   { transform: 'translateY(0)' },
          },
        }}>
          {/* Drag handle hint */}
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: '10px', pb: '2px', flexShrink: 0 }}>
            <Box sx={{ width: 40, height: 4, background: '#444', borderRadius: 2 }} />
          </Box>

          {/* Header */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: '20px', py: '12px', flexShrink: 0,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '20px' }}>
              To Do List
            </Typography>
            <IconButton onClick={closeEditor} sx={{ color: '#888' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Editable list */}
          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            px: '16px',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {draft.map((item, idx) => (
              <Box key={idx} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid #2a2a2a',
                py: '2px',
              }}>
                {/* Drag handle */}
                <DragHandleIcon sx={{ color: '#444', fontSize: 22, flexShrink: 0 }} />

                {/* Editable text */}
                <TextField
                  value={item}
                  onChange={e => updateItem(idx, e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Task..."
                  sx={fieldSx}
                  autoFocus={idx === draft.length - 1 && item === ''}
                />

                {/* Delete */}
                <IconButton
                  onClick={() => deleteItem(idx)}
                  size="small"
                  sx={{ color: '#555', flexShrink: 0, '&:hover': { color: '#e57373' } }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}

            {/* Add item */}
            <Box
              onClick={addItem}
              sx={{
                display: 'flex', alignItems: 'center', gap: '8px',
                py: '14px', px: '4px', cursor: 'pointer',
                color: '#666',
                '&:hover': { color: C.amber },
                transition: 'color 0.15s',
              }}
            >
              <AddIcon sx={{ fontSize: 20 }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'inherit' }}>
                Add task
              </Typography>
            </Box>
          </Box>

          {/* Bottom action bar */}
          <Box sx={{
            px: '16px',
            pb: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            pt: '12px',
            flexShrink: 0,
            borderTop: '1px solid #2a2a2a',
          }}>
            {/* Save + Share buttons */}
            <Box sx={{ display: 'flex', gap: '12px', mb: '16px' }}>
              <Button
                onClick={handleSave}
                variant="contained"
                fullWidth
                sx={{
                  background: C.amber,
                  color: '#1a1000',
                  fontWeight: 800,
                  borderRadius: '30px',
                  textTransform: 'none',
                  fontSize: '15px',
                  py: '10px',
                  '&:hover': { background: C.amberDark },
                }}
              >
                Save
              </Button>
              <Button
                onClick={handleShare}
                variant="outlined"
                fullWidth
                startIcon={<ShareIcon />}
                sx={{
                  color: '#fff',
                  borderColor: '#444',
                  borderRadius: '30px',
                  textTransform: 'none',
                  fontSize: '15px',
                  py: '10px',
                  '&:hover': { borderColor: '#888', background: '#2a2a2a' },
                }}
              >
                Share
              </Button>
            </Box>

            {/* Favorite contacts */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Typography sx={{ color: '#555', fontSize: '12px', fontWeight: 600 }}>
                Favorite Contacts
              </Typography>
              {CONTACTS.map(contact => (
                <Box
                  key={contact.name}
                  onClick={() => handleContactShare(contact)}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '4px', cursor: 'pointer',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 42, height: 42,
                      background: contact.color,
                      fontWeight: 700,
                      fontSize: '15px',
                      '&:hover': { opacity: 0.85, transform: 'scale(1.08)' },
                      transition: 'transform 0.15s, opacity 0.15s',
                    }}
                  >
                    {contact.initials}
                  </Avatar>
                  <Typography sx={{ color: '#666', fontSize: '10px' }}>
                    {contact.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        message={snack.msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            background: '#333',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: 600,
          },
        }}
      />
    </>
  )
}
