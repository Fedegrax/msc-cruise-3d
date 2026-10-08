// Dati della nave: unica fonte di verità per modello 3D, piani ponte e tour 360°.
//
// Coordinate nave (metri): x lungo lo scafo (prua = +x, poppa = -x, 0 = mezzanave),
// y verso l'alto (0 = linea di galleggiamento), z trasversale (dritta = +z, babordo = -z).
//
// Fonti dei dati pubblici: scheda nave e piani ponte su cruisemapper.com,
// articoli di lancio MSC (2022). Le posizioni dei locali sono indicative.

export const SHIP = {
  id: 'msc-world-europa',
  name: 'MSC World Europa',
  className: 'World Class',
  builder: 'Chantiers de l’Atlantique, Saint-Nazaire',
  delivered: 2022,
  length: 333.3,
  beam: 47,
  draft: 9.0,
  grossTonnage: 215863,
  guests: 6762,
  crew: 2138,
  cabins: '2.600+',
  fuel: 'GNL (gas naturale liquefatto)',
  // Se un giorno arriva il modello ufficiale (CAD → glTF), basta indicarne il percorso:
  // il sito lo userà al posto del modello parametrico.
  gltf: null,
};

// Ponti passeggeri: la numerazione salta il 13 e il 17. Quote = pavimento del ponte.
export const DECKS = [
  { n: 5, y: 6.0, city: 'Berlin', summary: 'Cabine e ristorante principale' },
  { n: 6, y: 9.2, city: 'Rome', summary: 'Atrio, World Galleria, World Theatre' },
  { n: 7, y: 12.4, city: 'London', summary: 'Casinò, pub, ristoranti, teatro' },
  { n: 8, y: 15.6, city: 'Madrid', summary: 'World Promenade e MSC Aurea Spa' },
  { n: 9, y: 19.0, city: 'Dublin', summary: 'Cabine' },
  { n: 10, y: 21.9, city: 'Vienna', summary: 'Cabine' },
  { n: 11, y: 24.8, city: 'Stockholm', summary: 'Cabine' },
  { n: 12, y: 27.7, city: 'Copenhagen', summary: 'Cabine' },
  { n: 14, y: 30.6, city: 'Prague', summary: 'Cabine' },
  { n: 15, y: 33.5, city: 'Brussels', summary: 'Cabine e ponte di comando' },
  { n: 16, y: 36.4, city: 'Bern', summary: 'Cabine e Duplex Suite' },
  { n: 18, y: 39.3, city: 'Athens', summary: 'Piscine, buffet, Zen area, Yacht Club' },
  { n: 19, y: 42.3, city: 'Paris', summary: 'Kids club e Top Sail Lounge' },
  { n: 20, y: 45.3, city: 'Lisbon', summary: 'Palestra, Aquapark, Yacht Club' },
  { n: 21, y: 48.3, city: 'Valletta', summary: 'Cabine' },
  { n: 22, y: 51.3, city: 'Amsterdam', summary: 'Scivoli, The Spiral, solarium Yacht Club' },
];

export const deckY = (n) => {
  const d = DECKS.find((k) => k.n === n);
  if (!d) throw new Error(`Ponte ${n} inesistente`);
  return d.y;
};

