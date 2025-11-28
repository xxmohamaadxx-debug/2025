export const isDesktop = () => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
export const shouldEnableMotion = () => isDesktop() && !prefersReducedMotion();

export default { isDesktop, prefersReducedMotion, shouldEnableMotion };
