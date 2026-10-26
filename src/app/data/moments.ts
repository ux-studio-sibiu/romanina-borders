// The story: fourteen moments, few enough for a child (7–10) to follow, close events sharing one (Wallachia's and
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
  label: string;       // the years, as on the timeline: a span only when its end isn't where the next moment starts
  year: number;        // the moment's year, for "about … years ago" (BC as negative)
  title: string;
  text: string;        // for children: one or two short sentences
  icon: MomentIcon;
  state?: string;      // the shape it shows: a state id in shapes.topo.json
  zone?: string;       // or a soft land with no known border: a zone id in shapes.topo.json (with a state too: shown faint
                       // under it, for comparison, like Burebista's kingdom under Roman Dacia)
  empires?: string[];  // the empires round or over it: empire ids in shapes.topo.json
  status: ShapeStatus;
  note?: string;       // what is left to do on its shape
  // Movement instead of borders (lesson 06): each people's route through its waypoints, in [lon, lat], from where they
  // came from to where they went on to, with roughly when; the name sits at the waypoint `labelAt` (the middle one if
  // not given). The way a historical atlas draws them, simplified for children. `years`: when they came, as numbers, for the
  // time scale to draw each in its time (lesson 07).
  arrows?: { name: string; when?: string; years?: [number, number]; points: [number, number][]; labelAt?: number }[];
  // A view of its own (lesson 06): a [lon, lat] box to fit instead of the usual core, for a moment that zooms out. Past the
  // detailed area the map switches to the wide data (region.json).
  view?: [[number, number], [number, number]];
  // Soft zones of the peoples and kingdoms round it (zone ids in shapes.topo.json), each named
  neighbours?: string[];
  // Places to mark, a dot and a name each
  places?: { name: string; at: [number, number] }[];
  // Lands taken away at this moment, drawn dotted next to what is left (blocks in shapes.topo.json), each with who took it
  lost?: { block: string; to: string }[];
  // Whole countries to show (lesson 06), from the wide data by their codes, each filled and named
  countries?: { codes: string[]; name: string }[];
  // A plain map, without the satellite picture: borders on paper (the European Union, where the countries are the point)
  plain?: boolean;
}

// The European Union today: each member and its codes in the wide data (Cyprus: the whole island)
const EU_MEMBERS: [string, ...string[]][] = [
  ['Belgium', 'BEL'], ['France', 'FRA'], ['Germany', 'DEU'], ['Italy', 'ITA'], ['Luxembourg', 'LUX'], ['Netherlands', 'NLD'],
  ['Denmark', 'DNK'], ['Ireland', 'IRL'], ['Greece', 'GRC'], ['Spain', 'ESP'], ['Portugal', 'PRT'], ['Austria', 'AUT'],
  ['Finland', 'FIN'], ['Sweden', 'SWE'], ['Cyprus', 'CYP', 'CYN'], ['Czechia', 'CZE'], ['Estonia', 'EST'], ['Hungary', 'HUN'],
  ['Latvia', 'LVA'], ['Lithuania', 'LTU'], ['Malta', 'MLT'], ['Poland', 'POL'], ['Slovakia', 'SVK'], ['Slovenia', 'SVN'],
  ['Bulgaria', 'BGR'], ['Romania', 'ROU'], ['Croatia', 'HRV']
];

// The ancient moments' view (lesson 06): zoomed out from Italy to the Don, the same for the Dacians, the Romans and the
// peoples passing through, so the map stays still between them
const ANCIENT_VIEW: Moment['view'] = [[12, 37.5], [40, 51.5]];

