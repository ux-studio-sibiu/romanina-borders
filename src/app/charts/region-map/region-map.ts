import { afterRenderEffect, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { geoConicConformal, geoGraticule, geoPath, type GeoContext, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Geometry, Polygon } from 'geojson';
import type { BaseGeography } from '../../data/geography';
import region from '../../data/region.json';
import type { Spot } from '../../data/spots';
import { MapSpots } from '../map-spots/map-spots';
import { Backdrop, type BackdropStyle } from './backdrop-style';

// Lesson 05–06: a territory drawn on the map, by kind:
//   province: a filled shape in its colour, named at its centre
//   outline:  a state's border, over everything
//   empire:   round the provinces: hatched, a dashed edge, its name in spaced capitals at `at` ([lon, lat])
//   lost:     a land taken away: a dotted edge over the veil, its name and `note` (who took it)
//   zone:     a land with no known border: its colour with a blurred edge and no line; `light` a lighter fade (a
//             neighbour, often small)
type Shape = { id: string; geometry: GeoPermissibleObjects };
export type Territory =
  | Shape & { kind: 'province'; colour?: string; label?: string }
  | Shape & { kind: 'outline'; colour?: string }
  | Shape & { kind: 'empire'; colour?: string; label?: string; at?: [number, number] }
  | Shape & { kind: 'lost'; label: string; note: string }
  | Shape & { kind: 'zone'; colour?: string; label?: string; light?: boolean };

// Lesson 06: an arrow across the map, for movement rather than borders (the peoples passing through): a smooth curve
// through its waypoints, in [lon, lat], first to last; the name (and when) at the waypoint labelAt, the middle by default
export type MapArrow = { id: string; name: string; when?: string; years?: [number, number]; points: [number, number][]; labelAt?: number };

// Lesson 06: a place on the map, a dot and its name, in [lon, lat] (the Greek cities on the coast, c. 60 BC)
export type MapPlace = { id: string; name: string; at: [number, number] };

// Lesson 06: a box to fit instead of the core, in [lon, lat]: a moment's own view
export type Extent = [[number, number], [number, number]];

// Lesson 06: how long the zoom from one view to the next takes, in seconds
const ZOOM_SECONDS = 0.85;
// Lesson 08: and the moment's drawings round it, so only the background moves while it zooms: the old drawings fade out
// over FADE_OUT, the camera starts ZOOM_DELAY in; once it has stopped, FADE_GAP later, the new drawings fade in over FADE_IN
const FADE_OUT = 0.2, ZOOM_DELAY = 0.1, FADE_GAP = 0.1, FADE_IN = 0.15;
// Lesson 08: between two moments with the same view, no zoom: the old drawings fade out, and STILL_GAP after that the new
// fade in
const STILL_GAP = 0.05;
// Lesson 08: the drawings' <svg>s reach past the window by this much on every side (a fraction of its size), so they
// still cover it while the camera finishes, a little out from where they are drawn
const BLEED = 0.1;
// Lesson 06: the arrows drawn on one after another, in the order given (by year), each fading again a while later, then
// started over: each starts ARROW_STEP after the last, takes ARROW_GROW to draw, stays ARROW_LINGER, fades over
// ARROW_FADE; ARROW_PAUSE of empty map before the first comes back
const ARROW_STEP = 2.4, ARROW_GROW = 2, ARROW_LINGER = 3.4, ARROW_FADE = 1.4, ARROW_PAUSE = 1.2;
// Lesson 07: the arrows by a year instead (the time scale's): each draws on over its years (at least DRAW_YEARS, so a
// short one is still seen), stays LINGER_YEARS after them, then fades over FADE_YEARS to PAST, a trace of where it went
const DRAW_YEARS = 60, LINGER_YEARS = 80, FADE_YEARS = 60, PAST = 0.2;

// From data/region.json, shared with the build scripts. The core: from the Tisza plain to the Dniester's mouth, the
// Balkan range to Galicia; every state of the story is inside it, and the map is fitted so it is always fully in view,
// whatever the window's shape. The area: the core and about a fifth more on every side, the detailed satellite
// picture's extent. The map runs full bleed: whatever the window shows beyond the core is still map.
const CORE = region.core as Extent;
const REGION = region.area as Extent;
const PAD = 16; // the core's least distance from the window's edges

// An extent as a polygon: two parallels and two meridians. In a conic projection it isn't a rectangle: the meridians are
// straight and lean together towards the north, the parallels are arcs. precision(0.25): a vertex every quarter degree
// along the parallels. d3 joins vertices with great-circle arcs, not parallels, so at the default 2.5° the top and
// bottom edges would show kinks.
const outline = (extent: Extent) => geoGraticule().extent(extent).precision(0.25).outline();
const core = outline(CORE);
// Exported: the satellite picture, the trace tool's alignments and its smoothing all work in the area's box
export const frame = outline(REGION);

// Whether a view reaches past the detailed area (it needs the wide satellite picture, and shows no county lines)
export function needsWide(view: Extent | null | undefined) {
  return !!view && (view[0][0] < REGION[0][0] || view[0][1] < REGION[0][1] || view[1][0] > REGION[1][0] || view[1][1] > REGION[1][1]);
}
// The map's projection, before it is fitted to a size. Exported: the trace tool smooths its shapes in it (lesson 04).
export const regionProjection = () => geoConicConformal().parallels(region.projection.parallels as [number, number]).rotate(region.projection.rotate as [number, number]);

// Lesson 08: the plane. The background (the satellite pictures, the land, every line) is drawn in one fixed projection,
// the area 1000 units wide, once, for every moment. A view is only a camera over it: a scale k and an offset x, y (a
// point at P on the plane is at k·P + (x, y) on screen). Every view's projection is this one scaled and moved, so the
// camera from one view to the next is exact, and the zoom between them is the camera eased from one to the other.
const PLANE = regionProjection().fitWidth(1000, frame);
type Camera = { k: number; x: number; y: number };

// Lesson 08: the two satellite pictures, each placed over its extent's box on the plane: the wide one (the Roman world)
// under the detailed one (the area), whose edge is feathered over `inset` degrees, so the two meet without a seam
const PICTURES = [
  { src: 'data/satellite-wide.webp', extent: region.wideSatellite as Extent, inset: 1 },
  { src: 'data/satellite.webp', extent: REGION, inset: 0.6 }
].map(p => {
  const [[x0, y0], [x1, y1]] = geoPath(PLANE).bounds(outline(p.extent));
  return { ...p, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
});
type Picture = typeof PICTURES[number];

// Lesson 08: how the background looks: over the satellite picture, on paper, or the plain stylized map (blue water,
// no rivers: the European Union). `units`: how strongly the county lines show (none on a view past the area).
type Look = 'satellite' | 'paper' | 'plain';
type Scene = { look: Look; units: number };

// D3 does the math, Angular renders the DOM: d3-geo turns [lon, lat] lines into SVG path strings in computed(),
// the template binds them. Unlike data-viz's flat map (a fixed 960 × 500 viewBox), this map fills the window,
// so the projection is refitted to the measured size whenever it changes. Lesson 08: the background under it is drawn
// on canvases, from the plane, by a camera (above).
@Component({
  selector: 'app-region-map',
  imports: [MapSpots],
  templateUrl: './region-map.html',
  styleUrl: './region-map.scss',
  // The backdrop tuner's numbers the styles read, as custom properties (the canvases read the rest themselves)
  host: {
    '[style.--satellite-filter]': 'backdrop.filter()',
    '[style.--satellite-opacity]': 'backdrop.style().opacity',
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
  readonly nameText = input<Record<string, string>>({}); // lesson 08: names written by hand, by id, their lines split at \n
  readonly places = input<MapPlace[]>([]); // lesson 06: dots with names
  readonly spots = input<Spot[]>([]); // lesson 08: curiosities to click, a picture and a few sentences each
  readonly coveredRight = input(0); // lesson 08: px along the right edge under the parent's own panel, kept clear of spot cards
  readonly view = input<Extent | null>(null); // lesson 06: a box to fit instead of the core (a moment zoomed out)

  protected readonly backdrop = inject(Backdrop);

  // The start of every id this map gives its drawings (the blur filters, the hatches, the arrows' masks): unique in the
  // document, in case a lesson page ever shows a second map
  protected readonly idPrefix = `region-map-${++maps}`;

  // The host's size in CSS pixels, from a ResizeObserver. A signal, so a resize re-runs the computeds below (zoneless:
  // a plain field set from the observer's callback would never reach the screen).
  protected readonly size = signal({ width: 0, height: 0 });

  constructor() {
    const observer = new ResizeObserver(([entry]) => this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(inject(ElementRef<HTMLElement>).nativeElement);
    inject(DestroyRef).onDestroy(() => { observer.disconnect(); cancelAnimationFrame(this.frameId); this.endMotion(); });

    // Lesson 08: the detailed picture first; the wide one after it, unless the browser asks to save data (then only once
    // a view needs it: widePicture())
    this.picture(1).then(() => { if (!saveData()) this.widePicture(); });
    effect(() => { if (this.satellite() && needsWide(this.view())) untracked(() => this.widePicture()); });

    // Lesson 08: the background repainted whenever what it is drawn from changes (during a zoom every frame is painted)
    effect(() => { this.layers(); this.pictures(); this.backdrop.style(); this.size(); this.request(); });

    // Lesson 06: the arrows drawn on in turn, looping (after the render, once their masks and names are in the page). Not
    // for a visitor who asked for less motion: they see them all at once.
    afterRenderEffect(() => {
      const n = this.arrowPaths().length, svg = this.mapSvg()?.nativeElement;
      this.arrowAnimations.forEach(a => a.cancel());
      this.arrowAnimations = [];
      if (!n || !svg || reducedMotion() || this.arrowsAt()) return;
      const cycle = (n - 1) * ARROW_STEP + ARROW_GROW + ARROW_LINGER + ARROW_FADE + ARROW_PAUSE, at = (s: number) => Math.min(1, s / cycle);
      const timing = { duration: cycle * 1000, iterations: Infinity };
      const [reveals, arrows, labels, years] = ['.arrow-reveal', 'path.arrow', '.arrow-label', '.arrow-year'].map(s => [...svg.querySelectorAll<SVGElement>(s)]);
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
    // Lesson 08: and when the drawings were held for another moment with the same view, fade from them to the new
    afterRenderEffect(() => {
      const camera = this.camera(), scene = this.scene(), { width, height } = this.size(), key = JSON.stringify(this.view());
      this.heldVersion();
      untracked(() => this.move(camera, scene, key, width, height));
    });
  }

  // --- The camera ------------------------------------------------------------------------------------------------------

  // Lesson 08: the view's camera over the plane: its projection is the plane's scaled by k and moved by x, y
  private readonly camera = computed<Camera>(() => {
    const p = this.projection(), k = p.scale() / PLANE.scale(), [tx, ty] = p.translate(), [px, py] = PLANE.translate();
    return { k, x: tx - k * px, y: ty - k * py };
  });
  private readonly scene = computed<Scene>(() => ({ look: this.plain() ? 'plain' : this.satellite() ? 'satellite' : 'paper', units: needsWide(this.view()) ? 0 : 1 }));

  // Lesson 06–08: zooming between two views. The background is repainted every frame by the camera eased from the old
  // view to the new. The moment's drawings (the two <svg>s over it) stay out of the way: the old ones fade out as the
  // camera starts, the new ones, drawn once for the new view, fade in as it lands, so in between only the background
  // moves, sharp at every step. While either shows, its <svg> is moved each frame to where that camera puts it: a
  // transform on a layer the browser paints once (will-change), so nothing in it is repainted, and it never slips off the
  // land. They are near their own view by then, so each <svg>'s bleed past the window covers it. Started in the same
  // tick the new view renders, before the browser paints, so the first frame is still the old view; a zoom started
  // during another starts from where that one has got to. Not on a resize (the size changed too), not the first time,
  // not for a visitor who asked for less motion.
  private readonly pictureCanvas = viewChild<ElementRef<HTMLCanvasElement>>('picture');
  private readonly baseCanvas = viewChild<ElementRef<HTMLCanvasElement>>('base');
  private readonly linesCanvas = viewChild<ElementRef<HTMLCanvasElement>>('lines');
  private readonly fillsSvg = viewChild<ElementRef<SVGSVGElement>>('fillsSvg');
  private readonly mapSvg = viewChild<ElementRef<SVGSVGElement>>('mapSvg');
  private readonly heldFillsSvg = viewChild<ElementRef<SVGSVGElement>>('heldFills');
  private readonly heldMapSvg = viewChild<ElementRef<SVGSVGElement>>('heldMap');
  private readonly spotsLayer = viewChild(MapSpots, { read: ElementRef<HTMLElement> });
  private svgs() { return [this.fillsSvg(), this.mapSvg()].flatMap(r => r ? [r.nativeElement] : []); }
  private heldSvgs() { return [this.heldFillsSvg(), this.heldMapSvg()].flatMap(r => r ? [r.nativeElement] : []); }

  private last: { key: string; width: number; height: number; camera: Camera; scene: Scene } | null = null; // the view drawn
  // A move's timeline, in seconds: the camera from `delay` for `zoom` (0: it doesn't move), the new drawings in from
  // `fadeIn`, all of it over by `total`
  private motion: { from: Camera; to: Camera; was: Scene; start: number; delay: number; zoom: number; total: number; held: Camera | null; fades: Animation[] } | null = null;
  private shown: Camera | null = null; // the camera on screen now
  private held: { at: Camera; layers: HeldLayer[] } | null = null;
  private readonly heldVersion = signal(0); // counts the holds, so a hold with no change of view still moves (fades)
  private frameId = 0;
  private arrowAnimations: Animation[] = [];

  // Lesson 06: called by the parent just before it changes the moment: a copy of what is drawn now, to fade out as the zoom
  // starts, or, with the same view, before the new drawings fade in (the background cross-fades itself, on the
  // canvases). With its own patterns, filters and masks, renamed, as the next moment may not have them; from wherever
  // its fade has got to, if a move is still under way.
  holdDrawings() {
    this.held = null;
    if (!this.last || reducedMotion()) return;
    this.held = { at: this.last.camera, layers: this.svgs().map(heldLayer) };
    this.heldVersion.update(v => v + 1);
  }

  private move(camera: Camera, scene: Scene, key: string, width: number, height: number) {
    const was = this.last, held = this.held, svgs = this.svgs();
    this.last = { key, width, height, camera, scene };
    this.held = null;
    const from = this.shown;
    this.endMotion();
    const zooms = !!was && (was.key !== key || was.scene.look !== scene.look);
    if (!was || !from || was.width !== width || was.height !== height || (!zooms && !held) || reducedMotion() || !svgs.length) {
      this.shown = camera;
      return this.request();
    }
    // The timeline: a zoom, or, with the same view, only the fades, one after the other
    const delay = zooms ? ZOOM_DELAY : 0, zoom = zooms ? ZOOM_SECONDS : 0;
    const fadeIn = zooms ? delay + zoom + FADE_GAP : FADE_OUT + STILL_GAP, total = fadeIn + FADE_IN;
    const timing = { duration: total * 1000, easing: 'linear' };
    // The new drawings hidden until just after the camera has stopped. The fade has no end keyframe and no fill: it eases
    // to the drawing's own opacity and then is simply gone, so nothing changes on screen when it ends. After a zoom the
    // whole layer fades in; with the same view only what is new in it, piece by piece: a drawing the last moment had too
    // (the same markup: a province both share) just stays, so what was added or taken away is what moves.
    // The spots with them (plain HTML, not moved: hidden until then, the old ones gone at once)
    const hidden = [{ opacity: 0 }, { opacity: 0, offset: fadeIn / total }];
    const spots = this.spotsLayer()?.nativeElement;
    const fades = spots ? [spots.animate(hidden, timing)] : [];
    svgs.forEach((svg, i) => {
      if (zooms || !held) { fades.push(svg.animate(hidden, timing)); return; }
      const had = new Set(held.layers[i].pieces);
      for (const drawing of [...svg.children].filter(e => e.tagName !== 'defs' && !had.has(e.outerHTML))) fades.push(drawing.animate(hidden, timing));
    });
    // The old drawings, in layers of their own, faded out as the camera starts (with the same view, only those the new
    // moment doesn't have)
    if (held) this.heldSvgs().forEach((svg, i) => {
      const layer = held.layers[i], has = zooms ? null : new Set(pieces(svgs[i]));
      svg.setAttribute('class', `${layer.classes} held`);
      svg.innerHTML = renamed(layer.defs + layer.pieces.filter(p => !has?.has(p)).join(''), layer.ids);
      fades.push(svg.animate([{ opacity: layer.opacity }, { opacity: 0, offset: FADE_OUT / total }, { opacity: 0 }], { ...timing, fill: 'forwards' }));
    });
    this.motion = { from, to: camera, was: was.scene, start: performance.now(), delay, zoom, total, held: held?.at ?? null, fades };
    this.step(performance.now()); // the first frame now, before the browser paints
  }

  private endMotion() {
    if (!this.motion) return;
    this.motion.fades.forEach(a => a.cancel());
    this.motion = null;
    for (const svg of this.svgs()) svg.style.transform = '';
    for (const svg of this.heldSvgs()) { svg.replaceChildren(); svg.style.transform = ''; }
  }

  // One frame: the camera now (eased: the scale geometrically, so each moment is the same proportion closer, and the
  // offset with it, so the one point that stays still stays still), the drawings moved to it, the background painted by it
  private step(now: number) {
    const last = this.last;
    if (!last) return;
    let camera = last.camera, was = last.scene, p = 1;
    const m = this.motion;
    if (m) {
      const s = (now - m.start) / 1000;
      if (s < m.total) {
        p = m.zoom ? ease(Math.max(0, Math.min(1, (s - m.delay) / m.zoom))) : 1;
        camera = between(m.from, m.to, p);
        was = m.was;
        for (const svg of this.svgs()) svg.style.transform = relative(camera, last.camera);
        if (m.held) for (const svg of this.heldSvgs()) svg.style.transform = relative(camera, m.held);
        this.request();
      } else this.endMotion();
    }
    this.shown = camera;
    this.paint(camera, was, last.scene, p);
  }

  private request() {
    if (!this.frameId) this.frameId = requestAnimationFrame(now => { this.frameId = 0; this.step(now); });
  }

  // --- The background ----------------------------------------------------------------------------------------------

  // Lesson 08: the background's layers as canvas paths on the plane, made once when the geography arrives
  private readonly layers = computed(() => {
    const g = this.geography();
    if (!g || typeof Path2D === 'undefined') return null;
    const trace = (o: GeoPermissibleObjects) => { const path = new Path2D(); geoPath(PLANE, path as unknown as GeoContext)(o); return path; };
    const rivers = (danube: boolean) => trace({ type: 'FeatureCollection', features: g.rivers.filter(r => (String(r.id) === 'danube') === danube) });
    return { sea: trace(g.sea), land: trace(g.land), units: trace(g.unitBorders), countries: trace(g.countryBorders), coast: trace(g.coastline), rivers: rivers(false), danube: rivers(true) };
  });

  // Lesson 08: the satellite pictures, feathered, once each has loaded (by address)
  private readonly pictures = signal<Record<string, HTMLCanvasElement>>({});
  private picture(i: number) {
    const p = PICTURES[i];
    return feathered(p).then(canvas => { if (canvas && !this.pictures()[p.src]) this.pictures.update(all => ({ ...all, [p.src]: canvas })); });
  }
  // The wide picture, loaded now if it isn't yet: the parent waits for it before zooming out to a view that needs it
  widePicture() { return this.picture(0); }

  private scratch?: HTMLCanvasElement;
  private tokens?: ReturnType<typeof readTokens>;

  // Three canvases: the pictures (under the CSS filter the tuner sets), the land and the sea, and, over the moment's
  // fills, the lines. Between two looks (a zoom to the plain map) each canvas cross-fades from the old to the new.
  private paint(camera: Camera, was: Scene, now: Scene, p: number) {
    const picture = this.pictureCanvas()?.nativeElement, base = this.baseCanvas()?.nativeElement, lines = this.linesCanvas()?.nativeElement;
    if (!picture || !base || !lines) return;
    const { width, height } = this.size(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    const at: Transform = [dpr * camera.k, 0, 0, dpr * camera.k, dpr * camera.x, dpr * camera.y];
    const scenes: [Scene, number][] = was.look === now.look ? [[now, 1]] : [[was, 1 - p], [now, p]];
    const units = was.units + (now.units - was.units) * p, style = this.backdrop.style(), tokens = this.tokens ??= readTokens(base);

    const pc = clear(picture, w, h), satellite = scenes.reduce((sum, [s, weight]) => sum + (s.look === 'satellite' ? weight : 0), 0);
    if (satellite > 0) {
      pc.globalAlpha = satellite;
      pc.imageSmoothingQuality = 'high';
      pc.setTransform(...at);
      for (const pic of PICTURES) { const c = this.pictures()[pic.src]; if (c) pc.drawImage(c, pic.box.x, pic.box.y, pic.box.width, pic.box.height); }
      pc.globalAlpha = 1;
    }

    const bc = clear(base, w, h), lc = clear(lines, w, h), layers = this.layers();
    if (!layers) return;
    for (const [scene, weight] of scenes) {
      this.blend(bc, weight, ctx => drawBase(ctx, scene.look, layers, at, tokens, style, w, h));
      this.blend(lc, weight, ctx => drawLines(ctx, scene.look, layers, at, camera.k, tokens, style, units));
    }
  }

  // Drawn straight on, or, partly shown, on a scratch canvas first and laid on at that strength (so its own overlaps
  // don't show through each other)
  private blend(target: CanvasRenderingContext2D, weight: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    if (weight >= 1) return draw(target);
    if (weight <= 0) return;
    const scratch = this.scratch ??= document.createElement('canvas');
    draw(clear(scratch, target.canvas.width, target.canvas.height));
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalAlpha = weight;
    target.drawImage(scratch, 0, 0);
    target.globalAlpha = 1;
  }

  // --- The moment's drawings ---------------------------------------------------------------------------------------

  // The window's own coordinates, with the bleed round them (the <svg>s are that much bigger than the window)
  protected readonly viewBox = computed(() => {
    const { width: w, height: h } = this.size();
    return `${-BLEED * w} ${-BLEED * h} ${(1 + 2 * BLEED) * w} ${(1 + 2 * BLEED) * h}`;
  });

  // Lambert conformal conic: true scale along 44° and 48° N (they bracket Romania, 43.6°–48.3° N), centred on 25° E so
  // that meridian stands upright. Conformal: angles and small shapes are kept, so the Carpathian arc bends as it should.
  // Between 42° and 50° N areas are off by under 0.4% (lesson 00), so territories can still be compared by size.
  // Public: the trace tool (lesson 04) draws over the map in the same projection
  readonly projection = computed(() => {
    const { width, height } = this.size();
    const view = this.view();
    return regionProjection().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], view ? outline(view) : core);
  });
  private readonly path = computed(() => geoPath(this.projection()));

  // Lesson 02: where the satellite picture goes, and lesson 04's unit for placing a reference map (public).
  // scripts/build-satellite.mjs drew it in this same projection, fitted to the area's bounding box; here the projection is
  // only scaled and moved to fit the window, so placing the picture over the area's bounding box lines it up exactly.
  readonly frameBox = computed(() => {
    const [[x0, y0], [x1, y1]] = this.path().bounds(frame);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });

  // Fills over the land and under every line; outlines over everything, so a state's border reads above rivers and coasts
  // Lesson 06: soft zones, under the provinces' fills; blurred by an SVG filter (the template), so the edge fades out
  // `light`: a lighter fade (a neighbour, often small: the strong one would leave little of it)
  protected readonly zones = computed(() => this.ofKind('zone').map(t => ({ id: t.id, colour: t.colour, light: !!t.light, d: this.draw(t.geometry) })));
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
    return { id: t.id, colour: t.colour ?? '#6b6862', ink: darken(t.colour ?? '#6b6862', 0.35), light: lighten(t.colour ?? '#6b6862', 0.55), d: this.draw(t.geometry), pattern: `${this.idPrefix}-hatch-${t.id}`, lines: this.lines(t.id, t.label ?? ''), x, y };
  }));

  // Names for the filled territories that have one: on the largest part (a small island or a sliver never gets the label),
  // at its centroid; sized by that part's area, 12–24px. A long name goes on two lines. The colour is the territory's,
  // darkened by a third so a pale yellow still reads; a white halo (paint-order) keeps it off the picture behind.
  // Lesson 06: the lands a moment takes away, each a dotted edge and, at its centre, its name and who took it
  protected readonly lost = computed(() => this.ofKind('lost').map(t => {
    const path = this.path(), at = this.nameAt()[t.id], [x, y] = (at && this.projection()(at)) ?? path.centroid(largestPart(t.geometry, path));
    return { id: t.id, d: this.draw(t.geometry), lines: this.lines(t.id, t.label, false), note: t.note, x, y };
  }));

  protected readonly labels = computed(() => [...this.ofKind('province'), ...this.ofKind('zone')].filter(t => t.label).map(t => {
    const path = this.path(), main = largestPart(t.geometry, path), at = this.nameAt()[t.id];
    const [x, y] = (at && this.projection()(at)) ?? path.centroid(main);
    const size = Math.max(12, Math.min(24, Math.sqrt(path.area(main)) / 8));
    return { id: t.id, x, y, size, lines: this.lines(t.id, t.label!), colour: t.colour ? darken(t.colour, 0.35) : undefined };
  }));

  // Lesson 08: an empire's name as big as the biggest land's name beside it (Roman Dacia's, in 101), so the two read as
  // equals; 15px when it has none
  protected readonly empireSize = computed(() => Math.max(15, ...this.labels().map(l => l.size)));

  // Lesson 08: every name on the map, where it is drawn and as written: the name editor's handles (public)
  readonly names = computed(() => [...this.labels(), ...this.empires(), ...this.lost()].map(n => ({ id: n.id, text: n.lines.join('\n'), x: n.x, y: n.y })));

  // A name's lines: as written by hand (split at its line breaks), or its land's name, long ones in two (`split`)
  private lines(id: string, name: string, split = true) {
    const text = this.nameText()[id];
    return text !== undefined ? text.split('\n') : split ? twoLines(name) : [name];
  }

  // The veil outside the focus: a box with the focus cut out (even-odd: the focus's rings make holes in it), so the
  // neighbours, their borders and the empires' hatching recede behind the story's land. The box is the <svg>'s, bleed
  // and all, and a little more, so a soft edge's blur doesn't show at it.
  protected readonly outside = computed(() => {
    const focus = this.focus();
    if (!focus) return '';
    const { width: w, height: h } = this.size(), m = 2 * BLEED;
    return `M${-m * w} ${-m * h}H${(m + 1) * w}V${(m + 1) * h}H${-m * w}Z${this.draw(focus)}`;
  });

  // Lesson 08: the spots, projected
  protected readonly spotPoints = computed(() => this.spots().map(s => {
    const [x, y] = this.projection()(s.at) ?? [0, 0];
    return { ...s, x, y };
  }));

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

// --- Painting the background (lesson 08) -------------------------------------------------------------------------------

type Transform = [number, number, number, number, number, number];
type Layers = { sea: Path2D; land: Path2D; units: Path2D; countries: Path2D; coast: Path2D; rivers: Path2D; danube: Path2D };

// The colours the styles share, read once from the page's custom properties
function readTokens(el: Element) {
  const css = getComputedStyle(el), v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { ink: v('--ink', '#141414'), river: v('--river', '#1b3a73'), muted: v('--muted', '#6b6862'), tint: v('--tint', '#f2f1ed'), surface: v('--surface', '#ffffff'), water: v('--water', '#d6e8f6') };
}
type Tokens = ReturnType<typeof readTokens>;

// A canvas at the window's size in device pixels, cleared
function clear(canvas: HTMLCanvasElement, w: number, h: number) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

// Lesson 01–02, 06: the land and the sea. Over the satellite picture only a light white veil on the land, so the history
// colours stay readable; on paper the land white and the sea a faint tint; on the plain map all the water blue (behind
// the land too: the Black Sea is the only sea the data has as a shape) and the land paper
function drawBase(ctx: CanvasRenderingContext2D, look: Look, layers: Layers, at: Transform, tokens: Tokens, style: BackdropStyle, w: number, h: number) {
  if (look === 'plain') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = tokens.water; ctx.fillRect(0, 0, w, h); }
  ctx.setTransform(...at);
  if (look === 'paper') { ctx.fillStyle = tokens.tint; ctx.fill(layers.sea); }
  ctx.fillStyle = look === 'plain' ? '#fbf8f1' : look === 'paper' ? tokens.surface : white(style.veil);
  ctx.fill(layers.land);
}

// Lesson 01–02, 06: the lines, from thinnest to heaviest, so a river or a country border is never hidden under a county
// line; their widths in screen pixels, the same at every zoom. Weight says what a line is: county hairlines, rivers bold
// and dark blue (the one colour water gets), the Danube heavier still, country borders the atlas dash-dot, so where one
// runs along a river (the Prut, the Danube) the two still read apart. Over the satellite picture the lines get pale
// halos (ink and dark blue alone would sink into the forest green); on the plain map no rivers, the borders thin grey.
function drawLines(ctx: CanvasRenderingContext2D, look: Look, layers: Layers, at: Transform, k: number, tokens: Tokens, style: BackdropStyle, units: number) {
  ctx.setTransform(...at);
  ctx.lineJoin = 'round';
  const line = (path: Path2D, colour: string, width: number, dash?: number[]) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width / k;
    ctx.lineCap = dash ? 'butt' : 'round';
    ctx.setLineDash(dash ? dash.map(d => d / k) : []);
    ctx.stroke(path);
  };
  const satellite = look === 'satellite', plain = look === 'plain';
  if (units > 0) {
    ctx.globalAlpha = units;
    line(layers.units, satellite ? white(style.counties) : tokens.muted, satellite ? 0.5 : 0.4);
    ctx.globalAlpha = 1;
  }
  if (!plain) {
    if (satellite) { line(layers.rivers, white(style.halo), 4); line(layers.danube, white(style.halo), 5.6); }
    line(layers.rivers, tokens.river, 2);
    line(layers.danube, tokens.river, 3.2);
  }
  line(layers.countries, plain ? '#7d8590' : tokens.ink, plain ? 0.8 : satellite ? 1.6 : 1.2, plain ? undefined : [7, 2.5, 1.5, 2.5]);
  line(layers.coast, plain ? '#5b7a99' : satellite ? white(style.coast) : tokens.ink, plain ? 0.8 : 1);
}

function white(alpha: number) { return `rgb(255 255 255 / ${alpha})`; }

// Lesson 08: a satellite picture with its edge feathered: kept only inside its extent shrunk by `inset` degrees,
// blurred over as many again, so it fades out by its own edge. The blur is a shadow's (canvas filters aren't in every
// browser): the shrunk extent is filled far off the canvas, and only its blurred shadow, moved back, lands on it. Once
// per address, for every map.
const featheredPictures = new Map<string, Promise<HTMLCanvasElement | null>>();
function feathered(p: Picture) {
  if (!featheredPictures.has(p.src)) featheredPictures.set(p.src, (async () => {
    const image = new Image();
    image.src = p.src;
    await image.decode();
    const w = image.naturalWidth, h = image.naturalHeight, sx = w / p.box.width, sy = h / p.box.height;
    const perDegree = Math.abs(PLANE([25, 45])![1] - PLANE([25, 46])![1]) * sy, blur = p.inset * perDegree, off = w + 4 * blur;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const [[x0, y0], [x1, y1]] = p.extent, i = p.inset;
    ctx.setTransform(sx, 0, 0, sy, off - p.box.x * sx, -p.box.y * sy);
    ctx.shadowColor = '#000';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = -off;
    ctx.beginPath();
    geoPath(PLANE, ctx)(outline([[x0 + i, y0 + i], [x1 - i, y1 - i]]));
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(image, 0, 0);
    return canvas;
  })().catch(() => null));
  return featheredPictures.get(p.src)!;
}

// A drawing layer's transform: what was drawn for camera `at`, moved to where `camera` puts it
function relative(camera: Camera, at: Camera) {
  const r = camera.k / at.k;
  return `matrix(${r}, 0, 0, ${r}, ${camera.x - r * at.x}, ${camera.y - r * at.y})`;
}

// A drawing layer's content, as markup: its <defs> and each drawing apart (its markup is also how it is told from the
// next moment's: the same markup, the same drawing), and the ids in it, to rename in the copy (renamed()). The arrows,
// their names and captions are drawn on by Web Animations, which markup doesn't keep: their state now (how much of each
// is drawn, how strongly it shows) is written on them for the copy, then taken off again, so the copy doesn't flash
// every arrow at once.
type HeldLayer = { classes: string; opacity: number; defs: string; pieces: string[]; ids: string[] };
function heldLayer(svg: SVGSVGElement): HeldLayer {
  const animated = [...svg.querySelectorAll<SVGElement>('.arrow-reveal, path.arrow, .arrow-label, .arrow-year')];
  const styles = animated.map(e => e.getAttribute('style'));
  for (const e of animated) {
    const css = getComputedStyle(e);
    e.style.opacity = css.opacity;
    if (e.classList.contains('arrow-reveal')) e.style.strokeDashoffset = css.strokeDashoffset;
  }
  const children = [...svg.children];
  const layer = {
    classes: svg.getAttribute('class') ?? '', opacity: Number(getComputedStyle(svg).opacity),
    defs: children.filter(e => e.tagName === 'defs').map(e => e.outerHTML).join(''),
    pieces: pieces(svg), ids: [...svg.querySelectorAll('[id]')].map(e => e.id)
  };
  animated.forEach((e, i) => styles[i] === null ? e.removeAttribute('style') : e.setAttribute('style', styles[i]!));
  return layer;
}
// A layer's drawings, each as its markup (not its <defs>)
function pieces(svg: SVGSVGElement) { return [...svg.children].filter(e => e.tagName !== 'defs').map(e => e.outerHTML); }

// Markup with every id (and every url(#id) or #id pointing at one) renamed, so the copy keeps its own patterns, filters
// and masks beside the new drawings'
function renamed(html: string, ids: string[]) {
  for (const id of ids) html = html.replace(new RegExp(`(id="|#)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["')&])`, 'g'), `$1${id}-held`);
  return html;
}

// The zoom's easing, and the camera that far from one view to the next. In and out, sine: gentler than a cubic, whose
// long slow end (its last fifth of the time for 3% of the way) made the zoom seem to drag as it landed
function ease(t: number) { return (1 - Math.cos(Math.PI * t)) / 2; }
function between(a: Camera, b: Camera, e: number): Camera {
  const k = a.k ** (1 - e) * b.k ** e, f = Math.abs(b.k - a.k) < 1e-9 * b.k ? e : (k - a.k) / (b.k - a.k);
  return { k, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

// A browser asking to save data (it gets the wide picture only once a view needs it)
function saveData() { return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData; }

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

