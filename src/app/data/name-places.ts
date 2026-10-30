// Where a name sits on the map, by the id of what it names (a province, a soft zone, an empire, a land taken), in
// [lon, lat]: placed by hand. A name not listed here sits at its land's centre (an
// empire: at its own at).
export const NAME_PLACES: Record<string, [number, number]> = {
  'burebista': [25.86, 45],
  'roman-republic': [21.37, 40.85],
  'celts': [16.45, 46.77],
  'scythians': [34.13, 45.51],
  'bastarnae': [26.08, 49.33],
  'roman-dacia': [24.26, 46.52],
  'roman-empire': [22.44, 42.3],
  'transylvania-banat': [23.27, 46.6],
  'hungary': [20.78, 47.23],
  'habsburg': [23.34, 46.77],
  'ottoman': [23.79, 43.23],
  'lost-bessarabia-all': [28.59, 47.01],
  'dobruja': [28.41, 44.64]
};

// A name written by hand, by the same ids: its words and where its lines break (\n), instead of the land's own name split
// in two when long
export const NAME_TEXTS: Record<string, string> = {
  'roman-dacia': 'Dacia\nromană'
};
