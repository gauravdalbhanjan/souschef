// <img> for event, pantry and routine pictures with the same checks as recipe
// tiles (lib/safeImage.js): URL allow-list, off-screen decode, size/shape and
// timeout. With `search` ({ key, name }), a missing or failed picture is looked
// up with the same keyless Wikimedia Commons search as recipe tiles (cached on
// the device). Until a picture passes, the given fallback is shown.
import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { sanitizeImageUrl, validateImage, useDishImage, FALLBACK_THUMB } from '../lib/safeImage.js'

const checked = new Map() // url -> boolean (this session)

// The app's illustration, for callers that want it as the fallback.
export function FallbackThumb({ sx, label }) {
  return <Box component="img" src={FALLBACK_THUMB} alt="" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} decoding="async" sx={{ objectFit: 'cover', display: 'block', ...sx }} />
}

export default function SafeImg({ src, sx, fallback = null, alt = '', search = null }) {
  const clean = sanitizeImageUrl(src)
  const [state, setState] = useState(() => ({ url: clean, ok: clean ? checked.get(clean) : false }))
  const current = state.url === clean ? state : { url: clean, ok: clean ? checked.get(clean) : false }
  useEffect(() => {
    if (!clean || checked.has(clean)) return
    let alive = true
    validateImage(clean).then(r => { checked.set(clean, r.ok); if (alive) setState({ url: clean, ok: r.ok }) })
    return () => { alive = false }
  }, [clean])
  const failed = !clean || current.ok === false
  const { photo, onError } = useDishImage(search?.name && failed ? { slug: search.key, name: search.name, kind: search.kind } : null)
  if (!failed && current.ok) {
    return (
      <Box component="img" src={clean} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onError={() => { checked.set(clean, false); setState({ url: clean, ok: false }) }} sx={sx} />
    )
  }
  if (photo?.url) {
    return <Box component="img" src={photo.url} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={onError} sx={sx} />
  }
  return fallback
}