// Zone (aree) per ponte, in coordinate nave. kind: public | dining | bar | pool | cabins | crew | outdoor | yc
export const ZONES = {
  5: [
    { name: 'Ristorante principale', kind: 'dining', x: [-158, -112], z: [-19, 19] },
    { name: 'Cabine', kind: 'cabins', x: [-105, 138], z: [-20, 20] },
  ],
  6: [
    { name: 'Panorama Lounge', kind: 'bar', x: [-162, -140], z: [-19, 19] },
    { name: 'Ristoranti Esagono & Hexagon', kind: 'dining', x: [-138, -96], z: [-19, 19] },
    { name: 'Bubbles Restaurant', kind: 'dining', x: [-94, -58], z: [-19, 19] },
    { name: 'World Galleria', kind: 'public', x: [-55, -8], z: [-9, 9], node: 'galleria-aft' },
    { name: 'Atrio e reception', kind: 'public', x: [-8, 20], z: [-12, 12], node: 'atrium' },
    { name: 'MSC Luna Park Arena', kind: 'public', x: [22, 58], z: [-18, 18] },
    { name: 'Negozi e servizi', kind: 'public', x: [60, 90], z: [-16, 16] },
    { name: 'World Theatre (platea)', kind: 'public', x: [93, 134], z: [-16, 16], node: 'theatre-stalls' },
  ],
  7: [
    { name: 'Panorama Lounge & Terrace', kind: 'bar', x: [-162, -132], z: [-19, 19] },
    { name: 'HOLA! Tacos & Cantina', kind: 'dining', x: [-130, -110], z: [-19, 19] },
    { name: 'Butcher’s Cut · Kaito', kind: 'dining', x: [-108, -58], z: [-19, 19] },
    { name: 'World Galleria', kind: 'public', x: [-55, -8], z: [-9, 9], node: 'galleria-fwd' },
    { name: 'Atrio', kind: 'public', x: [-8, 18], z: [-12, 12], node: 'atrium-7' },
    { name: 'Masters of the Sea Pub', kind: 'bar', x: [20, 44], z: [-17, 17] },
    { name: 'MSC Signature Casino', kind: 'public', x: [46, 90], z: [-17, 17] },
    { name: 'World Theatre (galleria)', kind: 'public', x: [93, 112], z: [-16, 16], node: 'theatre-balcony' },
  ],
  8: [
    { name: 'World Promenade', kind: 'outdoor', x: [-160, -55], z: [-8.5, 8.5], node: 'promenade-mid' },
    { name: 'La Pescaderia · Coffee Emporium', kind: 'dining', x: [-158, -105], z: [9.9, 21.5] },
    { name: 'Elixir · Fizz · Gin Project', kind: 'bar', x: [-103, -57], z: [9.9, 21.5] },
    { name: 'Chef’s Garden Kitchen · Raj Polo', kind: 'dining', x: [-158, -105], z: [-21.5, -9.9] },
    { name: 'Sweet Temptations · Boutique', kind: 'public', x: [-103, -57], z: [-21.5, -9.9] },
    { name: 'Atrio (livello superiore)', kind: 'public', x: [-8, 18], z: [-12, 12] },
    { name: 'MSC Aurea Spa', kind: 'public', x: [24, 92], z: [-18, 18] },
    { name: 'Aree equipaggio', kind: 'crew', x: [96, 140], z: [-16, 16] },
  ],
  15: [{ name: 'Ponte di comando', kind: 'crew', x: [112, 125], z: [-14, 14] }],
  16: [{ name: 'Yacht Club · Duplex Suite', kind: 'yc', x: [92, 123], z: [-18, 18] }],
  18: [
    { name: 'Zen Pool & Bar (dritta)', kind: 'pool', x: [-158, -100], z: [9, 22], node: 'zen' },
    { name: 'Zen Pool & Bar (babordo)', kind: 'pool', x: [-158, -100], z: [-22, -9] },
    { name: 'Il Mercato Buffet', kind: 'dining', x: [-55, -5], z: [-20, 20] },
    { name: 'Botanic Garden Pool', kind: 'pool', x: [-5, 22], z: [-15.5, 15.5], node: 'pool-botanic' },
    { name: 'La Plage', kind: 'pool', x: [22, 55], z: [-15.5, 15.5], node: 'pool-plage' },
    { name: 'Rive Gauche & Rive Droite', kind: 'bar', x: [-5, 55], z: [16.5, 22] },
    { name: 'MSC Yacht Club', kind: 'yc', x: [57, 120], z: [-20, 20] },
  ],
  19: [
    { name: 'Kids club', kind: 'public', x: [-55, -5], z: [-20, 20] },
    { name: 'Top Sail Lounge', kind: 'yc', x: [57, 117], z: [-20, 20] },
  ],
  20: [
    { name: 'MSC Gym · Sportplex', kind: 'public', x: [-55, -5], z: [-20, 20] },
    { name: 'Aurora Borealis Aquapark', kind: 'pool', x: [-5, 55], z: [16, 22.5] },
    { name: 'Top 20 Solarium', kind: 'outdoor', x: [-5, 55], z: [-22.5, -16] },
    { name: 'Yacht Club Restaurant', kind: 'yc', x: [57, 113], z: [-20, 20] },
  ],
  21: [
    { name: 'Cabine', kind: 'cabins', x: [-55, -5], z: [-20, 20] },
    { name: 'Yacht Club Suite', kind: 'yc', x: [57, 108], z: [-20, 20] },
  ],
  22: [
    { name: 'Scivoli e The Spiral', kind: 'pool', x: [-55, -5], z: [-20, 20], node: 'slides' },
    { name: 'Yacht Club Sundeck', kind: 'yc', x: [60, 108], z: [-18, 18], node: 'sundeck' },
  ],
};

