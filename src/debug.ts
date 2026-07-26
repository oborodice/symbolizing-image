export const isDebugMode = new URLSearchParams(window.location.search).has(
  'debug',
)
