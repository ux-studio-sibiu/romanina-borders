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
  land: FeatureCollection<Polygon | MultiPolygon, UnitProperties>; // the six countries' units, then the merged neighbours
  coastline: MultiLineString;
  countryBorders: MultiLineString;
  unitBorders: MultiLineString;
  rivers: Feature<MultiLineString, RiverProperties>[];
};

// Loads lesson 01's file once, for the whole app (providedIn: 'root' ≈ a module-level singleton)
@Injectable({ providedIn: 'root' })
export class Geography {
  private readonly topology = httpResource<Topology<Objects>>(() => 'data/geography.topo.json');

  readonly isLoading = this.topology.isLoading;
  readonly error = this.topology.error;

  // TopoJSON → GeoJSON. computed() runs this once when the file has arrived, not on every read.
  readonly base = computed<BaseGeography | null>(() => {
    const topo = this.topology.value();
    if (!topo) return null;
    const { units, neighbours, rivers, sea } = topo.objects;
    const polygons = <P extends object>(o: GeometryCollection<P>) => feature(topo, o) as FeatureCollection<Polygon | MultiPolygon, P>;

    // The six countries' units and the merged neighbours, as one collection, so mesh() sees the borders between them.
    // mesh(a, b) is called once per arc with the shapes on each side; a === b means there is only one: the arc is a coast
    // (or the far edge of the data, outside the frame).
    const all: GeometryCollection<UnitProperties> = { type: 'GeometryCollection', geometries: [...units.geometries, ...neighbours.geometries] };
    const country = (g: { properties?: object }) => (g.properties as UnitProperties | undefined)?.country;

    return {
      sea: polygons(sea),
      land: polygons(all),
      coastline: mesh(topo, all, (a, b) => a === b),
      countryBorders: mesh(topo, all, (a, b) => a !== b && country(a) !== country(b)),
      unitBorders: mesh(topo, units, (a, b) => a !== b && country(a) === country(b)),
      rivers: (feature(topo, rivers) as FeatureCollection<MultiLineString, RiverProperties>).features
    };
  });
}
