// Feedback is posted to the Google Form with the right field ids.
import { describe, it, expect } from 'vitest'
import { sendFeedback } from '../lib/feedback.js'
import { FEEDBACK_FORM } from '../lib/appInfo.js'

describe('feedback', () => {
  it('posts text + rating to formResponse, no cookies, no referrer', async () => {
    let call
    const ok = await sendFeedback({ text: '  Love the timers  ', rating: 4 }, async (url, opts) => { call = { url, opts }; return {} })
    expect(ok).toBe(true)
    expect(call.url).toBe(FEEDBACK_FORM.action)
    expect(call.url).toMatch(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/)
    expect(call.opts).toMatchObject({ method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(call.opts.body.get('entry.2069944489')).toBe('Love the timers')
    expect(call.opts.body.get('entry.1203995073')).toBe('4')
  })
  it('leaves the rating out when not chosen, caps the length', async () => {
    let body
    await sendFeedback({ text: 'x'.repeat(5000), rating: 0 }, async (_u, o) => { body = o.body; return {} })
    expect(body.has('entry.1203995073')).toBe(false)
    expect(body.get('entry.2069944489').length).toBe(2000)
  })
  it('a network error reports failure', async () => {
    expect(await sendFeedback({ text: 'hi', rating: 0 }, async () => { throw new TypeError('offline') })).toBe(false)
  })
})
