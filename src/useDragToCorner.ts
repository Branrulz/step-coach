import {useEffect, useRef, type RefObject} from 'react';

export type Corner = 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';

// Movement before a press counts as a drag rather than a pinch/click.
const DRAG_THRESHOLD_PX = 12;

/**
 * Pinch-and-drag (Neural Band) or mouse/touch drag moves the square; on release
 * it snaps to whichever display corner its center is nearest. Uses Pointer
 * Events with client-coordinate deltas, as Meta's device guidance describes,
 * and cancels cleanly on pointercancel, hide and unmount.
 */
export function useDragToCorner(
  targetRef: RefObject<HTMLElement | null>,
  onDrop: (corner: Corner) => void,
) {
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let start: {id: number; x: number; y: number} | null = null;
    let dragging = false;
    let swallowClick = false;

    const reset = () => {
      start = null;
      dragging = false;
      target.classList.remove('dragging');
      target.style.transform = '';
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || start) return;
      start = {id: e.pointerId, x: e.clientX, y: e.clientY};
    };

    const onMove = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        target.classList.add('dragging');
        if (e.target instanceof Element) e.target.setPointerCapture?.(e.pointerId);
      }
      target.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const onUp = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      if (dragging) {
        // Nearest corner of the area the square lives in (its layout container).
        const box = target.getBoundingClientRect();
        const area = (target.parentElement ?? target).getBoundingClientRect();
        const right = box.left + box.width / 2 > area.left + area.width / 2;
        const bottom = box.top + box.height / 2 > area.top + area.height / 2;
        swallowClick = true; // the release must not also press a button
        onDropRef.current(`${bottom ? 'bottom' : 'top'}-${right ? 'right' : 'left'}`);
      }
      reset();
    };

    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const onVisibility = () => {
      if (document.hidden) reset();
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVisibility);
      reset();
    };
  }, [targetRef]);
}
