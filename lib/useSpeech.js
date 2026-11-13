// Mic input via the browser's Web Speech API (Chrome, Edge, Safari).
// Where it isn't available, `supported` is false and the mic button hides.
import { useEffect, useRef, useState, useCallback } from 'react'

const Recognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export function useSpeech({ onInterim, onFinal } = {}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const cb = useRef({ onInterim, onFinal })
  cb.current = { onInterim, onFinal }

  useEffect(() => () => recRef.current?.abort(), [])

  const start = useCallback(() => {
    if (!Recognition) return
    setError('')
    const rec = new Recognition()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      let text = ''
      let final = false
      for (const r of e.results) { text += r[0].transcript; if (r.isFinal) final = true }
      if (final) cb.current.onFinal?.(text.trim())
      else cb.current.onInterim?.(text)
    }
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone access is blocked. Allow it in your browser settings.' : '')
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }, [])

  const stop = useCallback(() => { recRef.current?.stop() }, [])

  return { supported: !!Recognition, listening, start, stop, error }
}

// Read a short reply aloud (used after a voice question, Alexa-style).
export function say(text) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1
  window.speechSynthesis.speak(u)
}
