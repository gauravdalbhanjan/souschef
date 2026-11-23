// SousChef Pro early signup: a link ("Available in SousChef Pro · Early
// signup", primary colour) that opens one sheet (routine pop-up style) with a
// native email form posted to the builder's Google Form.
import { useState } from 'react'
import { Box, Typography, Button, Dialog, DialogContent, TextField, CircularProgress } from '@mui/material'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import { softBackdrop, ctaPrimary } from './Ambient'
import { glassField, T, PAD } from '../theme'
import { openProSignup, closeFeedback, useProSignupOpen, sendProSignup, isEmail } from '../lib/feedback.js'
import { PRO_PITCH } from '../lib/appInfo.js'

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }

// Inline call to action under a locked feature.
export function ProSignupLink({ align = 'center', sx }) {
  return (
    <Box component="button" type="button" onClick={openProSignup} aria-haspopup="dialog"
      sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', textAlign: align,
        color: 'var(--accent-text)', fontWeight: 700, fontSize: `${T.sub}px`, lineHeight: 1.5,
        '&:hover': { textDecoration: 'underline' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2, borderRadius: '6px' }, ...sx }}>
      Available in SousChef Pro · Early signup
    </Box>
  )
}

export function ProSignupDialog() {
  const open = useProSignupOpen()
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const bad = !isEmail(email)
  const close = () => {
    closeFeedback()
    if (status === 'sent') { setEmail(''); setTouched(false); setStatus('idle') }
  }
  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (bad || status === 'sending') return
    setStatus('sending')
    setStatus(await sendProSignup(email) ? 'sent' : 'error')
  }
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="pro-title"
      slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
      <DialogContent sx={{ p: `${PAD * 2.5}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Box aria-hidden sx={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent-text)' }}>
          {status === 'sent' ? <CheckCircleOutlineIcon sx={{ fontSize: 30 }} /> : <WorkspacePremiumOutlinedIcon sx={{ fontSize: 30 }} />}
        </Box>
        <Typography id="pro-title" component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, mt: `${PAD * 1.25}px`, lineHeight: 1.2 }}>
          {status === 'sent' ? 'You\u2019re on the list' : 'Early signup for SousChef Pro'}
        </Typography>
        {status === 'sent' ? (
          <>
            <Typography role="status" sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
              We&rsquo;ll email you when early access opens.
            </Typography>
            <Button fullWidth onClick={close} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>Done</Button>
          </>
        ) : (
          <Box component="form" onSubmit={submit} noValidate sx={{ width: '100%', mt: `${PAD * 1.5}px`, textAlign: 'left' }}>
            <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, lineHeight: 1.5, textAlign: 'center', mb: `${PAD * 2}px` }}>
              {PRO_PITCH} Leave your email for early access.
            </Typography>
            <Typography component="label" htmlFor="pro-email" sx={{ display: 'block', color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, mb: `${PAD * 0.75}px` }}>
              Email <Box component="span" sx={{ color: 'var(--danger)' }}>*</Box>
            </Typography>
            <TextField id="pro-email" type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 254))} onBlur={() => setTouched(true)}
              placeholder="you@example.com" fullWidth required autoComplete="email" error={touched && bad} sx={glassField}
              slotProps={{ htmlInput: { inputMode: 'email', 'aria-required': true, 'aria-describedby': 'pro-help', maxLength: 254 } }} />
            <Typography id="pro-help" sx={{ color: touched && bad ? 'var(--danger)' : 'var(--text-3)', fontSize: `${T.chip}px`, mt: '4px' }}>
              {touched && bad ? (email.trim() ? 'Check the email address.' : 'Please enter your email.') : 'Used only to contact you about SousChef Pro.'}
            </Typography>
            {status === 'error' && (
              <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center', mt: `${PAD}px` }}>
                Couldn&rsquo;t send. Check your connection and try again.
              </Typography>
            )}
            <Button type="submit" fullWidth disabled={status === 'sending'}
              startIcon={status === 'sending' ? <CircularProgress size={16} sx={{ color: 'var(--accent-fg)' }} /> : null}
              sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 2.5}px` }}>
              {status === 'sending' ? 'Sending\u2026' : 'Join early access'}
            </Button>
            <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.chip}px`, textAlign: 'center', mt: `${PAD}px`, lineHeight: 1.5 }}>
              Sent to the builder through Google Forms.
            </Typography>
          </Box>
        )}
        {status !== 'sent' && (
          <Box component="button" type="button" onClick={close}
            sx={{ all: 'unset', cursor: 'pointer', mt: `${PAD * 1.25}px`, color: 'var(--text-2)', fontWeight: 600, fontSize: `${T.body}px`,
              '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>Cancel</Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
