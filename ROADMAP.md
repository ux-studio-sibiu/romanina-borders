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

2. **Satellite backdrop** ✓. A real view of the land under the map, so mountains, plains and the delta show. NASA's Blue
   Marble (public domain, about 500 m a pixel) is cropped to the region and reprojected into the map's projection once,
   by a build script, into one optimised image. The map's land, sea and region layers then sit over it, toned down so the
   history colours stay readable.

3. **The moments.** One content file with ~18 moments, each with a year, a title, one or two short sentences for
   children, an icon, and which map shape it shows:
   c. 500 BC the Getae and Dacians · c. 60 BC King Burebista · 101–106 Decebalus and Trajan · 106–271 Roman Dacia ·
   271 the Romans leave · c. 300–900 peoples passing through · c. 1000 Transylvania in the Kingdom of Hungary ·
   1330 Basarab and Wallachia · 1359 Bogdan and Moldavia · 1462 Vlad the Impaler · 1457–1504 Stephen the Great ·
   1600 Michael the Brave · 1775 and 1812 Bukovina and Bessarabia taken · 1859 Cuza and the Union · 1877–78
   independence and the sea · 1918 the Great Union · 1940 lands lost in the war · today (1989 freedom, 2007 the EU).

4. **A simple trace tool** ✓ (built before 3). A dev-only page: drop in a public-domain map image, drag, scale and fade it until it roughly
   lines up with the backdrop, then click around a region to draw a shape. Shapes are smoothed automatically into
   friendly rounded outlines, named, and exported as JSON to commit.

5. **The map shapes.** About 10 shapes cover all 18 moments. Derived from today's regions: 1859, 1878, 1913, 1918, 1940
   and today. Traced by hand, roughly: Dacia (a zone), Roman Dacia, the three principalities around 1400, and Michael the
   Brave's union in 1600.

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
