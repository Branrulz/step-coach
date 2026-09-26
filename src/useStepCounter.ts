import {useCallback, useEffect, useRef, useState} from 'react';
import {
  dayKey,
  loadHistory,
  saveHistory,
  StepDetector,
  streakDays,
  yesterdaySteps,
} from './steps';

export type Tracking = 'idle' | 'starting' | 'counting' | 'paused' | 'denied' | 'no-sensor';

const COMMIT_MS = 200; // 5 Hz UI updates, well under the 30 Hz panel
const PERSIST_MS = 2000;
const SENSOR_TIMEOUT_MS = 3000;
const DEMO_TICK_MS = 500;
const DEMO_START = {steps: 4850, yesterday: 5400, streak: 4};

type MotionPermission = {requestPermission?: () => Promise<'granted' | 'denied'>};

declare global {
  interface Window {
    stepCoachTest?: {addSteps: (n: number) => void};
  }
}

export function useStepCounter() {
  const historyRef = useRef(loadHistory());
  const todayRef = useRef(dayKey());
  const stepsRef = useRef(historyRef.current.days[todayRef.current] ?? 0);
  const demoStepsRef = useRef(DEMO_START.steps);

  const [tracking, setTracking] = useState<Tracking>('idle');
  const [demo, setDemo] = useState(false);
  const [steps, setSteps] = useState(stepsRef.current);
  const [today, setToday] = useState(todayRef.current);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');

  const persist = useCallback(() => {
    historyRef.current.days[todayRef.current] = stepsRef.current;
    saveHistory(historyRef.current);
  }, []);

  // Roll the count over at local midnight, saving the finished day first.
  const syncDay = useCallback(() => {
    const key = dayKey();
    if (key === todayRef.current) return;
    persist();
    todayRef.current = key;
    stepsRef.current = historyRef.current.days[key] ?? 0;
    setToday(key);
  }, [persist]);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const listening = (tracking === 'starting' || tracking === 'counting') && visible;

  useEffect(() => {
    if (!listening) return;

    if (demo) {
      const id = window.setInterval(() => {
        demoStepsRef.current += 3;
        setSteps(demoStepsRef.current);
      }, DEMO_TICK_MS);
      return () => window.clearInterval(id);
    }

    let gotEvent = false;
    const detector = new StepDetector(() => {
      syncDay();
      stepsRef.current += 1;
    });
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (!gotEvent) {
        gotEvent = true;
        setTracking(t => (t === 'starting' ? 'counting' : t));
      }
      detector.push(a.x, a.y, a.z, event.timeStamp);
    };
    window.addEventListener('devicemotion', onMotion);

    const timeoutId = window.setTimeout(() => {
      if (!gotEvent) setTracking(t => (t === 'starting' ? 'no-sensor' : t));
    }, SENSOR_TIMEOUT_MS);

    let committed = -1;
    let lastPersist = performance.now();
    const commitId = window.setInterval(() => {
      syncDay();
      if (stepsRef.current !== committed) {
        committed = stepsRef.current;
        setSteps(committed);
      }
      if (performance.now() - lastPersist >= PERSIST_MS) {
        lastPersist = performance.now();
        persist();
      }
    }, COMMIT_MS);

    return () => {
      window.removeEventListener('devicemotion', onMotion);
      window.clearTimeout(timeoutId);
      window.clearInterval(commitId);
      persist();
    };
  }, [listening, demo, persist, syncDay]);

  // Deterministic injection for automated tests: load the app with ?test.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('test')) return;
    window.stepCoachTest = {
      addSteps: (n: number) => {
        syncDay();
        stepsRef.current += n;
        persist();
        setSteps(stepsRef.current);
      },
    };
    return () => {
      delete window.stepCoachTest;
    };
  }, [persist, syncDay]);

  const start = useCallback(async () => {
    if (demo) {
      setTracking('counting');
      return;
    }
    const Motion = (window as {DeviceMotionEvent?: MotionPermission}).DeviceMotionEvent;
    if (!Motion) {
      setTracking('no-sensor');
      return;
    }
    if (typeof Motion.requestPermission === 'function') {
      try {
        if ((await Motion.requestPermission()) !== 'granted') {
          setTracking('denied');
          return;
        }
      } catch {
        setTracking('denied');
        return;
      }
    }
    setTracking('starting');
  }, [demo]);

  const pause = useCallback(() => setTracking('paused'), []);

  const startDemo = useCallback(() => {
    demoStepsRef.current = DEMO_START.steps;
    setDemo(true);
    setSteps(DEMO_START.steps);
    setTracking('counting');
  }, []);

  const endDemo = useCallback(() => {
    setDemo(false);
    setSteps(stepsRef.current);
    setTracking('idle');
  }, []);

  const goal = historyRef.current.goal;
  return {
    tracking,
    visible,
    demo,
    steps,
    goal,
    yesterday: demo ? DEMO_START.yesterday : yesterdaySteps(historyRef.current, today),
    streak: demo ? DEMO_START.streak : streakDays(historyRef.current, today, steps),
    start,
    pause,
    startDemo,
    endDemo,
  };
}
