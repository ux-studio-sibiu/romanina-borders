// The pattern tiles, from the randomize-studio texture kit's Hero Patterns (by Steve Schoger, CC BY 4.0): each its own
// size (px) and its drawing, one colour (currentColor, swapped for the fill's own). Another of the kit's 87 is added
// here from its SVG (effects-collection/background-experiments/patterns/): its width, height and the markup inside <svg>.
export const TILES = {
  'diagonal-stripes': { w: 40, h: 40, svg: '<g fill="currentColor" fill-rule="evenodd"><path d="M0 40L40 0H20L0 20M40 40V20L20 40"/></g>' },
  'stripes': { w: 40, h: 1, svg: '<path d="M0 0h20v1H0z" fill="currentColor" fill-rule="evenodd"/>' }
};

// The soft zones drawn with a pattern over their colour, by zone id: one of the tiles above, drawn through a mask of the
// zone's own blurred shape, so it stays crisp inside and fades out at the edge like the colour.
//   name:    the tile
//   scale:   times the tile's own size
//   opacity: how strongly it shows
//   color:   its ink
//   rotate:  the tiles turned, degrees
export interface ZoneFill { name: keyof typeof TILES; scale: number; opacity: number; color: string; rotate: number }

// The Romans' fine red stripes: the Roman Republic at 60 BC, and the Roman Empire in 101 (drawn as a soft zone there:
// moments.ts, softEmpires), so they look the same from one moment to the next
const ROMANS: ZoneFill = { name: 'diagonal-stripes', scale: 0.4, opacity: 0.2, color: '#ff0000', rotate: 0 };

export const ZONE_FILLS: Record<string, ZoneFill> = {
  'roman-republic': ROMANS,
  'roman-empire': ROMANS,
  'celts': { name: 'diagonal-stripes', scale: 0.5, opacity: 0.25, color: '#ffffff', rotate: 135 },
  'bastarnae': { name: 'stripes', scale: 0.6, opacity: 0.15, color: '#ffffff', rotate: 135 }
};
