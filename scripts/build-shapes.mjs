// Lesson 05: builds the map shapes that today's units (lesson 01) can make, from Roman Dacia to today.
//   npm run data:shapes
//
// public/data/geography.topo.json → public/data/shapes.topo.json, four objects:
//   blocks:  the historical provinces, each a group of today's units merged into one shape (Wallachia, Bessarabia, …)
//   states:  the lands at each moment, as a list of blocks merged into one outline (106, c. 1000, 1359, c. 1400, 1600,
//            1812, 1859, 1878, 1913, 1918, 1940, today)
//   lands:   for a moment with several countries side by side (1359, c. 1400, 1812), each one's outline
//   empires: the empires and kingdoms round or over the provinces, as far as the frame shows them
// Rough on purpose (ROADMAP.md: "simple, but not wrong"): a province is the counties that are mostly in it today.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea } from 'd3-geo';
import { feature, merge, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { filter, filterWeight, presimplify, simplify } from 'topojson-simplify';

// --- The provinces, from today's units -------------------------------------------------------------------------------
// By [country, unit name], as Natural Earth spells them. Today's counties don't follow the old borders exactly; each is
// put where most of it lay.
const BLOCKS = [
  { id: 'wallachia', name: 'Wallachia', nameRo: 'Țara Românească', units: ['ROU', 'Mehedinti', 'Gorj', 'Dolj', 'Olt', 'Vâlcea', 'Arges', 'Teleorman', 'Giurgiu', 'Dâmbovita', 'Prahova', 'Buzau', 'Braila', 'Ialomita', 'Calarasi', 'Ilfov', 'Bucharest'] },
  // Moldavia west of the Prut, without Bukovina (Suceava county), Austrian from 1775
  { id: 'moldavia', name: 'Moldavia', nameRo: 'Moldova', units: ['ROU', 'Botosani', 'Iasi', 'Neamt', 'Bacau', 'Vaslui', 'Vrancea', 'Galati'] },
  { id: 'bukovina-south', name: 'Southern Bukovina', nameRo: 'Bucovina de Sud', units: ['ROU', 'Suceava'] },
  // Northern Bukovina, with Hotin and Herța: today's Chernivtsi region, all Romanian 1918–1940
  { id: 'bukovina-north', name: 'Northern Bukovina', nameRo: 'Bucovina de Nord', units: ['UKR', "Chernivtsi"] },
  { id: 'dobruja', name: 'Dobruja', nameRo: 'Dobrogea', units: ['ROU', 'Tulcea', 'Constanta'] },
  // Southern Dobruja: Bulgarian before 1913 and after 1940; today's Dobrich and Silistra provinces
  { id: 'cadrilater', name: 'Southern Dobruja', nameRo: 'Cadrilaterul', units: ['BGR', 'Dobrich', 'Silistra'] },
  // Transylvania with Banat, Crișana and Maramureș, split along the 1940 line: the north went to Hungary 1940–1944.
  // The line ran through Bihor, Cluj and Mureș counties; each is put on the side where most of it lay.
  { id: 'transylvania-north', name: 'Northern Transylvania', nameRo: 'Transilvania de Nord', units: ['ROU', 'Satu Mare', 'Maramures', 'Bihor', 'Salaj', 'Cluj', 'Bistrita-Nasaud', 'Mures', 'Harghita', 'Covasna'] },
  { id: 'transylvania-south', name: 'Southern Transylvania', nameRo: 'Transilvania de Sud', units: ['ROU', 'Alba', 'Sibiu', 'Brasov', 'Hunedoara'] },
  // Arad: with the Banat, Ottoman from 1551 (Arad and Lipova), so also not in the 1600 union
  { id: 'arad', name: 'Arad', nameRo: 'Arad', units: ['ROU', 'Arad'] },
  // The Banat: Hungarian, then Ottoman from 1552 to 1716 (so not in Michael the Brave's union), Romanian from 1918
  { id: 'banat', name: 'Banat', nameRo: 'Banatul', units: ['ROU', 'Timis', 'Caras-Severin'] },
  // Bessarabia: Moldova west of the Dniester (the east bank, Transnistria, was never part of it), without the Budjak
  { id: 'bessarabia', name: 'Bessarabia', nameRo: 'Basarabia', units: ['MDA', '!Camenca', '!Stîngă Nistrului', '!Transnistria', '!Grigoriopol', '!Taraclia', '!Comrat', '!Basarabeasca'] },
  // The Budjak, the steppe at Bessarabia's southern end: Moldavian until the Ottomans took the coast (1484) and the Tatars
  // the steppe (1538); Russian with the rest of Bessarabia from 1812. The cut-out piece of the Odessa region, plus
  // Moldova's three southern districts on the steppe.
  { id: 'budjak', name: 'Budjak', nameRo: 'Bugeac', units: ['MDA', 'Taraclia', 'Comrat', 'Basarabeasca'], extra: ['budjak'] },

  // Shapes of their own, shown whole, for moments no group of the provinces above fits. They overlap those provinces
  // (each block is its own merge), which is fine.
  // Roman Dacia (106–271): Oltenia, the Banat and the Carpathian arc's inside, up to the forts on the eastern Carpathians
  // (Covasna, Harghita) and Porolissum in the north (Sălaj). Not Maramureș, Satu Mare, Crișana or the Arad plain (the free
  // Dacians and the Sarmatians). Its eastern edge east of the Olt (the Limes Transalutanus) is a county line here: to
  // adjust with a traced line.
  { id: 'roman-dacia', name: 'Roman Dacia', nameRo: 'Dacia romană', units: ['ROU', 'Mehedinti', 'Gorj', 'Dolj', 'Vâlcea', 'Olt', 'Timis', 'Caras-Severin', 'Hunedoara', 'Alba', 'Sibiu', 'Brasov', 'Covasna', 'Harghita', 'Mures', 'Cluj', 'Salaj', 'Bistrita-Nasaud'] },
  // Bogdan's Moldavia (1359): the early core in the north, round Suceava, Siret and Baia. It reached the Black Sea only
  // around 1390. Rough: whole counties; to adjust against a map.
  { id: 'moldavia-1359', name: 'Moldavia', nameRo: 'Moldova', units: [['ROU', 'Suceava', 'Botosani', 'Neamt'], ['UKR', 'Chernivtsi']] }
];

// The lands at each moment the story shows, as blocks
const STATES = [
  { id: '106', label: '106–271', name: 'Roman Dacia', blocks: ['roman-dacia'] },
  // Transylvania joining the Kingdom of Hungary, over the 10th–13th centuries: Transylvania with the Banat, Crișana and
  // Maramureș, all the Hungarian king's lands by 1200
  { id: 'c1000', label: 'c. 1000', name: 'Transylvania, in the Kingdom of Hungary', blocks: ['transylvania-north', 'transylvania-south', 'arad', 'banat'] },
  // Basarab's Wallachia (1330) and Bogdan's early Moldavia (1359), side by side
  { id: '1359', label: '1330–1359', name: 'Wallachia and Moldavia', blocks: ['wallachia', 'moldavia-1359'], lands: ['wallachia', 'moldavia-1359'] },
  // Mircea the Elder's Wallachia, Alexander the Good's Moldavia (from the mountains to the Dniester and the sea), and
  // Transylvania in the Kingdom of Hungary: three lands side by side (see LANDS). For the moments from 1400 to 1504.
  { id: 'c1400', label: 'c. 1400', name: 'Wallachia, Moldavia and Transylvania', blocks: ['wallachia', 'moldavia', 'bukovina-south', 'bukovina-north', 'bessarabia', 'budjak', 'transylvania-north', 'transylvania-south', 'arad', 'banat'], lands: ['wallachia', 'moldavia-1400', 'transylvania-1400'] },
  // Michael the Brave's union, summer 1600: the three lands under one prince, without their Ottoman edges (Dobruja, the
  // Banat and Arad, the Budjak). Simplified: Tighina, Ottoman from 1538, stays in.
  { id: '1600', name: "Michael the Brave's union", blocks: ['wallachia', 'moldavia', 'bukovina-south', 'bukovina-north', 'bessarabia', 'transylvania-north', 'transylvania-south'] },
  // After Bukovina (Austrian, 1775) and Bessarabia (Russian, 1812) were taken: Wallachia and what was left of Moldavia,
  // still two countries
  { id: '1812', name: 'Wallachia and Moldavia', blocks: ['wallachia', 'moldavia'], lands: ['wallachia', 'moldavia-1812'] },
  { id: '1859', name: 'The United Principalities', blocks: ['wallachia', 'moldavia'] },
  { id: '1878', name: 'Independent Romania, with Dobruja', blocks: ['wallachia', 'moldavia', 'dobruja'] },
  { id: '1913', name: 'Romania after the Balkan War', blocks: ['wallachia', 'moldavia', 'dobruja', 'cadrilater'] },
  { id: '1918', name: 'Greater Romania', blocks: ['wallachia', 'moldavia', 'dobruja', 'cadrilater', 'transylvania-north', 'transylvania-south', 'arad', 'banat', 'bukovina-south', 'bukovina-north', 'bessarabia', 'budjak'] },
  { id: '1940', name: 'Romania after the losses of 1940', blocks: ['wallachia', 'moldavia', 'dobruja', 'transylvania-south', 'arad', 'banat', 'bukovina-south'] },
  { id: 'today', name: 'Romania today', blocks: ['wallachia', 'moldavia', 'dobruja', 'transylvania-north', 'transylvania-south', 'arad', 'banat', 'bukovina-south'] }
].map(s => ({ label: s.id, ...s })); // the label on its button, when it isn't the id

// The separate countries of a moment that has several (1359, c. 1400, 1812), each merged from blocks
const LANDS = [
  { id: 'wallachia', name: 'Wallachia', blocks: ['wallachia'] },
  { id: 'moldavia-1359', name: 'Moldavia', blocks: ['moldavia-1359'] },
  { id: 'moldavia-1400', name: 'Moldavia', blocks: ['moldavia', 'bukovina-south', 'bukovina-north', 'bessarabia', 'budjak'] },
  { id: 'transylvania-1400', name: 'Transylvania, in the Kingdom of Hungary', blocks: ['transylvania-north', 'transylvania-south', 'arad', 'banat'] },
  { id: 'moldavia-1812', name: 'Moldavia', blocks: ['moldavia'] }
];

// The empires and kingdoms round (or over) the provinces, as far as the map's area shows them: built like everything else,
// from provinces (`blocks`) and today's units (`units`, by country, as in BLOCKS; a neighbour country is one unit). `at` is
// where the name goes, in [lon, lat]: in the empire's own land, as close to the moment's lands as it fits (inside a
// province the empire held, like the Habsburgs' Transylvania, where the moment doesn't show it), so it reads beside them.
// A unit may come from a block and a list at once; it is counted once. A Hungarian county takes its county-rank city
// with it (Pest and Budapest, Baranya and Pécs…): Natural Earth has the cities as units of their own, and one left out
// would be a hole.
const VOJVODINA = ['Severno-Banatski', 'Srednje-Banatski', 'Južno-Banatski', 'Severno-Backi', 'Zapadno-Backi', 'Južno-Backi', 'Sremski'];
const not = names => names.map(n => '!' + n);
const SERBIA_SOUTH = ['SRB', ...not(VOJVODINA)];
// Transdanubia: Hungary west of the Danube, Roman Pannonia
const TRANSDANUBIA = ['Gyor-Moson-Sopron', 'Gyôr', 'Sopron', 'Vas', 'Szombathely', 'Zala', 'Zalaegerszeg', 'Nagykanizsa', 'Komárom-Esztergom', 'Tatabánya', 'Fejér', 'Székesfehérvár', 'Dunaújváros', 'Veszprém', 'Tolna', 'Szekszárd', 'Baranya', 'Pécs', 'Somogy', 'Kaposvár'];
// Ottoman Hungary, 1541–1699 (rough: whole counties): the middle of the plain, Buda and the south of Transdanubia
const OTTOMAN_HUNGARY = ['Pest', 'Budapest', 'Érd', 'Bács-Kiskun', 'Kecskemét', 'Csongrád', 'Szeged', 'Hódmezôvásárhely', 'Jász-Nagykun-Szolnok', 'Szolnok', 'Heves', 'Eger', 'Nógrád', 'Salgótarján', 'Békés', 'Békéscsaba', 'Fejér', 'Székesfehérvár', 'Dunaújváros', 'Tolna', 'Szekszárd', 'Baranya', 'Pécs', 'Somogy', 'Kaposvár'];
// Ukraine's regions that were Austrian (Galicia, Bukovina) or Hungarian (Transcarpathia) before 1918
const UKRAINE_WEST = ['Transcarpathia', 'Chernivtsi', "Ivano-Frankivs'k", "L'viv", "Ternopil'"];
const BALKANS = [['BGR'], ['KOS'], ['MNE'], ['MKD'], ['ALB'], ['BIH'], ['GRC'], ['TUR']];
const EMPIRES = [
  // Rome after Trajan: Roman Dacia, and everything south of the Danube (Moesia, Dalmatia, Thrace, Greece, Italy) with
  // Dobruja, and Pannonia and Noricum west of it; not the plains north of it in Serbia and Hungary (the Sarmatians' land)
  { id: 'roman-empire', name: 'Roman Empire', at: [26.4, 43.5], blocks: ['roman-dacia', 'dobruja'], units: [...BALKANS, ['HRV'], ['SVN'], ['AUT'], ['ITA'], ['SRB', ...not(VOJVODINA.slice(0, 6))], ['HUN', ...TRANSDANUBIA, 'Budapest']] },
  // The Kingdom of Hungary, c. 1000–1526: Transylvania, the Banat and Crișana, today's Hungary, Vojvodina, Slovakia,
  // Transcarpathia, and Croatia under its crown
  { id: 'hungary', name: 'Kingdom of Hungary', at: [21.2, 47.2], blocks: ['transylvania-north', 'transylvania-south', 'arad', 'banat'], units: [['HUN'], ['SRB', ...VOJVODINA], ['SVK'], ['HRV'], ['UKR', 'Transcarpathia']] },
  // The Ottomans in the Balkans, from about 1400 to the 1800s: Bulgaria, Serbia south of the Danube, Bosnia, the lands to
  // the south, and Dobruja
  { id: 'ottoman', name: 'Ottoman Empire', at: [26.8, 43.5], blocks: ['dobruja'], units: [...BALKANS, SERBIA_SOUTH] },
  // The Ottomans in 1600: also the Banat and Arad, Vojvodina, the middle of Hungary and the Budjak
  { id: 'ottoman-1600', name: 'Ottoman Empire', at: [26.8, 43.5], blocks: ['dobruja', 'banat', 'arad', 'budjak'], units: [...BALKANS, ['SRB'], ['HUN', ...OTTOMAN_HUNGARY]] },
  // The Habsburg Empire (Austria-Hungary from 1867), 1775–1918: Transylvania, the Banat, Bukovina, Galicia, Hungary,
  // Vojvodina, Austria, Slovenia, Croatia, Slovakia, Bohemia and Moravia (Czechia) and southern Poland (Galicia's west), which is all the
  // area shows of Poland
  { id: 'habsburg', name: 'Habsburg Empire', at: [24.3, 46.7], blocks: ['transylvania-north', 'transylvania-south', 'arad', 'banat', 'bukovina-south', 'bukovina-north'], units: [['HUN'], ['SRB', ...VOJVODINA], ['SVK'], ['CZE'], ['AUT'], ['SVN'], ['HRV'], ['POL'], ['UKR', ...UKRAINE_WEST]] },
  // The Russian Empire, 1812–1917: Bessarabia with the Budjak (all of today's Moldova and the Odessa region), and
  // Ukraine east of Galicia, Crimea included
  { id: 'russian-empire', name: 'Russian Empire', at: [29.0, 47.2], units: [['MDA'], ['UKR', ...not(UKRAINE_WEST)]] },
  // 1940: the Soviet Union took Bessarabia and northern Bukovina (Galicia it had taken from Poland in 1939); Hungary took
  // northern Transylvania (Transcarpathia in 1939)
  { id: 'soviet-union', name: 'Soviet Union', at: [28.8, 47.2], units: [['MDA'], ['UKR', '!Transcarpathia']] },
  { id: 'hungary-1940', name: 'Hungary', at: [23.8, 47.35], blocks: ['transylvania-north'], units: [['HUN'], ['UKR', 'Transcarpathia']] }
];

// Provinces split only for the moments that need it (Transylvania by the 1940 line, Bukovina by the 1775–1918 one): where
// a moment has both halves, it shows them as one province. Each state's `provinces` is its blocks with such pairs joined.
const COMBINED = [
  { id: 'transylvania', name: 'Transylvania', nameRo: 'Transilvania', parts: ['transylvania-north', 'transylvania-south'] },
  { id: 'bukovina', name: 'Bukovina', nameRo: 'Bucovina', parts: ['bukovina-north', 'bukovina-south'] }
];
const provincesOf = ids => COMBINED.reduce((list, c) => c.parts.every(p => list.includes(p))
  ? list.flatMap(id => id === c.parts.find(p => list.includes(p)) ? [c.id] : c.parts.includes(id) ? [] : [id])
  : list, ids);

// Coastal lagoons the units' coastline runs round as if they were sea, closed with a straight line along the barrier beach,
// so an outline crosses the mouth instead of tracing every shore. `from` and `to` are where the coast turns in and comes
// back out (the nearest ring point is used); `via` is the barrier between them. Razim (Razelm), Golovița and Sinoe:
// in from the Danube delta's southern edge, out north of Corbu, via Portița.
const NOTCHES = [
  { name: 'Razim–Sinoe lagoons', from: [29.316, 44.799], to: [28.844, 44.494], via: [[28.99, 44.69]] }
];

// The Budjak (southern Bessarabia) is the part of today's Odessa region west of the Dniester and its estuary. The region
// comes as one unit, so it is cut with this convex polygon in [lon, lat]: its east edge runs down the estuary, from near
// Palanca (where the Dniester leaves Moldova) to the sea below Zatoka.
const BUDJAK_CUT = [[28, 44.9], [28, 46.62], [30.05, 46.62], [30.6, 46.0], [31, 45.3]];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(join(root, 'public/data/geography.topo.json'), 'utf8'));
const units = feature(source, source.objects.units).features;
// The other countries, each one shape (Slovakia, Kosovo, Montenegro): for the empires
const neighbours = feature(source, source.objects.neighbours).features;

