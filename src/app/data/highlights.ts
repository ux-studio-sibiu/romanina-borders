import type { PillColour } from './pills-color-palette';

// Words set as pills wherever a moment's story has them, each in its colour (data/pills-color-palette.ts): the lands
// and provinces, and the wars, blue. As written in the stories; a longer one ("Transilvania de Nord") wins over the
// shorter inside it. The people (and a moment's own `names`) are orange, set in charts/moment-caption.
export const HIGHLIGHTS: Record<string, PillColour> = {
  // The lands and provinces
  'Dacia': 'blue',
  'Țara Românească': 'blue',
  'Moldova': 'blue',
  'Transilvania': 'blue',
  'Transilvania de Nord': 'blue',
  'Bucovina': 'blue',
  'Bucovina de Nord': 'blue',
  'Basarabia': 'blue',
  'Dobrogea': 'blue',
  'Cadrilaterul': 'blue',
  // The wars
  'First World War': 'blue',
  'Second World War': 'blue'
};
