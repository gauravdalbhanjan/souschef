// Feedback: a pill button (same style as Go Back) and one sheet (same style as
// the routine pop-up) with a native form. On Send, the answers are posted to
// the builder's Google Form (lib/appInfo.js FEEDBACK_FORM). Google doesn't
// allow reading the reply from another site (no CORS), so the request is sent
// with mode "no-cors": a network error shows "couldn't send", anything else
// counts as sent.
import { useState } from 'react'
import { Box, Typography, Button, Dialog, DialogContent, TextField, CircularProgress } from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import { softBackdrop, ctaPrimary } from './Ambient'
import { backButtonSx } from './buttonStyles'
import { glassField, T, PAD } from '../theme'
import { closeFeedback, useFeedbackOpen, openFeedback, sendFeedback, FEEDBACK_MAX as MAX } from '../lib/feedback.js'

const sheet = { background: 'var(--paper)', borderRadius: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', backgroundImage: 'none' }

// onPhoto: light-on-photo variant for the recipe hero.
export function FeedbackButton({ onPhoto = false, sx }) {
  return (
    <Button onClick={openFeedback} startIcon={<RateReviewOutlinedIcon sx={{ fontSize: '15px !important' }} />} aria-haspopup="dialog"
      sx={{ ...backButtonSx, ...(onPhoto ? { background: 'rgba(11,15,25,0.5)', borderColor: 'rgba(255,255,255,0.14)', color: '#F8FAFC', '&:hover': { background: 'rgba(11,15,25,0.7)' } } : {}), ...sx }}>
      Feedback
    </Button>
  )
}

function Stars({ value, onChange }) {
  return (
    <Box role="radiogroup" aria-label="Rate your experience, 1 to 5 stars" sx={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= value
        const Icon = on ? StarRoundedIcon : StarOutlineRoundedIcon
        return (
          <Box key={n} component="button" type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange(value === n ? 0 : n)}
            sx={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
              color: on ? 'var(--accent)' : 'var(--text-3)', '&:hover': { background: 'var(--surface-hover)' },
              '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 1 } }}>
            <Icon sx={{ fontSize: 34 }} />
          </Box>
        )
      })}
    </Box>
  )
}

export function FeedbackDialog() {
  const open = useFeedbackOpen()
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [touched, setTouched] = useState(false)
  const missing = !text.trim()
  const close = () => {
    closeFeedback()
    if (status === 'sent') { setText(''); setRating(0); setStatus('idle'); setTouched(false) }
  }
  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (missing || status === 'sending') return
    setStatus('sending')
    setStatus(await sendFeedback({ text, rating }) ? 'sent' : 'error')
  }
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="feedback-title"
      slotProps={{ backdrop: { sx: softBackdrop }, paper: { sx: sheet } }}>
      <DialogContent sx={{ p: `${PAD * 2.5}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Box aria-hidden sx={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent-text)' }}>
          {status === 'sent' ? <CheckCircleOutlineIcon sx={{ fontSize: 30 }} /> : <RateReviewOutlinedIcon sx={{ fontSize: 30 }} />}
        </Box>
        <Typography id="feedback-title" component="h2" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading}px`, mt: `${PAD * 1.25}px`, lineHeight: 1.2 }}>
          {status === 'sent' ? 'Thanks for the feedback' : 'Send feedback to SousChef'}
        </Typography>

        {status === 'sent' ? (
          <>
            <Typography role="status" sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
              It&rsquo;s on its way to the builder.
            </Typography>
            <Button fullWidth onClick={close} sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 3}px` }}>Done</Button>
          </>
        ) : (
          <Box component="form" onSubmit={submit} noValidate sx={{ width: '100%', mt: `${PAD * 2}px`, textAlign: 'left' }}>
            <Typography component="label" htmlFor="feedback-text" sx={{ display: 'block', color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, mb: `${PAD * 0.75}px` }}>
              Describe your feedback <Box component="span" sx={{ color: 'var(--danger)' }}>*</Box>
            </Typography>
            <TextField id="feedback-text" value={text} onChange={e => setText(e.target.value.slice(0, MAX))} onBlur={() => setTouched(true)}
              placeholder="A recipe idea, a missing ingredient, something confusing…" multiline minRows={4} maxRows={10} fullWidth required
              error={touched && missing} sx={glassField}
              slotProps={{ htmlInput: { maxLength: MAX, 'aria-required': true, 'aria-describedby': 'feedback-help' } }} />
            <Box id="feedback-help" sx={{ display: 'flex', justifyContent: 'space-between', mt: '4px' }}>
              <Typography sx={{ color: touched && missing ? 'var(--danger)' : 'var(--text-3)', fontSize: `${T.chip}px` }}>
                {touched && missing ? 'Please describe your feedback.' : 'Required'}
              </Typography>
              <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.chip}px`, fontVariantNumeric: 'tabular-nums' }}>{text.length}/{MAX}</Typography>
            </Box>

            <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`, mt: `${PAD * 2}px`, mb: `${PAD * 0.5}px`, textAlign: 'center' }}>
              Rate your experience <Box component="span" sx={{ color: 'var(--text-3)', fontWeight: 600 }}>(optional)</Box>
            </Typography>
            <Stars value={rating} onChange={setRating} />

            {status === 'error' && (
              <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, textAlign: 'center', mt: `${PAD}px` }}>
                Couldn&rsquo;t send. Check your connection and try again.
              </Typography>
            )}
            <Button type="submit" fullWidth disabled={status === 'sending'}
              startIcon={status === 'sending' ? <CircularProgress size={16} sx={{ color: 'var(--accent-fg)' }} /> : null}
              sx={{ ...ctaPrimary, width: '100%', mt: `${PAD * 2.5}px` }}>
              {status === 'sending' ? 'Sending\u2026' : 'Send feedback'}
            </Button>
            <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.chip}px`, textAlign: 'center', mt: `${PAD}px`, lineHeight: 1.5 }}>
              Sent to the builder through Google Forms. Don&rsquo;t include personal details.
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
