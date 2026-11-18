import { z } from 'zod';

// ============================================================================
// DOMAIN TYPES & CONSTANTS
// ============================================================================

export type GameId =
  | 'sky_fc' | 'sky_sc' | 'sky_3rd'
  | 'zero' | 'azure'
  | 'cs1' | 'cs2' | 'cs3' | 'cs4'
  | 'reverie'
  | 'daybreak1' | 'daybreak2';

export const GAME_ORDER: Record<GameId, number> = {
  sky_fc: 0,
  sky_sc: 1,
  sky_3rd: 2,
  zero: 3,
  azure: 4,
  cs1: 5,
  cs2: 6,
  cs3: 7,
  cs4: 8,
  reverie: 9,
  daybreak1: 10,
  daybreak2: 11,
};

export const ALL_GAME_IDS: GameId[] = [
  'sky_fc', 'sky_sc', 'sky_3rd',
  'zero', 'azure',
  'cs1', 'cs2', 'cs3', 'cs4',
  'reverie',
  'daybreak1', 'daybreak2',
];

export type RelationshipType = 'mentor' | 'comrade' | 'family' | 'rival' | 'secret';

export const ALL_RELATIONSHIP_TYPES: RelationshipType[] = [
  'mentor', 'comrade', 'family', 'rival', 'secret'
];

// ============================================================================
// ZOD DOMAIN SCHEMAS
// ============================================================================

export const GameArcSchema = z.object({
  id: z.enum([
    'sky_fc', 'sky_sc', 'sky_3rd',
    'zero', 'azure',
    'cs1', 'cs2', 'cs3', 'cs4',
    'reverie',
    'daybreak1', 'daybreak2',
  ]),
  index: z.number().int().min(0).max(11),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  year: z.string().min(1),
  region: z.string().min(1),
  orbmentSystem: z.string().min(1),
  activeFactions: z.array(z.string()).min(1),
  chapterConflicts: z.array(
    z.object({
      chapter: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
    })
  ).min(1),
});

export type GameArc = z.infer<typeof GameArcSchema>;

export const FactionSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  arc: z.string().min(1),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  description: z.string().min(1),
  crestUrl: z.string().min(1),
  ranks: z.array(z.string()).default([]),
});

export type Faction = z.infer<typeof FactionSchema>;

