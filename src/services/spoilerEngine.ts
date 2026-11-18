import { Character, Relationship, GameId, CharacterVariant, SpoilerNote } from '../types';

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
  all: 999,
};

export const ALL_GAME_IDS: GameId[] = [
  'sky_fc',
  'sky_sc',
  'sky_3rd',
  'zero',
  'azure',
  'cs1',
  'cs2',
  'cs3',
  'cs4',
  'reverie',
  'daybreak1',
  'daybreak2',
];

/**
 * Checks whether a character is visible under the active game pill horizon.
 * Allows selective unmasking via unmaskedIds.
 */
export function isCharacterVisible(
  char: Character,
  activeGame: GameId,
  unmaskedIds: Set<string> | string[] = new Set()
): boolean {
  if (activeGame === 'all') return true;
  const unmaskedSet = unmaskedIds instanceof Set ? unmaskedIds : new Set(unmaskedIds || []);
  if (unmaskedSet.has(char.id)) return true;
  return GAME_ORDER[char.debutGame] <= GAME_ORDER[activeGame];
}

/**
 * Sanitizes or masks a relationship edge.
 * Returns null if completely hidden (debuts after active game).
 * Returns masked clone if secret until later chronicle and not unmasked.
 */
export function sanitizeRelationship(
  rel: Relationship,
  activeGame: GameId,
  unmaskedIds: Set<string> | string[] = new Set()
): Relationship | null {
  if (activeGame === 'all') return rel;
  const activeOrder = GAME_ORDER[activeGame];
  const unmaskedSet = unmaskedIds instanceof Set ? unmaskedIds : new Set(unmaskedIds || []);

  // Debut occurs after active game: completely hidden unless unmasked
  if (GAME_ORDER[rel.debutGame] > activeOrder && !unmaskedSet.has(rel.id)) {
    return null;
  }

  // Secret or future-spoiler edge: masked as classified unless active chronicle reached or unmasked
  const isMasked = Boolean(
    (rel.spoilerDebutGame && GAME_ORDER[rel.spoilerDebutGame] > activeOrder) ||
    (rel.isSecret && !rel.spoilerDebutGame)
  );

  if (isMasked) {
    if (unmaskedSet.has(rel.id)) {
      return rel;
    }
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
 * Retrieves the chronologically accurate title for a character given the active game.
 */
export function getCharacterEffectiveTitle(
  char: Character,
  activeGame: GameId,
  language: 'en' | 'ja' = 'en'
): string {
  const activeOrder = GAME_ORDER[activeGame];
  if (!char.variants) {
    return language === 'ja' ? char.titleJa : char.titleEn;
  }

  // Find the latest variant up to activeGame
  let bestVariant: CharacterVariant | null = null;
  let bestOrder = -1;

  for (const [gameId, variant] of Object.entries(char.variants)) {
    const order = GAME_ORDER[gameId as GameId];
    if (order !== undefined && order <= activeOrder && order > bestOrder) {
      bestOrder = order;
      bestVariant = variant;
    }
  }

  if (bestVariant) {
    if (language === 'ja' && bestVariant.titleJa) return bestVariant.titleJa;
    if (bestVariant.titleEn) return bestVariant.titleEn;
  }

  return language === 'ja' ? char.titleJa : char.titleEn;
}

/**
 * Filters spoiler notes according to active game horizon.
 */
export function filterSpoilerNotes(
  notes: SpoilerNote[] | undefined,
  activeGame: GameId,
  unmaskedNoteKeys: Set<string> = new Set()
): SpoilerNote[] {
  if (!notes) return [];
  const activeOrder = GAME_ORDER[activeGame];
  return notes.filter((n, idx) => {
    const key = `${activeGame}_note_${idx}`;
    return GAME_ORDER[n.minGame] <= activeOrder || unmaskedNoteKeys.has(key);
  });
}
