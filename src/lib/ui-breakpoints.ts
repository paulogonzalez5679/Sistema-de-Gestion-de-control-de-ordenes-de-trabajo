/**
 * Breakpoints alineados con CSS (`globals.css`, custom media).
 * Úsalo en `matchMedia` o lógica cliente cuando haga falta JS.
 */
export const UI_BREAKPOINTS = {
  xs: 380,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1440,
  xxl: 1920,
  ultra: 2560
} as const;

export type UIBreakpointKey = keyof typeof UI_BREAKPOINTS;
