import { Component, computed, effect, inject, input, isDevMode, signal, viewChild } from '@angular/core';
import { type MapArrow, type MapPlace, needsWide, RegionMap, type Territory } from '../region-map/region-map';
import { MomentIcon } from '../moment-icon/moment-icon';
import { TimeScale } from '../time-scale/time-scale';
import { Geography } from '../../data/geography';
import { type Moment, MOMENTS, type ShapeStatus, yearsAgo } from '../../data/moments';
import { EMPIRE_COLOURS, EU_COLOUR, missingIds, PROVINCE_COLOURS, ZONE_COLOURS } from '../../data/palette';
import { NAME_PLACES, NAME_TEXTS } from '../../data/name-places';
import { NameEditor, type NamePlaces, type NameTexts } from '../../tools/name-editor/name-editor';
import { Shapes } from '../../data/shapes';
import { SPOTS } from '../../data/spots';

// The scroll wheel's step: how far to scroll (px), the pause that ends a gesture, the least time between steps (ms)
const WHEEL_THRESHOLD = 40, WHEEL_GAP = 200, WHEEL_STEP = 700;

// What each status means, for the timeline's key
const STATUS_TEXT: Record<ShapeStatus, string> = {
  built: 'Built from counties',
  adjust: 'Built: an edge to adjust',
  trace: 'To trace by hand',
  arrows: 'No border: arrows in the player'
};

// Lesson 05: the map at a moment of the story, full bleed, with the moments' buttons and the moment's caption floating
// over its bottom left (lesson 07: on the map page, a time scale down its right instead of the buttons). Fills its parent
// (which must be positioned and sized). Used by the map page and lesson 05. `details`: the shapes' working notes
// (each moment's status, the key, the notes on what to trace or adjust), for lesson 05; without them (the map page) the
// caption tells the moment's story instead, for children (lesson 03).
@Component({
  selector: 'app-moments-map',
  imports: [RegionMap, MomentIcon, TimeScale, NameEditor],
  templateUrl: './moments-map.html',
  styleUrl: './moments-map.scss'
})
export class MomentsMap {
  readonly details = input(true);
  readonly scrollNav = input(false); // the scroll wheel steps through the moments (the map page, which doesn't scroll itself)
  readonly scale = input(false); // lesson 07: the moments on a time scale too, in a panel of its own (an experiment, the map page)
  readonly nameEditor = input(false); // lesson 08: a dev tool over the map, to move and write the names (the map page, in development)

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
  protected readonly regionMap = viewChild(RegionMap);

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

