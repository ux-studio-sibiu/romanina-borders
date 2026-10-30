// A spot's pictures, the same way every time: each image as a WebP in public/spots/, its long side LONG px at most
// (never enlarged) and at QUALITY, ready for a `pictures` entry in src/app/data/spots.ts.
//   npm run picture -- <name>=<image> [<name>=<image> ...] [--same]
//   npm run picture -- --shrink
//
// <name>: the file to write (public/spots/<name>.webp); <image>: any picture (jpg, png, webp...).
// --same: every picture in this call cut to the same size, as Bran's and Sighișoara's are: a SHAPE frame (width / height)
//         as large as the smallest of them allows, cropped from the centre, so switching between them moves nothing.
// --shrink: the pictures already in public/spots/, any larger than LONG brought down to it (the others left alone).
// Each written file is printed with its size, and a crop with how much of the picture it kept.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// The card shows a picture at most about 700 px wide or 520 px tall (src/app/charts/map-spots), so LONG leaves room for a
// sharp picture on a high-density screen; QUALITY: WebP's, where pictures like these keep their look
const LONG = 1000, QUALITY = 75, SHAPE = 3 / 2;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spots = join(root, 'public/spots');
const args = process.argv.slice(2);
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

if (args.includes('--shrink')) {
  for (const file of (await readdir(spots)).filter(f => f.endsWith('.webp'))) {
    // Read into memory first: sharp can't write over the file it is reading (and on Windows keeps it open)
    const path = join(spots, file), input = await readFile(path), { width, height } = await sharp(input).metadata();
    if (Math.max(width, height) <= LONG) continue;
    const { data, info } = await sharp(input).resize(longSide(width, height)).webp({ quality: QUALITY }).toBuffer({ resolveWithObject: true });
    await writeFile(path, data);
    console.log(`${file}: ${width}×${height}, ${kb(input.length)} → ${info.width}×${info.height}, ${kb(info.size)}`);
  }
} else {
  const pairs = args.filter(a => a.includes('=')).map(a => { const i = a.indexOf('='); return { name: a.slice(0, i), image: a.slice(i + 1) }; });
  if (!pairs.length) throw new Error('Usage: npm run picture -- <name>=<image> [<name>=<image> ...] [--same] | --shrink');
  const sizes = await Promise.all(pairs.map(p => sharp(p.image).metadata()));
  // --same: the frame as large as fits inside every picture, then no larger than LONG
  let frame = null;
  if (args.includes('--same')) {
    let w = Math.min(...sizes.map(s => Math.min(s.width, s.height * SHAPE)));
    w = Math.min(w, LONG);
    frame = { width: Math.round(w), height: Math.round(w / SHAPE) };
  }
  for (const [i, p] of pairs.entries()) {
    const { width, height } = sizes[i], path = join(spots, `${p.name}.webp`);
    const resize = frame ? { ...frame, fit: 'cover', position: 'centre' } : longSide(width, height);
    const out = await sharp(p.image).resize(resize).webp({ quality: QUALITY }).toFile(path);
    // A crop keeps the share of the picture its shape allows: all of it when the picture is already SHAPE
    const shape = width / height, kept = Math.min(shape / SHAPE, SHAPE / shape);
    const crop = frame ? `, from ${width}×${height}, ${Math.round(kept * 100)}% of it kept` : '';
    console.log(`spots/${p.name}.webp: ${out.width}×${out.height}, ${kb(out.size)}${crop}`);
  }
}

// The long side brought down to LONG, never enlarged
function longSide(width, height) {
  return width >= height ? { width: Math.min(width, LONG), withoutEnlargement: true } : { height: Math.min(height, LONG), withoutEnlargement: true };
}
