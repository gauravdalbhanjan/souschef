import { useState, useRef } from 'react'
import { ThemeProvider, CssBaseline, useMediaQuery, useTheme } from '@mui/material'
import { Box, Typography, IconButton } from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import { theme, C } from './theme'
import { foods } from './data'

import TimerCard      from './components/TimerCard'
import TodoCard       from './components/TodoCard'
import DailyTipsCard  from './components/DailyTipsCard'
import FoodTile       from './components/FoodTile'
import BottomNav      from './components/BottomNav'
import RecipeDetail   from './components/RecipeDetail'
import CookingMode    from './components/CookingMode'
import InventoryPage  from './components/InventoryPage'
import RoutinePage    from './components/RoutinePage'
import EventsPage     from './components/EventsPage'
import SplashScreen   from './components/SplashScreen'
import LoginPage      from './components/LoginPage'

const PAD    = 12
const GAP    = 12
const CARD_H = 200

// iPad/product: show 2.5 cards → (w - 2*PAD - 2*GAP) / 2.5
// iPhone:       show 1.6 cards → (w - 2*PAD - 1*GAP) / 1.6
function calcCardW(screenW, isMobile) {
  if (isMobile) return Math.floor((screenW - PAD * 2 - GAP) / 1.6)
  return Math.floor((screenW - PAD * 2 - GAP * 2) / 2.5)
}

// ── Horizontal scrollable row ──────────────────────────────────────────────
function HRow({ children }) {
  return (
    <Box sx={{
      display: 'flex',
      gap: `${GAP}px`,
      px: `${PAD}px`,
      py: '6px',
      overflowX: 'auto',
      overflowY: 'visible',
      flexShrink: 0,
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
      scrollSnapType: 'x mandatory',
      '& > *': { scrollSnapAlign: 'start' },
    }}>
      {children}
    </Box>
  )
}

// ── Scan Receipt banner (iPhone only, swipe down to dismiss) ──────────────
function ScanReceiptBanner({ onDismiss }) {
  const startY = useRef(null)
  const [gone, setGone] = useState(false)
  const [translateY, setTranslateY] = useState(0)

  const onTouchStart = e => { startY.current = e.touches[0].clientY }
  const onTouchMove  = e => {
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setTranslateY(dy)
  }
  const onTouchEnd = () => {
    if (translateY > 60) { setGone(true); setTimeout(onDismiss, 280) }
    else setTranslateY(0)
  }

  const openCamera = () => {
    // Create a hidden file input that captures from camera
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'   // rear camera
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) {
        // Receipt scanned — dismiss banner
        onDismiss()
      }
    }
    input.click()
  }

  if (gone) return null
  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      sx={{
        mx: `${PAD}px`,
        mb: '6px',
        flexShrink: 0,
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        height: 82,
        transform: `translateY(${translateY}px)`,
        opacity: translateY > 0 ? Math.max(0, 1 - translateY / 120) : 1,
        transition: translateY === 0 ? 'transform .28s, opacity .28s' : 'none',
        cursor: 'grab',
      }}
    >
      <Box
        component="img"
        src="https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=60"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px) brightness(.45)' }}
      />
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,10,10,.52)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: '20px',
      }}>
        {/* Tapping the text area also opens camera */}
        <Box onClick={openCamera} sx={{ cursor: 'pointer' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '17px' }}>
            Scan Receipt to start
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', mt: '2px' }}>
            Swipe down to dismiss
          </Typography>
        </Box>
        <IconButton
          onClick={openCamera}
          sx={{ background: '#fff', width: 44, height: 44, '&:hover': { background: '#f0f0f0' } }}
        >
          <CameraAltIcon sx={{ color: '#222', fontSize: 21 }} />
        </IconButton>
      </Box>
    </Box>
  )
}

// ── Dashboard (menu tab) ───────────────────────────────────────────────────
function Dashboard({ onCaesarClick, isMobile }) {
  const screenW = isMobile
    ? (typeof window !== 'undefined' ? Math.min(window.innerWidth, 430) : 393)
    : 648
  const cardW = calcCardW(screenW, isMobile)
  const [showScan, setShowScan] = useState(true)

  const foodRows = [
    foods.slice(0, 3),
    foods.slice(3, 6),
    foods.slice(6, 9),
  ]

  return (
    <Box sx={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
      pt: `${PAD}px`,
      pb: '4px',
    }}>
      {/* Row 1: Timer | ToDo | DailyTips */}
      <HRow>
        <Box sx={{ width: cardW, height: CARD_H, flexShrink: 0 }}><TimerCard /></Box>
        <Box sx={{ width: cardW, height: CARD_H, flexShrink: 0 }}><TodoCard /></Box>
        <Box sx={{ width: cardW, height: CARD_H, flexShrink: 0 }}><DailyTipsCard /></Box>
      </HRow>

      {/* Food rows */}
      {foodRows.map((row, ri) => (
        <HRow key={ri}>
          {row.map(food => (
            <Box key={food.name} sx={{ width: cardW, height: CARD_H, flexShrink: 0 }}>
              <FoodTile
                item={food}
                width={cardW}
                height={CARD_H}
                onClick={food.name === 'Caesar Salad' ? onCaesarClick : undefined}
              />
            </Box>
          ))}
        </HRow>
      ))}

      {/* Scan Receipt — iPhone only */}
      {isMobile && showScan && (
        <ScanReceiptBanner onDismiss={() => setShowScan(false)} />
      )}
    </Box>
  )
}

// ── Shell with persistent BottomNav ───────────────────────────────────────
function Shell({ isMobile, children, navIndex, onNav }) {
  return (
    <Box sx={{
      width: isMobile ? '100vw' : 648,
      mx: 'auto',
      background: '#111',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {children}
      <BottomNav active={navIndex} onChange={onNav} />
    </Box>
  )
}

// ── Inner app (needs ThemeProvider context for useTheme) ──────────────────
function InnerApp() {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

  // 'splash' | 'login' | 'home' | 'inventory' | 'routine' | 'events' | 'recipe' | 'cooking'
  const [page,     setPage]     = useState('splash')
  const [navIndex, setNavIndex] = useState(0)

  const handleNav = (i) => {
    setNavIndex(i)
    const pages = ['home', 'inventory', 'routine', 'events']
    setPage(pages[i])
  }

  // Recipe / Cooking don't change navIndex
  if (page === 'splash') {
    return <SplashScreen onDone={() => setPage('login')} />
  }

  if (page === 'login') {
    return <LoginPage onLogin={() => setPage('home')} />
  }

  if (page === 'recipe') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav}>
        <RecipeDetail
          onBack={() => setPage('home')}
          onStart={() => setPage('cooking')}
        />
      </Shell>
    )
  }

  if (page === 'cooking') {
    return (
      <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav}>
        <CookingMode onBack={() => setPage('recipe')} />
      </Shell>
    )
  }

  return (
    <Shell isMobile={isMobile} navIndex={navIndex} onNav={handleNav}>
      {page === 'home'      && <Dashboard onCaesarClick={() => setPage('recipe')} isMobile={isMobile} />}
      {page === 'inventory' && <InventoryPage onBack={() => handleNav(0)} />}
      {page === 'routine'   && <RoutinePage   onBack={() => handleNav(0)} />}
      {page === 'events'    && <EventsPage    onBack={() => handleNav(0)} />}
    </Shell>
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
