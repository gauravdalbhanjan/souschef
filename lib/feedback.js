// One feedback sheet for the whole app: any Feedback button opens it.
import { useSyncExternalStore } from 'react'
import { FEEDBACK_FORM, PRO_SIGNUP_FORM } from './appInfo.js'

export const FEEDBACK_MAX = 2000
const MAX = FEEDBACK_MAX

// Which sheet is open: null | 'feedback' | 'pro'
let open = null
const listeners = new Set()
const set = (v) => { open = v; listeners.forEach(l => l()) }
export const openFeedback = () => set('feedback')
export const openProSignup = () => set('pro')
export const closeFeedback = () => set(null)
const useOpen = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => open, () => open)
export const useFeedbackOpen = () => useOpen() === 'feedback'
export const useProSignupOpen = () => useOpen() === 'pro'

// Posts URL-encoded fields to a Google Form. Google doesn't allow reading the
// reply from another site, so only a network error counts as a failure.
export async function postGoogleForm(action, fields, fetchImpl = fetch) {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') body.set(k, String(v))
  try {
    await fetchImpl(action, { method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', body })
    return true
  } catch { return false }
}

// Plain email check (the form's own rule is "required"; this catches typos).
export const isEmail = (s) => /^[^\s@<>()[\],;:"]{1,64}@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i.test(String(s || '').trim()) && String(s).trim().length <= 254
export const sendProSignup = (email, fetchImpl = fetch) =>
  postGoogleForm(PRO_SIGNUP_FORM.action, { [PRO_SIGNUP_FORM.fields.email]: String(email).trim().toLowerCase() }, fetchImpl)

// Sends to Google Forms. -> true when the request went out.
export async function sendFeedback({ text, rating }, fetchImpl = fetch) {
  return postGoogleForm(FEEDBACK_FORM.action, {
    [FEEDBACK_FORM.fields.text]: String(text).trim().slice(0, MAX),
    [FEEDBACK_FORM.fields.rating]: rating >= 1 && rating <= 5 ? rating : null,
  }, fetchImpl)
}
