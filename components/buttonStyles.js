// Universal back/pill button: the shared glass surface token, so it reads the
// same on light and dark screens (never an orphaned dark pill).
export const backButtonSx = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  backdropFilter: 'var(--surface-blur)',
  WebkitBackdropFilter: 'var(--surface-blur)',
  color: 'var(--fg)',
  borderRadius: '20px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '14px',
  px: '16px',
  py: '7px',
  '&:hover': { background: 'var(--surface-hover)' },
  '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: 2 },
}
