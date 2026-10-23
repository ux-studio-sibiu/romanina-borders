import { Component, isDevMode } from '@angular/core';
import { MomentsMap } from '../../charts/moments-map/moments-map';
import { BackdropTuner } from '../../tools/backdrop-tuner/backdrop-tuner';

// The product page: the map at a moment of the story, full screen, with the timeline over it (lesson 05)
@Component({
  selector: 'app-map-page',
  imports: [MomentsMap, BackdropTuner],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss'
})
export class MapPage {
  protected readonly isDev = isDevMode();
}
