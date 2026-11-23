import { useState, useEffect, useCallback, useMemo } from 'react'
import { ThemeProvider, CssBaseline, useMediaQuery, useTheme } from '@mui/material'
import { Box, Typography } from '@mui/material'
import { makeTheme, C, T, PAD } from './theme'
import { ColorModeContext, useColorModeState } from './lib/colorMode.js'
import { useSkyAttribute } from './lib/ambience.js'
import { api } from './api'
import { syncEventStock } from './lib/events.js'
import { loadRoutines } from './lib/routines.js'
import { configureStaples } from './lib/staples.js'
import { onDatasetLoaded } from './lib/dataset.js'
import { Snackbar } from '@mui/material'

import ChefHome       from './components/ChefHome'
import { AMBIENT_BG, AmbientBackground, ListeningOrb, CyclingStatus, softBackdrop } from './components/Ambient'
import BottomNav      from './components/BottomNav'
import RecipeDetail   from './components/RecipeDetail'
import CookingMode    from './components/CookingMode'
import InventoryPage  from './components/InventoryPage'
import RoutinePage    from './components/RoutinePage'
import EventsPage     from './components/EventsPage'
import SplashScreen   from './components/SplashScreen'
import SettingsPage   from './components/SettingsPage'
import PrivacyPage    from './components/PrivacyPage'
import AboutPage      from './components/AboutPage'
import { FeedbackDialog } from './components/Feedback'
import { ProSignupDialog } from './components/ProSignup'
import LoginPage      from './components/LoginPage'
import { localStore } from './lib/localStore.js'
import AddGroceries   from './components/AddGroceries'
import CartPage       from './components/CartPage'

