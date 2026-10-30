# Romania's borders

A short, illustrated history of how the lands of today's Romania changed, from the Dacians to 2007, for history lessons
in primary school. One full-screen map, with an opening cover, then fifteen moments: each shows the lands of its time,
a few sentences for children, the people who mattered as round portraits, and places to click for a picture and a
story. Built like `../data-viz` (The Carbon Divide).

Angular 21 (standalone components, zoneless, signals, no SSR), `d3-geo` for the projection and `topojson-client` for the
map data. The paper-and-ink styles are copied in from data-viz (`src/styles.scss`, `src/styles/_paper.scss`), never
linked.

## Run

```bash
npm start
```

Then open http://localhost:4200/. `npx ng build` writes the production build to `dist/`.

## On the page

- **The intro**: a cover over a darker map, with the title and the main characters. Every load starts here.
- **The moments**: the scroll wheel, the scrollbar at the far right, or a year on the time scale steps through them.
  The details panel slides out and in the way the story moves, and can be folded; the people's portraits can be hidden.
- **271, the peoples passing through**: a play slider draws each migration's arrow on, with a picture of each people.
  The scroll wheel steps through the migrations one at a time.
- **Names**: people, lands and wars in the stories are set as coloured pills.

## Where things are

The content is all in `src/app/data/`, as plain TypeScript:

| File | What it holds |
| --- | --- |
| `moments.ts` | the story: each moment's years, title, text, map, characters, places, spots and arrows |
| `characters.ts` | the people (and the EU flag): name, role, portrait in `public/characters/` |
| `spots.ts` | the places to click: text and pictures in `public/spots/` (made with `npm run picture`, see below) |
| `highlights.ts` | the words set as pills in every story (lands, provinces, wars) |
| `pills-color-palette.ts` | the pills' colours |
| `palette.ts` | the map's colours for provinces, zones, empires and the EU |
| `zone-fills.ts` | the striped patterns over some soft zones, and their tiles |
| `name-places.ts` | names on the map placed or worded by hand |

The page is built from small components in `src/app/charts/`. `moments-map` puts the page together. `region-map`
draws the map, with its geometry, arrows, canvases and zooms in their own files beside it. The rest are reusable
pieces: `slide-swap`, `step-scrollbar`, `play-slider`, `picture-fade`, `avatar` and `pill`.

The map data in `public/data/` is built by the scripts in `scripts/` (`npm run data:geography`, `data:satellite`,
`data:shapes`, `data:background`, `data:wide`, `data:favicon`). `.claude/skills/smooth-borders` explains how the shapes
are kept simple and gap-free.

A spot's pictures go into `public/spots/` through `scripts/spot-picture.mjs`, so they are all sized and compressed the same
(1000px on the long side at most, WebP at quality 75):

```bash
npm run picture -- bran-old=path/to/engraving.jpg bran-today=path/to/photo.jpg --same
```

`--same` crops a spot's pictures to one 3:2 size, so switching between them moves nothing; `--shrink` brings any
larger picture already in `public/spots/` down to size.

## The projection

The map is a Lambert conformal conic (`d3.geoConicConformal`) with standard parallels 44° and 48° N and central meridian
25° E, fitted to the frame 20°–30.5° E, 43°–48.5° N. Conformal keeps the Carpathian arc's shape; between 42° and 50° N
areas are off by under 0.4%, so territories can still be compared by size.

## Pictures

Most portraits and the migrations' pictures have no credit line yet. Check each one's source and licence before
publishing.
