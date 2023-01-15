import { parseGbifCorrections } from './data_keys';

test("parsing GBIF corrections data file", () => {
  const text = `
    Arthropoda, Arachnida, Opilionida, Phalangodidae, Chinquipellobunus, reddelli
    This Is Invalid!
    Arthropoda Arachnida Trombidiformes Aturidae Axonopsella bakeri
    Arthropoda, Arachnida, Trombidiformes, Mideopsidae, Allomideopsis
    xxx yyy zzz
    Aaa Bbb Ccc
    Ddd Eee
    Fff
  `;

  const errors: string[] = [];
  const ancestorsByDet = parseGbifCorrections(text, errors);
  expect(ancestorsByDet).toEqual({
    Arthropoda: [],
    Arachnida: ["Arthropoda"],
    Opilionida: ["Arthropoda", "Arachnida"],
    Phalangodidae: ["Arthropoda", "Arachnida", "Opilionida"],
    Chinquipellobunus: ["Arthropoda", "Arachnida", "Opilionida", "Phalangodidae"],
    "Chinquipellobunus reddelli": ["Arthropoda", "Arachnida", "Opilionida", "Phalangodidae", "Chinquipellobunus"],
    Trombidiformes: ["Arthropoda", "Arachnida"],
    Aturidae: ["Arthropoda", "Arachnida", "Trombidiformes"],
    Axonopsella: ["Arthropoda", "Arachnida", "Trombidiformes", "Aturidae"],
    "Axonopsella bakeri": ["Arthropoda", "Arachnida", "Trombidiformes", "Aturidae", "Axonopsella"],
    Mideopsidae: ["Arthropoda", "Arachnida", "Trombidiformes"],
    Allomideopsis: ["Arthropoda", "Arachnida", "Trombidiformes", "Mideopsidae"],
    Aaa: [],
    Bbb: ["Aaa"],
    Ccc: ["Aaa", "Bbb"],
    Ddd: [],
    Eee: ["Ddd"],
    Fff: []
  });

  expect(errors).toEqual([
    `"This Is Invalid!" contains an unrecognized character`,
    `"xxx yyy zzz" has a letter case error`
  ]);
});
