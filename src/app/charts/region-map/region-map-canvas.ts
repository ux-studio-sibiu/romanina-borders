import { geoPath } from 'd3-geo';
import type { BackdropStyle } from './backdrop-style';
import type { PlainColours } from './plain-colours';
import { type Look, outline, type Picture, PLANE } from './plane';

// Painting the map's background on its canvases, from the plane: the land and the sea, the lines over them, and the
// satellite pictures with their edges feathered

export type Transform = [number, number, number, number, number, number];
export type Layers = { sea: Path2D; land: Path2D; units: Path2D; countries: Path2D; coast: Path2D; rivers: Path2D; danube: Path2D };

// The colours the styles share, read once from the page's custom properties
export function readTokens(el: Element) {
  const css = getComputedStyle(el), v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { ink: v('--ink', '#141414'), river: v('--river', '#1b3a73'), muted: v('--muted', '#6b6862'), tint: v('--tint', '#f2f1ed'), surface: v('--surface', '#ffffff'), water: v('--water', '#d6e8f6') };
}
export type Tokens = ReturnType<typeof readTokens>;

// A canvas at the window's size in device pixels, cleared
export function clear(canvas: HTMLCanvasElement, w: number, h: number) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

// The land and the sea. Over the satellite picture only a light white veil on the land, so the history
// colours stay readable; on paper the land white and the sea a faint tint; on the plain map all the water blue (behind
// the land too: the Black Sea is the only sea the data has as a shape) and the land paper
export function drawBase(ctx: CanvasRenderingContext2D, look: Look, layers: Layers, at: Transform, tokens: Tokens, style: BackdropStyle, plain: PlainColours, w: number, h: number) {
  if (look === 'plain') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = tokens.water; ctx.fillRect(0, 0, w, h); }
  ctx.setTransform(...at);
  if (look === 'paper') { ctx.fillStyle = tokens.tint; ctx.fill(layers.sea); }
  ctx.fillStyle = look === 'plain' ? plain.outside : look === 'paper' ? tokens.surface : white(style.veil);
  ctx.fill(layers.land);
}

// The lines, from thinnest to heaviest, so a river or a country border is never hidden under a county
// line; their widths in screen pixels, the same at every zoom. Weight says what a line is: county hairlines, rivers bold
// and dark blue (the one colour water gets), the Danube heavier still, country borders the atlas dash-dot, so where one
// runs along a river (the Prut, the Danube) the two still read apart. Over the satellite picture the lines get pale
// halos (ink and dark blue alone would sink into the forest green); on the plain map no rivers, the borders thin grey.
export function drawLines(ctx: CanvasRenderingContext2D, look: Look, layers: Layers, at: Transform, k: number, tokens: Tokens, style: BackdropStyle, plainColours: PlainColours, units: number) {
  ctx.setTransform(...at);
  ctx.lineJoin = 'round';
  const line = (path: Path2D, colour: string, width: number, dash?: number[]) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width / k;
    ctx.lineCap = dash ? 'butt' : 'round';
    ctx.setLineDash(dash ? dash.map(d => d / k) : []);
    ctx.stroke(path);
  };
  const satellite = look === 'satellite', plain = look === 'plain';
  if (units > 0) {
    ctx.globalAlpha = units;
    line(layers.units, satellite ? white(style.counties) : tokens.muted, satellite ? 0.5 : 0.4);
    ctx.globalAlpha = 1;
  }
  if (!plain) {
    if (satellite) { line(layers.rivers, white(style.halo), 4); line(layers.danube, white(style.halo), 5.6); }
    line(layers.rivers, tokens.river, 2);
    line(layers.danube, tokens.river, 3.2);
  }
  line(layers.countries, plain ? plainColours.borders : tokens.ink, plain ? 0.8 : satellite ? 1.6 : 1.2, plain ? undefined : [7, 2.5, 1.5, 2.5]);
  line(layers.coast, plain ? '#5b7a99' : satellite ? white(style.coast) : tokens.ink, plain ? 0.8 : 1);
}

function white(alpha: number) { return `rgb(255 255 255 / ${alpha})`; }

// A satellite picture with its edge feathered: kept only inside its extent shrunk by `inset` degrees,
// blurred over as many again, so it fades out by its own edge. The blur is a shadow's (canvas filters aren't in every
// browser): the shrunk extent is filled far off the canvas, and only its blurred shadow, moved back, lands on it. Once
// per address, for every map.
const featheredPictures = new Map<string, Promise<HTMLCanvasElement | null>>();
export function feathered(p: Picture) {
  if (!featheredPictures.has(p.src)) featheredPictures.set(p.src, (async () => {
    const image = new Image();
    image.src = p.src;
    await image.decode();
    const w = image.naturalWidth, h = image.naturalHeight, sx = w / p.box.width, sy = h / p.box.height;
    const perDegree = Math.abs(PLANE([25, 45])![1] - PLANE([25, 46])![1]) * sy, blur = p.inset * perDegree, off = w + 4 * blur;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const [[x0, y0], [x1, y1]] = p.extent, i = p.inset;
    ctx.setTransform(sx, 0, 0, sy, off - p.box.x * sx, -p.box.y * sy);
    ctx.shadowColor = '#000';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = -off;
    ctx.beginPath();
    geoPath(PLANE, ctx)(outline([[x0 + i, y0 + i], [x1 - i, y1 - i]]));
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(image, 0, 0);
    return canvas;
  })().catch(() => null));
  return featheredPictures.get(p.src)!;
}
