// Lesson 05: the story's moments (ROADMAP.md step 3) and the map shape each one shows, with how far that shape has got.
// A plan for the shapes, not the story text: lesson 03 writes the moments themselves. Thirteen moments, few enough for a
// child to follow: close events share one (Wallachia's and Moldavia's beginnings, Vlad and Stephen).
//   built:  made from today's counties (scripts/build-shapes.mjs), ready
//   adjust: built, but a stretch of its edge is a county line that should be traced or moved (the note says where)
//   trace:  nothing modern to build it from: draw it in the trace tool (the note says from which reference map)
//   arrows: no border to show: the player draws movement instead (lesson 06)
export type ShapeStatus = 'built' | 'adjust' | 'trace' | 'arrows';

export interface TimelineMoment {
  id: string;
  label: string;       // the year, as on the timeline
  title: string;
  state?: string;      // the shape it shows: a state id in shapes.topo.json
  empires?: string[];  // the empires round or over it: empire ids in shapes.topo.json
  status: ShapeStatus;
  note?: string;
}

export const SHAPE_TIMELINE: TimelineMoment[] = [
  { id: 'dacians', label: 'c. 60 BC', title: 'The Dacians and King Burebista', status: 'trace', note: "Burebista's kingdom, from the middle Danube to the Black Sea coast: trace over map 1 (Spruner 1865), as a soft zone with a feathered edge. It stands for the Getae and Dacians before him too." },
  { id: 'romans', label: '101–271', title: 'The Romans in Dacia', state: '106', empires: ['roman-empire'], status: 'adjust', note: "Trajan's wars against Decebalus, then Roman Dacia. Adjust: its eastern edge east of the Olt (the Limes Transalutanus) is a county line; trace the line of forts over map 1." },
  { id: 'migrations', label: '271–1000', title: 'The Romans leave, peoples pass through', status: 'arrows', note: 'No borders: Goths, Huns, Gepids, Avars, Slavs, Bulgars and Magyars as arrows across a neutral map.' },
  { id: 'hungary', label: 'c. 1000', title: 'Transylvania in the Kingdom of Hungary', state: 'c1000', empires: ['hungary'], status: 'built', note: 'It joined gradually, over the 10th–13th centuries.' },
  { id: 'founding', label: '1330–1359', title: 'Wallachia and Moldavia are born', state: '1359', empires: ['hungary'], status: 'adjust', note: "Basarab's Wallachia (1330) and Bogdan's Moldavia (1359). Adjust: early Moldavia is whole counties (Suceava, Botoșani, Neamț, Chernivtsi); check its southern and eastern edges against a map of c. 1360." },
  { id: 'princes', label: '1400–1504', title: 'Mircea, Vlad and Stephen', state: 'c1400', empires: ['hungary', 'ottoman'], status: 'built', note: 'Mircea the Elder, Vlad the Impaler and Stephen the Great, between Hungary and the Ottomans.' },
  { id: 'michael', label: '1600', title: 'Michael the Brave unites the three lands', state: '1600', empires: ['ottoman-1600'], status: 'built', note: "Simplified: Tighina (Ottoman from 1538) stays in; Ottoman Hungary is whole counties." },
  { id: 'taken', label: '1775–1812', title: 'Bukovina and Bessarabia taken', state: '1812', empires: ['habsburg', 'russian-empire', 'ottoman'], status: 'built' },
  { id: 'union', label: '1859', title: 'Cuza and the Union', state: '1859', empires: ['habsburg', 'russian-empire', 'ottoman'], status: 'adjust', note: 'Adjust: Suceava county, left out with Bukovina, includes a little of old Moldavia; and southern Bessarabia (held 1856–1878) is missing.' },
  { id: 'independence', label: '1877–78', title: 'Independence, and the sea', state: '1878', empires: ['habsburg', 'russian-empire'], status: 'built', note: 'Southern Dobruja follows in 1913 (in the data as its own shape, 1913).' },
  { id: 'great-union', label: '1918', title: 'The Great Union', state: '1918', status: 'built' },
  { id: 'losses', label: '1940', title: 'Lands lost in the war', state: '1940', empires: ['soviet-union', 'hungary-1940'], status: 'adjust', note: 'Adjust: the line given to Hungary ran through Bihor, Cluj and Mureș counties; here they go to the north whole. Trace the 1940 line.' },
  { id: 'today', label: '1989, 2007', title: 'Freedom, and the EU', state: 'today', status: 'built' }
];
