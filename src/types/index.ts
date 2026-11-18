export type GameId =
  | 'all'
  | 'sky_fc'
  | 'sky_sc'
  | 'sky_3rd'
  | 'zero'
  | 'azure'
  | 'cs1'
  | 'cs2'
  | 'cs3'
  | 'cs4'
  | 'reverie'
  | 'daybreak1'
  | 'daybreak2';

export interface ChapterConflict {
  chapter: string;
  title: string;
  summary: string;
}

export interface GameArc {
  id: GameId;
  index: number; // 0 to 11
  nameEn: string;
  nameJa: string;
  year: string; // e.g. "S.1202"
  region: string;
  orbmentSystem: string;
  activeFactions: string[];
  chapterConflicts: ChapterConflict[];
}

export type FactionArc =
  | 'liberl'
  | 'crossbell'
  | 'erebonia'
  | 'reverie'
  | 'calvard'
  | 'pan_zemuria';

export interface Faction {
  id: string;
  nameEn: string;
  nameJa: string;
  arc: FactionArc;
  color: string; // hex color e.g. "#38bdf8"
  descriptionEn: string;
  descriptionJa: string;
  hierarchyRanks?: string[];
}

export interface CharacterVariant {
  portraitUrl?: string;
  titleEn?: string;
  titleJa?: string;
  weapons?: string[];
  eraLabel?: string;
  eraLabelJa?: string;
}

export interface SpoilerNote {
  minGame: GameId;
  note: string;
}

export interface Character {
  id: string;
  nameEn: string;
  nameJa: string;
  titleEn: string;
  titleJa: string;
  factionId: string;
  subgroupId?: string;
  debutGame: GameId;
  weapons: string[];
  seiyuu: string;
  bioEn: string;
  bioJa: string;
  initials: string;
  variants?: Partial<Record<GameId, CharacterVariant>>;
  spoilerNotes?: SpoilerNote[];
}

export type RelationshipType =
  | 'mentor'
  | 'comrade'
  | 'family'
  | 'rival'
  | 'secret';

export interface Relationship {
  id: string;
  source: string; // character id
  target: string; // character id
  type: RelationshipType;
  labelEn: string;
  labelJa: string;
  descEn: string;
  descJa: string;
  debutGame: GameId;
  spoilerDebutGame?: GameId; // if secret until later game
  isSecret?: boolean;
}
