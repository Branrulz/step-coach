import {useEffect, useRef} from 'react';
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
import {useStepCounter, type Tracking} from './useStepCounter';

const fmt = (n: number) => n.toLocaleString();
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
        <div className="side-layout">
        <div className="action-page-shell">
          <GoalRing fraction={steps / goal} />
          <ScrollView ariaLabel="Today's step progress" tabIndex={0}>
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
