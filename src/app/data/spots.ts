// Lesson 08: spots, the map's small curiosities for children: a place (a bridge, a city, a monastery, a fortress) with a
// marker to click, and behind it pictures and a sentence or two. Kept here by id, so one spot can show on several moments
// (each moment lists the ids it shows: data/moments.ts).
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
export type SpotKind = 'bridge' | 'city' | 'monastery' | 'fortress';
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
  // Trajan's bridge over the Danube, between Drobeta (Drobeta-Turnu Severin) and Pontes (Kladovo, in Serbia), 103–105, by
  // Apollodorus of Damascus. About 1,135 m long, 20 stone piers under wooden arches; the longest arch bridge for more than
  // a thousand years. The first piers, at both ends, still stand on the banks.
  'drobeta-bridge': {
    id: 'drobeta-bridge', kind: 'bridge', name: 'Podul lui Traian', title: "Trajan's Bridge", at: [22.668, 44.623], built: '103–105',
    text: 'In 105 the Romans finished a giant bridge over the Danube here, so their army could march into Dacia. It stood on 20 stone pillars and was more than a kilometre long: for a thousand years, no arch bridge in the world was longer!',
    pictures: [
      { src: 'spots/drobeta-bridge-drawing.webp', alt: 'A drawing of how the bridge may have looked: stone pillars and wooden arches across a wide river, a stone gate with statues at its near end, two Roman soldiers resting on the bank' },
      { src: 'spots/drobeta-bridge-today.webp', alt: 'One wooden arch of the bridge, built again full size on two stone pillars, in a park in Drobeta-Turnu Severin today' }
    ]
  },
  // Ulpia Traiana Sarmizegetusa, in the Hațeg country: the capital of Roman Dacia, founded about 106–110 under Trajan, its
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

  // 1400–1504: the forts and monasteries of Mircea the Elder, Vlad III and Stephen the Great that still stand. Named in
  // Romanian on the card too; pictures to come.
  // Cozia, on the Olt: founded by Mircea in 1388, his tomb
  'cozia': {
    id: 'cozia', kind: 'monastery', name: 'Mănăstirea Cozia', at: [24.337, 45.271], built: '1386–1388',
    text: 'Mircea the Elder built this monastery by the Olt river, and he is buried here.'
  },
  // Poenari, on a crag above the Argeș: rebuilt and held by Vlad III; about 1,480 steps up
  'poenari': {
    id: 'poenari', kind: 'fortress', name: 'Cetatea Poenari', at: [24.635, 45.354], built: '1200s',
    text: "Vlad III's fortress sits high on a cliff: about 1,480 steps take you up to it!"
  },
  // The Chindia Tower, in the princes' court at Târgoviște, Wallachia's capital in Vlad III's time
  'chindia': {
    id: 'chindia', kind: 'fortress', name: 'Turnul Chindiei', at: [25.457, 44.931], built: '1400s',
    text: "This tall tower stands in the princes' court at Târgoviște, Wallachia's capital in Vlad III's time."
  },
  // Neamț: one of Stephen's strongest fortresses; Mehmed II's army could not take it in 1476
  'neamt': {
    id: 'neamt', kind: 'fortress', name: 'Cetatea Neamțului', at: [26.341, 47.213], built: '1380s',
    text: "One of Stephen the Great's strongest fortresses: even the Ottoman sultan's army could not take it."
  },
  // Putna: built by Stephen in 1466–1469, his tomb
  'putna': {
    id: 'putna', kind: 'monastery', name: 'Mănăstirea Putna', at: [25.611, 47.871], built: '1466–1469',
    text: 'Stephen the Great built this monastery, and he is buried here.'
  },
  // Voroneț: Stephen's church of 1488; its outside walls painted later (1547), in the blue named after it
  'voronet': {
    id: 'voronet', kind: 'monastery', name: 'Mănăstirea Voroneț', at: [25.864, 47.518], built: '1488',
    text: 'Stephen the Great built this church; later its outside walls were painted all over, in a famous blue.'
  },
  // Cetatea Albă, at the Dniester's mouth (Bilhorod-Dnistrovskyi, Ukraine): Moldavia's port fortress until 1484
  'cetatea-alba': {
    id: 'cetatea-alba', kind: 'fortress', name: 'Cetatea Albă', at: [30.352, 46.201], built: '1200s–1400s',
    text: "Moldavia's great fortress by the sea, at the mouth of the Dniester, which Stephen the Great defended."
  },
  // Hotin (Khotyn, Ukraine), on the Dniester: Moldavia's northern fortress, enlarged and strengthened by Stephen
  'hotin': {
    id: 'hotin', kind: 'fortress', name: 'Cetatea Hotinului', at: [26.498, 48.522], built: '1300s',
    text: 'A huge stone fortress above the Dniester; Stephen the Great made it bigger and stronger.'
  },
  // Soroca (Moldova), on the Dniester: Stephen's wooden fort of 1499, rebuilt round in stone in the 1540s
  'soroca': {
    id: 'soroca', kind: 'fortress', name: 'Cetatea Sorocii', at: [28.301, 48.156], built: '1499',
    text: 'A perfectly round fortress by the Dniester: Stephen the Great built the first one here, out of wood.'
  },
  // Snagov: the monastery on an island in the lake, where legend puts Vlad III's grave
  'snagov': {
    id: 'snagov', kind: 'monastery', name: 'Mănăstirea Snagov', at: [26.177, 44.708], built: '1300s',
    text: 'A monastery on an island in a lake; the legend says Vlad III is buried here.'
  },
  // Bran, on the pass from Transylvania into Wallachia: built in 1377–1388, held for some years by Mircea
  'bran': {
    id: 'bran', kind: 'fortress', name: 'Castelul Bran', at: [25.367, 45.515], built: '1377–1388',
    text: 'This castle guarded the mountain road into Wallachia; for a few years it belonged to Mircea the Elder.'
  },
  // Hunedoara: the castle of John Hunyadi (Iancu de Hunedoara), who fought the Ottomans and backed Vlad III in 1456
  'corvin': {
    id: 'corvin', kind: 'fortress', name: 'Castelul Corvinilor', at: [22.889, 45.75], built: '1440–1460',
    text: "The fairy-tale castle of John Hunyadi, who fought the Ottomans and helped Vlad III become prince.",
    pictures: [
      { src: 'spots/corvin-today.webp', alt: 'The castle today: towers with tall pointed red roofs above stone walls, reached by a long wooden bridge on stone pillars' },
      { src: 'spots/corvin-engraving-valley.webp', alt: 'An old engraving: the castle with its towers above a village, mountains behind' },
      { src: 'spots/corvin-engraving-bridge.webp', alt: 'An old engraving: the castle high on its rock, a rider crossing the bridge, cows drinking in the river below' },
      { src: 'spots/corvin-courtyard.webp', alt: 'Inside the castle courtyard: a stone stair and a long gallery of arches, under steep slate roofs' }
    ]
  },
  // Sighișoara: the walled town on its hill, where Vlad III was born (by tradition, about 1431)
  'sighisoara': {
    id: 'sighisoara', kind: 'city', name: 'Cetatea Sighișoara', at: [24.792, 46.219], built: '1300s–1400s',
    text: 'A town on a hill inside stone walls and towers; people say Vlad III was born here.'
  },

  // 1330–1359: the first princely seats and churches of Basarab's Wallachia and Bogdan's Moldavia that still stand
  // Curtea de Argeș: the Princely Church of St Nicholas, about 1340–1352, when Argeș was the capital
  'curtea-de-arges': {
    id: 'curtea-de-arges', kind: 'monastery', name: 'Biserica Domnească din Curtea de Argeș', at: [24.678, 45.142], built: 'c. 1340–1352',
    text: "When Argeș was Wallachia's capital, its princes built this church, painted inside from top to bottom."
  },
  // Câmpulung: by tradition Wallachia's first seat; the Negru Vodă monastery, where Basarab I is said to lie
  'campulung': {
    id: 'campulung', kind: 'monastery', name: 'Mănăstirea Negru Vodă din Câmpulung', at: [25.047, 45.27], built: '1300s',
    text: "Wallachia's first capital, the old stories say; Basarab I is said to be buried here.",
    tall: true,
    pictures: [
      { src: 'spots/campulung-tower.webp', alt: 'The monastery gate tower: a tall white stone tower with rows of arches, a bell window near the top and a gateway at its foot' }
    ]
  },
  // Severin: the Hungarian kingdom's fortress on the Danube, which Charles I marched to take in 1330, before Posada
  'severin': {
    id: 'severin', kind: 'fortress', name: 'Cetatea Severinului', at: [22.665, 44.627], built: '1200s',
    text: 'The fortress Hungary and Wallachia fought over: in 1330 the Hungarian king came to take it, and the war began.'
  },
  // Rădăuți: the Bogdana church, about 1360, Moldavia's oldest standing stone church and Bogdan I's grave
  'bogdana': {
    id: 'bogdana', kind: 'monastery', name: 'Biserica Bogdana din Rădăuți', at: [25.921, 47.844], built: 'c. 1360',
    text: "Moldavia's oldest stone church still standing, where Bogdan I, its first free prince, is buried.",
    pictures: [
      { src: 'spots/bogdana-today.webp', alt: 'The Bogdana church today: thick stone walls with buttresses under a tall, steep shingle roof, its bell tower beside it among trees' },
      { src: 'spots/bogdana-engraving.webp', alt: 'An old engraving of the church: its great pointed roof over the stone walls, behind a wooden fence, with a small bell tower' }
    ]
  },
  // Baia: by tradition Moldavia's first seat; the ruins of its Catholic church, built about 1410
  'baia': {
    id: 'baia', kind: 'monastery', name: 'Biserica Catolică din Baia', at: [26.22, 47.418], built: 'c. 1410',
    text: "Moldavia's first capital, the old stories say; the walls of its old stone church still stand.",
    pictures: [
      { src: 'spots/baia-from-above.webp', alt: 'The church ruins from above: tall roofless stone walls in a garden beside the village road' },
      { src: 'spots/baia-ruins.webp', alt: 'The tall broken stone walls of the old church among trees, behind a fence' }
    ]
  },

  // 1330–1359, in Transylvania and Maramureș (the Kingdom of Hungary): what already stood, or was being built, then
  // Densuș: a Romanian stone church of the 1200s, built of stones from the Roman ruins round it (Ulpia Traiana's)
  'densus': {
    id: 'densus', kind: 'monastery', name: 'Biserica din Densuș', at: [22.801, 45.58], built: '1200s',
    text: 'One of the oldest Romanian churches still used, built from the stones of Roman ruins: look for Roman stones in its walls!',
    pictures: [
      { src: 'spots/densus-retezat.webp', alt: 'The small stone church in green fields, the Retezat mountains behind it', credit: 'Mihaibursesc, CC BY-SA 4.0, Wikimedia Commons' },
      { src: 'spots/densus-columns.webp', alt: 'The church wall, with the tops of Roman columns built into it as props', credit: 'h_laca, CC BY 3.0, Wikimedia Commons' }
    ]
  },
  // Cuhea, today Bogdan Vodă, in Maramureș: Bogdan's home, which he left in 1359 to make Moldavia free
  'bogdan-voda': {
    id: 'bogdan-voda', kind: 'city', name: 'Bogdan Vodă (Cuhea)', at: [24.271, 47.689],
    text: "Bogdan's home: in 1359 he left Maramureș, crossed the mountains and made Moldavia free.",
    tall: true,
    pictures: [
      { src: 'spots/bogdan-voda.webp', alt: 'The wooden church of Bogdan Vodă, with its tall pointed shingle tower', credit: 'Codrinb, CC BY-SA 3.0 RO, Wikimedia Commons' }
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
  // Sibiu: the Transylvanian Saxons' chief town, walled; its Evangelical church built from the 1320s on
  'sibiu': {
    id: 'sibiu', kind: 'city', name: 'Sibiu', at: [24.151, 45.797], built: '1320–1520',
    text: 'A walled town of the Saxons, who came from Germany; its great church was being built in these years.',
    pictures: [
      { src: 'spots/sibiu-1900.webp', alt: 'An old photograph from 1900: a cobbled street of old houses climbing to the great church tower', credit: 'Fortepan, 1900, public domain' },
      { src: 'spots/sibiu-1941.webp', alt: "An old photograph from 1941: the great church's tall tower with its small corner turrets", credit: 'Willy Pragher, 1941, CC BY 4.0, Landesarchiv Baden-Württemberg' }
    ]
  },
  // Cluj: St Michael's church, begun about 1350, one of the largest Gothic churches in Transylvania
  'cluj-st-michael': {
    id: 'cluj-st-michael', kind: 'monastery', name: 'Biserica Sfântul Mihail din Cluj', at: [23.59, 46.77], built: '1350–1487',
    text: 'One of the biggest old churches in Transylvania, begun in these very years, in 1350.',
    tall: true,
    pictures: [
      { src: 'spots/cluj-1940.webp', alt: "An old photograph from 1940: the church's tall pointed stone doorway, carved with figures", credit: 'Fortepan, 1940, CC BY-SA 3.0' },
      { src: 'spots/cluj-1928.webp', alt: 'An old photograph from 1928: inside the church, tall pillars and pointed arches up to the vaults', credit: 'Fortepan, 1928, CC BY-SA 3.0' }
    ]
  },
  // Alba Iulia: St Michael's cathedral, of the 1200s, the seat of Transylvania's bishop in the Kingdom of Hungary
  'alba-iulia-cathedral': {
    id: 'alba-iulia-cathedral', kind: 'monastery', name: 'Catedrala Sfântul Mihail din Alba Iulia', at: [23.57, 46.069], built: '1200s',
    text: "Transylvania's oldest cathedral, where the bishop of the Hungarian kingdom had his seat."
  },

  // c. 1000: earth fortresses, foundations and the first stone churches, as Transylvania joined the Kingdom of Hungary;
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
  // Cisnădioara: the Romanesque basilica on its hill above the village, about 1200, among Transylvania's oldest
  'cisnadioara': {
    id: 'cisnadioara', kind: 'monastery', name: 'Bazilica din Cisnădioara', at: [24.101, 45.714], built: 'c. 1200',
    text: 'A small stone church on top of a steep hill, one of the oldest in Transylvania.'
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
