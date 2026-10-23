# Romania's borders

A scroll-driven story of how the borders of the lands of today's Romania changed, from Roman Dacia to 1991. Built like
`../data-viz` (The Carbon Divide), one reviewed lesson at a time: the plan is in [ROADMAP.md](ROADMAP.md), and each
lesson has its own page in the app under `/lessons`.

Angular 21 (standalone, zoneless, signals, no SSR; Node 20), `d3-geo` for the projection, GSAP for transitions and the
scroll story. The paper-and-ink styles are copied in from data-viz (`src/styles.scss`, `src/styles/_paper.scss`), never
linked.

## Run

```bash
npm start
```

Then open http://localhost:4200/ (the map) or http://localhost:4200/lessons (the lessons). `npx ng build` writes the
production build to `dist/`.

## Lesson 00: setup and the projection

The map is a Lambert conformal conic (`d3.geoConicConformal`) with standard parallels 44° and 48° N and central meridian
25° E, fitted to the frame 20°–30.5° E, 43°–48.5° N. Conformal keeps the Carpathian arc's shape; between 42° and 50° N
areas are off by under 0.4%, so territories can still be compared by size. See `/lessons/setup` for the reasoning and
the numbers.
