import { Component, computed, effect, inject, input, isDevMode, signal } from '@angular/core';
import { RegionMap, type Territory } from '../region-map/region-map';
import { Geography } from '../../data/geography';
import { MOMENTS, type ShapeStatus, yearsAgo } from '../../data/moments';
import { Shapes } from '../../data/shapes';

// A colour per province, so a state's pieces read apart (warm for the old principalities, cool for the lands that joined)
const COLOURS: Record<string, string> = {
  'wallachia': '#f2b33d', 'moldavia': '#e07a3f', 'bukovina-south': '#b5523b', 'bukovina-north': '#8e3b46', 'dobruja': '#4f9d8a',
  'cadrilater': '#8cc5b0', 'transylvania-north': '#6d8fc7', 'transylvania-south': '#9a7fc4', 'transylvania': '#7f87c6', 'bukovina': '#a24a40', 'arad': '#b7a3d9', 'banat': '#5a6fa8',
  'bessarabia': '#d4789c', 'budjak': '#e3a8bf', 'roman-dacia': '#c0574a', 'moldavia-1359': '#e07a3f'
};

// One colour per empire, the same at every moment, so a child starts to know them
const EMPIRE_COLOURS: Record<string, string> = {
  'roman-empire': '#8e2c3a', 'hungary': '#3d5a99', 'hungary-1940': '#3d5a99', 'ottoman': '#2e7d4f', 'ottoman-1600': '#2e7d4f',
  'habsburg': '#a87a00', 'russian-empire': '#55667a', 'soviet-union': '#a11d1d'
};

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
  imports: [RegionMap],
  templateUrl: './moments-map.html',
  styleUrl: './moments-map.scss'
})
export class MomentsMap {
  readonly details = input(true);

  protected readonly geography = inject(Geography);
  protected readonly shapes = inject(Shapes);
  // The timeline: every moment of the story, the shape it shows and how far that shape has got
  protected readonly timeline = MOMENTS;
  protected readonly yearsAgo = yearsAgo;
  protected readonly statusText = STATUS_TEXT;
  protected readonly statuses = Object.keys(STATUS_TEXT) as ShapeStatus[];
  protected readonly momentId = signal('great-union');
  protected readonly moment = computed(() => MOMENTS.find(m => m.id === this.momentId())!);

  protected readonly state = computed(() => this.shapes.states().find(s => s.id === this.moment().state));
  // The provinces to show: the state's blocks, with Transylvania's or Bukovina's halves joined where it has both
  protected readonly blocks = computed(() => (this.state()?.properties.provinces ?? []).map(id => this.shapes.blocks().find(b => b.id === id)!).filter(Boolean));
  protected readonly colour = (id: string) => COLOURS[id];
  protected readonly empireColour = (id: string) => EMPIRE_COLOURS[id];
  protected readonly empires = computed(() => (this.moment().empires ?? []).map(id => this.shapes.empires().find(e => e.id === id)!).filter(Boolean));

  constructor() {
    // In development, every id the timeline and the colours use must be in shapes.topo.json: a typo would quietly show
    // nothing. Checked once the file has loaded.
    if (isDevMode()) effect(() => {
      const states = this.shapes.states(), blocks = this.shapes.blocks(), empires = this.shapes.empires();
      if (!states.length) return;
      const has = (list: { id: string }[], id: string) => list.some(f => f.id === id);
      const missing = [
        ...MOMENTS.flatMap(m => [...(m.state && !has(states, m.state) ? [`state ${m.state} (${m.id})`] : []), ...(m.empires ?? []).filter(e => !has(empires, e)).map(e => `empire ${e} (${m.id})`)]),
        ...Object.keys(COLOURS).filter(id => !has(blocks, id)).map(id => `colour for block ${id}`),
        ...Object.keys(EMPIRE_COLOURS).filter(id => !has(empires, id)).map(id => `colour for empire ${id}`),
        ...states.flatMap(s => s.properties.provinces).filter(id => !COLOURS[id]).map(id => `no colour for province ${id}`)
      ];
      if (missing.length) console.warn(`moments-map: ids not in shapes.topo.json or without a colour:\n  ${[...new Set(missing)].join('\n  ')}`);
    });
  }

  // The empires round it, the state's provinces, filled, then its outline over everything: one, or one per country when it has several (c. 1400)
  protected readonly territories = computed<Territory[]>(() => {
    const state = this.state();
    // The empires first, under everything else
    const empires = this.empires().map(e => ({ id: e.id, geometry: e, colour: EMPIRE_COLOURS[e.id], empire: true, label: e.properties.name, at: e.properties.at }));
    if (!state) return empires;
    return [
      ...empires,
      ...this.blocks().map(b => ({ id: b.id, geometry: b, colour: COLOURS[b.id], label: b.properties.name })),
      ...(state.properties.lands
        ? this.shapes.lands().filter(l => state.properties.lands!.includes(l.id)).map(l => ({ id: `${l.id}-outline`, geometry: l, outline: true }))
        : [{ id: `${state.id}-outline`, geometry: state, outline: true }])
    ];
  });
}
