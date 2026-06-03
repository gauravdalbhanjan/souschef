import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, IconButton,
  Tabs, Tab, useMediaQuery, useTheme,
} from '@mui/material'
import ShoppingCartIcon  from '@mui/icons-material/ShoppingCart'
import SyncIcon          from '@mui/icons-material/Sync'
import TrendingDownIcon  from '@mui/icons-material/TrendingDown'
import DeleteIcon        from '@mui/icons-material/Delete'
import AddIcon           from '@mui/icons-material/Add'
import GoBackButton      from './GoBackButton'
import { C } from '../theme'

const categories = ['Veggies', 'Fruits', 'Meat', 'Staples', 'Dairy', 'Spices']

// urgent = needs refilling soon (low stock). These get amber "Add to cart" button.
const inventoryData = {
  Veggies: [
    { name: 'Spinach',      img: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=80&q=70', meals: 2,  expiry: '2 Days',  urgent: false },
    { name: 'Broccoli',     img: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=80&q=70', meals: 2,  expiry: '2 Days',  urgent: true  },
    { name: 'Tomatoes',     img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=80&q=70', meals: 20, expiry: '5 Days',  urgent: false },
    { name: 'Bell Peppers', img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=80&q=70', meals: 3,  expiry: '2 Weeks', urgent: true  },
    { name: 'Onion',        img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=80&q=70', meals: 20, expiry: '7 Days',  urgent: false },
    { name: 'Carrots',      img: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=80&q=70', meals: 35, expiry: '4 Weeks', urgent: false },
    { name: 'Zucchini',     img: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=80&q=70', meals: 11, expiry: '1 Week',  urgent: false },
  ],
  Fruits: [
    { name: 'Apple',   img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=80&q=70', meals: 2,  expiry: '2 Days', urgent: true  },
    { name: 'Banana',  img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=80&q=70', meals: 2,  expiry: '2 Days', urgent: false },
    { name: 'Berries', img: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=80&q=70', meals: 20, expiry: '5 Days', urgent: false },
    { name: 'Oranges', img: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=80&q=70', meals: 3,  expiry: '7 Days', urgent: true  },
    { name: 'Mango',   img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=80&q=70', meals: 5,  expiry: '3 Days', urgent: true  },
    { name: 'Grapes',  img: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=80&q=70', meals: 4,  expiry: '4 Days', urgent: false },
  ],
  Meat: [
    { name: 'Chicken Breast', img: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=80&q=70', meals: 15, expiry: '3 Days', urgent: false },
    { name: 'Ground Beef',    img: 'https://images.unsplash.com/photo-1588347785101-1aabcab75ca4?w=80&q=70', meals: 8,  expiry: '2 Days', urgent: true  },
    { name: 'Salmon',         img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=80&q=70', meals: 6,  expiry: '1 Day',  urgent: true  },
    { name: 'Bacon',          img: 'https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=80&q=70', meals: 10, expiry: '5 Days', urgent: false },
    { name: 'Shrimp',         img: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=80&q=70', meals: 7,  expiry: '2 Days', urgent: false },
  ],
  Staples: [
    { name: 'Pasta',     img: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=80&q=70', meals: 25, expiry: '6 Months', urgent: false },
    { name: 'Rice',      img: 'https://images.unsplash.com/photo-1536304993881-ff86e0c9c2d6?w=80&q=70', meals: 40, expiry: '1 Year',   urgent: false },
    { name: 'Olive Oil', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=80&q=70', meals: 50, expiry: '2 Years',  urgent: false },
    { name: 'Bread',     img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&q=70', meals: 3,  expiry: '5 Days',  urgent: true  },
    { name: 'Flour',     img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=80&q=70', meals: 30, expiry: '6 Months', urgent: false },
  ],
  Dairy: [
    { name: 'Milk',         img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&q=70', meals: 10, expiry: '4 Days',  urgent: false },
    { name: 'Cheddar',      img: 'https://images.unsplash.com/photo-1589881133825-b9b4c4a96d7c?w=80&q=70', meals: 12, expiry: '2 Weeks', urgent: false },
    { name: 'Greek Yogurt', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80&q=70', meals: 5,  expiry: '3 Days',  urgent: true  },
    { name: 'Butter',       img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&q=70', meals: 20, expiry: '3 Weeks', urgent: false },
  ],
  Spices: [
    { name: 'Black Pepper',  img: 'https://images.unsplash.com/photo-1599909631485-e4e4a5a876b4?w=80&q=70', meals: 60, expiry: '2 Years', urgent: false },
    { name: 'Cumin',         img: 'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=80&q=70', meals: 30, expiry: '1 Year',  urgent: false },
    { name: 'Paprika',       img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&q=70', meals: 25, expiry: '1 Year',  urgent: true  },
    { name: 'Garlic Powder', img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=80&q=70', meals: 40, expiry: '2 Years', urgent: false },
  ],
}

// ── Cart control ──────────────────────────────────────────────────────────
function CartControl({ qty, urgent, onAdd, onRemove }) {
  if (qty === 0) {
    return (
      <Button
        onClick={onAdd}
        startIcon={<ShoppingCartIcon sx={{ fontSize: '15px !important' }} />}
        sx={{
          background: urgent ? C.amber : 'transparent',
          color: urgent ? '#1a1000' : '#aaa',
          border: urgent ? 'none' : '1px solid #444',
          borderRadius: '22px',
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '13px',
          px: '12px', py: '5px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          minWidth: 130,
          '&:hover': { background: urgent ? C.amberDark : '#2a2a2a' },
        }}
      >
        Add to cart
      </Button>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <IconButton
        onClick={onRemove}
        size="small"
        sx={{ color: '#aaa', p: '4px', '&:hover': { color: '#e57373' } }}
      >
        <DeleteIcon sx={{ fontSize: 20 }} />
      </IconButton>
      <Box sx={{
        background: '#fff',
        borderRadius: '20px',
        minWidth: 36, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: '12px',
      }}>
        <Typography sx={{ color: '#111', fontWeight: 700, fontSize: '15px' }}>
          {qty}
        </Typography>
      </Box>
      <IconButton
        onClick={onAdd}
        size="small"
        sx={{ color: '#fff', p: '4px', '&:hover': { color: C.amber } }}
      >
        <AddIcon sx={{ fontSize: 22 }} />
      </IconButton>
    </Box>
  )
}

// ── Single inventory row ──────────────────────────────────────────────────
function InventoryRow({ item, qty, onAdd, onRemove }) {
  const expiryIsShort = item.expiry.includes('Day') || item.expiry === '1 Week'

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      py: '13px',
      px: '14px',
      borderBottom: '1px solid rgba(255,255,255,.06)',
      '&:last-child': { borderBottom: 'none' },
    }}>
      {/* Thumbnail */}
      <Box
        component="img"
        src={item.img}
        alt={item.name}
        sx={{ width: 52, height: 52, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
      />

      {/* Name + meta */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '16px', lineHeight: 1.2 }}>
          {item.name}
        </Typography>
        {/* Meta: all on one line, no wrap */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          mt: '4px',
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <SyncIcon sx={{ color: item.urgent ? C.amber : '#666', fontSize: 13 }} />
            <Typography sx={{
              color: item.urgent ? C.amber : '#888',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}>
              {item.meals} Meals
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <TrendingDownIcon sx={{ color: expiryIsShort ? '#e57373' : '#666', fontSize: 13 }} />
            <Typography sx={{
              color: expiryIsShort ? '#e57373' : '#888',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}>
              {item.expiry}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Cart control */}
      <CartControl
        qty={qty}
        urgent={item.urgent}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </Box>
  )
}

// ── Category section ──────────────────────────────────────────────────────
function CategorySection({ category, items, cart, onAdd, onRemove, sectionRef }) {
  return (
    <Box ref={sectionRef} sx={{ mb: '20px' }}>
      {/* Sticky section header */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        background: '#111',
        zIndex: 2,
        py: '8px',
        px: '4px',
      }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
          {category}
        </Typography>
      </Box>

      {/* Green card with items */}
      <Box sx={{ background: '#1a3320', borderRadius: '20px', overflow: 'hidden' }}>
        {items.map(item => (
          <InventoryRow
            key={item.name}
            item={item}
            qty={cart[item.name] || 0}
            onAdd={() => onAdd(item.name)}
            onRemove={() => onRemove(item.name)}
          />
        ))}
      </Box>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function InventoryPage({ onBack }) {
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const [tab, setTab]   = useState(0)
  const [cart, setCart] = useState({})

  // Refs to each section DOM node
  const sectionRefs = useRef(categories.map(() => null))
  const scrollRef   = useRef(null)
  // Prevent scroll-spy from fighting tab clicks
  const isTabClick  = useRef(false)

  const addToCart = (name) => setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 }))
  const removeFromCart = (name) => setCart(c => {
    const next = (c[name] || 0) - 1
    if (next <= 0) { const n = { ...c }; delete n[name]; return n }
    return { ...c, [name]: next }
  })

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0)

  // ── Scroll-spy via IntersectionObserver ──────────────────────────────
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const observers = sectionRefs.current.map((ref, idx) => {
      if (!ref) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isTabClick.current) {
            setTab(idx)
          }
        },
        {
          root: scrollEl,
          // Trigger when section header enters top ~30% of scroll area
          rootMargin: '-10% 0px -60% 0px',
          threshold: 0,
        }
      )
      obs.observe(ref)
      return obs
    })

    return () => observers.forEach(o => o && o.disconnect())
  }, [])

  // ── Tab click → scroll to section ────────────────────────────────────
  const handleTabChange = useCallback((_, newVal) => {
    setTab(newVal)
    isTabClick.current = true
    const ref = sectionRefs.current[newVal]
    if (ref && scrollRef.current) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Re-enable scroll-spy after scroll animation (~600ms)
    setTimeout(() => { isTabClick.current = false }, 700)
  }, [])

  return (
    <Box sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#111',
    }}>

      {/* ── Header ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: '16px', pt: '16px', pb: '10px', flexShrink: 0,
      }}>
        <GoBackButton onClick={onBack} />
        <Box sx={{ position: 'relative' }}>
          <IconButton sx={{
            background: '#2a2a2a', color: '#fff', width: 44, height: 44,
            '&:hover': { background: '#3a3a3a' },
          }}>
            <ShoppingCartIcon />
          </IconButton>
          {totalCartItems > 0 && (
            <Box sx={{
              position: 'absolute', top: 2, right: 2,
              width: 18, height: 18, borderRadius: '50%',
              background: C.amber,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: '#1a1000', fontSize: '10px', fontWeight: 800 }}>
                {totalCartItems}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Scroll-spy Tabs ── */}
      <Box sx={{ flexShrink: 0, borderBottom: '1px solid #222' }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            px: '12px',
            '& .MuiTab-root': {
              color: '#555', textTransform: 'none', fontWeight: 600,
              fontSize: '14px', minWidth: 'auto', px: '16px',
            },
            '& .Mui-selected': { color: '#fff' },
            '& .MuiTabs-indicator': { background: C.amber, height: 3, borderRadius: 2 },
          }}
        >
          {categories.map(c => <Tab key={c} label={c} />)}
        </Tabs>
      </Box>

      {/* ── All sections in one scrollable list ── */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflowY: 'auto', px: '12px', pt: '4px',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {categories.map((cat, idx) => (
          <CategorySection
            key={cat}
            category={cat}
            items={inventoryData[cat]}
            cart={cart}
            onAdd={addToCart}
            onRemove={removeFromCart}
            sectionRef={el => { sectionRefs.current[idx] = el }}
          />
        ))}
      </Box>
    </Box>
  )
}
