import { Component, computed, input } from '@angular/core';
import type { Moment } from '../../data/moments';
import { charactersOf } from '../../data/characters';
import { Avatar } from '../avatar/avatar';
import { Pill } from '../pill/pill';
import { pillSentences } from '../pill/pill-text';

// The story's cover, for the opening slide (a moment with `intro`): one of a kind, not one of the moments' panels. A
// full-screen layer, a darker veil over the map, and in its middle the title, large, its words a line a sentence, and
// the faces of the people the children will meet, in a row. The parent shows it only on the intro and fades it in and
// out as a whole (its styles: .is-entering, .is-leaving).
@Component({
  selector: 'app-intro-cover',
  imports: [Avatar, Pill],
  templateUrl: './intro-cover.html',
  styleUrl: './intro-cover.scss'
})
export class IntroCover {
  readonly moment = input.required<Moment>();

  protected readonly characters = computed(() => charactersOf(this.moment().characters));
  protected readonly sentences = computed(() => pillSentences(this.moment(), this.characters().map(c => c.name)));
  // The title's last word on a line of its own, much larger; the words before it above
  protected readonly titleLead = computed(() => this.moment().title.replace(/\s*\S+$/, ''));
  protected readonly titleKey = computed(() => this.moment().title.match(/\S+$/)?.[0] ?? '');
}
