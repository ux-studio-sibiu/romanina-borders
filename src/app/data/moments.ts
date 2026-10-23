// The story: thirteen moments, few enough for a child (7–10) to follow, close events sharing one (Wallachia's and
// Moldavia's beginnings; Mircea, Vlad and Stephen). Each has its year, a title, a sentence or two for children, an icon
// for the player to draw (lesson 06), and the map it shows (lesson 05): the state and the empires round it, with how far
// that shape has got. Lesson 03 wrote the words and checked the facts; lesson 05 built the shapes.
//
// How the words are written: short sentences, one idea each, the names a child will meet again (Decebalus, Stephen the
// Great), no gore (Vlad is "Vlad III", not by his nickname), and the touchy moments (Transylvania in Hungary, 1918,
// 1940) told as what happened, without blame.
//
// A shape's status:
//   built:  made from today's counties (scripts/build-shapes.mjs), ready
//   adjust: built, but a stretch of its edge is a county line that should be traced or moved (the note says where)
//   trace:  nothing modern to build it from: draw it in the trace tool (the note says from which reference map)
//   arrows: no border to show: the player draws movement instead (lesson 06)
export type ShapeStatus = 'built' | 'adjust' | 'trace' | 'arrows';

// The icons the player will draw (lesson 06); here only their names
export type MomentIcon = 'wolf-banner' | 'eagle' | 'horse' | 'crown' | 'castle' | 'shield' | 'sword' | 'map' | 'hands' | 'flag' | 'storm' | 'star';

export interface Moment {
  id: string;
  label: string;       // the years, as on the timeline
  year: number;        // the moment's year, for "about … years ago" (BC as negative)
  title: string;
  text: string;        // for children: one or two short sentences
  icon: MomentIcon;
  state?: string;      // the shape it shows: a state id in shapes.topo.json
  empires?: string[];  // the empires round or over it: empire ids in shapes.topo.json
  status: ShapeStatus;
  note?: string;       // what is left to do on its shape
}

