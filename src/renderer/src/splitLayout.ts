export type SplitOrientation = 'vertical' | 'horizontal';

/** Parse a persisted orientation defensively; vertical is the long-standing default. */
export function parseSplitOrientation(value: unknown): SplitOrientation {
  return value === 'horizontal' ? 'horizontal' : 'vertical';
}

/** Clamp the sidebar pane size for its current divider orientation. In a vertical
 *  split the pane is the sidebar width; in a horizontal split it is the floor's
 *  height above the full-width terminal. */
export function clampPaneSize(
  value: number,
  viewportSize: number,
  orientation: SplitOrientation
): number {
  const min = orientation === 'horizontal' ? 180 : 320;
  const hardMax = orientation === 'horizontal' ? 800 : 1200;
  const reserve = orientation === 'horizontal' ? 240 : 360;
  const max = Math.min(hardMax, Math.max(min, viewportSize - reserve));
  return Math.min(max, Math.max(min, Math.round(value)));
}
