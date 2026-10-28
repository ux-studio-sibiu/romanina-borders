import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import type { GeoProjection } from 'd3-geo';

export type NamePlaces = Record<string, [number, number]>; // a name's place, by the id of what it names, in [lon, lat]
export type NameTexts = Record<string, string>; // a name's words, by the same ids, its lines split at \n
export type MapName = { id: string; text: string; x: number; y: number }; // a name as the map draws it, on screen

// A dev tool: every name on the map (the provinces', the soft zones', the empires', the lands taken) as a handle over it.
// Drag a handle and the name moves with it; click one to pick it, and write its words in the panel, Enter for a new line.
// Both hold on this moment and on every other that shows the same land. Copy puts the placed and written names on the
// clipboard as JSON, for data/name-places.ts (NAME_PLACES, NAME_TEXTS); Reset puts them back as the data has them. The
// parent keeps them (and localStorage, across reloads).
@Component({
  selector: 'app-name-editor',
  templateUrl: './name-editor.html',
  styleUrl: './name-editor.scss',
  // The drag follows the pointer on the window, so a fast drag doesn't slip off the handle
  host: { '(window:pointermove)': 'move($event)', '(window:pointerup)': 'up()', '(window:pointercancel)': 'up()' }
})
export class NameEditor {
  readonly names = input.required<MapName[]>();
  readonly places = input.required<NamePlaces>();
  readonly texts = input.required<NameTexts>();
  readonly projection = input<GeoProjection | undefined>();
  readonly placesChange = output<NamePlaces>();
  readonly textsChange = output<NameTexts>();
  readonly reset = output<void>();

  protected readonly isOpen = signal(false);
  protected readonly copied = signal(false);
  protected readonly picked = signal<string | null>(null);
  protected readonly pickedName = computed(() => this.names().find(n => n.id === this.picked()) ?? null);
  protected readonly json = computed(() => JSON.stringify({ places: round(this.places()), texts: this.texts() }));

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('handlesSvg');
  // The name being dragged, and where on it it was caught (so it doesn't jump to the pointer)
  private drag: { id: string; dx: number; dy: number } | null = null;

  protected down(event: PointerEvent, name: MapName) {
    event.preventDefault();
    this.picked.set(name.id);
    const [x, y] = this.local(event);
    this.drag = { id: name.id, dx: name.x - x, dy: name.y - y };
  }
  protected move(event: PointerEvent) {
    const d = this.drag, project = this.projection();
    if (!d || !project?.invert) return;
    const [x, y] = this.local(event), p = project.invert([x + d.dx, y + d.dy]);
    if (p) this.placesChange.emit({ ...this.places(), [d.id]: [p[0], p[1]] });
  }
  protected up() { this.drag = null; }

  protected write(id: string, text: string) { this.textsChange.emit({ ...this.texts(), [id]: text }); }
  // Back to the land's own name (and its automatic split)
  protected unwrite(id: string) {
    const { [id]: _, ...rest } = this.texts();
    this.textsChange.emit(rest);
  }

  protected async copy() {
    await navigator.clipboard.writeText(JSON.stringify({ places: round(this.places()), texts: this.texts() }, null, 1));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }

  private local(event: PointerEvent): [number, number] {
    const box = this.svg()!.nativeElement.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }
}

// To two decimals (about a kilometre): enough for a name's place, and short to read
function round(places: NamePlaces): NamePlaces {
  return Object.fromEntries(Object.entries(places).map(([id, [x, y]]) => [id, [Math.round(x * 100) / 100, Math.round(y * 100) / 100]]));
}
