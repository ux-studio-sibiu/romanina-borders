import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

// A scrollbar over a row of steps (the moments, or anything counted): a thumb one step tall that shows which step is
// current and can be dragged, the track clicked, or the keyboard used, to pick another. While dragged the thumb follows
// the pointer and a step is picked each time it passes one; let go, it settles on the step. Fills its host's height.
@Component({
  selector: 'app-step-scrollbar',
  templateUrl: './step-scrollbar.html',
  styleUrl: './step-scrollbar.scss'
})
export class StepScrollbar {
  readonly count = input.required<number>();
  readonly index = input.required<number>();
  readonly labels = input<string[]>([]); // each step's name, read out by screen readers
  readonly label = input('Steps');
  readonly indexChange = output<number>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  // The thumb's place while dragged, 0–1 down the track's free length; null when it rests on its step
  protected readonly dragAt = signal<number | null>(null);
  protected readonly size = computed(() => 1 / Math.max(1, this.count()));
  protected readonly at = computed(() => this.dragAt() ?? (this.count() > 1 ? this.index() / (this.count() - 1) : 0));

  private held = false; // the pointer is down on the track
  private grab = 0; // where on the thumb it was taken, in px from its top
  private picked = -1;

  protected press(event: PointerEvent) {
    if (event.button !== 0) return;
    const { top, height } = this.track().nativeElement.getBoundingClientRect(), thumb = height * this.size();
    const thumbTop = this.at() * (height - thumb);
    const onThumb = event.clientY - top >= thumbTop && event.clientY - top <= thumbTop + thumb;
    // On the thumb: held where it was taken. On the track: the thumb jumps there, centred, and can be dragged on.
    this.grab = onThumb ? event.clientY - top - thumbTop : thumb / 2;
    this.picked = this.index();
    this.held = true;
    // Moves and the release keep coming here even off the track
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* not a live pointer: fine */ }
    event.preventDefault();
    this.move(event);
  }

  protected move(event: PointerEvent) {
    if (!this.held) return;
    const { top, height } = this.track().nativeElement.getBoundingClientRect(), free = height * (1 - this.size());
    const at = free > 0 ? Math.min(1, Math.max(0, (event.clientY - top - this.grab) / free)) : 0;
    this.dragAt.set(at);
    this.pick(Math.round(at * (this.count() - 1)));
  }

  protected release() { this.held = false; this.dragAt.set(null); }

  protected key(event: KeyboardEvent) {
    const last = this.count() - 1, i = this.index();
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, PageDown: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, PageUp: i - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    this.picked = i;
    this.pick(Math.min(last, Math.max(0, to)));
  }

  private pick(i: number) {
    if (i === this.picked) return;
    this.picked = i;
    this.indexChange.emit(i);
  }
}