// Brief full-screen beat shown while suggestions are (re)computed after a scan
// so the user never sees a broken/empty state or has to reload.
function CuratingOverlay({ show }) {
  if (!show) return null
  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${PAD}px`,
      ...softBackdrop,
    }}>
      <ListeningOrb active size={104} />
      <Typography component="div" sx={{ color: 'var(--fg)', fontSize: `${T.heading}px`, fontWeight: 800, textAlign: 'center', px: 4, mt: `${PAD}px` }}>
        <CyclingStatus messages={['Stocking your digital kitchen\u2026', 'Finding what you can cook\u2026', 'Curating your menu\u2026']} />
      </Typography>
    </Box>
  )
}

// Every screen sits on the same ambient gradient, so moving between tabs feels
// like one continuous canvas.
const GUEST_DAY_KEY = 'souschef_guest_day'
const localDay = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, device time zone

function Shell({ isMobile, children, navIndex, onNav, onCamera, hideNav = false }) {
  return (
    <Box sx={{
      width: '100%', maxWidth: isMobile ? 'none' : 648, mx: 'auto',
      background: AMBIENT_BG,
      borderLeft: isMobile ? 'none' : `1px solid ${C.glassBorder}`,
      borderRight: isMobile ? 'none' : `1px solid ${C.glassBorder}`,
      // 100svh = the visible height even with the browser toolbars showing, so
      // nothing (the tab bar especially) is ever pushed below the fold.
      height: '100vh',
      '@supports (height: 100svh)': { height: '100svh' },
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      pt: 'env(safe-area-inset-top, 0px)', // clear the notch / status bar
    }}>
      {/* Same celestial glow + weather diffusion behind every route. */}
      <AmbientBackground />
      <Box sx={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
        {!hideNav && <BottomNav active={navIndex} onChange={onNav} onCamera={onCamera} />}
      </Box>
    </Box>
  )
}

function InnerApp() {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const [page, setPage]         = useState('splash')
  // The login screen shows after the splash once a day; SousChef Lite continues
  // as guest (accounts are a Pro feature). souschef_guest_day = the local date
  // guest access was last chosen on this device.
  const [guestIn, setGuestIn]   = useState(() => localStore.getItem(GUEST_DAY_KEY) === localDay())
  const [navIndex, setNavIndex] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeSlug, setActiveSlug]   = useState(null)
  const [cookSession, setCookSession] = useState(null)
  const [addOpen, setAddOpenState] = useState(false)
  const [addPrefill, setAddPrefill] = useState('') // "I bought …" text from Ask Chef
  const setAddOpen = (open, prefill = '') => { setAddPrefill(open ? prefill : ''); setAddOpenState(open) }
  const [prevPage, setPrevPage] = useState('home')
  const [curating, setCurating] = useState(false)
  const [pantryCount, setPantryCount] = useState(0)
  const [pantryItems, setPantryItems] = useState([])
  const [loadError, setLoadError] = useState('')


  const refreshSuggestions = useCallback(async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true)
      setLoadError('')
      // Suggestions + pantry together so the dashboard's empty states track the
      // real pantry size.
      const [s, items] = await Promise.all([api.suggestions(), api.pantry()])
      setSuggestions(s)
      setPantryCount(items.length)
      setPantryItems(items)
    } catch (e) {
      console.warn('load failed:', e.message)
      setSuggestions([])
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshSuggestions() }, [refreshSuggestions])
  // The recipe dataset loads after the first pantry items; refresh when it lands.
  useEffect(() => onDatasetLoaded(() => refreshSuggestions({ quiet: true })), [refreshSuggestions])

  // On-device AI (WebLLM) is off in this app: nothing here imports lib/llm.js,
  // lib/aiIdeas.js or lib/aiTasks.js (kept in the repo, see lib/features.js).

  // Device-local stores (IndexedDB).
  const planKey = 'souschef_events'
  const routineKey = 'souschef_routines'
  configureStaples('souschef_staples_out')
  const [routineVersion, setRoutineVersion] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routines = useMemo(() => loadRoutines(routineKey), [routineKey, routineVersion])
  const [eventNotice, setEventNotice] = useState('')
  const onHome = page === 'home'

  // Pantry manager: when a planned event (with "Remind me") is close, add its
  // missing ingredients to the cart. Runs on load and on returning home.
  useEffect(() => {
    if (!onHome) return
    let alive = true
    syncEventStock(planKey, api)
      .then(list => {
        const hits = list.filter(x => x.count > 0)
        if (alive && hits.length) {
          setEventNotice(hits.map(h => `${h.name} is ${h.days === 0 ? 'today' : `in ${h.days} day${h.days === 1 ? '' : 's'}`}: added ${h.count} item${h.count === 1 ? '' : 's'} to your cart`).join(' · '))
        }
      })
      .catch(err => console.warn('event stock sync skipped:', err.message))
    return () => { alive = false }
  }, [onHome, planKey])

  const goHome = useCallback(() => setPage('home'), [])

  // ── Back navigation ───────────────────────────────────────────────────────
  // Every in-app screen change is a browser history entry, so the top-left
  // Back button, Android back and iOS swipe-back all return to the previous
  // screen (e.g. All recipes -> recipe -> back lands on All recipes again).
  useEffect(() => {
    const onPop = (e) => {
      const p = e.state?.page
      if (!p) return
      setPage(p)
      const tab = ['home', 'inventory', 'routine', 'events'].indexOf(p)
      if (tab >= 0) setNavIndex(tab)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (page === 'splash') return
    const s = window.history.state
    if (s?.page === page) return
    const entry = { page, idx: s?.page ? (s.idx ?? 0) + 1 : 0 }
    if (s?.page) window.history.pushState(entry, '')
    else window.history.replaceState(entry, '')
  }, [page])
  // In-app Back: step back through history when there is somewhere to go.
  const goBack = (fallback) => {
    if ((window.history.state?.idx ?? 0) > 0) window.history.back()
    else setPage(fallback)
  }

  // Menu (tab 0) always lands on the home landing page: clear the remembered
  // "All recipes" view and remount ChefHome (fresh hero, no old answer).
  const [homeNonce, setHomeNonce] = useState(0)
  // Slide direction for tab changes (derived when the tab index changes).
  const [tabSlide, setTabSlide] = useState({ tab: navIndex, dir: null })
  if (tabSlide.tab !== navIndex) setTabSlide({ tab: navIndex, dir: navIndex > tabSlide.tab ? 'right' : 'left' })
  const handleNav = (i) => {
    if (i === 0) {
      try { sessionStorage.removeItem('souschef_browse') } catch { /* ignore */ }
      setHomeNonce(n => n + 1)
    }
    setNavIndex(i)
    setPage(['home', 'inventory', 'routine', 'events'][i])
  }

  const openRecipe = (dish) => { setActiveSlug(dish.slug); setPage('recipe') }
  const openCart = () => { setPrevPage(page); setPage('cart') }

  // Called after groceries are committed: show a brief "curating" beat while we
  // refetch suggestions, then land the user back in the app — no manual reload.
  const handleCommitted = async () => {
    setAddOpen(false)
    setCurating(true)
    await refreshSuggestions()
    setPage('home'); setNavIndex(0)
    setCurating(false)
  }

  if (page === 'splash') return <SplashScreen onDone={goHome} />
  if (!guestIn) return <LoginPage onGuest={() => { localStore.setItem('souschef_guest', '1'); localStore.setItem(GUEST_DAY_KEY, localDay()); setGuestIn(true) }} />

  if (page === 'recipe') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        <RecipeDetail
          slug={activeSlug}
          onBack={() => goBack('home')}
          onStart={(session) => { setCookSession(session); setPage('cooking') }}
          onViewCart={openCart}
        />
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  if (page === 'cooking') {
    return (
      // Focus mode: no tab bar while cooking (exit with the back button).
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)} hideNav>
        <CookingMode
          slug={activeSlug}
          session={cookSession}
          onBack={() => goBack('recipe')}
          onHome={() => handleNav(0)}
          onFinished={() => refreshSuggestions()}
        />
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  if (page === 'settings' || page === 'privacy' || page === 'about') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        {page === 'settings'
          ? <SettingsPage onBack={() => goBack('home')} onOpenPrivacy={() => setPage('privacy')} onOpenAbout={() => setPage('about')} onDataChanged={() => refreshSuggestions()} />
          : page === 'about' ? <AboutPage onBack={() => goBack('settings')} />
          : <PrivacyPage onBack={() => goBack('settings')} />}
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  if (page === 'cart') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        <CartPage onBack={() => goBack(prevPage)} />
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  return (
    <>
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        {/* Tabs slide in the way you're going: a later tab from the right, an earlier one from the left. */}
        <Box key={page} className={tabSlide.dir ? `slide-from-${tabSlide.dir}` : undefined} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {page === 'home' && (
          <ChefHome
            key={homeNonce}
            suggestions={suggestions}
            loading={loading}
            pantryCount={pantryCount}
            pantryItems={pantryItems}
            routines={routines}
            onOpenRoutine={(r) => (r.recipeSlug ? openRecipe({ slug: r.recipeSlug }) : handleNav(2))}
            loadError={loadError}
            onOpenRecipe={openRecipe}
            onAddGroceries={(prefill) => setAddOpen(true, prefill || '')}
            onOpenSettings={() => setPage('settings')}
            onViewCart={openCart}
          />
        )}
        {page === 'inventory' && <InventoryPage onBack={() => handleNav(0)} onAddGroceries={() => setAddOpen(true)} onViewCart={openCart} routineKey={routineKey} onStaplesChanged={() => refreshSuggestions()} />}
        {page === 'routine'   && <RoutinePage   onBack={() => handleNav(0)} routineKey={routineKey} onChanged={() => setRoutineVersion(v => v + 1)} />}
        {page === 'events'    && <EventsPage    onBack={() => handleNav(0)} planKey={planKey} onViewCart={openCart} />}
        </Box>
      </Shell>

      <AddGroceries
        open={addOpen}
        prefill={addPrefill}
        onClose={() => setAddOpen(false)}
        onCommitted={handleCommitted}
      />
      <CuratingOverlay show={curating} />
      <Snackbar open={!!eventNotice} autoHideDuration={6000} onClose={() => setEventNotice('')} message={eventNotice}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { background: 'rgba(46,158,107,0.95)', color: '#fff', borderRadius: '12px', fontWeight: 600 } }} />
    </>
  )
}

export default function App() {
  const colorMode = useColorModeState()
  useSkyAttribute() // page glow: gold by day, silver by night
  const muiTheme = useMemo(() => makeTheme(colorMode.mode), [colorMode.mode])
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <InnerApp />
        {/* One feedback sheet for every page (lib/feedback.js) */}
        <FeedbackDialog />
        <ProSignupDialog />
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
