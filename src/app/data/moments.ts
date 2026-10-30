// The story: an opening slide, then fourteen moments, few enough for a child (7–10) to follow, close events sharing one
// (Țara Românească's and Moldova's beginnings; Mircea, Vlad and Ștefan). Each has its year, a title, a sentence or two
// for children, and the map it shows: the state and the empires round it.
//
// How the words are written: short sentences, one idea each, the names a child will meet again, and the touchy moments
// (Transilvania in Hungary, 1918, 1940) told as what happened, without blame. People always by their Romanian names,
// with the diacritics (Decebal, Traian, Ștefan cel Mare, Mihai Viteazul), in full the first time in a text and by the
// short name after that (Ștefan).

export interface Moment {
  id: string;
  label: string;       // the years, as on the timeline: a span only when its end isn't where the next moment starts
  year: number;        // the moment's year, for "about … years ago" (BC as negative)
  title: string;
  text: string;        // for children: one or two short sentences
  intro?: boolean;     // the opening slide: shown as the cover (charts/intro-cover), not a panel; no shape of its own (its year: the first moment's)
  state?: string;      // the shape it shows: a state id in shapes.topo.json
  zone?: string;       // or a soft land with no known border: a zone id in shapes.topo.json (with a state too: shown
                       // under it, unnamed, for comparison, like Burebista's kingdom under Roman Dacia)
  empires?: string[];  // the empires round or over it: empire ids in shapes.topo.json
  note?: string;       // a working note on its shape: what is approximate or simplified (not shown)
  // Movement instead of borders: each people's route through its waypoints, in [lon, lat], from where they
  // came from to where they went on to, with roughly when; the name sits at the waypoint `labelAt` (the middle one if
  // not given). The way a historical atlas draws them, simplified for children. `years`: when they came, as numbers, for the
  // play slider to draw each in its time. `picture`: in public/peoples/, 3:2 (900 × 600), shown at the map's top left
  // while that people is named.
  arrows?: { name: string; when?: string; years?: [number, number]; points: [number, number][]; labelAt?: number; picture?: { src: string; alt: string } }[];
  // A view of its own: a [lon, lat] box to fit instead of the usual core, for a moment that zooms out. Past the
  // detailed area the map switches to the wide data (region.json).
  view?: [[number, number], [number, number]];
  // Soft zones of the peoples and kingdoms round it (zone ids in shapes.topo.json), each named
  neighbours?: string[];
  // Places to mark, a dot and a name each
  places?: { name: string; at: [number, number] }[];
  // Curiosities to click: spot ids in data/spots.ts, each a marker with a picture and a few sentences behind it
  spots?: string[];
  // Important people (or anything worth a face): character ids in data/characters.ts, round pictures beside the details
  characters?: string[];
  // Other names in the text to set as pills like the characters' (as written there): people, or countries and the
  // European Union (2007)
  names?: string[];
  // Lands taken away at this moment, drawn dotted next to what is left (blocks in shapes.topo.json), each with who took it
  // (or, the same way, a land beside them that isn't theirs, with whose it is: Transilvania c. 1400)
  lost?: { block: string; to: string }[];
  // Whole countries to show, from the wide data by their codes, each filled and named; `joining`: on its way in (an EU
  // candidate), in a lighter colour
  countries?: { codes: string[]; name: string; joining?: boolean }[];
  // A plain map, without the satellite picture: borders on paper (the European Union, where the countries are the point)
  plain?: boolean;
  // No veil outside the story's land: the empires round it as bright as it is (the Roman Empire in 101)
  unveiled?: boolean;
  // The empires drawn as soft zones, like the peoples round Dacia at 60 BC: faded at the edge, no border, named like them
  softEmpires?: boolean;
}

