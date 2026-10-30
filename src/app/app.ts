import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Root component: whichever page matches the URL
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