// --- 1. The Budjak, cut out of the Odessa region -----------------------------------------------------------------------
const odessa = units.find(u => u.properties.country === 'UKR' && u.properties.name === 'Odessa');
const polygons = odessa.geometry.type === 'Polygon' ? [odessa.geometry.coordinates] : odessa.geometry.coordinates;
const cut = polygons.map(rings => rings.map(ring => clip(ring, BUDJAK_CUT)).filter(r => r.length >= 4)).filter(rings => rings.length);
const budjak = { type: 'Feature', properties: { name: 'Budjak', country: 'UKR', piece: 'budjak' }, geometry: { type: 'MultiPolygon', coordinates: cut } };

// --- 2. One topology of every unit and the Budjak, so merging can drop the borders between them ------------------------
// The units' shared borders come out of feature() with identical coordinates, and the Budjak keeps the Odessa region's
// own points along the Moldovan border, so topology() finds the shared arcs again.
const pieces = { type: 'FeatureCollection', features: [...units, ...neighbours, budjak] };
const topo = topology({ pieces });
const geometries = topo.objects.pieces.geometries;

// A block's units: one [country, …names] list, or several for a block across borders. Names starting with ! are left out
// of the whole country instead.
const unitsOf = block => {
  const groups = Array.isArray(block.units[0]) ? block.units : [block.units];
  const found = groups.flatMap(([country, ...names]) => {
    const include = names.filter(n => !n.startsWith('!')), exclude = names.filter(n => n.startsWith('!')).map(n => n.slice(1));
    const matches = geometries.filter(g => g.properties.country === country && !g.properties.piece
      && (include.length ? include.includes(g.properties.name) : !exclude.includes(g.properties.name)));
    for (const n of include) if (!matches.some(g => g.properties.name === n)) throw new Error(`No unit ${country} ${n} (block ${block.id})`);
    return matches;
  });
  return [...found, ...geometries.filter(g => block.extra?.includes(g.properties.piece))];
};

