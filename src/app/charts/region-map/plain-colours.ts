import { EU_COLOUR } from '../../data/palette';

// The plain map's colours (the European Union, 2007): the members' blue, the candidates' lighter blue, the halo behind
// the countries' names, the borders, and the land outside the Union
export interface PlainColours {
  members: string; // the members' fill
  joining: string; // the fill of the countries on their way in: lighter, plainly not a member
  halo: string;    // the halo behind their names
  borders: string; // the country borders
  outside: string; // the land outside the Union
}

export const PLAIN_COLOURS: PlainColours = { members: EU_COLOUR, joining: '#a9bede', halo: '#ffffff', borders: '#7d8590', outside: '#fbf8f1' };
