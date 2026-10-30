import { NgTemplateOutlet } from '@angular/common';
import { type AnimationCallbackEvent, Component, contentChild, input, TemplateRef } from '@angular/core';

// How long a push takes (ms), and the gap kept between the two slides while they move (px)
const PUSH_TIME = 560, GAP = 16;

// Swaps one item's view for the next by pushing: when `item` changes, the new view comes in from off the screen behind
// the old one and pushes it out, never overlapping, the old one flying on off the screen. `direction` 1
// (forward): the new one comes up from below, the old one goes up; -1: the other way. The view is the <ng-template>
// given as content, its item as `let-x`: each slide keeps its own item, so the one leaving still shows what it showed.
// Both sit in one grid cell, bottom-aligned, so nothing around them moves.
//
//   <app-slide-swap [item]="moment()" [direction]="direction()">
//     <ng-template let-m><app-moment-caption [moment]="m" /></ng-template>
//   </app-slide-swap>
@Component({
  selector: 'app-slide-swap',
  imports: [NgTemplateOutlet],
  templateUrl: './slide-swap.html',
  styleUrl: './slide-swap.scss'
})
export class SlideSwap<T> {
  readonly item = input.required<T>();
  readonly direction = input<1 | -1>(1);
  protected readonly template = contentChild.required<TemplateRef<{ $implicit: T }>>(TemplateRef);

  // Angular tells of the slide coming in and the one going out separately, in the same render: both are kept, and the
  // push runs once both are known
  private entering: AnimationCallbackEvent | null = null;
  private leaving: AnimationCallbackEvent | null = null;
  private scheduled = false;

  protected enter(event: AnimationCallbackEvent) { this.entering = event; this.schedule(); }
  protected leave(event: AnimationCallbackEvent) { this.leaving = event; this.schedule(); }

  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => { this.scheduled = false; this.push(); });
  }

  private push() {
    const enter = this.entering, leave = this.leaving;
    this.entering = this.leaving = null;
    // The first slide, or a visitor who asked for less motion: no push, the swap at once
    if (!enter || !leave || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      enter?.animationComplete();
      leave?.animationComplete();
      return;
    }
    const inEl = enter.target as HTMLElement, outEl = leave.target as HTMLElement;
    // A slide still on its way in when the next one comes goes out from where it has got to
    const from = currentY(outEl);
    outEl.getAnimations().forEach(a => a.cancel());
    outEl.style.pointerEvents = 'none';
    // Forward, the new one starts at least just below the old (both bottom-aligned, so by its own height), and off the
    // screen's bottom, and comes up; backward, at least just above the old one, and off the screen's top, and comes
    // down. The old one goes the same way, at least as far, and on until it is off the screen. Both on the same easing,
    // apart at the start and at the end, so they never meet in between.
    const forward = this.direction() > 0, push = (forward ? inEl.offsetHeight : outEl.offsetHeight) + GAP, way = forward ? -1 : 1;
    const inBox = inEl.getBoundingClientRect(), outBox = outEl.getBoundingClientRect();
    const comeFrom = Math.max(push, forward ? innerHeight - inBox.top + GAP : inBox.bottom + GAP);
    const goTo = Math.max(push, forward ? outBox.bottom + GAP : innerHeight - outBox.top + GAP);
    const timing: KeyframeAnimationOptions = { duration: PUSH_TIME, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' };
    const coming = inEl.animate([{ transform: `translateY(${-way * comeFrom}px)` }, { transform: 'translateY(0)' }], timing);
    const going = outEl.animate([
      { transform: `translateY(${from}px)` },
      { transform: `translateY(${from + way * goTo}px)` }
    ], { ...timing, fill: 'forwards' });
    coming.finished.then(() => enter.animationComplete(), () => enter.animationComplete());
    going.finished.then(() => leave.animationComplete(), () => leave.animationComplete());
  }
}

// An element's vertical offset from its running animations, px (0 when still)
function currentY(el: HTMLElement) {
  const t = getComputedStyle(el).transform;
  return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
}
