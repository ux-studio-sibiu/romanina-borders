import { Component, computed, input, output } from '@angular/core';
import { type Moment, yearsAgo } from '../../data/moments';
import { charactersOf } from '../../data/characters';
import { Avatar } from '../avatar/avatar';
import { Pill } from '../pill/pill';
import { pillSentences } from '../pill/pill-text';

// A moment's details, for children, on a paper panel: its years and title, then square bullets: how long ago, and its
// story a sentence at a time, its names as pills (pill-text.ts). A minus in a box, top right, folds it to the title;
// beside it, for a moment with important people (data/characters.ts), a figure in a box shows or hides them, round
// pictures on top of the panel.
@Component({
  selector: 'app-moment-caption',
  imports: [Avatar, Pill],
  templateUrl: './moment-caption.html',
  styleUrl: './moment-caption.scss'
})
export class MomentCaption {
  readonly moment = input.required<Moment>();
  readonly open = input(true);
  readonly openChange = output<boolean>();
  readonly showCharacters = input(true);
  readonly showCharactersChange = output<boolean>();

  protected readonly ago = computed(() => yearsAgo(this.moment().year));
  protected readonly characters = computed(() => charactersOf(this.moment().characters));
  // The parts the panel's width is shared into for them: thirds, or one each when there are more
  protected readonly columns = computed(() => Math.max(3, this.characters().length));
  protected readonly sentences = computed(() => pillSentences(this.moment(), this.characters().map(c => c.name)));
}
