import { Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import type { Moment } from '../../data/moments';

// Lesson 07: how close two moments may sit on the scale, as a share of its width; how fast play moves the triangle, in
// widths a second (the whole scale in about 40 s: 271–1000, the peoples passing through, takes about 14)
const MIN_GAP = 0.04;
const PLAY_SPEED = 0.025;

// Lesson 07: the moments on a time scale, each where its year falls, roughly: a straight scale would crowd the last two
// centuries' seven moments into a tenth of the width, so the moments are pushed apart to at least MIN_GAP. The years in
// between are spread evenly from one moment to the next.
//
// The triangle over the line is where in time the map is: it can rest anywhere, and the map shows the moment on its
// left. Drag it (only it drags: a click on a dot is just that moment), or press play and it moves along by itself; either way the year under it
// goes out too (scrubbed), so a moment can show what happens within it (the peoples passing through, one after another).
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

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  // Each moment's place, 0–1: by year, then spread left to right to the least gap, and pulled back in from the right
  // end if that ran over
  protected readonly stops = computed(() => {
    const moments = this.moments(), first = moments[0].year, span = moments[moments.length - 1].year - first;
    const x = moments.map(m => (m.year - first) / span);
    for (let i = 1; i < x.length; i++) x[i] = Math.max(x[i], x[i - 1] + MIN_GAP);
    x[x.length - 1] = Math.min(x[x.length - 1], 1);
    for (let i = x.length - 2; i >= 0; i--) x[i] = Math.min(x[i], x[i + 1] - MIN_GAP);
    return moments.map((m, i) => ({ moment: m, x: x[i], below: i % 2 === 1 }));
  });
  protected readonly activeIndex = computed(() => this.moments().findIndex(m => m.id === this.activeId()));

  // The triangle's place, 0–1, and the moment on its left
  protected readonly position = signal(0);
  private readonly leftIndex = (x: number) => this.stops().reduce((last, s, i) => s.x <= x + 1e-6 ? i : last, 0);
  // While dragging, the moment on the left when it has another view than the one shown: shown on letting go
  protected readonly waiting = signal<Moment | null>(null);
  protected readonly dragging = signal(false);
  protected readonly playing = signal(false);

  constructor() {
    // A moment chosen elsewhere (the buttons, the wheel, a click here): the triangle goes to it, unless it is already
    // somewhere within it
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
    inject(DestroyRef).onDestroy(() => this.stopPlaying());
  }

  // The year at a place on the scale: between two moments, in proportion
  private yearAt(x: number) {
    const stops = this.stops(), i = this.leftIndex(x), a = stops[i], b = stops[i + 1];
    return b ? a.moment.year + (b.moment.year - a.moment.year) * (x - a.x) / (b.x - a.x) : a.moment.year;
  }

  // The triangle to a place: the year goes out; the moment on its left is shown, or, while dragging over one that
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
    this.moveTo(this.xAt(event.clientX), true);
  }
  protected move(event: PointerEvent) { if (this.dragging()) this.moveTo(this.xAt(event.clientX), true); }
  protected up() {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const waiting = this.waiting();
    this.waiting.set(null);
    if (waiting) this.pick(waiting);
  }

  // Play: the triangle moves along by itself, from where it is (from the start, if it is at the end), until the end
  private frame = 0;
  protected togglePlay() {
    if (this.playing()) return this.stopPlaying();
    if (this.position() >= 1) this.moveTo(0, false);
    this.playing.set(true);
    let last = performance.now();
    const step = (now: number) => {
      const x = Math.min(1, this.position() + PLAY_SPEED * (now - last) / 1000);
      last = now;
      this.moveTo(x, false);
      if (x < 1) this.frame = requestAnimationFrame(step);
      else this.playing.set(false);
    };
    this.frame = requestAnimationFrame(step);
  }
  private stopPlaying() {
    cancelAnimationFrame(this.frame);
    this.playing.set(false);
  }

  // A moment's own button (the keyboard too)
  // Each moment asked for once: the map may take a moment to show it (a zoom out waits for its data), and play or a drag
  // would otherwise ask again on every frame meanwhile
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

  // The arrow keys on the triangle: the moment before or after, Home and End the first and last
  protected key(event: KeyboardEvent) {
    const last = this.moments().length - 1, i = this.leftIndex(this.position());
    const to = { ArrowLeft: i - 1, ArrowDown: i - 1, ArrowRight: i + 1, ArrowUp: i + 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    this.clickStop(this.moments()[Math.max(0, Math.min(last, to))]);
  }

  private xAt(clientX: number) {
    const box = this.track().nativeElement.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - box.left) / box.width));
  }
}
