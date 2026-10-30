import { Component, input } from '@angular/core';

// A pill: a word or a name set in a small rounded box inside running text, like a tag. Its colours are the caller's
// (`colour` the box, `ink` the text, any CSS colour); grey by default.
//
//   <app-pill>Traian</app-pill>   <app-pill colour="#f3d9a4" ink="#5a3b00">Burebista</app-pill>
@Component({
  selector: 'app-pill',
  template: '<span class="nsc-pill"><ng-content /></span>',
  styleUrl: './pill.scss',
  host: { '[style.--pill]': 'colour()', '[style.--pill-ink]': 'ink()' }
})
export class Pill {
  readonly colour = input('#e8e6e1');
  readonly ink = input('var(--fg)');
}
