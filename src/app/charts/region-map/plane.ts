import { geoConicConformal, geoGraticule, geoPath } from 'd3-geo';
import region from '../../data/region.json';

// The map's fixed geometry, shared by the region map, its canvases and its zooms: the area it shows, the projection, and
// the plane the background is drawn on once, for every moment.

// A box to fit instead of the core, in [lon, lat]: a moment's own view
export type Extent = [[number, number], [number, number]];

// From data/region.json, shared with the build scripts. The core: from the Tisza plain to the Dniester's mouth, the
// Balkan range to Galicia; every state of the story is inside it, and the map is fitted so it is always fully in view,
// whatever the window's shape. The area: the core and about a fifth more on every side, the detailed satellite
// picture's extent. The map runs full bleed: whatever the window shows beyond the core is still map.
export const CORE = region.core as Extent;
export const REGION = region.area as Extent;
export const PAD = 16; // the core's least distance from the window's edges

// An extent as a polygon: two parallels and two meridians. In a conic projection it isn't a rectangle: the meridians are
// straight and lean together towards the north, the parallels are arcs. precision(0.25): a vertex every quarter degree
// along the parallels. d3 joins vertices with great-circle arcs, not parallels, so at the default 2.5° the top and
// bottom edges would show kinks.
export const outline = (extent: Extent) => geoGraticule().extent(extent).precision(0.25).outline();
export const core = outline(CORE);
// The area's box: the plane (below) is fitted to it
const frame = outline(REGION);

// Whether a view reaches past the detailed area (it needs the wide satellite picture, and shows no county lines)
export function needsWide(view: Extent | null | undefined) {
  return !!view && (view[0][0] < REGION[0][0] || view[0][1] < REGION[0][1] || view[1][0] > REGION[1][0] || view[1][1] > REGION[1][1]);
}
// The map's projection, before it is fitted to a size
export const regionProjection = () => geoConicConformal().parallels(region.projection.parallels as [number, number]).rotate(region.projection.rotate as [number, number]);

// The plane. The background (the satellite pictures, the land, every line) is drawn in one fixed projection,
// the area 1000 units wide, once, for every moment. A view is only a camera over it: a scale k and an offset x, y (a
// point at P on the plane is at k·P + (x, y) on screen). Every view's projection is this one scaled and moved, so the
// camera from one view to the next is exact, and the zoom between them is the camera eased from one to the other.
export const PLANE = regionProjection().fitWidth(1000, frame);
export type Camera = { k: number; x: number; y: number };

// The two satellite pictures, each placed over its extent's box on the plane: the wide one (the Roman world)
// under the detailed one (the area), whose edge is feathered over `inset` degrees, so the two meet without a seam
export const PICTURES = [
  { src: 'data/satellite-wide.webp', extent: region.wideSatellite as Extent, inset: 1 },
  { src: 'data/satellite.webp', extent: REGION, inset: 0.6 }
].map(p => {
  const [[x0, y0], [x1, y1]] = geoPath(PLANE).bounds(outline(p.extent));
  return { ...p, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
});
export type Picture = typeof PICTURES[number];

// How the background looks: over the satellite picture, on paper, or the plain stylized map (blue water,
// no rivers: the European Union). `units`: how strongly the county lines show (none on a view past the area).
export type Look = 'satellite' | 'paper' | 'plain';
export type Scene = { look: Look; units: number };
