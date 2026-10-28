import { Component, computed, ElementRef, inject, input, linkedSignal } from '@angular/core';
import type { Spot } from '../../data/spots';

// The card's least distance from the window's edges, its widest, and the least width for its pictures and words side by
// side (px). Its padding, the gap between the picture and the words, and the room the thumbnails and the credit take (in
// the words' column; under the picture only on a narrow card), as in map-spots.scss (px). The picture's share of a wide
// card, and the picture box's shape (height / width): landscape, or upright for a spot whose pictures are (`tall`)
const EDGE = 16, CARD_WIDTH = 920, SIDE_BY_SIDE = 600;
const PAD = 18, GAP = 22, THUMBS = 60, CREDIT = 20, BORDER = 2;
const PICTURES_SHARE = 0.64, SHAPE = 3 / 4, TALL_SHARE = 0.42, TALL_SHAPE = 4 / 3;

// A spot where it falls in the window (region-map projects it)
export type PlacedSpot = Spot & { x: number; y: number };

// Lesson 08: the spots over the map: each a round marker with a little picture of what it is and a soft pulse round it,
// inviting a click (no name on the map: it is on the card). A click opens its card, large, in the middle of the map: a
// big picture, a sentence or two beside it, and small ones to switch under them. One card at a time; a click on the marker again, the
// close button, Escape or a click anywhere else closes it, and so does the next moment. Plain HTML over the map (buttons,
// so they work from the keyboard), laid over the window: region-map hides it during a zoom.
@Component({
  selector: 'app-map-spots',
  templateUrl: './map-spots.html',
  styleUrl: './map-spots.scss',
  host: { '(document:keydown.escape)': 'open.set(null)', '(document:click)': 'clickAway($event)' }
})
export class MapSpots {
  readonly spots = input<PlacedSpot[]>([]);
  readonly width = input(0);
  readonly height = input(0);
  readonly coveredRight = input(0); // px along the window's right edge under something else (the time scale): no card there

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;

  // The open card's spot: none again whenever the spots change (another moment)
  private readonly ids = computed(() => this.spots().map(s => s.id).join());
  protected readonly open = linkedSignal<string, string | null>({ source: this.ids, computation: () => null });
  // The open card's picture shown, by index: the first again for every card
  protected readonly shown = linkedSignal({ source: this.open, computation: () => 0 });

  // The card: centred in the map's free width (clear of the time scale), as wide as it fits. Its picture box has one
  // size whatever picture it shows (each whole in its top left corner), so switching pictures moves nothing: as wide as
  // the picture's column, SHAPE high (TALL_SHAPE, in a narrower column, for a tall spot), or less where the window is
  // short. Wide: the picture and the words side by side; on a narrow window, one over the other (the box then takes
  // under half the height, and the card scrolls if it must).
  protected readonly card = computed(() => {
    const spot = this.spots().find(s => s.id === this.open());
    if (!spot) return null;
    const w = this.width() - this.coveredRight(), h = this.height(), width = Math.min(CARD_WIDTH, w - 2 * EDGE), wide = width >= SIDE_BY_SIDE;
    const share = spot.tall ? TALL_SHARE : PICTURES_SHARE, shape = spot.tall ? TALL_SHAPE : SHAPE;
    const inner = width - 2 * PAD - 2 * BORDER, pictures = wide ? (inner - GAP) * share : inner;
    const credits = !!spot.pictures?.some(p => p.credit);
    const count = spot.pictures?.length ?? 0, thumbs = count !== 1; // none yet: empty thumbnails stand in
    const room = h - 2 * EDGE - 2 * PAD - 2 * BORDER - (wide ? 0 : (thumbs ? THUMBS : 0) + (credits ? CREDIT : 0));
    return {
      spot, width, wide, credits, left: (w - width) / 2, maxHeight: h - 2 * EDGE - 2 * BORDER, pictures,
      frameHeight: Math.max(120, Math.min(pictures * shape, wide ? room : room * 0.45))
    };
  });

  protected toggle(id: string) { this.open.update(open => open === id ? null : id); }

  protected clickAway(event: MouseEvent) {
    const target = event.target as Element | null;
    if (this.open() && !target?.closest('.spot, .spot-card')?.closest('app-map-spots')?.isSameNode(this.host)) this.open.set(null);
  }
}
