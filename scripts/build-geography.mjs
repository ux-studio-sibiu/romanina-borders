// Lesson 01: builds the base geography the map draws and later borders are built from.
//   npm run data:geography            (uses the cached downloads)
//   npm run data:geography -- --fresh (downloads again)
//
// Natural Earth 1:10m (public domain): admin-1 units, rivers, the Black Sea → public/data/geography.topo.json
//   npm run data:geography:wide       the wide data (--wide): the bigger extent `wide` in region.json, every country one
//                                     shape, simplified more → public/data/geography-wide.topo.json (lesson 06's views)
// Runs in Node, at build time, never in the browser. The output is committed, so the app never depends on a third-party server.
// Modelled on data-viz's scripts/build-boundaries.mjs.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoBounds } from 'd3-geo';
import { feature, mergeArcs, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { filter, filterWeight, presimplify, simplify } from 'topojson-simplify';

const VERSION = 'v5.1.2'; // pinned: the same input always gives the same output
const BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${VERSION}/geojson`;
const FILES = {
  admin1: 'ne_10m_admin_1_states_provinces',  // 40.7 MB: every admin-1 unit in the world
  rivers: 'ne_10m_rivers_lake_centerlines',   // 7.3 MB: Danube and its delta branches, Prut, Dniester, Olt, Mureș
  riversEurope: 'ne_10m_rivers_europe',       // 2.5 MB: Europe's extra rivers, the only file with the Siret
  marine: 'ne_10m_geography_marine_polys'     // 1.7 MB: named seas, for the Black Sea
};

// The map's area (src/app/data/region.json, shared with the app): the story's core and about a fifth more on every side,
// so a full-screen map has land to its edges. Its edges are meridians and parallels, so in [lon, lat] it is exactly this
// box. Anything touching it is kept, whole: a unit cut at the edge would be useless for merging later.
const WIDE = process.argv.includes('--wide');
const region = JSON.parse(await readFile(new URL('../src/app/data/region.json', import.meta.url), 'utf8'));
const REGION = WIDE ? region.wide : region.area;
// Admin-1 units kept as units; every other country is merged into one shape. The wide data keeps none: one shape per country.
const COUNTRIES = WIDE ? [] : ['ROU', 'MDA', 'UKR', 'BGR', 'HUN', 'SRB'];

// The six rivers, by their Natural Earth names. The Danube includes its delta branches (and the Borcea, a branch above the delta).
const RIVERS = [
  { id: 'danube', name: 'Danube', nameRo: 'Dunărea', parts: ['Danube', 'Bratul Chillia', 'Bratul Sulina', 'Bratul Sfintu Gheorghe', 'Borcea'] },
  { id: 'prut', name: 'Prut', nameRo: 'Prut', parts: ['Prut'] },
  { id: 'dniester', name: 'Dniester', nameRo: 'Nistru', parts: ['Dniester'] },
  { id: 'olt', name: 'Olt', nameRo: 'Olt', parts: ['Olt'] },
  { id: 'mures', name: 'Mureș', nameRo: 'Mureș', parts: ['Mures'] },
  { id: 'siret', name: 'Siret', nameRo: 'Siret', parts: ['Siret'], europe: true } // only in the Europe file
];

// Weights are planar triangle areas in square degrees. At ~1000 px for the frame's 10.5°, a pixel is ~0.01°: a corner that adds
// less than a 0.003° × 0.003° triangle (≈ 0.1 px²) can't be seen. No smoothing (data-viz's Chaikin pass): these lines are
// snapping targets, so every point kept is a real Natural Earth point.
// The wide data is only ever seen zoomed out (a fifth of the scale or less): far coarser, and its islets go (rings under
// MIN_RING square degrees, about 200 km²: Malta, 316 km², stays)
const MIN_WEIGHT = WIDE ? 1e-2 : 1e-5;
const MIN_RING = WIDE ? 0.02 : 0;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, 'scripts/.cache');
const outDir = join(root, 'public/data');

// --- 1. Download (once) -------------------------------------------------------------------------
const source = {};
for (const [key, name] of Object.entries(FILES)) {
  const file = join(cacheDir, `${name}.geojson`);
  if (process.argv.includes('--fresh') || !existsSync(file)) {
    console.log(`Downloading ${BASE}/${name}.geojson`);
    const res = await fetch(`${BASE}/${name}.geojson`);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, await res.text());
  }
  source[key] = JSON.parse(await readFile(file, 'utf8'));
}

// --- 2. Admin-1 units that touch the region ------------------------------------------------------
// geoBounds, not a coordinate scan: it handles rings that cross the antimeridian (Russia's Chukotka) correctly.
const touches = f => {
  const [[x0, y0], [x1, y1]] = geoBounds(f);
  return x0 <= REGION[1][0] && x1 >= REGION[0][0] && y0 <= REGION[1][1] && y1 >= REGION[0][1];
};
const nearby = source.admin1.features.filter(touches);

// A stable id per unit: adm1_code. ISO 3166-2 isn't unique here: Natural Earth splits Moldova's raions that straddle the Dniester,
// so there are two Rezina (MD-RE) and two left-bank units coded MD-SN.
// A unit's country, by the internationally recognised borders: Natural Earth puts Crimea and Sevastopol under Russia (de
// facto control), though their ISO codes are Ukrainian (UA-43, UA-40); here they are Ukraine, as the UN, the EU and
// Romania hold.
const countryOf = p => p.iso_3166_2?.startsWith('UA-') ? 'UKR' : p.adm0_a3;

const units = nearby.filter(f => COUNTRIES.includes(countryOf(f.properties))).map(({ properties: p, geometry }) => ({
  type: 'Feature',
  id: p.adm1_code,
  properties: { name: p.name, country: countryOf(p), iso: p.iso_3166_2, type: p.type_en ?? p.type },
  geometry
}));
const others = nearby.filter(f => !COUNTRIES.includes(countryOf(f.properties))).map(({ properties: p, geometry }) => ({
  type: 'Feature',
  id: p.adm0_a3,
  properties: { name: p.admin, country: p.adm0_a3 },
  geometry
}));

// --- 3. Rivers and the sea ----------------------------------------------------------------------
const lines = f => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates);
const rivers = RIVERS.map(({ id, name, nameRo, parts, europe }) => {
  const found = source[europe ? 'riversEurope' : 'rivers'].features.filter(f => parts.includes(f.properties.name));
  if (!found.length) throw new Error(`River not found: ${name}`);
  // Rivers and Lake Centerlines both: the Dniester's liman and the Siret's reservoirs are lake centerlines
  return { type: 'Feature', id, properties: { name, nameRo }, geometry: { type: 'MultiLineString', coordinates: found.flatMap(lines) } };
});

const blackSea = source.marine.features.find(f => f.properties.name === 'Black Sea');
if (!blackSea) throw new Error('Black Sea not found');
const sea = [{ type: 'Feature', id: 'black-sea', properties: { name: 'Black Sea', nameRo: 'Marea Neagră' }, geometry: blackSea.geometry }];

// --- 4. Geometry: GeoJSON → TopoJSON → merged → simplified ----------------------------------------
// TopoJSON stores each shared border once, as an arc both neighbours reference: the snapping targets of the trace tool (step 7)
// and what lets later borders be merged from units (step 5) with no gaps or overlaps.
const collection = features => ({ type: 'FeatureCollection', features });
let topo = topology({ units: collection(units), neighbours: collection(others), rivers: collection(rivers), sea: collection(sea) });

// Neighbouring countries are context, not building blocks: their units become one shape per country
const byCountry = new Map();
for (const g of topo.objects.neighbours.geometries) byCountry.set(g.id, [...(byCountry.get(g.id) ?? []), g]);
topo.objects.neighbours.geometries = [...byCountry].map(([id, geometries]) => ({ ...mergeArcs(topo, geometries), id, properties: geometries[0].properties }));

// Simplify (Visvalingam, planar: the region is small enough for flat areas). Arc endpoints are always kept, so the points where
// three units meet, or a border meets the coast, never move.
const before = topo.arcs.reduce((n, a) => n + a.length, 0);
if (MIN_RING) topo = filter(topo, filterWeight(topo, MIN_RING));
// filter() leaves an empty collection (the wide data's units) with no type: put it back, the app reads every object
for (const o of Object.values(topo.objects)) if (!o.geometries) Object.assign(o, { type: 'GeometryCollection', geometries: [] });
topo = simplify(presimplify(topo), MIN_WEIGHT);

// Quantize last: snap coordinates to a 100 000 × 100 000 grid over the bounding box (about 17° × 11°, so ~15 m)
// and store each point as a small integer delta from the previous one
topo = quantize(topo, WIDE ? 2e4 : 1e5);
topo.source = { name: 'Natural Earth 1:10m', version: VERSION, files: Object.values(FILES), url: 'https://www.naturalearthdata.com/', license: 'Public domain' };

// --- 5. Write -----------------------------------------------------------------------------------
await mkdir(outDir, { recursive: true });
const json = JSON.stringify(topo);
await writeFile(join(outDir, WIDE ? 'geography-wide.topo.json' : 'geography.topo.json'), json);

// --- 6. Report ----------------------------------------------------------------------------------
const kb = s => `${(Buffer.byteLength(s) / 1024).toFixed(0)} kB`;
const count = new Map();
for (const u of units) count.set(u.properties.country, (count.get(u.properties.country) ?? 0) + 1);
console.log(`Units:       ${units.length} (${[...count].map(([c, n]) => `${c} ${n}`).join(', ')})`);
console.log(`Neighbours:  ${[...byCountry.keys()].join(', ')} (merged from ${others.length} units)`);
console.log(`Rivers:      ${rivers.map(r => `${r.properties.name} ${r.geometry.coordinates.length}`).join(', ')} (lines per river)`);
console.log(`Points:      ${before} → ${topo.arcs.reduce((n, a) => n + a.length, 0)} (min weight ${MIN_WEIGHT} deg²)`);
console.log(`Arcs:        ${topo.arcs.length}`);
console.log(`Size:        ${kb(json)}`);

// Sanity check: every unit and river survived simplification as a real shape. In the wide data the microstates go with
// the islets (San Marino, the Vatican, Monaco, Liechtenstein): listed, not an error.
for (const name of ['units', 'neighbours', 'rivers', 'sea']) {
  const empty = (feature(topo, topo.objects[name]).features ?? []).filter(f => !f.geometry);
  if (empty.length && WIDE && name === 'neighbours') console.log(`Dropped:     ${empty.map(f => f.id).join(' ')}`);
  else if (empty.length) throw new Error(`${name}: ${empty.length} features lost their geometry`);
}
