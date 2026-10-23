import { Routes } from '@angular/router';

// One entry per lesson, in order. Each page is its own lazy chunk (≈ next/dynamic).
export const lessonRoutes: Routes = [
  { path: '', loadComponent: () => import('./roadmap/roadmap').then(m => m.Roadmap), title: 'Roadmap' },
  { path: 'setup', loadComponent: () => import('./lesson-setup/lesson-setup').then(m => m.LessonSetup), title: '00 Setup and the projection' },
  { path: 'geography', loadComponent: () => import('./lesson-geography/lesson-geography').then(m => m.LessonGeography), title: '01 Base geography' },
  { path: 'satellite', loadComponent: () => import('./lesson-satellite/lesson-satellite').then(m => m.LessonSatellite), title: '02 Satellite backdrop' }
];