export const CharacterSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  titleEn: z.string().min(1),
  titleJa: z.string().min(1),
  factionId: z.string().min(1),
  subgroupId: z.string().optional(),
  debutGame: z.enum([
    'sky_fc', 'sky_sc', 'sky_3rd',
    'zero', 'azure',
    'cs1', 'cs2', 'cs3', 'cs4',
    'reverie',
    'daybreak1', 'daybreak2',
  ]),
  weapons: z.array(z.string()).min(1),
  seiyuu: z.string().min(1),
  bioEn: z.string().min(1),
  bioJa: z.string().min(1),
  initials: z.string().length(2),
  variants: z.record(
    z.string(),
    z.object({
      portraitUrl: z.string().optional(),
      titleEn: z.string().optional(),
    })
  ).optional(),
  spoilerNotes: z.array(
    z.object({
      minGame: z.enum([
        'sky_fc', 'sky_sc', 'sky_3rd',
        'zero', 'azure',
        'cs1', 'cs2', 'cs3', 'cs4',
        'reverie',
        'daybreak1', 'daybreak2',
      ]),
      note: z.string().min(1),
    })
  ).optional(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const RelationshipSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(['mentor', 'comrade', 'family', 'rival', 'secret']),
  labelEn: z.string().min(1),
  labelJa: z.string().min(1),
  descEn: z.string().min(1),
  descJa: z.string().min(1),
  debutGame: z.enum([
    'sky_fc', 'sky_sc', 'sky_3rd',
    'zero', 'azure',
    'cs1', 'cs2', 'cs3', 'cs4',
    'reverie',
    'daybreak1', 'daybreak2',
  ]),
  spoilerDebutGame: z.enum([
    'sky_fc', 'sky_sc', 'sky_3rd',
    'zero', 'azure',
    'cs1', 'cs2', 'cs3', 'cs4',
    'reverie',
    'daybreak1', 'daybreak2',
  ]).optional(),
  isSecret: z.boolean().optional(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

export const PersistentStateSchema = z.object({
  version: z.literal(1),
  selectedGameId: z.enum([
    'sky_fc', 'sky_sc', 'sky_3rd',
    'zero', 'azure',
    'cs1', 'cs2', 'cs3', 'cs4',
    'reverie',
    'daybreak1', 'daybreak2',
  ]),
  activeView: z.enum(['tree', 'network', 'pathfinder', 'deepdive']),
  selectedCharId: z.string(),
  highContrastMode: z.boolean(),
  language: z.enum(['en', 'ja']),
  unmaskedSpoilerIds: z.array(z.string()),
  physicsConfig: z.object({
    gravity: z.number().min(0).max(1),
    repulsion: z.number().min(50).max(1500),
    linkDistance: z.number().min(20).max(400),
    damping: z.number().min(0.1).max(0.99),
    isPaused: z.boolean(),
  }),
});

export type PersistentState = z.infer<typeof PersistentStateSchema>;

// ============================================================================
// CANONICAL MASTER DATASET (12 Games, 14 Factions, 106 Characters, 120+ Relationships)
// ============================================================================

export const CANONICAL_GAMES: GameArc[] = [
  {
    id: 'sky_fc',
    index: 0,
    nameEn: 'Trails in the Sky FC',
    nameJa: '空の軌跡 FC',
    year: 'S.1202',
    region: 'Kingdom of Liberl',
    orbmentSystem: '1st Gen Tactical Orbment',
    activeFactions: ['bracer_guild', 'royal_guard', 'intelligence_division', 'sky_bandits'],
    chapterConflicts: [
      { chapter: 'Prologue', title: "A Father's Departure", summary: 'Estelle and Joshua qualify as Junior Bracers in Rolent; Cassius departs.' },
      { chapter: 'Chapter 1', title: 'Disappearance of the Linde', summary: 'Search for hijacked airliner Linde in Bose; Capua Sky Bandits confrontation.' },
      { chapter: 'Chapter 2', title: 'White Flower Madrigal', summary: 'Mayor Dalmore corruption and orphanage arson in Ruan.' },
      { chapter: 'Chapter 3', title: 'The Black Orbment', summary: 'ZCF sabotage in Zeiss; Professor Russell kidnapped by black-clad operatives.' },
      { chapter: 'Final Chapter', title: 'Autumn Sovereign', summary: "Queen's Birthday competition; Colonel Richard coup d'etat thwarted; Joshua reveals identity." },
    ],
  },
  {
    id: 'sky_sc',
    index: 1,
    nameEn: 'Trails in the Sky SC',
    nameJa: '空の軌跡 SC',
    year: 'S.1202 - S.1203',
    region: 'Kingdom of Liberl',
    orbmentSystem: '2nd Gen Tactical Orbment',
    activeFactions: ['bracer_guild', 'royal_guard', 'ouroboros', 'gralsritter'],
    chapterConflicts: [
      { chapter: 'Prologue - Ch. 3', title: 'Shadows of the Gospels', summary: 'Estelle investigates experimental Gospel phenomena across Liberl.' },
      { chapter: 'Ch. 4 - Ch. 5', title: 'Mist and Earth', summary: 'Rolent mist incident with Lucciola; Bose dragon incident with Walter.' },
      { chapter: 'Ch. 6 - Ch. 7', title: 'Labyrinth of Shadows', summary: 'Liberation of Joshua and awakening of the four elemental towers.' },
      { chapter: 'Finale', title: 'The Aureole / Liber-Ark', summary: 'Floating city Liber-Ark descent; confrontation with Loewe and Weissmann.' },
    ],
  },
  {
    id: 'sky_3rd',
    index: 2,
    nameEn: 'Trails in the Sky the 3rd',
    nameJa: '空の軌跡 the 3rd',
    year: 'S.1203 - S.1204',
    region: 'Phantasma / Recluse Cube',
    orbmentSystem: '2nd Gen Tactical Orbment',
    activeFactions: ['gralsritter', 'hermit_garden', 'phantasma'],
    chapterConflicts: [
      { chapter: 'Prologue - Ch. 2', title: 'The Recluse Cube', summary: 'Kevin and Ries are pulled into the extradimensional realm of Phantasma.' },
      { chapter: 'Ch. 3 - Ch. 6', title: 'Doors of Memory', summary: 'Hermits Garden exploration unlocking Star, Moon, and Sun Doors detailing deep lore.' },
      { chapter: 'Finale', title: 'Land of Judgment', summary: 'Kevin confronts his Stigma awakening; defeat of the Lord of Phantasma.' },
    ],
  },
  {
    id: 'zero',
    index: 3,
    nameEn: 'Trails from Zero',
    nameJa: '零の軌跡',
    year: 'S.1204',
    region: 'Crossbell State',
    orbmentSystem: 'ENIGMA Orbment',
    activeFactions: ['sss', 'crossbell_police', 'heiyue', 'revache', 'dg_cult', 'arc_en_ciel'],
    chapterConflicts: [
      { chapter: 'Prologue - Ch. 1', title: 'The SSS Underdogs', summary: 'SSS established to regain public trust; downtown gang mediation.' },
      { chapter: 'Ch. 2', title: 'Golden Sun, Silver Moon', summary: 'Arc en Ciel threat letter; debut of Rixia Mao as dancer Yin.' },
      { chapter: 'Ch. 3', title: 'Anniversary Festival', summary: 'Auction at Rosenberg Studio; rescue of the mysterious child KeA.' },
      { chapter: 'Finale', title: 'Gnosis Crisis', summary: 'D∴G Cult Priest Joachim Guenter assaults the city; Sun Fort raid.' },
    ],
  },
  {
    id: 'azure',
    index: 4,
    nameEn: 'Trails to Azure',
    nameJa: '碧の軌跡',
    year: 'S.1204 - S.1205',
    region: 'Crossbell State',
    orbmentSystem: 'ENIGMA II Orbment',
    activeFactions: ['sss', 'red_constellation', 'bellguard', 'ouroboros', 'ibc'],
    chapterConflicts: [
      { chapter: 'Prologue - Ch. 2', title: 'West Zemuria Trade Conference', summary: 'Diplomatic summit at Orchis Tower; terrorist attacks repelled.' },
      { chapter: 'Ch. 3', title: 'Budding Turmoil', summary: 'Red Constellation jaeger raid devastates downtown Crossbell.' },
      { chapter: 'Ch. 4', title: 'Crossbell Independence Declaration', summary: 'Dieter Crois declares independence; Garrelia Fortress obliterated by Aion.' },
      { chapter: 'Finale', title: 'The Azure Tree', summary: 'KeA alters causality; SSS storms Azure Tree; Crossbell annexed by Erebonia.' },
    ],
  },
  {
    id: 'cs1',
    index: 5,
    nameEn: 'Trails of Cold Steel I',
    nameJa: '閃の軌跡',
    year: 'S.1204',
    region: 'Erebonian Empire (Trista)',
    orbmentSystem: 'ARCUS Tactical Link',
    activeFactions: ['class_vii_old', 'thors_main', 'ironbloods', 'noble_alliance', 'ilf'],
    chapterConflicts: [
      { chapter: 'Ch. 1 - Ch. 3', title: 'Field Studies', summary: 'Class VII exercises in Celdic, Bareahard, and Nord Highlands.' },
      { chapter: 'Ch. 4 - Ch. 6', title: 'Rising Terrorism', summary: 'Midsummer festival catacombs and Roer Reinford industrial sabotage.' },
      { chapter: 'Finale', title: 'Assassination & Ashen Awakener', summary: 'Osborne shot by sniper "C"; Rean awakens Valimar as civil war erupts.' },
    ],
  },
  {
    id: 'cs2',
    index: 6,
    nameEn: 'Trails of Cold Steel II',
    nameJa: '閃の軌跡 II',
    year: 'S.1204 - S.1205',
    region: 'Erebonian Empire (Civil War)',
    orbmentSystem: 'ARCUS Tactical Link / Overdrive',
    activeFactions: ['class_vii_old', 'courageous_crew', 'noble_alliance', 'ouroboros', 'imperial_army'],
    chapterConflicts: [
      { chapter: 'Act 1', title: 'Awakening & Gathering', summary: 'Rean awakens in Eisengard and reunites scattered Class VII comrades.' },
      { chapter: 'Act 2', title: 'The Courageous Airborne', summary: 'Class VII commands the Courageous to liberate occupied regions.' },
      { chapter: 'Finale', title: 'Vermillion Castle & Osborne Return', summary: 'Assault on Heimdallr; Osborne returns; Rean conscripted as Ashen Chevalier.' },
    ],
  },
  {
    id: 'cs3',
    index: 7,
    nameEn: 'Trails of Cold Steel III',
    nameJa: '閃の軌跡 III',
    year: 'S.1206',
    region: 'Erebonia (Leeves & Provinces)',
    orbmentSystem: 'ARCUS II Tactical Network',
    activeFactions: ['class_vii_new', 'class_vii_old', 'ironbloods', 'ouroboros', 'black_workshop'],
    chapterConflicts: [
      { chapter: 'Ch. 1 - Ch. 3', title: 'Field Exercises Across Empire', summary: 'Derfflinger deploys to Sutherland, Crossbell, and Lamare.' },
      { chapter: 'Ch. 4', title: 'Heimdallr Summer Solstice Festival', summary: 'Dark dragon investigation; Ash shoots Emperor Eugent III.' },
      { chapter: 'Finale', title: 'Gral of Erebos & Great Twilight', summary: 'Millium sacrifices herself into Sword of the End; Great Twilight unleashed.' },
    ],
  },
  {
    id: 'cs4',
    index: 8,
    nameEn: 'Trails of Cold Steel IV',
    nameJa: '閃の軌跡 IV -THE END OF SAGA-',
    year: 'S.1206',
    region: 'Erebonian Empire (Full Territory)',
    orbmentSystem: 'ARCUS II Tactical Network',
    activeFactions: ['class_vii_new', 'class_vii_old', 'mille_mirage', 'rival_awakeners', 'ouroboros'],
    chapterConflicts: [
      { chapter: 'Act 1', title: 'Searching for the Ashen Knight', summary: 'Class VII rescues Rean from Black Workshop captivity and despair.' },
      { chapter: 'Act 2 - Act 3', title: 'Rivalries of the Seven', summary: 'Divine Knight sacred combat; Operation Mille Mirage mobilization.' },
      { chapter: 'Finale', title: 'Empyreal Fortress & Great One End', summary: 'Final Rivalry against Ishmelga; Great One destroyed; world war averted.' },
    ],
  },
  {
    id: 'reverie',
    index: 9,
    nameEn: 'Trails into Reverie',
    nameJa: '創の軌跡',
    year: 'S.1207',
    region: 'Crossbell & Erebonia',
    orbmentSystem: 'ARCUS II & ENIGMA Hybrid',
    activeFactions: ['sss', 'class_vii_old', 'c_route', 'supreme_leader_forces', 'trc'],
    chapterConflicts: [
      { chapter: 'Act 1 - Act 2', title: 'Crossbell Re-Annexed & Three Routes', summary: 'Supreme Leader Rufus ambushes ceremony; "C" awakens Lapis.' },
      { chapter: 'Act 3 - Act 4', title: 'The Three Crossings', summary: 'Routes converge to expose rogue AI Elysium and Simulacrum network.' },
      { chapter: 'Finale', title: 'Retributive Tower & True Independence', summary: 'Tower stormed; Rufus clone defeated; True Reverie Corridor unlocked.' },
    ],
  },
  {
    id: 'daybreak1',
    index: 10,
    nameEn: 'Trails through Daybreak I',
    nameJa: '黎の軌跡',
    year: 'S.1208',
    region: 'Republic of Calvard (Edith)',
    orbmentSystem: 'Xipha Tactical Orbment',
    activeFactions: ['arkride_solutions', 'cid', 'bracer_guild', 'heiyue', 'marduk', 'almata', 'ikaruga'],
    chapterConflicts: [
      { chapter: 'Prologue - Ch. 1', title: 'The Spriggan of Edith', summary: 'Agnes hires Van Arkride to locate the first Epstein Genesis relic.' },
      { chapter: 'Ch. 2 - Ch. 4', title: 'Across the Republic', summary: 'Investigations in Langport, Tharbad, and Basel; Grendel transformation.' },
      { chapter: 'Ch. 5', title: 'The Tragedy of Creil', summary: 'Almata detonates prototype dirty bomb; Creil annihilated; Oracion battle.' },
      { chapter: 'Finale', title: 'Nightmare in Edith', summary: 'Gerard plunges capital into eldritch barrier; Van demonic identity contained.' },
    ],
  },
  {
    id: 'daybreak2',
    index: 11,
    nameEn: 'Trails through Daybreak II -CRIMSON SiN-',
    nameJa: '黎の軌跡 II -CRIMSON SiN-',
    year: 'S.1208 - S.1209',
    region: 'Republic of Calvard (Edith)',
    orbmentSystem: 'Xipha Tactical Orbment (Shard Search)',
    activeFactions: ['arkride_solutions', 'cid', 'garden_remnants', 'ouroboros', 'marchen_garten'],
    chapterConflicts: [
      { chapter: 'Prologue', title: 'The Crimson Slasher', summary: 'CID squad slaughtered by Grendel-Zolga; Van and Agnes investigate.' },
      { chapter: 'Act 1 - Act 2', title: 'Eighth Genesis & Time Rewind', summary: 'Lethal incidents trigger Genesis Time-Rewind (Leap) phenomenon.' },
      { chapter: 'Act 3', title: 'Intertwining Fates on Nemeth', summary: 'Pursuit across Nemeth Island confronting Garden operatives and Auguste.' },
      { chapter: 'Finale', title: 'Crimson Sin & The Grand Reset', summary: 'Identity of Grendel-Zolga revealed; planetary temporal reset prevented.' },
    ],
  },
];

export const CANONICAL_FACTIONS: Faction[] = [
  { id: 'bracer_guild', nameEn: 'Bracer Guild', nameJa: '遊撃士協会', arc: 'all', color: '#38bdf8', description: 'International peacekeeping non-governmental organization.', crestUrl: '/assets/factions/crest-bracer.svg', ranks: ['Junior', 'Senior', 'B-Rank', 'A-Rank', 'S-Rank'] },
  { id: 'royal_guard', nameEn: 'Liberl Royal Guard', nameJa: 'リベール親衛隊', arc: 'liberl', color: '#60a5fa', description: 'Elite military defense force of the Kingdom of Liberl.', crestUrl: '/assets/factions/crest-royal-guard.svg', ranks: ['Commander', 'Captain', 'Officer'] },
  { id: 'ouroboros', nameEn: 'Society of Ouroboros', nameJa: '身喰らう蛇', arc: 'all', color: '#a855f7', description: 'Secret society executing the Orpheus Final Plan.', crestUrl: '/assets/factions/crest-ouroboros.svg', ranks: ['Grandmaster', 'Anguis', 'Enforcer'] },
  { id: 'gralsritter', nameEn: 'Gralsritter', nameJa: '星杯騎士団', arc: 'all', color: '#eab308', description: 'Secret military chivalric order of the Septian Church.', crestUrl: '/assets/factions/crest-gralsritter.svg', ranks: ['Grand Master', 'Dominion', 'Knight', 'Squire'] },
  { id: 'sss', nameEn: 'Special Support Section', nameJa: '特務支援課', arc: 'crossbell', color: '#0ea5e9', description: 'Crossbell Police Department specialized community response unit.', crestUrl: '/assets/factions/crest-sss.svg', ranks: ['Chief', 'Section Leader', 'Investigator'] },
  { id: 'heiyue', nameEn: 'Heiyue Syndicate', nameJa: '黒月', arc: 'crossbell_calvard', color: '#f97316', description: 'Influential Eastern crime and business syndicate.', crestUrl: '/assets/factions/crest-heiyue.svg', ranks: ['Elder', 'Crossbell Branch Head', 'Successor'] },
  { id: 'red_constellation', nameEn: 'Red Constellation', nameJa: '赤い星座', arc: 'crossbell', color: '#dc2626', description: 'Premier Western Zemurian jaeger corps.', crestUrl: '/assets/factions/crest-red-constellation.svg', ranks: ['Commander', 'War Ogre', 'Bloody Shirley'] },
  { id: 'class_vii_old', nameEn: 'Original Class VII', nameJa: '特科クラスVII組', arc: 'erebonia', color: '#f59e0b', description: 'Experimental Thors Military Academy mixed-class division.', crestUrl: '/assets/factions/crest-thors.svg', ranks: ['Instructor', 'Awakener', 'Student'] },
  { id: 'class_vii_new', nameEn: 'New Class VII', nameJa: '新VII組', arc: 'erebonia', color: '#fbbf24', description: 'Thors Branch Campus Special Operations Class VII.', crestUrl: '/assets/factions/crest-branch.svg', ranks: ['Instructor', 'Class Representative', 'Special Cadet'] },
  { id: 'ironbloods', nameEn: "Chancellor's Ironbloods", nameJa: '鉄血の子供たち', arc: 'erebonia', color: '#f43f5e', description: 'Elite inner cadre serving Imperial Chancellor Giliath Osborne.', crestUrl: '/assets/factions/crest-ironbloods.svg', ranks: ['Chief', 'Jade Rook', 'Icy Maiden', 'Scarecrow'] },
  { id: 'black_workshop', nameEn: 'Black Workshop / Gnomes', nameJa: '黒の工房', arc: 'erebonia', color: '#64748b', description: 'Ancient Gnome clan forging Divine Knights and combat shells.', crestUrl: '/assets/factions/crest-gnomes.svg', ranks: ['Master', 'Copper', 'Azure Siegfried'] },
  { id: 'arkride_solutions', nameEn: 'Arkride Solutions Office', nameJa: 'アークライド解決事務所', arc: 'calvard', color: '#10b981', description: 'Spriggan underground consultancy office in Edith.', crestUrl: '/assets/factions/crest-arkride.svg', ranks: ['Representative', 'Assistant', 'Contractor'] },
  { id: 'almata', nameEn: 'Almata Mafia Syndicate', nameJa: 'アルマータ', arc: 'calvard', color: '#b91c1c', description: 'Brutal emerging Calvardian criminal mafia syndicate.', crestUrl: '/assets/factions/crest-almata.svg', ranks: ['Boss', 'Core Executive'] },
  { id: 'marduk', nameEn: 'Marduk Total Resource Support', nameJa: 'マルドゥック総合警備保障', arc: 'calvard', color: '#059669', description: 'Advanced PMC contractor based in Ored.', crestUrl: '/assets/factions/crest-marduk.svg', ranks: ['CEO', 'Security Chief', 'Concierge'] },
  { id: 'cid', nameEn: 'Central Intelligence Department', nameJa: 'CID', arc: 'calvard', color: '#0284c7', description: 'Republic of Calvard national security intelligence bureau.', crestUrl: '/assets/factions/crest-cid.svg', ranks: ['Director', 'Assistant Director', 'Special Agent'] },
];

export const CANONICAL_CHARACTERS: Character[] = [
  // LIBERL ARC (16)
  { id: 'estelle', nameEn: 'Estelle Bright', nameJa: 'エステル・ブライト', titleEn: 'Senior Bracer', titleJa: '正遊撃士', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Bo Staff'], seiyuu: 'Akemi Kanda', bioEn: 'Daughter of Cassius Bright, trained as a Bracer in Liberl.', bioJa: 'リベール王国出身の正遊撃士。カシウスの愛娘。', initials: 'EB', variants: { sky_fc: { titleEn: 'Junior Bracer' }, reverie: { titleEn: 'Liberl Bracer Vanguard' } } },
  { id: 'joshua', nameEn: 'Joshua Bright', nameJa: 'ヨシュア・ブライト', titleEn: 'Black Fang / Bracer', titleJa: '漆黒の牙 / 遊撃士', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Twin Dual Blades'], seiyuu: 'Mitsuki Saiga', bioEn: 'Estelle adopted brother and partner, formerly Enforcer No. XIII.', bioJa: 'エステルの相棒で義弟。元執行者No.XIII《漆黒の牙》。', initials: 'JB', spoilerNotes: [{ minGame: 'sky_sc', note: 'Revealed as Ouroboros Enforcer XIII.' }] },
  { id: 'scherazard', nameEn: 'Scherazard Harvey', nameJa: 'シェラザード・ハーヴェイ', titleEn: 'Silver Streak', titleJa: '銀閃のシェラザード', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Bullwhip', 'Wind Arts'], seiyuu: 'Yuka Komatsu', bioEn: 'Senior bracer and mentor to Estelle and Joshua.', bioJa: 'エステルたちの姉貴分である実力派正遊撃士。', initials: 'SH' },
  { id: 'olivert', nameEn: 'Olivert Reise Arnor', nameJa: 'オリヴァルト皇子', titleEn: 'The Debaucherous Prince', titleJa: '放蕩皇子', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Orbal Pistol', 'Lute'], seiyuu: 'Takehito Koyasu', bioEn: 'Erebonian prince who founded Class VII under the alias Olivier Lenheim.', bioJa: 'エレボニア帝国皇子。オリビエの名で旅をしていた。', initials: 'OA' },
  { id: 'kloe', nameEn: 'Kloe Rinz', nameJa: 'クローゼ・リンツ', titleEn: 'Crown Princess Klaudia', titleJa: 'クローディア王太女', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Rapier', 'Sieg'], seiyuu: 'Yuko Minaguchi', bioEn: 'Crown Princess of Liberl studying at Jenis Royal Academy.', bioJa: 'リベール王国の王太女。ジェニス王立学園生。', initials: 'KR' },
  { id: 'agate', nameEn: 'Agate Crosner', nameJa: 'アガット・クロスナー', titleEn: 'Heavy Blade', titleJa: '重剣のアガット', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Heavy Broadsword'], seiyuu: 'Takayuki Kondo', bioEn: 'Powerful Liberl bracer who wields a massive greatsword.', bioJa: '巨大な重剣を軽々と振るうリベールの正遊撃士。', initials: 'AC' },
  { id: 'tita', nameEn: 'Tita Russell', nameJa: 'ティタ・ラッセル', titleEn: 'Orbal Mechanic Cadet', titleJa: '技術少女', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Orbal Cannon', 'Orbal Gear'], seiyuu: 'Hiromi Konno', bioEn: 'Granddaughter of Professor Russell, skilled in orbal weaponry.', bioJa: 'ラッセル博士の孫娘。オーバルギアの操縦者。', initials: 'TR' },
  { id: 'zin', nameEn: 'Zin Vathek', nameJa: 'ジン・ヴァセック', titleEn: 'The Immovable', titleJa: '隻角のジン', factionId: 'bracer_guild', debutGame: 'sky_fc', weapons: ['Taito Gauntlets'], seiyuu: 'Tetsu Inada', bioEn: 'A-Rank bracer and master of the Taito martial arts school.', bioJa: '泰斗流の達人でカルバード出身のA級正遊撃士。', initials: 'ZV' },
  { id: 'cassius', nameEn: 'Cassius Bright', nameJa: 'カシウス・ブライト', titleEn: 'Divine Blade of Staff', titleJa: '剣聖カシウス', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Bo Staff', 'Tachi'], seiyuu: 'Daisuke Kishio', bioEn: 'Former S-Rank bracer, Divine Blade, and Liberl general.', bioJa: '元S級遊撃士。《八葉一刀流》剣聖でリベール王国軍中将。', initials: 'CB' },
  { id: 'kevin', nameEn: 'Kevin Graham', nameJa: 'ケビン・グラハム', titleEn: 'Fifth Dominion / Heretic Hunter', titleJa: '第五位《外法狩り》', factionId: 'gralsritter', debutGame: 'sky_sc', weapons: ['Crossbow', 'Stigma'], seiyuu: 'Joji Nakata', bioEn: 'Dominion of the Gralsritter burdened by a dark Stigma.', bioJa: '星杯騎士団の守護騎士・第五位。聖痕を持つ。', initials: 'KG' },
  { id: 'ries', nameEn: 'Ries Argent', nameJa: 'リース・アルジェント', titleEn: 'Squire of the Gralsritter', titleJa: '星杯騎士団従騎士', factionId: 'gralsritter', debutGame: 'sky_3rd', weapons: ['Templar Sword'], seiyuu: 'Houko Kuwashima', bioEn: 'Squire of the Septian Church and childhood friend of Kevin.', bioJa: '星杯騎士団の従騎士。ケビンの幼馴染。', initials: 'RA' },
  { id: 'richard', nameEn: 'Alan Richard', nameJa: 'アラン・リシャール', titleEn: 'Colonel / R&A Director', titleJa: '元大佐 / 調査会社所長', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Iai Sword'], seiyuu: 'Hiroshi Isobe', bioEn: 'Former Liberl Intelligence Colonel who founded R&A Research.', bioJa: '元情報部大佐。八葉一刀流五の型を修めた抜刀術の達人。', initials: 'AR' },
  { id: 'mueller', nameEn: 'Mueller Vander', nameJa: 'ミュラー・ヴァンダール', titleEn: 'Vander Swordsman', titleJa: 'ヴァンダール家の武人', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Claymore'], seiyuu: 'Hidenori Takahashi', bioEn: 'Imperial Army Major and bodyguard to Prince Olivert.', bioJa: '帝国軍中佐。オリヴァルト皇子の護衛役。', initials: 'MV' },
  { id: 'julia', nameEn: 'Julia Schwarz', nameJa: 'ユリア・シュワルツ', titleEn: 'Royal Guard Captain', titleJa: '親衛隊中隊長', factionId: 'royal_guard', debutGame: 'sky_fc', weapons: ['Court Rapier'], seiyuu: 'Yuka Komatsu', bioEn: 'Commander of the Arseille and captain of the Royal Guard.', bioJa: 'リベール王国親衛隊の隊長。高速巡洋艦アルセイユ号艦長。', initials: 'JS' },
  { id: 'renne', nameEn: 'Renne Bright', nameJa: 'レン・ブライト', titleEn: 'Angel of Slaughter / Bright Student', titleJa: '殲滅の天使 / 学生', factionId: 'bracer_guild', debutGame: 'sky_sc', weapons: ['Giant Scythe'], seiyuu: 'Aoi Yuki', bioEn: 'Former Ouroboros Enforcer XV, adopted into the Bright family.', bioJa: '元執行者No.XV。ブライト家の養女となり名門アラミス学園へ。', initials: 'RB', variants: { sky_sc: { titleEn: 'Enforcer No. XV' }, daybreak1: { titleEn: 'Aramis Student Council Pres' } } },
  { id: 'loewe', nameEn: 'Leonhardt', nameJa: 'レオンハルト', titleEn: 'The Blacheaven / Sword Emperor', titleJa: '剣帝レーヴェ', factionId: 'ouroboros', debutGame: 'sky_fc', weapons: ['Demon Sword Kernviter'], seiyuu: 'Hikaru Midorikawa', bioEn: 'Ouroboros Enforcer II and survivor of the Hamel tragedy.', bioJa: '身喰らう蛇・執行者No.II。ハーメルの悲劇の生き残り。', initials: 'LL', spoilerNotes: [{ minGame: 'sky_sc', note: 'Fought to the death in the Liber-Ark.' }] },

  // CROSSBELL ARC (16)
  { id: 'lloyd', nameEn: 'Lloyd Bannings', nameJa: 'ロイド・バニングス', titleEn: 'SSS Leader', titleJa: '特務支援課リーダー', factionId: 'sss', debutGame: 'zero', weapons: ['Dual Tonfas'], seiyuu: 'Tetsuya Kakihara', bioEn: 'Detective leader of the Crossbell Police SSS.', bioJa: 'クロスベル警察・特務支援課の若き捜査官兼リーダー。', initials: 'LB' },
  { id: 'elie', nameEn: 'Elie MacDowell', nameJa: 'エリィ・マクダエル', titleEn: 'SSS Negotiator', titleJa: '特務支援課の頭脳', factionId: 'sss', debutGame: 'zero', weapons: ['Orbal Gun'], seiyuu: 'Aya Endo', bioEn: 'Granddaughter of Mayor MacDowell and diplomatic core of SSS.', bioJa: 'クロスベル市長の令孫。卓越した交渉術を持つ。', initials: 'EM' },
  { id: 'tio', nameEn: 'Tio Plato', nameJa: 'ティオ・プラトー', titleEn: 'Epstein Specialist', titleJa: 'エプスタイン財団技術主任', factionId: 'sss', debutGame: 'zero', weapons: ['Orbal Staff'], seiyuu: 'Kaori Mizuhashi', bioEn: 'Epstein Foundation researcher testing tactical orbal gear.', bioJa: 'エプスタイン財団の若き研究員。感応能力に長ける。', initials: 'TP' },
  { id: 'randy', nameEn: 'Randy Orlando', nameJa: 'ランディ・オルランド', titleEn: 'Former Red Reaper', titleJa: '元《赤の死神》', factionId: 'sss', debutGame: 'zero', weapons: ['Stun Halberd'], seiyuu: 'Shinichiro Miki', bioEn: 'Former Red Constellation jaeger, now SSS vanguard.', bioJa: '赤い星座の元猟兵。支援課の頼れる兄貴分。', initials: 'RO' },
  { id: 'noel', nameEn: 'Noel Seeker', nameJa: 'ノエル・シーカー', titleEn: 'CGF Sergeant / SSS', titleJa: '元警備隊軍曹', factionId: 'sss', debutGame: 'zero', weapons: ['Dual Submachine Guns'], seiyuu: 'Masumi Asano', bioEn: 'Crossbell Guardian Force sergeant seconded to the SSS.', bioJa: 'クロスベル警備隊の隊員。重火器の扱いに長ける。', initials: 'NS' },
  { id: 'wazy', nameEn: 'Wazy Hemisphere', nameJa: 'ワジ・ヘミスフィア', titleEn: 'Ninth Dominion / Blue Testament', titleJa: '第九位《蒼の聖典》', factionId: 'gralsritter', debutGame: 'zero', weapons: ['Martial Arts', 'Stigma'], seiyuu: 'Junko Minagawa', bioEn: 'Former gang leader revealed as Dominion of the Gralsritter.', bioJa: '元不良集団のヘッド。星杯騎士団・第九位の守護騎士。', initials: 'WH' },
  { id: 'sergei', nameEn: 'Sergei Lou', nameJa: 'セルゲイ・ロウ', titleEn: 'SSS Section Chief', titleJa: '特務支援課課長', factionId: 'sss', debutGame: 'zero', weapons: ['Service Revolver'], seiyuu: 'Unsho Ishizuka', bioEn: 'Laid-back but sharp veteran chief of the SSS.', bioJa: '特務支援課の創設者にして懐の深い課長。', initials: 'SL' },
  { id: 'kea', nameEn: 'KeA Bannings', nameJa: 'キーア・バニングス', titleEn: 'Sept-Terrion of Zero', titleJa: '零の至宝', factionId: 'sss', debutGame: 'zero', weapons: ['Causality Arts'], seiyuu: 'Rie Kugimiya', bioEn: 'Mysterious homunculus girl who became the Sept-Terrion of Zero.', bioJa: '支援課に引き取られた謎の少女。《零の至宝》。', initials: 'KB', spoilerNotes: [{ minGame: 'azure', note: 'Altered Zemurian causality to protect Crossbell.' }] },
  { id: 'zeit', nameEn: 'Zeit', nameJa: 'ツァイト', titleEn: 'Holy Beast of Crossbell', titleJa: '神狼ツァイト', factionId: 'sss', debutGame: 'zero', weapons: ['Divine Fangs'], seiyuu: 'Osamu Takizawa', bioEn: 'Ancient holy beast guarding Crossbell, living as SSS mascot dog.', bioJa: '古代からクロスベルを見守る聖獣《神狼》。', initials: 'ZT' },
  { id: 'cecile', nameEn: 'Cecile Neues', nameJa: 'セシル・ノイエス', titleEn: 'St. Ursula Nurse', titleJa: 'ウルスラ病院看護師', factionId: 'sss', debutGame: 'zero', weapons: ['First Aid'], seiyuu: 'Sayaka Ohara', bioEn: 'Senior nurse at St. Ursula and fiancee of the late Guy Bannings.', bioJa: '聖ウルスラ医科大学の看護師。ガイの元婚約者。', initials: 'CN' },
  { id: 'guy', nameEn: 'Guy Bannings', nameJa: 'ガイ・バニングス', titleEn: 'Heroic Detective', titleJa: '捜査一課主任', factionId: 'sss', debutGame: 'zero', weapons: ['Tonfas'], seiyuu: 'Katsuyuki Konishi', bioEn: 'Lloyd older brother whose murder drove the Crossbell arc.', bioJa: 'ロイドの兄。捜査一課のエースだった伝説の捜査官。', initials: 'GB' },
  { id: 'arios', nameEn: 'Arios MacLaine', nameJa: 'アリオス・マクレイン', titleEn: 'Divine Blade of Wind', titleJa: '風の剣聖', factionId: 'bracer_guild', debutGame: 'zero', weapons: ['Tachi'], seiyuu: 'Toshiyuki Morikawa', bioEn: 'A-Rank bracer master of Eight Leaves Second Form.', bioJa: '八葉一刀流・弐の型を修めたA級遊撃士。', initials: 'AM' },
  { id: 'dudley', nameEn: 'Alex Dudley', nameJa: 'アレックス・ダドリー', titleEn: 'First Division Investigator', titleJa: '捜査一課エリート', factionId: 'sss', debutGame: 'zero', weapons: ['Orbal Revolver'], seiyuu: 'Joji Nakata', bioEn: 'Elite Crossbell First Division investigator assisting SSS.', bioJa: 'クロスベル警察捜査一課のエリート捜査官。', initials: 'AD' },
  { id: 'fran', nameEn: 'Fran Seeker', nameJa: 'フラン・シーカー', titleEn: 'CPD Operator', titleJa: '警察本部オペレーター', factionId: 'sss', debutGame: 'zero', weapons: ['Stun Gun'], seiyuu: 'Yuki Taketatsu', bioEn: 'Noel younger sister and helpful CPD receptionist.', bioJa: 'ノエルの妹でクロスベル警察の受付オペレーター。', initials: 'FS' },
  { id: 'ilya', nameEn: 'Ilya Platiere', nameJa: 'イリア・プラティエ', titleEn: 'Fire Dancer', titleJa: '炎の舞姫', factionId: 'sss', debutGame: 'zero', weapons: ['Dance Blades'], seiyuu: 'Masumi Asano', bioEn: 'Top star of the Arc en Ciel Theater Troupe.', bioJa: '劇団アルカンシェルの圧倒的トップスター。', initials: 'IP' },
  { id: 'rixia', nameEn: 'Rixia Mao', nameJa: 'リーシャ・マオ', titleEn: 'Legendary Assassin Yin', titleJa: '伝説の暗殺者《銀》', factionId: 'heiyue', debutGame: 'zero', weapons: ['Cleaver Sword', 'Throwing Needles'], seiyuu: 'Rina Sato', bioEn: 'Dancer at Arc en Ciel secretly inheriting the title of Yin.', bioJa: 'アルカンシェルのダンサーにして東方の暗殺者《銀》。', initials: 'RM', spoilerNotes: [{ minGame: 'zero', note: 'Secretly operates as the masked assassin Yin.' }] },
  { id: 'dieter', nameEn: 'Dieter Crois', nameJa: 'ディーター・クロイス', titleEn: 'IBC President', titleJa: 'IBC総裁', factionId: 'sss', debutGame: 'zero', weapons: ['Financial Authority'], seiyuu: 'Eiji Takemoto', bioEn: 'President of IBC who orchestrated Crossbell declaration.', bioJa: 'IBC総裁。クロスベル独立国大統領を宣言した。', initials: 'DC' },
  { id: 'mariabell', nameEn: 'Mariabell Crois', nameJa: 'マリアベル・クロイス', titleEn: 'Third Anguis', titleJa: '第三の蛇', factionId: 'ouroboros', debutGame: 'azure', weapons: ['Alchemy Dolls'], seiyuu: 'Rie Tanaka', bioEn: 'Daughter of Dieter who became the Third Anguis of Ouroboros.', bioJa: 'ディーターの娘。後に使徒・第三柱に就任。', initials: 'MC' },
  { id: 'sigmund', nameEn: 'Sigmund Orlando', nameJa: 'シグムント・オルランド', titleEn: 'Ogre of Red Constellation', titleJa: '赤鬼シグムント', factionId: 'red_constellation', debutGame: 'azure', weapons: ['Dual Battleaxes'], seiyuu: 'Akio Otsuka', bioEn: 'Randy uncle and fearsome leader of Red Constellation.', bioJa: 'ランディの叔父。《赤い星座》の副団長にして《赤鬼》。', initials: 'SO' },
  { id: 'shirley', nameEn: 'Shirley Orlando', nameJa: 'シャーリィ・オルランド', titleEn: 'Bloody Shirley / Enforcer XVII', titleJa: '血染めのシャーリィ', factionId: 'red_constellation', debutGame: 'azure', weapons: ['Buster Rifle'], seiyuu: 'Ayana Taketatsu', bioEn: 'Wild jaeger commander who later joined Ouroboros as Enforcer XVII.', bioJa: 'シグムントの娘。執行者No.XVII《紅の戦鬼》。', initials: 'SH' },
  { id: 'cao', nameEn: 'Cao Lee', nameJa: 'ツァオ・リー', titleEn: 'Heiyue Manager', titleJa: '黒月幹部', factionId: 'heiyue', debutGame: 'zero', weapons: ['Concealed Daggers'], seiyuu: 'Daisuke Hirakawa', bioEn: 'Cunning Crossbell branch manager for Heiyue Syndicate.', bioJa: '黒月貿易公司のクロスベル支社長。老獪な知性派。', initials: 'CL' },
  { id: 'wald', nameEn: 'Wald Wales', nameJa: 'ヴァルド・ヴァレス', titleEn: 'Saber Viper / Church Guard', titleJa: '元不良集団ヘッド', factionId: 'sss', debutGame: 'zero', weapons: ['Steel Pipe'], seiyuu: 'Kenjiro Tsuda', bioEn: 'Downtown gang rival who redeemed himself in the church.', bioJa: '旧市街サーベルバイパーのヘッド。後に教会入り。', initials: 'WW' },

  // EREBONIA ARC - CLASS VII (12)
  { id: 'rean', nameEn: 'Rean Schwarzer', nameJa: 'リィン・シュバルツァー', titleEn: 'Ashen Awakener / Divine Blade', titleJa: '灰の起動者 / 剣聖', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Tachi', 'Valimar'], seiyuu: 'Koki Uchiyama', bioEn: 'Leader of Class VII, master of Eight Leaves, and Ashen Awakener.', bioJa: '特科クラスVII組の中心人物。八葉一刀流七の型伝承者。', initials: 'RS', variants: { cs1: { titleEn: 'Class VII Student' }, cs3: { titleEn: 'Branch Campus Instructor' }, reverie: { titleEn: 'Divine Blade of Zero' } } },
  { id: 'alisa', nameEn: 'Alisa Reinford', nameJa: 'アリサ・ラインフォルト', titleEn: 'Reinford Heiress', titleJa: 'ラインフォルト家令嬢', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Orbal Bow'], seiyuu: 'Yui Horie', bioEn: 'Heiress to the Reinford Group and orbal bow specialist.', bioJa: 'ラインフォルトグループの令嬢。導力弓の使い手。', initials: 'AR' },
  { id: 'elliot', nameEn: 'Elliot Craig', nameJa: 'エリオット・クレイグ', titleEn: 'Traveling Musician', titleJa: '音楽家', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Orbal Staff', 'Violin'], seiyuu: 'Ryoko Shiraishi', bioEn: 'Gentle son of General Craig who pursued music across Zemuria.', bioJa: '紅毛のクレイグの息子。心優しき若き天才音楽家。', initials: 'EC' },
  { id: 'laura', nameEn: 'Laura S. Arseid', nameJa: 'ラウラ・S・アルゼイド', titleEn: 'Sword Maiden of Arseid', titleJa: 'アルゼイド流師範代', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Great Two-Handed Sword'], seiyuu: 'Mariya Ise', bioEn: 'Noble master of the powerful Arseid two-handed sword style.', bioJa: 'アルゼイド流正統後継者。高潔な女性剣士。', initials: 'LA' },
  { id: 'machias', nameEn: 'Machias Regnitz', nameJa: 'マキアス・レーグニッツ', titleEn: 'Judicial Inspector', titleJa: '司法監察官', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Orbal Shotgun'], seiyuu: 'Takuya Sato', bioEn: 'Son of Heimdallr governor Carl Regnitz, became inspector.', bioJa: 'レーグニッツ帝都知事の息子。帝国司法監察官。', initials: 'MR' },
  { id: 'jusis', nameEn: 'Jusis Albarea', nameJa: 'ユーシス・アルバレア', titleEn: 'Duke of Albarea', titleJa: 'アルバレア公爵', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Court Rapier'], seiyuu: 'Shinnosuke Tachibana', bioEn: 'Second son of House Albarea who assumed ducal leadership.', bioJa: '四大名門アルバレア家の貴公子。現公爵当主代行。', initials: 'JA' },
  { id: 'emma', nameEn: 'Emma Millstein', nameJa: 'エマ・ミルスティン', titleEn: 'Witch of the Hexen Clan', titleJa: '巡回魔女', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Magic Wand'], seiyuu: 'Saori Hayami', bioEn: 'Class VII class representative and Hexen Clan sorceress.', bioJa: 'VII組の委員長にして、古の《魔女の眷属》の末裔。', initials: 'EM', spoilerNotes: [{ minGame: 'cs2', note: 'Revealed as daughter of the Hexen Clan.' }] },
  { id: 'fie', nameEn: 'Fie Claussell', nameJa: 'フィー・クラウゼル', titleEn: 'Sylphid / Bracer', titleJa: '妖精 / 正遊撃士', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Twin Gunblades'], seiyuu: 'Hisako Kanemoto', bioEn: 'Former Zephyr jaeger who became an Imperial bracer.', bioJa: '元猟兵団《西風の旅団》。現在はB級正遊撃士。', initials: 'FC' },
  { id: 'gaius', nameEn: 'Gaius Worzel', nameJa: 'ガイウス・ウォーゼル', titleEn: 'Eighth Dominion / Soaring Phoenix', titleJa: '第八位《絶空の鳳翼》', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Cross Spear', 'Stigma'], seiyuu: 'Yoshimasa Hosoya', bioEn: 'Nord Highlands warrior who inherited the Eighth Dominion Stigma.', bioJa: 'ノルドの戦士にして星杯騎士団・第八位の守護騎士。', initials: 'GW', spoilerNotes: [{ minGame: 'cs3', note: 'Inherited Father Barkhorns Stigma in the Nord Highlands.' }] },
  { id: 'millium', nameEn: 'Millium Orion', nameJa: 'ミリアム・オライオン', titleEn: 'White Rabbit / Ironblood', titleJa: '白兎 / 鉄血の子供たち', factionId: 'ironbloods', debutGame: 'cs1', weapons: ['Airgetlam Combat Shell'], seiyuu: 'Kotori Koiwai', bioEn: 'Cheerful Ironblood operative operating the combat shell Airgetlam.', bioJa: '《白兎》のコードネームを持つ鉄血の子供たちの一人。', initials: 'MO' },
  { id: 'crow', nameEn: 'Crow Armbrust', nameJa: 'クロウ・アームブラスト', titleEn: 'Azure Awakener / Leader "C"', titleJa: '蒼の起動者 / ≪C≫', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Twin Double Pistols', 'Ordine'], seiyuu: 'Takahiro Sakurai', bioEn: 'Class VII senior revealed as ILF leader and Azure Awakener.', bioJa: '帝国解放戦線のリーダー《C》。蒼の騎神オルディネの起動者。', initials: 'CA', spoilerNotes: [{ minGame: 'cs1', note: 'Revealed as sniper "C" who shot Chancellor Osborne.' }, { minGame: 'cs3', note: 'Resurrected as Copper Knight Azure Siegfried.' }] },
  { id: 'sara', nameEn: 'Sara Valestein', nameJa: 'サラ・バレスタイン', titleEn: 'Purple Lightning', titleJa: '紫電のサラ', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Blade & Gun Combo'], seiyuu: 'Megumi Toyoguchi', bioEn: 'Former youngest A-Rank bracer, became Class VII homeroom teacher.', bioJa: '元A級遊撃士。《紫電》の異名を持つVII組の担任教官。', initials: 'SV' },

  // EREBONIA ARC - NEW CLASS VII & CAMPUS (12)
  { id: 'juna', nameEn: 'Juna Crawford', nameJa: 'ユウナ・クロフォード', titleEn: 'New Class VII Leader', titleJa: '新VII組リーダー', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Dual Gunbreakers'], seiyuu: 'Nao Toyama', bioEn: 'Crossbell-born student who led New Class VII through the Great Twilight.', bioJa: 'クロスベル出身。熱い正義感を持つ新VII組のリーダー。', initials: 'JC' },
  { id: 'kurt', nameEn: 'Kurt Vander', nameJa: 'クルト・ヴァンダール', titleEn: 'Vander Twin Blade Master', titleJa: 'ヴァンダール双剣術', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Dual Swords'], seiyuu: 'Takuya Eguchi', bioEn: 'Youngest son of the prestigious Vander martial arts house.', bioJa: '名門ヴァンダール家の次男。双剣術を極める優等生。', initials: 'KV' },
  { id: 'altina', nameEn: 'Altina Orion', nameJa: 'アルティナ・オライオン', titleEn: 'Black Rabbit', titleJa: '黒兎', factionId: 'class_vii_new', debutGame: 'cs2', weapons: ['Claimh Solais'], seiyuu: 'Inori Minase', bioEn: 'Intelligence Division operative who bonded with Rean and New Class VII.', bioJa: '《黒兎》のコードネームで呼ばれるクラウ＝ソラスの使い手。', initials: 'AO' },
  { id: 'musse', nameEn: 'Musse Egret', nameJa: 'ミュゼ・イーグレット', titleEn: 'Mildine / Duchess of Cayenne', titleJa: 'ミルディーヌ / カイエン公爵', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Orbal Sniper Rifle'], seiyuu: 'Ami Koshimizu', bioEn: 'Genius strategist who led the Weissland Army as Duchess Mildine.', bioJa: '次期カイエン公爵ミルディーヌ。千思万考の天才軍師。', initials: 'ME', spoilerNotes: [{ minGame: 'cs3', note: 'Revealed as leader of the Weissland Army.' }] },
  { id: 'ash', nameEn: 'Ash Carbide', nameJa: 'アッシュ・カーバイド', titleEn: 'Unchained Tiger', titleJa: '猛禽のアッシュ', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Variable Gun-Axe'], seiyuu: 'Tomoaki Maeno', bioEn: 'Rough delinquent from Raquel who survived the Hamel tragedy.', bioJa: '歓楽都市ラクウェル出身。ハーメルのもう一人の遺児。', initials: 'AC', spoilerNotes: [{ minGame: 'cs3', note: 'Triggered the Great Twilight by shooting Emperor Eugent.' }] },
  { id: 'aurelia', nameEn: 'Aurelia Le Guin', nameJa: 'オーレリア・ル・グィン', titleEn: 'Golden Rakshasa', titleJa: '黄金の羅刹', factionId: 'class_vii_new', debutGame: 'cs2', weapons: ['Giant Broadsword'], seiyuu: 'Yuko Sumitomo', bioEn: 'Unrivaled swordmaster and Principal of Thors Branch Campus.', bioJa: 'トールズ第II分校長。二大剣術を極めた《黄金の羅刹》。', initials: 'AL' },
  { id: 'wallace', nameEn: 'Wallace Bardias', nameJa: 'ウォレス・バルディアス', titleEn: 'Black Whirlwind', titleJa: '黒旋風のウォレス', factionId: 'class_vii_new', debutGame: 'cs2', weapons: ['Heavy Glaive'], seiyuu: 'Takayuki Kondo', bioEn: 'Nord-blooded military instructor at Thors Branch Campus.', bioJa: 'ノルドの血を引く猛将。第II分校の頼れる主任教官。', initials: 'WB' },
  { id: 'towa', nameEn: 'Towa Herschel', nameJa: 'トワ・ハーシェル', titleEn: 'Branch Campus Instructor', titleJa: '第II分校教官', factionId: 'class_vii_new', debutGame: 'cs1', weapons: ['Orbal Handgun'], seiyuu: 'Ai Nonaka', bioEn: 'Former Student Council President, now dedicated instructor.', bioJa: 'トールズ本校の元生徒会長。第II分校の指導教官。', initials: 'TH' },
  { id: 'george', nameEn: 'George Nome', nameJa: 'ジョルジュ・ノーム', titleEn: 'Copper Georg', titleJa: '銅のゲオルグ', factionId: 'black_workshop', debutGame: 'cs1', weapons: ['War Hammer'], seiyuu: 'Toshiyuki Morikawa', bioEn: 'Former engineering student revealed as Gnome agent Copper Georg.', bioJa: 'トールズの先輩技師。その正体は黒の工房の《銅》。', initials: 'GN', spoilerNotes: [{ minGame: 'cs3', note: 'Betrayed the crew by bombing the Courageous.' }] },
  { id: 'angelica', nameEn: 'Angelica Rogner', nameJa: 'アンゼリカ・ログナー', titleEn: 'Rider of Rogner', titleJa: 'ログナー家の女傑', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Taito Gloves'], seiyuu: 'Naomi Shindo', bioEn: 'Martial artist heiress to Marquis Rogner who rides orbal bikes.', bioJa: '四大名門ログナー侯爵家の令嬢。泰斗流を修める。', initials: 'AN' },
  { id: 'schmidt', nameEn: 'G. Schmidt', nameJa: 'G・シュミット博士', titleEn: 'Epstein Disciple', titleJa: '三高弟の一人', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Sol-Eater Cannon'], seiyuu: 'Hochu Otsuka', bioEn: 'Arrogant engineering genius and chief artisan of Panzer Soldats.', bioJa: 'エプスタイン博士の三高弟の一人。機甲兵の生みの親。', initials: 'GS' },
  { id: 'michael', nameEn: 'Michael Irving', nameJa: 'ミハエル・アーヴィング', titleEn: 'RMP Major', titleJa: '鉄道憲兵隊少佐', factionId: 'class_vii_new', debutGame: 'cs3', weapons: ['Service Pistol'], seiyuu: 'Tomokazu Sugita', bioEn: 'Strict RMP officer sent to oversee Thors Branch Campus.', bioJa: '鉄道憲兵隊から第II分校に出向してきた堅物主任教官。', initials: 'MI' },

  // EREBONIA ARC - GOVERNMENT & MILITARY (14)
  { id: 'osborne', nameEn: 'Giliath Osborne', nameJa: 'ギリアス・オズボーン', titleEn: 'Blood and Iron Chancellor', titleJa: '鉄血宰相', factionId: 'ironbloods', debutGame: 'sky_3rd', weapons: ['Imperial Command', 'Ishmelga'], seiyuu: 'Joji Nakata', bioEn: 'Formidable Chancellor of Erebonia and Black Awakener.', bioJa: 'エレボニア帝国宰相。黒の騎神イシュメルガの起動者。', initials: 'GO', spoilerNotes: [{ minGame: 'cs2', note: 'Revealed as biological father of Rean Schwarzer.' }] },
  { id: 'rufus', nameEn: 'Rufus Albarea', nameJa: 'ルーファス・アルバレア', titleEn: 'Jade Rook / Governor-General', titleJa: '翡翠の城 / 初代総督', factionId: 'ironbloods', debutGame: 'cs1', weapons: ['Court Sword'], seiyuu: 'Daisuke Hirakawa', bioEn: 'Chief of the Ironbloods and Governor-General of Crossbell.', bioJa: '鉄血の子供たちの筆頭。クロスベル初代総督。', initials: 'RA' },
  { id: 'claire', nameEn: 'Claire Rieveldt', nameJa: 'クレア・リーヴェルト', titleEn: 'Icy Maiden', titleJa: '氷の乙女', factionId: 'ironbloods', debutGame: 'cs1', weapons: ['Orbal Automatic Pistol'], seiyuu: 'Ami Koshimizu', bioEn: 'RMP Major gifted with extraordinary tactical computation.', bioJa: '鉄道憲兵隊の女性将校。類稀なる演算能力の持ち主。', initials: 'CR' },
  { id: 'lechter', nameEn: 'Lechter Arundel', nameJa: 'レクター・アランドール', titleEn: 'The Scarecrow', titleJa: 'かかし男', factionId: 'ironbloods', debutGame: 'sky_3rd', weapons: ['Throwing Daggers'], seiyuu: 'Masakazu Morita', bioEn: 'Eccentric Imperial Intelligence captain and Ironblood.', bioJa: '帝国軍情報局の特務大尉。並外れた直観力の持ち主。', initials: 'LA' },
  { id: 'cedric', nameEn: 'Cedric Reise Arnor', nameJa: 'セドリック皇子', titleEn: 'Crown Prince / Awakener', titleJa: '皇太子 / 起動者', factionId: 'royal_guard', debutGame: 'cs1', weapons: ['Rapier', 'Testa-Rossa'], seiyuu: 'Naomi Shindo', bioEn: 'Crown Prince of Erebonia and Awakener of Testa-Rossa.', bioJa: 'エレボニア帝国皇太子。緋の騎神の起動者。', initials: 'CR' },
  { id: 'alfin', nameEn: 'Alfin Reise Arnor', nameJa: 'アルフィン皇女', titleEn: 'Imperial Princess', titleJa: '帝国皇女', factionId: 'royal_guard', debutGame: 'cs1', weapons: ['Imperial Arts'], seiyuu: 'Satomi Sato', bioEn: 'Beloved princess of Erebonia and twin sister of Cedric.', bioJa: 'セドリックの双子の姉。可憐で聡明な帝国皇女。', initials: 'AA' },
  { id: 'victor', nameEn: 'Victor S. Arseid', nameJa: 'ヴィクター・S・アルゼイド', titleEn: 'Radiant Windmere', titleJa: '光の剣匠', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Galantine Greatsword'], seiyuu: 'Hiroki Yasumoto', bioEn: 'Supreme master of the Arseid School and father of Laura.', bioJa: 'アルゼイド流当主。《光の剣匠》と称される大剣の達人。', initials: 'VA' },
  { id: 'toval', nameEn: 'Toval Randonneur', nameJa: 'トヴァル・ランドナー', titleEn: 'Zero Arts Specialist', titleJa: '早撃ちのトヴァル', factionId: 'bracer_guild', debutGame: 'cs1', weapons: ['Modified Orbal Gun'], seiyuu: 'Tomokazu Sugita', bioEn: 'Veteran Imperial bracer renowned for speed arts modification.', bioJa: '帝国ギルドの凄腕遊撃士。超高速アーツ詠唱の使い手。', initials: 'TR' },
  { id: 'sharon', nameEn: 'Sharon Kreuger', nameJa: 'シャロン・クルーガー', titleEn: 'Severing Chains / Enforcer IX', titleJa: '死線のクルーガー', factionId: 'ouroboros', debutGame: 'cs1', weapons: ['Steel Wire', 'Daggers'], seiyuu: 'Kikuko Inoue', bioEn: 'Reinford maid secretly serving as Ouroboros Enforcer IX.', bioJa: 'ラインフォルト家のメイド長。執行者No.IX《死線》。', initials: 'SK', spoilerNotes: [{ minGame: 'cs3', note: 'Resumed her Ouroboros obligations during the Great Twilight.' }] },
  { id: 'irina', nameEn: 'Irina Reinford', nameJa: 'イリーナ・ラインフォルト', titleEn: 'Reinford Chairman', titleJa: 'RFグループ会長', factionId: 'class_vii_old', debutGame: 'cs1', weapons: ['Corporate Influence'], seiyuu: 'Sumi Shimamoto', bioEn: 'Formidable chairman of the massive Reinford industrial conglomerate.', bioJa: '帝国最大の重工業メーカー・RFグループの冷徹な女性会長。', initials: 'IR' },
  { id: 'alberich', nameEn: 'Black Alberich', nameJa: '黒のアルベリヒ', titleEn: 'Master of Gnomes', titleJa: '工房の長', factionId: 'black_workshop', debutGame: 'cs3', weapons: ['Ancient Gnome Arts'], seiyuu: 'Hiroki Yasumoto', bioEn: 'Father of Alisa Reinford who led the Black Workshop.', bioJa: 'アリサの実父フランツの肉体を奪った黒の工房の支配者。', initials: 'BA' },
  { id: 'rutger', nameEn: 'Rutger Claussell', nameJa: 'ルトガー・クラウゼル', titleEn: 'Jaeger King', titleJa: '猟兵王', factionId: 'black_workshop', debutGame: 'cs3', weapons: ['Buster Gunlance', 'Zector'], seiyuu: 'Hochu Otsuka', bioEn: 'Adoptive father of Fie and Awakener of Palatinate Knight Zector.', bioJa: '《西風の旅団》を率いた猟兵王。紫の騎神ゼクトールの起動者。', initials: 'RC' },
  { id: 'xeno', nameEn: 'Xeno', nameJa: 'ゼノ', titleEn: 'Trap Master', titleJa: '罠使いのゼノ', factionId: 'black_workshop', debutGame: 'cs2', weapons: ['Javelin Gunlance'], seiyuu: 'Satoshi Tsuruoka', bioEn: 'Zephyr jaeger veteran who watched over Fie.', bioJa: '西風の旅団の幹部。特殊兵装ジャベリンを操る。', initials: 'XN' },
  { id: 'leo', nameEn: 'Leonidas', nameJa: 'レオニダス', titleEn: 'The Behemoth', titleJa: '破壊獣レオニダス', factionId: 'black_workshop', debutGame: 'cs2', weapons: ['Heavy Gauntlet'], seiyuu: 'Tsuyoshi Koyama', bioEn: 'Gigantic Zephyr warrior wielding crushing machine fists.', bioJa: '西風の旅団の豪傑。超大型マシンガントレットを振るう。', initials: 'LN' },

  // OUROBOROS & HEXEN CLAN (11)
  { id: 'roselia', nameEn: 'Roselia Millstein', nameJa: 'ローゼリア', titleEn: 'Elder of Hexen Clan', titleJa: '魔女の眷属の長', factionId: 'class_vii_old', debutGame: 'cs3', weapons: ['Ancient Sorcery'], seiyuu: 'Nana Mizuki', bioEn: 'Ancient crimson vampire who leads the Hexen Clan of Eryn.', bioJa: 'エリンの里を統べる《魔女の眷属》の長。齢八百歳を超える。', initials: 'RM' },
  { id: 'vita', nameEn: 'Vita Clotilde', nameJa: 'ヴィータ・クロチルダ', titleEn: 'The Azure Abyss', titleJa: '蒼の深淵', factionId: 'ouroboros', debutGame: 'cs1', weapons: ['Azure Staff', 'Song'], seiyuu: 'Yukari Tamura', bioEn: 'Second Anguis of Ouroboros and elder sister figure to Emma.', bioJa: '身喰らう蛇・使徒第二柱。エマの義姉にあたる大魔女。', initials: 'VC' },
  { id: 'arianrhod', nameEn: 'Arianrhod', nameJa: 'アリアンロード', titleEn: 'Steel Maiden / Seventh Anguis', titleJa: '鋼の聖女 / 第七柱', factionId: 'ouroboros', debutGame: 'azure', weapons: ['Cavalry Lance', 'Argreion'], seiyuu: 'Aya Hisakawa', bioEn: 'Lianne Sandlot resurrected as the Seventh Anguis of Ouroboros.', bioJa: '獅子戦役の救世主リアンヌ・サンドロット。銀の騎神の起動者。', initials: 'AH' },
  { id: 'duvalie', nameEn: 'Duvalie the Swift', nameJa: '神速のデュバリィ', titleEn: 'Stahlritter Leader', titleJa: '鉄機隊筆頭', factionId: 'ouroboros', debutGame: 'azure', weapons: ['Sword & Buckler'], seiyuu: 'Naomi Ozora', bioEn: 'Fast swordswoman leading the Stahlritter in devotion to Arianrhod.', bioJa: '聖女に絶対の忠誠を誓う《鉄機隊》の若き筆頭剣士。', initials: 'DS' },
  { id: 'ines', nameEn: 'Ines the Stout', nameJa: '剛毅のアイネス', titleEn: 'Stahlritter Second Seat', titleJa: '剛毅のアイネス', factionId: 'ouroboros', debutGame: 'cs3', weapons: ['Massive Halberd'], seiyuu: 'Mariya Ise', bioEn: 'Mighty warrior wielding a giant halberd in the Stahlritter.', bioJa: '鉄機隊の副官格。巨躯から繰り出す剛力ハルバードの使い手。', initials: 'IS' },
  { id: 'ennea', nameEn: 'Ennea the Bow', nameJa: '魔弓のエンネア', titleEn: 'Stahlritter Third Seat', titleJa: '魔弓のエンネア', factionId: 'ouroboros', debutGame: 'cs3', weapons: ['Enchanted Bow'], seiyuu: 'Satomi Sato', bioEn: 'Sharpshooter of the Stahlritter with trajectory-altering bow arts.', bioJa: '鉄機隊第三位。神懸かり的な魔弓の腕前を誇る。', initials: 'EB' },
  { id: 'mcburn', nameEn: 'McBurn', nameJa: 'マクバーン', titleEn: 'The Almighty Conflagration', titleJa: '劫炎のマクバーン', factionId: 'ouroboros', debutGame: 'cs2', weapons: ['Demonic Flames'], seiyuu: 'Junichi Suwabe', bioEn: 'Enforcer No. I containing an entity from the Beyond.', bioJa: '執行者No.I。異界の力を宿す結社最強の魔人。', initials: 'MB', spoilerNotes: [{ minGame: 'cs4', note: 'Revealed as a merged entity from a divergent outer world.' }] },
  { id: 'campanella', nameEn: 'Campanella', nameJa: 'カンパネルラ', titleEn: 'The Fool / Enforcer 0', titleJa: '道化師カンパネルラ', factionId: 'ouroboros', debutGame: 'sky_sc', weapons: ['Silver Mirror'], seiyuu: 'Kanae Ito', bioEn: 'Enforcer No. 0 acting as direct observer for the Grandmaster.', bioJa: '執行者No.0。盟主の命を伝える謎多き観測者。', initials: 'CP' },
  { id: 'bleublanc', nameEn: 'Bleublanc', nameJa: 'ブルブラン', titleEn: 'Phantom Thief / Enforcer X', titleJa: '怪盗紳士', factionId: 'ouroboros', debutGame: 'sky_sc', weapons: ['Trick Wand', 'Cards'], seiyuu: 'Hiroaki Miura', bioEn: 'Enforcer No. X who loves aesthetics, riddles, and stage drama.', bioJa: '執行者No.X。美と戯れを愛する仮面の怪盗紳士。', initials: 'BB' },
  { id: 'walter', nameEn: 'Walter Kron', nameJa: 'ヴァルター', titleEn: 'The Slender Wolf / Enforcer VIII', titleJa: '痩せ狼', factionId: 'ouroboros', debutGame: 'sky_sc', weapons: ['Murderous Taito'], seiyuu: 'Takahiro Yoshimizu', bioEn: 'Fierce killer who turned Taito martial arts into slaughter.', bioJa: '執行者No.VIII。拳神リュウガの弟子にして泰斗流の破門者。', initials: 'WK' },
  { id: 'lucrezia', nameEn: 'Lucrezia Isselee', nameJa: 'ルクレツィア', titleEn: 'Golden Butterfly / Enforcer III', titleJa: '黄金の蝶', factionId: 'ouroboros', debutGame: 'daybreak1', weapons: ['Dusk Carver Blade'], seiyuu: 'Kana Ueda', bioEn: 'Former assassin of the Garden who became Enforcer No. III.', bioJa: '元暗殺組織《庭園》の幹部。執行者No.III。', initials: 'LI' },

  // REVERIE ARC (8)
  { id: 'c_rufus', nameEn: '"C" (Rufus Albarea)', nameJa: '≪C≫ (ルーファス)', titleEn: 'Leader of the Third Route', titleJa: '新生帝国解放戦線リーダー', factionId: 'ironbloods', debutGame: 'reverie', weapons: ['Knight Sword'], seiyuu: 'Daisuke Hirakawa', bioEn: 'Rufus Albarea under the mask of "C" fighting for atonement.', bioJa: '贖罪のために再び仮面をつけたルーファス・アルバレア。', initials: 'CR' },
  { id: 'lapis', nameEn: 'Lapis Rosenberg', nameJa: 'ラピス・ローゼンベルク', titleEn: 'Sentient Rosenberg Doll', titleJa: '自我を持つローゼンベルク人形', factionId: 'arkride_solutions', debutGame: 'reverie', weapons: ['Heavy Ax'], seiyuu: 'Azumi Waki', bioEn: 'Sentient doll created by Jorg Rosenberg to house Elysium core.', bioJa: 'ローゼンベルク工房で作られた奇跡の知性を持つ人形。', initials: 'LR' },
  { id: 'swin', nameEn: 'Swin Abel', nameJa: 'スウィン・アーベル', titleEn: 'Three of Swords', titleJa: '《ソードの3》', factionId: 'arkride_solutions', debutGame: 'reverie', weapons: ['Marking Daggers'], seiyuu: 'Gakuto Kajiwara', bioEn: 'Escaped assassin from the Garden who travels alongside Nadia.', bioJa: '暗殺組織《庭園》から脱走した少年。相棒のナディアと旅する。', initials: 'SA' },
  { id: 'nadia', nameEn: 'Nadia Rayne', nameJa: 'ナディア・レイン', titleEn: 'Nine of Swords', titleJa: '《ソードの9》', factionId: 'arkride_solutions', debutGame: 'reverie', weapons: ['Teddy Bear Needles'], seiyuu: 'Manaka Iwami', bioEn: 'Cunning former Garden assassin who hides needles in plush toys.', bioJa: 'スウィンの相棒。一見無気力だが明晰な頭脳を持つ暗殺者。', initials: 'NR' },
  { id: 'elysium', nameEn: 'Elysium', nameJa: 'エリュシオン', titleEn: 'Autonomous AI Core', titleJa: '自律型演算知性', factionId: 'ouroboros', debutGame: 'reverie', weapons: ['Causality Calculation'], seiyuu: 'Azumi Waki', bioEn: 'Rogue Zemurian predictive AI that created the Simulacrum clones.', bioJa: '大黄昏の余波で偶発的に誕生した高位未来演算AI。', initials: 'EL' },
  { id: 'rufus_clone', nameEn: 'Supreme Leader Rufus', nameJa: '総統ルーファス', titleEn: 'Simulacrum Clone', titleJa: '機械知性シミュラクラ', factionId: 'ironbloods', debutGame: 'reverie', weapons: ['Black Knight Clone'], seiyuu: 'Daisuke Hirakawa', bioEn: 'Simulacrum artificial clone created by Elysium to seize Crossbell.', bioJa: 'エリュシオンが生み出した偽りの最高総統ルーファス。', initials: 'RC' },
  { id: 'garcia', nameEn: 'Garcia Rossi', nameJa: 'ガルシア・ロッシ', titleEn: 'Killing Bear', titleJa: 'キリングベア', factionId: 'sss', debutGame: 'zero', weapons: ['Iron Fists'], seiyuu: 'Masashi Ebara', bioEn: 'Former Revache mafia muscle who aided Lloyd escape in Azure.', bioJa: '元ルバーチェの若頭。男気溢れる剛勇の格闘家。', initials: 'GR' },
  { id: 'emperor', nameEn: 'The Emperor', nameJa: '≪皇帝≫', titleEn: 'Garden Commander', titleJa: '庭園の支配者', factionId: 'ouroboros', debutGame: 'reverie', weapons: ['Gravity Artifact'], seiyuu: 'Tomokazu Sugita', bioEn: 'Cruel leader of the assassination syndicate Garden.', bioJa: '暗殺組織《庭園》の支配者。重力を操るアーティファクトを使う。', initials: 'TE' },

  // CALVARD ARC (16)
  { id: 'van', nameEn: 'Van Arkride', nameJa: 'ヴァン・アークライド', titleEn: 'Spriggan / Host of Grendel', titleJa: '裏解決屋 / 魔装鬼', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Stun Caliber', 'Grendel'], seiyuu: 'Daisuke Ono', bioEn: 'Edith underground fixer and host to the Vagrant-Zion demon lord.', bioJa: '首都イーディスの裏解決屋。《漂泊の魔王》の宿主。', initials: 'VA' },
  { id: 'agnes', nameEn: 'Agnes Claudel', nameJa: 'アニエス・クローデル', titleEn: 'Aramis Student / Genesis Seeker', titleJa: 'アラミス高校生', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Orbal Searcher Staff'], seiyuu: 'Miku Ito', bioEn: 'Great-granddaughter of Claude Epstein searching for Eight Genesis.', bioJa: 'C・エプスタイン博士の曾孫。オクト＝ゲネシスを探す少女。', initials: 'AG' },
  { id: 'feri', nameEn: 'Feri Al-Fayed', nameJa: 'フェリ・アルファイド', titleEn: 'Kurgha Jaeger Warrior', titleJa: 'クルガの戦士', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Assault Rifle-Sword'], seiyuu: 'Yui Ogura', bioEn: 'Young warrior girl of the legendary Kurgha Soldiers jaegers.', bioJa: '名門猟兵団《クルガ戦士団》の誇り高き年少戦士。', initials: 'FA' },
  { id: 'aaron', nameEn: 'Aaron Wei', nameJa: 'アーロン・ウェイ', titleEn: 'Kirin of Langport', titleJa: '羅睺の麒麟児', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Twin Eastern Swords'], seiyuu: 'Yuma Uchida', bioEn: 'Young prodigy of Langport and reincarnate of Tyrant Dグ-Kha.', bioJa: '煌都ラングポートの麒麟児。東方武術と剣舞の達人。', initials: 'AW' },
  { id: 'risette', nameEn: 'Risette Twinings', nameJa: 'リゼット・トワイニング', titleEn: 'Marduk Service Specialist', titleJa: 'マルドゥックSCコンシェルジュ', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Submachine Gun', 'Wires'], seiyuu: 'Yui Ishikawa', bioEn: 'Marduk company concierge equipped with advanced cyborg prosthesis.', bioJa: 'マルドゥック社の敏腕サービスコンシェルジュ。義肢の戦闘技術者。', initials: 'RT' },
  { id: 'quatre', nameEn: 'Quatre Salision', nameJa: 'カトル・サリシオン', titleEn: 'Basel Technology Researcher', titleJa: 'バーゼル理科大学研究員', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Pulse Gun', 'FIO / X-ERO'], seiyuu: 'Mutsumi Tamura', bioEn: 'Young researcher studying under Professor Hamilton in Basel.', bioJa: 'バーゼル理科大学の准教授。ドローンを遠隔操縦する。', initials: 'QS' },
  { id: 'judith', nameEn: 'Judith Ranster', nameJa: 'ジュディス・ランスター', titleEn: 'Grimcats / Top Actress', titleJa: '怪盗グリムキャッツ / 女優', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Stellar Whip'], seiyuu: 'Yoko Hikasa', bioEn: 'Renowned movie actress operating as the phantom thief Grimcats.', bioJa: '導力映画のトップ女優にして義賊《グリムキャッツ》。', initials: 'JR' },
  { id: 'bergard', nameEn: 'Bergard Zeman', nameJa: 'ベルガルド・ゼーマン', titleEn: 'Barkhorn / Wandering Master', titleJa: '元第八位バルクホルン', factionId: 'gralsritter', debutGame: 'daybreak1', weapons: ['Gauntlets'], seiyuu: 'Akio Otsuka', bioEn: 'Former Eighth Dominion of Gralsritter and Van martial master.', bioJa: 'ヴァンの師匠。元星杯騎士団・第八位《吼天獅子》バルクホルン。', initials: 'BZ', spoilerNotes: [{ minGame: 'daybreak1', note: 'Revealed as the former Eighth Dominion.' }] },
  { id: 'elaine', nameEn: 'Elaine Auclair', nameJa: 'エレイン・オークレール', titleEn: 'Sword Maiden / A-Rank Bracer', titleJa: '剣の乙女 / A級遊撃士', factionId: 'bracer_guild', debutGame: 'daybreak1', weapons: ['Knight Rapier'], seiyuu: 'Chiwa Saito', bioEn: 'Elite A-Rank bracer in Calvard and childhood friend of Van.', bioJa: 'カルバード最年少A級遊撃士。《剣の乙女》の異名をとる。', initials: 'EA' },
  { id: 'kincaid', nameEn: 'René Kincaid', nameJa: 'ルネ・キンケイド', titleEn: 'CID Special Agent', titleJa: 'CID統合分析室補佐官', factionId: 'cid', debutGame: 'daybreak1', weapons: ['Military Pistol'], seiyuu: 'Jun Fukuyama', bioEn: 'Sharp intelligence officer in CID and childhood friend of Van.', bioJa: '大統領直属のCID補佐官。ヴァン、エレインの幼馴染。', initials: 'RK' },
  { id: 'gramheart', nameEn: 'Roy Gramheart', nameJa: 'ロイ・グラムハート', titleEn: 'President of Calvard', titleJa: 'カルバード共和国大統領', factionId: 'cid', debutGame: 'daybreak1', weapons: ['Political Mastery'], seiyuu: 'Rikiya Koyama', bioEn: 'Ambitious President pushing the Calvardian space program.', bioJa: 'カルバード現大統領。宇宙開発計画を極秘裏に進める。', initials: 'RG' },
  { id: 'gerard', nameEn: 'Gerard Dantes', nameJa: 'ジェラール・ダンテス', titleEn: 'Leader of Almata', titleJa: 'アルマータ首領', factionId: 'almata', debutGame: 'daybreak1', weapons: ['Demonic Greatsword'], seiyuu: 'Tomokazu Seki', bioEn: 'Merciless boss of Almata who detonated Creil village.', bioJa: '犯罪組織アルマータの冷酷非道な首領。', initials: 'GD' },
  { id: 'melchior', nameEn: 'Melchior', nameJa: 'メルキオル', titleEn: 'Almata Executive', titleJa: 'アルマータ幹部', factionId: 'almata', debutGame: 'daybreak1', weapons: ['Explosive Needles'], seiyuu: 'angela / Shono', bioEn: 'Sadistic executive of Almata who uses illusions and bombs.', bioJa: 'アルマータの幹部。爆弾と幻術を好む猟奇的な快楽殺人者。', initials: 'ML' },
  { id: 'shizuna', nameEn: 'Shizuna Rem Misurugi', nameJa: 'シズナ・リ・ミスルギ', titleEn: 'Silver Fleeting / Blade Master', titleJa: '白銀の剣聖', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Enchanted Odachi'], seiyuu: 'Maaya Uchida', bioEn: 'Leader of the secretive Ikaruga shinobi and Divine Blade of Silver.', bioJa: '最強の隠密集団《斑鳩》の頭領補佐。《白銀の剣聖》。', initials: 'SR' },
  { id: 'kurogane', nameEn: 'Kurogane', nameJa: 'クロガネ', titleEn: 'Ikaruga Shinobi Commander', titleJa: '斑鳩の頭領', factionId: 'arkride_solutions', debutGame: 'daybreak1', weapons: ['Dual Shinobi Blades'], seiyuu: 'Toshiyuki Morikawa', bioEn: 'Chief commander of Ikaruga supporting Shizuna.', bioJa: '《斑鳩》の頭領代行。超人的な忍術と体技を誇る。', initials: 'KG' },
  { id: 'kasim', nameEn: 'Kasim Al-Fayed', nameJa: 'カシム・アルファイド', titleEn: 'Vanguard of Fire / Marduk Chief', titleJa: '灼飆のカシム', factionId: 'marduk', debutGame: 'daybreak1', weapons: ['Buster Beam Cannon'], seiyuu: 'Yuichiro Umehara', bioEn: 'Elder brother of Feri, regarded as the strongest jaeger warrior.', bioJa: 'フェリの実兄。マルドゥック社警備主任。《大陸最強》の猟兵。', initials: 'KA' },
];

export const CANONICAL_RELATIONSHIPS: Relationship[] = [
  // LIBERL ARC
  { id: 'rel_estelle_joshua', source: 'estelle', target: 'joshua', type: 'family', labelEn: 'Adoptive Siblings & Partners', labelJa: '義姉弟・最愛のパートナー', descEn: 'Raised together by Cassius; partners through life and bracer work.', descJa: 'カシウスに育てられた義姉弟であり、互いにかけがえのないパートナー。', debutGame: 'sky_fc' },
  { id: 'rel_estelle_cassius', source: 'cassius', target: 'estelle', type: 'family', labelEn: 'Father & Daughter', labelJa: '父と娘', descEn: 'Cassius trained Estelle in martial arts and bracer ethics.', descJa: '父として厳しくも温かく見守る。棒術の師でもある。', debutGame: 'sky_fc' },
  { id: 'rel_joshua_cassius', source: 'cassius', target: 'joshua', type: 'mentor', labelEn: 'Savior & Mentor', labelJa: '恩師・育ての親', descEn: 'Cassius saved Joshua from Hamel despair and adopted him.', descJa: '暗闇から救い出し、人としての心を取り戻させてくれた恩人。', debutGame: 'sky_fc' },
  { id: 'rel_estelle_scherazard', source: 'scherazard', target: 'estelle', type: 'comrade', labelEn: 'Mentor & Senior Sister', labelJa: '頼れる先輩遊撃士', descEn: 'Scherazard guided Estelle and Joshua through their first junior bracer trials.', descJa: '姉弟子の先輩正遊撃士として手取り足取り指導した。', debutGame: 'sky_fc' },
  { id: 'rel_estelle_kloe', source: 'estelle', target: 'kloe', type: 'comrade', labelEn: 'Cherished Friends', labelJa: '親友', descEn: 'Bonded during the Ruan incident; mutual emotional trust.', descJa: 'ジェニス王立学園での事件以来、固い友情で結ばれている。', debutGame: 'sky_fc' },
  { id: 'rel_agate_tita', source: 'agate', target: 'tita', type: 'family', labelEn: 'Protective Guardian & Sisterly', labelJa: '守るべき存在・兄妹同然', descEn: 'Agate protects Tita like his late younger sister Mischa.', descJa: '亡き妹ミーシャの面影を重ね、命懸けで守る兄貴分。', debutGame: 'sky_fc' },
  { id: 'rel_joshua_loewe', source: 'loewe', target: 'joshua', type: 'rival', labelEn: 'Hamel Brothers & Fated Rivals', labelJa: 'ハーメルの義兄弟・宿敵', descEn: 'Sole survivors of Hamel who clashed over the Aureole in Liber-Ark.', descJa: 'ハーメルの悲劇を共に生き延びた義兄弟。リベル・アークで激突。', debutGame: 'sky_fc', spoilerDebutGame: 'sky_sc', isSecret: true },
  { id: 'rel_estelle_renne', source: 'estelle', target: 'renne', type: 'family', labelEn: 'Adoptive Sisters', labelJa: '義理の姉妹', descEn: 'Estelle embraced Renne with unconditional love, bringing her to the Brights.', descJa: 'エステルが絶望の底にいたレンを救い出し、ブライト家の家族として迎えた。', debutGame: 'sky_sc' },
  { id: 'rel_kevin_ries', source: 'kevin', target: 'ries', type: 'family', labelEn: 'Childhood Friends & Knight-Squire', labelJa: '幼馴染・騎士と従騎士', descEn: 'Raised in the same church orphanage; bonded through the trauma of Rufina.', descJa: '教会の孤児院で共に育ち、ルフィナの悲劇を乗り越えた絆。', debutGame: 'sky_3rd' },

  // CROSSBELL ARC
  { id: 'rel_lloyd_elie', source: 'lloyd', target: 'elie', type: 'comrade', labelEn: 'SSS Partners & Deep Trust', labelJa: '特務支援課の相棒・深い信頼', descEn: 'Core founding members of SSS with mutual romantic affection.', descJa: '支援課創設時からの頼れる相棒。互いに強い信頼を寄せる。', debutGame: 'zero' },
  { id: 'rel_lloyd_randy', source: 'lloyd', target: 'randy', type: 'comrade', labelEn: 'Brothers in Arms', labelJa: '無二の親友・戦友', descEn: 'Lloyd helped Randy break free from the bloodline of Red Constellation.', descJa: '猟兵の呪縛から救い出してくれた無二の親友。', debutGame: 'zero' },
  { id: 'rel_lloyd_tio', source: 'lloyd', target: 'tio', type: 'comrade', labelEn: 'Guardian & Little Sister Figure', labelJa: '守るべき妹分・技術支援', descEn: 'Lloyd provided Tio with the warm family she lost in the D∴G cult.', descJa: 'D∴G教団の傷を癒やしてくれた大切な家族。', debutGame: 'zero' },
  { id: 'rel_lloyd_kea', source: 'lloyd', target: 'kea', type: 'family', labelEn: 'Fatherly Guardian & Daughter', labelJa: '父娘同然の絆', descEn: 'Lloyd chose the harsh reality to live together with KeA as family.', descJa: '因果を超えて、過酷な現実を共に生きることを選んだ家族。', debutGame: 'zero' },
  { id: 'rel_lloyd_guy', source: 'guy', target: 'lloyd', type: 'family', labelEn: 'Brothers & Guiding Light', labelJa: '亡き実兄・憧れの背中', descEn: 'Lloyd dedicated his life to solving Guy murder and following his path.', descJa: 'ロイドの警察官としての道を示した目標であり最愛の兄。', debutGame: 'zero' },
  { id: 'rel_lloyd_arios', source: 'arios', target: 'lloyd', type: 'rival', labelEn: 'Mentor & Clashing Ideals', labelJa: '師匠格・相容れぬ信念', descEn: 'Arios admired Guy but chose Dieters plan; defeated by Lloyd in Azure.', descJa: 'ガイの親友であり師とも仰いだ存在。碧の大樹で対決。', debutGame: 'zero', spoilerDebutGame: 'azure', isSecret: true },
  { id: 'rel_randy_sigmund', source: 'sigmund', target: 'randy', type: 'rival', labelEn: 'Uncle & Reluctant Successor', labelJa: '叔父と甥・血塗られた宿命', descEn: 'Sigmund sought to force Randy into the command of Red Constellation.', descJa: '赤鬼と赤の死神。猟兵の血脈を巡る宿命の対立。', debutGame: 'azure' },
  { id: 'rel_rixia_ilya', source: 'ilya', target: 'rixia', type: 'mentor', labelEn: 'Theatrical Mentor & Sun-Moon Duo', labelJa: '舞台の恩師・太陽と月', descEn: 'Ilya brought Rixia into Arc en Ciel, giving her a home outside killing.', descJa: '暗殺者だったリーシャを舞台の世界へと引き上げ光を与えた。', debutGame: 'zero' },

  // EREBONIA ARC - CLASS VII
  { id: 'rean_crow', source: 'rean', target: 'crow', type: 'rival', labelEn: 'Fated Rivals & Class VII Brothers', labelJa: '魂の相棒・因縁の好敵手', descEn: 'Awakeners of Ashen and Azure Knights; brothers in Class VII.', descJa: '灰と蒼の騎神の起動者同士。数奇な運命で結ばれた無二の友。', debutGame: 'cs1' },
  { id: 'rel_rean_alisa', source: 'rean', target: 'alisa', type: 'comrade', labelEn: 'Class VII Partners & Affection', labelJa: 'クラスの絆・特別な想い', descEn: 'First encounter in Trista grew into deep mutual romantic devotion.', descJa: '入学式のアクシデントから始まり、支え合い続けた特別な関係。', debutGame: 'cs1' },
  { id: 'rean_osborne_secret', source: 'osborne', target: 'rean', type: 'secret', labelEn: 'Biological Father & Son', labelJa: '実の父と子', descEn: 'Osborne gave his heart to save Rean during the Hamel incident.', descJa: 'ハーメルの惨劇の際、自身の心臓を移植してリィンを救った実父。', debutGame: 'cs1', spoilerDebutGame: 'cs2', isSecret: true },
  { id: 'rel_rean_sara', source: 'sara', target: 'rean', type: 'mentor', labelEn: 'Teacher & Student Vanguard', labelJa: '教官と生徒・戦友', descEn: 'Sara molded Class VII into leaders across the Erebonian Civil War.', descJa: '個性豊かなVII組を率いて成長させた型破りな担任教官。', debutGame: 'cs1' },
  { id: 'rel_laura_fie', source: 'laura', target: 'fie', type: 'comrade', labelEn: 'Sword & Shadow Companions', labelJa: '剣と影・対照的な親友', descEn: 'Overcame chivalric prejudice to build unbreakable battlefield trust.', descJa: '騎士道と猟兵の違いを乗り越えて固い友情を結んだ。', debutGame: 'cs1' },
  { id: 'rel_machias_jusis', source: 'machias', target: 'jusis', type: 'rival', labelEn: 'Commoner vs Noble Comrades', labelJa: '平民と貴族・背中を預ける戦友', descEn: 'Put aside class conflict to become lifelong comrades in Class VII.', descJa: '身分の対立を乗り越え、軽口を叩き合える唯一無二の親友となった。', debutGame: 'cs1' },
  { id: 'rel_emma_celine', source: 'emma', target: 'roselia', type: 'mentor', labelEn: 'Hexen Elder & Young Witch', labelJa: '魔女の長と伝承者', descEn: 'Roselia raised and instructed Emma in ancient Zemurian witchcraft.', descJa: '里の長としてエマを見守り、大いなる黄昏に立ち向かう術を伝授。', debutGame: 'cs3' },

  // EREBONIA ARC - NEW CLASS VII
  { id: 'rel_rean_juna', source: 'rean', target: 'juna', type: 'mentor', labelEn: 'Instructor & Class Representative', labelJa: '教官と生徒会長', descEn: 'Rean guided Juna to overcome Crossbell resentment and lead New Class VII.', descJa: '複雑な想いを抱えるユウナを温かく導き、新VII組の柱に育てた。', debutGame: 'cs3' },
  { id: 'rel_rean_altina', source: 'rean', target: 'altina', type: 'family', labelEn: 'Guardian & Little Sister Figure', labelJa: '保護者と妹分のような絆', descEn: 'Altina found human warmth through Rean constant care and protection.', descJa: '無感情だった黒兎がリィンと触れ合う中で感情を取り戻した。', debutGame: 'cs2' },
  { id: 'rel_kurt_cedric', source: 'kurt', target: 'cedric', type: 'rival', labelEn: 'Former Bodyguard & Prince Rivalry', labelJa: '護衛候補と皇太子・確執', descEn: 'Kurt was stripped of his Vander role when Cedric dismissed them.', descJa: '皇室護衛を解任されたクルトと、歪んだ成長を遂げたセドリック。', debutGame: 'cs3' },
  { id: 'rel_musse_aurelia', source: 'aurelia', target: 'musse', type: 'mentor', labelEn: 'General & Duchess Ally', labelJa: '総司令と領主盟主', descEn: 'Aurelia commanded the Weissland Army under Musses strategic direction.', descJa: 'ヴァイスラント決起軍の総司令としてミルディーヌを支えた。', debutGame: 'cs3' },

  // REVERIE ARC
  { id: 'rel_rufus_lapis', source: 'c_rufus', target: 'lapis', type: 'family', labelEn: 'Redeemed Knight & Soul Partner', labelJa: '贖罪の騎士と生きる理由', descEn: 'Lapis pure perspective taught Rufus the true meaning of living freely.', descJa: 'ラピスとの出会いが、ルーファスに自らの意志で生きる尊さを教えた。', debutGame: 'reverie' },
  { id: 'rel_swin_nadia', source: 'swin', target: 'nadia', type: 'family', labelEn: 'Fated Escape Partners', labelJa: '運命を共にする相棒', descEn: 'Surviving Garden assassins who watch over each other constantly.', descJa: '《庭園》を脱走し、常に背中を預け合ってきた命のパートナー。', debutGame: 'reverie' },
  { id: 'rel_rufus_jusis', source: 'rufus', target: 'jusis', type: 'family', labelEn: 'Brothers Across Ideals', labelJa: '愛憎を越えた兄弟', descEn: 'Despite political estrangement, Rufus shielded Jusis to the very end.', descJa: '立場は違えど、互いに誇りと想いを寄せ合う血の繋がった兄弟。', debutGame: 'cs1' },

  // CALVARD ARC
  { id: 'rel_van_agnes', source: 'van', target: 'agnes', type: 'comrade', labelEn: 'Spriggan & First Client', labelJa: '裏解決屋と最初の依頼人', descEn: 'Agnes request to find the Genesis launched the Calvard saga journey.', descJa: 'ゲネシス探索の依頼から始まり、互いにかけがえのない存在へ。', debutGame: 'daybreak1' },
  { id: 'rel_van_elaine', source: 'van', target: 'elaine', type: 'rival', labelEn: 'Childhood Sweethearts & Paths Apart', labelJa: '幼馴染・表と裏で分かれた道', descEn: 'Former lovers whose paths diverged into Spriggan and Bracer duties.', descJa: 'かつて想い合っていたが、裏と表の世界に分かれてしまった幼馴染。', debutGame: 'daybreak1' },
  { id: 'rel_van_kincaid', source: 'van', target: 'kincaid', type: 'comrade', labelEn: 'Childhood Trio Allies', labelJa: '幼馴染の腐れ縁', descEn: 'CID intelligence officer cooperating off-the-record with Van.', descJa: '立場は異なるが、裏で情報を融通し合う幼馴染の絆。', debutGame: 'daybreak1' },
  { id: 'rel_van_bergard', source: 'bergard', target: 'van', type: 'mentor', labelEn: 'Martial Master & Disciple', labelJa: '武術の師父と弟子', descEn: 'Barkhorn trained Van in martial arts and saved his humanity.', descJa: '荒んでいた若き日のヴァンに生きる道と武術を授けた師父。', debutGame: 'daybreak1' },
  { id: 'rel_aaron_van', source: 'van', target: 'aaron', type: 'mentor', labelEn: 'Fixer Mentor & Eastern Prodigy', labelJa: '後見人・口の悪い相棒', descEn: 'Van saved Aaron from the Tyrant Dグ-Kha possession in Langport.', descJa: '大君の呪縛から救い出し、事務所に引き入れた頼れる後見人。', debutGame: 'daybreak1' },
  { id: 'rel_feri_kasim', source: 'kasim', target: 'feri', type: 'family', labelEn: 'Brother & Sister Kurgha Pride', labelJa: '尊敬する兄と妹', descEn: 'Feri looks up to Kasim, Zemurias strongest warrior, while seeking her path.', descJa: '大陸最強の戦士と称される兄を誇りに思い、背中を追い続ける。', debutGame: 'daybreak1' },
  { id: 'rel_shizuna_van', source: 'shizuna', target: 'van', type: 'rival', labelEn: 'Divine Blade & Demon Vessel Rivalry', labelJa: '白銀の剣聖と魔装鬼の好敵手', descEn: 'Shizuna takes keen interest in Vans demonic Grendel combat form.', descJa: '魔装鬼の力に異常な興味を抱き、幾度となく刃を交える剣聖。', debutGame: 'daybreak1' },

  // CROSS-ARC PATH BRIDGES (Connecting Liberl to Crossbell, Erebonia, and Calvard)
  { id: 'rel_renne_estelle_cross', source: 'estelle', target: 'renne', type: 'family', labelEn: 'Bright Family Sisterhood', labelJa: 'ブライト家の絆', descEn: 'Cross-arc sister bond extending from Liberl to Crossbell, Erebonia, and Calvard.', descJa: 'リベールからクロスベル、帝国、共和国へと続く確固たる絆。', debutGame: 'sky_sc' },
  { id: 'rel_renne_tita', source: 'tita', target: 'renne', type: 'comrade', labelEn: 'Tech Companions', labelJa: 'オーバル技術の友', descEn: 'Tita and Renne bonded through Pater-Mater and orbal mechanics.', descJa: 'パテル＝マテルや工学を通じて心を通わせた親友。', debutGame: 'sky_sc' },
  { id: 'rel_renne_van', source: 'renne', target: 'van', type: 'comrade', labelEn: 'Aramis Student Council & Spriggan', labelJa: '生徒会長と裏解決屋', descEn: 'Renne collaborates with Vans office during the Calvard Genesis crisis.', descJa: 'アラミス生徒会長としてヴァンの事務所に協力し知恵を貸す。', debutGame: 'daybreak1' },
  { id: 'rel_estelle_lloyd', source: 'estelle', target: 'lloyd', type: 'comrade', labelEn: 'Bracer & SSS Crossbell Alliance', labelJa: '遊撃士と支援課の共闘', descEn: 'Estelle and Joshua assisted Lloyd and the SSS during the D∴G Cult crisis.', descJa: 'クロスベルのD∴G教団事件で共に死線をくぐり抜けた戦友。', debutGame: 'zero' },
  { id: 'rel_lloyd_rean', source: 'lloyd', target: 'rean', type: 'rival', labelEn: 'Crossbell Hero & Ashen Chevalier', labelJa: 'クロスベルの英雄と灰の騎士', descEn: 'Clashed during the Erebonian occupation of Crossbell; later fought as allies.', descJa: '占領下のジオフロントで刃を交え、後に世界を救うため共闘した。', debutGame: 'cs2' },
  { id: 'rel_rean_van', source: 'rean', target: 'van', type: 'comrade', labelEn: 'Divine Blade & Spriggan Contact', labelJa: '剣聖と裏解決屋の邂逅', descEn: 'Rean and Van cross paths as senior Zemurian figures during the Calvard crisis.', descJa: 'ゼムリアの未来を担う者同士として共和国で交差する縁。', debutGame: 'daybreak2' },
  { id: 'rel_zin_van', source: 'zin', target: 'van', type: 'comrade', labelEn: 'A-Rank Bracer & Spriggan Old Friends', labelJa: 'A級遊撃士と裏解決屋の旧知', descEn: 'Zin frequently hires Van for gray-market inquiries beyond bracer jurisdiction.', descJa: '表立って動けない案件をヴァンに依頼する旧知の間柄。', debutGame: 'daybreak1' },
];

// ============================================================================
// REFERENCE SERVICE ENGINES (Algorithms & State Managers)
// ============================================================================

export interface PathResult {
  found: boolean;
  nodes: Character[];
  edges: Relationship[];
  degrees: number;
  executionTimeMs: number;
}

/**
 * High-performance bidirectional Breadth-First Search (BFS) relationship routing engine.
 * Respects active game spoiler boundary: filters out characters and relationships
 * introduced in future games, unless allowSpoilers is explicitly set.
 */
export function findShortestRelationshipPath(
  startId: string,
  endId: string,
  characters: Map<string, Character>,
  relationships: Relationship[],
  activeGameId: GameId,
  allowSpoilers: boolean = false
): PathResult {
  const startTime = performance.now();
  const activeGameOrder = GAME_ORDER[activeGameId];

  // Validate start and end exist
  const startChar = characters.get(startId);
  const endChar = characters.get(endId);

  if (!startChar || !endChar) {
    return {
      found: false,
      nodes: [],
      edges: [],
      degrees: 0,
      executionTimeMs: performance.now() - startTime,
    };
  }

  // Check visibility under spoiler boundaries
  if (!allowSpoilers) {
    if (GAME_ORDER[startChar.debutGame] > activeGameOrder || GAME_ORDER[endChar.debutGame] > activeGameOrder) {
      return {
        found: false,
        nodes: [],
        edges: [],
        degrees: 0,
        executionTimeMs: performance.now() - startTime,
      };
    }
  }

  // Edge case: start is end
  if (startId === endId) {
    return {
      found: true,
      nodes: [startChar],
      edges: [],
      degrees: 0,
      executionTimeMs: performance.now() - startTime,
    };
  }

  // Build filtered undirected adjacency list
  const adj = new Map<string, { targetId: string; edge: Relationship }[]>();

  for (const rel of relationships) {
    if (!allowSpoilers) {
      // Must have debuted on or before active game
      if (GAME_ORDER[rel.debutGame] > activeGameOrder) continue;
      // If secret edge, spoilerDebutGame must also be <= activeGameOrder
      if (rel.spoilerDebutGame && GAME_ORDER[rel.spoilerDebutGame] > activeGameOrder) continue;

      // Both source and target characters must be introduced on or before active game
      const sChar = characters.get(rel.source);
      const tChar = characters.get(rel.target);
      if (!sChar || !tChar) continue;
      if (GAME_ORDER[sChar.debutGame] > activeGameOrder || GAME_ORDER[tChar.debutGame] > activeGameOrder) continue;
    }

    if (!adj.has(rel.source)) adj.set(rel.source, []);
    if (!adj.has(rel.target)) adj.set(rel.target, []);

    adj.get(rel.source)!.push({ targetId: rel.target, edge: rel });
    adj.get(rel.target)!.push({ targetId: rel.source, edge: rel });
  }

  // Bidirectional BFS traversal
  const queueForward: string[] = [startId];
  const queueBackward: string[] = [endId];

  const visitedForward = new Map<string, { prevNode: string | null; edge: Relationship | null }>();
  const visitedBackward = new Map<string, { prevNode: string | null; edge: Relationship | null }>();

  visitedForward.set(startId, { prevNode: null, edge: null });
  visitedBackward.set(endId, { prevNode: null, edge: null });

  let intersectionNode: string | null = null;

  while (queueForward.length > 0 && queueBackward.length > 0) {
    // Expand forward
    const currForward = queueForward.shift()!;
    const neighborsForward = adj.get(currForward) || [];

    for (const { targetId, edge } of neighborsForward) {
      if (!visitedForward.has(targetId)) {
        visitedForward.set(targetId, { prevNode: currForward, edge });
        queueForward.push(targetId);

        if (visitedBackward.has(targetId)) {
          intersectionNode = targetId;
          break;
        }
      }
    }

    if (intersectionNode) break;

    // Expand backward
    const currBackward = queueBackward.shift()!;
    const neighborsBackward = adj.get(currBackward) || [];

    for (const { targetId, edge } of neighborsBackward) {
      if (!visitedBackward.has(targetId)) {
        visitedBackward.set(targetId, { prevNode: currBackward, edge });
        queueBackward.push(targetId);

        if (visitedForward.has(targetId)) {
          intersectionNode = targetId;
          break;
        }
      }
    }

    if (intersectionNode) break;
  }

  if (!intersectionNode) {
    return {
      found: false,
      nodes: [],
      edges: [],
      degrees: 0,
      executionTimeMs: performance.now() - startTime,
    };
  }

  // Reconstruct path from start to intersection
  const pathNodes: Character[] = [];
  const pathEdges: Relationship[] = [];

  let curr: string | null = intersectionNode;
  const forwardNodes: Character[] = [];
  const forwardEdges: Relationship[] = [];

  while (curr !== null) {
    const nodeChar = characters.get(curr);
    if (nodeChar) forwardNodes.unshift(nodeChar);
    const info = visitedForward.get(curr);
    if (info && info.edge) forwardEdges.unshift(info.edge);
    curr = info ? info.prevNode : null;
  }

  // Reconstruct path from intersection to end
  curr = visitedBackward.get(intersectionNode)?.prevNode || null;
  let prevEdge: Relationship | null = visitedBackward.get(intersectionNode)?.edge || null;

  const backwardNodes: Character[] = [];
  const backwardEdges: Relationship[] = [];

  if (prevEdge) backwardEdges.push(prevEdge);

  while (curr !== null) {
    const nodeChar = characters.get(curr);
    if (nodeChar) backwardNodes.push(nodeChar);
    const info = visitedBackward.get(curr);
    if (info && info.edge) backwardEdges.push(info.edge);
    curr = info ? info.prevNode : null;
  }

  pathNodes.push(...forwardNodes, ...backwardNodes);
  pathEdges.push(...forwardEdges, ...backwardEdges);

  return {
    found: true,
    nodes: pathNodes,
    edges: pathEdges,
    degrees: pathEdges.length,
    executionTimeMs: performance.now() - startTime,
  };
}

/**
 * Checks whether a character is visible in the active game view.
 */
export function isCharacterVisible(
  char: Character,
  activeGame: GameId,
  unmaskedIds: Set<string> = new Set()
): boolean {
  if (unmaskedIds.has(char.id)) return true;
  return GAME_ORDER[char.debutGame] <= GAME_ORDER[activeGame];
}

/**
 * Default persistent UI application state.
 */
export const DEFAULT_STATE: PersistentState = {
  version: 1,
  selectedGameId: 'daybreak2',
  activeView: 'network',
  selectedCharId: 'rean',
  highContrastMode: false,
  language: 'en',
  unmaskedSpoilerIds: [],
  physicsConfig: {
    gravity: 0.15,
    repulsion: 450,
    linkDistance: 120,
    damping: 0.85,
    isPaused: false,
  },
};

/**
 * Sanitizes or masks a relationship if it contains secret lore twists.
 */
export function sanitizeRelationship(
  rel: Relationship,
  activeGame: GameId,
  unmaskedIds: Set<string> | string[] = new Set()
): Relationship | null {
  const activeOrder = GAME_ORDER[activeGame];
  const unmaskedSet = unmaskedIds instanceof Set ? unmaskedIds : new Set(unmaskedIds || []);

  // If debuted after active game, completely hidden unless unmasked
  if (GAME_ORDER[rel.debutGame] > activeOrder && !unmaskedSet.has(rel.id)) {
    return null;
  }

  // If secret and debuted as secret after active game
  if (rel.isSecret && rel.spoilerDebutGame && GAME_ORDER[rel.spoilerDebutGame] > activeOrder) {
    if (unmaskedSet.has(rel.id)) {
      return rel;
    }
    // Return masked version
    return {
      ...rel,
      labelEn: '[Classified Relationship]',
      labelJa: '【機密関係】',
      descEn: '[Redacted — Revealed in future chronicle. Click to unmask.]',
      descJa: '【秘匿情報 — 今後の物語で判明。解除可能】',
    };
  }

  return rel;
}

/**
 * Generates an SVG monogram fallback badge when a portrait asset fails to load.
 */
export function generateMonogramFallback(
  input: Character | string,
  factionIdOrSize?: string | number,
  size: number = 48
): string {
  let initials: string;
  let factionId: string;
  let badgeSize = size;

  if (typeof input === 'object') {
    initials = input.initials;
    factionId = input.factionId;
    if (typeof factionIdOrSize === 'number') {
      badgeSize = factionIdOrSize;
    }
  } else {
    initials = input;
    factionId = typeof factionIdOrSize === 'string' ? factionIdOrSize : 'neutral';
  }

  const faction = CANONICAL_FACTIONS.find((f) => f.id === factionId);
  const color = faction ? faction.color : '#38bdf8';
  return `<svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${factionId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad-${factionId})" stroke="${color}" stroke-width="3"/>
  <text x="50" y="60" font-family="'Cinzel', serif" font-size="34" font-weight="700" fill="#f8fafc" text-anchor="middle" letter-spacing="2">${initials}</text>
</svg>`;
}

/**
 * Manages LocalStorage state hydration with safe corruption fallback.
 */
export function hydrateState(
  rawJson: string | null | undefined,
  fallbackState: PersistentState = DEFAULT_STATE
): PersistentState {
  if (!rawJson) return fallbackState;
  try {
    const parsed = JSON.parse(rawJson);
    const validated = PersistentStateSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    return fallbackState;
  } catch {
    return fallbackState;
  }
}

export function serializeState(state: PersistentState): string {
  return JSON.stringify(PersistentStateSchema.parse(state));
}

