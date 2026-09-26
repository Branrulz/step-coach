import {useEffect, useRef, useState, type KeyboardEvent} from 'react';
import {
  App as WearablesApp,
  Button,
  ButtonRail,
  Page,
  Panel,
  ScrollView,
  TextColor,
  TextStyle,
  TextView,
  Toast,
} from '@wearables-ui-toolkit/mrbd';
import {GoalRing} from './GoalRing';
import {milestoneFor, milestoneMessage, motivation} from './steps';
import {useDragToCorner, type Corner} from './useDragToCorner';
import {useStepCounter, type Tracking} from './useStepCounter';

const fmt = (n: number) => n.toLocaleString();

// Where the square sits inside the display. Drag it to a corner, or pinch the
// step panel to step through the corners in this order.
const CORNERS: readonly Corner[] = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
const CORNER_KEY = 'stepcoach.corner';
const HINT_KEY = 'stepcoach.moveHintShown';

function loadCorner(): Corner {
  try {
    const saved = localStorage.getItem(CORNER_KEY);
    if (saved && (CORNERS as readonly string[]).includes(saved)) return saved as Corner;
  } catch {
    // Storage blocked: use the default.
  }
  return 'top-right';
}
const countOf = (n: number, singular: string, plural: string) =>
  `${fmt(n)} ${n === 1 ? singular : plural}`;

function statusText(tracking: Tracking, visible: boolean, demo: boolean): string {
  switch (tracking) {
    case 'idle':
      return 'Not started';
    case 'starting':
      return 'Waiting for sensor';
    case 'counting':
      if (!visible) return 'Paused while hidden';
      return demo ? 'Demo (simulated)' : 'Counting · estimated';
    case 'paused':
      return 'Paused';
    case 'denied':
      return 'Motion access denied';
    case 'no-sensor':
      return 'No motion sensor';
  }
}

function primaryAction(tracking: Tracking): string {
  switch (tracking) {
    case 'counting':
    case 'starting':
      return 'Pause';
    case 'paused':
      return 'Resume';
    case 'denied':
    case 'no-sensor':
      return 'Retry';
    default:
      return 'Start';
  }
}

export default function App() {
  const coach = useStepCounter();
  const {tracking, visible, demo, steps, goal, yesterday, streak} = coach;
  const percent = Math.min(100, Math.floor((steps / goal) * 100));

  // Celebrate each 25% of the goal once as it is crossed.
  const milestone = useRef({demo, value: milestoneFor(steps, goal)});
  useEffect(() => {
    const reached = milestoneFor(steps, goal);
    if (milestone.current.demo !== demo) {
      milestone.current = {demo, value: reached};
      return;
    }
    if (reached > milestone.current.value) Toast.show(milestoneMessage(reached));
    milestone.current.value = reached;
  }, [steps, goal, demo]);

  const [corner, setCorner] = useState<Corner>(loadCorner);
  const moveToast = useRef<number | null>(null);
  const moveTo = (next: Corner) => {
    setCorner(next);
    try {
      localStorage.setItem(CORNER_KEY, next);
    } catch {
      // Storage blocked: the position still changes for this session.
    }
    // Replace the previous "Moved to…" toast so quick moves never show a stale corner.
    if (moveToast.current !== null) Toast.cancel(moveToast.current);
    moveToast.current = Toast.show(`Moved to ${next.replace('-', ' ')}`);
  };

  // Main way to move: pinch, hold and drag the square toward a corner.
  const shellRef = useRef<HTMLDivElement>(null);
  useDragToCorner(shellRef, moveTo);

  // Tell first-time wearers the square can be moved.
  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      return;
    }
    Toast.show('Tip: pinch, hold and drag to move');
  }, []);

  // Swipe-and-pinch fallback (Meta requires every action to work without drag):
  // swipe up onto the step panel and pinch to step to the next corner.
  // Swiping down from the panel returns to the buttons when there is nothing to scroll.
  const onShellKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest('.action-dock') || e.key !== 'Enter') return;
    e.preventDefault();
    moveTo(CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length]);
  };
  // Runs before the panel's own scrolling, which otherwise keeps focus on it.
  const onShellKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (e.key !== 'ArrowDown' || el.closest('.action-dock')) return;
    // Is there unread content below? Measure the content itself: the scroll view
    // adds overscroll room past the end, so scrollHeight alone always says yes.
    const canScroll = [el, ...el.querySelectorAll<HTMLElement>('*')].some(node => {
      const content = node.firstElementChild as HTMLElement | null;
      if (!content || node.scrollHeight <= node.clientHeight + 1) return false;
      if (!/auto|scroll/.test(getComputedStyle(node).overflowY)) return false; // decorative layers
      return node.scrollTop + node.clientHeight < content.offsetTop + content.offsetHeight - 1;
    });
    if (canScroll) return;
    const first = shellRef.current?.querySelector<HTMLElement>('.action-dock [role="button"][tabindex="0"]');
    if (!first) return;
    e.preventDefault();
    e.stopPropagation();
    first.focus();
  };

  const running = tracking === 'counting' || tracking === 'starting';
  const handlePrimary = () => {
    if (running) {
      coach.pause();
    } else {
      void coach.start();
    }
  };

  return (
    <WearablesApp>
      <Page showHeader={false} enableSystemBarInset={false}>
        {/* Everything sits in a narrow column in the top-right corner. Black is
            see-through on the glasses, so the rest of the display stays clear. */}
        <div className={`side-layout corner-${corner}`}>
        <div className="action-page-shell" ref={shellRef} onKeyDown={onShellKeyDown} onKeyDownCapture={onShellKeyDownCapture}>
          <GoalRing fraction={steps / goal} />
          <ScrollView ariaLabel="Today's step progress. Pinch to move to the next corner." tabIndex={0}>
            <Panel width="100%">
              <div className="content-inset">
                <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
                  {countOf(steps, 'step', 'steps')} today{demo ? ' (demo)' : ''}
                </TextView>
                <TextView as="p" textStyle={TextStyle.META1}>
                  {percent}% of {fmt(goal)} goal
                </TextView>
                <TextView as="p" textStyle={TextStyle.BODY2}>
                  {motivation(steps, goal, yesterday)}
                </TextView>
                <div className="stat">
                  <TextView as="p" textStyle={TextStyle.META1}>
                    {streak}-day streak
                  </TextView>
                  <TextView as="p" textStyle={TextStyle.META1} textColor={TextColor.SECONDARY}>
                    {statusText(tracking, visible, demo)}
                  </TextView>
                </div>
              </div>
            </Panel>
          </ScrollView>
          <div className="action-dock">
            <ButtonRail>
              <Button title={primaryAction(tracking)} onClick={handlePrimary} />
              <Button
                title={demo ? 'Exit' : 'Demo'}
                onClick={demo ? coach.endDemo : coach.startDemo}
              />
            </ButtonRail>
          </div>
        </div>
        </div>
      </Page>
    </WearablesApp>
  );
}
