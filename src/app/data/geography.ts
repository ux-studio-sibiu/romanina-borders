import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type UnitProperties = { name: string; country: string; iso?: string; type?: string };
export type RiverProperties = { name: string; nameRo: string };
type Objects = { units: GeometryCollection<UnitProperties>; neighbours: GeometryCollection<UnitProperties>; rivers: GeometryCollection<RiverProperties>; sea: GeometryCollection };

// What the map draws: shapes to fill, and lines to stroke, each line drawn once
export type BaseGeography = {
  sea: FeatureCollection<Polygon | MultiPolygon>;
  land: FeatureCollection<Polygon | MultiPolygon, UnitProperties>; // Romania's and Moldova's units, then every other country
  coastline: MultiLineString;
  countryBorders: MultiLineString;
  unitBorders: MultiLineString;
  rivers: Feature<MultiLineString, RiverProperties>[];
};

// Loads the map's geography once, for the whole app (providedIn: 'root' ≈ a module-level singleton). Lesson 08: one file
// for every moment, close up or zoomed out to Europe (npm run data:background): the wide extent, Romania's and Moldova's
// counties, every other country one shape, simplified less inside the area than outside it.
@Injectable({ providedIn: 'root' })
export class Geography {
  private readonly topology = httpResource<Topology<Objects>>(() => 'data/background.topo.json');

  readonly isLoading = this.topology.isLoading;
  readonly error = this.topology.error;

  // TopoJSON → GeoJSON. computed() runs this once when the file has arrived, not on every read.
  readonly base = computed(() => toBase(this.topology.value()));
}

function toBase(topo: Topology<Objects> | undefined): BaseGeography | null {
  if (!topo) return null;
  const { units, neighbours, rivers, sea } = topo.objects;
  const polygons = <P extends object>(o: GeometryCollection<P>) => feature(topo, o) as FeatureCollection<Polygon | MultiPolygon, P>;

  // The units and the merged neighbours, as one collection, so mesh() sees the borders between them.
  // mesh(a, b) is called once per arc with the shapes on each side; a === b means there is only one: the arc is a coast
  // (or the far edge of the data, outside the frame).
  const all: GeometryCollection<UnitProperties> = { type: 'GeometryCollection', geometries: [...(units.geometries ?? []), ...neighbours.geometries] };
  const country = (g: { properties?: object }) => (g.properties as UnitProperties | undefined)?.country;

  return {
    sea: polygons(sea),
    land: polygons(all),
    coastline: mesh(topo, all, (a, b) => a === b),
    countryBorders: mesh(topo, all, (a, b) => a !== b && country(a) !== country(b)),
    unitBorders: mesh(topo, { type: 'GeometryCollection', geometries: units.geometries ?? [] }, (a, b) => a !== b && country(a) === country(b)),
    rivers: (feature(topo, rivers) as FeatureCollection<MultiLineString, RiverProperties>).features
  };
}
