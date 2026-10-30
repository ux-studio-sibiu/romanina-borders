import type { Moment } from '../../data/moments';
import { HIGHLIGHTS } from '../../data/highlights';
import { PILL_COLOURS } from '../../data/pills-color-palette';

// A piece of a story's sentence: plain text (colour null), or a name to set as a pill in that colour
export type TextPiece = { text: string; colour: string | null };

// A moment's story a sentence at a time, each in pieces: plain text, and pills, each with its colour: the lands,
// provinces and wars (data/highlights.ts), and the people (`people`: its characters' names, and the other names it
// lists), orange. Used by the moment's caption and the intro's cover.
export function pillSentences(moment: Moment, people: string[]): TextPiece[][] {
  const colours = new Map<string, string>(Object.entries(HIGHLIGHTS).map(([text, colour]) => [text, PILL_COLOURS[colour]]));
  for (const name of [...people, ...(moment.names ?? [])]) colours.set(name, PILL_COLOURS.orange);
  // A sentence ends at . ! or ? before any capital, the Romanian ones too (Ș, Ț, Ă...)
  return moment.text.split(/(?<=[.!?])\s+(?=\p{Lu})/u).map(s => pieces(s, colours));
}

// A sentence cut at the names in it, longest first (so "Ștefan cel Mare" before "Ștefan"), each a whole word or words,
// with its pill's colour (null: plain text)
function pieces(sentence: string, colours: Map<string, string>): TextPiece[] {
  if (!colours.size) return [{ text: sentence, colour: null }];
  const escaped = [...colours.keys()].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Not \b: it takes the Romanian letters (Ș, ț, ă...) for word ends; any letter or digit is part of a word here
  return sentence.split(new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'u')).filter(Boolean).map(text => ({ text, colour: colours.get(text) ?? null }));
}
