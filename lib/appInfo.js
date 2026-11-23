// App identity shown in Settings and About. Bump APP_VERSION with each deploy.
export const APP_NAME = 'SousChef Lite'
export const APP_VERSION = 'SC_2026_11_V1'
// What SousChef Pro adds (signup sheet, About).
export const PRO_PITCH = 'Pro unlocks a personal AI agent, one-click grocery delivery checkout, and automatic account sync across devices and more!'
export const COPYRIGHT = '\u00a9 greateagledesigns.com. All rights reserved.'
export const BUILDER_SITE = 'https://greateagledesigns.com'

// SousChef Pro early signup (Google Form, same approach as feedback below).
export const PRO_SIGNUP_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSdckBZGhj85UdpUZFbOk02G2QZ_BvHm70spBc3x-Qr-TYEn5Q/formResponse',
  fields: { email: 'entry.950253853' }, // "Please mention your email for early access to SousChef Pro", required
}

// Feedback goes to the builder's Google Form. The app has its own form and
// posts to the form's response endpoint. Field ids were read from the form's
// page (FB_PUBLIC_LOAD_DATA_): if questions are added or changed in Google
// Forms, update them here.
export const FEEDBACK_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSfSBpvlvo5LQUxD_R39PUQ7s9uJKcohT3uJKUhMlwO7K5atxQ/formResponse',
  fields: {
    text: 'entry.2069944489',   // "Describe your feedback (required)", short answer
    rating: 'entry.1203995073', // "Rate your experience", 1-5 stars, optional
  },
}
