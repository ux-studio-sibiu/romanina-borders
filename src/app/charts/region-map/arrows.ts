// The arrows for movement (the peoples passing through): what one is, how far each is drawn at a year (the play
// slider's), and its shape on screen, a smooth curve widening to a big head.

// An arrow across the map, for movement rather than borders (the peoples passing through): a smooth curve
// through its waypoints, in [lon, lat], first to last; the name (and when) at the waypoint labelAt, the middle by default
export type MapArrow = { id: string; name: string; when?: string; years?: [number, number]; points: [number, number][]; labelAt?: number };

// The arrows by a year (the play slider's): each draws on over its years (at least DRAW_YEARS, so a
// short one is still seen), stays LINGER_YEARS after them, then fades over FADE_YEARS to PAST, a trace of where it went
const DRAW_YEARS = 60, LINGER_YEARS = 80, FADE_YEARS = 60, PAST = 0.2;

// The arrows as at a year: how much of each is drawn, how strongly it shows, and which one is named (the latest begun,
// so one is always named once the first has; -1: none yet). `only`: one arrow on its own, the others hidden (a migration
// picked on the play slider). Exported: the play slider's title names the same one.
export function arrowsAtYear(arrows: Pick<MapArrow, 'years'>[], year: number, only: number | null = null) {
  const states = arrows.map((a, i) => {
    const [from, to] = a.years ?? [0, 0], drawn = Math.max(0, Math.min(1, (year - from) / Math.max(DRAW_YEARS, to - from)));
    const past = Math.max(0, Math.min(1, (year - to - LINGER_YEARS) / FADE_YEARS));
    return { drawn, opacity: only === null ? 1 - past * (1 - PAST) : i === only ? 1 : 0 };
  });
  return { states, caption: only ?? states.reduce((last, s, i) => s.drawn > 0 ? i : last, -1) };
}

// The year an arrow is fully drawn on (as arrowsAtYear draws it): where the play slider marks it
export function arrowDrawnYear(a: Pick<MapArrow, 'years'>) {
  const [from, to] = a.years ?? [0, 0];
  return from + Math.max(DRAW_YEARS, to - from);
}

// The years the arrows play over: from the first one's start until the last one is still named
export function arrowSpan(arrows: Pick<MapArrow, 'years'>[]): [number, number] | null {
  const years = arrows.flatMap(a => a.years ?? []);
  return years.length ? [Math.min(...years), Math.max(...years) + LINGER_YEARS] : null;
}

// The arrow's shape. Its half-width grows from TAIL to BODY along the line; the head, HEAD long and
// HEAD_WIDTH across each side, ends at the last point. In pixels, the same at every view.
const TAIL = 4, BODY = 13, HEAD = 42, HEAD_WIDTH = 28;

// A smooth line through the points (uniform Catmull–Rom, 12 samples per stretch), as screen points
export function smoothLine(points: [number, number][]) {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const line: [number, number][] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 1; s <= 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      line.push([f(0), f(1)]);
    }
  }
  return line;
}

// The outline round a line: up its left side, round the head, back down its right side
export function arrowShape(line: [number, number][]) {
  const lengths = [0];
  for (let i = 1; i < line.length; i++) lengths.push(lengths[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = lengths[lengths.length - 1] || 1, bodyEnd = total - Math.min(HEAD, total * 0.35);
  const unit = (a: number[], b: number[]) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; };
  const left: number[][] = [], right: number[][] = [];
  let last = 0;
  for (let i = 0; i < line.length && lengths[i] <= bodyEnd; i++) {
    const [ux, uy] = unit(line[Math.max(0, i - 1)], line[Math.min(line.length - 1, i + 1)]), w = TAIL + (BODY - TAIL) * (lengths[i] / bodyEnd);
    left.push([line[i][0] - uy * w, line[i][1] + ux * w]);
    right.push([line[i][0] + uy * w, line[i][1] - ux * w]);
    last = i;
  }
  const base = line[last], tip = line[line.length - 1], [ux, uy] = unit(base, tip);
  const wing = (side: 1 | -1) => [base[0] - uy * HEAD_WIDTH * side, base[1] + ux * HEAD_WIDTH * side];
  const round = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return 'M' + [...left, wing(1), tip, wing(-1), ...right.reverse()].map(round).join('L') + 'Z';
}
