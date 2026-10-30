import { afterRenderEffect, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { geoPath, type GeoContext, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Geometry, Polygon } from 'geojson';
import type { BaseGeography } from '../../data/geography';
import type { Spot } from '../../data/spots';
import { MapSpots } from '../map-spots/map-spots';
import { BACKDROP, BACKDROP_FILTER } from './backdrop-style';
import { PLAIN_COLOURS } from './plain-colours';
import { TILES, type ZoneFill, ZONE_FILLS } from '../../data/zone-fills';
import { type Camera, core, type Extent, needsWide, outline, PAD, PICTURES, PLANE, regionProjection, type Scene } from './plane';
import { arrowsAtYear, arrowShape, type MapArrow, smoothLine } from './arrows';
import { clear, drawBase, drawLines, feathered, readTokens, type Transform } from './region-map-canvas';
import { between, ease, type HeldLayer, heldLayer, pieces, relative, renamed } from './zoom';

// The map's parts, apart from the component: its geometry (plane.ts), the arrows (arrows.ts), the background's
// painting (region-map-canvas.ts) and the zoom between views (zoom.ts). Shared from here too, for the moments map.
export { arrowDrawnYear, arrowsAtYear, arrowSpan, type MapArrow } from './arrows';
export { type Extent, needsWide } from './plane';

// A territory drawn on the map, by kind:
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

// A place on the map, a dot and its name, in [lon, lat] (the Greek cities on the coast, c. 60 BC)
export type MapPlace = { id: string; name: string; at: [number, number] };

// How long the zoom from one view to the next takes, in seconds
const ZOOM_SECONDS = 0.85;
// And the moment's drawings round it, so only the background moves while it zooms: the old drawings fade out
// over FADE_OUT, the camera starts ZOOM_DELAY in; once it has stopped, FADE_GAP later, the new drawings fade in over FADE_IN
const FADE_OUT = 0.2, ZOOM_DELAY = 0.1, FADE_GAP = 0.1, FADE_IN = 0.15;
// Between two moments with the same view, no zoom: the old drawings fade out, and STILL_GAP after that the new
// fade in
const STILL_GAP = 0.05;
// The drawings' <svg>s reach past the window by this much on every side (a fraction of its size), so they
// still cover it while the camera finishes, a little out from where they are drawn
const BLEED = 0.1;


// D3 does the math, Angular renders the DOM: d3-geo turns [lon, lat] lines into SVG path strings in computed(),
// the template binds them. Unlike data-viz's flat map (a fixed 960 × 500 viewBox), this map fills the window,
// so the projection is refitted to the measured size whenever it changes. The background under it is drawn
// on canvases, from the plane, by a camera (above).
@Component({
  selector: 'app-region-map',
  imports: [MapSpots],
  templateUrl: './region-map.html',
  styleUrl: './region-map.scss',
  // The backdrop's numbers the styles read, as custom properties (the canvases read the rest themselves)
  host: {
    '[style.--satellite-filter]': 'backdropFilter',
    '[style.--satellite-opacity]': 'backdrop.opacity',
    '[style.--outside-veil]': 'backdrop.outside',
    '[style.--plain-halo]': 'plainColours.halo'
  }
})
export class RegionMap {
  readonly label = input("Map of the lands of today's Romania");
  readonly geography = input<BaseGeography | null>(null); // Sea, land, borders and rivers; null while loading
  readonly satellite = input(true); // The Blue Marble picture under the lines
  readonly plain = input(false); // A stylized map without the picture: blue water, paper land, no rivers
  readonly territories = input<Territory[]>([]); // Shapes over the land, under the lines
  readonly focus = input<GeoPermissibleObjects | null>(null); // The land to keep bright; everything outside it is veiled
  readonly softFocus = input(false); // The focus is a soft zone: the veil's edge is blurred like the zone's, not cut sharp
  readonly arrows = input<MapArrow[]>([]); // Movement across the map
  readonly arrowYear = input<number | null>(null); // the arrows as at this year; null: all drawn in full
  readonly arrowOnly = input<number | null>(null); // one arrow, by index, on its own (the others hidden), at arrowYear
  readonly nameAt = input<Record<string, [number, number]>>({}); // Names placed by hand, by id, in [lon, lat]
  readonly nameText = input<Record<string, string>>({}); // Names written by hand, by id, their lines split at \n
  readonly places = input<MapPlace[]>([]); // Dots with names
  readonly spots = input<Spot[]>([]); // Curiosities to click, a picture and a few sentences each
  readonly coveredRight = input(0); // Px along the right edge under the parent's own panel, kept clear of spot cards
  readonly view = input<Extent | null>(null); // A box to fit instead of the core (a moment zoomed out)

  protected readonly backdrop = BACKDROP;
  protected readonly backdropFilter = BACKDROP_FILTER;
  // The plain map's colours (2007)
  protected readonly plainColours = PLAIN_COLOURS;

  // The start of every id this map gives its drawings (the blur filters, the hatches, the arrows' masks): unique in the
  // document, in case a page ever shows a second map
  protected readonly idPrefix = `region-map-${++maps}`;

  // The host's size in CSS pixels, from a ResizeObserver. A signal, so a resize re-runs the computeds below (zoneless:
  // a plain field set from the observer's callback would never reach the screen).
  protected readonly size = signal({ width: 0, height: 0 });

  constructor() {
    const observer = new ResizeObserver(([entry]) => this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(inject(ElementRef<HTMLElement>).nativeElement);
    inject(DestroyRef).onDestroy(() => { observer.disconnect(); cancelAnimationFrame(this.frameId); this.endMotion(); });

    // The detailed picture first; the wide one after it, unless the browser asks to save data (then only once
    // a view needs it: widePicture())
    this.picture(1).then(() => { if (!saveData()) this.widePicture(); });
    effect(() => { if (this.satellite() && needsWide(this.view())) untracked(() => this.widePicture()); });

    // The background repainted whenever what it is drawn from changes (during a zoom every frame is painted)
    effect(() => { this.layers(); this.pictures(); this.size(); this.request(); });

    // When the view changes, zoom from the old one to the new: once the new view is in the page (after the
    // render, still before the browser paints), so the zoom fades in the new drawings, not the old ones
    // And when the drawings were held for another moment with the same view, fade from them to the new
    afterRenderEffect(() => {
      const camera = this.camera(), scene = this.scene(), { width, height } = this.size(), key = JSON.stringify(this.view());
      this.heldVersion();
      untracked(() => this.move(camera, scene, key, width, height));
    });
  }

  // --- The camera ------------------------------------------------------------------------------------------------------

  // The view's camera over the plane: its projection is the plane's scaled by k and moved by x, y
  private readonly camera = computed<Camera>(() => {
    const p = this.projection(), k = p.scale() / PLANE.scale(), [tx, ty] = p.translate(), [px, py] = PLANE.translate();
    return { k, x: tx - k * px, y: ty - k * py };
  });
  private readonly scene = computed<Scene>(() => ({ look: this.plain() ? 'plain' : this.satellite() ? 'satellite' : 'paper', units: needsWide(this.view()) ? 0 : 1 }));

  // Zooming between two views. The background is repainted every frame by the camera eased from the old
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

  // Called by the parent just before it changes the moment: a copy of what is drawn now, to fade out as the zoom
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

  // The background's layers as canvas paths on the plane, made once when the geography arrives
  private readonly layers = computed(() => {
    const g = this.geography();
    if (!g || typeof Path2D === 'undefined') return null;
    const trace = (o: GeoPermissibleObjects) => { const path = new Path2D(); geoPath(PLANE, path as unknown as GeoContext)(o); return path; };
    const rivers = (danube: boolean) => trace({ type: 'FeatureCollection', features: g.rivers.filter(r => (String(r.id) === 'danube') === danube) });
    return { sea: trace(g.sea), land: trace(g.land), units: trace(g.unitBorders), countries: trace(g.countryBorders), coast: trace(g.coastline), rivers: rivers(false), danube: rivers(true) };
  });

  // The satellite pictures, feathered, once each has loaded (by address)
  private readonly pictures = signal<Record<string, HTMLCanvasElement>>({});
  private picture(i: number) {
    const p = PICTURES[i];
    return feathered(p).then(canvas => { if (canvas && !this.pictures()[p.src]) this.pictures.update(all => ({ ...all, [p.src]: canvas })); });
  }
  // The wide picture, loaded now if it isn't yet: the parent waits for it before zooming out to a view that needs it
  widePicture() { return this.picture(0); }

  private scratch?: HTMLCanvasElement;
  private tokens?: ReturnType<typeof readTokens>;

  // Three canvases: the pictures (under the backdrop's CSS filter), the land and the sea, and, over the moment's
  // fills, the lines. Between two looks (a zoom to the plain map) each canvas cross-fades from the old to the new.
  private paint(camera: Camera, was: Scene, now: Scene, p: number) {
    const picture = this.pictureCanvas()?.nativeElement, base = this.baseCanvas()?.nativeElement, lines = this.linesCanvas()?.nativeElement;
    if (!picture || !base || !lines) return;
    const { width, height } = this.size(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    const at: Transform = [dpr * camera.k, 0, 0, dpr * camera.k, dpr * camera.x, dpr * camera.y];
    const scenes: [Scene, number][] = was.look === now.look ? [[now, 1]] : [[was, 1 - p], [now, p]];
    const units = was.units + (now.units - was.units) * p, style = this.backdrop, tokens = this.tokens ??= readTokens(base);
    const plain = this.plainColours;

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
      this.blend(bc, weight, ctx => drawBase(ctx, scene.look, layers, at, tokens, style, plain, w, h));
      this.blend(lc, weight, ctx => drawLines(ctx, scene.look, layers, at, camera.k, tokens, style, plain, units));
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
  // Between 42° and 50° N areas are off by under 0.4%, so territories can still be compared by size.
  readonly projection = computed(() => {
    const { width, height } = this.size();
    const view = this.view();
    return regionProjection().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], view ? outline(view) : core);
  });
  private readonly path = computed(() => geoPath(this.projection()));

  // Fills over the land and under every line; outlines over everything, so a state's border reads above rivers and coasts
  // Soft zones, under the provinces' fills; blurred by an SVG filter (the template), so the edge fades out
  // `light`: a lighter fade (a neighbour, often small: the strong one would leave little of it)
  protected readonly zones = computed(() => this.ofKind('zone').map(t => ({ id: t.id, colour: t.colour, light: !!t.light, d: this.draw(t.geometry) })));
  // The zones with a pattern (data/zone-fills.ts): the tile at its own size times its scale, recoloured, and the mask it
  // shows through, the zone's own shape blurred like its colour, each with this map's own ids; the mask's box the whole
  // drawing, so the blur is never cut off
  protected readonly patterned = computed(() => this.zones().flatMap(z => {
    const fill = ZONE_FILLS[z.id];
    return fill ? [{ ...z, ...tile(fill), pattern: `${this.idPrefix}-pattern-${z.id}`, mask: `${this.idPrefix}-pattern-mask-${z.id}` }] : [];
  }));
  protected readonly maskBox = computed(() => { const [x, y, width, height] = this.viewBox().split(' ').map(Number); return { x, y, width, height }; });
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
  // The lands a moment takes away, each a dotted edge and, at its centre, its name and who took it
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

  // An empire's name as big as the biggest land's name beside it (Roman Dacia's, in 101), so the two read as
  // equals; 15px when it has none
  protected readonly empireSize = computed(() => Math.max(15, ...this.labels().map(l => l.size)));

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

  // The spots, projected
  protected readonly spotPoints = computed(() => this.spots().map(s => {
    const [x, y] = this.projection()(s.at) ?? [0, 0];
    return { ...s, x, y };
  }));

  // The places, projected
  protected readonly placePoints = computed(() => this.places().map(p => {
    const [x, y] = this.projection()(p.at) ?? [0, 0];
    return { id: p.id, name: p.name, x, y };
  }));

  // The arrows, each one filled shape like a children's atlas draws them: a smooth curve through the waypoints
  // (Catmull–Rom, on screen), thin at the start and widening towards a big head at the end, so it reads as going one way
  protected readonly arrowPaths = computed(() => this.arrows().map(a => {
    const project = this.projection();
    const points = a.points.map(p => project(p) ?? [0, 0] as [number, number]);
    const at = points[a.labelAt ?? Math.floor(points.length / 2)];
    const line = smoothLine(points);
    return { id: a.id, name: a.name, when: a.when, years: a.years, d: arrowShape(line), line: 'M' + line.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L'), x: at[0], y: at[1] - 16 };
  }));

  // The arrows as at the play slider's year (arrowsAtYear, above). Null: no year, every arrow drawn in full.
  protected readonly arrowsAt = computed(() => {
    const year = this.arrowYear(), arrows = this.arrowPaths();
    return year === null || !arrows.length ? null : arrowsAtYear(arrows, year, this.arrowOnly());
  });

  // The territories of one kind, typed as that kind
  private ofKind<K extends Territory['kind']>(kind: K) { return this.territories().filter((t): t is Extract<Territory, { kind: K }> => t.kind === kind); }

  private draw(o: GeoPermissibleObjects | undefined) { return o ? this.path()(o) ?? '' : ''; }

}



// A browser asking to save data (it gets the wide picture only once a view needs it)
function saveData() { return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData; }

let maps = 0;


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
// A zone's pattern tile on screen: its own size times the fill's scale, and its drawing in the fill's colour, as a picture
// (an <image> inside the <pattern>: as a mask it would not draw)
function tile(fill: ZoneFill) {
  const { w, h, svg } = TILES[fill.name];
  const file = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg.replaceAll('currentColor', fill.color)}</svg>`;
  return { fill, w: w * fill.scale, h: h * fill.scale, href: 'data:image/svg+xml,' + encodeURIComponent(file) };
}

function darken(hex: string, amount: number) { return mix(hex, 0, amount); }
function lighten(hex: string, amount: number) { return mix(hex, 255, amount); }
function mix(hex: string, to: number, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (to - v) * amount));
  return `rgb(${c.join(' ')})`;
}

