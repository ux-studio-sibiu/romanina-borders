import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import type { Moment } from '../../data/moments';

// Lesson 07: how close two moments may sit on the scale, as a share of its length (room for each one's years and title),
// and a moment's own ticks (below); how fast play moves the triangle, in lengths a second (271–1000, the peoples passing
// through, in about 14 s)
const MIN_GAP = 0.055;
// The ticks, in px: their least distance from the moments' labels above and below them (TICK_PAD), from each other's
// middles (TICK_GAP, a line of their text) and their half height; how far a moment's label reaches below its dot's middle
// (its years and title, or its years alone when folded) and above it (time-scale.scss)
const TICK_PAD = 30, TICK_GAP = 16, TICK_HALF = 10, LABEL_BELOW_OPEN = 26, LABEL_BELOW_FOLDED = 10, LABEL_ABOVE = 8;
const PLAY_SPEED = 0.025;

// Lesson 07: the moments down a time scale, each where its year falls, roughly: a straight scale would crowd the last two
// centuries' seven moments into a tenth of its length, so the moments are pushed apart to at least MIN_GAP. The years in
// between are spread evenly from one moment to the next. Each moment's dot sits on the line (the panel's left edge), its
// years level with it and its title under them. It folds to the years only (open), with the ear on the line's left.
//
// The triangle, outside the line, is where in time the map is: it can rest anywhere, and the map shows the moment before
// it. Drag it (only it drags: a click on a dot is just that moment); the year at it goes out too (scrubbed), so a moment
// can show what happens within it. A moment with dated events inside it (271–1000: the peoples passing through, its
// arrows) shows them, while chosen, as ticks with their year and name, and a small play button that moves the
// triangle through them by itself.
//
// Dragging over a moment with another view (one that zooms) only marks it, and shows it on letting go: one zoom, not one
// for every moment passed. Clicking a moment, or the arrow keys, put the triangle on the moment itself.
@Component({
  selector: 'app-time-scale',
  templateUrl: './time-scale.html',
  styleUrl: './time-scale.scss'
})
export class TimeScale {
  readonly moments = input.required<Moment[]>();
  readonly activeId = input.required<string>();
  readonly picked = output<Moment>();
  readonly scrubbed = output<number | null>(); // the year under the triangle, or null: the moment as a whole
  readonly open = input(true);
  readonly openChange = output<boolean>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  // The track's height in px (the ticks keep their distances in px), from a ResizeObserver
  private readonly height = signal(0);

