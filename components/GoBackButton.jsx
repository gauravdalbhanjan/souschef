import { Box, Button } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { backButtonSx } from './buttonStyles'
import { FeedbackButton } from './Feedback'
// Kept here too so existing imports keep working.
// eslint-disable-next-line react-refresh/only-export-components
export { backButtonSx }

// Header row on every page: Go Back on the left, Feedback on the right (in
// line), and any page action (children) just before Feedback.
export default function GoBackButton({ onClick, children, feedback = true }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <Button onClick={onClick} startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '13px !important' }} />} sx={backButtonSx}>
        Go Back
      </Button>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
        {feedback && <FeedbackButton />}
      </Box>
    </Box>
  )
}
