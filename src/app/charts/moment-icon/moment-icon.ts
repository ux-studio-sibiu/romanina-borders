import { Component, input } from '@angular/core';
import type { MomentIcon as Icon } from '../../data/moments';

// Lesson 06: a moment's icon (data/moments.ts names it), drawn like a picture book's: bold ink outlines, flat colours,
// one 48 × 48 box each. It pops in when it appears (the caption makes a new one for each moment).
@Component({
  selector: 'app-moment-icon',
  templateUrl: './moment-icon.html',
  styleUrl: './moment-icon.scss'
})
export class MomentIcon {
  readonly icon = input.required<Icon>();
  readonly label = input(''); // for screen readers; empty: decorative, next to the moment's title
}
