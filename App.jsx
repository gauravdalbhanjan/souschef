import { useState, useEffect, useCallback, useReducer } from 'react'
import { ThemeProvider, CssBaseline, useMediaQuery, useTheme } from '@mui/material'
import { Box, Typography, IconButton, CircularProgress } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { theme, C, glass, T, PAD } from './theme'
import { api } from './api'
import { supabase } from './supabaseClient'
import { useSession } from './useSession'

import TimerCard      from './components/TimerCard'
import TodoCard       from './components/TodoCard'
import DailyTipsCard  from './components/DailyTipsCard'
import BottomNav      from './components/BottomNav'
import RecipeDetail   from './components/RecipeDetail'
import CookingMode    from './components/CookingMode'
import InventoryPage  from './components/InventoryPage'
import RoutinePage    from './components/RoutinePage'
import EventsPage     from './components/EventsPage'
import SplashScreen   from './components/SplashScreen'
import AuthPage       from './components/AuthPage'
import AddGroceries   from './components/AddGroceries'
import FoodTile       from './components/FoodTile'
import CartPage       from './components/CartPage'
import Onboarding     from './components/Onboarding'

const GAP = PAD // 8px

// Brief full-screen beat shown while suggestions are (re)computed after a scan
// or onboarding, so the user never sees a broken/empty state or has to reload.
function CuratingOverlay({ show }) {
  if (!show) return null
  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${PAD * 2}px`,
      background: 'rgba(11,14,20,0.72)', backdropFilter: 'blur(14px)',
    }}>
      <CircularProgress size={34} sx={{ color: C.amber }} />
      <Typography sx={{ color: '#fff', fontSize: `${T.heading}px`, fontWeight: 800, textAlign: 'center', px: 4 }}>
        Hang in there…
      </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: `${T.body}px`, textAlign: 'center', px: 5, lineHeight: 1.5 }}>
        We're curating your menu from what's in your pantry.
      </Typography>
    </Box>
  )
}

function FullSpinner() {
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={30} sx={{ color: C.amber }} aria-label="Loading" />
    </Box>
  )
}

// ── Dashboard: 3 fixed top tiles + static match-ranked 3-per-row grid ───────
function Dashboard({ suggestions, loading, pantryCount, loadError, userEmail, onOpenRecipe, onAddGroceries, onSignOut }) {
  const utilH = 132
  const pantryEmpty = pantryCount === 0

  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
      '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
      pt: `${PAD}px`,
    }}>
      {/* Greeting header */}
      <Box sx={{ px: `${PAD}px`, mb: `${PAD / 2}px`, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: `${PAD}px` }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: `${T.sub}px`, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userEmail ? `Signed in as ${userEmail}` : 'Browsing as a guest'}
          </Typography>
          <Typography sx={{ color: '#fff', fontSize: `${T.heading}px`, fontWeight: 800, lineHeight: 1.15 }}>
            What are we cooking?
          </Typography>
        </Box>
        <IconButton onClick={onSignOut} aria-label="Sign out" title="Sign out"
          sx={{ ...glass('neutral', { radius: 40, blur: 12, a: 0.08 }), color: 'rgba(255,255,255,0.8)', width: 38, height: 38, flexShrink: 0 }}>
          <LogoutIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {loadError && (
        <Box role="alert" sx={{ mx: `${PAD}px`, mb: `${PAD}px`, p: `${PAD * 1.5}px`, ...glass('neutral', { radius: 14, blur: 14, a: 0.06 }), border: '1px solid rgba(255,138,138,0.5)' }}>
          <Typography sx={{ color: '#ff8a8a', fontSize: `${T.sub}px`, fontWeight: 700, mb: '2px' }}>Database isn't ready</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: `${T.sub}px`, lineHeight: 1.5 }}>
            {loadError}
          </Typography>
        </Box>
      )}

      {/* Top row: 3 fixed tiles — Timer | ToDo | DailyTips (all visible, no scroll) */}
      <Box sx={{ display: 'flex', gap: `${GAP}px`, px: `${PAD}px`, py: `${PAD / 2}px`, flexShrink: 0 }}>
        <Box sx={{ flex: 1, height: utilH }}><TimerCard /></Box>
        <Box sx={{ flex: 1, height: utilH }}><TodoCard empty={pantryEmpty} /></Box>
        <Box sx={{ flex: 1, height: utilH }}><DailyTipsCard empty={pantryEmpty} /></Box>
      </Box>

      {/* Section label */}
      <Box sx={{ px: `${PAD}px`, pt: `${PAD}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
        <Typography sx={{ color: '#fff', fontSize: `${T.title}px`, fontWeight: 700 }}>
          Ready to cook
        </Typography>
        <Typography sx={{ color: C.amber, fontSize: `${T.sub}px`, fontWeight: 600 }}>
          best matches first
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={26} sx={{ color: C.amber }} />
        </Box>
      ) : (pantryEmpty || suggestions.length === 0) ? (
        // Empty pantry → a single "capacity 0 / 0%" window instead of a grid.
        <Box sx={{ px: `${PAD}px`, pt: `${PAD}px`, pb: `${PAD}px` }}>
          <Box
            onClick={onAddGroceries}
            sx={{
              ...glass('amber', { radius: 20, blur: 20, a: 0.10 }),
              cursor: 'pointer', p: `${PAD * 2.5}px`, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${PAD}px`,
              '&:hover': { filter: 'brightness(1.1)' }, transition: 'filter .15s',
            }}
          >
            {/* 0% ring */}
            <Box sx={{ position: 'relative', width: 96, height: 96, mb: `${PAD / 2}px` }}>
              <CircularProgress variant="determinate" value={100} size={96} thickness={4}
                sx={{ color: 'rgba(255,255,255,0.10)', position: 'absolute', inset: 0 }} />
              <CircularProgress variant="determinate" value={0} size={96} thickness={4}
                sx={{ color: C.amber, position: 'absolute', inset: 0 }} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.heading}px`, lineHeight: 1 }}>0%</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600 }}>stocked</Typography>
              </Box>
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: `${T.title}px` }}>
              Pantry capacity: 0
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: `${T.body}px`, lineHeight: 1.55, maxWidth: 340 }}>
              0% of ingredients in your pantry. Add items to unlock ready-to-cook meals — tap here or the camera below to scan a receipt.
            </Typography>
          </Box>
        </Box>
      ) : (
        // Static grid: 3 meal cards per row, ranked high -> low match
        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: `${GAP}px`,
          px: `${PAD}px`, pt: `${PAD}px`, pb: `${PAD}px`,
        }}>
          {suggestions.map(dish => (
            <Box key={dish.slug} sx={{ height: 132 }}>
              <FoodTile item={dish} height={132} onClick={() => onOpenRecipe(dish)} compact />
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ height: `${PAD}px`, flexShrink: 0 }} />
    </Box>
  )
}