export const MOMENTS: Moment[] = [
  {
    id: 'dacians', label: 'c. 60 BC', year: -60, title: 'The Dacians and King Burebista', icon: 'wolf-banner',
    text: 'Long ago, the Dacians lived in the mountains and valleys round the Carpathians. Around 60 BC, King Burebista brought their tribes together into one big, strong kingdom.',
    status: 'trace', note: "Burebista's kingdom, from the middle Danube to the Black Sea coast: trace over map 1 (Spruner 1865), as a soft zone with a feathered edge. It stands for the Getae and Dacians before him too."
  },
  {
    id: 'romans', label: '101–271', year: 106, title: 'The Romans in Dacia', icon: 'eagle',
    text: 'The Roman emperor Trajan fought two wars against the Dacian king Decebalus. In 106 the Romans won, and much of Dacia became part of the Roman Empire for about 165 years. Romanian comes from Latin, the language the Romans spoke.',
    state: '106', empires: ['roman-empire'],
    status: 'adjust', note: 'Adjust: its eastern edge east of the Olt (the Limes Transalutanus) is a county line; trace the line of forts over map 1.'
  },
  {
    id: 'migrations', label: '271–1000', year: 271, title: 'The Romans leave, peoples pass through', icon: 'horse',
    text: 'Around 271 the Roman army left Dacia, but many people stayed. For hundreds of years, peoples on the move, Goths, Huns, Avars, Slavs and others, passed through these lands.',
    status: 'arrows', note: 'No borders: Goths, Huns, Gepids, Avars, Slavs, Bulgars and Magyars as arrows across a neutral map.'
  },
  {
    id: 'hungary', label: 'c. 1000', year: 1000, title: 'Transylvania in the Kingdom of Hungary', icon: 'crown',
    text: 'Step by step, Transylvania became part of the Kingdom of Hungary. Romanians, Hungarians and, later, Saxons who came from Germany all lived there together.',
    state: 'c1000', empires: ['hungary'],
    status: 'built', note: 'It joined gradually, over the 10th–13th centuries.'
  },
  {
    id: 'founding', label: '1330–1359', year: 1330, title: 'Wallachia and Moldavia are born', icon: 'castle',
    text: 'In 1330, Prince Basarab won a great battle at Posada, and Wallachia became a free country. In 1359, Bogdan made Moldavia free too.',
    state: '1359', empires: ['hungary'],
    status: 'adjust', note: "Basarab's Wallachia (1330) and Bogdan's Moldavia (1359). Adjust: early Moldavia is whole counties (Suceava, Botoșani, Neamț, Chernivtsi); check its southern and eastern edges against a map of c. 1360."
  },
  {
    id: 'princes', label: '1400–1504', year: 1457, title: 'Mircea, Vlad and Stephen', icon: 'shield',
    text: 'Brave princes like Mircea the Elder, Vlad III and Stephen the Great defended their lands against the mighty Ottoman Empire. Stephen built many churches and monasteries, and you can still visit them today.',
    state: 'c1400', empires: ['hungary', 'ottoman'],
    status: 'built', note: 'Mircea the Elder, Vlad the Impaler and Stephen the Great, between Hungary and the Ottomans.'
  },
  {
    id: 'michael', label: '1600', year: 1600, title: 'Michael the Brave unites the three lands', icon: 'sword',
    text: 'In 1600, Michael the Brave became prince of Wallachia, Transylvania and Moldavia all at once. It was the first time the three lands had one ruler, though only for a few months.',
    state: '1600', empires: ['ottoman-1600'],
    status: 'built', note: 'Simplified: Tighina (Ottoman from 1538) stays in; Ottoman Hungary is whole counties.'
  },
  {
    id: 'taken', label: '1775–1812', year: 1812, title: 'Bukovina and Bessarabia taken', icon: 'map',
    text: 'Big empires took pieces of Moldavia: Austria took Bukovina in 1775, and Russia took Bessarabia in 1812.',
    state: '1812', empires: ['habsburg', 'russian-empire', 'ottoman'],
    status: 'built'
  },
  {
    id: 'union', label: '1859', year: 1859, title: 'Cuza and the Union', icon: 'hands',
    text: 'In 1859, Moldavia and Wallachia both chose the same prince, Alexandru Ioan Cuza. The two countries joined into one, soon called Romania.',
    state: '1859', empires: ['habsburg', 'russian-empire', 'ottoman'],
    status: 'adjust', note: 'Adjust: Suceava county, left out with Bukovina, includes a little of old Moldavia; and southern Bessarabia (held 1856–1878) is missing.'
  },
  {
    id: 'independence', label: '1877–78', year: 1877, title: 'Independence, and the sea', icon: 'flag',
    text: 'In 1877, Romania said it was free from the Ottoman Empire, and it won its independence in a war. It also got Dobruja, and with it the Black Sea coast.',
    state: '1878', empires: ['habsburg', 'russian-empire'],
    status: 'built', note: 'Southern Dobruja follows in 1913 (in the data as its own shape, 1913).'
  },
  {
    id: 'great-union', label: '1918', year: 1918, title: 'The Great Union', icon: 'flag',
    text: 'At the end of the First World War, in 1918, Bessarabia, Bukovina and Transylvania voted to join Romania. Romania was bigger than ever before, and its national day, 1 December, remembers it.',
    state: '1918',
    status: 'built'
  },
  {
    id: 'losses', label: '1940', year: 1940, title: 'Lands lost in the war', icon: 'storm',
    text: 'In 1940, during the Second World War, Romania had to give up lands: Bessarabia and northern Bukovina to the Soviet Union, northern Transylvania to Hungary, and Southern Dobruja to Bulgaria. Northern Transylvania came back after the war.',
    state: '1940', empires: ['soviet-union', 'hungary-1940'],
    status: 'adjust', note: 'Adjust: the line given to Hungary ran through Bihor, Cluj and Mureș counties; here they go to the north whole. Trace the 1940 line.'
  },
  {
    id: 'today', label: '1989, 2007', year: 2007, title: 'Freedom, and the EU', icon: 'star',
    text: 'In 1989, Romanians won back their freedom from a harsh communist rule. In 2007, Romania joined the European Union, a family of countries that work together. Next door, east of the Prut, the Republic of Moldova is a country of its own.',
    state: 'today',
    status: 'built'
  }
];

// "about 2,080 years ago", for a child: rounded to tens under 300 years, to fifties under 1,000, to hundreds beyond
export function yearsAgo(year: number, now = new Date().getFullYear()) {
  const ago = now - year, step = ago < 300 ? 10 : ago < 1000 ? 50 : 100;
  const rounded = Math.round(ago / step) * step;
  return ago < 15 ? 'a few years ago' : `about ${rounded.toLocaleString('en-GB')} years ago`;
}
