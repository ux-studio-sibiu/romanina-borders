import { afterRenderEffect, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { geoConicConformal, geoGraticule, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Geometry, Polygon } from 'geojson';
import type { BaseGeography } from '../../data/geography';
import region from '../../data/region.json';
import { Backdrop } from './backdrop-style';

// Lesson 05–06: a territory drawn on the map, by kind:
//   province: a filled shape in its colour, named at its centre
//   outline:  a state's border, over everything
//   empire:   round the provinces: hatched, a dashed edge, its name in spaced capitals at `at` ([lon, lat])
//   lost:     a land taken away: a dotted edge over the veil, its name and `note` (who took it)
//   zone:     a land with no known border: its colour with a blurred edge and no line; `faint` under a later state, `light`
//             a lighter fade (a neighbour, often small)
type Shape = { id: string; geometry: GeoPermissibleObjects };
export type Territory =
  | Shape & { kind: 'province'; colour?: string; label?: string }
  | Shape & { kind: 'outline'; colour?: string }
  | Shape & { kind: 'empire'; colour?: string; label?: string; at?: [number, number] }
  | Shape & { kind: 'lost'; label: string; note: string }
  | Shape & { kind: 'zone'; colour?: string; label?: string; faint?: boolean; light?: boolean };

// Lesson 06: an arrow across the map, for movement rather than borders (the peoples passing through): a smooth curve
// through its waypoints, in [lon, lat], first to last; the name (and when) at the waypoint labelAt, the middle by default
export type MapArrow = { id: string; name: string; when?: string; years?: [number, number]; points: [number, number][]; labelAt?: number };

// Lesson 06: a place on the map, a dot and its name, in [lon, lat] (the Greek cities on the coast, c. 60 BC)
export type MapPlace = { id: string; name: string; at: [number, number] };

// Lesson 06: a box to fit instead of the core, in [lon, lat]: a moment's own view
export type Extent = [[number, number], [number, number]];

// Lesson 06: how long the zoom from one view to the next takes, in seconds
const ZOOM_SECONDS = 1.3;
// Lesson 06: the arrows drawn on one after another, in the order given (by year), each fading again a while later, then
// started over: each starts ARROW_STEP after the last, takes ARROW_GROW to draw, stays ARROW_LINGER, fades over
// ARROW_FADE; ARROW_PAUSE of empty map before the first comes back
const ARROW_STEP = 2.4, ARROW_GROW = 2, ARROW_LINGER = 3.4, ARROW_FADE = 1.4, ARROW_PAUSE = 1.2;
// Lesson 07: the arrows by a year instead (the time scale's): each draws on over its years (at least DRAW_YEARS, so a
// short one is still seen), stays LINGER_YEARS after them, then fades over FADE_YEARS to PAST, a trace of where it went
const DRAW_YEARS = 60, LINGER_YEARS = 80, FADE_YEARS = 60, PAST = 0.2;

// From data/region.json, shared with the build scripts. The core: from the Tisza plain to the Dniester's mouth, the
// Balkan range to Galicia; every state of the story is inside it, and the map is fitted so it is always fully in view,
// whatever the window's shape. The area: the core and about a fifth more on every side. The map runs full bleed:
// whatever the window shows beyond the core comes from the area, so a wide screen sees Hungary to Budapest and Ukraine
// to Crimea rather than blank paper.
const CORE = region.core as Extent;
const REGION = region.area as Extent;
// The wide data's extent (lesson 06): for a moment whose view reaches past the area
const WIDE = region.wide as Extent;
const PAD = 16; // the core's least distance from the window's edges

// The core and the area as polygons: two parallels and two meridians each. In a conic projection they aren't rectangles:
// the meridians are straight and lean together towards the north, the parallels are arcs. precision(0.25): a vertex every
// quarter degree along the parallels. d3 joins vertices with great-circle arcs, not parallels, so at the default 2.5° the
// top and bottom edges would show kinks.
const core = geoGraticule().extent(CORE).precision(0.25).outline();
// Exported: the satellite picture, the trace tool's alignments and its smoothing all work in the area's box
export const frame = geoGraticule().extent(REGION).precision(0.25).outline();
const wideFrame = geoGraticule().extent(WIDE).precision(0.25).outline();
// The wide satellite picture's extent: smaller than the wide data's (the Roman world, not all of Europe)
const wideSatelliteFrame = geoGraticule().extent(region.wideSatellite as Extent).precision(0.25).outline();

// Whether a view needs the wide data: any of it outside the detailed area
export function needsWide(view: Extent | null | undefined) {
  return !!view && (view[0][0] < REGION[0][0] || view[0][1] < REGION[0][1] || view[1][0] > REGION[1][0] || view[1][1] > REGION[1][1]);
}
// The map's projection, before it is fitted to a size. Exported: the trace tool smooths its shapes in it (lesson 04).
export const regionProjection = () => geoConicConformal().parallels(region.projection.parallels as [number, number]).rotate(region.projection.rotate as [number, number]);

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
  readonly plain = input(false); // lesson 06: a stylized map without the picture: blue water, paper land, no rivers
  readonly territories = input<Territory[]>([]); // lesson 05: shapes over the land, under the lines
  readonly focus = input<GeoPermissibleObjects | null>(null); // lesson 05: the land to keep bright; everything outside it is veiled
  readonly softFocus = input(false); // lesson 06: the focus is a soft zone: the veil's edge is blurred like the zone's, not cut sharp
  readonly arrows = input<MapArrow[]>([]); // lesson 06: movement across the map
  readonly arrowYear = input<number | null>(null); // lesson 07: the arrows as at this year, instead of looping
  readonly nameAt = input<Record<string, [number, number]>>({}); // lesson 07: names placed by hand, by id, in [lon, lat]
  readonly places = input<MapPlace[]>([]); // lesson 06: dots with names
  readonly view = input<Extent | null>(null); // lesson 06: a box to fit instead of the core (a moment zoomed out)
  readonly wide = input(false); // lesson 06: draw the wide data's extent and picture (the geography input is then the wide data)

  protected readonly backdrop = inject(Backdrop);

  // The clip path's id must be unique in the document, in case a lesson page ever shows a second map
  protected readonly clipId = `region-clip-${++maps}`;

  // The host's size in CSS pixels, from a ResizeObserver. A signal, so a resize re-runs the computeds below (zoneless:
  // a plain field set from the observer's callback would never reach the screen).
  protected readonly size = signal({ width: 0, height: 0 });

  constructor() {
    const observer = new ResizeObserver(([entry]) => this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(inject(ElementRef<HTMLElement>).nativeElement);
    inject(DestroyRef).onDestroy(() => { observer.disconnect(); this.zoomAnimation?.cancel(); this.ghost?.remove(); });

    // Lesson 06: the arrows drawn on in turn, looping (after the render, once their masks and names are in the page). Not
    // for a visitor who asked for less motion: they see them all at once.
    afterRenderEffect(() => {
      const n = this.arrowPaths().length, svg = this.mapSvg()?.nativeElement;
      this.arrowAnimations.forEach(a => a.cancel());
      this.arrowAnimations = [];
      if (!n || !svg || reducedMotion() || this.arrowsAt()) return;
      const cycle = (n - 1) * ARROW_STEP + ARROW_GROW + ARROW_LINGER + ARROW_FADE + ARROW_PAUSE, at = (s: number) => Math.min(1, s / cycle);
      const timing = { duration: cycle * 1000, iterations: Infinity };
      const [reveals, arrows, labels, years] = ['.arrow-reveal', 'path.arrow', '.arrow-label', '.arrow-year'].map(s => [...svg.querySelectorAll<SVGElement>(s)].filter(e => !e.closest('.ghost')));
      for (let i = 0; i < n; i++) {
        const start = i * ARROW_STEP, drawn = start + ARROW_GROW, end = drawn + ARROW_LINGER;
        // The caption at the top: from its arrow's start until the next one's (the last, until it has faded)
        const until = i < n - 1 ? start + ARROW_STEP : end + ARROW_FADE, swap = 0.4;
        this.arrowAnimations.push(
          years[i].animate([{ offset: 0, opacity: 0 }, { offset: at(start), opacity: 0 }, { offset: at(start + swap), opacity: 1 }, { offset: at(until - swap), opacity: 1 }, { offset: at(until), opacity: 0 }, { offset: 1, opacity: 0 }], timing),
          reveals[i].animate([{ offset: 0, strokeDashoffset: 1 }, { offset: at(start), strokeDashoffset: 1, easing: 'ease-in-out' }, { offset: at(drawn), strokeDashoffset: 0 }, { offset: 1, strokeDashoffset: 0 }], timing),
          arrows[i].animate([{ offset: 0, opacity: 1 }, { offset: at(end), opacity: 1 }, { offset: at(end + ARROW_FADE), opacity: 0 }, { offset: 1, opacity: 0 }], timing),
          labels[i].animate([{ offset: 0, opacity: 0 }, { offset: at(start + ARROW_GROW / 2), opacity: 0 }, { offset: at(drawn), opacity: 1 }, { offset: at(end), opacity: 1 }, { offset: at(end + ARROW_FADE), opacity: 0 }, { offset: 1, opacity: 0 }], timing)
        );
      }
    });

    // Lesson 06: when the view changes, zoom from the old one to the new: once the new view is in the page (after the
    // render, still before the browser paints), so the zoom fades in the new drawings, not the old ones
    afterRenderEffect(() => {
      const start = this.camera();
      if (start) untracked(() => this.zoom(start));
    });
  }

  // Lesson 06: zooming between two views. Every view uses the same projection, only scaled and moved to fit, so going from
  // one to the next is an exact scale and pan of the whole picture. The map draws the new view once, at its final place,
  // and the whole <svg> is scaled as one picture, starting to look like the old view and easing back to no transform: a
  // CSS transform on a layer the browser paints once (will-change) and scales on the graphics card, run as a Web
  // Animation on the compositor thread. Nothing is repainted while it moves, not the borders, the hatching or the blurred
  // zones, so it stays smooth however heavy the map. Started in the same tick the new view renders, before the browser
  // paints, so the first frame is already the old view. Not on a resize (the size changed too), not the first time, not
  // for a visitor who asked for less motion.
  private readonly mapSvg = viewChild<ElementRef<SVGSVGElement>>('mapSvg');
  private readonly cameraState = computed(() => {
    const p = this.projection(), { width, height } = this.size();
    return { key: JSON.stringify(this.view()), wide: this.wide(), satellite: this.satellite(), k: p.scale(), t: p.translate(), width, height };
  });
  protected readonly camera = linkedSignal<ReturnType<typeof this.cameraState>, { k: number; x: number; y: number; underlay: boolean } | null>({
    source: this.cameraState,
    computation: (now, previous) => {
      const was = previous?.source;
      if (!was || was.key === now.key || was.width !== now.width || was.height !== now.height || reducedMotion()) return null;
      const k = was.k / now.k;
      // underlay: zooming in from the wide data to the detailed: the wide picture stays under it until the zoom ends, so the
      // edges the detailed data doesn't reach aren't blank on the way
      return { k, x: was.t[0] - k * now.t[0], y: was.t[1] - k * now.t[1], underlay: was.wide && !now.wide && was.satellite };
    }
  });
  protected readonly zoomingIn = computed(() => (this.camera()?.k ?? 1) < 1); // the start smaller than the end
  private zoomAnimation?: Animation;
  private arrowAnimations: Animation[] = [];
  private ghost?: SVGGElement;

  // Lesson 06: the cross-fade. Called by the parent just before it changes the view: a copy of what is drawn now, kept to
  // fade out over the new drawings while the zoom moves both. Not the bare map (the pictures, the sea and the land),
  // unless `backdrop`: when the next view turns the satellite picture on or off, the old backdrop fades out too, rather
  // than switching at once. Without clip paths (they would clip in the new view's coordinates); the filters it uses are
  // the map's own, by id.
  holdDrawings(backdrop = false) {
    const svg = this.mapSvg()?.nativeElement;
    this.ghost?.remove();
    this.ghost = undefined;
    if (!svg || reducedMotion()) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.querySelectorAll(backdrop ? 'defs, .ghost' : 'defs, image, .sea, .land, .ghost').forEach(e => e.remove());
    copy.querySelectorAll('[clip-path]').forEach(e => e.removeAttribute('clip-path'));
    const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ghost.setAttribute('class', 'ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.append(...copy.childNodes);
    this.ghost = ghost;
  }

  // The zoom as keyframes: the scale eased geometrically (each moment the same proportion closer, so it feels even) about
  // the one point that stays still (the start's x, y = that point × (1 − k)); a plain pan when the scale doesn't change.
  // Sampled 40 times and played linearly, so the easing is in the samples and the browser only interpolates between them.
  private zoom({ k, x, y }: { k: number; x: number; y: number }) {
    const svg = this.mapSvg()?.nativeElement;
    if (!svg) return void this.camera.set(null);
    this.zoomAnimation?.cancel();
    // The old drawings, in the new view's coordinates (the start's transform undone), so they move with the zoom and end
    // where the new ones are; faded out by the time the zoom is halfway, while the new fade in from a third of the way.
    // The fade in has no end keyframe and no fill: it eases to each drawing's own opacity and then is simply gone, so
    // nothing changes on screen when it ends (the arrows keep their own animations).
    const drawings = svg.querySelectorAll<SVGElement>(':is(path, circle, text):not(.sea, .land, defs *, mask *, path.arrow, .arrow-label, .arrow-year)');
    for (const drawing of drawings) drawing.animate([{ offset: 0, opacity: 0 }, { offset: 0.35, opacity: 0 }], { duration: ZOOM_SECONDS * 1000, easing: 'linear' });
    const ghost = this.ghost;
    this.ghost = undefined;
    if (ghost) {
      ghost.setAttribute('transform', `matrix(${1 / k} 0 0 ${1 / k} ${-x / k} ${-y / k})`);
      svg.append(ghost);
      ghost.animate([{ opacity: 1 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }], { duration: ZOOM_SECONDS * 1000, easing: 'linear', fill: 'forwards' });
    }
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; // ease in and out (cubic)
    const frames = Array.from({ length: 41 }, (_, i) => {
      const e = ease(i / 40), kk = k ** (1 - e), f = Math.abs(1 - k) < 1e-6 ? 1 - e : (1 - kk) / (1 - k);
      return { transform: `matrix(${kk}, 0, 0, ${kk}, ${x * f}, ${y * f})` };
    });
    this.zoomAnimation = svg.animate(frames, { duration: ZOOM_SECONDS * 1000, easing: 'linear', fill: 'forwards' });
    this.zoomAnimation.finished.then(() => this.camera.set(null), () => { /* cancelled by a newer zoom */ }).finally(() => ghost?.remove());
  }

  // The wide picture under a zoom in from the wide data (its box in the new view's projection)
  protected readonly underlayBox = computed(() => {
    const [[x0, y0], [x1, y1]] = this.path().bounds(wideSatelliteFrame);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });

  protected readonly viewBox = computed(() => `0 0 ${this.size().width} ${this.size().height}`);

  // Lambert conformal conic: true scale along 44° and 48° N (they bracket Romania, 43.6°–48.3° N), centred on 25° E so
  // that meridian stands upright. Conformal: angles and small shapes are kept, so the Carpathian arc bends as it should.
  // Between 42° and 50° N areas are off by under 0.4% (lesson 00), so territories can still be compared by size.
  // Public: the trace tool (lesson 04) draws over the map in the same projection
  readonly projection = computed(() => {
    const { width, height } = this.size();
    const view = this.view();
    return regionProjection().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], view ? geoGraticule().extent(view).precision(0.25).outline() : core);
  });
  private readonly path = computed(() => geoPath(this.projection()));

  // The data's extent drawn: the area, or the wide extent for a zoomed-out moment
  private readonly extentFrame = computed(() => this.wide() ? wideFrame : frame);
  protected readonly frame = computed(() => this.path()(this.extentFrame()) ?? '');
  protected readonly satelliteHref = computed(() => this.wide() ? 'data/satellite-wide.webp' : 'data/satellite.webp');
  // The satellite picture's box: its extent's bounding box (for the area, the same as frameBox)
  protected readonly satelliteBox = computed(() => {
    const [[x0, y0], [x1, y1]] = this.path().bounds(this.wide() ? wideSatelliteFrame : frame);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });

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
  // Lesson 06: soft zones, under the provinces' fills; blurred by an SVG filter (the template), so the edge fades out
  // `light`: a lighter fade (a neighbour, often small: the strong one would leave little of it)
  protected readonly zones = computed(() => this.ofKind('zone').map(t => ({ id: t.id, colour: t.colour, faint: !!t.faint, light: !!t.light, d: this.draw(t.geometry) })));
  protected readonly fills = computed(() => this.ofKind('province').map(t => ({ id: t.id, colour: t.colour, d: this.draw(t.geometry) })));
  protected readonly outlines = computed(() => this.ofKind('outline').map(t => ({ id: t.id, colour: t.colour, d: this.draw(t.geometry) })));

  // Empires: under the provinces, hatched in their colour (a pattern each, with this map's own ids), with a dashed edge and
  // their name in spaced capitals, darkened like the provinces' names
  protected readonly empires = computed(() => this.ofKind('empire').map(t => {
    const at = this.nameAt()[t.id] ?? t.at, [ax, ay] = (at && this.projection()(at)) ?? this.path().centroid(t.geometry);
    // Kept inside the window: on a narrow screen the empire's own land may be off it, and its name then sits at the edge
    // on its side instead of disappearing
    const { width, height } = this.size();
    const x = Math.max(90, Math.min(width - 90, ax)), y = Math.max(56, Math.min(height - 28, ay)); // 56: under the header links
    return { id: t.id, colour: t.colour ?? '#6b6862', ink: darken(t.colour ?? '#6b6862', 0.35), light: lighten(t.colour ?? '#6b6862', 0.55), d: this.draw(t.geometry), pattern: `${this.clipId}-hatch-${t.id}`, lines: twoLines(t.label ?? ''), x, y };
  }));

  // Names for the filled territories that have one: on the largest part (a small island or a sliver never gets the label),
  // at its centroid; sized by that part's area, 12–24px. A long name goes on two lines. The colour is the territory's,
  // darkened by a third so a pale yellow still reads; a white halo (paint-order) keeps it off the picture behind.
  // Lesson 06: the lands a moment takes away, each a dotted edge and, at its centre, its name and who took it
  protected readonly lost = computed(() => this.ofKind('lost').map(t => {
    const path = this.path(), [x, y] = path.centroid(largestPart(t.geometry, path));
    return { id: t.id, d: this.draw(t.geometry), name: t.label, note: t.note, x, y };
  }));

  protected readonly labels = computed(() => [...this.ofKind('province'), ...this.ofKind('zone')].filter(t => t.label).map(t => {
    const path = this.path(), main = largestPart(t.geometry, path), at = this.nameAt()[t.id];
    const [x, y] = (at && this.projection()(at)) ?? path.centroid(main);
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

  // Lesson 06: the places, projected
  protected readonly placePoints = computed(() => this.places().map(p => {
    const [x, y] = this.projection()(p.at) ?? [0, 0];
    return { id: p.id, name: p.name, x, y };
  }));

  // Lesson 06: the arrows, each one filled shape like a children's atlas draws them: a smooth curve through the waypoints
  // (Catmull–Rom, on screen), thin at the start and widening towards a big head at the end, so it reads as going one way
  protected readonly arrowPaths = computed(() => this.arrows().map(a => {
    const project = this.projection();
    const points = a.points.map(p => project(p) ?? [0, 0] as [number, number]);
    const at = points[a.labelAt ?? Math.floor(points.length / 2)];
    const line = smoothLine(points);
    return { id: a.id, name: a.name, when: a.when, years: a.years, d: arrowShape(line), line: 'M' + line.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L'), x: at[0], y: at[1] - 16 };
  }));

  // Lesson 07: the arrows as at the time scale's year: how much of each is drawn, how strongly it shows, and which one
  // the caption at the top names (the latest still under way). Null: no year, the arrows loop instead.
  protected readonly arrowsAt = computed(() => {
    const year = this.arrowYear(), arrows = this.arrowPaths();
    if (year === null || !arrows.length || reducedMotion()) return null;
    const states = arrows.map(a => {
      const [from, to] = a.years ?? [0, 0], drawn = Math.max(0, Math.min(1, (year - from) / Math.max(DRAW_YEARS, to - from)));
      const past = Math.max(0, Math.min(1, (year - to - LINGER_YEARS) / FADE_YEARS));
      return { drawn, opacity: 1 - past * (1 - PAST), current: drawn > 0 && year <= to + LINGER_YEARS };
    });
    return { states, caption: states.reduce((last, s, i) => s.current ? i : last, -1) };
  });

  // The territories of one kind, typed as that kind
  private ofKind<K extends Territory['kind']>(kind: K) { return this.territories().filter((t): t is Extract<Territory, { kind: K }> => t.kind === kind); }

  private draw(o: GeoPermissibleObjects | undefined) { return o ? this.path()(o) ?? '' : ''; }

}

let maps = 0;

// Lesson 06: the arrow's shape. Its half-width grows from TAIL to BODY along the line; the head, HEAD long and
// HEAD_WIDTH across each side, ends at the last point. In pixels, the same at every view.
const TAIL = 4, BODY = 13, HEAD = 42, HEAD_WIDTH = 28;

// A smooth line through the points (uniform Catmull–Rom, 12 samples per stretch), as screen points
function smoothLine(points: [number, number][]) {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const line: [number, number][] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 1; s <= 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      line.push([f(0), f(1)]);
    }
  }
  return line;
}

// The outline round a line: up its left side, round the head, back down its right side
function arrowShape(line: [number, number][]) {
  const lengths = [0];
  for (let i = 1; i < line.length; i++) lengths.push(lengths[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = lengths[lengths.length - 1] || 1, bodyEnd = total - Math.min(HEAD, total * 0.35);
  const unit = (a: number[], b: number[]) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; };
  const left: number[][] = [], right: number[][] = [];
  let last = 0;
  for (let i = 0; i < line.length && lengths[i] <= bodyEnd; i++) {
    const [ux, uy] = unit(line[Math.max(0, i - 1)], line[Math.min(line.length - 1, i + 1)]), w = TAIL + (BODY - TAIL) * (lengths[i] / bodyEnd);
    left.push([line[i][0] - uy * w, line[i][1] + ux * w]);
    right.push([line[i][0] + uy * w, line[i][1] - ux * w]);
    last = i;
  }
  const base = line[last], tip = line[line.length - 1], [ux, uy] = unit(base, tip);
  const wing = (side: 1 | -1) => [base[0] - uy * HEAD_WIDTH * side, base[1] + ux * HEAD_WIDTH * side];
  const round = (p: number[]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return 'M' + [...left, wing(1), tip, wing(-1), ...right.reverse()].map(round).join('L') + 'Z';
}

// A visitor who has asked for less motion gets the new view at once
function reducedMotion() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }


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

