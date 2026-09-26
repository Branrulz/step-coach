// Step detection, daily history, and motivation copy. No React here.

export const DEFAULT_GOAL = 6000;
const STORAGE_KEY = 'stepcoach.v1';
const KEEP_DAYS = 60;

export type History = {goal: number; days: Record<string, number>};

export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

export function loadHistory(): History {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<History>;
      return {
        goal: typeof parsed.goal === 'number' && parsed.goal > 0 ? parsed.goal : DEFAULT_GOAL,
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      };
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return {goal: DEFAULT_GOAL, days: {}};
}

export function saveHistory(history: History): void {
  const keys = Object.keys(history.days).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) {
    delete history.days[old];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage unavailable: today's count still works in memory.
  }
}

/** Consecutive days at or above goal, ending today (if met) or yesterday. */
export function streakDays(history: History, today: string, todaySteps: number): number {
  let streak = todaySteps >= history.goal ? 1 : 0;
  let key = shiftDay(today, -1);
  while ((history.days[key] ?? 0) >= history.goal) {
    streak += 1;
    key = shiftDay(key, -1);
  }
  return streak;
}

export function yesterdaySteps(history: History, today: string): number {
  return history.days[shiftDay(today, -1)] ?? 0;
}

const fmt = (n: number) => n.toLocaleString();

export function motivation(steps: number, goal: number, yesterday: number): string {
  if (steps >= goal) {
    const bonus = steps - goal;
    return bonus > 0 ? `Goal smashed. ${fmt(bonus)} bonus steps and counting.` : 'Goal hit. Nice work today.';
  }
  if (steps === 0) return 'The first steps count the most. Let’s go.';
  if (yesterday > steps && yesterday - steps <= 1500) {
    return `${fmt(yesterday - steps)} steps to beat yesterday.`;
  }
  const pct = steps / goal;
  if (pct >= 0.75) return `Almost there. ${fmt(goal - steps)} to go, finish strong.`;
  if (pct >= 0.5) return 'Past halfway. Keep the pace up.';
  return `${fmt(goal - steps)} to go. A 10-minute walk is about 1,000.`;
}

export const MILESTONES = [0.25, 0.5, 0.75, 1] as const;

export function milestoneMessage(fraction: number): string {
  if (fraction >= 1) return 'Daily goal reached!';
  if (fraction >= 0.75) return '75% there';
  if (fraction >= 0.5) return 'Halfway there';
  return 'Quarter of the way';
}

/** Highest milestone reached, or 0. */
export function milestoneFor(steps: number, goal: number): number {
  let reached = 0;
  for (const m of MILESTONES) if (steps >= goal * m) reached = m;
  return reached;
}

/**
 * Peak detector on acceleration magnitude. Head-worn motion is a vertical
 * bounce per step, so we low-pass the signal, subtract a slow gravity baseline,
 * and count rising crossings of a threshold. Peaks closer than 250 ms
 * (> 4 steps/s) are rejected as noise. Counts are estimates.
 */
export class StepDetector {
  private smooth = 0;
  private baseline = 0;
  private armed = true;
  private lastStepAt = -Infinity;
  private primed = false;

  constructor(
    private readonly onStep: () => void,
    private readonly threshold = 1.1,
    private readonly rearm = 0.3,
    private readonly minIntervalMs = 250,
  ) {}

  push(x: number, y: number, z: number, timeMs: number): void {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (!this.primed) {
      this.smooth = magnitude;
      this.baseline = magnitude;
      this.primed = true;
      return;
    }
    this.smooth += 0.25 * (magnitude - this.smooth);
    this.baseline += 0.02 * (magnitude - this.baseline);
    const delta = this.smooth - this.baseline;

    if (this.armed && delta > this.threshold) {
      this.armed = false;
      if (timeMs - this.lastStepAt >= this.minIntervalMs) {
        this.lastStepAt = timeMs;
        this.onStep();
      }
    } else if (!this.armed && delta < this.rearm) {
      this.armed = true;
    }
  }
}
