import { KeyValuePipe } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { geoPath } from 'd3-geo';
import type { Position } from 'geojson';
import { RegionMap } from '../../charts/region-map/region-map';
import { FineRange } from '../../tools/fine-range/fine-range';
import { Geography } from '../../data/geography';
import { type Alignment, fromFeatureCollection, newId, outline, REFERENCE_MAPS, toFeatureCollection, toPolygon, TraceStore } from '../../tools/trace/trace-shapes';

// Warm colours to tell the shapes apart while tracing (not the story's colours: those come with the player)
const COLOURS = ['#d1261b', '#e08a00', '#2f7d32', '#7b3fa0', '#0f6e8c', '#a0522d', '#c2185b', '#5d6d00'];

type Drag = { kind: 'image'; start: [number, number]; from: Alignment } | { kind: 'vertex'; index: number };

// Lesson 04: the trace tool, a dev page. A public-domain map is laid over the region map and lined up with it (Align),
// then shapes are clicked round its regions (Draw). Points are kept in [lon, lat], smoothed into rounded outlines, and
// exported as GeoJSON to commit. Everything is kept in localStorage while you work.
@Component({
  selector: 'app-trace-page',
  imports: [RegionMap, KeyValuePipe, FineRange],
  templateUrl: './trace-page.html',
  styleUrl: './trace-page.scss',
  host: { '(window:keydown)': 'onKey($event)' }
})
export class TracePage {
  protected readonly geography = inject(Geography);
  protected readonly store = inject(TraceStore);
  private readonly map = viewChild.required(RegionMap);
  private readonly overlay = viewChild.required<ElementRef<SVGSVGElement>>('overlay');

  protected readonly mode = signal<'align' | 'draw'>('align');
  protected readonly showSatellite = signal(true);
  protected readonly showImage = signal(true);
  protected readonly blend = signal<'normal' | 'multiply'>('normal');
  protected readonly selectedId = signal<string | null>(null);
  private readonly cursor = signal<[number, number] | null>(null);
  private drag: Drag | null = null;

  // --- The reference map ---------------------------------------------------------------------------------------------
  protected readonly references = REFERENCE_MAPS;
  protected readonly source = signal(REFERENCE_MAPS[0].file);
  protected readonly uploads = signal<Record<string, string>>({}); // a file you opened: its name → an object URL
  protected readonly imageUrl = computed(() => this.uploads()[this.source()] ?? `reference-maps/${this.source()}`);
  private readonly aspect = signal(1); // height / width, once the picture has loaded

  protected readonly align = computed(() => this.store.alignment(this.source()));

  // The picture's box over the map, from the alignment (in frame widths) and the frame box (in px)
  protected readonly image = computed(() => {
    const box = this.map().frameBox(), a = this.align();
    const width = a.width * box.width, height = width * this.aspect() * a.stretch;
    const cx = box.x + a.cx * box.width, cy = box.y + a.cy * box.width;
    return { x: cx - width / 2, y: cy - height / 2, width, height, transform: `rotate(${a.rotate} ${cx} ${cy})` };
  });

  constructor() {
    // Measure the picture's shape whenever it changes
    effect(() => {
      const img = new Image();
      img.onload = () => this.aspect.set(img.naturalHeight / img.naturalWidth);
      img.src = this.imageUrl();
    });
  }

  // --- The shapes ----------------------------------------------------------------------------------------------------
  protected readonly selected = computed(() => this.store.shapes().find(s => s.id === this.selectedId()) ?? null);

  protected readonly drawn = computed(() => {
    const project = this.map().projection(), path = geoPath(project);
    return this.store.shapes()
      .map((s, i) => ({ s, colour: COLOURS[i % COLOURS.length] }))
      .filter(({ s }) => !s.hidden && s.points.length)
      .map(({ s, colour }) => ({
        id: s.id, colour, closed: s.closed, isSelected: s.id === this.selectedId(),
        d: s.closed && s.points.length >= 3 ? path(toPolygon(outline(s))) ?? '' : 'M' + s.points.map(p => project(p as [number, number])).join('L')
      }));
  });

  protected readonly colourOf = (id: string) => COLOURS[this.store.shapes().findIndex(s => s.id === id) % COLOURS.length];

  // The selected shape's control points, as handles to drag
  protected readonly handles = computed(() => {
    const project = this.map().projection();
    return (this.selected()?.points ?? []).map((p, i) => { const [x, y] = project(p as [number, number]) ?? [0, 0]; return { i, x, y }; });
  });

  // While drawing: a line from the last point to the cursor
  protected readonly rubber = computed(() => {
    const s = this.selected(), c = this.cursor(), h = this.handles();
    return s && !s.closed && c && h.length && this.mode() === 'draw' ? { x1: h[h.length - 1].x, y1: h[h.length - 1].y, x2: c[0], y2: c[1] } : null;
  });

