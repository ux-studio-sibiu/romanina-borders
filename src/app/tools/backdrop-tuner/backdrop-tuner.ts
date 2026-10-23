import { Component, inject, signal } from '@angular/core';
import { Backdrop, BACKDROP_DEFAULTS, type BackdropStyle } from '../../charts/region-map/backdrop-style';

const OPEN_KEY = 'romanianBorders.backdropTunerOpen';

// A dev tool in the randomize-studio kits' style: a floating panel of sliders for the satellite backdrop's look.
// Shift+T opens and closes it; double-click a label to put that one value back. The numbers live in Backdrop (and
// localStorage); Copy puts them on the clipboard, to bake into BACKDROP_DEFAULTS once a look is settled.
@Component({
  selector: 'app-backdrop-tuner',
  templateUrl: './backdrop-tuner.html',
  styleUrl: './backdrop-tuner.scss',
  host: { '(window:keydown)': 'onKey($event)' }
})
export class BackdropTuner {
  protected readonly backdrop = inject(Backdrop);
  protected readonly isOpen = signal(readOpen());
  protected readonly copied = signal(false);

  protected set(key: keyof BackdropStyle, event: Event) { this.backdrop.set(key, Number((event.target as HTMLInputElement).value)); }
  protected resetOne(key: keyof BackdropStyle) { this.backdrop.set(key, BACKDROP_DEFAULTS[key]); }

  protected toggle(open = !this.isOpen()) {
    this.isOpen.set(open);
    try { localStorage.setItem(OPEN_KEY, String(open)); } catch { /* not kept: fine */ }
  }

  protected async copy() {
    await navigator.clipboard.writeText(JSON.stringify(this.backdrop.style(), null, 2));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }

  protected onKey(event: KeyboardEvent) {
    if (!event.shiftKey || event.key !== 'T' || isTyping(event.target)) return;
    event.preventDefault();
    this.toggle();
  }
}

function readOpen() { try { return localStorage.getItem(OPEN_KEY) !== 'false'; } catch { return true; } }
function isTyping(target: EventTarget | null) { return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && (target as HTMLInputElement).type !== 'range'); }
