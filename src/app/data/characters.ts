// Characters: the important people of a moment (or anything else worth a face: a symbol, a building), each shown as a
// round picture with its name under it, beside the moment's details. Kept here by id, so one character can show on
// several moments (each moment lists the ids it shows: data/moments.ts).
//   name:    under the picture
//   role:    a few words under the name (king, prince, ...)
//   picture: in public/characters/, square, the face filling the middle (the circle crops the corners); `alt` says what
//            it shows; `credit`: who made it and its licence, when known
export type Character = { id: string; name: string; role?: string; picture: string; alt: string; credit?: string };

// The characters a moment lists (its `characters`, by id), in its order; ids not found are left out
export function charactersOf(ids: string[] = []): Character[] {
  return ids.map(id => CHARACTERS[id]).filter(Boolean);
}

export const CHARACTERS: Record<string, Character> = {
  burebista: {
    id: 'burebista', name: 'Burebista', role: 'King of the Dacians', picture: 'characters/burebista.webp',
    alt: 'A drawing of Burebista: a stern man with a long beard, in a pointed helmet covered with studs'
  },
  decebal: {
    id: 'decebal', name: 'Decebal', role: 'King of the Dacians', picture: 'characters/decebal.webp',
    alt: 'An old engraving of Decebal: a bearded man in a soft Dacian cap, a cloak pinned at his shoulder'
  },
  traian: {
    id: 'traian', name: 'Traian', role: 'Roman emperor', picture: 'characters/traian.webp',
    alt: 'A marble bust of Traian: a Roman with short combed-down hair and a wreath of oak leaves'
  },
  'stefan-i': {
    id: 'stefan-i', name: 'Ștefan I', role: 'First king of Hungary', picture: 'characters/stefan-i.webp',
    alt: 'An old icon of Ștefan I: a bearded king in a jewelled crown, a gold halo behind his head, a fur-trimmed cloak'
  },
  'basarab-i': {
    id: 'basarab-i', name: 'Basarab I', role: 'Prince of Țara Românească', picture: 'characters/basarab-i.webp',
    alt: 'An old church painting of a prince with a dark beard and a gold crown, in a red robe, one hand raised'
  },
  'bogdan-i': {
    id: 'bogdan-i', name: 'Bogdan I', role: 'Prince of Moldova', picture: 'characters/bogdan-i.webp',
    alt: 'A painting of a prince with a black beard and a tall gold crown, in a blue robe'
  },
  'mircea-cel-batran': {
    id: 'mircea-cel-batran', name: 'Mircea cel Bătrân', role: 'Prince of Țara Românească', picture: 'characters/mircea-cel-batran.webp',
    alt: 'An old church painting of a prince with long fair hair and a beard, under a tall jewelled crown'
  },
  // His picture mirrored, so he looks to the right
  'vlad-tepes': {
    id: 'vlad-tepes', name: 'Vlad Țepeș', role: 'Prince of Țara Românească', picture: 'characters/vlad-tepes.webp',
    alt: 'A painting of Vlad Țepeș: long dark curls, a thick moustache and a red cap studded with pearls and a jewel'
  },
  'stefan-cel-mare': {
    id: 'stefan-cel-mare', name: 'Ștefan cel Mare', role: 'Prince of Moldova', picture: 'characters/stefan-cel-mare.webp',
    alt: 'A painting of Ștefan cel Mare: long fair hair, a moustache and a gold crown set with red and green stones'
  },
  'mihai-viteazul': {
    id: 'mihai-viteazul', name: 'Mihai Viteazul', role: 'Prince of Țara Românească, Transilvania and Moldova', picture: 'characters/mihai-viteazul.webp',
    alt: 'An old engraving of Mihai Viteazul: a bearded man in a tall fur hat with a long feather pinned to it'
  },
  // The rulers of the empires that took Bucovina and Basarabia (1775, 1812). Her picture mirrored, so she looks right
  'maria-tereza': {
    id: 'maria-tereza', name: 'Maria Tereza', role: 'Empress of Austria', picture: 'characters/maria-tereza.webp',
    alt: 'A painting of Maria Tereza: an older woman with grey powdered hair and a jewelled tiara, in a lace collar'
  },
  'alexandru-i': {
    id: 'alexandru-i', name: 'Alexandru I', role: 'Tsar of Russia', picture: 'characters/alexandru-i.webp',
    alt: 'A painting of Alexandru I: a balding man with fair side-whiskers, in a dark uniform with gold epaulettes and medals'
  },
  // His picture mirrored, so he looks to the right
  'alexandru-ioan-cuza': {
    id: 'alexandru-ioan-cuza', name: 'Alexandru Ioan Cuza', role: 'Prince of the United Principalities', picture: 'characters/alexandru-ioan-cuza.webp',
    alt: 'A painting of Alexandru Ioan Cuza: a man with a moustache and a pointed beard, in a blue uniform with gold braid and medals'
  },
  'carol-i': {
    id: 'carol-i', name: 'Carol I', role: 'Prince, then first king of Romania', picture: 'characters/carol-i.webp',
    alt: 'An old photograph of Carol I: an older man with a full grey beard, in a dark uniform with medals and a chain of honour'
  },
  // His picture mirrored, so he looks to the right
  'ferdinand-i': {
    id: 'ferdinand-i', name: 'Ferdinand I', role: 'King of Romania', picture: 'characters/ferdinand-i.webp',
    alt: 'An old photograph of Ferdinand I in profile: short grey hair, a beard and moustache, in a uniform with a high collar'
  },
  // His picture mirrored, so he looks to the right
  'carol-ii': {
    id: 'carol-ii', name: 'Carol al II-lea', role: 'King of Romania', picture: 'characters/carol-ii.webp',
    alt: 'An old photograph of Carol al II-lea: a young man with combed-back hair and a moustache, in a uniform with medals'
  },
  'mihai-i': {
    id: 'mihai-i', name: 'Mihai I', role: 'King of Romania', picture: 'characters/mihai-i.webp',
    alt: 'A coloured photograph of the young King Mihai I: fair combed-back hair, blue eyes, a dark uniform with a tie'
  },
  // Not a person: the Union's flag, for 2007, where no one leader stands for the joining
  'european-union': {
    id: 'european-union', name: 'European Union', role: 'Its flag', picture: 'characters/european-union.webp',
    alt: 'The flag of the European Union: a ring of twelve gold stars on blue'
  }
};