// --- 3. Merge: each block, then each state ---------------------------------------------------------------------------
const blockUnits = new Map(BLOCKS.map(b => [b.id, unitsOf(b)]));
// Every shape gets the same lagoon fill, from the same ring points, so the shapes still share that coast exactly
const merged = ids => closeNotches(rightWayRound(merge(topo, ids.flatMap(b => blockUnits.get(b)))));
const blocks = [
  ...BLOCKS.map(({ id, name, nameRo }) => ({ type: 'Feature', id, properties: { name, nameRo }, geometry: merged([id]) })),
  ...COMBINED.map(({ id, name, nameRo, parts }) => ({ type: 'Feature', id, properties: { name, nameRo, parts }, geometry: merged(parts) }))
];
const states = STATES.map(({ id, label, name, blocks: ids, lands }) => ({
  type: 'Feature', id, properties: { label, name, blocks: ids, provinces: provincesOf(ids), ...(lands && { lands }) }, geometry: merged(ids)
}));
const lands = LANDS.map(({ id, name, blocks: ids }) => ({ type: 'Feature', id, properties: { name, blocks: ids }, geometry: merged(ids) }));
// An empire's units: its provinces' and its own lists', each unit once (a unit listed twice would merge away entirely:
// merge drops every arc two of its polygons share)
const empires = EMPIRES.map(({ id, name, at, blocks: ids = [], units: groups = [] }) => {
  const all = [...new Set([...ids.flatMap(b => blockUnits.get(b)), ...(groups.length ? unitsOf({ id, units: groups }) : [])])];
  return { type: 'Feature', id, properties: { name, at }, geometry: closeNotches(rightWayRound(merge(topo, all))) };
});