// The European Union today: each member and its codes in the wide data (Cyprus: the whole island)
const EU_MEMBERS: [string, ...string[]][] = [
  ['Belgium', 'BEL'], ['France', 'FRA'], ['Germany', 'DEU'], ['Italy', 'ITA'], ['Luxembourg', 'LUX'], ['Netherlands', 'NLD'],
  ['Denmark', 'DNK'], ['Ireland', 'IRL'], ['Greece', 'GRC'], ['Spain', 'ESP'], ['Portugal', 'PRT'], ['Austria', 'AUT'],
  ['Finland', 'FIN'], ['Sweden', 'SWE'], ['Cyprus', 'CYP', 'CYN'], ['Czechia', 'CZE'], ['Estonia', 'EST'], ['Hungary', 'HUN'],
  ['Latvia', 'LVA'], ['Lithuania', 'LTU'], ['Malta', 'MLT'], ['Poland', 'POL'], ['Slovakia', 'SVK'], ['Slovenia', 'SVN'],
  ['Bulgaria', 'BGR'], ['Romania', 'ROU'], ['Croatia', 'HRV']
];

// And the countries on their way in, the official candidates (Kosovo has applied, but is not one yet)
const EU_CANDIDATES: [string, ...string[]][] = [
  ['Albania', 'ALB'], ['Bosnia and Herzegovina', 'BIH'], ['Georgia', 'GEO'], ['Moldova', 'MDA'], ['Montenegro', 'MNE'],
  ['North Macedonia', 'MKD'], ['Serbia', 'SRB'], ['Turkey', 'TUR'], ['Ukraine', 'UKR']
];

// The ancient moments' view: zoomed out from Italy to the Don, the same for the Dacians, the Romans and the
// peoples passing through, so the map stays still between them
const ANCIENT_VIEW: Moment['view'] = [[12, 37.5], [40, 51.5]];

