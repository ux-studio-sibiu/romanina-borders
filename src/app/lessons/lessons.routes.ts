import { Routes } from '@angular/router';

// One entry per lesson, in order. Each page is its own lazy chunk (≈ next/dynamic).
export const lessonRoutes: Routes = [
  { path: '', loadComponent: () => import('./roadmap/roadmap').then(m => m.Roadmap), title: 'Roadmap' },
  { path: 'setup', loadComponent: () => import('./lesson-setup/lesson-setup').then(m => m.LessonSetup), title: '00 Setup and the projection' },
  { path: 'geography', loadComponent: () => import('./lesson-geography/lesson-geography').then(m => m.LessonGeography), title: '01 Base geography' },
  { path: 'satellite', loadComponent: () => import('./lesson-satellite/lesson-satellite').then(m => m.LessonSatellite), title: '02 Satellite backdrop' },
  { path: 'moments', loadComponent: () => import('./lesson-moments/lesson-moments').then(m => m.LessonMoments), title: '03 The moments' },
  { path: 'trace', loadComponent: () => import('./lesson-trace/lesson-trace').then(m => m.LessonTrace), title: '04 A simple trace tool' },
  { path: 'shapes', loadComponent: () => import('./lesson-shapes/lesson-shapes').then(m => m.LessonShapes), title: '05 The map shapes' },
  { path: 'player', loadComponent: () => import('./lesson-player/lesson-player').then(m => m.LessonPlayer), title: '06 The player' },
  { path: 'time-scale', loadComponent: () => import('./lesson-time-scale/lesson-time-scale').then(m => m.LessonTimeScale), title: '07 The time scale and navigation' }
];
