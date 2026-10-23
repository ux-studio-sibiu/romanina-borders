import { httpResource } from '@angular/common/http';
import { effect, Injectable, signal } from '@angular/core';
import { geoArea } from 'd3-geo';
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
import { frame, regionProjection } from '../../charts/region-map/region-map';

// Lesson 04: the trace tool's data. A shape is a list of control points in [lon, lat]: what you clicked, independent of
// the window's size. The friendly rounded outline is computed from them (smoothRing), never stored as the truth.
export interface TraceShape {
  id: string;
  name: string;
  source: string;       // the reference map it was traced from, for the credits
  points: Position[];   // control points, [lon, lat]
  closed: boolean;      // false while it is being drawn
  smooth: boolean;      // rounded (Catmull-Rom) or straight edges
  hidden?: boolean;
}

// Where a reference map sits over the map, in units of the frame's width, so it stays put when the window is resized:
// its centre (from the frame box's top-left corner), its width, a vertical stretch, a rotation and an opacity.
export interface Alignment { cx: number; cy: number; width: number; stretch: number; rotate: number; opacity: number; }
export const ALIGN_DEFAULTS: Alignment = { cx: 0.5, cy: 0.37, width: 1, stretch: 1, rotate: 0, opacity: 0.6 };

// The public-domain maps in reference-maps/ (see its SOURCES.md), served in development only (angular.json)
export const REFERENCE_MAPS = [
  { file: '1-dacia-spruner-1865.jpg', label: 'Dacia · Spruner 1865' },
  { file: '2-southeast-europe-1355-shepherd.jpg', label: 'c. 1355 · Shepherd' },
  { file: '3-ottoman-empire-1451-1481-shepherd.jpg', label: '1451–1481 · Shepherd' },
  { file: '4-balkans-ottoman-until-1699-droysen.jpg', label: 'until 1699 · Droysen' }
];

const SHAPES_KEY = 'romanianBorders.traceShapes';
const ALIGN_KEY = 'romanianBorders.traceAlignments';

// Shapes and alignments, kept in localStorage so a tracing session survives a reload. Export writes the shapes file to
// commit; Copy puts the alignments on the clipboard, to paste into public/data/trace-alignments.json.
@Injectable({ providedIn: 'root' })
export class TraceStore {
  readonly shapes = signal<TraceShape[]>(read(SHAPES_KEY, []));
  readonly alignments = signal<Record<string, Alignment>>(read(ALIGN_KEY, {})); // this browser's, over the committed ones
  // The committed alignments: where each map starts, in any browser. Missing (a 404) is fine: the defaults then.
  private readonly committed = httpResource<Record<string, Alignment>>(() => 'data/trace-alignments.json');

  constructor() {
    effect(() => write(SHAPES_KEY, this.shapes()));
    effect(() => write(ALIGN_KEY, this.alignments()));
  }

  update(id: string, change: Partial<TraceShape> | ((s: TraceShape) => Partial<TraceShape>)) {
    this.shapes.update(all => all.map(s => s.id === id ? { ...s, ...(typeof change === 'function' ? change(s) : change) } : s));
  }
  add(shape: TraceShape) { this.shapes.update(all => [...all, shape]); }
  remove(id: string) { this.shapes.update(all => all.filter(s => s.id !== id)); }

  alignment(source: string): Alignment { return { ...ALIGN_DEFAULTS, ...this.committed.value()?.[source], ...this.alignments()[source] }; }

  // A change is kept in this browser; null (Reset) drops it, back to the committed alignment
  align(source: string, change: Partial<Alignment> | null) {
    this.alignments.update(all => {
      const { [source]: _, ...rest } = all;
      return change ? { ...all, [source]: { ...this.alignment(source), ...change } } : rest;
    });
  }

  // Every map's alignment, committed and local together, rounded: the JSON to commit
  allAlignments() {
    const sources = new Set([...Object.keys(this.committed.value() ?? {}), ...Object.keys(this.alignments())]);
    const round = (a: Alignment) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, +v.toFixed(4)])) as unknown as Alignment;
    return Object.fromEntries([...sources].map(s => [s, round(this.alignment(s))]));
  }
}

// --- Smoothing --------------------------------------------------------------------------------------------------------