function Shell({ isMobile, children, navIndex, onNav, onCamera }) {
  return (
    <Box sx={{
      width: isMobile ? '100vw' : 648, mx: 'auto',
      background: isMobile ? 'transparent' : C.shellBg,
      backdropFilter: isMobile ? 'none' : 'blur(30px) saturate(150%)',
      WebkitBackdropFilter: isMobile ? 'none' : 'blur(30px) saturate(150%)',
      borderLeft: isMobile ? 'none' : `1px solid ${C.glassBorder}`,
      borderRight: isMobile ? 'none' : `1px solid ${C.glassBorder}`,
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {children}
      <BottomNav active={navIndex} onChange={onNav} onCamera={onCamera} />
    </Box>
  )
}

function InnerApp() {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  const [page, setPage]         = useState('splash')
  const [navIndex, setNavIndex] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeSlug, setActiveSlug]   = useState(null)
  const [cookSession, setCookSession] = useState(null)
  const [addOpen, setAddOpen]   = useState(false)
  const [prevPage, setPrevPage] = useState('home')
  const [curating, setCurating] = useState(false)
  const [pantryCount, setPantryCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [, bumpOnboarding] = useReducer(x => x + 1, 0)

  const session = useSession()          // undefined = checking, null = signed out
  const uid = session?.user?.id
  const onboardKey = uid ? `souschef_onboarded_${uid}` : null

  // First-run onboarding, once per user (stored per account on this device).
  let needsOnboarding = false
  if (onboardKey) {
    try { needsOnboarding = !localStorage.getItem(onboardKey) } catch { needsOnboarding = true }
  }

  const refreshSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      // Suggestions + pantry together so the dashboard's empty states track the
      // real pantry size.
      const [s, items] = await Promise.all([api.suggestions(), api.pantry()])
      setSuggestions(s)
      setPantryCount(items.length)
      // An existing user on a new device already has a pantry: skip onboarding.
      if (items.length > 0 && onboardKey) {
        try { localStorage.setItem(onboardKey, '1') } catch { /* ignore */ }
      }
    } catch (e) {
      console.warn('load failed:', e.message)
      setSuggestions([])
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [onboardKey])

  // (Re)load whenever the signed-in user changes; clear everything on sign-out.
  useEffect(() => {
    if (uid) {
      refreshSuggestions()
    } else {
      setSuggestions([]); setPantryCount(0); setLoadError(''); setLoading(true)
      setPage(p => (p === 'splash' ? p : 'home')); setNavIndex(0)
    }
  }, [uid, refreshSuggestions])

  const signOut = () => supabase.auth.signOut()
  const goHome = useCallback(() => setPage('home'), [])

  const handleNav = (i) => {
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

  const finishOnboarding = () => {
    try { localStorage.setItem(onboardKey, '1') } catch { /* ignore */ }
    bumpOnboarding()
    setCurating(true)
    refreshSuggestions().finally(() => setCurating(false))
  }

  if (page === 'splash') return <SplashScreen onDone={goHome} />
  if (session === undefined) return <FullSpinner />
  if (!session) return <AuthPage />
  if (needsOnboarding && loading) return <FullSpinner />
  // If the database isn't reachable/ready, skip onboarding so the dashboard can
  // show the setup message instead of a form that can't save.
  if (needsOnboarding && !loadError) return <Onboarding onDone={finishOnboarding} />

  if (page === 'recipe') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        <RecipeDetail
          slug={activeSlug}
          onBack={() => setPage('home')}
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
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        <CookingMode
          slug={activeSlug}
          session={cookSession}
          onBack={() => setPage('recipe')}
          onFinished={() => refreshSuggestions()}
        />
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  if (page === 'cart') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        <CartPage onBack={() => setPage(prevPage)} />
        <AddGroceries open={addOpen} onClose={() => setAddOpen(false)} onCommitted={handleCommitted} />
        <CuratingOverlay show={curating} />
      </Shell>
    )
  }

  return (
    <>
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav} onCamera={() => setAddOpen(true)}>
        {page === 'home' && (
          <Dashboard
            suggestions={suggestions}
            loading={loading}
            pantryCount={pantryCount}
            loadError={loadError}
            userEmail={session.user.is_anonymous ? '' : (session.user.email || '')}
            onOpenRecipe={openRecipe}
            onAddGroceries={() => setAddOpen(true)}
            onSignOut={signOut}
          />
        )}
        {page === 'inventory' && <InventoryPage onBack={() => handleNav(0)} onAddGroceries={() => setAddOpen(true)} onViewCart={openCart} />}
        {page === 'routine'   && <RoutinePage   onBack={() => handleNav(0)} />}
        {page === 'events'    && <EventsPage    onBack={() => handleNav(0)} />}
      </Shell>

      <AddGroceries
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCommitted={handleCommitted}
      />
      <CuratingOverlay show={curating} />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <InnerApp />
    </ThemeProvider>
  )
}
