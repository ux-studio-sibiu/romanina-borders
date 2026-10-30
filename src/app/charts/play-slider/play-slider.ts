import { Component, computed, DestroyRef, effect, inject, input, model, output, untracked } from '@angular/core';

// The range input's steps along the track: fine enough that a step is under a pixel
const STEPS = 1000;

// A slider over a span of values (years, say) with a play button: play moves it from where it is to the end by itself,
// over `duration` seconds for the whole span (from `min` again if it is before it or at the end); dragging it, or the
// keyboard, pauses it. `start` (below `min`) adds a stretch at the track's left before the span begins: a place to rest
// outside it (an overview, say), where the parent reads a value under `min`. Marks along the track show where things
// happen, a click on one setting the value to it. What goes above the track (a title for the value) is given as
// content. The value and playing are both two-way (`model`): the parent can set where it is, or start it, too.
//
// `spread` evens the marks out: 0 places them in proportion to their values, 1 at equal distances, between the two a
// blend (some sense of how far apart they are, without the close ones crowding). The track is stretched to match,
// piecewise between the marks, so the thumb is on a mark exactly at its value; play keeps an even pace along the track.
//
//   <app-play-slider [start]="130" [min]="250" [max]="980" [spread]="0.6" [(value)]="year" [(playing)]="playing" [marks]="marks">
//     <p>{{ title() }}</p>
//   </app-play-slider>
@Component({
  selector: 'app-play-slider',
  templateUrl: './play-slider.html',
  styleUrl: './play-slider.scss'
})
export class PlaySlider {
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly start = input<number>(); // where the track begins, at or below min; min when not given
  readonly value = model.required<number>();
  readonly playing = model(false);
  readonly duration = input(16); // seconds, min to max
  readonly marks = input<{ at: number; name: string }[]>([]); // name: read out, and shown on hover
  readonly activeMark = input<number | null>(null); // a mark drawn larger (the one picked)
  readonly markPicked = output<number>(); // a mark clicked, by index: the value is set to it first
  readonly spread = input(0); // 0: marks in proportion, 1: evenly spaced
  readonly label = input('Time');

  protected readonly steps = STEPS;
  protected readonly from = computed(() => Math.min(this.start() ?? this.min(), this.min()));

  // The track's anchors, value to place (0–1), in order: its start, min (the stretch before it kept as it is), each mark
  // where `spread` puts it, and max; between two anchors, values run evenly
  private readonly anchors = computed(() => {
    const from = this.from(), min = this.min(), max = this.max(), span = Math.max(1, max - from), at = (v: number) => (v - from) / span;
    const ats = [...new Set(this.marks().map(m => m.at))].filter(v => v > min && v < max).sort((a, b) => a - b);
    const p0 = at(min), n = ats.length, k = Math.min(1, Math.max(0, this.spread()));
    return [
      { v: from, p: 0 }, { v: min, p: p0 },
      ...ats.map((v, i) => ({ v, p: (1 - k) * at(v) + k * (p0 + (1 - p0) * (i + 1) / (n + 1)) })),
      { v: max, p: 1 }
    ].filter((a, i, all) => i === 0 || a.v > all[i - 1].v);
  });
  // Where a value sits along the track (0–1), and the value at a place
  protected place(v: number) { return interpolate(this.anchors(), v, 'v', 'p'); }
  private valueAt(p: number) { return interpolate(this.anchors(), p, 'p', 'v'); }

  private frame = 0;

  constructor() {
    // Playing, however it was started: the thumb moves on along the track every frame until the end, or until paused,
    // at an even pace (min to max in `duration`)
    effect(() => {
      cancelAnimationFrame(this.frame);
      if (!this.playing()) return;
      let last = performance.now();
      const step = (now: number) => {
        const pace = (1 - this.place(this.min())) / this.duration();
        const p = Math.min(1, this.place(this.value()) + pace * (now - last) / 1000);
        last = now;
        this.value.set(p >= 1 ? this.max() : this.valueAt(p));
        if (p < 1) this.frame = requestAnimationFrame(step);
        else this.playing.set(false);
      };
      untracked(() => { if (this.value() < this.min() || this.value() >= this.max()) this.value.set(this.min()); });
      this.frame = requestAnimationFrame(step);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  protected toggle() { this.playing.set(!this.playing()); }

  // A mark: paused, the value at it, then the mark told
  protected pickMark(i: number) {
    this.playing.set(false);
    this.value.set(this.marks()[i].at);
    this.markPicked.emit(i);
  }

  protected slide(event: Event) {
    this.playing.set(false);
    this.value.set(this.valueAt(Number((event.target as HTMLInputElement).value) / STEPS));
  }
}

// Piecewise linear: x on the anchors' `from` scale to their `to` scale, held at the ends
function interpolate<K extends string>(anchors: Record<K, number>[], x: number, from: K, to: K) {
  if (x <= anchors[0][from]) return anchors[0][to];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1], b = anchors[i];
    if (x <= b[from]) return a[to] + (b[to] - a[to]) * (x - a[from]) / (b[from] - a[from]);
  }
  return anchors[anchors.length - 1][to];
}
