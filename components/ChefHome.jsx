// Home: an ambient, assistant-style canvas. A large centered prompt, one
// conversational input ("Ask Chef or suggest a meal") with mic, and
// personalised suggestions in clean horizontal rows. No heavy cards/borders.
import { useState, useRef } from 'react'
import { Box, Typography, IconButton, CircularProgress } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import CloseIcon from '@mui/icons-material/Close'
import { T, PAD } from '../theme'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import { ListeningOrb, PromptBar, Pill, ThemeToggle, ArrowScroller, YELLOW } from './Ambient'
import RoutineToday from './RoutineToday'
import RecipeCard, { StockIndicator } from './RecipeCard'
import { useAmbience, heroTint } from '../lib/ambience.js'
import FilterBar, { DEFAULT_FILTERS } from './FilterBar'
import { applyFilters } from '../lib/recipeMeta.js'
import { askChef, promptChips } from '../lib/chef.js'
import { useSpeech, say } from '../lib/useSpeech.js'

const FILTER_KEY = 'souschef_filters'
const BROWSE_KEY = 'souschef_browse'
const SIDE = PAD * 2

// Compact, borderless recipe card for horizontal rows.
function MiniCard({ dish, onOpen, suggestion }) {
  const missing = dish.missing || []
  const sub = dish.haveAll ? dish.time
    : missing.length ? `${dish.time} \u00b7 needs ${missing.slice(0, 2).map(m => m.display.toLowerCase()).join(', ')}${missing.length > 2 ? '\u2026' : ''}`
    : dish.time
  return (
    <Box component="button" type="button" onClick={() => onOpen(dish)}
      aria-label={`${dish.name}, ${dish.time}, ${suggestion ? 'suggestion' : dish.haveAll ? 'ready to cook' : `${dish.match}% of ingredients in your pantry`}`}
      sx={{ all: 'unset', boxSizing: 'border-box', display: 'block', alignSelf: 'flex-start', cursor: 'pointer', flexShrink: 0, width: 148, scrollSnapAlign: 'start',
        '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 3, borderRadius: '18px' } }}>
      <Box sx={{ position: 'relative', width: 148, height: 148, borderRadius: '18px', overflow: 'hidden', background: 'var(--tile)',
        boxShadow: 'var(--shadow)' }}>
        <Box component="img" src={dish.img} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {/* Top-right badge: "Suggestion" (glass over the photo) when the pantry
            is empty, otherwise the pantry-stock %. */}
        {suggestion ? (
          <Box aria-hidden sx={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', height: 22, px: '9px', borderRadius: '11px',
            background: 'rgba(11,15,25,0.45)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            color: '#F8FAFC', fontSize: `${T.chip}px`, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1 }}>
            Suggestion
          </Box>
        ) : <StockIndicator match={dish.match} size="md" />}
      </Box>
      {/* Title: capped at two lines and always two lines tall, so every card's
          meta row sits at the same height. */}
      <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body + 1}px`, mt: `${PAD}px`, lineHeight: 1.25, minHeight: '2.5em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dish.name}</Typography>
      {suggestion ? (
        // One clean line: ⏱ 5 mins
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '4px', color: 'var(--text-2)', fontSize: `${T.sub}px`, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <TimerOutlinedIcon aria-hidden sx={{ fontSize: 14, flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{dish.time}</Box>
        </Box>
      ) : (
        <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub}
        </Typography>
      )}
    </Box>
  )
}

function Row({ title, hint, dishes, onOpen, suggestion = false }) {
  if (!dishes.length) return null
  return (
    <Box component="section" aria-label={title || 'Chef\u2019s picks'} sx={{ mt: title ? `${PAD * 3}px` : `${PAD * 1.5}px` }}>
      {title && (
        <Box sx={{ px: `${SIDE}px`, mb: `${PAD * 1.25}px` }}>
          <Typography component="h2" sx={{ color: 'var(--fg)', fontSize: `${T.title + 3}px`, fontWeight: 700 }}>{title}</Typography>
          {hint && <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, mt: '2px' }}>{hint}</Typography>}
        </Box>
      )}
      {/* Arrows sit over the photos (148px tall), not the captions. */}
      <ArrowScroller label="recipes" step={148 + PAD * 1.5} arrowSize={34} inset={6} arrowTop={74}
        sx={{ gap: `${PAD * 1.5}px`, px: `${SIDE}px`, pb: `${PAD}px`, scrollSnapType: 'x proximity', scrollPaddingLeft: `${SIDE}px` }}>
        {dishes.map(d => <MiniCard key={d.slug} dish={d} onOpen={onOpen} suggestion={suggestion} />)}
        <Box sx={{ width: `${PAD}px`, flexShrink: 0 }} />
      </ArrowScroller>
    </Box>
  )
}

const linkSx = {
  all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px',
  color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600,
  '&:hover': { color: 'var(--fg)' }, '&:focus-visible': { outline: `2px solid ${YELLOW}`, outlineOffset: 2 },
}

export default function ChefHome({
  suggestions, loading, pantryCount, pantryItems, routines, loadError, userEmail, isGuest,
  onOpenRecipe, onOpenRoutine, onAddGroceries, onSignOut,
}) {
  const pantryEmpty = pantryCount === 0
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState(null) // { question, reply, recipes }
  const [thinking, setThinking] = useState(false)
  // Remembered for the session, so Back from a recipe returns to All recipes.
  const [browse, setBrowseState] = useState(() => { try { return sessionStorage.getItem(BROWSE_KEY) === '1' } catch { return false } })
  const setBrowse = (v) => { setBrowseState(v); try { sessionStorage.setItem(BROWSE_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const viaVoice = useRef(false)
  const [chipSeed] = useState(Math.random) // 3rd/4th prompt chips: shuffled once per visit
  const sky = useAmbience() // { headline, sub?, celestial, weather }
  const [filters, setFiltersState] = useState(() => {
    try { return { ...DEFAULT_FILTERS, ...JSON.parse(localStorage.getItem(FILTER_KEY) || '{}') } } catch { return DEFAULT_FILTERS }
  })
  const setFilters = (f) => {
    setFiltersState(f)
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)) } catch { /* ignore */ }
  }

  const ask = (q) => {
    const question = String(q || '').trim()
    if (!question) return
    const res = askChef(question, { suggestions })
    setText('')
    if (res?.action === 'groceries') {
      if (viaVoice.current) say(res.reply)
      viaVoice.current = false
      onAddGroceries(res.items || '')
      return
    }
    setThinking(true)
    setAnswer(null)
    // A short beat so the reply feels like a response, not a filter.
    setTimeout(() => {
      setThinking(false)
      setAnswer({ question, ...res })
      if (viaVoice.current) say(res.reply)
      viaVoice.current = false
    }, 450)
  }

  const speech = useSpeech({
    onInterim: (t) => setText(t),
    onFinal: (t) => { viaVoice.current = true; setText(t); ask(t) },
  })
  const toggleMic = () => (speech.listening ? speech.stop() : speech.start())

  const ready = suggestions.filter(s => s.haveAll)
  const almost = suggestions.filter(s => !s.haveAll && s.match > 0).slice(0, 10)
  const visible = applyFilters(suggestions, filters)

  // ── Browse-all view (the full grid + filters, one tap away) ───────────────
  if (browse) {
    return (
      <Box sx={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, pt: `${PAD * 1.5}px` }}>
        <Box sx={{ px: `${SIDE}px`, mb: `${PAD}px` }}>
          <Box component="button" type="button" onClick={() => setBrowse(false)} sx={linkSx}>
            <ArrowBackIosNewIcon sx={{ fontSize: 13, mr: '4px' }} /> Back to Chef
          </Box>
          <Typography component="h1" sx={{ color: 'var(--fg)', fontSize: `${T.heading + 2}px`, fontWeight: 800, mt: `${PAD}px` }}>All recipes</Typography>
        </Box>
        <Box sx={{ px: `${PAD}px` }}>
          <FilterBar filters={filters} onChange={setFilters} resultCount={visible.length} total={suggestions.length} />
        </Box>
        {visible.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography sx={{ color: 'var(--fg)', fontWeight: 700, fontSize: `${T.title + 2}px` }}>No recipes match these filters</Typography>
            <Box component="button" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} sx={{ ...linkSx, color: 'var(--accent-text)', mt: `${PAD}px` }}>Clear filters</Box>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: `${PAD * 1.25}px`, rowGap: `${PAD * 2}px`, px: `${SIDE}px`, pt: `${PAD}px`, pb: `${PAD * 2}px` }}>
            {visible.map(d => <RecipeCard key={d.slug} dish={d} onClick={() => onOpenRecipe(d)} />)}
          </Box>
        )}
      </Box>
    )
  }

  // ── Assistant canvas ───────────────────────────────────────────────────────
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
      {/* Quiet top line: session + sign out */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: `${SIDE}px`, pt: `${PAD}px` }}>
        <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isGuest ? 'Guest session \u00b7 nothing is saved' : (userEmail ? `Signed in as ${userEmail}` : 'Signed in')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ThemeToggle />
          <IconButton onClick={onSignOut} aria-label={isGuest ? 'Exit guest session' : 'Sign out'} title={isGuest ? 'Exit guest session' : 'Sign out'}
            sx={{ color: 'var(--text-2)', width: 36, height: 36 }}>
            <LogoutIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Hero: orb + big centered prompt */}
      <Box sx={{ textAlign: 'center', px: `${SIDE}px`, pt: answer ? `${PAD}px` : 'clamp(8px, 5svh, 52px)', transition: 'padding .3s, background .8s',
        // closest-side: the tint fades to nothing before the box edge (no seam).
        background: `radial-gradient(closest-side at 50% 42%, ${heroTint(sky.celestial, sky.weather)}, rgba(0,0,0,0))` }}>
        <ListeningOrb active={speech.listening || thinking} size={answer ? 64 : 96} celestial={sky.celestial} weather={sky.weather} />
        <Typography component="h1" sx={{
          color: 'var(--fg)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, mt: `${PAD}px`,
          fontSize: answer ? '24px' : 'clamp(28px, 8.5vw, 36px)', transition: 'font-size .3s',
          textShadow: sky.celestial === 'moon' ? '0 0 28px rgba(190,205,255,0.25)' : '0 0 28px rgba(var(--accent-rgb),0.28)',
        }}>
          {sky.headline}
        </Typography>
        {!answer && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, mt: `${PAD}px`, lineHeight: 1.5 }}>
            {sky.sub ? sky.sub : pantryEmpty ? 'Tell me what you got, or ask for a meal idea.' : 'Ask for a dish, an ingredient, or just say \u201csurprise me\u201d.'}
          </Typography>
        )}
      </Box>

      {/* The conversation input */}
      <Box sx={{ px: `${SIDE}px`, mt: `${PAD * 2.5}px` }}>
        <PromptBar value={text} onChange={setText} onSubmit={() => ask(text)} placeholder="Ask Chef or suggest a meal"
          listening={speech.listening} micSupported={speech.supported} onMic={toggleMic} busy={thinking} />
        {speech.error && <Typography role="alert" sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, mt: `${PAD}px`, textAlign: 'center' }}>{speech.error}</Typography>}
      </Box>

      {/* Quick prompts */}
      {!answer && (
        <Box sx={{ display: 'flex', gap: `${PAD}px`, overflowX: 'auto', px: `${SIDE}px`, mt: `${PAD * 1.5}px`, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {promptChips(pantryEmpty, chipSeed).map(c => <Pill key={c} onClick={() => ask(c)}>{c}</Pill>)}
        </Box>
      )}

      {loadError && (
        <Box role="alert" sx={{ mx: `${SIDE}px`, mt: `${PAD * 2}px` }}>
          <Typography sx={{ color: 'var(--danger)', fontSize: `${T.sub}px`, fontWeight: 700 }}>Database isn't ready</Typography>
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.sub}px`, lineHeight: 1.5 }}>{loadError}</Typography>
        </Box>
      )}

      {/* Chef's reply */}
      <Box aria-live="polite">
        {thinking && (
          <Typography sx={{ color: 'var(--text-2)', fontSize: `${T.body + 1}px`, px: `${SIDE}px`, mt: `${PAD * 2.5}px` }}>Thinking…</Typography>
        )}
        {answer && (
          <Box sx={{ mt: `${PAD * 4}px` }}>
            <Box sx={{ px: `${SIDE}px` }}>
              {/* What you asked (as a clear chip) · Clear on the far right */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: `${PAD}px` }}>
                <Typography component="span" sx={{ color: 'var(--text-2)', fontSize: `${T.body}px`, fontWeight: 600, flexShrink: 0 }}>You asked</Typography>
                <Typography component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  px: '12px', height: 32, lineHeight: '32px', borderRadius: '16px', background: 'rgba(var(--accent-rgb),0.16)', border: '1px solid rgba(var(--accent-rgb),0.5)',
                  color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body + 1}px` }}>
                  {answer.question}
                </Typography>
                <Box component="button" type="button" onClick={() => setAnswer(null)} aria-label={`Clear "${answer.question}" and start a new search`}
                  sx={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', ml: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
                    height: 32, px: '12px', borderRadius: '16px', background: 'var(--surface-strong)', border: '1px solid var(--surface-border)',
                    color: 'var(--fg)', fontWeight: 700, fontSize: `${T.body}px`,
                    '&:hover': { background: 'var(--surface-hover)' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 } }}>
                  <CloseIcon sx={{ fontSize: 16 }} /> Clear
                </Box>
              </Box>
              <Typography sx={{ color: 'var(--fg)', fontSize: `${T.title + 4}px`, fontWeight: 600, lineHeight: 1.45, mt: `${PAD * 1.5}px` }}>{answer.reply}</Typography>
            </Box>
            <Row title="" dishes={answer.recipes} onOpen={onOpenRecipe} suggestion={pantryEmpty} />
          </Box>
        )}
      </Box>

      {/* Personalised suggestions */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={24} sx={{ color: 'var(--accent-text)' }} /></Box>
      ) : !answer && (
        <>
          <Row title="Ready to cook" hint="You have everything for these" dishes={ready} onOpen={onOpenRecipe} />
          <Row title={ready.length ? 'Almost there' : 'Closest to ready'} hint="Just a few ingredients short" dishes={almost} onOpen={onOpenRecipe} />
          {pantryEmpty && (
            <>
              <Row title="Popular picks" hint="Add groceries to see what you can cook right now" dishes={suggestions.slice(0, 10)} onOpen={onOpenRecipe} suggestion />
              <Box sx={{ px: `${SIDE}px`, mt: `${PAD}px` }}>
                <Box component="button" type="button" onClick={() => onAddGroceries('')} sx={{ ...linkSx, color: 'var(--accent-text)' }}>
                  <CameraAltIcon sx={{ fontSize: 16, mr: '6px' }} /> Snap a receipt to stock your pantry
                </Box>
              </Box>
            </>
          )}
        </>
      )}

      {!loading && (
        <Box sx={{ mt: `${PAD * 2}px`, px: `${PAD}px` }}>
          <RoutineToday routines={routines} pantry={pantryItems} onOpen={onOpenRoutine} />
        </Box>
      )}

      {!loading && suggestions.length > 0 && (
        <Box sx={{ px: `${SIDE}px`, mt: `${PAD}px`, mb: `${PAD * 3}px` }}>
          <Box component="button" type="button" onClick={() => setBrowse(true)} sx={linkSx}>
            Browse all {suggestions.length} recipes <ChevronRightIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      )}
    </Box>
  )
}
