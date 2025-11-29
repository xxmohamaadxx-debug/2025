export function animationsEnabled() {
  // Respect explicit env var to disable animations at build time
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DISABLE_ANIMATIONS === '1') return false;

  // Respect global runtime flag (set by Admin page to disable animations on that page)
  if (typeof window !== 'undefined' && window.__DISABLE_ANIMATIONS__ === true) return false;

  // Respect user's system preference
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  // Default: animations enabled
  return true;
}
