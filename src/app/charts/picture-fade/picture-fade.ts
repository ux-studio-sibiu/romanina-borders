import { afterNextRender, Component, computed, input, signal } from '@angular/core';

// A picture in a paper frame that cross-fades to the next one when `picture` changes: the new one fades in over the
// old, which fades out under it. Null: none, the frame fades out too. The picture it starts with shows at once, without
// a fade (it arrives with whatever brings the component in). Pictures of one size (one aspect) swap cleanly; others
// are cropped to the frame's (`aspect`).
//
//   <app-picture-fade [picture]="{ src: 'peoples/huns.webp', alt: '...' }" />
@Component({
  selector: 'app-picture-fade',
  templateUrl: './picture-fade.html',
  styleUrl: './picture-fade.scss',
  host: { '[style.--aspect]': 'aspect()' }
})
export class PictureFade {
  readonly picture = input<{ src: string; alt: string } | null>(null);
  readonly aspect = input('3 / 2');

  // Fading in only once the first render is done
  private readonly settled = signal(false);
  protected readonly enterClass = computed(() => this.settled() ? 'is-entering' : 'is-still');

  constructor() {
    afterNextRender(() => this.settled.set(true));
  }
}
