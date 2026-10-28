import type { Moment } from './moments';

// The map's colours, by the ids in shapes.topo.json (scripts/build-shapes.mjs), kept next to the data they colour.

// A colour per province, so a state's pieces read apart (warm for the old principalities, cool for the lands that joined)
export const PROVINCE_COLOURS: Record<string, string> = {
  'wallachia': '#f2b33d', 'moldavia': '#e07a3f', 'bukovina-south': '#b5523b', 'bukovina-north': '#8e3b46', 'dobruja': '#4f9d8a',
  'cadrilater': '#8cc5b0', 'transylvania-north': '#6d8fc7', 'transylvania-south': '#9a7fc4', 'transylvania': '#7f87c6', 'transylvania-banat': '#7f87c6', 'transylvania-south-banat': '#9a7fc4', 'bukovina': '#a24a40', 'banat': '#5a6fa8',
  'bessarabia': '#d4789c', 'budjak': '#e3a8bf', 'roman-dacia': '#c0574a', 'moldavia-1359': '#e07a3f'
};

// The soft zones: Burebista's kingdom, and its neighbours c. 60 BC (picked by hand on the map, lesson 07)
export const ZONE_COLOURS: Record<string, string> = {
  'burebista': '#fed462', 'roman-republic': '#a82438', 'celts': '#3d8619', 'thracians': '#ab78ed',
  'bastarnae': '#dfa168', 'sarmatians': '#b0703a', 'scythians': '#a0522d', 'bosporan': '#5a6fa8'
};

// One colour per empire, the same at every moment, so a child starts to know them
export const EMPIRE_COLOURS: Record<string, string> = {
  'roman-empire': '#8e2c3a', 'hungary': '#3d5a99', 'hungary-1940': '#3d5a99', 'ottoman': '#2e7d4f', 'ottoman-1600': '#2e7d4f',
  'habsburg': '#a87a00', 'russian-empire': '#55667a', 'soviet-union': '#a11d1d'
};

// The European Union: its flag's own blue (Reflex Blue, #003399) for the members (Romania too, picked out by its border)
export const EU_COLOUR = '#003399';

// For development: every id the moments and the colours use that shapes.topo.json lacks, and every province shown without
// a colour. A typo would otherwise quietly show nothing.
type Ids = { id: string }[];
export function missingIds(moments: Moment[], shapes: { states: (Ids[number] & { properties: { provinces: string[] } })[]; blocks: Ids; empires: Ids; zones: Ids }) {
  const has = (list: Ids, id: string) => list.some(f => f.id === id);
  const { states, blocks, empires, zones } = shapes;
  return [...new Set([
    ...moments.flatMap(m => [
      ...(m.state && !has(states, m.state) ? [`state ${m.state} (${m.id})`] : []),
      ...(m.empires ?? []).filter(e => !has(empires, e)).map(e => `empire ${e} (${m.id})`),
      ...[m.zone, ...(m.neighbours ?? [])].filter((z): z is string => !!z && !has(zones, z)).map(z => `zone ${z} (${m.id})`),
      ...(m.lost ?? []).filter(l => !has(blocks, l.block)).map(l => `lost block ${l.block} (${m.id})`)
    ]),
    ...Object.keys(PROVINCE_COLOURS).filter(id => !has(blocks, id)).map(id => `colour for block ${id}`),
    ...Object.keys(ZONE_COLOURS).filter(id => !has(zones, id)).map(id => `colour for zone ${id}`),
    ...Object.keys(EMPIRE_COLOURS).filter(id => !has(empires, id)).map(id => `colour for empire ${id}`),
    ...states.flatMap(s => s.properties.provinces).filter(id => !PROVINCE_COLOURS[id]).map(id => `no colour for province ${id}`)
  ])];
}