  // Each moment's place, 0–1, top to bottom: by year, then spread out to the least gap, and pulled back in from the end
  // if that ran over
  protected readonly stops = computed(() => {
    const moments = this.moments(), first = moments[0].year, span = moments[moments.length - 1].year - first;
    const x = moments.map(m => (m.year - first) / span);
    for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + MIN_GAP);
    x[x.length - 1] = Math.min(x[x.length - 1], 1);
    for (let i = x.length - 2; i >= 0; i--) x[i] = Math.min(x[i], x[i + 1] - MIN_GAP);
    return moments.map((m, i) => ({ moment: m, x: x[i] }));
  });
  protected readonly activeIndex = computed(() => this.moments().findIndex(m => m.id === this.activeId()));

  // The chosen moment's own events (its arrows' first years), as ticks between it and the next moment: placed by their
  // years, the first to the last across the room between the two moments' labels, TICK_PAD clear of each, and pushed
  // apart where two would overlap. Inside that span the scale follows them (anchors, below): from one tick to the next
  // the years run evenly, so the triangle, play and a click on a tick reach each people at its own tick. `at`: the year a
  // tick stands for on the scale, kept after the last (an event that began before its moment, the Goths in 250, stands
  // at the moment's start).
  protected readonly ticks = computed(() => {
    const i = this.activeIndex(), stops = this.stops(), a = stops[i], b = stops[i + 1];
    const events = (a?.moment.arrows ?? []).filter(e => e.years);
    if (!a || !b || !events.length) return [];
    const h = this.height() || 600, below = this.open() ? LABEL_BELOW_OPEN : LABEL_BELOW_FOLDED;
    const top = a.x * h + below + TICK_PAD + TICK_HALF, bottom = Math.max(top, b.x * h - LABEL_ABOVE - TICK_PAD - TICK_HALF);
    const years = events.map(e => e.years![0]), first = years[0], span = Math.max(1, years[years.length - 1] - first);
    // Closer than TICK_GAP where the room is short (a low window), so the paddings always hold
    const gap = Math.min(TICK_GAP, (bottom - top) / Math.max(1, events.length - 1));
    const px = years.map(y => top + (bottom - top) * (y - first) / span);
    for (let k = 1; k < px.length; k++) px[k] = Math.max(px[k], px[k - 1] + gap);
    for (let k = px.length - 1; k >= 0; k--) px[k] = Math.min(px[k], k === px.length - 1 ? bottom : px[k + 1] - gap);
    let last = a.moment.year;
    return events.map((e, k) => {
      const year = years[k], at = Math.min(b.moment.year - 1, Math.max(year, last + 1));
      last = at;
      return { name: e.name, year, at, label: String(year), x: px[k] / h };
    });
  });
  // The span the small play button plays: the chosen moment to the next one (when it has ticks)
  protected readonly playSpan = computed(() => {
    const i = this.activeIndex(), stops = this.stops();
    return this.ticks().length ? { from: stops[i].x, to: stops[i + 1].x - 1e-3 } : null;
  });

  // The triangle's place, 0–1, and the moment before it
  protected readonly position = signal(0);
  private readonly leftIndex = (x: number) => this.stops().reduce((last, s, i) => s.x <= x + 1e-6 ? i : last, 0);
  // While dragging, the moment before it when it has another view than the one shown: shown on letting go
  protected readonly waiting = signal<Moment | null>(null);
  protected readonly dragging = signal(false);
  protected readonly playing = signal(false);

  constructor() {
    // A moment chosen elsewhere (the wheel, a click here): the triangle goes to it, unless it is already somewhere within it
    effect(() => {
      const i = this.activeIndex(), stop = this.stops()[i];
      untracked(() => {
        this.asked = '';
        if (!stop || this.leftIndex(this.position()) === i || this.dragging() || this.waiting()) return;
        this.stopPlaying();
        this.position.set(stop.x);
        this.scrubbed.emit(null);
      });
    });
    const observer = new ResizeObserver(([entry]) => this.height.set(entry.contentRect.height));
    afterNextRender(() => observer.observe(this.track().nativeElement));
    inject(DestroyRef).onDestroy(() => { this.stopPlaying(); observer.disconnect(); });
  }

  // The year at a place on the scale: between two moments, in proportion. The scale from one moment to the next, as
  // points (year, place) to run evenly between: the two moments, and, for the chosen moment, its ticks
  private anchors(i: number) {
    const stops = this.stops(), a = stops[i], b = stops[i + 1];
    if (!b) return [{ year: a.moment.year, x: a.x }];
    const ticks = i === this.activeIndex() ? this.ticks().map(t => ({ year: t.at, x: t.x })) : [];
    return [{ year: a.moment.year, x: a.x }, ...ticks, { year: b.moment.year, x: b.x }];
  }
  private yearAt(x: number) {
    const p = this.anchors(this.leftIndex(x)), k = lastIndex(p, q => q.x <= x), a = p[k], b = p[k + 1];
    return b ? a.year + (b.year - a.year) * (x - a.x) / (b.x - a.x) : a.year;
  }
  // The triangle to a place: the year goes out; the moment before it is shown, or, while dragging over one that
  // zooms, marked to show on letting go
  private moveTo(x: number, wait: boolean) {
    this.position.set(x);
    const moment = this.stops()[this.leftIndex(x)].moment, shown = this.moments()[this.activeIndex()];
    const view = (m?: Moment) => JSON.stringify(m?.view ?? null);
    if (wait && view(moment) !== view(shown)) this.waiting.set(moment);
    else { this.waiting.set(null); this.pick(moment); }
    this.scrubbed.emit(this.yearAt(x));
  }

  protected down(event: PointerEvent) {
    this.stopPlaying();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging.set(true);
    this.moveTo(this.at(event), true);
  }
  protected move(event: PointerEvent) { if (this.dragging()) this.moveTo(this.at(event), true); }
  protected up() {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const waiting = this.waiting();
    this.waiting.set(null);
    if (waiting) this.pick(waiting);
  }

  // A tick: the triangle to its year
  protected clickTick(x: number) {
    this.stopPlaying();
    this.moveTo(x, false);
  }

  // The small play: the triangle through the chosen moment's span by itself, from where it is in it (from the start, if
  // it is at the end or outside it), stopping before the next moment
  private frame = 0;
  protected togglePlay() {
    const span = this.playSpan();
    if (this.playing() || !span) return this.stopPlaying();
    if (this.position() < span.from || this.position() >= span.to) this.moveTo(span.from, false);
    this.playing.set(true);
    let last = performance.now();
    const step = (now: number) => {
      const x = Math.min(span.to, this.position() + PLAY_SPEED * (now - last) / 1000);
      last = now;
      this.moveTo(x, false);
      if (x < span.to) this.frame = requestAnimationFrame(step);
      else this.playing.set(false);
    };
    this.frame = requestAnimationFrame(step);
  }
  private stopPlaying() {
    cancelAnimationFrame(this.frame);
    this.playing.set(false);
  }

  // A moment's own button (the keyboard too)
  // Each moment asked for once: the map may take a moment to show it (a zoom out waits for its data), and a drag would
  // otherwise ask again on every move meanwhile
  private asked = '';
  protected pick(moment: Moment) {
    if (moment.id === this.activeId() || moment.id === this.asked) return;
    this.asked = moment.id;
    this.picked.emit(moment);
  }
  protected clickStop(moment: Moment) {
    this.stopPlaying();
    const stop = this.stops().find(s => s.moment === moment)!;
    this.position.set(stop.x);
    this.scrubbed.emit(null);
    this.pick(moment);
  }

  // The arrow keys on the triangle: the moment before or after (down is later), Home and End the first and last
  protected key(event: KeyboardEvent) {
    const last = this.moments().length - 1, i = this.leftIndex(this.position());
    const to = { ArrowUp: i - 1, ArrowLeft: i - 1, ArrowDown: i + 1, ArrowRight: i + 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    this.clickStop(this.moments()[Math.max(0, Math.min(last, to))]);
  }

  // The place along the scale under the pointer, 0–1
  private at(event: PointerEvent) {
    const box = this.track().nativeElement.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
  }
}

// The last index whose item passes, or 0
function lastIndex<T>(items: T[], test: (item: T) => boolean) {
  return items.reduce((last, item, i) => test(item) ? i : last, 0);
}
