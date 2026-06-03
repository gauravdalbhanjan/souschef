import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#1a1a1a', paper: '#2a2a2a' },
    primary: { main: '#f5a623' },
    text: { primary: '#ffffff', secondary: '#cccccc' },
  },
  typography: { fontFamily: "'Roboto', sans-serif" },
  shape: { borderRadius: 16 },
})

export const C = {
  bg:       '#1c1c1c',
  card:     '#2c2c2c',
  amber:    '#f5a623',
  amberDark:'#e8960e',
  red:      '#e53935',
  green:    '#2e7d32',
  greenBg:  '#1b5e20',
  textPri:  '#ffffff',
  textSec:  '#aaaaaa',
  topCard:  '#f5a623',
  topCardText: '#1a1000',
}
