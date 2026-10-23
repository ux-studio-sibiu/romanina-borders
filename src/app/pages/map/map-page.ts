import { Component, inject } from '@angular/core';
import { RegionMap } from '../../charts/region-map/region-map';
import { Geography } from '../../data/geography';
import { BackdropTuner } from '../../tools/backdrop-tuner/backdrop-tuner';

// The product page: the regional map, full screen. Lesson 01: with today's geography (sea, land, units, rivers).
@Component({
  selector: 'app-map-page',
  imports: [RegionMap, BackdropTuner],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss'
})
export class MapPage {
  protected readonly geography = inject(Geography);
}