// Ponti di sole cabine: zone generate (balcone esterne, interne, vista World Promenade).
for (const n of [9, 10, 11, 12, 14, 15, 16]) {
  const list = ZONES[n] || [];
  const fwdEnd = n === 15 ? 110 : n === 16 ? 90 : 122;
  list.unshift(
    { name: 'Cabine con balcone', kind: 'cabins', x: [-55, fwdEnd], z: [12, 22] },
    { name: 'Cabine interne', kind: 'cabins', x: [-55, fwdEnd], z: [-10, 10] },
    { name: 'Cabine con balcone', kind: 'cabins', x: [-55, fwdEnd], z: [-22, -12] },
    { name: 'Cabine vista World Promenade', kind: 'cabins', x: [-158, -57], z: [9.9, 22] },
    { name: 'Cabine vista World Promenade', kind: 'cabins', x: [-158, -57], z: [-22, -9.9] },
  );
  ZONES[n] = list;
}

// Grafo del tour 360°. pos = [x, z] in coordinate nave; il ponte dà la quota
// (eye = quota occhi esplicita dove il pavimento è inclinato, come in teatro).
// space: 'exterior' usa il modello esterno; gli altri sono interni modellati.
// photo: percorso opzionale di una foto equirettangolare reale (sostituisce la vista 3D).
export const TOUR_NODES = [
  {
    id: 'promenade-aft', name: 'World Promenade · poppa', deck: 8, pos: [-146, 0], space: 'exterior', yaw: 0,
    area: 'Poppa', links: ['promenade-mid', 'zen'],
    hotspots: [{ at: [-110, 30, 0], title: 'World Promenade', text: 'Passeggiata all’aperto lunga 104 m, aperta verso poppa tra le due ali della nave.' }],
  },
  {
    id: 'promenade-mid', name: 'World Promenade', deck: 8, pos: [-112, 0], space: 'exterior', yaw: 0,
    area: 'Poppa', links: ['promenade-aft', 'promenade-spiral'],
    hotspots: [{ at: [-112, 20, 16], title: 'Ristoranti e bar', text: 'Sulle due ali si affacciano locali con tavoli all’aperto, come La Pescaderia e Coffee Emporium.' }],
  },
  {
    id: 'promenade-spiral', name: 'Arrivo di The Spiral', deck: 8, pos: [-82, 0], space: 'exterior', yaw: 0,
    area: 'Centro-poppa', links: ['promenade-mid', 'galleria-aft'],
    hotspots: [{ at: [-68, 30, 0], title: 'The Spiral', text: 'Lo scivolo a secco più lungo in mare: 11 ponti, dal ponte 22 fino alla World Promenade.' }],
  },
  {
    id: 'galleria-aft', name: 'World Galleria', deck: 6, pos: [-46, 0], space: 'interior', yaw: 0,
    area: 'Centro-poppa', links: ['promenade-spiral', 'galleria-fwd'],
    hotspots: [{ at: [-30, 18.4, 0], title: 'Cupola LED', text: 'La galleria è coperta da una cupola LED cinetica che cambia scenografia durante la giornata.' }],
  },
  {
    id: 'galleria-fwd', name: 'World Galleria · negozi', deck: 6, pos: [-22, 0], space: 'interior', yaw: 0,
    area: 'Centro nave', links: ['galleria-aft', 'atrium'],
    hotspots: [{ at: [-22, 10.8, -8.8], title: 'Shopping Gallery', text: 'Moda, bellezza, gioielli, orologi e il cioccolato di Jean-Philippe Maury.' }],
  },
  {
    id: 'atrium', name: 'Atrio centrale', deck: 6, pos: [8, 6.5], space: 'interior', yaw: Math.PI,
    area: 'Centro nave', links: ['galleria-fwd', 'atrium-7', 'theatre-stalls'],
    hotspots: [{ at: [1.5, 11.4, 0], title: 'Scalinata di cristallo', text: 'La scalinata scintillante collega i ponti dell’atrio, tratto tipico delle navi MSC.' }],
  },
  {
    id: 'atrium-7', name: 'Atrio · ponte 7', deck: 7, pos: [5, -8.2], space: 'interior', yaw: Math.PI / 2,
    area: 'Centro nave', links: ['atrium'],
    hotspots: [{ at: [-6, 14.5, 8], title: 'Ascensori panoramici', text: 'Ascensori con pareti e pavimento in vetro, a centro nave.' }],
  },
  {
    id: 'theatre-stalls', name: 'World Theatre · platea', deck: 6, pos: [104, 0], eye: 13.4, space: 'theatre', yaw: 0,
    area: 'Prua', links: ['theatre-balcony', 'atrium'],
    hotspots: [{ at: [131, 13, 0], title: 'World Theatre', text: '1.153 posti su due livelli, a prua, per gli spettacoli serali.' }],
  },
  {
    id: 'theatre-balcony', name: 'World Theatre · galleria', deck: 7, pos: [96.5, 0], eye: 15.6, space: 'theatre', yaw: 0,
    area: 'Prua', links: ['theatre-stalls'],
    hotspots: [],
  },
  {
    id: 'pool-botanic', name: 'Botanic Garden Pool', deck: 18, pos: [6, -8], space: 'exterior', yaw: 0.35,
    area: 'Centro nave', links: ['pool-plage', 'slides'],
    hotspots: [{ at: [9, 47.5, 0], title: 'Tetto retrattile', text: 'La piscina botanica ha una copertura in vetro che si apre con il bel tempo.' }],
  },
  {
    id: 'pool-plage', name: 'La Plage', deck: 18, pos: [38, -10], space: 'exterior', yaw: 0.6,
    area: 'Centro-prua', links: ['pool-botanic', 'sundeck'],
    hotspots: [{ at: [38, 40, 0], title: 'Piscina principale', text: 'Una delle 7 piscine di bordo, circondata dai bar Rive Gauche e Rive Droite.' }],
  },
  {
    id: 'zen', name: 'Zen Pool & Bar', deck: 18, pos: [-128, 15.5], space: 'exterior', yaw: Math.PI,
    area: 'Poppa', links: ['promenade-aft', 'slides'],
    hotspots: [{ at: [-145, 40, 15.5], title: 'Area Zen', text: 'Zona solo adulti a poppa: due piscine, solarium e bar all’ombra con vista mare.' }],
  },
  {
    id: 'slides', name: 'Scivoli e The Spiral', deck: 22, pos: [-46, -8], space: 'exterior', yaw: Math.PI,
    area: 'Centro-poppa', links: ['pool-botanic', 'zen'],
    hotspots: [{ at: [-68, 54, 0], title: 'Partenza di The Spiral', text: 'Da qui parte la discesa di 11 ponti fino alla World Promenade.' }],
  },
  {
    id: 'sundeck', name: 'Yacht Club Sundeck', deck: 22, pos: [80, 0], space: 'exterior', yaw: 0,
    area: 'Prua', links: ['pool-plage'],
    hotspots: [{ at: [130, 30, 0], title: 'Vista di prua', text: 'Il solarium riservato dell’MSC Yacht Club, la “nave nella nave”.' }],
  },
];

export const CRUISES = [
  {
    id: 'med-7',
    shipId: SHIP.id,
    title: 'Mediterraneo occidentale',
    nights: 7,
    homePort: 'Genova',
    // Itinerario di esempio: date e prezzi vanno presi dal catalogo MSC.
    days: ['Genova', 'Napoli', 'Messina', 'La Valletta', 'Navigazione', 'Barcellona', 'Marsiglia', 'Genova'],
  },
];
