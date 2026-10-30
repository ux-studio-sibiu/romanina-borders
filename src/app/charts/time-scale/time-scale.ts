import { Component, computed, effect, ElementRef, input, output, signal, untracked, viewChild } from '@angular/core';
import type { Moment } from '../../data/moments';

// How close two moments may sit on the scale, as a share of its length (room for each one's years and title)
const MIN_GAP = 0.055;

// The moments down a time scale, each where its year falls, roughly: a straight scale would crowd the last two
// centuries' seven moments into a tenth of its length, so the moments are pushed apart to at least MIN_GAP. Each
// moment's dot sits on the line (the panel's left edge), its years level with it and its title under them. It folds to
// the years only (open), with the ear on the line's left.
//
// The triangle, outside the line, points at the moment shown. Drag it (only it drags: a click on a dot is just that
// moment): the moment before it is shown as it passes, and it settles on that moment when let go. Dragging over a
// moment with another view (one that zooms) only marks it, and shows it on letting go: one zoom, not one for every
// moment passed. Clicking a moment, or the arrow keys, put the triangle on the moment itself.
@Component({
  selector: 'app-time-scale',
  templateUrl: './time-scale.html',
  styleUrl: './time-scale.scss'
})
export class TimeScale {
  readonly moments = input.required<Moment[]>();
  readonly activeId = input.required<string>();
  readonly picked = output<Moment>();
  readonly open = input(true);
  readonly openChange = output<boolean>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

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

  // The triangle's place, 0–1, and the moment before it
  protected readonly position = signal(0);
  private readonly leftIndex = (x: number) => this.stops().reduce((last, s, i) => s.x <= x + 1e-6 ? i : last, 0);
  // While dragging, the moment before it when it has another view than the one shown: shown on letting go
  protected readonly waiting = signal<Moment | null>(null);
  protected readonly dragging = signal(false);

  constructor() {
    // The moment shown, chosen here or elsewhere (the wheel, the scrollbar): the triangle goes to it, unless it is being dragged
    effect(() => {
      const stop = this.stops()[this.activeIndex()];
      untracked(() => {
        this.asked = '';
        if (stop && !this.dragging() && !this.waiting()) this.position.set(stop.x);
      });
    });
  }

  // The triangle to a place: the moment before it is shown, or, while dragging over one that zooms, marked to show on
  // letting go
  private moveTo(x: number) {
    this.position.set(x);
    const moment = this.stops()[this.leftIndex(x)].moment, shown = this.moments()[this.activeIndex()];
    const view = (m?: Moment) => JSON.stringify(m?.view ?? null);
    if (view(moment) !== view(shown)) this.waiting.set(moment);
    else { this.waiting.set(null); this.pick(moment); }
  }

  protected down(event: PointerEvent) {
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* not a live pointer: fine */ }
    this.dragging.set(true);
    this.moveTo(this.at(event));
  }
  protected move(event: PointerEvent) { if (this.dragging()) this.moveTo(this.at(event)); }
  protected up() {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const waiting = this.waiting();
    this.waiting.set(null);
    if (waiting) this.pick(waiting);
    // Settles on the moment it let go over
    this.position.set(this.stops()[this.leftIndex(this.position())].x);
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
    this.position.set(this.stops().find(s => s.moment === moment)!.x);
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
