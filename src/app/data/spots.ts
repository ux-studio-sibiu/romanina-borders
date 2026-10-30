// Spots, the map's small curiosities for children: a place (a bridge, a city, a monastery, a fortress, a battlefield)
// with a marker to click, and behind it pictures and a sentence or two. Kept here by id, so one spot can show on several
// moments (each moment lists the ids it shows: data/moments.ts).
//   kind:     the marker's little picture
//   name:     its Romanian name: the card's heading, or under the title when it has one (and the marker's label for
//             screen readers)
//   title:    the card's heading in the story's words, when it isn't the name itself
//   at:       where, in [lon, lat]
//   built:    when it was built: the year or the period alone ("c." where it is approximate), under the title
//   text:     short: two sentences a child reads in one go
//   tall:     its pictures are upright (a tower): the card gives them a narrower column and an upright box
//   pictures: in public/spots/, the first shown first, the others a click away (none yet: empty boxes on the card); `alt` says what each shows; `credit`: who
//             made it and its licence, shown small under it, as the licence asks (Wikimedia Commons: CC BY-SA)
export type SpotKind = 'bridge' | 'city' | 'monastery' | 'fortress' | 'battle';
export type SpotPicture = { src: string; alt: string; credit?: string };
export type Spot = { id: string; kind: SpotKind; name: string; title?: string; at: [number, number]; built?: string; text: string; tall?: boolean; pictures?: SpotPicture[] };

