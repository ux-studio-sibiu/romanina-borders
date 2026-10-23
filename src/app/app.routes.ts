import { Routes } from '@angular/router';
import { MapPage } from './pages/map/map-page';

// The map lives at '' and ships in the main bundle. Lessons are a lazy route subtree (their own chunks).
export const routes: Routes = [
  { path: '', component: MapPage, title: "Romania's borders" },
  // Lesson 04: the trace tool, a dev page (its reference maps are only served by ng serve)
  { path: 'trace', loadComponent: () => import('./pages/trace/trace-page').then(m => m.TracePage), title: 'Trace' },
  { path: 'lessons', loadChildren: () => import('./lessons/lessons.routes').then(m => m.lessonRoutes) },
  { path: '**', redirectTo: '' }
];
