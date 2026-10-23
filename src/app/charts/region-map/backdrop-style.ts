import { computed, effect, Injectable, signal } from '@angular/core';

// The look of the satellite backdrop and the lines over it, as numbers: what the backdrop tuner (Shift+T) edits and the
// region map reads. Kept in localStorage, so a look survives a reload; the defaults are lesson 02's styles.
export interface BackdropStyle {
  // The picture, as CSS filters
  brightness: number;  // 1 = as NASA's picture
  contrast: number;
  saturation: number;  // 0 = grey, 2 = twice as vivid
  hue: number;         // degrees round the colour wheel
  sepia: number;       // 0–1: an old-paper wash, for the early moments
  blur: number;        // px: softens the detail under the history colours
  opacity: number;     // the picture over the paper
  // The layers over it
  veil: number;        // the white veil on the land
  counties: number;    // the white county hairlines
  halo: number;        // the pale halo under each river
  coast: number;       // the white coastline
}

export const BACKDROP_DEFAULTS: BackdropStyle = {
  brightness: 1, contrast: 1, saturation: 1, hue: 0, sepia: 0, blur: 0, opacity: 0.95,
  veil: 0.12, counties: 0.45, halo: 0.75, coast: 0.7
};

const KEY = 'romanianBorders.backdropStyle';

@Injectable({ providedIn: 'root' })
export class Backdrop {
  readonly style = signal<BackdropStyle>({ ...BACKDROP_DEFAULTS, ...read() });

  // The picture's CSS filter, in one string
  readonly filter = computed(() => {
    const s = this.style();
    return `brightness(${s.brightness}) contrast(${s.contrast}) saturate(${s.saturation}) hue-rotate(${s.hue}deg) sepia(${s.sepia}) blur(${s.blur}px)`;
  });

  constructor() {
    effect(() => { try { localStorage.setItem(KEY, JSON.stringify(this.style())); } catch { /* private window: the look just isn't kept */ } });
  }

  set<K extends keyof BackdropStyle>(key: K, value: BackdropStyle[K]) { this.style.update(s => ({ ...s, [key]: value })); }
  reset() { this.style.set({ ...BACKDROP_DEFAULTS }); }
}

function read(): Partial<BackdropStyle> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
