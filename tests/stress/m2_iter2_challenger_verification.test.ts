import { describe, it, expect } from 'vitest';
import {
  characters,
  characterMap,
  liberlCharacters,
  crossbellCharacters,
  ereboniaCharacters,
  reverieCharacters,
  calvardCharacters,
} from '../../src/data/characters';
import { relationships, relationshipMap } from '../../src/data/relationships';
import { factions } from '../../src/data/factions';
import { games } from '../../src/data/games';
import {
  isCharacterVisible,
  sanitizeRelationship,
  getCharacterEffectiveTitle,
  filterSpoilerNotes,
  GAME_ORDER,
  ALL_GAME_IDS,
} from '../../src/services/spoilerEngine';
import { findShortestRelationshipPath, buildAdjacencyList } from '../../src/services/pathfinder';
import { GameId, Character, Relationship } from '../../src/types';

describe('Empirical Challenger M2 Iteration 2: Rigorous Canon & Spoiler Verification', () => {
  // ==========================================================================
  // 1. BLEUBLANC & SKY FC ZERO-LEAK ROSTER GUARANTEE
  // ==========================================================================
  describe('1. Bleublanc & Sky FC Roster Verification', () => {
    it('1.1 should verify bleublanc has canonical debutGame="sky_sc"', () => {
      const bleublanc = characterMap.get('bleublanc');
      expect(bleublanc, 'Bleublanc must exist in characterMap').toBeDefined();
      expect(bleublanc?.debutGame, 'Bleublanc debutGame must strictly be sky_sc').toBe('sky_sc');
      expect(bleublanc?.factionId).toBe('ouroboros');

      // Check directly in ereboniaCharacters
      const ereboniaBleublanc = ereboniaCharacters.find((c) => c.id === 'bleublanc');
      expect(ereboniaBleublanc, 'Bleublanc must be in ereboniaCharacters').toBeDefined();
      expect(ereboniaBleublanc?.debutGame).toBe('sky_sc');
    });

    it('1.2 should confirm bleublanc is invisible in Sky FC and visible starting in Sky SC', () => {
      const bleublanc = characterMap.get('bleublanc')!;
      // Sky FC: must be invisible
      expect(isCharacterVisible(bleublanc, 'sky_fc'), 'Bleublanc must NOT be visible in sky_fc').toBe(false);

      // Sky SC and later: must be visible
      for (const gameId of ALL_GAME_IDS) {
        const isVisible = isCharacterVisible(bleublanc, gameId);
        if (gameId === 'sky_fc') {
          expect(isVisible, `Bleublanc should be hidden in ${gameId}`).toBe(false);
        } else {
          expect(isVisible, `Bleublanc should be visible in ${gameId}`).toBe(true);
        }
      }

      // Selective unmasking test
      expect(
        isCharacterVisible(bleublanc, 'sky_fc', new Set(['bleublanc'])),
        'Bleublanc should be visible in Sky FC when selectively unmasked'
      ).toBe(true);
    });

    it('1.3 should verify exactly 0 non-Liberl characters are visible in Sky FC active roster', () => {
      const nonLiberlCharacters = [
        ...crossbellCharacters,
        ...ereboniaCharacters,
        ...reverieCharacters,
        ...calvardCharacters,
      ];

      const visibleNonLiberl = nonLiberlCharacters.filter((c) => isCharacterVisible(c, 'sky_fc'));
      expect(
        visibleNonLiberl.length,
        `Expected 0 non-Liberl characters visible in Sky FC, but found: ${JSON.stringify(
          visibleNonLiberl.map((c) => ({ id: c.id, debutGame: c.debutGame }))
        )}`
      ).toBe(0);

      // Verify the total count of visible characters in Sky FC is strictly Liberl cast
      const allVisibleInFC = characters.filter((c) => isCharacterVisible(c, 'sky_fc'));
      expect(allVisibleInFC.length).toBe(67);
      for (const c of allVisibleInFC) {
        expect(c.debutGame).toBe('sky_fc');
        expect(
          liberlCharacters.some((lc) => lc.id === c.id),
          `Character ${c.id} is visible in Sky FC but not in liberlCharacters`
        ).toBe(true);
      }
    });

    it('1.4 should verify DeepDiveArcView and FactionHierarchyTree filtering logic for Sky FC excludes bleublanc', () => {
      // Replicate DeepDiveArcView filtering
      const activeGame = games.find((g) => g.id === 'sky_fc')!;
      const unmaskedIds = new Set<string>();

      const visibleInDeepDive = characters.filter((char) => {
        if (unmaskedIds.has(char.id)) return true;
        return GAME_ORDER[char.debutGame] <= GAME_ORDER[activeGame.id];
      });

      expect(visibleInDeepDive.some((c) => c.id === 'bleublanc')).toBe(false);

      // Replicate FactionHierarchyTree filtering
      const visibleInTree = characters.filter((c) => isCharacterVisible(c, 'sky_fc'));
      expect(visibleInTree.some((c) => c.id === 'bleublanc')).toBe(false);
    });
  });

  // ==========================================================================
  // 2. JOSHUA & LOEWE AND CLASSIFIED RELATIONSHIPS MASKING
  // ==========================================================================
  describe('2. Joshua & Loewe and Classified Relationships Masking', () => {
    it('2.1 should verify rel_joshua_loewe canonical attributes', () => {
      const rel = relationships.find((r) => r.id === 'rel_joshua_loewe');
      expect(rel, 'rel_joshua_loewe must exist').toBeDefined();
      expect(rel?.debutGame).toBe('sky_fc');
      expect(rel?.spoilerDebutGame).toBe('sky_sc');
      expect(rel?.isSecret).toBe(true);
      expect(rel?.labelEn).toBe('Hamel Brothers & Fated Foes');
      expect(rel?.labelJa).toBe('ハーメルの義兄弟・宿命の対峙');
    });

    it('2.2 should verify rel_joshua_loewe is strictly masked as [Classified Relationship] in Sky FC', () => {
      const rel = relationships.find((r) => r.id === 'rel_joshua_loewe')!;

      // Masked without unmasking in Sky FC
      const masked = sanitizeRelationship(rel, 'sky_fc');
      expect(masked).not.toBeNull();
      expect(masked?.labelEn).toBe('[Classified Relationship]');
      expect(masked?.labelJa).toBe('【機密関係】');
      expect(masked?.descEn).toBe('[Redacted — Revealed in future chronicle. Click to unmask.]');
      expect(masked?.descJa).toBe('【秘匿情報 — 今後の物語で判明。解除可能】');

      // Revealed in Sky FC when selectively unmasked
      const unmasked = sanitizeRelationship(rel, 'sky_fc', new Set(['rel_joshua_loewe']));
      expect(unmasked).not.toBeNull();
      expect(unmasked?.labelEn).toBe('Hamel Brothers & Fated Foes');
      expect(unmasked?.labelJa).toBe('ハーメルの義兄弟・宿命の対峙');

      // Automatically revealed in Sky SC and all later games without unmasking
      const gamesFromSC = ALL_GAME_IDS.slice(1); // sky_sc to daybreak2
      for (const gameId of gamesFromSC) {
        const revealed = sanitizeRelationship(rel, gameId);
        expect(revealed).not.toBeNull();
        expect(
          revealed?.labelEn,
          `Expected rel_joshua_loewe to be unmasked in ${gameId}`
        ).toBe('Hamel Brothers & Fated Foes');
        expect(revealed?.labelJa).toBe('ハーメルの義兄弟・宿命の対峙');
      }
    });

    it('2.3 should audit ALL relationships in the dataset for classified / spoilerDebutGame consistency', () => {
      // Find all classified or spoiler-debut relationships
      const classifiedRels = relationships.filter((r) => r.isSecret || r.spoilerDebutGame);
      expect(classifiedRels.length).toBeGreaterThanOrEqual(16);

      const leaks: string[] = [];

      for (const rel of classifiedRels) {
        const debutIdx = GAME_ORDER[rel.debutGame];
        const spoilerIdx = rel.spoilerDebutGame ? GAME_ORDER[rel.spoilerDebutGame] : Infinity;

        for (let idx = 0; idx < ALL_GAME_IDS.length; idx++) {
          const gameId = ALL_GAME_IDS[idx];
          const sanitized = sanitizeRelationship(rel, gameId);

          if (idx < debutIdx) {
            // Before debut: must be completely hidden (null)
            if (sanitized !== null) {
              leaks.push(`${rel.id} in ${gameId}: expected null before debut (${rel.debutGame}), got ${sanitized.labelEn}`);
            }
          } else if (idx < spoilerIdx) {
            // Between debut and spoilerDebutGame (or if isSecret with no spoilerDebutGame):
            // MUST be masked as [Classified Relationship]
            if (!sanitized) {
              leaks.push(`${rel.id} in ${gameId}: unexpectedly returned null`);
            } else if (sanitized.labelEn !== '[Classified Relationship]') {
              leaks.push(`${rel.id} in ${gameId}: leaked raw label "${sanitized.labelEn}" before spoiler debut (${rel.spoilerDebutGame})`);
            } else if (sanitized.labelJa !== '【機密関係】') {
              leaks.push(`${rel.id} in ${gameId}: missing Japanese classified label 【機密関係】`);
            }

            // Test unmasking in this range
            const unmasked = sanitizeRelationship(rel, gameId, new Set([rel.id]));
            if (!unmasked || unmasked.labelEn === '[Classified Relationship]') {
              leaks.push(`${rel.id} in ${gameId}: failed to unmask when requested`);
            }
          } else {
            // At or after spoilerDebutGame: must be fully revealed
            if (!sanitized) {
              leaks.push(`${rel.id} in ${gameId}: unexpectedly returned null`);
            } else if (sanitized.labelEn === '[Classified Relationship]') {
              leaks.push(`${rel.id} in ${gameId}: remained masked after spoiler debut (${rel.spoilerDebutGame})`);
            }
          }
        }
      }

      expect(leaks, `Detected classified relationship leaks: ${leaks.join('; ')}`).toEqual([]);
    });
  });

  // ==========================================================================
  // 3. PATHFINDER BFS ADJACENCY & SPOILER GATING
  // ==========================================================================
  describe('3. Pathfinder BFS Adjacency & Referential Gating', () => {
    it('3.1 should not traverse rel_joshua_loewe in Sky FC when allowSpoilers=false', () => {
      // In Sky FC, Loewe and Joshua cannot be connected via rel_joshua_loewe when allowSpoilers=false
      // Let's inspect adjacency list directly
      const adj = buildAdjacencyList(relationships, characterMap, 'sky_fc', false);
      const joshuaEdges = adj.get('joshua') || [];
      const loeweEdges = adj.get('loewe') || [];

      expect(joshuaEdges.some((e) => e.edge.id === 'rel_joshua_loewe')).toBe(false);
      expect(loeweEdges.some((e) => e.edge.id === 'rel_joshua_loewe')).toBe(false);
    });

    it('3.2 should traverse rel_joshua_loewe in Sky FC when allowSpoilers=true', () => {
      const adj = buildAdjacencyList(relationships, characterMap, 'sky_fc', true);
      const joshuaEdges = adj.get('joshua') || [];
      const loeweEdges = adj.get('loewe') || [];

      expect(joshuaEdges.some((e) => e.edge.id === 'rel_joshua_loewe')).toBe(true);
      expect(loeweEdges.some((e) => e.edge.id === 'rel_joshua_loewe')).toBe(true);

      const path = findShortestRelationshipPath('joshua', 'loewe', characterMap, relationships, 'sky_fc', true);
      expect(path.found).toBe(true);
      expect(path.degrees).toBe(1);
      expect(path.edges[0].id).toBe('rel_joshua_loewe');
    });

    it('3.3 should safely reject dangling/non-existent character IDs in both spoiler modes', () => {
      const ghost1 = 'ghost_character_alpha';
      const ghost2 = 'ghost_character_beta';

      // allowSpoilers = false
      const resWithoutSpoilers = findShortestRelationshipPath(
        ghost1,
        ghost2,
        characterMap,
        relationships,
        'sky_fc',
        false
      );
      expect(resWithoutSpoilers.found).toBe(false);
      expect(resWithoutSpoilers.degrees).toBe(0);

      // allowSpoilers = true
      const resWithSpoilers = findShortestRelationshipPath(
        ghost1,
        ghost2,
        characterMap,
        relationships,
        'sky_fc',
        true
      );
      expect(resWithSpoilers.found).toBe(false);
      expect(resWithSpoilers.degrees).toBe(0);
    });
  });
});