  // Lesson 06: the moment's own view
  protected readonly view = computed(() => this.moment().view ?? null);
  protected readonly places = computed<MapPlace[]>(() => (this.moment().places ?? []).map(p => ({ id: `${this.moment().id}-${p.name}`, ...p })));
  // Lesson 08: the moment's curiosities, by id (data/spots.ts)
  protected readonly spots = computed(() => (this.moment().spots ?? []).map(id => SPOTS[id]).filter(Boolean));
  // Lesson 06: the moment's whole countries (the EU's members), from the map's own countries: filled and named
  protected readonly countries = computed<Territory[]>(() => {
    const land = this.geography.base()?.land.features ?? [];
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
    // In development, every id the moments and the colours use must be in shapes.topo.json (data/palette.ts): a typo would
    // quietly show nothing. Checked once the file has loaded.
    if (isDevMode()) effect(() => {
      if (!this.shapes.states().length) return;
      const missing = missingIds(MOMENTS, { states: this.shapes.states(), blocks: this.shapes.blocks(), empires: this.shapes.empires(), zones: this.shapes.zones() });
      if (missing.length) console.warn(`moments-map: ids not in shapes.topo.json or without a colour:\n  ${missing.join('\n  ')}`);
    });
  }

  // Lesson 06: a moment with another view zooms; the map keeps a copy of the old drawings first, to fade them out. With
  // the same view (lesson 08), only when stepped to with the scroll wheel (`fade`): what changed fades out, then in;
  // a click shows the new moment at once. A zoom out past the area over the satellite picture waits until the wide
  // picture is ready: started earlier, its edges would show blank, then the picture pop in, mid-zoom.
  private chosen = 0;
  protected async choose(moment: Moment, fade = false) {
    const ticket = ++this.chosen;
    if (needsWide(moment.view) && !moment.plain) {
      await this.regionMap()?.widePicture();
      if (ticket !== this.chosen) return; // another moment was chosen meanwhile
    }
    const zooms = JSON.stringify(moment.view ?? null) !== JSON.stringify(this.view());
    if (moment.id !== this.momentId() && (zooms || fade)) this.regionMap()?.holdDrawings();
    this.momentId.set(moment.id);
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
    if (i >= 0 && i < MOMENTS.length) this.choose(MOMENTS[i], true);
  }

  // Lesson 07: whether the time scale is open (or folded to the years), kept across reloads
  protected readonly scaleOpen = signal(readScaleOpen());
  // Lesson 08: how much of the map's right edge the time scale covers (its widths and breakpoint: moments-map.scss), kept
  // clear of the spots' cards
  private readonly scaleShown = mediaSignal('(width >= 760px)');
  protected readonly coveredRight = computed(() => this.scale() && this.scaleShown() ? (this.scaleOpen() ? 300 : 150) : 0);
  protected setScaleOpen(open: boolean) {
    this.scaleOpen.set(open);
    try { localStorage.setItem(SCALE_OPEN_KEY, String(open)); } catch { /* not kept: fine */ }
  }

  // The names placed and written by hand (data/name-places.ts), and over them the name editor's (a dev tool), kept in
  // localStorage until they are copied into the data. Only the edits that differ from the data are kept, so once copied
  // in they go, and a later change to the data shows rather than staying hidden under an old edit.
  private readonly editedPlaces = signal<NamePlaces>(readEdits(NAMES_KEY, NAME_PLACES));
  private readonly editedTexts = signal<NameTexts>(readEdits(TEXTS_KEY, NAME_TEXTS));
  protected readonly namePlaces = computed(() => ({ ...NAME_PLACES, ...this.editedPlaces() }));
  protected readonly nameTexts = computed(() => ({ ...NAME_TEXTS, ...this.editedTexts() }));
  protected setPlaces(places: NamePlaces) { this.editedPlaces.set(save(NAMES_KEY, unlike(places, NAME_PLACES))); }
  protected setTexts(texts: NameTexts) { this.editedTexts.set(save(TEXTS_KEY, unlike(texts, NAME_TEXTS))); }
  protected resetNames() { this.setPlaces({}); this.setTexts({}); }

  // On intent (the pointer over, or the keyboard on, a zoomed-out moment's button): fetch the wide picture now, so the
  // zoom out finds it ready (the map fetches it anyway, soon after its own, unless the browser asks to save data)
  protected prepare(moment: Moment) {
    if (needsWide(moment.view) && !moment.plain) this.regionMap()?.widePicture();
  }

  // The empires round it, the state's provinces, filled, then its outline over everything: one, or one per country when it has several (c. 1400)
  protected readonly territories = computed<Territory[]>(() => {
    const state = this.state();
    // With whole countries (zoomed out to Europe), them and the state's outline: its provinces would be too small to read
    if (this.countries().length) return [...this.countries(), ...(state ? [{ kind: 'outline' as const, id: `${state.id}-outline`, geometry: state }] : [])];
    // The empires first, under everything else
    const empires = this.empires().map(e => ({ kind: 'empire' as const, id: e.id, geometry: e, colour: EMPIRE_COLOURS[e.id], label: e.properties.name, at: e.properties.at }));
    // A soft zone: the moment's land itself (the Dacians), or, under a state, unnamed, for comparison (as strong as on its
    // own moment, so it reads as the same kingdom)
    const zone = this.zone();
    const zones = zone ? [{ kind: 'zone' as const, id: zone.id, geometry: zone, colour: this.colour(zone.id), label: state ? undefined : zone.properties.name }] : [];
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

// The name editor's places and words, kept across reloads (a dev tool): read without those the data has caught up with
const NAMES_KEY = 'romanianBorders.namePlaces', TEXTS_KEY = 'romanianBorders.nameTexts';
function readEdits<T>(key: string, data: Record<string, T>): Record<string, T> {
  let stored: Record<string, T> = {};
  try { stored = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { /* none kept */ }
  return save(key, unlike(stored, data));
}
function save<T extends object>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not kept: fine */ }
  return value;
}
// The edits that differ from the data: a place to two decimals (about a kilometre, as the editor copies it), a text exactly
function unlike<T>(edits: Record<string, T>, data: Record<string, T>): Record<string, T> {
  const same = (a: unknown, b: unknown) => JSON.stringify(rounded(a)) === JSON.stringify(rounded(b));
  return Object.fromEntries(Object.entries(edits).filter(([id, value]) => !same(value, data[id])));
}
function rounded(value: unknown) { return Array.isArray(value) ? value.map(v => Math.round(v * 100) / 100) : value; }

// Whether a media query matches, as a signal kept up to date
function mediaSignal(query: string) {
  const media = matchMedia(query), matches = signal(media.matches);
  media.addEventListener('change', e => matches.set(e.matches));
  return matches.asReadonly();
}

// Lesson 07: the time scale open or folded, open at first
const SCALE_OPEN_KEY = 'romanianBorders.timeScaleOpen';
function readScaleOpen() {
  try { return localStorage.getItem(SCALE_OPEN_KEY) !== 'false'; } catch { return true; }
}
