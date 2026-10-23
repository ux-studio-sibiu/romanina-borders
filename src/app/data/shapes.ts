import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type BlockProperties = { name: string; nameRo: string; parts?: string[] }; // parts: a combined block (Transylvania, Bukovina)
export type StateProperties = { label: string; name: string; blocks: string[]; provinces: string[]; lands?: string[] }; // provinces: the blocks to show, halves joined
export type LandProperties = { name: string; blocks: string[] };
export type EmpireProperties = { name: string; at: [number, number] }; // at: where its name goes, [lon, lat]
export type Block = Feature<Polygon | MultiPolygon, BlockProperties> & { id: string };
export type State = Feature<Polygon | MultiPolygon, StateProperties> & { id: string };
export type Land = Feature<Polygon | MultiPolygon, LandProperties> & { id: string };
export type Empire = Feature<Polygon | MultiPolygon, EmpireProperties> & { id: string };
type Objects = { blocks: GeometryCollection<BlockProperties>; states: GeometryCollection<StateProperties>; lands: GeometryCollection<LandProperties>; empires: GeometryCollection<EmpireProperties> };

// Lesson 05: the map shapes built from today's units (scripts/build-shapes.mjs): the historical provinces (blocks) and
// the lands at each moment (states), the countries of a moment that has several side by side (lands), and the empires
// round them (empires), loaded once
@Injectable({ providedIn: 'root' })
export class Shapes {
  private readonly topology = httpResource<Topology<Objects>>(() => 'data/shapes.topo.json');

  readonly blocks = computed(() => this.read<BlockProperties>('blocks') as Block[]);
  readonly states = computed(() => this.read<StateProperties>('states') as State[]);
  readonly lands = computed(() => this.read<LandProperties>('lands') as Land[]);
  readonly empires = computed(() => this.read<EmpireProperties>('empires') as Empire[]);

  private read<P extends object>(key: keyof Objects) {
    const topo = this.topology.value();
    return topo ? (feature(topo, topo.objects[key] as GeometryCollection<P>).features as Feature<Polygon | MultiPolygon, P>[]) : [];
  }
}
