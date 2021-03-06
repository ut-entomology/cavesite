export type TaxonPathsByUniqueMap = Record<string, string[]>;

const caveObligateTaxa = [
  // Genera that are entirely cave obligate.

  'Brackenridgia',
  'Speodesmus',
  'Speorthus',
  'Texamaurops',
  'Texoreddellia',

  // Subenera that are entirely cave obligate. Must also list species within
  // the subgenus that are cave obligate.

  'Cicurella',

  // Species that are cave obligate not necessarily in cave-obligate genera.

  'Agastoschizomus n. sp.',
  'Agastoschizomus texanus',
  'Allomideopsis wichitaensis',
  'Allotexiweckelia hirsuta',
  'Almuerzothyas comalensis',
  'Amerigoniscus gipsocolus',
  'Amphibiocapillaria texensis',
  'Anapistula n. sp.',
  'Aphrastochthonius n. sp. 1',
  'Aphrastochthonius n. sp. 2',
  'Aphrastochthonius n. sp. 3',
  'Arenobiinae n. sp.',
  'Arrenrus n. sp. 1',
  'Arrenrus n. sp. 2',
  'Artesia subterranea',
  'Artesia welbourni',
  'Axonopsella bakeri',
  'Balconorbis uvaldensis',
  'Batrisodes cryptotexanus',
  'Batrisodes dentifroms',
  'Batrisodes fanti',
  'Batrisodes feminiclypeus',
  'Batrisodes gravesi',
  'Batrisodes grubbsi',
  'Batrisodes incisipes',
  'Batrisodes n. sp. 1',
  'Batrisodes n. sp. 2',
  'Batrisodes n. sp. 3',
  'Batrisodes n. sp.',
  'Batrisodes pekins',
  'Batrisodes reyesi',
  'Batrisodes shadeae',
  'Batrisodes texanus',
  'Batrisodes venyivi',
  'Batrisodes wartoni',
  'Bicornucandona fineganensis',
  'Brachycoelium longleyi',
  'Brachydopsis n. sp.',
  'Caecidotea bilineata',
  'Caecidotea reddelli',
  'Calathaemon holthuisi',
  'Cambala reddelli',
  'Cambala speobia',
  'Cavernocypris reddelli',
  'Cavernocypris wardi',
  'Chappusides n. sp.',
  'Chinquipellobunus madlae',
  'Chinquipellobunus reddelli',
  'Cicurina bandera',
  'Cicurina bandida',
  'Cicurina baronia',
  'Cicurina barri',
  'Cicurina browni',
  'Cicurina brunsi',
  'Cicurina bullis',
  'Cicurina buwata',
  'Cicurina caliga',
  'Cicurina caverna',
  'Cicurina coryelli',
  'Cicurina delrio',
  'Cicurina ezelli',
  'Cicurina gruta',
  'Cicurina holsingeri',
  'Cicurina hoodensis',
  'Cicurina joya',
  'Cicurina machete',
  'Cicurina madla',
  'Cicurina mckenziei',
  'Cicurina medina',
  'Cicurina menardia',
  'Cicurina mirifica',
  'Cicurina mixmaster',
  'Cicurina neovespera',
  'Cicurina obscura',
  'Cicurina orellia',
  'Cicurina pablo',
  'Cicurina pastura',
  'Cicurina patei',
  'Cicurina platypus',
  'Cicurina porteri',
  'Cicurina puentecilla',
  'Cicurina rainesi',
  'Cicurina reclusa',
  'Cicurina russelli',
  'Cicurina samsaba',
  'Cicurina selecta',
  'Cicurina serena',
  'Cicurina sheari',
  'Cicurina sprousei',
  'Cicurina stowersi',
  'Cicurina suttoni',
  'Cicurina travisae',
  'Cicurina troglobia',
  'Cicurina ubicki',
  'Cicurina uvalde',
  'Cicurina venefica',
  'Cicurina vespera',
  'Cicurina vibora',
  'Cicurina watersi',
  'Cirolanides texensis',
  'Cirolanides wassenichae',
  'Clathroperchon n. sp.',
  'Comalcandona gibsoni',
  'Comalcandona mixoni',
  'Comaldessus stygius',
  'Crangonyx sp. nr. pseudogracilis',
  'Dendroelopsis americana',
  'Dendronucleata americana',
  'Dichoxenus n. sp.',
  'Dinocheirus cavicola',
  'Eidmannella bullata',
  'Eidmannella delicata',
  'Eidmannella nasuta',
  'Eidmannella reclusa',
  'Eidmannella rostrata',
  'Eidmannella tuckeri',
  'Ereboporus naturaconservatis',
  'Eremidrilus n. sp. 1',
  'Eremidrilus n. sp. 2',
  'Erigone sp.',
  'Eurycea latitans',
  'Eurycea n. sp.',
  'Eurycea neotenes',
  'Eurycea rathbuni',
  'Eurycea robusta',
  'Eurycea sosorum',
  'Eurycea tonkawae',
  'Eurycea troglodytes',
  'Eurycea waterlooensis',
  'Haideoporus texanus',
  'Hobbsinella edwardensis',
  'Holsingerius samacos',
  'Indocandona rusti',
  'Ingolfiella n. spp.',
  'Islandiana unicornis',
  'Kuwamuacarus n. sp.',
  'Lacrimacondona wisei',
  'Larca guadalupensis',
  'Lethaxonella n. sp.',
  'Leucohya texana',
  'Lirceolus bisetus',
  'Lirceolus cocytus',
  'Lirceolus hardeni',
  'Lirceolus nidulus',
  'Lirceolus pilus',
  'Lirceolus smithii',
  'Lithobiinae n. sp.',
  'Litocampa n. sp.',
  'Lymantes nadinae',
  'Lymantes reddelli',
  'Meramecia n. sp.',
  'Mexichthonius exoticus',
  'Mexistenasellus coahuila',
  'Mexiweckelia hardeni',
  'Mideopsis n. sp.',
  'Mixojapyx reddelli',
  'Montanabathyella pecosensis',
  'Mooreobdella ?n. sp.',
  'Namiotkocypria haysensis',
  'Nicrellopsis texana',
  'Oncopodura fenestra',
  'Palaemon antrorum',
  'Paraamexiweckelia ruffoi',
  'Parabogidiella americana',
  'Paraholsingerius smaragdinus',
  'Phreatoceras taylor',
  'Phreatodrobia conica',
  'Phreatodrobia coronae',
  'Phreatodrobia micra',
  'Phreatodrobia nugax',
  'Phreatodrobia plana',
  'Phreatodrobia punctata',
  'Phreatodrobia rotunda',
  'Phreatodrobia spica',
  'Podocampa n. sp.',
  'Prietella phreatophila',
  'Protolimnesia ventriplacophora',
  'Pseudocandona lordi',
  'Psychopomporus felipi',
  'Pygmarrhopalites texensis',
  'Rhabdochona longleyi',
  'Rhadine austinica',
  'Rhadine bull',
  'Rhadine exilis',
  'Rhadine grubbsi',
  'Rhadine infernalis',
  'Rhadine insolita',
  'Rhadine ivyi',
  'Rhadine koepkei',
  'Rhadine n. sp. 1',
  'Rhadine n. sp. 2',
  'Rhadine n. sp. 3',
  'Rhadine n. sp. 4',
  'Rhadine n. sp. 5',
  'Rhadine noctivage',
  'Rhadine persephone',
  'Rhadine reyesi',
  'Rhadine russelli',
  'Rhadine specum',
  'Rhadine sprousei',
  'Rhadine subterranea',
  'Rhadine tenebrosa',
  'Rugosuscandona scharfi',
  'Satan eurystomus',
  'Schornikovdona bellensis',
  'Seborgia hershleri',
  'Seborgia relicta',
  'Simplexia longicrus',
  'Speocirolana hardeni',
  'Sphalloplana mohri',
  'Stygmomonia n. sp.',
  'Stygobromus alabamensis',
  'Stygobromus bakeri',
  'Stygobromus balconis',
  'Stygobromus bifurcatus',
  'Stygobromus dejectus',
  'Stygobromus flagellatus',
  'Stygobromus hadenoecus',
  'Stygobromus limbus',
  'Stygobromus longipes',
  'Stygobromus pecki',
  'Stygobromus reddelli',
  'Stygobromus russelli',
  'Stygoparnus comalensis',
  'Stygopyrgus bartonensis',
  'Stylodrilus n. sp.',
  'Tartarocreagris altimana',
  'Tartarocreagris amblyopa',
  'Tartarocreagris attenuata',
  'Tartarocreagris domina',
  'Tartarocreagris grubbsi',
  'Tartarocreagris hoodensis',
  'Tartarocreagris infernalis',
  'Tartarocreagris intermedia',
  'Tartarocreagris proserpina',
  'Tartarocreagris reyesi',
  'Tartarocreagris texana',
  'Tayshaneta anopica',
  'Tayshaneta archambaulti',
  'Tayshaneta bullis',
  'Tayshaneta coeca',
  'Tayshaneta fawcetti',
  'Tayshaneta microps',
  'Tayshaneta myopica',
  'Tayshaneta oconnorae',
  'Tayshaneta sandersi',
  'Tayshaneta sprousei',
  'Tayshaneta vidreo',
  'Tayshaneta whitei',
  'Tethysbaena texana',
  'Texanobathynella aaronswinki',
  'Texanobathynella bowmani',
  'Texanobathynella coloradoensis',
  'Texapyrgus longleyi',
  'Texella cokendolperi',
  'Texella hardeni',
  'Texella hilgerensis',
  'Texella mulaiki',
  'Texella reyesi',
  'Texella tuberculata',
  'Texella whitei',
  'Texicerberus amistad',
  'Texicerberus castilloi',
  'Texicerberus n. spp.',
  'Texicerberus schoetteae',
  'Texiweckelia texensis',
  'Texiweckeliopsis insolita',
  'Theatops phanus',
  'Trogloglanis pattersoni',
  'Typhloelmis caroline',
  'Typhloelmis finegan',
  'Typhloelmis sanfelipe',
  'Tyrannochthonius muchmoreorum',
  'Tyrannochthonius troglodytes',
  'Uchidastygacarus n. sp.',
  'Ufocandona hannaleae'
];

let caveObligatesMap: Record<string, boolean> | null = null;
let caveContainingGeneraMap: Record<string, boolean> | null = null;

export function getCaveObligatesMap(): Record<string, boolean> {
  if (caveObligatesMap) return caveObligatesMap;
  caveObligatesMap = {};
  for (const taxonName of caveObligateTaxa) {
    // Exclude new species because they don't correspond to those in the database.
    if (!taxonName.includes('n.')) {
      caveObligatesMap[taxonName] = true;
    }
  }
  return caveObligatesMap;
}

export function getCaveContainingGeneraMap(): Record<string, boolean> {
  if (caveContainingGeneraMap) return caveContainingGeneraMap;
  caveContainingGeneraMap = {};
  for (const taxonName of caveObligateTaxa) {
    let genus = taxonName;
    const spaceOffset = genus.indexOf(' ');
    if (spaceOffset > 0) {
      genus = genus.substring(0, spaceOffset);
    }
    // Also includes subgenera.
    caveContainingGeneraMap[genus] = true;
  }
  return caveContainingGeneraMap;
}
