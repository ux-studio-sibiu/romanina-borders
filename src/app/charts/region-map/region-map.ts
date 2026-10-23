import { Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { geoConicConformal, geoGraticule, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Geometry, Polygon } from 'geojson';
import type { BaseGeography } from '../../data/geography';
import region from '../../data/region.json';
import { Backdrop } from './backdrop-style';

// Lesson 05: a territory drawn on the map: a filled shape in a colour, an outline (a state's border, over everything), or
// an empire round the provinces (hatched, a dashed edge, its name in spaced capitals at `at`, [lon, lat])
export type Territory = { id: string; geometry: GeoPermissibleObjects; colour?: string; outline?: boolean; label?: string; empire?: boolean; at?: [number, number] };

// From data/region.json, shared with the build scripts. The core: from the Tisza plain to the Dniester's mouth, the
// Balkan range to Galicia; every state of the story is inside it, and the map is fitted so it is always fully in view,
// whatever the window's shape. The area: the core and about a fifth more on every side. The map runs full bleed:
// whatever the window shows beyond the core comes from the area, so a wide screen sees Hungary to Budapest and Ukraine
// to Crimea rather than blank paper.
type Extent = [[number, number], [number, number]];
const CORE = region.core as Extent;
const REGION = region.area as Extent;
// The graticule runs further, to the window's edges on any screen
const BEYOND: [[number, number], [number, number]] = [[5, 33], [45, 60]];
const PAD = 16; // the core's least distance from the window's edges

// The core and the area as polygons: two parallels and two meridians each. In a conic projection they aren't rectangles:
// the meridians are straight and lean together towards the north, the parallels are arcs. precision(0.25): a vertex every
// quarter degree along the parallels. d3 joins vertices with great-circle arcs, not parallels, so at the default 2.5° the
// top and bottom edges would show kinks.
const core = geoGraticule().extent(CORE).precision(0.25).outline();
// Exported: the satellite picture, the trace tool's alignments and its smoothing all work in the area's box
export const frame = geoGraticule().extent(REGION).precision(0.25).outline();
// The map's projection, before it is fitted to a size. Exported: the trace tool smooths its shapes in it (lesson 04).
export const regionProjection = () => geoConicConformal().parallels(region.projection.parallels as [number, number]).rotate(region.projection.rotate as [number, number]);

const minor = geoGraticule().extent(BEYOND).step([1, 1]).precision(0.5)();
const major = geoGraticule().extent(BEYOND).step([5, 5]).precision(0.5)();

// D3 does the math, Angular renders the DOM: d3-geo turns [lon, lat] lines into SVG path strings in computed(),
// the template binds them. Unlike data-viz's flat map (a fixed 960 × 500 viewBox), this map fills the window,
// so the projection is refitted to the measured size whenever it changes.
@Component({
  selector: 'app-region-map',
  templateUrl: './region-map.html',
  styleUrl: './region-map.scss',
  // The backdrop tuner's numbers, as custom properties the satellite styles read
  host: {
    '[style.--satellite-filter]': 'backdrop.filter()',
    '[style.--satellite-opacity]': 'backdrop.style().opacity',
    '[style.--land-veil]': 'backdrop.style().veil',
    '[style.--county-lines]': 'backdrop.style().counties',
    '[style.--river-halo]': 'backdrop.style().halo',
    '[style.--coast-line]': 'backdrop.style().coast',
    '[style.--outside-veil]': 'backdrop.style().outside'
  }
})
export class RegionMap {
  readonly label = input("Map of the lands of today's Romania");
  readonly geography = input<BaseGeography | null>(null); // lesson 01: sea, land, borders and rivers; null while loading
  readonly satellite = input(true); // lesson 02: the Blue Marble picture under the lines
  readonly territories = input<Territory[]>([]); // lesson 05: shapes over the land, under the lines
  readonly focus = input<GeoPermissibleObjects | null>(null); // lesson 05: the land to keep bright; everything outside it is veiled

  protected readonly backdrop = inject(Backdrop);

  // The clip path's id must be unique in the document, in case a lesson page ever shows a second map
  protected readonly clipId = `region-clip-${++maps}`;

  // The host's size in CSS pixels, from a ResizeObserver. A signal, so a resize re-runs the computeds below (zoneless:
  // a plain field set from the observer's callback would never reach the screen).
  protected readonly size = signal({ width: 0, height: 0 });

  constructor() {
    const observer = new ResizeObserver(([entry]) => this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(inject(ElementRef<HTMLElement>).nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected readonly viewBox = computed(() => `0 0 ${this.size().width} ${this.size().height}`);

  // Lambert conformal conic: true scale along 44° and 48° N (they bracket Romania, 43.6°–48.3° N), centred on 25° E so
  // that meridian stands upright. Conformal: angles and small shapes are kept, so the Carpathian arc bends as it should.
  // Between 42° and 50° N areas are off by under 0.4% (lesson 00), so territories can still be compared by size.
  // Public: the trace tool (lesson 04) draws over the map in the same projection
  readonly projection = computed(() => {
    const { width, height } = this.size();
    return regionProjection().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], core);
  });
  private readonly path = computed(() => geoPath(this.projection()));

  protected readonly minor = computed(() => this.path()(minor) ?? '');
  protected readonly major = computed(() => this.path()(major) ?? '');
  protected readonly frame = computed(() => this.path()(frame) ?? '');

  // Lesson 02: where the satellite picture goes, and lesson 04's unit for placing a reference map (public).
  // scripts/build-satellite.mjs drew it in this same projection, fitted to the area's bounding box; here the projection is
  // only scaled and moved to fit the window, so placing the picture over the area's bounding box lines it up exactly.
  readonly frameBox = computed(() => {
    const [[x0, y0], [x1, y1]] = this.path().bounds(frame);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });

  // Lesson 01: the base geography, as path strings, one per layer (all the units in one string). The template clips it to
  // the area, so the units that run past it (Ukraine's oblasts, Poland) end at its edge, usually off screen.
  protected readonly sea = computed(() => this.draw(this.geography()?.sea));
  protected readonly land = computed(() => this.draw(this.geography()?.land));
  protected readonly unitBorders = computed(() => this.draw(this.geography()?.unitBorders));
  protected readonly countryBorders = computed(() => this.draw(this.geography()?.countryBorders));
  protected readonly coastline = computed(() => this.draw(this.geography()?.coastline));
  protected readonly rivers = computed(() => (this.geography()?.rivers ?? []).map(r => ({ id: String(r.id), d: this.draw(r) })));

  // Fills over the land and under every line; outlines over everything, so a state's border reads above rivers and coasts
  protected readonly fills = computed(() => this.territories().filter(t => !t.outline && !t.empire).map(t => ({ id: t.id, colour: t.colour, d: this.draw(t.geometry) })));
  protected readonly outlines = computed(() => this.territories().filter(t => t.outline).map(t => ({ id: t.id, colour: t.colour, d: this.draw(t.geometry) })));

  // Empires: under the provinces, hatched in their colour (a pattern each, with this map's own ids), with a dashed edge and
  // their name in spaced capitals, darkened like the provinces' names
  protected readonly empires = computed(() => this.territories().filter(t => t.empire).map(t => {
    const [ax, ay] = (t.at && this.projection()(t.at)) ?? this.path().centroid(t.geometry);
    // Kept inside the window: on a narrow screen the empire's own land may be off it, and its name then sits at the edge
    // on its side instead of disappearing
    const { width, height } = this.size();
    const x = Math.max(90, Math.min(width - 90, ax)), y = Math.max(56, Math.min(height - 28, ay)); // 56: under the header links
    return { id: t.id, colour: t.colour ?? '#6b6862', ink: darken(t.colour ?? '#6b6862', 0.35), light: lighten(t.colour ?? '#6b6862', 0.55), d: this.draw(t.geometry), pattern: `${this.clipId}-hatch-${t.id}`, lines: twoLines(t.label ?? ''), x, y };
  }));

  // Names for the filled territories that have one: on the largest part (a small island or a sliver never gets the label),
  // at its centroid; sized by that part's area, 12–24px. A long name goes on two lines. The colour is the territory's,
  // darkened by a third so a pale yellow still reads; a white halo (paint-order) keeps it off the picture behind.
  protected readonly labels = computed(() => this.territories().filter(t => t.label && !t.outline && !t.empire).map(t => {
    const path = this.path(), main = largestPart(t.geometry, path);
    const [x, y] = path.centroid(main);
    const size = Math.max(12, Math.min(24, Math.sqrt(path.area(main)) / 8));
    return { id: t.id, x, y, size, lines: twoLines(t.label!), colour: t.colour ? darken(t.colour, 0.35) : undefined };
  }));

  // The veil outside the focus: the whole window with the focus cut out (even-odd: the focus's rings make holes in the
  // window's rectangle), so the neighbours, their borders and the empires' hatching recede behind the story's land
  protected readonly outside = computed(() => {
    const focus = this.focus();
    if (!focus) return '';
    const { width, height } = this.size();
    return `M0 0H${width}V${height}H0Z${this.draw(focus)}`;
  });

  private draw(o: GeoPermissibleObjects | undefined) { return o ? this.path()(o) ?? '' : ''; }

}

let maps = 0;

// A long name (over 12 letters, several words) on two lines, split about halfway by words
function twoLines(name: string) {
  const words = name.split(' '), half = Math.ceil(words.length / 2);
  return name.length > 12 && words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [name];
}

// The biggest polygon of a MultiPolygon (a Feature's or a bare geometry), by its area on screen
function largestPart(o: GeoPermissibleObjects, path: GeoPath): GeoPermissibleObjects {
  const geometry = ('geometry' in o ? o.geometry : o) as Geometry | null;
  if (geometry?.type !== 'MultiPolygon') return o;
  const parts: Polygon[] = geometry.coordinates.map(coordinates => ({ type: 'Polygon', coordinates }));
  return parts.reduce((a, b) => path.area(b) > path.area(a) ? b : a);
}

// A #rrggbb colour mixed with black (darken) or white (lighten) by `amount` (0–1)
function darken(hex: string, amount: number) { return mix(hex, 0, amount); }
function lighten(hex: string, amount: number) { return mix(hex, 255, amount); }
function mix(hex: string, to: number, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (to - v) * amount));
  return `rgb(${c.join(' ')})`;
}

