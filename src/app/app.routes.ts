import { Routes } from '@angular/router';
import { MapPage } from './pages/map/map-page';

// One page: the map, at ''
export const routes: Routes = [
  { path: '', component: MapPage, title: "Romania's borders" },
  { path: '**', redirectTo: '' }
];
