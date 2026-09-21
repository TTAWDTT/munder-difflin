import { useEffect, useRef, useState } from 'react';
import { clampPaneSize, type SplitOrientation } from '@/splitLayout';

export interface SidebarSplitterProps {
  /** Current sidebar pane size in px: width for a vertical divider, height for
   *  a horizontal divider. */
  paneSize: number;
  /** Called with the new pane size (already clamped for the current viewport). */
  onChange: (px: number) => void;
  /** Containing viewport width — used to clamp a vertical divider. */
  viewportWidth: number;
  /** Containing viewport height — used to clamp a horizontal divider. */
  viewportHeight: number;
  /** The divider direction. `vertical` is side-by-side; `horizontal` is
   *  floor above the terminal. */
  orientation?: SplitOrientation;
  min?: number;
  max?: number;
}

/**
 * Drag handle between the office floor and agent terminal pane. It stays
 * direction-aware so the same visual affordance works whether the sidebar is
 * beside the floor (vertical) or below it (horizontal).
 */
export function SidebarSplitter({
  paneSize, onChange, viewportWidth, viewportHeight,
  orientation = 'vertical', min, max
}: SidebarSplitterProps) {
  const isHorizontal = orientation === 'horizontal';
  const effectiveMin = min ?? (isHorizontal ? 180 : 320);
  const effectiveMax = max ?? (isHorizontal ? 800 : 1200);
  const startRef = useRef<{ x: number; y: number; paneSize: number } | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      // In the vertical layout, dragging left gives the sidebar more room. In a
      // horizontal layout, dragging down gives the floor more height.
      const delta = isHorizontal
        ? e.clientY - startRef.current.y
        : startRef.current.x - e.clientX;
      const next = clampPaneSize(startRef.current.paneSize + delta, isHorizontal ? viewportHeight : viewportWidth, orientation);
      onChange(Math.min(effectiveMax, Math.max(effectiveMin, next)));
    };
    const onUp = () => {
      startRef.current = null;
      setActive(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    if (active) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.cursor = isHorizontal ? 'ns-resize' : 'ew-resize';
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [active, isHorizontal, viewportWidth, viewportHeight, effectiveMin, effectiveMax, onChange, orientation]);

  return (
    <div
      onMouseDown={(e) => {
        startRef.current = { x: e.clientX, y: e.clientY, paneSize };
        setActive(true);
        e.preventDefault();
      }}
      onDoubleClick={() => onChange(isHorizontal ? 510 : 420)}
      title="Drag to resize · double-click to reset"
      style={isHorizontal
        ? {
            height: 10,
            cursor: 'ns-resize',
            flexShrink: 0,
            position: 'relative',
            background: active ? 'var(--cth-cream-300)' : 'transparent'
          }
        : {
            width: 10,
            cursor: 'ew-resize',
            flexShrink: 0,
            position: 'relative',
            background: active ? 'var(--cth-cream-300)' : 'transparent'
          }}
    >
      <div style={isHorizontal
        ? {
            position: 'absolute',
            left: 0, right: 0, top: 4,
            height: 2,
            background: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-300)'
          }
        : {
            position: 'absolute',
            top: 0, bottom: 0, left: 4,
            width: 2,
            background: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-300)'
          }} />
      <div style={isHorizontal
        ? {
            position: 'absolute',
            top: 2, left: '50%', transform: 'translateX(-50%)',
            width: 24, height: 6,
            display: 'flex', justifyContent: 'space-between'
          }
        : {
            position: 'absolute',
            top: '50%', left: 2, transform: 'translateY(-50%)',
            width: 6, height: 24,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
        <span style={{ width: 2, height: 2, background: 'var(--cth-ink-900)' }} />
        <span style={{ width: 2, height: 2, background: 'var(--cth-ink-900)' }} />
        <span style={{ width: 2, height: 2, background: 'var(--cth-ink-900)' }} />
      </div>
    </div>
  );
}
