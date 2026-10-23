---
name: smooth-borders
description: >-
  Make the map shapes' border lines simpler and cleaner in romanian-borders: drop islets, spits and lagoon holes, smooth
  out small wiggles, close coastal lagoons and inlets the coastline wraps round (as done for Lake Razim), and keep every
  province and state sharing its borders exactly. Use whenever the user says an outline "wraps around" a lake, lagoon,
  island or delta, asks to "simplify", "smooth" or "clean up" the borders or outlines, says a shape is too detailed or
  jagged, wants a lagoon or inlet "filled in" or "made continuous", or adds new derived shapes to
  scripts/build-shapes.mjs that need the same treatment.
---

# Smoothing the map shapes' borders

The derived shapes (provinces, states, lands) are built by `scripts/build-shapes.mjs` (`npm run data:shapes`) from
today's units in `public/data/geography.topo.json`, into `public/data/shapes.topo.json`. All the smoothing happens in
that script, at build time, never in the browser. The base map (lesson 01) is deliberately left detailed: its lines are
snapping targets for the trace tool; only the picture-book shapes are simplified.

## The rule that matters most: simplify the shared topology, never each shape alone

Provinces and states share borders (Wallachia's border with Transylvania is also part of every state's outline). If
each shape were simplified on its own, the same border would be simplified differently in each one and gaps and overlaps
would open between neighbours. So:

1. Build every shape as GeoJSON (merges of units).
2. Put **all** of them into **one** topology: `topology({ blocks, states, lands, empires })`. Identical coordinates become one
   shared arc.
3. Filter and simplify **that topology**. Each arc is changed once, and every shape that uses it gets the same line.
4. Quantize last (`quantize(out, 1e5)`).

Anything that edits coordinates (cutting the Budjak, closing a lagoon) must happen **before** step 2 and must give
identical coordinates to every shape that shares that coast, or the arcs stop being shared.

An empire is merged from provinces and unit lists at once: dedupe the units first (`new Set`). A unit in the list twice
makes `merge` drop all its arcs, as if they were inside borders, and it vanishes from the outline.

## The steps, in the order the script runs them

### 1. Cut a unit in two when the data's unit is too coarse

Example: the Budjak is only the part of Ukraine's Odessa region west of the Dniester estuary. The script clips the
region with a hand-placed **convex** polygon (`BUDJAK_CUT`, `[lon, lat]`) using Sutherland–Hodgman (`clip()`). The clip
polygon must be convex (check that every turn goes the same way) or the clip is wrong. The piece keeps the unit's own
points along its other borders, so it still shares them with its neighbours.

### 2. Merge units into shapes

`merge(topo, geometries)` from topojson-client drops the arcs inside a group and leaves its outline. The units come from
one topology, so their shared borders match exactly and merging leaves no slivers.

### 3. Close coastal notches (lagoons, inlets the coast runs round)

Natural Earth's admin units often treat a coastal lagoon as sea: the coastline runs inland round it, so it is a
**notch** in the outline, not a hole. Filtering holes won't touch it. Lake Razim (with Golovița and Sinoe) was one.

`NOTCHES` lists them; `closeNotches()` runs on every merged geometry:

```js
const NOTCHES = [
  { name: 'Razim–Sinoe lagoons', from: [29.316, 44.799], to: [28.844, 44.494], via: [[28.99, 44.69]] }
];
```

- `from` / `to`: where the coast turns into the notch and where it comes back out. The nearest ring point within 0.01°
  is used, so take them from the ring itself (see "Finding a notch's ends" below).
- `via`: the barrier beach or mouth between them, as few points as give a believable coast (often one).
- The shorter way round the ring between the two ends (the way round the lagoon, not round the rest of the country) is
  replaced by `from → via → to`. A ring that doesn't reach both ends is left alone (c. 1400 has no Dobruja).
- Every shape that has that coast is closed from the same ring points, so they still share it exactly.

**Finding a notch's ends.** First check it really is a notch, not a hole:

```bash
node --input-type=module -e "
import { readFileSync } from 'fs'; import { feature } from 'topojson-client'; import { geoContains } from 'd3-geo';
const t = JSON.parse(readFileSync('public/data/geography.topo.json', 'utf8'));
for (const u of feature(t, t.objects.units).features.filter(u => ['Tulcea', 'Constanta'].includes(u.properties.name)))
  console.log(u.properties.name, 'inside:', geoContains(u, [28.95, 44.87]), 'holes:', (u.geometry.coordinates[0].length - 1));"
```

A point in the water that is not inside any unit, with no holes, means a notch. Then list the merged coast's ring points
in a box round it, in ring order, and pick the last point before the coast turns inland and the first after it comes out:

```bash
node --input-type=module -e "
import { readFileSync } from 'fs'; import { merge } from 'topojson-client';
const t = JSON.parse(readFileSync('public/data/geography.topo.json', 'utf8'));
const g = merge(t, t.objects.units.geometries.filter(u => ['Tulcea', 'Constanta'].includes(u.properties.name)));
g.coordinates[0][0].forEach((p, i) => { if (p[0] > 28.5 && p[0] < 29.5 && p[1] > 44.2 && p[1] < 45.1) console.log(i, p.map(v => v.toFixed(3)).join(', ')); });"
```

A real lake fully inside the land (a hole) needs no notch entry: step 5 removes it if it is small, and a big one can be
removed by filtering interior rings (see Tuning).

### 4. Winding: keep d3-geo's inside on the inside

d3-geo works on the sphere: a ring's direction decides which side is inside. A shape whose area comes out bigger than a
hemisphere (`geoArea(g) > 2π`) is wound the wrong way and would fill the whole world except itself. `rightWayRound()`
reverses its rings. Run it after every merge (the script does, inside `merged()`), and check any hand-made polygon the
same way.

### 5. Drop small rings

```js
out = filter(out, filterWeight(out, MIN_RING));   // topojson-simplify
```

Removes rings (islands, spits, lagoon holes, slivers) smaller than `MIN_RING`, in square degrees, measured as a planar
ring area. This is what removes the Danube delta's islets and the Budjak's spits, and the 42 km² coastal sliver that
made 1918 two parts.

### 6. Simplify the lines

```js
out = simplify(presimplify(out), SIMPLIFY);       // Visvalingam
```

Each point's weight is the area of the triangle it makes with its neighbours (square degrees); points below `SIMPLIFY`
are dropped. Shared arcs are simplified once (see the rule above). No smoothing pass (Chaikin, splines) runs on these:
the morphing player wants polygons, and Visvalingam already keeps the recognisable shape.

## Tuning

At this map's scale the frame's 10.5° is about 1,000 px wide, so 1° ≈ 100 px and 1 square degree ≈ 10,000 px²
(≈ 8,800 km² at 46° N).

| Constant | Now | Means | Raise it to | Lower it to |
|---|---|---|---|---|
| `MIN_RING` | `0.02` | rings under ≈ 175 km² go | drop bigger islands and lakes | keep more islets |
| `SIMPLIFY` | `0.0015` | corners under ≈ 15 px² go | rougher, rounder shapes | closer to the base coastline |

- Change one at a time, rebuild, look at the delta, the Budjak coast and the Carpathian bend, which show it first.
- Too high a `MIN_RING` can delete a real small province or a state's real island; the smallest province now is Arad
  (≈ 7,750 km², ≈ 0.88 sq°), far above it.
- To drop **every** hole regardless of size (all lakes inside the land), replace the filter with a custom one:
  `filter(out, (ring, interior) => !interior && planarRingArea(ring) >= MIN_RING)` (import `planarRingArea` from
  topojson-simplify).
- Simplified shapes no longer match the detailed coastline drawn under them exactly; near the delta the two part by a
  few pixels. That is expected.

## Check it worked

1. `npm run data:shapes`. The log prints each state's part count before and after (`1918 2 → 1 part(s)`): a coast
   sliver or islet that is gone shows here. File size is printed too (13 KB after this pass, from 37 KB).
2. Check areas and that a filled lagoon is inside its shape:

```bash
node --input-type=module -e "
import { readFileSync } from 'fs'; import { feature } from 'topojson-client'; import { geoArea, geoContains } from 'd3-geo';
const t = JSON.parse(readFileSync('public/data/shapes.topo.json', 'utf8'));
for (const f of feature(t, t.objects.states).features)
  console.log(f.id, (geoArea(f) * 6371 ** 2).toFixed(0) + ' km²', 'Razim inside:', geoContains(f, [28.95, 44.87]));"
```

   Reference areas: 1918 ≈ 295,000 km² (got 296,701 with the lagoons), Bessarabia with the Budjak 44,422 km². An area
   near 510 million km² means a ring is wound the wrong way (step 4).
3. Open `/lessons/shapes` (the lesson 05 preview) and step through the years, zoomed on the coast: no gaps between
   provinces, the outline crosses lagoon mouths in a straight line, one outline per state (three for c. 1400).

## Don't

- Don't simplify blocks and states separately, or simplify after `quantize` with weights in degrees.
- Don't edit `public/data/shapes.topo.json` by hand: it is regenerated; change the script.
- Don't simplify `geography.topo.json` (the base map) for this: the trace tool snaps to its detail.
- Don't use a concave polygon for a cut: Sutherland–Hodgman needs a convex clip.
