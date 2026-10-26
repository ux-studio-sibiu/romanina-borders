// Lesson 06: the favicon, Romania today in black, as a small SVG (under 2 kB).
//   npm run data:favicon
//
// public/data/shapes.topo.json (the "today" state) → public/favicon.svg. The outline is simplified hard (only the
// shape a 16–64 px icon can show), projected like the map, fitted to a 64 × 64 box and rounded to whole units.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const region = JSON.parse(await readFile(join(root, 'src/app/data/region.json'), 'utf8'));
let topo = JSON.parse(await readFile(join(root, 'public/data/shapes.topo.json'), 'utf8'));

// Corners under SIMPLIFY square degrees go: about 40 points are left, enough for the outline to read as Romania
const SIMPLIFY = 0.02, SIZE = 64, PAD = 2;
topo = simplify(presimplify(topo), SIMPLIFY);
const today = feature(topo, topo.objects.states).features.find(f => f.id === 'today');

const projection = geoConicConformal().parallels(region.projection.parallels).rotate(region.projection.rotate).fitExtent([[PAD, PAD], [SIZE - PAD, SIZE - PAD]], today);
const d = geoPath(projection).digits(0)(today);

// Romania's outline, filled black
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><path d="${d}"/></svg>`;
await writeFile(join(root, 'public/favicon.svg'), svg);
console.log(`favicon.svg: ${svg.length} bytes`);
