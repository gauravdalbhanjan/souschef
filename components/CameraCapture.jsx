import { useEffect, useRef, useState } from 'react'
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos'
import { C, glass, T, PAD } from '../theme'

// Live in-app camera (getUserMedia). Works on phones and laptop webcams over
// HTTPS or localhost. Calls onCapture(File) with a JPEG of the current frame.
// If the camera can't be opened, shows the reason and how to fix it, and calls
// onUnavailable() so the parent can offer the native photo picker instead.

export const liveCameraSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia

function explain(err) {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return ios
        ? 'Camera access is blocked. On your iPhone/iPad open Settings → Safari (or Chrome) → Camera → Allow, or tap "aA" in the address bar → Website Settings → Camera → Allow. Then try again.'
        : 'Camera access is blocked. Click the camera/lock icon in the address bar, allow the camera for this site, then try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.'
    case 'NotSupportedError':
    case 'TypeError':
      return "Live camera isn't available in this browser. Tap Back, then \"Take a photo\" to use your device's camera app instead."
    case 'NotReadableError':
    case 'AbortError':
      return 'The camera is busy. Close other apps or tabs using the camera (FaceTime, Zoom, etc.) and try again.'
    default:
      return `Couldn't start the camera${err?.message ? `: ${err.message}` : '.'}`
  }
}

export default function CameraCapture({ onCapture, onCancel, onUnavailable }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [facing, setFacing] = useState('environment') // rear camera first
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [canFlip, setCanFlip] = useState(false)

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    setReady(false); setError('')
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const v = videoRef.current
        v.srcObject = stream
        await v.play().catch(() => {})
        setReady(true)
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (!cancelled) setCanFlip(devices.filter(d => d.kind === 'videoinput').length > 1)
      } catch (err) {
        if (cancelled) return
        setError(explain(err))
        onUnavailable?.()
      }
    })()
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing])

  const shoot = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      stop()
      onCapture(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  const cancel = () => { stop(); onCancel() }

  return (
    <Box sx={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', background: '#000', height: 'min(62dvh, 520px)' }}>
      <Box component="video" ref={videoRef} playsInline muted autoPlay
        // "contain" = the preview shows exactly the frame that gets captured.
        sx={{ width: '100%', height: '100%', objectFit: 'contain', display: error ? 'none' : 'block' }} />

      {ready && !error && (
        <Typography sx={{
          position: 'absolute', top: PAD * 1.5, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          px: `${PAD * 1.5}px`, py: `${PAD * 0.5}px`, borderRadius: '14px', background: 'rgba(0,0,0,0.6)',
          color: '#fff', fontSize: `${T.sub}px`, fontWeight: 600, pointerEvents: 'none',
        }}>
          Hold the receipt flat and fill the screen
        </Typography>
      )}

      {!ready && !error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${PAD}px` }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px` }}>Starting camera… allow access if asked</Typography>
        </Box>
      )}

      {error && (
        <Box role="alert" sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${PAD * 1.5}px`, p: `${PAD * 3}px`, textAlign: 'center' }}>
          <Typography sx={{ color: '#ff8a8a', fontWeight: 700, fontSize: `${T.title + 2}px` }}>Camera unavailable</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: `${T.body}px`, lineHeight: 1.55 }}>{error}</Typography>
          <Button onClick={cancel} sx={{ ...glass('neutral', { radius: 24, blur: 12, a: 0.1 }), color: '#fff', textTransform: 'none', fontWeight: 700, px: 3 }}>
            Back
          </Button>
        </Box>
      )}

      {/* Controls */}
      {!error && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: PAD * 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${PAD * 3}px` }}>
          <IconButton onClick={cancel} aria-label="Close camera" sx={{ ...glass('dark', { radius: 40, blur: 10, a: 0.5 }), color: '#fff', width: 48, height: 48 }}>
            <CloseIcon />
          </IconButton>
          <Box component="button" type="button" onClick={shoot} disabled={!ready} aria-label="Take photo"
            sx={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff', background: ready ? C.amber : 'rgba(255,255,255,0.3)', cursor: ready ? 'pointer' : 'default', boxShadow: '0 4px 18px rgba(0,0,0,0.5)', '&:active': { transform: 'scale(0.94)' } }} />
          <IconButton onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))} disabled={!canFlip} aria-label="Switch camera"
            sx={{ ...glass('dark', { radius: 40, blur: 10, a: 0.5 }), color: '#fff', width: 48, height: 48, visibility: canFlip ? 'visible' : 'hidden' }}>
            <FlipCameraIosIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}
