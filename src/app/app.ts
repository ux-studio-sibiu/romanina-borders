import { Component, isDevMode } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Root component: a few floating links, then whichever page matches the URL.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly isDev = isDevMode(); // the Trace link: a dev tool, left out of production builds
}
