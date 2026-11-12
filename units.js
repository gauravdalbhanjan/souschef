// Locale-aware measurement system for the quantity picker.
// US / Liberia / Myanmar use imperial; everyone else metric. We read the
// browser locale (no GPS permission needed) and default the unit wheel
// accordingly, starting at "lb" for imperial as requested.

const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM'])

function detectRegion() {
  try {
    // Intl region (e.g. "en-US" -> "US"), falls back to navigator.language
    const loc = (Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || 'en-US')
    const region = loc.split('-')[1]
    return region ? region.toUpperCase() : 'US'
  } catch {
    return 'US'
  }
}

export const measurementSystem = IMPERIAL_REGIONS.has(detectRegion()) ? 'imperial' : 'metric'

// Unit options shown in the wheel, ordered so the common weight leads.
export const UNIT_OPTIONS = measurementSystem === 'imperial'
  ? ['lb', 'oz', 'unit', 'pack', 'can', 'bunch', 'head', 'slice', 'clove', 'dozen', 'cup', 'g', 'kg']
  : ['kg', 'g', 'unit', 'pack', 'can', 'bunch', 'head', 'slice', 'clove', 'dozen', 'cup', 'ml', 'l']

// Default unit to preselect for a freshly added item.
export const DEFAULT_UNIT = measurementSystem === 'imperial' ? 'lb' : 'kg'

export const QTY_OPTIONS = ['0.25', '0.5', '0.75', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '15', '20', '24', '30']