  // --- Pointer -------------------------------------------------------------------------------------------------------
  protected onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const p = this.local(event);
    if (this.mode() === 'align') {
      this.drag = { kind: 'image', start: p, from: this.align() };
    } else {
      const index = (event.target as Element).getAttribute('data-index');
      if (index === null) return this.addPoint(p);
      const s = this.selected()!;
      if (!s.closed && +index === 0 && s.points.length >= 3) return this.closeShape(); // clicked the first point: done
      this.drag = { kind: 'vertex', index: +index };
    }
    this.overlay().nativeElement.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent) {
    const p = this.local(event);
    this.cursor.set(p);
    const drag = this.drag;
    if (drag?.kind === 'image') {
      const unit = this.map().frameBox().width;
      this.store.align(this.source(), { cx: drag.from.cx + (p[0] - drag.start[0]) / unit, cy: drag.from.cy + (p[1] - drag.start[1]) / unit });
    } else if (drag?.kind === 'vertex') {
      const lonLat = this.invert(p), id = this.selectedId()!;
      this.store.update(id, s => ({ points: s.points.map((q, i) => i === drag.index ? lonLat : q) }));
    }
  }

  protected onPointerUp() { this.drag = null; }

  // Align mode: the wheel scales the picture about the cursor, so the place under it stays put
  protected onWheel(event: WheelEvent) {
    if (this.mode() !== 'align') return;
    event.preventDefault();
    const box = this.map().frameBox(), a = this.align(), [x, y] = this.local(event);
    const f = Math.exp(-event.deltaY * 0.0015);
    const px = (x - box.x) / box.width, py = (y - box.y) / box.width;
    this.store.align(this.source(), { width: a.width * f, cx: px + (a.cx - px) * f, cy: py + (a.cy - py) * f });
  }

  // Right-click a point to remove it
  protected removePoint(event: Event, index: number) {
    event.preventDefault();
    this.store.update(this.selectedId()!, s => ({ points: s.points.filter((_, i) => i !== index) }));
  }

  // A click: starts a shape (nothing selected), adds to the end (drawing), or, on a finished shape, puts a point into
  // its nearest edge
  private addPoint(p: [number, number]) {
    const lonLat = this.invert(p), s = this.selected();
    if (!s) {
      const shape = { id: newId(), name: `Shape ${this.store.shapes().length + 1}`, source: this.source(), points: [lonLat], closed: false, smooth: true };
      this.store.add(shape);
      this.selectedId.set(shape.id);
    } else if (!s.closed) {
      this.store.update(s.id, { points: [...s.points, lonLat] });
    } else {
      const at = nearestEdge(this.handles().map(h => [h.x, h.y]), p) + 1;
      this.store.update(s.id, { points: [...s.points.slice(0, at), lonLat, ...s.points.slice(at)] });
    }
  }

  protected closeShape() {
    const s = this.selected();
    if (s && s.points.length >= 3) this.store.update(s.id, { closed: true });
  }

  protected select(id: string) { this.selectedId.set(this.selectedId() === id ? null : id); this.mode.set('draw'); }

  protected remove(id: string) {
    this.store.remove(id);
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  // --- Keys ----------------------------------------------------------------------------------------------------------
  protected onKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement && event.target.type === 'text') return;
    const s = this.selected();
    switch (event.key) {
      case 'a': this.mode.set('align'); break;
      case 'd': this.mode.set('draw'); break;
      case 'h': this.showImage.update(v => !v); break;
      case 'n': this.selectedId.set(null); this.mode.set('draw'); break;
      case 'Enter': this.closeShape(); break;
      case 'Escape': this.selectedId.set(null); break;
      case 'Backspace': if (s && !s.closed) this.store.update(s.id, { points: s.points.slice(0, -1) }); break;
      default: return;
    }
    event.preventDefault();
  }

  // --- Panel ---------------------------------------------------------------------------------------------------------
  protected setAlign(key: keyof Alignment, event: Event) { this.store.align(this.source(), { [key]: Number((event.target as HTMLInputElement).value) }); }
  protected resetAlign() { this.store.align(this.source(), null); }

  protected readonly copied = signal(false);
  protected async copyAlignments() {
    await navigator.clipboard.writeText(JSON.stringify(this.store.allAlignments(), null, 2));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }
  protected pickSource(event: Event) { this.source.set((event.target as HTMLSelectElement).value); }

  // Any image from your disk, e.g. another plate from the same atlas. Its alignment is kept under its file name.
  protected openImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploads.update(u => ({ ...u, [file.name]: URL.createObjectURL(file) }));
    this.source.set(file.name);
  }

  protected rename(id: string, event: Event) { this.store.update(id, { name: (event.target as HTMLInputElement).value }); }
  protected toggle(id: string, key: 'smooth' | 'hidden', event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.store.update(id, { [key]: key === 'hidden' ? !checked : checked });
  }

  protected exportShapes() {
    const blob = new Blob([JSON.stringify(toFeatureCollection(this.store.shapes()), null, 1)], { type: 'application/geo+json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'shapes.geo.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Import adds the file's shapes, replacing any with the same id
  protected async importShapes(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const imported = fromFeatureCollection(JSON.parse(await file.text()));
    const ids = new Set(imported.map(s => s.id));
    this.store.shapes.update(all => [...all.filter(s => !ids.has(s.id)), ...imported]);
  }

  // --- Helpers -------------------------------------------------------------------------------------------------------
  private local(event: MouseEvent): [number, number] {
    const rect = this.overlay().nativeElement.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  private invert(p: [number, number]): Position {
    const [lon, lat] = this.map().projection().invert!(p) ?? [0, 0];
    return [+lon.toFixed(4), +lat.toFixed(4)];
  }
}

// The edge (i → i + 1, wrapping round) of a closed ring nearest to p
function nearestEdge(ring: number[][], p: number[]) {
  let best = 0, bestDistance = Infinity;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const distance = Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
    if (distance < bestDistance) { best = i; bestDistance = distance; }
  });
  return best;
}
