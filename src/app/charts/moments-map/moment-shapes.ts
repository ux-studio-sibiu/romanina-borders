import type { BaseGeography } from '../../data/geography';
import type { Moment } from '../../data/moments';
import { EMPIRE_COLOURS, PROVINCE_COLOURS, ZONE_COLOURS } from '../../data/palette';
import type { Block, Empire, Land, State, Zone } from '../../data/shapes';
import type { Territory } from '../region-map/region-map';
import { PLAIN_COLOURS } from '../region-map/plain-colours';

// The map shapes, as loaded (data/shapes.ts), and the map's own countries (data/geography.ts)
export type ShapeData = { states: State[]; blocks: Block[]; lands: Land[]; empires: Empire[]; zones: Zone[] };
type Countries = BaseGeography['land']['features'];

// A province's or a soft zone's colour (data/palette.ts)
const colour = (id: string) => PROVINCE_COLOURS[id] ?? ZONE_COLOURS[id];

// What the map draws for a moment: its state, its soft zone and its neighbours' (the parent also needs these, for the
// veil), its whole countries, and every territory in drawing order. The empires round it, the state's provinces,
// filled, then its outline over everything: one, or one per country when it has several (c. 1400).
export function momentShapes(moment: Moment, shapes: ShapeData, land: Countries) {
  const state = shapes.states.find(s => s.id === moment.state);
  const zone = shapes.zones.find(z => z.id === moment.zone);
  const neighbours = (moment.neighbours ?? []).map(id => shapes.zones.find(z => z.id === id)!).filter(Boolean);

  // The moment's whole countries (the EU's members, and those on their way in), from the map's own countries
  const countries: Territory[] = (moment.countries ?? []).flatMap(c => {
    const parts = land.filter(f => c.codes.includes(f.properties.country));
    if (!parts.length) return [];
    const geometry = { type: 'FeatureCollection' as const, features: parts };
    return [{ kind: 'province' as const, id: `${moment.id}-${c.codes[0]}`, geometry, colour: c.joining ? PLAIN_COLOURS.joining : PLAIN_COLOURS.members, label: c.name }];
  });

  return { state, zone, neighbours, countries, territories: territories(moment, shapes, state, zone, neighbours, countries) };
}

function territories(moment: Moment, shapes: ShapeData, state: State | undefined, zone: Zone | undefined, neighbours: Zone[], countries: Territory[]): Territory[] {
  // With whole countries (zoomed out to Europe), them and the state's outline: its provinces would be too small to read
  if (countries.length) return [...countries, ...(state ? [{ kind: 'outline' as const, id: `${state.id}-outline`, geometry: state }] : [])];
  // The empires first, under everything else: hatched with a dashed edge, or, when the moment asks, soft zones like a
  // neighbour's (faded at the edge, no border)
  const empires = (moment.empires ?? []).map(id => shapes.empires.find(e => e.id === id)!).filter(Boolean)
    .map((e: Empire) => moment.softEmpires
      ? { kind: 'zone' as const, id: e.id, geometry: e, colour: EMPIRE_COLOURS[e.id], light: true, label: e.properties.name }
      : { kind: 'empire' as const, id: e.id, geometry: e, colour: EMPIRE_COLOURS[e.id], label: e.properties.name, at: e.properties.at });
  // A soft zone: the moment's land itself (the Dacians), or, under a state, unnamed, for comparison (as strong as on its
  // own moment, so it reads as the same kingdom)
  const zones = zone ? [{ kind: 'zone' as const, id: zone.id, geometry: zone, colour: colour(zone.id), label: state ? undefined : zone.properties.name }] : [];
  const around = neighbours.map(z => ({ kind: 'zone' as const, id: z.id, geometry: z, colour: colour(z.id), light: true, label: z.properties.name }));
  if (!state) return [...empires, ...around, ...zones];
  // The lands taken: dotted, over the veil, named, with who took them
  const lost = (moment.lost ?? []).map(l => ({ ...l, shape: shapes.blocks.find(b => b.id === l.block)! })).filter(l => l.shape)
    .map(l => ({ kind: 'lost' as const, id: `lost-${l.block}`, geometry: l.shape, label: l.shape.properties.nameRo, note: l.to }));
  // The provinces to show: the state's blocks, with Transilvania's or Bucovina's halves joined where it has both
  const blocks = state.properties.provinces.map(id => shapes.blocks.find(b => b.id === id)!).filter(Boolean);
  return [
    ...empires,
    ...zones,
    ...lost,
    ...blocks.map(b => ({ kind: 'province' as const, id: b.id, geometry: b, colour: colour(b.id), label: b.properties.nameRo })),
    ...(state.properties.lands
      ? shapes.lands.filter(l => state.properties.lands!.includes(l.id)).map(l => ({ kind: 'outline' as const, id: `${l.id}-outline`, geometry: l }))
      : [{ kind: 'outline' as const, id: `${state.id}-outline`, geometry: state }])
  ];
}
