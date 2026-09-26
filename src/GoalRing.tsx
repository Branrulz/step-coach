import {useLayoutEffect, useRef, useState} from 'react';

type Box = {width: number; height: number; stroke: number; radius: number};

/**
 * Completion ring traced around its parent's border, filling clockwise from the
 * top-left corner as `fraction` goes from 0 to 1. Decorative: the "% of goal"
 * text inside the panel carries the same value for screen readers.
 *
 * Stroke width and corner radius come from the parent's --ring-width and
 * --ring-radius custom properties so all geometry stays on Toolkit tokens.
 */
export function GoalRing({fraction}: {fraction: number}) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const svg = ref.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;
    const measure = () => {
      const style = getComputedStyle(svg);
      setBox({
        width: host.clientWidth,
        height: host.clientHeight,
        stroke: parseFloat(style.getPropertyValue('--ring-width')) || 0,
        radius: parseFloat(style.getPropertyValue('--ring-radius')) || 0,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const clamped = Math.min(1, Math.max(0, fraction));
  const rect = box && box.width > box.stroke * 2 && box.height > box.stroke * 2 && {
    x: box.stroke / 2,
    y: box.stroke / 2,
    width: box.width - box.stroke,
    height: box.height - box.stroke,
    rx: Math.min(box.radius, (box.width - box.stroke) / 2, (box.height - box.stroke) / 2),
    strokeWidth: box.stroke,
    pathLength: 100,
  };

  return (
    <svg ref={ref} className="goal-ring" aria-hidden="true" focusable="false">
      {rect && (
        <>
          <rect className="goal-ring-track" {...rect} />
          {clamped > 0 && (
            <rect
              className={clamped >= 1 ? 'goal-ring-fill goal-ring-done' : 'goal-ring-fill'}
              {...rect}
              strokeDasharray={`${(clamped * 100).toFixed(2)} 100`}
            />
          )}
        </>
      )}
    </svg>
  );
}
