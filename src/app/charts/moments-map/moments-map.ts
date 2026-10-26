import { Component, computed, effect, inject, Injector, input, isDevMode, signal, viewChild } from '@angular/core';
import { type MapArrow, type MapPlace, needsWide, RegionMap, type Territory } from '../region-map/region-map';
import { MomentIcon } from '../moment-icon/moment-icon';
import { TimeScale } from '../time-scale/time-scale';
import { Geography } from '../../data/geography';
import { type Moment, MOMENTS, type ShapeStatus, yearsAgo } from '../../data/moments';
import { EMPIRE_COLOURS, EU_COLOUR, missingIds, PROVINCE_COLOURS, ZONE_COLOURS } from '../../data/palette';
import { NAME_PLACES } from '../../data/name-places';
import { Shapes } from '../../data/shapes';

// The scroll wheel's step: how far to scroll (px), the pause that ends a gesture, the least time between steps (ms)
const WHEEL_THRESHOLD = 40, WHEEL_GAP = 200, WHEEL_STEP = 700;

// What each status means, for the timeline's key
const STATUS_TEXT: Record<ShapeStatus, string> = {
  built: 'Built from counties',
  adjust: 'Built: an edge to adjust',
  trace: 'To trace by hand',
  arrows: 'No border: arrows in the player'
};

// Lesson 05: the map at a moment of the story, full bleed, with the timeline floating over its top and the moment's
// caption over its bottom. Fills its parent (which must be positioned and sized). Used by the map page and lesson 05;
// whatever is put inside it (a title) goes at the top of the timeline's panel. `details`: the shapes' working notes
// (each moment's status, the key, the notes on what to trace or adjust), for lesson 05; without them (the map page) the
// caption tells the moment's story instead, for children (lesson 03).
@Component({
  selector: 'app-moments-map',
  imports: [RegionMap, MomentIcon, TimeScale],
  templateUrl: './moments-map.html',
  styleUrl: './moments-map.scss'
})
export class MomentsMap {
  readonly details = input(true);
  readonly scrollNav = input(false); // the scroll wheel steps through the moments (the map page, which doesn't scroll itself)
  readonly scale = input(false); // lesson 07: the moments on a time scale too, in a panel of its own (an experiment, the map page)

  protected readonly geography = inject(Geography);
  protected readonly shapes = inject(Shapes);
  // The timeline: every moment of the story, the shape it shows and how far that shape has got
  protected readonly timeline = MOMENTS;
  protected readonly yearsAgo = yearsAgo;
  protected readonly statusText = STATUS_TEXT;
  protected readonly statuses = Object.keys(STATUS_TEXT) as ShapeStatus[];
  protected readonly momentId = signal('great-union');
  // Lesson 07: the year under the time scale's triangle, while it is dragged, played or left between two moments
  protected readonly scaleYear = signal<number | null>(null);
  protected readonly moment = computed(() => MOMENTS.find(m => m.id === this.momentId())!);
  private readonly regionMap = viewChild(RegionMap);

  protected readonly state = computed(() => this.shapes.states().find(s => s.id === this.moment().state));
  // The provinces to show: the state's blocks, with Transylvania's or Bukovina's halves joined where it has both
  protected readonly blocks = computed(() => (this.state()?.properties.provinces ?? []).map(id => this.shapes.blocks().find(b => b.id === id)!).filter(Boolean));
  protected readonly colour = (id: string) => PROVINCE_COLOURS[id] ?? ZONE_COLOURS[id];
  // Lesson 06: the moment's arrows (the peoples passing through), with ids for the map's loops
  protected readonly arrows = computed<MapArrow[]>(() => (this.moment().arrows ?? []).map(a => ({ id: `${this.moment().id}-${a.name}`, ...a })));
  // The lands taken at this moment, with who took them
  protected readonly lost = computed(() => (this.moment().lost ?? []).map(l => ({ ...l, shape: this.shapes.blocks().find(b => b.id === l.block)! })).filter(l => l.shape));
  // The moment's soft zone, if it has one (the Dacians), and the zones of its neighbours
  protected readonly zone = computed(() => this.shapes.zones().find(z => z.id === this.moment().zone));
  protected readonly neighbours = computed(() => (this.moment().neighbours ?? []).map(id => this.shapes.zones().find(z => z.id === id)!).filter(Boolean));

