import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { characters } from '../src/data/characters';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTRAITS_DIR = path.join(__dirname, '..', 'public', 'assets', 'portraits');

if (!fs.existsSync(PORTRAITS_DIR)) {
  fs.mkdirSync(PORTRAITS_DIR, { recursive: true });
}

// Special overrides for character wiki page titles where simple nameEn doesn't match
const TITLE_OVERRIDES: Record<string, string> = {
  arianrhod: 'Arianrhod',
  siegfried: 'Azure_Siegfried',
  shirley: 'Shirley_Orlando',
  sigmund: 'Sigmund_Orlando',
  george: 'George_Nome',
  schmidt: 'G._Schmidt',
  alberich: 'Black_Alberich',
  osborne: 'Giliath_Osborne',
  olivert: 'Olivert_Reise_Arnor',
  cedric: 'Cedric_Reise_Arnor',
  alfin: 'Alfin_Reise_Arnor',
  waltz: 'Waltz',
  c: 'Rufus_Albarea',
  lapis: 'Lapis_Rosenberg',
  swin: 'Swin_Abel',
  nadia: 'Nadia_Rayne',
  gerard: 'Gerard_Dantes',
  melchior: 'Melchior',
  viola: 'Viola_(Kuro)',
  alexandre: 'Alexandre',
  shizuna: 'Shizuna_Rem_Misurugi',
  kurogane: 'Kurogane',
  elaine: 'Elaine_Auclair',
  rene: 'René_Kincaid',
  dingo: 'Dingo_Bradley',
  mariabell: 'Mariabell_Crois',
  dieter: 'Dieter_Crois',
  kea: 'KeA_Bannings',
  sergei: 'Sergei_Lou',
  dudley: 'Alex_Dudley',
  noel: 'Noel_Seeker',
  wazy: 'Wazy_Hemisphere',
  wald: 'Wald_Wales',
  zeit: 'Zeit',
  cecile: 'Cecile_Neuhof',
  cao: 'Cao_Lee',
  grace: 'Grace_Lynn',
  heiyue_elder: 'Heiyue',
  cassius: 'Cassius_Bright',
  richard: 'Alan_Richard',
  kanone: 'Kanone_Amalthea',
  don: 'Don_Capua',
  kyle: 'Kyle_Capua',
  josette: 'Josette_Capua',
  weissmann: 'Georg_Weissmann',
  loewe: 'Loewe',
  bleublanc: 'Bleublanc',
  walter: 'Walter_Kron',
  luciola: 'Luciola',
  campanella: 'Campanella',
  kevin: 'Kevin_Graham',
  ries: 'Ries_Argent',
  celest: 'Celeste_D._Auslese',
  rufus: 'Rufus_Albarea',
  claire: 'Claire_Rieveldt',
  lechter: 'Lechter_Arundel',
  millium: 'Millium_Orion',
  altina: 'Altina_Orion',
  ash: 'Ash_Carbide',
  musse: 'Musse_Egret',
  kurt: 'Kurt_Vander',
  juna: 'Juna_Crawford',
  tita: 'Tita_Russell',
  agate: 'Agate_Crosner',
  schera: 'Scherazard_Harvey',
  klaudia: 'Kloe_Rinz',
  zin: 'Zin_Vathek',
  mueller: 'Mueller_Vander',
  victor: 'Victor_S._Arseid',
  laura: 'Laura_S._Arseid',
  alisa: 'Alisa_Reinford',
  sharon: 'Sharon_Kreuger',
  irina: 'Irina_Reinford',
  angelica: 'Angelica_Rogner',
  towa: 'Towa_Herschel',
  elisabeth: 'Elise_Schwarzer',
  gaius: 'Gaius_Worzel',
  jusis: 'Jusis_Albarea',
  machias: 'Machias_Regnitz',
  emma: 'Emma_Millstein',
  celine: 'Celine',
  roselia: 'Roselia_Millstein',
  vita: 'Vita_Clotilde',
  aurelia: 'Aurelia_Le_Guin',
  bardias: 'Wallace_Bardias',
  michael: 'Michael_Irving',
  randy: 'Randy_Orlando',
  rutger: 'Rutger_Claussell',
  xeno: 'Xeno',
  leonidas: 'Leonidas',
  ines: 'Ines',
  ennea: 'Ennea',
  duvalie: 'Duvalie',
  mcburn: 'McBurn',
  van: 'Van_Arkride',
  agnes: 'Agnès_Claudel',
  feri: 'Feri_Al-Fayed',
  aaron: 'Aaron_Wei',
  risette: 'Risette_Twinings',
  quatre: 'Quatre_Salisôn',
  judith: 'Judith_Ranster',
  bergard: 'Bergard_Zeman',
  grendel: 'Grendel',
  kloe: 'Kloe_Rinz',
  klaudia: 'Kloe_Rinz',
  loewe: 'Loewe',
  kea: 'KeA',
  cecile: 'Cecile_Neues',
  schmidt: 'G._Schmidt',
  c_rufus: 'Rufus_Albarea',
  rufus_clone: 'Rufus_Albarea',
  emperor: 'The_Emperor',
  dingo: 'Dingo_Bradley',
  gerard: 'Gerard_Dant%C3%A8s',
  viola: 'Viola_(Kuro)',
  grendel_zolga: 'Grendel-Zolga',
};

