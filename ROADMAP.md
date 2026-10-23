# Romanian historical borders — roadmap

An animated history picture book for children aged 7 to 10: one big, friendly map of Romania and its neighbours, and
about 18 important moments, from the Dacians to today. Each moment is a sentence or two, an icon, and borders that
morph smoothly into the next. Tap Back / Next, or tap a moment on the timeline. Built like `data-viz`, but much lighter:
simple, roughly traced shapes, not a research atlas.

## Principles

- **Simple, but not wrong.** Details can be rough (fuzzy zones, smoothed edges), but the facts must be right at a child's
  level, and touchy moments (Transylvania, 1940) are told neutrally.
- **Rough zones are fine.** Old borders are drawn as soft, slightly fuzzy shapes. Nobody needs to know where a 14th-century
  border ran to the kilometre.
- **Big and readable.** Large type, big tap targets, one idea per moment.
- **Trace only public-domain maps** (Shepherd's Historical Atlas 1911, Droysen 1886, Kiepert, Wikimedia Commons scans
  marked public domain), and keep a list of which map each shape came from.

## The plan

0. **Set up the app** ✓. Angular + `d3-geo` + GSAP, the paper-and-ink styles copied in from `data-viz`. A regional
   Lambert conformal conic projection centred on Romania.

1. **Base geography** ✓. Natural Earth → TopoJSON: the Black Sea, the coastline, six rivers (Danube, Prut, Dniester, Olt,
   Mureș, Siret, now bold and dark blue) and today's regions of Romania, Moldova, Ukraine, Bulgaria, Hungary and Serbia.
   They're the backdrop, and the building blocks for the modern borders.

2. **Satellite backdrop** ✓ (later rebuilt with the map full bleed, over a bigger area: 16.5°–34° E, 41.2°–50.2° N). A real view of the land under the map, so mountains, plains and the delta show. NASA's Blue
   Marble (public domain, about 500 m a pixel) is cropped to the region and reprojected into the map's projection once,
   by a build script, into one optimised image. The map's land, sea and region layers then sit over it, toned down so the
   history colours stay readable.

3. **The moments.** One content file with 13 moments (few enough for a child; close events share one), each with a
   year, a title, one or two short sentences for children, an icon, and which map shape and empires it shows:
   c. 60 BC the Dacians and King Burebista · 101–271 the Romans in Dacia · 271–1000 the Romans leave, peoples pass
   through · c. 1000 Transylvania in the Kingdom of Hungary · 1330–1359 Wallachia and Moldavia are born · 1400–1504
   Mircea, Vlad and Stephen · 1600 Michael the Brave · 1775–1812 Bukovina and Bessarabia taken · 1859 Cuza and the
   Union · 1877–78 independence and the sea · 1918 the Great Union · 1940 lands lost in the war · today (1989 freedom,
   2007 the EU). Lesson 05's `data/shape-timeline.ts` already lists them, with their shapes.

4. **A simple trace tool** ✓ (built before 3). A dev-only page: drop in a public-domain map image, drag, scale and fade it until it roughly
   lines up with the backdrop, then click around a region to draw a shape. Shapes are smoothed automatically into
   friendly rounded outlines, named, and exported as JSON to commit.

5. **The map shapes** (built from counties ✓, from Roman Dacia to today, four with an edge to adjust; the Dacians to
   trace; the migrations as arrows; the empires round them built too: see the timeline in lesson 05). Built from
   today's counties: Roman Dacia, Transylvania in Hungary, the first Wallachia and Moldavia, c. 1400, 1600, 1812, 1859,
   1878, 1913, 1918, 1940 and today, and eight empires. Traced by hand: the Dacians' lands (a soft zone).

6. **The player.** The map with the moment's shapes in warm colours and soft edges; GSAP and `flubber` morph one moment's
   shapes into the next; icons pop in (a castle, a crown, a sword, the Roman eagle); arrows for the peoples passing
   through.

7. **Navigation and narration.** Big Back / Next buttons, a row of icons along the bottom as the timeline, keyboard and
   swipe; optionally a small narrator (an owl, or the Dacian wolf-dragon banner) and read-aloud text.

8. **Polish and ship.** Readability and touch on tablets, reduced motion, a quick fact check of every moment, a short
   "where these maps come from" page, and deploy.

## Credits to carry

Natural Earth (public domain) · NASA Blue Marble (public domain, credit NASA Earth Observatory) · each traced map, by
title, edition and plate · flubber (MIT).
