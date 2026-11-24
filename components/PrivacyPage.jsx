// Privacy page. Every line here was checked against the code (see
// PROJECT_CONTEXT.md "Privacy statements: verification"). Wording is a draft
// pending legal review before a public launch.
import { Box, Typography } from '@mui/material'
import GoBackButton from './GoBackButton'
import { surface } from './Ambient'
import { T, PAD } from '../theme'
import { getSource } from '../lib/guardrails/sources.js'
import META from '../lib/data/datasetMeta.json'

const h2 = { color: 'var(--fg)', fontWeight: 800, fontSize: `${T.title + 3}px`, mt: `${PAD * 3}px`, mb: `${PAD}px` }
const p = { color: 'var(--text-2)', fontSize: `${T.body}px`, lineHeight: 1.6, mb: `${PAD}px` }

// Share of dataset recipes without a photo of their own (from the build).
const noPhotoPct = Math.round(100 * (1 - (META.withImages || 0) / Math.max(1, META.count)))

function Src({ id }) {
  const s = getSource(id)
  if (!s) return null
  return <Box component="a" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} (external site, opens in a new tab)`} sx={{ color: 'var(--accent-text)', fontWeight: 700 }}>{s.name} ↗</Box>
}

export default function PrivacyPage({ onBack, inDrawer = false }) {
  // In the Settings drawer (iPad / laptop) the content gets more side room.
  const sidePad = inDrawer ? `${PAD * 3}px` : `${PAD * 2}px`
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: sidePad, pt: 0, pb: `${PAD}px`, flexShrink: 0 }}>
        <GoBackButton onClick={onBack} />
        <Typography component="h1" sx={{ color: 'var(--fg)', fontWeight: 800, fontSize: `${T.heading + 2}px`, mt: `${PAD}px` }}>Privacy</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: sidePad, pb: `${PAD * 3}px`, '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box sx={{ ...surface, p: `${PAD * 1.5}px` }}>
          <Typography sx={{ ...p, mb: 0 }}>
            SousChef has no accounts. Your pantry, cart, routines, events and settings are saved in this browser on this device.
            Use Settings → Export data to keep a copy, and Settings → Erase everything to delete it all. The only things you can choose to send are feedback and a Pro early-signup email (see below).
          </Typography>
        </Box>

        <Typography component="h2" sx={h2}>What leaves your device</Typography>
        <Typography sx={p}><b>App files.</b> The app, the receipt scanner files and the recipe collection load from this website. The recipe collection downloads the first time you add groceries or open Browse all. Like any website, its host sees normal request details such as your IP address.</Typography>
        <Typography sx={p}><b>Page analytics.</b> This site uses Vercel Web Analytics to count page visits. Your pantry, recipes, requests and receipts are not part of it.</Typography>
        <Typography sx={p}><b>On-device AI is off.</b> This version of SousChef doesn&rsquo;t download or run an AI model. Suggestions, search and receipt reading use built-in rules on this device.</Typography>
        <Typography sx={p}><b>Recipe photos.</b> A recipe&rsquo;s own photo loads from Wikimedia (or Unsplash for the bundled recipes). About {noPhotoPct}% of the collection&rsquo;s recipes have no usable photo of their own; for those, and for events and routine dishes you create, up to 4 words of the dish or event name are sent from your browser to Wikimedia Commons to look for one, with no cookies and no referrer. Your pantry, amounts, brands and allergies are never included. Results are saved on this device so the same search isn&rsquo;t repeated. When nothing is found, the app shows its own illustration.</Typography>
        <Typography sx={p}><b>Weather.</b> If you allow location, your coordinates rounded to two decimal places (about 1 km) are sent to Open-Meteo to tint the home screen. <Src id="open-meteo-terms" /></Typography>
        <Typography sx={p}><b>Voice input.</b> The microphone uses your browser&rsquo;s speech recognition. Depending on the browser, your audio may be sent to the browser maker&rsquo;s speech service or processed on the device. <Src id="mdn-speech" /></Typography>
        <Typography sx={p}><b>Calendar reminders (external).</b> &ldquo;Google Calendar ↗&rdquo; opens Google Calendar in a new tab with the reminder&rsquo;s title, time and one safety line for you to confirm. The Apple / Outlook option saves a calendar file on your device instead. No allergy or health details are included.</Typography>
        <Typography sx={p}><b>Feedback (external).</b> When you tap Send in the Feedback form, what you typed and your star rating are sent to the builder&rsquo;s Google Form (Google Forms), with no cookies and no referrer. Nothing from your pantry or recipes is added to it, and nothing is sent until you tap Send.</Typography>
        <Typography sx={p}><b>SousChef Pro early signup (external).</b> If you join early access, the email you type is sent to the builder&rsquo;s Google Form (Google Forms), with no cookies and no referrer, and is used only to contact you about SousChef Pro.</Typography>
        <Typography sx={p}><b>Shopping links.</b> Delivery checkout is locked in SousChef Lite, so the cart doesn&rsquo;t send your items to any store.</Typography>
        <Typography sx={p}><b>Reference links (external).</b> Food-safety and nutrition references (for example FDA and USDA) are marked ↗ and open in a new tab. Recipe and photo credits are shown as text and don&rsquo;t link anywhere.</Typography>
      </Box>
    </Box>
  )
}