  // Lesson 06: the moment's own view, and whether it needs the wide data (loaded the first time one does)
  protected readonly view = computed(() => this.moment().view ?? null);
  protected readonly wide = computed(() => needsWide(this.view()));
  // While the wide data is still loading, the detailed map stands in
  protected readonly map = computed(() => this.wide() ? this.geography.wide() ?? this.geography.base() : this.geography.base());
  protected readonly places = computed<MapPlace[]>(() => (this.moment().places ?? []).map(p => ({ id: `${this.moment().id}-${p.name}`, ...p })));
  // Lesson 06: the moment's whole countries (the EU's members), from the map's own countries: filled and named
  protected readonly countries = computed<Territory[]>(() => {
    const land = this.map()?.land.features ?? [];
    return (this.moment().countries ?? []).flatMap(c => {
      const parts = land.filter(f => c.codes.includes(f.properties.country));
      if (!parts.length) return [];
      const geometry = { type: 'FeatureCollection' as const, features: parts };
      return [{ kind: 'province' as const, id: `${this.moment().id}-${c.codes[0]}`, geometry, colour: EU_COLOUR, label: c.name }];
    });
  });
  protected readonly euColour = EU_COLOUR;
  protected readonly empires = computed(() => (this.moment().empires ?? []).map(id => this.shapes.empires().find(e => e.id === id)!).filter(Boolean));

  constructor() {
    // The wide data: fetched once a moment needs it (and earlier on intent: prepare(), below)
    effect(() => { if (this.wide()) this.geography.loadWide(); });

    // In development, every id the moments and the colours use must be in shapes.topo.json (data/palette.ts): a typo would
    // quietly show nothing. Checked once the file has loaded.
    if (isDevMode()) effect(() => {
      if (!this.shapes.states().length) return;
      const missing = missingIds(MOMENTS, { states: this.shapes.states(), blocks: this.shapes.blocks(), empires: this.shapes.empires(), zones: this.shapes.zones() });
      if (missing.length) console.warn(`moments-map: ids not in shapes.topo.json or without a colour:\n  ${missing.join('\n  ')}`);
    });
  }

  // Lesson 06: a moment with another view zooms; the map keeps a copy of the old drawings first, to cross-fade them (and
  // the old backdrop, when the satellite picture turns on or off). A zoom out to the wide data waits until it and its
  // picture are loaded and decoded: started earlier, the map would swap its data, or show a blank picture, mid-zoom.
  private readonly injector = inject(Injector);
  private chosen = 0;
  protected async choose(moment: Moment) {
    const ticket = ++this.chosen;
    if (needsWide(moment.view)) {
      this.geography.loadWide();
      await Promise.all([this.wideLoaded(), moment.plain ? null : decoded('data/satellite-wide.webp')]);
      if (ticket !== this.chosen) return; // another moment was chosen meanwhile
    }
    if (JSON.stringify(moment.view ?? null) !== JSON.stringify(this.view())) this.regionMap()?.holdDrawings(!!moment.plain !== !!this.moment().plain);
    this.momentId.set(moment.id);
  }
  private wideLoaded() {
    return new Promise<void>(resolve => {
      const watch = effect(() => { if (this.geography.wide()) { watch.destroy(); resolve(); } }, { injector: this.injector });
    });
  }

