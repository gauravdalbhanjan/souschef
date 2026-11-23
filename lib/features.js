// Feature switches for this tier.
// On-device AI (WebLLM) is off: recipes, steps and images come from the bundled
// catalog and the open recipe dataset (lib/dataset.js). The WebLLM code stays in
// the repo but no runtime module imports it (tests/runtime.test.js checks this).
// How to turn it back on: docs/ai/README.md.
export const ON_DEVICE_AI = false

// SousChef Lite (this tier). Pro features show as locked, never half-working.
export const TIER = 'Lite'
export const PRO = {
  deliveryCheckout: false, // "Checkout - choose delivery" (store hand-off links)
  emailReceipts: false,    // paste a receipt email to add groceries
  accounts: false,         // email sign-in and account sync
}
export const LOCKED_NOTE = 'Available in SousChef Pro.'
