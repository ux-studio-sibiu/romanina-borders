import { Component, input } from '@angular/core';

// A round picture with a name under it, on a white label so it reads over any map: for a moment's important people, or
// anything else worth a face. The picture should be square, its subject in the middle (the circle crops the corners).
//
//   <app-avatar src="characters/burebista.webp" alt="..." name="Burebista" />
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  host: { '[style.--avatar-size.px]': 'size()' }
})
export class Avatar {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly name = input.required<string>();
  readonly size = input(96); // the circle's width at most, px (less when its box is narrower)
  readonly showName = input(true); // false: the picture alone (the name still read out, from the picture's alt)
}
