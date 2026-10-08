# Deckview

**Online:** https://fedegrax.github.io/msc-cruise-3d/

Concept di sito statico (nessun build step) per esplorare le navi MSC Crociere in 3D, con video tour, piani ponte e una passeggiata a bordo a 360°. Oggi c'è una sola nave: MSC World Europa.

## Pagine

- **`index.html`**: home e catalogo delle crociere, con la nave 3D in rotazione nell'hero.
- **`nave.html`**: modello 3D con OrbitControls, sezione per ponte, video tour a capitoli registrabile in `.webm` e piani ponte SVG. Supporta gli hash `#video` e `#piani`.
- **`tour.html`**: tour 360°. Frecce sul pavimento per muoversi, mappa del ponte con cono di vista, ascensore tra ponti, hotspot informativi, giroscopio su smartphone. Con l'hash `#<idNodo>` (es. `tour.html#promenade-mid`) si apre un punto preciso; il pulsante di condivisione copia il link della vista.

## Avvio in locale

I moduli ES non funzionano da `file://`: serve la cartella con un server statico, per esempio:

```sh
npx http-server -c-1 .          # porta 8080 di default
# oppure
python3 -m http.server 8080
```

Poi apri http://localhost:8080.

## Pubblicazione su GitHub Pages

1. Repo → **Settings → Pages**.
2. **Source**: "Deploy from a branch".
3. **Branch** `main`, cartella `/ (root)`, poi **Save**.
4. Il sito è su `https://<utente>.github.io/msc-cruise-3d/`.

Il file `.nojekyll` è già presente: GitHub Pages pubblica i file così come sono, senza passarli da Jekyll.

## Struttura del codice

```text
.
├── index.html            home e catalogo crociere
├── nave.html             modello 3D, video tour, piani ponte
├── tour.html             tour a bordo a 360°
├── crediti.html          crediti, fonti e licenze
├── 404.html              pagina non trovata (GitHub Pages)
├── og.jpg                anteprima per i social, renderizzata dal modello
├── favicon.svg
├── fonts/                font self-hosted (OFL), niente richieste esterne
├── assets/               modelli, texture, cielo HDRI e foto reali (vedi assets/CREDITS.md)
├── .nojekyll             disattiva Jekyll su GitHub Pages
├── css/
│   └── style.css         stile unico per tutte le pagine
├── js/
│   ├── data/
│   │   └── world-europa.js   unica fonte di verità: misure, ponti, zone, nodi del tour, crociere
│   ├── ship/
│   │   ├── geometry.js       geometria parametrica pura (scafo, sovrastrutture), condivisa da 3D e piani
│   │   ├── model.js          modello 3D della nave
│   │   ├── interiors.js      atrio, World Galleria, World Theatre
│   │   ├── props.js          arredi reali, palme LED, lettini, ombrelloni, vetrine
│   │   └── textures.js       texture generate su canvas
│   ├── three/
│   │   ├── assets.js         caricamento di texture PBR e modelli glTF reali
│   │   ├── environment.js    cielo, mare, luci
│   │   ├── stage.js          scena condivisa, loop di rendering, snapshot; carica il glTF se presente
│   │   ├── spaces.js         cambio esterno/interni
│   │   └── cinematic.js      video tour a capitoli
│   ├── ui/
│   │   ├── deckplan.js       piani ponte SVG
│   │   └── icons.js          icone SVG
│   └── pages/                script delle tre pagine (home.js, ship.js, tour.js)
└── vendor/three/         Three.js 0.169 (MIT)
```

## Precisione del modello

Il modello è **parametrico**: viene costruito in codice dalle dimensioni pubbliche della nave (lunghezza 333,3 m, larghezza 47 m, pescaggio ~9 m, 16 ponti passeggeri numerati 5–22 senza il 13 e il 17, layout a Y di poppa con la World Promenade, The Spiral su 11 ponti, ecc.).

**Non è il progetto del cantiere.** Linee dello scafo, quote dei ponti e posizioni dei locali sono approssimazioni ricavate dai piani ponte pubblici.

Per una geometria esatta:

1. Ottieni il modello ufficiale (CAD) dal cantiere o da MSC ed esportalo in glTF/GLB, con unità in metri.
2. Salvalo in `assets/models/world-europa.glb`.
3. In `SHIP` (`js/data/world-europa.js`) imposta `gltf: 'assets/models/world-europa.glb'`.

`stage.js` usa il glTF al posto del modello parametrico; se il caricamento fallisce, ripiega sul parametrico con un warning in console. Gli interni (atrio, galleria, teatro) restano quelli di `interiors.js`.

Attenzione alle coordinate: zone dei piani e nodi del tour sono in coordinate nave, in metri: x lungo lo scafo (prua = +x), y = quota sul galleggiamento, z trasversale (dritta = +z). Il glTF deve usare la stessa origine e gli stessi assi, altrimenti piani e frecce non coincidono con il modello.

## Foto 360° reali

Ogni nodo in `TOUR_NODES` può avere `photo: 'assets/360/<id>.jpg'`: un'immagine equirettangolare 2:1 (es. 8192×4096, da una camera 360°). `tour.js` la mostra su una sfera al posto della vista 3D.

- Da o verso un nodo con foto la transizione è una dissolvenza, non la camminata.
- Le miniature della filmstrip restano renderizzate dal modello 3D.

## Aggiungere una nave

1. Duplica `js/data/world-europa.js` e adatta `SHIP`, `DECKS`, `ZONES`, `TOUR_NODES` e `CRUISES`.
2. `geometry.js`, `model.js`, `interiors.js` e `deckplan.js` importano i dati di questa nave, e `geometry.js` contiene strutture specifiche (`STRUCTURES`, `SPIRAL`, `FUNNEL`…). Per un'altra nave serve un glTF oppure riscrivere quei dati.
3. Le pagine importano `world-europa.js` direttamente: un piccolo router o selettore di nave è il prossimo passo.

## Fonti

- Scheda nave e piani ponte: [CruiseMapper, MSC World Europa](https://www.cruisemapper.com/deckplans/MSC-World-Europa-2183)
- Articolo di lancio: [CruiseMapper](https://www.cruisemapper.com/news/10392-details-revealed-msc-world-europa-cruise-ship)

I dati sono quelli pubblici di queste fonti; le posizioni dei locali sono indicative.

## Oggetti e materiali reali

- Arredi e piante: modelli fotogrammetrici Poly Haven (CC0) caricati da `js/three/assets.js` e posizionati in `js/ship/props.js`.
- Ponti in teak, marmo, legno, velluto e piastrelle: texture PBR fotografiche Poly Haven (CC0).
- Cielo e riflessi: HDRI fotografico; la direzione del sole è calcolata dall'immagine, così luce, ombre e riflessi coincidono.
- World Promenade: palme LED in acciaio alle due estremità e verde lungo le pareti, come descritto nei materiali di lancio della nave.
- Vetrine della World Galleria: foto reali di negozi (Pexels).
- Le foto e i panorami del [tour ufficiale MSC](https://virtual-tours.msccruises.com/MSC-world-europa/it-it/index.html) sono di MSC e non sono inclusi: il sito ci rimanda con un link. Con l'autorizzazione di MSC, i loro panorami equirettangolari si collegano ai punti del tour tramite il campo `photo` (vedi sopra).

Elenco completo e licenze: [`assets/CREDITS.md`](assets/CREDITS.md).

## Licenze

- Three.js: licenza MIT, testo in `vendor/three/LICENSE`.
- Progetto concept, **non affiliato a MSC Crociere**. Nomi di navi e locali sono citati a scopo descrittivo.