  // The scroll wheel: one moment per gesture, down for later, up for earlier. A trackpad sends a stream of small events
  // and keeps sending them as it coasts, so the deltas add up to a threshold, a step is taken once per gesture (a gap of
  // WHEEL_GAP ms with no events ends one), and never sooner than WHEEL_STEP ms after the last.
  private wheel = { sum: 0, last: 0, stepped: 0, used: false };
  protected scroll(event: WheelEvent) {
    if (!this.scrollNav() || event.ctrlKey) return; // ctrl + wheel is the browser's zoom
    event.preventDefault();
    const now = performance.now(), w = this.wheel;
    if (now - w.last > WHEEL_GAP) { w.sum = 0; w.used = false; }
    w.last = now;
    if (w.used || now - w.stepped < WHEEL_STEP) return;
    w.sum += event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? event.deltaY : event.deltaY * 40;
    if (Math.abs(w.sum) < WHEEL_THRESHOLD) return;
    const i = MOMENTS.findIndex(m => m.id === this.momentId()) + Math.sign(w.sum);
    w.used = true; w.stepped = now; w.sum = 0;
    if (i >= 0 && i < MOMENTS.length) this.choose(MOMENTS[i]);
  }

  // The names placed by hand (data/name-places.ts)
  protected readonly namePlaces = NAME_PLACES;

  // On intent (the pointer over, or the keyboard on, a zoomed-out moment's button): fetch the wide data now, so the zoom
  // out finds it ready. Not for a visitor whose browser asks to save data: they get it on the click.
  protected prepare(moment: Moment) {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (needsWide(moment.view) && !saveData) {
      this.geography.loadWide();
      if (!moment.plain) decoded('data/satellite-wide.webp');
    }
  }

  // The empires round it, the state's provinces, filled, then its outline over everything: one, or one per country when it has several (c. 1400)
  protected readonly territories = computed<Territory[]>(() => {
    const state = this.state();
    // With whole countries (zoomed out to Europe), them and the state's outline: its provinces would be too small to read
    if (this.countries().length) return [...this.countries(), ...(state ? [{ kind: 'outline' as const, id: `${state.id}-outline`, geometry: state }] : [])];
    // The empires first, under everything else
    const empires = this.empires().map(e => ({ kind: 'empire' as const, id: e.id, geometry: e, colour: EMPIRE_COLOURS[e.id], label: e.properties.name, at: e.properties.at }));
    // A soft zone: the moment's land itself (the Dacians), or, under a state, faint and unnamed, for comparison
    const zone = this.zone();
    const zones = zone ? [{ kind: 'zone' as const, id: zone.id, geometry: zone, colour: this.colour(zone.id), faint: !!state, label: state ? undefined : zone.properties.name }] : [];
    const neighbours = this.neighbours().map(z => ({ kind: 'zone' as const, id: z.id, geometry: z, colour: this.colour(z.id), light: true, label: z.properties.name }));
    if (!state) return [...empires, ...neighbours, ...zones];
    // The lands taken: dotted, over the veil, named, with who took them
    const lost = this.lost().map(l => ({ kind: 'lost' as const, id: `lost-${l.block}`, geometry: l.shape, label: l.shape.properties.name, note: l.to }));
    return [
      ...empires,
      ...zones,
      ...lost,
      ...this.blocks().map(b => ({ kind: 'province' as const, id: b.id, geometry: b, colour: this.colour(b.id), label: b.properties.name })),
      ...(state.properties.lands
        ? this.shapes.lands().filter(l => state.properties.lands!.includes(l.id)).map(l => ({ kind: 'outline' as const, id: `${l.id}-outline`, geometry: l }))
        : [{ kind: 'outline' as const, id: `${state.id}-outline`, geometry: state }])
    ];
  });
}

// A picture loaded and decoded, once per address: drawn the moment it is needed, not a frame or more later
const pictures = new Map<string, Promise<void>>();
function decoded(src: string) {
  if (!pictures.has(src)) {
    const picture = new Image();
    picture.src = src;
    pictures.set(src, picture.decode().catch(() => undefined));
  }
  return pictures.get(src)!;
}