export const SPOTS: Record<string, Spot> = {
  // Sarmizegetusa Regia, in the Orăștie Mountains above Grădiștea de Munte: the Dacian kings' capital and holy place, a
  // fortress of murus dacicus walls, with a sacred area below it (round and rectangular sanctuaries, the andesite "sun").
  // Taken by the Romans in 106; a UNESCO site.
  'sarmizegetusa-regia': {
    id: 'sarmizegetusa-regia', kind: 'fortress', name: 'Sarmizegetusa Regia', title: "The Dacian kings' capital", at: [23.31, 45.62], built: '1st century BC',
    text: 'High in the mountains, hidden in the forest, stood the capital of the Dacian kings, with thick stone walls round it. In its holy place you can still see the round temples and a great sun made of stone!',
    pictures: [
      { src: 'spots/sarmizegetusa-regia-reconstruction.webp', alt: 'A drawing of how the fortress may have looked: thick stone walls with towers, wooden houses inside, and a big round temple with a pointed roof' },
      { src: 'spots/sarmizegetusa-regia-sanctuaries.webp', alt: 'The holy place: rows of round stone pillar bases in the grass, the forest round it in autumn colours', credit: 'Andrei Lucian Vaida, CC BY-SA 4.0, Wikimedia Commons' },
      { src: 'spots/sarmizegetusa-regia-round-sanctuary.webp', alt: 'The great round temple, a ring of stones and posts in a clearing, with the flat stone sun in front of it', credit: 'Cosmin Stefanescu, CC BY-SA 3.0 RO, Wikimedia Commons' },
      { src: 'spots/sarmizegetusa-regia-wall.webp', alt: 'A Dacian wall of big square stones beside a path through the forest', credit: 'Cosmin Stefanescu, CC BY-SA 3.0 RO, Wikimedia Commons' }
    ]
  },
  // Traian's bridge over the Danube, between Drobeta (Drobeta-Turnu Severin) and Pontes (Kladovo, in Serbia), 103–105, by
  // Apollodorus of Damascus. About 1,135 m long, 20 stone piers under wooden arches; the longest arch bridge for more than
  // a thousand years. The first piers, at both ends, still stand on the banks.
  'drobeta-bridge': {
    id: 'drobeta-bridge', kind: 'bridge', name: 'Podul lui Traian', title: "Traian's Bridge", at: [22.668, 44.623], built: '103–105',
    text: 'In 105 the Romans finished a giant bridge over the Danube here, so their army could march into Dacia. It stood on 20 stone pillars and was more than a kilometre long: for a thousand years, no arch bridge in the world was longer!',
    pictures: [
      { src: 'spots/drobeta-bridge-drawing.webp', alt: 'A drawing of how the bridge may have looked: stone pillars and wooden arches across a wide river, a stone gate with statues at its near end, two Roman soldiers resting on the bank' },
      { src: 'spots/drobeta-bridge-today.webp', alt: 'One wooden arch of the bridge, built again full size on two stone pillars, in a park in Drobeta-Turnu Severin today' }
    ]
  },
  // Ulpia Traiana Sarmizegetusa, in the Hațeg country: the capital of Roman Dacia, founded about 106–110 under Traian, its
  // name joining his family's (Ulpius) and the Dacian kings' capital in the mountains. A forum, temples, baths, and an
  // amphitheatre for about 5,000. The ruins are an open-air museum today.
  'ulpia-traiana': {
    id: 'ulpia-traiana', kind: 'city', name: 'Ulpia Traiana Sarmizegetusa', title: "The Romans' capital", at: [22.788, 45.516], built: 'c. 106–110',
    text: 'After they won Dacia, the Romans built their capital here: a new city with temples, a big square and baths. In its amphitheatre about 5,000 people watched gladiators fight, and you can still walk round its arena today!',
    pictures: [
      { src: 'spots/ulpia-traiana-amphitheatre-above.webp', alt: 'The amphitheatre seen from straight above: an oval arena inside a ring of stone walls, the walls of other buildings beside it' },
      { src: 'spots/ulpia-traiana-from-above.webp', alt: 'The ruins from above: the oval amphitheatre and the stone walls of the city round it, in green fields', credit: 'Raimond Spekking, CC BY-SA 4.0, Wikimedia Commons' },
      { src: 'spots/ulpia-traiana-amphitheatre.webp', alt: 'The amphitheatre: a grassy oval arena inside low stone walls', credit: 'Uhserban, CC BY-SA 3.0 RO, Wikimedia Commons' },
      { src: 'spots/ulpia-traiana-ruins.webp', alt: 'Stone walls of Roman buildings in the grass, with mountains behind', credit: 'Pudelek, CC BY-SA 4.0, Wikimedia Commons' }
    ]
  },

  // 1400–1504: the forts and monasteries of Mircea cel Bătrân, Vlad Țepeș and Ștefan cel Mare that still stand. Named in
  // Romanian on the card too; pictures to come.
  // Cozia, on the Olt: founded by Mircea in 1388, his tomb
  'cozia': {
    id: 'cozia', kind: 'monastery', name: 'Mănăstirea Cozia', at: [24.337, 45.271], built: '1386–1388',
    text: 'Mircea cel Bătrân built this monastery by the Olt river, and he is buried here.',
    pictures: [
      { src: 'spots/cozia-engraving.webp', alt: 'An old engraving: the monastery with its domed towers on the bank of the Olt, a steep wooded hill behind' },
      { src: 'spots/cozia-river.webp', alt: 'The monastery today: long white walls with small windows and green roofs on stone buttresses, reflected in the river' },
      { src: 'spots/cozia-from-above.webp', alt: 'The monastery from above: the church with its green dome in the courtyard, white walls round it, by the river' }
    ]
  },
  // The Chindia Tower, in the princes' court at Târgoviște, the capital of Țara Românească in Vlad Țepeș's time
  'chindia': {
    id: 'chindia', kind: 'fortress', name: 'Turnul Chindiei', at: [25.457, 44.931], built: '1400s',
    text: "This tall tower stands in the princes' court at Târgoviște, the capital of Țara Românească in Vlad Țepeș's time.",
    tall: true,
    pictures: [
      { src: 'spots/chindia-tower.webp', alt: 'The tower today: a tall round brick tower with battlements and pointed windows on a wide stone base, the court\'s old brick walls round its foot' }
    ]
  },
  // Neamț: one of Ștefan's strongest fortresses; Mehmed II's army could not take it in 1476
  'neamt': {
    id: 'neamt', kind: 'fortress', name: 'Cetatea Neamțului', at: [26.341, 47.213], built: '1380s',
    text: "One of Ștefan cel Mare's strongest fortresses: even the Ottoman sultan's army could not take it."
  },
  // Putna: built by Ștefan in 1466–1469, his tomb
  'putna': {
    id: 'putna', kind: 'monastery', name: 'Mănăstirea Putna', at: [25.611, 47.871], built: '1466–1469',
    text: 'Ștefan cel Mare built this monastery, and he is buried here.'
  },
  // Voroneț: Ștefan's church of 1488; its outside walls painted later (1547), in the blue named after it
  'voronet': {
    id: 'voronet', kind: 'monastery', name: 'Mănăstirea Voroneț', at: [25.864, 47.518], built: '1488',
    text: 'Ștefan cel Mare built this church; later its outside walls were painted all over, in a famous blue.'
  },
  // Cetatea Albă, at the Dniester's mouth (Bilhorod-Dnistrovskyi, Ukraine): Moldova's port fortress until 1484
  'cetatea-alba': {
    id: 'cetatea-alba', kind: 'fortress', name: 'Cetatea Albă', at: [30.352, 46.201], built: '1200s–1400s',
    text: "Moldova's great fortress by the sea, at the mouth of the Dniester, which Ștefan cel Mare defended."
  },
  // Hotin (Khotyn, Ukraine), on the Dniester: Moldova's northern fortress, enlarged and strengthened by Ștefan
  'hotin': {
    id: 'hotin', kind: 'fortress', name: 'Cetatea Hotinului', at: [26.498, 48.522], built: '1300s',
    text: 'A huge stone fortress above the Dniester; Ștefan cel Mare made it bigger and stronger.'
  },
  // Soroca (Moldova), on the Dniester: Ștefan's wooden fort of 1499, rebuilt round in stone in the 1540s
  'soroca': {
    id: 'soroca', kind: 'fortress', name: 'Cetatea Sorocii', at: [28.301, 48.156], built: '1499',
    text: 'A perfectly round fortress by the Dniester: Ștefan cel Mare built the first one here, out of wood.'
  },
  // Snagov: the monastery on an island in the lake, where legend puts Vlad Țepeș's grave
  'snagov': {
    id: 'snagov', kind: 'monastery', name: 'Mănăstirea Snagov', at: [26.177, 44.708], built: '1300s',
    text: 'A monastery on an island in a lake; the legend says Vlad Țepeș is buried here.',
    pictures: [
      { src: 'spots/snagov-island.webp', alt: 'The monastery from above: a small white church among trees on a green island ringed with reeds, in a wide blue lake' }
    ]
  },
  // Bran, on the pass from Transilvania into Țara Românească: built in 1377–1388, held for some years by Mircea
  'bran': {
    id: 'bran', kind: 'fortress', name: 'Castelul Bran', at: [25.367, 45.515], built: '1377–1388',
    text: 'This castle guarded the mountain road into Țara Românească; for a few years it belonged to Mircea cel Bătrân.',
    pictures: [
      { src: 'spots/bran-old.webp', alt: 'An old engraving: the castle high on its rock over the valley, with village houses below' },
      { src: 'spots/bran-today.webp', alt: 'The castle today: white walls and towers with red tiled roofs on a rock above green trees' }
    ]
  },
  // Hunedoara: the castle of Iancu de Hunedoara, who fought the Ottomans and backed Vlad Țepeș in 1456
  'corvin': {
    id: 'corvin', kind: 'fortress', name: 'Castelul Corvinilor', at: [22.889, 45.75], built: '1440–1460',
    text: "The fairy-tale castle of Iancu de Hunedoara, who fought the Ottomans and helped Vlad Țepeș become prince.",
    pictures: [
      { src: 'spots/corvin-engraving-valley.webp', alt: 'An old engraving: the castle with its towers above a village, mountains behind' },
      { src: 'spots/corvin-today.webp', alt: 'The castle today: towers with tall pointed red roofs above stone walls, reached by a long wooden bridge on stone pillars' },
      { src: 'spots/corvin-engraving-bridge.webp', alt: 'An old engraving: the castle high on its rock, a rider crossing the bridge, cows drinking in the river below' },
      { src: 'spots/corvin-courtyard.webp', alt: 'Inside the castle courtyard: a stone stair and a long gallery of arches, under steep slate roofs' }
    ]
  },
  // Sighișoara: the walled town on its hill, where Vlad Țepeș was born (by tradition, about 1431)
  'sighisoara': {
    id: 'sighisoara', kind: 'city', name: 'Cetatea Sighișoara', at: [24.792, 46.219], built: '1300s–1400s',
    text: 'A town on a hill inside stone walls and towers; people say Vlad Țepeș was born here.',
    pictures: [
      { src: 'spots/sighisoara-map.webp', alt: 'An old painted map of the town from above: red roofs inside the walls on the hill, the church at the top, the river below' },
      { src: 'spots/sighisoara-lithograph.webp', alt: 'An old coloured print: the town on its hill with the church at the top and the clock tower, a cart on the road below' },
      { src: 'spots/sighisoara-engraving.webp', alt: 'An old engraving: the walled town on its hill above the valley, houses spread along the river' },
      { src: 'spots/sighisoara-postcard.webp', alt: 'An old coloured postcard: the square below the clock tower, with carts and people walking' }
    ]
  },

  // 1600: Mihai Viteazul's way to the three lands: his first great victory, the battle that won him Transilvania, the
  // capitals of Transilvania and Moldova, and the monastery he built in Bucharest.
  // Mănăstirea Mihai Vodă, Bucharest: built by Mihai in 1591–1594; in 1985 its church was moved 289 m on rails, to save it
  'mihai-voda': {
    id: 'mihai-voda', kind: 'monastery', name: 'Mănăstirea Mihai Vodă', at: [26.095, 44.43], built: '1591–1594',
    text: 'Mihai Viteazul built this monastery in Bucharest. Once, to save it, the whole church was moved on rails to a new place!',
    tall: true,
    pictures: [
      { src: 'spots/mihai-voda.webp', alt: 'The church of Mihai Vodă: tall brick and stone walls in stripes, with rows of arches, under two towers' }
    ]
  },
  // Călugăreni, on the Neajlov: the battle of August 1595, where Mihai's army beat Sinan Pașa's much bigger Ottoman one
  'calugareni': {
    id: 'calugareni', kind: 'battle', name: 'Călugăreni', title: 'The battle of Călugăreni', at: [25.91, 44.17], built: '1595',
    text: "By the Neajlov river, Mihai Viteazul's small army beat a much bigger Ottoman army. It was one of his greatest victories.",
    pictures: [
      { src: 'spots/calugareni-mihai.webp', alt: 'An old painting: Mihai Viteazul in a red coat and a tall fur hat rides a white horse at the head of his army, flags behind him' }
    ]
  },
  // Șelimbăr, by Sibiu: the battle of 28 October 1599, where Mihai beat Andrei Báthory, prince of Transilvania, and so
  // opened the way to Alba Iulia
  'selimbar': {
    id: 'selimbar', kind: 'battle', name: 'Șelimbăr', title: 'The battle of Șelimbăr', at: [24.2, 45.76], built: '1599',
    text: "Here, near Sibiu, Mihai Viteazul's army won the battle for Transilvania. A few days later, he rode into Alba Iulia as its prince.",
    // The painting shows what the battle led to: his entry into Alba Iulia, met at the gate
    pictures: [
      { src: 'spots/selimbar.webp', alt: 'An old painting: Mihai Viteazul rides a white horse through a city gate at the head of his army, flags behind him, a bishop and the townspeople greeting him' }
    ]
  },
  // Alba Iulia: the princes' palace of Transilvania, where Mihai ruled from 1 November 1599, after the battle of Șelimbăr
  'alba-iulia-palace': {
    id: 'alba-iulia-palace', kind: 'city', name: 'Palatul Princiar din Alba Iulia', title: "The princes' palace", at: [23.57, 46.068], built: '1500s',
    text: "In 1599, Mihai Viteazul rode into Alba Iulia and ruled Transilvania from the princes' palace here. Later, in 1918, Alba Iulia saw the Great Union too.",
    pictures: [
      { src: 'spots/alba-iulia-palace.webp', alt: "The princes' palace today: a long yellow building with a tiled roof, and in front of it a statue of Mihai Viteazul on horseback" }
    ]
  },
  // Iași: Moldova's capital, where Mihai came in May 1600; its old princely court stood where the Palace of Culture is now
  'iasi-court': {
    id: 'iasi-court', kind: 'city', name: 'Curtea Domnească din Iași', at: [27.587, 47.158], built: '1400s',
    text: "In 1600, Mihai Viteazul came to Iași, Moldova's capital, and became its prince too. Its old princely court stood where the Palace of Culture is today.",
    pictures: [
      { src: 'spots/iasi-court.webp', alt: 'An old engraving: the long princely palace of Iași, with riders and a carriage crossing the square in front of it' }
    ]
  },

  // 1330–1359: the first princely seats and churches of Basarab's Țara Românească and Bogdan's Moldova that still stand
  // Curtea de Argeș: the Princely Church of St Nicholas, about 1340–1352, when Argeș was the capital
  'curtea-de-arges': {
    id: 'curtea-de-arges', kind: 'monastery', name: 'Biserica Domnească din Curtea de Argeș', at: [24.678, 45.142], built: 'c. 1340–1352',
    text: "When Argeș was the capital of Țara Românească, its princes built this church, painted inside from top to bottom.",
    tall: true,
    pictures: [
      { src: 'spots/curtea-de-arges-church.webp', alt: 'The princely church: walls of stone and brick in stripes, round roofs and a tall drum with a dome and a cross, on a lawn' }
    ]
  },
  // Severin: the Hungarian kingdom's fortress on the Danube, which Charles I marched to take in 1330, before Posada
  'severin': {
    id: 'severin', kind: 'fortress', name: 'Cetatea Severinului', at: [22.665, 44.627], built: '1200s',
    text: 'The fortress Hungary and Țara Românească fought over: in 1330 the Hungarian king came to take it, and the war began.',
    pictures: [
      { src: 'spots/severin-from-above.webp', alt: 'The fortress today, from above: a tall square stone tower and thick walls round grassy yards, beside the wide Danube' }
    ]
  },
  // Rădăuți: the Bogdana church, about 1360, Moldova's oldest standing stone church and Bogdan I's grave
  'bogdana': {
    id: 'bogdana', kind: 'monastery', name: 'Biserica Bogdana din Rădăuți', at: [25.921, 47.844], built: 'c. 1360',
    text: "Moldova's oldest stone church still standing, where Bogdan I, its first free prince, is buried.",
    pictures: [
      { src: 'spots/bogdana-engraving.webp', alt: 'An old engraving of the church: its great pointed roof over the stone walls, behind a wooden fence, with a small bell tower' },
      { src: 'spots/bogdana-today.webp', alt: 'The Bogdana church today: thick stone walls with buttresses under a tall, steep shingle roof, its bell tower beside it among trees' }
    ]
  },
  // Baia: by tradition Moldova's first seat; the ruins of its Catholic church, built about 1410
  'baia': {
    id: 'baia', kind: 'monastery', name: 'Biserica Catolică din Baia', at: [26.22, 47.418], built: 'c. 1410',
    text: "Moldova's first capital, the old stories say; the walls of its old stone church still stand.",
    pictures: [
      { src: 'spots/baia-from-above.webp', alt: 'The church ruins from above: tall roofless stone walls in a garden beside the village road' },
      { src: 'spots/baia-ruins.webp', alt: 'The tall broken stone walls of the old church among trees, behind a fence' }
    ]
  },

  // 1330–1359, in Transilvania and Maramureș (the Kingdom of Hungary): what already stood, or was being built, then
  // Densuș: a Romanian stone church of the 1200s, built of stones from the Roman ruins round it (Ulpia Traiana's)
  'densus': {
    id: 'densus', kind: 'monastery', name: 'Biserica din Densuș', at: [22.801, 45.58], built: '1200s',
    text: 'One of the oldest Romanian churches still used, built from the stones of Roman ruins: look for Roman stones in its walls!',
    pictures: [
      { src: 'spots/densus-retezat.webp', alt: 'The small stone church in green fields, the Retezat mountains behind it', credit: 'Mihaibursesc, CC BY-SA 4.0, Wikimedia Commons' },
      { src: 'spots/densus-columns.webp', alt: 'The church wall, with the tops of Roman columns built into it as props', credit: 'h_laca, CC BY 3.0, Wikimedia Commons' }
    ]
  },
  // Râșnov: the hill fortress over the Bârsa land, first written of in the 1330s, a refuge for the villages round it
  'rasnov': {
    id: 'rasnov', kind: 'fortress', name: 'Cetatea Râșnov', at: [25.46, 45.593], built: '1300s',
    text: 'A fortress on a hill, where the villagers hid with their animals when raiders came.',
    pictures: [
      { src: 'spots/rasnov-rohbock.webp', alt: 'An old engraving: the fortress walls and towers on top of a steep rocky hill', credit: 'Ludwig Rohbock, about 1860, public domain' },
      { src: 'spots/rasnov-1912.webp', alt: 'An old photograph from 1912: the fortress walls on its hill, among trees', credit: 'Fortepan, 1912, public domain' }
    ]
  },
  // Sibiu: the Transilvanian Saxons' chief town, walled; its Evangelical church built from the 1320s on
  'sibiu': {
    id: 'sibiu', kind: 'city', name: 'Sibiu', at: [24.151, 45.797], built: '1320–1520',
    text: 'A walled town of the Saxons, who came from Germany; its great church was being built in these years.',
    pictures: [
      { src: 'spots/sibiu-1900.webp', alt: 'An old photograph from 1900: a cobbled street of old houses climbing to the great church tower', credit: 'Fortepan, 1900, public domain' },
      { src: 'spots/sibiu-1941.webp', alt: "An old photograph from 1941: the great church's tall tower with its small corner turrets", credit: 'Willy Pragher, 1941, CC BY 4.0, Landesarchiv Baden-Württemberg' }
    ]
  },
  // Cluj: St Michael's church (Sfântul Mihail), begun about 1350, one of the largest Gothic churches in Transilvania
  'cluj-st-michael': {
    id: 'cluj-st-michael', kind: 'monastery', name: 'Biserica Sfântul Mihail din Cluj', at: [23.59, 46.77], built: '1350–1487',
    text: 'One of the biggest old churches in Transilvania, begun in these very years, in 1350.',
    tall: true,
    pictures: [
      { src: 'spots/cluj-1940.webp', alt: "An old photograph from 1940: the church's tall pointed stone doorway, carved with figures", credit: 'Fortepan, 1940, CC BY-SA 3.0' },
      { src: 'spots/cluj-1928.webp', alt: 'An old photograph from 1928: inside the church, tall pillars and pointed arches up to the vaults', credit: 'Fortepan, 1928, CC BY-SA 3.0' }
    ]
  },

  // c. 1000: earth fortresses, foundations and the first stone churches, as Transilvania joined the Kingdom of Hungary;
  // and on the lower Danube, Byzantine again from 971 (the map doesn't show the Byzantine Empire: the card says it)
  // Dăbâca, on the Lonea: an earth-and-timber fortress of the 900s–1000s, tied by the Gesta Hungarorum's story to Gelu
  'dabaca': {
    id: 'dabaca', kind: 'fortress', name: 'Cetatea Dăbâca', at: [23.668, 46.988], built: '900s–1000s',
    text: 'An old fortress of earth and wood; the old story says Gelu, a Romanian duke, ruled from here before the Hungarians came.'
  },
  // Biharea: the earthwork the Gesta gives to Menumorut, duke of Crișana, who held out against the Hungarians
  'biharea': {
    id: 'biharea', kind: 'fortress', name: 'Cetatea Biharea', at: [21.915, 47.153], built: '800s–900s',
    text: 'Only a big earth mound is left; the old story says Duke Menumorut held this fortress against the Hungarians.'
  },
  // Cisnădioara: the Romanesque basilica on its hill above the village, about 1200, among Transilvania's oldest
  'cisnadioara': {
    id: 'cisnadioara', kind: 'monastery', name: 'Bazilica din Cisnădioara', at: [24.101, 45.714], built: 'c. 1200',
    text: 'A small stone church on top of a steep hill, one of the oldest in Transilvania.'
  },
  // Basarabi–Murfatlar: the cave churches cut into the chalk in the 900s–1000s, with scratched drawings and runic letters
  'basarabi': {
    id: 'basarabi', kind: 'monastery', name: 'Complexul rupestru Basarabi–Murfatlar', at: [28.412, 44.176], built: '900s–1000s',
    text: 'Tiny churches carved into a chalk cliff, with drawings and old letters scratched on their walls; the Byzantine Empire ruled here then.'
  },
  // Capidava: the Roman fort on the Danube, built in the 100s and used again by the Byzantines about 1000
  'capidava': {
    id: 'capidava', kind: 'fortress', name: 'Cetatea Capidava', at: [28.076, 44.491], built: '100s–1000s',
    text: 'A Roman fortress on the Danube, used again by the Byzantine Empire around the year 1000; its walls still stand above the river.'
  }
};