// --- 4. Simplify, and write as TopoJSON -------------------------------------------------------------------------------
// The states share their borders with the blocks, so each line is stored once, and simplifying the shared topology moves
// a border the same way in every shape that has it: no gaps open between provinces.
// Simpler than the base map on purpose: these are a picture book's shapes, not snapping targets. Small rings go first
// (the coast's islets, spits and lagoon holes, which made the outline wrap round every one), then corners smaller than
// SIMPLIFY (Visvalingam: the area of the triangle a point makes with its neighbours, in square degrees).
const MIN_RING = 0.02;   // ≈ 175 km² at 46° N: the Danube delta's islands and the Budjak's spits and lagoons go
const SIMPLIFY = 0.0015; // ≈ 15 px² at the full-screen map's scale: wiggles go, the shape of every coast and bend stays
let out = topology({ blocks: collection(blocks), states: collection(states), lands: collection(lands), empires: collection(empires) });
out = filter(out, filterWeight(out, MIN_RING));
out = simplify(presimplify(out), SIMPLIFY);
out = quantize(out, 1e5);
const file = join(root, 'public/data/shapes.topo.json');
await writeFile(file, JSON.stringify(out));

console.log(`Blocks: ${BLOCKS.map(b => `${b.id} (${blockUnits.get(b.id).length})`).join(', ')}; combined: ${COMBINED.map(c => c.id).join(', ')}`);
console.log(`Provinces shown: ${states.map(s => `${s.id}: ${s.properties.provinces.join(' ')}`).join(' | ')}`);
const parts = o => out.objects.states.geometries.find(g => g.id === o)?.arcs.length;
console.log(`States: ${states.map(s => `${s.id} ${s.geometry.coordinates.length} → ${parts(s.id)} part(s)`).join(', ')}`);
console.log(`Wrote ${file} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);

// --- Helpers ----------------------------------------------------------------------------------------------------------

function collection(features) { return { type: 'FeatureCollection', features }; }

// d3-geo is spherical: a polygon's ring direction says which side is inside. A shape bigger than a hemisphere was
// wound the other way: turn every ring round (lesson 04 has the same check).
function rightWayRound(geometry) {
  if (geoArea(geometry) <= 2 * Math.PI) return geometry;
  return { ...geometry, coordinates: geometry.coordinates.map(rings => rings.map(r => [...r].reverse())) };
}

// Each notch, in every ring that has both its ends: the shorter way round the ring between them (the way round the lagoon,
// not the rest of the country) is replaced by the barrier line. A ring that doesn't reach both ends is left alone.
function closeNotches(geometry) {
  const near = (ring, p) => {
    let best = -1, distance = 0.01; // within about a kilometre
    ring.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < distance) { best = i; distance = d; } });
    return best;
  };
  const fill = ring => NOTCHES.reduce((r, { from, to, via }) => {
    const open = r.slice(0, -1), n = open.length;
    const a = near(open, from), b = near(open, to);
    if (a < 0 || b < 0) return r;
    // Rotate the ring to start at `from`, so the two ways round are [from … to] and [to … from]
    const rotated = [...open.slice(a), ...open.slice(0, a)], j = (b - a + n) % n;
    const forward = rotated.slice(0, j + 1), rest = rotated.slice(j); // from … to, and to … (back round to from)
    const result = forward.length < rest.length + 1
      ? [rotated[0], ...via, ...rest]           // the lagoon is the forward way: from, the barrier, to, the rest of the ring
      : [...forward, ...[...via].reverse()];    // the lagoon is the way back: from … to, then the barrier back to from
    return [...result, result[0]];
  }, ring);
  return { ...geometry, coordinates: geometry.coordinates.map(rings => rings.map(fill)) };
}

// Sutherland–Hodgman: a ring clipped to a convex polygon, one clip edge at a time. Planar in [lon, lat], which is fine
// over half a degree. The ring may be concave; where it leaves and re-enters, the result runs along the cut edge.
function clip(ring, convex) {
  const sign = Math.sign(area(convex)); // which side of each edge is inside
  const inside = (p, a, b) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
  const cross = (p, q, a, b) => {
    const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / ((q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0]));
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
  };
  let points = ring.slice(0, -1);
  convex.forEach((a, i) => {
    const b = convex[(i + 1) % convex.length], input = points;
    points = [];
    input.forEach((q, j) => {
      const p = input[(j - 1 + input.length) % input.length];
      if (inside(q, a, b)) { if (!inside(p, a, b)) points.push(cross(p, q, a, b)); points.push(q); }
      else if (inside(p, a, b)) points.push(cross(p, q, a, b));
    });
  });
  return points.length ? [...points, points[0]] : [];
}

function area(ring) { return ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2; }
