// Lesson 02: builds the satellite backdrop the map draws under its lines.
//   npm run data:satellite            (uses the cached download)
//   npm run data:satellite -- --fresh (downloads again)
//
// NASA Blue Marble Next Generation, July 2004, with topography shading and sea depth (public domain; credit "NASA Earth
// Observatory") → public/data/satellite.webp, already in the map's projection.
// Runs once, at build time: the browser gets one ~400 kB picture, not the 88 MB tiles.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoGraticule, geoPath } from 'd3-geo';
import sharp from 'sharp';

// The tiles: 21,600 × 21,600 pixels each, 90° square, about 460 m a pixel here: "C1" covers 0–90° E and 0–90° N. An extent
// past 0° would need "B1" (90° W–0°) too: add it here and the crops are stitched.
const SIZE = 21600, DEGREES = 90, NORTH = 90;
const TILES = [{ name: 'C1', west: 0 }].map(t => ({ ...t, file: `world.topo.bathy.200407.3x21600x21600.${t.name}.jpg` }));
const BASE_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/';

// The map's area and projection, from src/app/data/region.json, as the app reads them: so the picture lines up with
// every line drawn over it
const region = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), '../src/app/data/region.json'), 'utf8'));
// --wide: the wide extent, a smaller picture (lesson 06's views), satellite-wide.webp
const WIDE = process.argv.includes('--wide');
const REGION = WIDE ? region.wideSatellite : region.area;
const NAME = WIDE ? 'satellite-wide' : 'satellite';
const projectionFor = () => geoConicConformal().parallels(region.projection.parallels).rotate(region.projection.rotate);
const OUT_WIDTH = WIDE ? 2080 : 2560; // a bit more than a 1080p screen's pixels across the area (the source has ~4,200): it sits dimmed under the map, so a little softness on a 4K screen doesn't show; the wide view needs less

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const perDegree = SIZE / DEGREES;
// A degree's margin around the frame, because the frame's edges curve in the conic projection and reach a little past
// its corner longitudes
const want = { west: REGION[0][0] - 1, east: REGION[1][0] + 1, south: REGION[0][1] - 1, north: Math.min(NORTH, REGION[1][1] + 1) };

// --- 1. Download (once), and 2. crop the region out of each tile it reaches ----------------------------
// In a tile, x = longitude and y = latitude, evenly spaced (an "equirectangular" image). limitInputPixels: false, a tile
// has 467 million pixels, past sharp's default safety limit; only the crop is decoded into memory as raw RGB.
const crops = [];
for (const tile of TILES) {
  const west = Math.max(tile.west, want.west), east = Math.min(tile.west + DEGREES, want.east);
  if (west >= east) continue;
  const cacheFile = join(root, 'scripts/.cache', tile.file);
  if (process.argv.includes('--fresh') || !existsSync(cacheFile)) {
    console.log(`Downloading ${BASE_URL}${tile.file} (88 MB)`);
    const res = await fetch(BASE_URL + tile.file);
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, Buffer.from(await res.arrayBuffer()));
  }
  const left = Math.floor((west - tile.west) * perDegree), top = Math.floor((NORTH - want.north) * perDegree);
  const width = Math.min(SIZE - left, Math.ceil((east - west) * perDegree)), height = Math.ceil((want.north - want.south) * perDegree);
  const { data } = await sharp(cacheFile, { limitInputPixels: false }).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  crops.push({ tile, west, east, left, top, width, height, data });
  console.log(`Cropped ${width} × ${height} px from ${tile.name}`);
}

// Bilinear sample at a [lon, lat], from the crop of the tile it falls in: the four nearest pixels, weighted by distance,
// so the reprojected picture has no jagged pixel steps
const sample = (lon, lat, out, o) => {
  const crop = crops.find(c => lon < c.east) ?? crops[crops.length - 1];
  const { tile, left, top, width, height, data } = crop;
  const fx = (lon - tile.west) * perDegree - left - 0.5, fy = (NORTH - lat) * perDegree - top - 0.5;
  const x0 = Math.max(0, Math.min(width - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(height - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
  for (let c = 0; c < 3; c++) {
    const at = (x, y) => data[(y * width + x) * 3 + c];
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    out[o + c] = Math.round(top * (1 - ty) + bottom * ty);
  }
};

// --- 3. Reproject: every output pixel looks back to the lon/lat it shows ---------------------------
// Fit the projection to the frame in a box OUT_WIDTH wide; the box's height follows from the frame's shape. The app places
// the picture over the frame's bounding box in its own (resized) projection: same projection, only scale and translate
// differ, so the picture lines up at any window size.
const frame = geoGraticule().extent(REGION).precision(0.25).outline();
const unit = projectionFor().fitWidth(OUT_WIDTH, frame);
const [[x0, y0], [x1, y1]] = geoPath(unit).bounds(frame);
const outW = Math.round(x1 - x0), outH = Math.round(y1 - y0);
const out = Buffer.alloc(outW * outH * 3);
for (let y = 0; y < outH; y++) {
  for (let x = 0; x < outW; x++) {
    const [lon, lat] = unit.invert([x0 + x + 0.5, y0 + y + 0.5]); // the pixel's centre, back to the globe
    sample(lon, lat, out, (y * outW + x) * 3);
  }
}

// WebP at quality 70: about a third the size of a JPEG of the same look
await sharp(out, { raw: { width: outW, height: outH, channels: 3 } }).webp({ quality: 70 }).toFile(join(root, `public/data/${NAME}.webp`));
console.log(`${NAME}.webp: ${outW} × ${outH} px`);
