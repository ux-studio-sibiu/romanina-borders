import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Zoneless is the default since Angular 21: no zone.js, no provideZoneChangeDetection().
// The screen updates only when a signal read by a template changes (or an event marks it dirty).
// No SSR either: everything runs in the browser, so the map can measure the window and GSAP can start without platform checks.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Lesson 01: HttpClient (and httpResource) for the TopoJSON in public/data. withFetch() uses fetch() instead of XHR.
    provideHttpClient(withFetch())
  ]
};
