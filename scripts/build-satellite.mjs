// Lesson 02: builds the satellite backdrop the map draws under its lines.
//   npm run data:satellite            (uses the cached download)
//   npm run data:satellite -- --fresh (downloads again)
//
// NASA Blue Marble Next Generation, July 2004, with topography shading and sea depth (public domain; credit "NASA Earth
// Observatory") → public/data/satellite.webp, already in the map's projection, plus satellite.json describing it.
// Runs once, at build time: the browser gets one ~230 kB picture, not an 88 MB tile.

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoGraticule, geoPath } from 'd3-geo';
import sharp from 'sharp';

// The tile: 21,600 × 21,600 pixels covering 0–90° E and 0–90° N (tile "C1" of eight), about 460 m a pixel here
const FILE = 'world.topo.bathy.200407.3x21600x21600.C1.jpg';
const URL = `https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/${FILE}`;
const TILE = { size: 21600, west: 0, north: 90, degrees: 90 };

// The map's frame and projection: the same as region-map.ts, so the picture lines up with every line drawn over it
const REGION = [[20, 43], [30.5, 48.5]];
const projectionFor = () => geoConicConformal().parallels([44, 48]).rotate([-25, 0]);
const OUT_WIDTH = 2000; // about the source's own detail across the region (~1,850 px): enough for a full-screen map

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheFile = join(root, 'scripts/.cache', FILE);

// --- 1. Download (once) ---------------------------------------------------------------------------
if (process.argv.includes('--fresh') || !existsSync(cacheFile)) {
  console.log(`Downloading ${URL} (88 MB)`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await mkdir(dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, Buffer.from(await res.arrayBuffer()));
}

// --- 2. Crop the region out of the tile -----------------------------------------------------------
// In the tile, x = longitude and y = latitude, evenly spaced (an "equirectangular" image). A degree's margin around the
// frame, because the frame's edges curve in the conic projection and reach a little past its corner longitudes.
const perDegree = TILE.size / TILE.degrees;
const crop = { west: REGION[0][0] - 1, east: REGION[1][0] + 1, south: REGION[0][1] - 1, north: REGION[1][1] + 1 };
const left = Math.floor((crop.west - TILE.west) * perDegree), top = Math.floor((TILE.north - crop.north) * perDegree);
const width = Math.ceil((crop.east - crop.west) * perDegree), height = Math.ceil((crop.north - crop.south) * perDegree);
// limitInputPixels: false, the tile has 467 million pixels, past sharp's default safety limit. Only the crop is decoded
// into memory as raw RGB.
const { data: source } = await sharp(cacheFile, { limitInputPixels: false })
  .extract({ left, top, width, height })
  .raw()
  .toBuffer({ resolveWithObject: true });
console.log(`Cropped ${width} × ${height} px`);

// Bilinear sample of the crop at a [lon, lat]: the four nearest pixels, weighted by distance, so the reprojected picture
// has no jagged pixel steps
const sample = (lon, lat, out, o) => {
  const fx = (lon - TILE.west) * perDegree - left - 0.5, fy = (TILE.north - lat) * perDegree - top - 0.5;
  const x0 = Math.max(0, Math.min(width - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(height - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0));
  for (let c = 0; c < 3; c++) {
    const at = (x, y) => source[(y * width + x) * 3 + c];
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

// WebP at quality 80: about a third the size of a JPEG of the same look
await sharp(out, { raw: { width: outW, height: outH, channels: 3 } }).webp({ quality: 80 }).toFile(join(root, 'public/data/satellite.webp'));
await writeFile(join(root, 'public/data/satellite.json'), JSON.stringify({
  source: 'NASA Blue Marble Next Generation, July 2004, topography and bathymetry',
  credit: 'NASA Earth Observatory',
  url: 'https://visibleearth.nasa.gov/images/73751',
  licence: 'Public domain',
  width: outW,
  height: outH,
  note: 'Already in the map\'s projection: place it over the frame\'s projected bounding box.'
}, null, 1));
console.log(`satellite.webp: ${outW} × ${outH} px`);