export const MOMENTS: Moment[] = [
  {
    // The opening slide: what this is and who the children will meet, over the plain zoomed-in map
    id: 'intro', label: 'Intro', year: -60, intro: true, title: 'A short history of Romania',
    text: 'For history lessons in primary school. Scroll, or pick a year on the right, to travel through time.',
    characters: ['decebal', 'traian', 'stefan-cel-mare', 'mihai-viteazul', 'alexandru-ioan-cuza']
  },
  {
    id: 'dacians', label: 'c. 60 BC', year: -60, title: 'The Dacians and King Burebista',
    text: 'Long ago, the Dacians lived in the mountains and valleys round the Carpathians. Around 60 BC, King Burebista brought their tribes together into one big, strong kingdom. Around it lived Celts, Thracians and the peoples of the steppe; Greeks had cities on the coast, and to the south-west was Rome.',
    zone: 'burebista',
    view: ANCIENT_VIEW,
    neighbours: ['roman-republic', 'celts', 'thracians', 'bastarnae', 'sarmatians', 'scythians', 'bosporan'],
    // Sarmizegetusa, the kings' capital: a spot (a marker to click), not a place
    spots: ['sarmizegetusa-regia'],
    characters: ['burebista'],
    // Only the Greek cities on today's Romanian coast: kept simple
    places: [
      { name: 'Histria', at: [28.77, 44.55] }, { name: 'Tomis', at: [28.65, 44.17] }, { name: 'Callatis', at: [28.6, 43.81] }
    ],
    note: "Approximate, a soft zone: Burebista's kingdom from the middle Danube to the Black Sea coast and the Balkan range, a hand-placed ring with a blurred edge. It stands for the Getae and Dacians before him too."
  },
  {
    id: 'romans', label: '101', year: 106, title: 'The Romans in Dacia',
    text: 'The Roman emperor Traian fought two wars against the Dacian king Decebal. In 106 the Romans won, and much of Dacia became part of the Roman Empire for about 165 years. Romanian comes from Latin, the language the Romans spoke.',
    state: '106', empires: ['roman-empire'], zone: 'burebista', unveiled: true, softEmpires: true, view: ANCIENT_VIEW, spots: ['drobeta-bridge', 'ulpia-traiana'],
    characters: ['traian', 'decebal'],
    note: 'Approximate: east of the Olt it reaches the Limes Transalutanus, drawn as an approximate line from the Danube near Flămânda to Rucăr.'
  },
  {
    id: 'migrations', label: '271', year: 271, title: 'The Romans leave, peoples pass through',
    text: 'Around 271 the Roman army left Dacia, but many people stayed. For hundreds of years, peoples on the move, Visigoths, Huns, Avars, Slavs and others, passed through these lands.',
    note: 'No borders: the peoples passing through, as arrows across a neutral map, zoomed out to the steppe they came along. Approximate routes and dates.',
    view: ANCIENT_VIEW,
    arrows: [
      // c. 250–376: from the lands north of the Black Sea into Moldova and Țara Românească, then over the Danube at Durostorum
      // (376) to the Roman Balkans (Adrianople, 378): the Goths of these lands, the Thervingi, who became the Visigoths
      { name: 'Visigoths', when: '250–400', years: [250, 400], points: [[31.8, 50.6], [29.6, 48.6], [27.6, 46.6], [26.4, 45.0], [27.0, 43.9], [26.4, 42.0]], labelAt: 3,
        picture: { src: 'peoples/visigoths.webp', alt: 'An old engraving: warriors and their families crowded on a raft, poling it across a wide river' } },
      // c. 375–420: from the Volga steppe, past the Black Sea, over the Carpathians to the Tisza plain (Attila's centre)
      { name: 'Huns', when: '375–450', years: [375, 450], points: [[40.2, 48.4], [37.0, 47.8], [33.5, 47.6], [30.0, 47.4], [26.6, 47.4], [23.6, 47.6], [20.6, 47.1]], labelAt: 1,
        picture: { src: 'peoples/huns.webp', alt: 'A painting: Hun horse archers charge a line of Roman soldiers behind big painted shields' } },
      // c. 500–650: from between the Vistula and the Dnieper, south through the lands north of the Danube, then over it
      // into the Balkans, as far as Greece. Drawn on by 600 (not 650), so its mark on the play slider comes before the
      // Avars' (fully drawn in 618), in the order the steps go; the label keeps the true years.
      { name: 'Slavs', when: '500–650', years: [500, 600], points: [[27.4, 51.6], [26.8, 49.6], [25.9, 47.2], [24.8, 44.9], [23.6, 42.6], [22.6, 40.4]], labelAt: 1,
        picture: { src: 'peoples/slavs.webp', alt: 'A painting: three bearded warriors in pointed helmets on horseback, looking out over green hills' } },
      // 558–568: from the Caucasus steppe, along the Black Sea and the lower Danube, through the Iron Gates to the plain
      { name: 'Avars', when: '560', years: [558, 568], points: [[40.4, 45.9], [39.9, 47.1], [37.2, 47.4], [34.0, 47.1], [30.4, 46.8], [28.7, 45.7], [25.6, 44.1], [22.4, 44.7], [20.4, 46.0]], labelAt: 7,
        picture: { src: 'peoples/avars.webp', alt: 'A painting: two horsemen with bows and a man with a spear on the steppe, a round felt tent behind them' } },
      // 680: Asparukh's Bulgars from the Sea of Azov to the Danube's mouths (the Ongal), then south to Pliska
      { name: 'Bulgars', when: '680', years: [670, 681], points: [[39.3, 46.3], [39.8, 47.4], [37.0, 47.4], [34.0, 47.0], [30.6, 46.9], [29.0, 45.6], [28.2, 44.3], [27.1, 43.3]], labelAt: 6,
        picture: { src: 'peoples/bulgars.webp', alt: 'A painting: an old khan with a long beard raises his hand before his sons, a bundle of sticks at their feet' } },
      // 895: from Etelköz, between the Dnieper and the Siret, through the Verecke Pass in the north-east Carpathians, to
      // the Hungarian plain
      { name: 'Magyars', when: '895', years: [890, 900], points: [[34.8, 48.8], [31.0, 48.6], [27.6, 48.9], [24.8, 49.0], [23.1, 48.75], [20.2, 47.7]], labelAt: 4,
        picture: { src: 'peoples/magyars.webp', alt: 'A painting: Magyar horsemen with lances and shields gallop through a river' } }
    ]
  },
  {
    id: 'hungary', label: 'c. 1000', year: 1000, title: 'Transilvania in the Kingdom of Hungary',
    text: 'Around the year 1000, Ștefan I became the first king of Hungary. Step by step, Transilvania became part of the Kingdom of Hungary. Romanians, Hungarians and, later, Saxons who came from Germany all lived there together.',
    characters: ['stefan-i'],
    state: 'c1000', empires: ['hungary'], spots: ['dabaca', 'biharea', 'cisnadioara', 'basarabi', 'capidava'],
    note: 'It joined gradually, over the 10th–13th centuries.'
  },
  {
    id: 'founding', label: '1330–1359', year: 1330, title: 'Țara Românească and Moldova are born',
    text: 'In 1330, Prince Basarab I won a great battle at Posada, and Țara Românească became a free country. In 1359, Bogdan I made Moldova free too.',
    characters: ['basarab-i', 'bogdan-i'],
    state: '1359', empires: ['hungary'], spots: ['curtea-de-arges', 'severin', 'bogdana', 'baia', 'densus', 'rasnov', 'sibiu', 'cluj-st-michael'],
    note: "Basarab's Țara Românească (1330) and Bogdan's Moldova (1359). Approximate: early Moldova's southern edge is an approximate line from the Carpathians above Roman to the Prut above Iași."
  },
  {
    id: 'princes', label: '1400–1504', year: 1457, title: 'Mircea, Vlad and Ștefan',
    text: 'Brave princes like Mircea cel Bătrân, Vlad Țepeș and Ștefan cel Mare defended their lands against the mighty Ottoman Empire. Ștefan built many churches and monasteries, and you can still visit them today.',
    characters: ['mircea-cel-batran', 'vlad-tepes', 'stefan-cel-mare'],
    // Ștefan cel Mare again, by his first name only: pilled as written
    names: ['Ștefan'],
    state: 'c1400', empires: ['hungary', 'ottoman'], lost: [{ block: 'transylvania-banat', to: 'in the Kingdom of Hungary' }],
    spots: ['cozia', 'chindia', 'snagov', 'bran', 'corvin', 'sighisoara', 'neamt', 'putna', 'voronet', 'hotin', 'soroca', 'cetatea-alba'],
    note: 'Mircea cel Bătrân, Vlad Țepeș and Ștefan cel Mare, between Hungary and the Ottomans.'
  },
  {
    id: 'michael', label: '1600', year: 1600, title: 'Mihai Viteazul unites the three lands',
    text: 'In 1600, Mihai Viteazul became prince of Țara Românească, Transilvania and Moldova all at once. It was the first time the three lands had one ruler, though only for a few months.',
    characters: ['mihai-viteazul'],
    spots: ['calugareni', 'mihai-voda', 'selimbar', 'alba-iulia-palace', 'iasi-court'],
    state: '1600', empires: ['ottoman-1600'],
    note: 'Simplified: Tighina (Ottoman from 1538) stays in; Ottoman Hungary is whole counties.'
  },
  {
    id: 'taken', label: '1775–1812', year: 1812, title: 'Bucovina and Basarabia taken',
    text: 'Big empires took pieces of Moldova. Austria, ruled by Empress Maria Tereza, took Bucovina in 1775. Russia, ruled by Tsar Alexandru I, took Basarabia in 1812.',
    characters: ['maria-tereza', 'alexandru-i'],
    state: '1812', empires: ['habsburg', 'russian-empire', 'ottoman'],
    lost: [{ block: 'bukovina', to: 'to Austria, 1775' }, { block: 'bessarabia-all', to: 'to Russia, 1812' }]
  },
  {
    id: 'union', label: '1859', year: 1859, title: 'Cuza and the Union',
    text: 'In 1859, Moldova and Țara Românească both chose the same prince, Alexandru Ioan Cuza. The two countries joined into one, soon called Romania.',
    characters: ['alexandru-ioan-cuza'],
    state: '1859', empires: ['habsburg', 'russian-empire', 'ottoman'],
    note: 'Adjust: Suceava county, left out with Bucovina, includes a little of old Moldova; and southern Basarabia (held 1856–1878) is missing.'
  },
  {
    id: 'independence', label: '1877–78', year: 1877, title: 'Independence, and the sea',
    text: "In 1877, Romania said it was free from the Ottoman Empire, and it won its independence in a war, with Prince Carol I leading the army. It also got Dobrogea, and with it the Black Sea coast. In 1881, Carol I became Romania's first king.",
    characters: ['carol-i'],
    state: '1878', empires: ['habsburg', 'russian-empire'],
    note: 'Cadrilaterul follows in 1913 (in the data as its own shape, 1913).'
  },
  {
    id: 'great-union', label: '1918', year: 1918, title: 'The Great Union',
    text: 'At the end of the First World War, in 1918, Basarabia, Bucovina and Transilvania voted to join Romania. Romania was bigger than ever before, and its national day, 1 December, remembers it. In 1922, Ferdinand I was crowned king of all these lands.',
    characters: ['ferdinand-i'],
    state: '1918'
  },
  {
    id: 'losses', label: '1940', year: 1940, title: 'Lands lost in the war',
    text: 'In 1940, during the Second World War, Romania had to give up lands: Basarabia and Bucovina de Nord to the Soviet Union, Transilvania de Nord to Hungary, and Cadrilaterul to Bulgaria. That same year, King Carol al II-lea had to give up his throne. Transilvania de Nord came back after the war.',
    characters: ['carol-ii'],
    state: '1940', empires: ['soviet-union', 'hungary-1940'],
    lost: [
      { block: 'bessarabia-all', to: 'to the Soviet Union' }, { block: 'bukovina-north', to: 'to the Soviet Union' },
      { block: 'transylvania-north', to: 'to Hungary' }, { block: 'cadrilater', to: 'to Bulgaria' }
    ],
    note: 'Approximate: the line given to Hungary is an approximate line through Bihor, Cluj and Mureș counties (Oradea, Cluj and Târgu Mureș north of it; Turda and Luduș south).'
  },
  {
    id: 'regained', label: '1947', year: 1947, title: 'Transilvania de Nord comes back',
    text: 'In 1944, the young King Mihai I turned Romania against Hitler\'s Germany. After the Second World War, Transilvania de Nord became part of Romania again, and the peace treaty signed in Paris in 1947 confirmed it. Basarabia, Bucovina de Nord and Cadrilaterul stayed lost. These are still Romania\'s borders today.',
    characters: ['mihai-i'],
    state: 'today', empires: ['soviet-union'],
    lost: [
      { block: 'bessarabia-all', to: 'to the Soviet Union' }, { block: 'bukovina-north', to: 'to the Soviet Union' },
      { block: 'cadrilater', to: 'to Bulgaria' }
    ],
    note: 'Transilvania de Nord back (1944–45, confirmed by the Paris peace treaty of 1947); the other losses of 1940 stayed.'
  },
  {
    id: 'today', label: '2007', year: 2007, title: 'Romania joins the European Union',
    text: 'In 1989, Romanians won back their freedom from a harsh communist rule. The European Union is a family of countries that work together. It began with six countries in 1957 and grew, step by step. On 1 January 2007, Romania and Bulgaria joined it. The countries in a lighter blue, like the Republic of Moldova, are on their way to joining.',
    characters: ['european-union'],
    names: ['Romania', 'Bulgaria', 'Republic of Moldova'],
    state: 'today',
    // Zoomed out to Europe, from Portugal to Cyprus and the Baltic, on a plain map: the countries' borders only
    view: [[-8, 35], [33, 59]],
    plain: true,
    countries: [
      ...EU_MEMBERS.map(([name, ...codes]) => ({ codes, name })),
      ...EU_CANDIDATES.map(([name, ...codes]) => ({ codes, name, joining: true }))
    ],
    note: 'The European Union as it is now, 27 countries, named, and the 9 official candidates in a lighter blue.'
  }
];

// "about 2,080 years ago", for a child: rounded to tens under 300 years, to fifties under 1,000, to hundreds beyond
export function yearsAgo(year: number, now = new Date().getFullYear()) {
  const ago = now - year, step = ago < 300 ? 10 : ago < 1000 ? 50 : 100;
  const rounded = Math.round(ago / step) * step;
  return ago < 15 ? 'a few years ago' : `about ${rounded.toLocaleString('en-GB')} years ago`;
}
