import { Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { geoConicConformal, geoGraticule, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { BaseGeography } from '../../data/geography';
import { Backdrop } from './backdrop-style';

// The area every state of the story must fit in, in [lon, lat]: from the Tisza plain to the Dniester's mouth,
// the Balkan range to Galicia. The map is fitted to it, so it is always fully in view, whatever the window's shape.
const REGION: [[number, number], [number, number]] = [[20, 43], [30.5, 48.5]];
// The graticule runs further, to the window's edges on any screen
const BEYOND: [[number, number], [number, number]] = [[5, 33], [45, 60]];
const PAD = 56; // room around the frame for the degree labels

// The frame: two parallels (43° and 48.5° N) and two meridians (20° and 30.5° E), as a polygon. In a conic projection
// it isn't a rectangle: the meridians are straight and lean together towards the north, the parallels are arcs.
// precision(0.25): a vertex every quarter degree along the parallels. d3 joins vertices with great-circle arcs, not
// parallels, so at the default 2.5° the frame's top and bottom edges would show kinks.
const frame = geoGraticule().extent(REGION).precision(0.25).outline();
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
    '[style.--coast-line]': 'backdrop.style().coast'
  }
})
export class RegionMap {
  readonly label = input("Map of the lands of today's Romania");
  readonly reserveBottom = input(0); // extra room kept clear under the frame, for whatever the page floats over the map's bottom edge
  readonly geography = input<BaseGeography | null>(null); // lesson 01: sea, land, borders and rivers; null while loading
  readonly satellite = input(true); // lesson 02: the Blue Marble picture under the lines

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
  private readonly projection = computed(() => {
    const { width, height } = this.size();
    return geoConicConformal().parallels([44, 48]).rotate([-25, 0]).fitExtent([[PAD, PAD], [width - PAD, height - PAD - this.reserveBottom()]], frame);
  });
  private readonly path = computed(() => geoPath(this.projection()));

  protected readonly minor = computed(() => this.path()(minor) ?? '');
  protected readonly major = computed(() => this.path()(major) ?? '');
  protected readonly frame = computed(() => this.path()(frame) ?? '');

  // Lesson 02: where the satellite picture goes. scripts/build-satellite.mjs drew it in this same projection, fitted to the
  // frame's bounding box; here the projection is only scaled and moved to fit the window, so placing the picture over the
  // frame's bounding box lines it up exactly, at any size.
  protected readonly satelliteBox = computed(() => {
    const [[x0, y0], [x1, y1]] = this.path().bounds(frame);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });

  // Lesson 01: the base geography, as path strings, one per layer (all 147 units in one string). The template clips it to the
  // frame, an atlas plate's neatline, so the units that run past it (Ukraine's oblasts, Hungary's counties) end at its edge.
  protected readonly sea = computed(() => this.draw(this.geography()?.sea));
  protected readonly land = computed(() => this.draw(this.geography()?.land));
  protected readonly unitBorders = computed(() => this.draw(this.geography()?.unitBorders));
  protected readonly countryBorders = computed(() => this.draw(this.geography()?.countryBorders));
  protected readonly coastline = computed(() => this.draw(this.geography()?.coastline));
  protected readonly rivers = computed(() => (this.geography()?.rivers ?? []).map(r => ({ id: String(r.id), d: this.draw(r) })));

  private draw(o: GeoPermissibleObjects | undefined) { return o ? this.path()(o) ?? '' : ''; }

  // Degree labels: meridians under the frame's bottom edge, parallels left of its west edge.
  // The last argument is the least gap between labels, in px: on a narrow screen every second (or third) degree is labelled.
  protected readonly meridians = computed(() => this.ticks(range(21, 30), lon => [lon, REGION[0][1]], lon => `${lon}° E`, 48));
  protected readonly parallels = computed(() => this.ticks(range(44, 48), lat => [REGION[0][0], lat], lat => `${lat}° N`, 18));

  // The projection's centre, marked with a cross
  protected readonly centre = computed(() => this.projection()([25, 46]) ?? [0, 0]);

  private ticks(values: number[], at: (v: number) => [number, number], text: (v: number) => string, minGap: number) {
    const ticks = values.map(v => {
      const [x, y] = this.projection()(at(v)) ?? [0, 0];
      return { x, y, text: text(v) };
    });
    const gap = Math.hypot(ticks[1].x - ticks[0].x, ticks[1].y - ticks[0].y); // the labels are near enough evenly spaced
    const every = Math.ceil(minGap / gap);
    return ticks.filter((_, i) => i % every === 0);
  }
}

let maps = 0;

function range(from: number, to: number) { return Array.from({ length: to - from + 1 }, (_, i) => from + i); }
