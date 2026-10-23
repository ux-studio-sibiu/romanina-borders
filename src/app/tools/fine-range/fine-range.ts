import { Component, DestroyRef, inject, input, model } from '@angular/core';

// A slider with fine control, for lining a reference map up by the pixel: the slider for the rough move, then a number
// field to type into, and − / + buttons that nudge by `fine` (hold to repeat). Arrow keys and the wheel on the field
// nudge too. Shift nudges ten times as far, Alt a tenth as far. Typed values may go past the slider's ends.
@Component({
  selector: 'app-fine-range',
  templateUrl: './fine-range.html',
  styleUrl: './fine-range.scss'
})
export class FineRange {
  readonly value = model.required<number>();
  readonly min = input(0);
  readonly max = input(1);
  readonly step = input(0.01);   // the slider's
  readonly fine = input(0.001);  // a nudge's
  readonly digits = input(3);
  readonly label = input('');    // for screen readers: the row's visible label isn't tied to these controls

  private repeat?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => this.stop()); }

  protected set(raw: string) {
    const v = Number(raw);
    if (Number.isFinite(v)) this.value.set(v);
  }

  protected nudge(direction: number, event: { shiftKey: boolean; altKey: boolean }) {
    const amount = this.fine() * (event.shiftKey ? 10 : event.altKey ? 0.1 : 1);
    this.value.set(+(this.value() + direction * amount).toFixed(this.digits() + 1));
  }

  // Press and hold: one nudge, then after a pause a nudge every 50 ms until released
  protected start(direction: number, event: PointerEvent) {
    event.preventDefault();
    this.nudge(direction, event);
    const again = (delay: number) => { this.repeat = setTimeout(() => { this.nudge(direction, event); again(50); }, delay); };
    again(400);
  }
  protected stop() { clearTimeout(this.repeat); }

  protected onKey(event: KeyboardEvent) {
    const direction = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    this.nudge(direction, event);
  }

  protected onWheel(event: WheelEvent) {
    event.preventDefault();
    this.nudge(event.deltaY < 0 ? 1 : -1, event);
  }
}
