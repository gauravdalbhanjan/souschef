// Live cart count for the badge on every cart icon. api.js calls notifyCart()
// after any cart change; `bump` changes on each add so the badge can animate.
import { useSyncExternalStore } from 'react'
import { read } from './deviceStore.js'

let state = { count: read('cart').length, bump: 0, added: 0 }
const listeners = new Set()
export function notifyCart(added = 0) {
  state = { count: read('cart').length, bump: added > 0 ? state.bump + 1 : state.bump, added }
  listeners.forEach(l => l())
}
export const useCart = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state, () => state)
