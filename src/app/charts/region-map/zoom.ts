import type { Camera } from './plane';

// The zoom between two views: the drawings' layers moved with the camera, the copy of the old ones kept to fade out
// (held layers), and the camera eased from one view to the next.

// A drawing layer's transform: what was drawn for camera `at`, moved to where `camera` puts it
export function relative(camera: Camera, at: Camera) {
  const r = camera.k / at.k;
  return `matrix(${r}, 0, 0, ${r}, ${camera.x - r * at.x}, ${camera.y - r * at.y})`;
}

// A drawing layer's content, as markup: its <defs> and each drawing apart (its markup is also how it is told from the
// next moment's: the same markup, the same drawing), and the ids in it, to rename in the copy (renamed()). The arrows
// and their names are drawn on by Web Animations, which markup doesn't keep: their state now (how much of each
// is drawn, how strongly it shows) is written on them for the copy, then taken off again, so the copy doesn't flash
// every arrow at once.
export type HeldLayer = { classes: string; opacity: number; defs: string; pieces: string[]; ids: string[] };
export function heldLayer(svg: SVGSVGElement): HeldLayer {
  const animated = [...svg.querySelectorAll<SVGElement>('.arrow-reveal, path.arrow, .arrow-label')];
  const styles = animated.map(e => e.getAttribute('style'));
  for (const e of animated) {
    const css = getComputedStyle(e);
    e.style.opacity = css.opacity;
    if (e.classList.contains('arrow-reveal')) e.style.strokeDashoffset = css.strokeDashoffset;
  }
  const children = [...svg.children];
  const layer = {
    classes: svg.getAttribute('class') ?? '', opacity: Number(getComputedStyle(svg).opacity),
    defs: children.filter(e => e.tagName === 'defs').map(e => e.outerHTML).join(''),
    pieces: pieces(svg), ids: [...svg.querySelectorAll('[id]')].map(e => e.id)
  };
  animated.forEach((e, i) => styles[i] === null ? e.removeAttribute('style') : e.setAttribute('style', styles[i]!));
  return layer;
}
// A layer's drawings, each as its markup (not its <defs>)
export function pieces(svg: SVGSVGElement) { return [...svg.children].filter(e => e.tagName !== 'defs').map(e => e.outerHTML); }

// Markup with every id (and every url(#id) or #id pointing at one) renamed, so the copy keeps its own patterns, filters
// and masks beside the new drawings'
export function renamed(html: string, ids: string[]) {
  for (const id of ids) html = html.replace(new RegExp(`(id="|#)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["')&])`, 'g'), `$1${id}-held`);
  return html;
}

// The zoom's easing, and the camera that far from one view to the next. In and out, sine: gentler than a cubic, whose
// long slow end (its last fifth of the time for 3% of the way) made the zoom seem to drag as it landed
export function ease(t: number) { return (1 - Math.cos(Math.PI * t)) / 2; }
export function between(a: Camera, b: Camera, e: number): Camera {
  const k = a.k ** (1 - e) * b.k ** e, f = Math.abs(b.k - a.k) < 1e-9 * b.k ? e : (k - a.k) / (b.k - a.k);
  return { k, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
