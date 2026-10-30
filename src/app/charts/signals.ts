import { effect, signal, type WritableSignal } from '@angular/core';

// Small signals the charts share

// A yes-or-no setting kept across reloads in localStorage (a panel open or folded, say): `initial` until one is kept.
// Set it like any signal; it is saved as it changes. Call it where effect() can run (a component's field, its
// constructor).
export function storedFlag(key: string, initial = true): WritableSignal<boolean> {
  let start = initial;
  try { const kept = localStorage.getItem(key); if (kept !== null) start = kept !== 'false'; } catch { /* none kept */ }
  const flag = signal(start);
  effect(() => { const value = flag(); try { localStorage.setItem(key, String(value)); } catch { /* not kept: fine */ } });
  return flag;
}

// Whether a media query matches, kept up to date
export function mediaSignal(query: string) {
  const media = matchMedia(query), matches = signal(media.matches);
  media.addEventListener('change', e => matches.set(e.matches));
  return matches.asReadonly();
}