export const MOMENTS: Moment[] = [
  {
    id: 'dacians', label: 'c. 60 BC', year: -60, title: 'The Dacians and King Burebista', icon: 'wolf-banner',
    text: 'Long ago, the Dacians lived in the mountains and valleys round the Carpathians. Around 60 BC, King Burebista brought their tribes together into one big, strong kingdom. Around it lived Celts, Thracians and the peoples of the steppe; Greeks had cities on the coast, and to the south-west was Rome.',
    zone: 'burebista',
    view: ANCIENT_VIEW,
    neighbours: ['roman-republic', 'celts', 'thracians', 'bastarnae', 'sarmatians', 'scythians', 'bosporan'],
    places: [
      { name: 'Sarmizegetusa', at: [23.31, 45.62] }, { name: 'Histria', at: [28.77, 44.55] }, { name: 'Tomis', at: [28.65, 44.17] },
      { name: 'Callatis', at: [28.6, 43.81] }, { name: 'Odessos', at: [27.91, 43.2] }, { name: 'Apollonia', at: [27.7, 42.43] },
      { name: 'Tyras', at: [30.35, 46.2] }, { name: 'Olbia', at: [31.9, 46.69] }, { name: 'Byzantion', at: [28.98, 41.01] }
    ],
    status: 'built', note: "Approximate, a soft zone: Burebista's kingdom from the middle Danube to the Black Sea coast and the Balkan range, a hand-placed ring with a blurred edge. It stands for the Getae and Dacians before him too."
  },
  {
    id: 'romans', label: '101', year: 106, title: 'The Romans in Dacia', icon: 'eagle',
    text: 'The Roman emperor Trajan fought two wars against the Dacian king Decebalus. In 106 the Romans won, and much of Dacia became part of the Roman Empire for about 165 years. Romanian comes from Latin, the language the Romans spoke.',
    state: '106', empires: ['roman-empire'], zone: 'burebista', view: ANCIENT_VIEW,
    status: 'built', note: 'Approximate: east of the Olt it reaches the Limes Transalutanus, drawn as an approximate line from the Danube near Flămânda to Rucăr.'
  },
  {
    id: 'migrations', label: '271', year: 271, title: 'The Romans leave, peoples pass through', icon: 'horse',
    text: 'Around 271 the Roman army left Dacia, but many people stayed. For hundreds of years, peoples on the move, Goths, Huns, Avars, Slavs and others, passed through these lands.',
    status: 'arrows', note: 'No borders: the peoples passing through, as arrows across a neutral map, zoomed out to the steppe they came along. Approximate routes and dates.',
    view: ANCIENT_VIEW,
    arrows: [
      // c. 250–376: from the lands north of the Black Sea into Moldavia and Wallachia, then over the Danube at Durostorum
      // (376) to the Roman Balkans (Adrianople, 378)
      { name: 'Goths', when: '250–400', years: [250, 400], points: [[31.8, 50.6], [29.6, 48.6], [27.6, 46.6], [26.4, 45.0], [27.0, 43.9], [26.4, 42.0]], labelAt: 3 },
      // c. 375–420: from the Volga steppe, past the Black Sea, over the Carpathians to the Tisza plain (Attila's centre)
      { name: 'Huns', when: '375–450', years: [375, 450], points: [[40.2, 48.4], [37.0, 47.8], [33.5, 47.6], [30.0, 47.4], [26.6, 47.4], [23.6, 47.6], [20.6, 47.1]], labelAt: 1 },
      // c. 500–650: from between the Vistula and the Dnieper, south through the lands north of the Danube, then over it
      // into the Balkans, as far as Greece
      { name: 'Slavs', when: '500–650', years: [500, 650], points: [[27.4, 51.6], [26.8, 49.6], [25.9, 47.2], [24.8, 44.9], [23.6, 42.6], [22.6, 40.4]], labelAt: 1 },
      // 558–568: from the Caucasus steppe, along the Black Sea and the lower Danube, through the Iron Gates to the plain
      { name: 'Avars', when: '560', years: [558, 568], points: [[40.4, 45.9], [39.9, 47.1], [37.2, 47.4], [34.0, 47.1], [30.4, 46.8], [28.7, 45.7], [25.6, 44.1], [22.4, 44.7], [20.4, 46.0]], labelAt: 7 },
      // 680: Asparukh's Bulgars from the Sea of Azov to the Danube's mouths (the Ongal), then south to Pliska
      { name: 'Bulgars', when: '680', years: [670, 681], points: [[39.3, 46.3], [39.8, 47.4], [37.0, 47.4], [34.0, 47.0], [30.6, 46.9], [29.0, 45.6], [28.2, 44.3], [27.1, 43.3]], labelAt: 6 },
      // 895: from Etelköz, between the Dnieper and the Siret, through the Verecke Pass in the north-east Carpathians, to
      // the Hungarian plain
      { name: 'Magyars', when: '895', years: [890, 900], points: [[34.8, 48.8], [31.0, 48.6], [27.6, 48.9], [24.8, 49.0], [23.1, 48.75], [20.2, 47.7]], labelAt: 4 }
    ]
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
    status: 'built', note: "Basarab's Wallachia (1330) and Bogdan's Moldavia (1359). Approximate: early Moldavia's southern edge is an approximate line from the Carpathians above Roman to the Prut above Iași."
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
    lost: [{ block: 'bukovina', to: 'to Austria, 1775' }, { block: 'bessarabia-all', to: 'to Russia, 1812' }],
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
    lost: [
      { block: 'bessarabia-all', to: 'to the Soviet Union' }, { block: 'bukovina-north', to: 'to the Soviet Union' },
      { block: 'transylvania-north', to: 'to Hungary' }, { block: 'cadrilater', to: 'to Bulgaria' }
    ],
    status: 'built', note: 'Approximate: the line given to Hungary is an approximate line through Bihor, Cluj and Mureș counties (Oradea, Cluj and Târgu Mureș north of it; Turda and Luduș south).'
  },
  {
    id: 'regained', label: '1947', year: 1947, title: 'Northern Transylvania comes back', icon: 'flag',
    text: 'After the Second World War, northern Transylvania became part of Romania again, and the peace treaty signed in Paris in 1947 confirmed it. Bessarabia, northern Bukovina and Southern Dobruja stayed lost. These are still Romania\'s borders today.',
    state: 'today', empires: ['soviet-union'],
    lost: [
      { block: 'bessarabia-all', to: 'to the Soviet Union' }, { block: 'bukovina-north', to: 'to the Soviet Union' },
      { block: 'cadrilater', to: 'to Bulgaria' }
    ],
    status: 'built', note: 'Northern Transylvania back (1944–45, confirmed by the Paris peace treaty of 1947); the other losses of 1940 stayed.'
  },
  {
    id: 'today', label: '2007', year: 2007, title: 'Romania joins the European Union', icon: 'star',
    text: 'In 1989, Romanians won back their freedom from a harsh communist rule. The European Union is a family of countries that work together. It began with six countries in 1957 and grew, step by step. On 1 January 2007, Romania and Bulgaria joined it.',
    state: 'today',
    // Zoomed out to Europe, from Portugal to Cyprus and the Baltic, on a plain map: the countries' borders only
    view: [[-8, 35], [33, 59]],
    plain: true,
    countries: EU_MEMBERS.map(([name, ...codes]) => ({ codes, name })),
    status: 'built', note: 'The European Union as it is now, 27 countries, named.'
  }
];

// "about 2,080 years ago", for a child: rounded to tens under 300 years, to fifties under 1,000, to hundreds beyond
export function yearsAgo(year: number, now = new Date().getFullYear()) {
  const ago = now - year, step = ago < 300 ? 10 : ago < 1000 ? 50 : 100;
  const rounded = Math.round(ago / step) * step;
  return ago < 15 ? 'a few years ago' : `about ${rounded.toLocaleString('en-GB')} years ago`;
}
