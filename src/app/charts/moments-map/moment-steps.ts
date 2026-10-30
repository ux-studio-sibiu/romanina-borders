import { type Moment, MOMENTS } from '../../data/moments';

// The steps of the story, in order, for the scroll wheel and the scrollbar: each moment, or, for a moment with dated
// migrations (271), each migration on its own instead (`arrow`: its index in the moment's arrows), the overview with
// every arrow not a step of its own
export type Step = { moment: Moment; arrow: number | null; label: string };
export const STEPS = MOMENTS.flatMap<Step>(m => {
  const dated = (m.arrows ?? []).map((a, i) => ({ a, i })).filter(({ a }) => a.years);
  if (!dated.length) return [{ moment: m, arrow: null, label: `${m.label}: ${m.title}` }];
  return dated.map(({ a, i }) => ({ moment: m, arrow: i, label: `${m.label}: ${a.when ? `${a.when}, ` : ''}${a.name}` }));
});

// The scroll wheel's step: how far to scroll (px), the pause that ends a gesture, the least time between steps (ms)
const WHEEL_THRESHOLD = 40, WHEEL_GAP = 200, WHEEL_STEP = 700;

// The scroll wheel, read as steps: one per gesture, down for later (1), up for earlier (-1), 0 for none yet. A trackpad
// sends a stream of small events and keeps sending them as it coasts, so the deltas add up to a threshold, a step is
// taken once per gesture (a gap of WHEEL_GAP ms with no events ends one), and never sooner than WHEEL_STEP ms after the
// last.
export class WheelSteps {
  private sum = 0;
  private last = 0;
  private stepped = 0;
  private used = false;

  step(event: WheelEvent): 1 | -1 | 0 {
    const now = performance.now();
    if (now - this.last > WHEEL_GAP) { this.sum = 0; this.used = false; }
    this.last = now;
    if (this.used || now - this.stepped < WHEEL_STEP) return 0;
    this.sum += event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? event.deltaY : event.deltaY * 40;
    if (Math.abs(this.sum) < WHEEL_THRESHOLD) return 0;
    const way = this.sum > 0 ? 1 : -1;
    this.used = true; this.stepped = now; this.sum = 0;
    return way;
  }
}
