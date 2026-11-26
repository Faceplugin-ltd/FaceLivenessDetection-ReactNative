/**
 * The native app's palette, from
 * `Face-LivenessDetection-Android/app/src/main/res/values/colors.xml`.
 * Kept as exact hex so the React Native demo matches the Android and iOS screens.
 */
export const FP = {
  bg: '#0B0B12',
  surface: '#14141D',
  surfaceAlt: '#1B1B27',
  text: '#F2F0F7',
  muted: '#9B96AC',
  accent: '#A48CFF',
  accentDim: '#2A2140',
  danger: '#FF6B6B',
  stroke: '#262635',

  brandViolet: '#7C5CFF',
  brandVioletDeep: '#4A2BB5',

  statusError: '#E5484D',
  statusOk: '#2EE6A6',
  statusInfo: '#5B8DEF',

  /** `bg_hero.xml` — the hero header's 135° gradient. */
  heroFrom: '#241B46',
  heroTo: '#101019',
} as const;

/** `bg_card.xml` / `bg_tile_surface.xml` — a surface card with a hairline stroke. */
export const card = (radius = 20) =>
  ({
    backgroundColor: FP.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: FP.stroke,
  }) as const;
