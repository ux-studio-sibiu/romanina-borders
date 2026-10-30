import { Component } from '@angular/core';
import { MomentsMap } from '../../charts/moments-map/moments-map';

// The product page: the map at a moment of the story, full screen, with the time scale over it
@Component({
  selector: 'app-map-page',
  imports: [MomentsMap],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss'
})
export class MapPage {}