// Smoothing happens in the map's own projection at a fixed size, so the curve is the same at any window size, and a
// degree of longitude isn't treated as a degree of latitude (at 46° N it is only 0.7 as long).
const reference = regionProjection().fitWidth(2000, frame);

// The closed, rounded outline through the control points: a centripetal Catmull-Rom spline, which passes through every
// point (unlike a B-spline) and, centripetal, never loops or overshoots between close points. `perSegment` points are
// sampled between each pair of control points. With smooth off, the straight polygon.
export function outline(shape: Pick<TraceShape, 'points' | 'smooth'>, perSegment = 8): Position[] {
  const { points } = shape;
  if (!shape.smooth || points.length < 3) return points;
  const p = points.map(pt => reference(pt as [number, number]) ?? [0, 0]);
  const n = p.length, out: Position[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    for (let k = 0; k < perSegment; k++) out.push(reference.invert!(catmullRom(p0, p1, p2, p3, k / perSegment)) ?? [0, 0]);
  }
  return out;
}

// One point on the centripetal Catmull-Rom segment between p1 and p2, at u (0–1): the Barry–Goldman pyramid
function catmullRom(p0: number[], p1: number[], p2: number[], p3: number[], u: number): [number, number] {
  const knot = (a: number[], b: number[]) => Math.max(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])), 1e-6); // alpha 0.5
  const t1 = knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
  const t = t1 + u * (t2 - t1);
  const mix = (a: number[], b: number[], ta: number, tb: number) => [0, 1].map(i => ((tb - t) * a[i] + (t - ta) * b[i]) / (tb - ta));
  const a1 = mix(p0, p1, 0, t1), a2 = mix(p1, p2, t1, t2), a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, 0, t2), b2 = mix(a2, a3, t1, t3);
  const c = mix(b1, b2, t1, t2);
  return [c[0], c[1]];
}

// The outline as a GeoJSON polygon d3-geo can fill. d3-geo works on the sphere, where a ring's direction decides which
// side is inside: drawn the "wrong" way round, the polygon is the whole globe except the shape. So if its area is more
// than a hemisphere (2π steradians), the ring is turned round.
export function toPolygon(ring: Position[]): Polygon {
  const closed = [...ring, ring[0]];
  const polygon: Polygon = { type: 'Polygon', coordinates: [closed] };
  return geoArea(polygon) > 2 * Math.PI ? { type: 'Polygon', coordinates: [[...closed].reverse()] } : polygon;
}

// --- The file ---------------------------------------------------------------------------------------------------------

type ShapeProperties = Omit<TraceShape, 'points' | 'closed' | 'hidden'> & { points: Position[] };

// GeoJSON, so the player (and any GIS tool) reads it directly: the rounded outline as the geometry, to 3 decimals
// (about 100 m, far finer than a hand trace), and the control points in properties, so a shape can be imported and
// edited again. Shapes still being drawn are left out.
export function toFeatureCollection(shapes: TraceShape[]): FeatureCollection<Polygon, ShapeProperties> {
  const round = (p: Position) => [+p[0].toFixed(3), +p[1].toFixed(3)];
  return {
    type: 'FeatureCollection',
    features: shapes.filter(s => s.closed && s.points.length >= 3).map(s => ({
      type: 'Feature',
      properties: { id: s.id, name: s.name, source: s.source, smooth: s.smooth, points: s.points.map(round) },
      geometry: { type: 'Polygon', coordinates: toPolygon(outline(s)).coordinates.map(r => r.map(round)) }
    }))
  };
}

export function fromFeatureCollection(json: FeatureCollection<Polygon, Partial<ShapeProperties>>): TraceShape[] {
  return json.features.map((f: Feature<Polygon, Partial<ShapeProperties>>) => ({
    id: f.properties?.id ?? newId(),
    name: f.properties?.name ?? 'Imported',
    source: f.properties?.source ?? '',
    smooth: f.properties?.smooth ?? false,
    points: f.properties?.points ?? f.geometry.coordinates[0].slice(0, -1),
    closed: true
  }));
}

export function newId() { return Math.random().toString(36).slice(2, 8); }

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fallback; } catch { return fallback; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not kept: fine */ } }
