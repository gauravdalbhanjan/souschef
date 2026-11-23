// Cart icon with a live item-count badge; the badge pops and a "+N" floats up
// whenever items are added anywhere in the app.
import { Box, IconButton, Badge } from '@mui/material'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { useCart } from '../lib/cartStore.js'
import { glass } from '../theme'

export default function CartButton({ onClick, onPhoto = false, size = 34 }) {
  const { count, bump, added } = useCart()
  const base = onPhoto
    ? { color: '#F8FAFC', background: 'rgba(11,15,25,0.5)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', '&:hover': { background: 'rgba(11,15,25,0.7)' } }
    : { ...glass('neutral', { radius: 44, blur: 12, a: 0.08 }), color: 'var(--fg)' }
  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <IconButton onClick={onClick} aria-label={`View cart, ${count} item${count === 1 ? '' : 's'}`} sx={{ ...base, width: size, height: size }}>
        <Badge badgeContent={count} max={99} overlap="circular"
          sx={{ '& .MuiBadge-badge': { background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 800, fontSize: '10px', minWidth: 17, height: 17, top: -4, right: -4,
            animation: bump ? 'cartPop .45s ease' : 'none', '@keyframes cartPop': { '0%': { transform: 'scale(1) translate(50%,-50%)' }, '40%': { transform: 'scale(1.5) translate(35%,-35%)' }, '100%': { transform: 'scale(1) translate(50%,-50%)' } } } }}
          key={bump}>
          <ShoppingCartIcon sx={{ fontSize: size * 0.53 }} />
        </Badge>
      </IconButton>
      {bump > 0 && added > 0 && (
        <Box key={`f${bump}`} aria-hidden sx={{ position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', pointerEvents: 'none',
          color: 'var(--accent-text)', fontWeight: 800, fontSize: '12px', whiteSpace: 'nowrap',
          animation: 'cartFloat 1.2s ease forwards', '@keyframes cartFloat': { '0%': { opacity: 0, transform: 'translate(-50%, 6px)' }, '20%': { opacity: 1 }, '100%': { opacity: 0, transform: 'translate(-50%, -16px)' } } }}>
          +{added}
        </Box>
      )}
    </Box>
  )
}
