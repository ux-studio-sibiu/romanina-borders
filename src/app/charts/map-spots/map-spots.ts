import { Component, computed, effect, ElementRef, inject, input, linkedSignal, signal } from '@angular/core';
import type { Spot } from '../../data/spots';

// The card's least distance from the window's edges, and the least width for its pictures and words side by side (px).
// Its padding, the gap between the picture and the words, and the room the thumbnails and the credit take (in the
// words' column; under the picture only on a narrow card), as in map-spots.scss (px).
const EDGE = 16, SIDE_BY_SIDE = 600;
const PAD = 18, GAP = 22, THUMBS = 60, CREDIT = 20, BORDER = 2;
// The picture box's tallest (px), and how far a small picture may be enlarged past its own size (more would blur it).
// Until a picture has loaded, its shape (height / width) is guessed: landscape, or upright for a spot whose pictures are
// (`tall`), and it is taken to be large
const PICTURE_HEIGHT = 520, UPSCALE = 1.5, SHAPE = 3 / 4, TALL_SHAPE = 4 / 3, GUESS_WIDTH = 1200;
// The words' column, as wide as its text needs to read well: WORDS_MIN for a sentence, growing by WORDS_PER_LETTER for
// each letter, up to WORDS_MAX (px)
const WORDS_MIN = 260, WORDS_MAX = 380, WORDS_BASE = 180, WORDS_PER_LETTER = 0.8;

// A spot where it falls in the window (region-map projects it)
export type PlacedSpot = Spot & { x: number; y: number };

type Size = { w: number; h: number };
// Each picture scaled to fit within width × height, whole, enlarged by UPSCALE at most (px, rounded)
const fit = (sizes: Size[], width: number, height: number) => sizes.map(s => {
  const k = Math.min(UPSCALE, width / s.w, height / s.h);
  return { w: Math.round(s.w * k), h: Math.round(s.h * k) };
});
const tallest = (sizes: Size[]) => Math.max(...sizes.map(s => s.h));

// The spots over the map: each a round marker with a little picture of what it is and a soft pulse round it,
// inviting a click (no name on the map: it is on the card). A click opens its card, large, in the middle of the map: a
// big picture, a sentence or two beside it, and small ones to switch under them. One card at a time; a click on the
// marker again, the close button, Escape or a click anywhere else closes it, and so does the next moment. Plain HTML
// over the map (buttons, so they work from the keyboard), laid over the window: region-map hides it during a zoom.
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

  // Each picture's own size (px), by address, once it has loaded: the card is sized from them
  private readonly sizes = signal<Record<string, Size>>({});

  constructor() {
    // A card opened: its pictures' sizes read (the browser loads them anyway, to show them)
    effect(() => {
      const spot = this.spots().find(s => s.id === this.open());
      for (const p of spot?.pictures ?? []) {
        if (this.sizes()[p.src]) continue;
        const image = new Image();
        image.onload = () => this.sizes.update(all => ({ ...all, [p.src]: { w: image.naturalWidth, h: image.naturalHeight } }));
        image.src = p.src;
      }
    });
  }

  // The card, sized from what it holds and centred in the map's free width (clear of the time scale).
  // Each picture is scaled to fit the room the window leaves it, whole and in its own shape, but enlarged by UPSCALE at
  // most; the picture box is as wide as the widest of them and as tall as the tallest, so a card of small pictures is
  // small, and switching pictures moves nothing (each sits in the box's top left corner, the size worked out here).
  // Wide: the picture and the words side by side, the words' column as wide as its text needs, the pictures as tall as
  // PICTURE_HEIGHT and the window let them. Narrow: one over the other, the pictures as wide as the card and under half its
  // height (the card scrolls if it must).
  protected readonly card = computed(() => {
    const spot = this.spots().find(s => s.id === this.open());
    if (!spot) return null;
    const free = this.width() - this.coveredRight(), h = this.height(), most = free - 2 * EDGE, wide = most >= SIDE_BY_SIDE;
    const credits = !!spot.pictures?.some(p => p.credit);
    const count = spot.pictures?.length ?? 0, thumbs = count !== 1; // none yet: empty thumbnails stand in
    // The pictures' own sizes: as loaded, or the spot's guess until then (one box for none yet)
    const guess = { w: GUESS_WIDTH, h: GUESS_WIDTH * (spot.tall ? TALL_SHAPE : SHAPE) }, all = this.sizes();
    const own = count ? spot.pictures!.map(p => all[p.src] ?? guess) : [guess];
    const room = h - 2 * EDGE - 2 * PAD - 2 * BORDER - (wide ? 0 : (thumbs ? THUMBS : 0) + (credits ? CREDIT : 0));
    const maxHeight = h - 2 * EDGE - 2 * BORDER;

    if (!wide) {
      const width = most, box = width - 2 * PAD - 2 * BORDER;
      const fitted = fit(own, box, Math.max(120, room * 0.45));
      return { spot, wide, credits, width, left: (free - width) / 2, maxHeight, pictures: box, words: 0, frameHeight: tallest(fitted), fitted };
    }

    const words = Math.round(Math.min(WORDS_MAX, Math.max(WORDS_MIN, WORDS_BASE + spot.text.length * WORDS_PER_LETTER)));
    const chrome = 2 * PAD + 2 * BORDER + GAP;
    const fitted = fit(own, most - chrome - words, Math.max(120, Math.min(room, PICTURE_HEIGHT)));
    const pictures = Math.max(...fitted.map(f => f.w)), width = chrome + pictures + words;
    return { spot, wide, credits, width, left: (free - width) / 2, maxHeight, pictures, words, frameHeight: tallest(fitted), fitted };
  });

  protected toggle(id: string) { this.open.update(open => open === id ? null : id); }

  // A click anywhere else closes the card, except in the moment's details panel (its fold and people toggle leave it open)
  protected clickAway(event: MouseEvent) {
    const target = event.target as Element | null;
    if (!this.open() || target?.closest('app-moment-caption')) return;
    if (!target?.closest('.spot, .spot-card')?.closest('app-map-spots')?.isSameNode(this.host)) this.open.set(null);
  }
}