async function fetchWikiThumbnails(titles: string[]): Promise<Record<string, string>> {
  const url = `https://kiseki.fandom.com/api.php?action=query&titles=${encodeURIComponent(
    titles.join('|')
  )}&prop=pageimages&pithumbsize=400&format=json`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result: Record<string, string> = {};
          if (json.query && json.query.pages) {
            for (const key in json.query.pages) {
              const p = json.query.pages[key];
              if (p.thumbnail && p.thumbnail.source) {
                result[p.title.toLowerCase()] = p.thumbnail.source;
              }
            }
          }
          resolve(result);
        } catch {
          resolve({});
        }
      });
      res.on('error', () => resolve({}));
    });
  });
}

function downloadImage(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
      file.on('error', () => {
        fs.unlink(destPath, () => {});
        resolve(false);
      });
    }).on('error', () => resolve(false));
  });
}

async function main() {
  console.log(`Starting real portrait download for ${characters.length} characters...`);

  // Build list of wiki page titles
  const charTitleMap: { id: string; nameEn: string; wikiTitle: string }[] = [];
  for (const c of characters) {
    const override = TITLE_OVERRIDES[c.id];
    const wikiTitle = override || c.nameEn.replace(/ /g, '_');
    charTitleMap.push({ id: c.id, nameEn: c.nameEn, wikiTitle });
  }

  // Batch query in chunks of 20
  const urlMap: Record<string, string> = {};
  const batchSize = 20;
  for (let i = 0; i < charTitleMap.length; i += batchSize) {
    const chunk = charTitleMap.slice(i, i + batchSize);
    const titles = chunk.map((c) => c.wikiTitle);
    console.log(`Querying batch ${i / batchSize + 1}/${Math.ceil(charTitleMap.length / batchSize)}...`);
    const thumbs = await fetchWikiThumbnails(titles);

    for (const c of chunk) {
      // Find matching thumbnail in thumbs
      const key = c.wikiTitle.replace(/_/g, ' ').toLowerCase();
      let foundUrl = thumbs[key];
      if (!foundUrl) {
        // Try loose matching
        for (const [title, u] of Object.entries(thumbs)) {
          if (title.includes(c.id) || title.includes(c.nameEn.toLowerCase())) {
            foundUrl = u;
            break;
          }
        }
      }
      if (foundUrl) {
        urlMap[c.id] = foundUrl;
      }
    }
  }

  console.log(`Discovered ${Object.keys(urlMap).length} official portrait URLs from Kiseki Wiki.`);

  // Write static portrait mapping file
  const mappingContent = `// Auto-generated official Falcom character portrait URLs from Kiseki Wiki
export const CHARACTER_PORTRAITS: Record<string, string> = ${JSON.stringify(urlMap, null, 2)};
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'portraits.ts'), mappingContent, 'utf-8');
  console.log('Saved src/data/portraits.ts mapping successfully.');

  // Download each portrait into public/assets/portraits/{id}.webp
  let downloadedCount = 0;
  for (const [id, url] of Object.entries(urlMap)) {
    const dest = path.join(PORTRAITS_DIR, `${id}.webp`);
    const success = await downloadImage(url, dest);
    if (success) {
      downloadedCount++;
      process.stdout.write(`Downloaded: ${id} (${downloadedCount}/${Object.keys(urlMap).length})\r`);
    }
  }
  console.log(`\nFinished downloading ${downloadedCount} real portraits into public/assets/portraits/`);
}

main().catch(console.error);
