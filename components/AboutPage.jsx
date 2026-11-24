// About page: same layout and type styles as the Privacy page.
import { Box, Typography, Button } from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import GoBackButton from './GoBackButton'
import { surface, pillSecondary } from './Ambient'
import { T, PAD } from '../theme'
import { APP_NAME, COPYRIGHT, BUILDER_SITE, PRO_PITCH } from '../lib/appInfo.js'
import VersionLine from './VersionLine'
import { openFeedback } from '../lib/feedback.js'
import { ProSignupLink } from './ProSignup'

const h2 = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 3}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }
const p = { color: 'var(--text-2)', fontSize: `${T.body}px`, lineHeight: 1.6, mb: `${PAD}px` }

export default function AboutPage({ onBack, inDrawer = false }) {
  // In the Settings drawer (iPad / laptop) the content gets more side room.
  const sidePad = inDrawer ? `${PAD * 3}px` : `${PAD * 2}px`
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: sidePad, pt: 0, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px`, mt: `${PAD}px` }}>About {APP_NAME}</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: sidePad, pb: `${PAD * 3}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          <Typography sx={{ ...p, mb: 0 }}>
            SousChef is a recipe and pantry companion designed to turn everyday grocery runs and existing ingredients into practical meal ideas&mdash;reducing food waste and making cooking simpler without clutter. Built around a calm, supportive kitchen workflow rather than rigid checklists, it helps you track what is in your pantry, find recipes around what you already have, and follow clear steps while you cook.
          </Typography>
        </Box>

        <Typography component="h2" sx={h2}>What it does</Typography>
        <Typography sx={p}><b>Pantry &amp; Receipt Flow.</b> Keep track of ingredients on hand and turn grocery purchases into actionable meal options.</Typography>
        <Typography sx={p}><b>Ingredient-First Suggestions.</b> Cook from what is already in your kitchen and needs to be used next.</Typography>
        <Typography sx={p}><b>Guided Cooking.</b> Stay focused at your cooking with straightforward steps, in-built step timers and low-friction controls.</Typography>

        <Typography component="h2" sx={h2}>Early stage &amp; feedback</Typography>
        <Typography sx={p}>
          SousChef is actively evolving with real-world testing and community input. Have a recipe idea, a missing ingredient, or something confusing in the flow? Share your feedback right here in the app&mdash;it goes directly to the builder to help shape what comes next.
        </Typography>
        <Button onClick={openFeedback} startIcon={<RateReviewOutlinedIcon sx={{ fontSize: '16px !important' }} />} aria-haspopup="dialog"
          sx={{ ...pillSecondary, textTransform: 'none' }}>
          Share feedback
        </Button>

        <Typography component="h2" sx={h2}>SousChef Pro</Typography>
        <Typography sx={p}>{PRO_PITCH}</Typography>
        <ProSignupLink align="left" />

        <Typography component="h2" sx={h2}>Built by</Typography>
        <Typography sx={p}>
          Created by Gaurav Dalbhanjan, a product and UX designer with a background in industrial design, engineering, and interactive workflows. Explore more work at{' '}
          <Box component="a" href={BUILDER_SITE} target="_blank" rel="noopener noreferrer" aria-label="greateagledesigns.com (external site, opens in a new tab)"
            sx={{ color: 'var(--accent-text)', fontWeight: 700 }}>greateagledesigns.com ↗</Box>.
        </Typography>

        <VersionLine align="left" sx={{ mt: `${PAD * 3}px` }} />
        <Typography sx={{ color: 'var(--text-3)', fontSize: `${T.sub}px` }}>{COPYRIGHT}</Typography>
      </Box>
    </Box>
  )
}
