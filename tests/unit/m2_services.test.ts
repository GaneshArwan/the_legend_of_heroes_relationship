import { describe, it, expect } from 'vitest';
import { buildAdjacencyList, findShortestRelationshipPath } from '../../src/services/pathfinder';
import type { Relationship } from '../../src/types';
import {
  isCharacterVisible,
  sanitizeRelationship,
  getCharacterEffectiveTitle,
  filterSpoilerNotes,
  GAME_ORDER,
  ALL_GAME_IDS,
} from '../../src/services/spoilerEngine';
import {
  hydrateState,
  serializeState,
  DEFAULT_STATE,
  PersistentStateSchema,
  generateMonogramFallback,
} from '../../src/services/storage';
import { characters, characterMap } from '../../src/data/characters';
import { relationships } from '../../src/data/relationships';
import { games } from '../../src/data/games';

describe('Milestone 2 Services Unit Verification', () => {
  // --------------------------------------------------------------------------
  // 1. Spoiler Engine Service
  // --------------------------------------------------------------------------
  describe('Spoiler Engine Service', () => {
    it('should correctly evaluate character visibility by chronological game order', () => {
      const estelle = characterMap.get('estelle')!;
      const rean = characterMap.get('rean')!;
      const van = characterMap.get('van')!;

      // In Sky FC, only Sky FC characters are visible
      expect(isCharacterVisible(estelle, 'sky_fc')).toBe(true);
      expect(isCharacterVisible(rean, 'sky_fc')).toBe(false);
      expect(isCharacterVisible(van, 'sky_fc')).toBe(false);

      // In CS1, Estelle and Rean are visible, but Van is not
      expect(isCharacterVisible(estelle, 'cs1')).toBe(true);
      expect(isCharacterVisible(rean, 'cs1')).toBe(true);
      expect(isCharacterVisible(van, 'cs1')).toBe(false);

      // In Daybreak II, all are visible
      expect(isCharacterVisible(estelle, 'daybreak2')).toBe(true);
      expect(isCharacterVisible(rean, 'daybreak2')).toBe(true);
      expect(isCharacterVisible(van, 'daybreak2')).toBe(true);
    });

    it('should respect unmasked character IDs even if introduced in a future chronicle', () => {
      const van = characterMap.get('van')!;
      expect(isCharacterVisible(van, 'sky_fc')).toBe(false);
      expect(isCharacterVisible(van, 'sky_fc', new Set(['van']))).toBe(true);
    });

    it('should hide or mask relationships with future debut dates or secret status', () => {
      // Find a relationship debuted in later games
      const csRel = relationships.find((r) => r.debutGame === 'cs1');
      if (csRel) {
        expect(sanitizeRelationship(csRel, 'sky_fc')).toBeNull();
        expect(sanitizeRelationship(csRel, 'cs1')).not.toBeNull();
      }

      // Test secret relationship masking
      const secretRel = relationships.find((r) => r.isSecret && r.spoilerDebutGame);
      if (secretRel && secretRel.spoilerDebutGame) {
        const masked = sanitizeRelationship(secretRel, secretRel.debutGame);
        if (GAME_ORDER[secretRel.spoilerDebutGame] > GAME_ORDER[secretRel.debutGame]) {
          expect(masked?.labelEn).toBe('[Classified Relationship]');
          expect(masked?.descEn).toContain('Redacted');
        }
      }
    });

    it('should resolve effective character titles across game variants', () => {
      const rean = characterMap.get('rean')!;
      const titleCS1 = getCharacterEffectiveTitle(rean, 'cs1', 'en');
      const titleCS3 = getCharacterEffectiveTitle(rean, 'cs3', 'en');
      expect(titleCS1).toBeDefined();
      expect(titleCS3).toBeDefined();
    });

    it('should filter spoiler notes based on active game horizon', () => {
      const testNotes = [
        { minGame: 'sky_fc' as const, note: 'FC note' },
        { minGame: 'cs1' as const, note: 'CS1 note' },
        { minGame: 'daybreak1' as const, note: 'Daybreak note' },
      ];
      const filteredFC = filterSpoilerNotes(testNotes, 'sky_fc');
      expect(filteredFC.length).toBe(1);
      expect(filteredFC[0].note).toBe('FC note');

      const filteredCS1 = filterSpoilerNotes(testNotes, 'cs1');
      expect(filteredCS1.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pathfinder Service (Bidirectional BFS)
  // --------------------------------------------------------------------------
  describe('Pathfinder Service (Bidirectional BFS)', () => {
    it('should find direct and multi-hop paths between characters in <5ms', () => {
      // Estelle to Joshua (Direct link)
      const resDirect = findShortestRelationshipPath(
        'estelle',
        'joshua',
        characterMap,
        relationships,
        'sky_fc',
        false
      );
      expect(resDirect.found).toBe(true);
      expect(resDirect.degrees).toBe(1);
      expect(resDirect.nodes.length).toBe(2);
      expect(resDirect.edges.length).toBe(1);
      expect(resDirect.executionTimeMs).toBeLessThan(5);

      // Multi-hop cross-arc in Daybreak II
      const resMulti = findShortestRelationshipPath(
        'estelle',
        'van',
        characterMap,
        relationships,
        'daybreak2',
        false
      );
      expect(resMulti.found).toBe(true);
      expect(resMulti.degrees).toBeGreaterThanOrEqual(1);
      expect(resMulti.executionTimeMs).toBeLessThan(5);
    });

    it('should handle reflexive query where startId === endId', () => {
      const res = findShortestRelationshipPath(
        'estelle',
        'estelle',
        characterMap,
        relationships,
        'sky_fc',
        false
      );
      expect(res.found).toBe(true);
      expect(res.degrees).toBe(0);
      expect(res.nodes.length).toBe(1);
      expect(res.edges.length).toBe(0);
    });

    it('should strictly return found: false when endpoints are blocked by spoiler boundary', () => {
      // Van is in Daybreak, not Sky FC
      const res = findShortestRelationshipPath(
        'estelle',
        'van',
        characterMap,
        relationships,
        'sky_fc',
        false
      );
      expect(res.found).toBe(false);
      expect(res.nodes).toEqual([]);
      expect(res.edges).toEqual([]);
      expect(res.degrees).toBe(0);
    });

    it('should allow cross-era path when allowSpoilers is true', () => {
      const res = findShortestRelationshipPath(
        'estelle',
        'van',
        characterMap,
        relationships,
        'sky_fc',
        true
      );
      expect(res.found).toBe(true);
      expect(res.degrees).toBeGreaterThanOrEqual(1);
    });

    it('should discard edges referencing dangling or unindexed character IDs even when allowSpoilers is true', () => {
      const testRelationships: Relationship[] = [
        {
          id: 'rel_valid',
          source: 'estelle',
          target: 'joshua',
          type: 'family',
          labelEn: 'Siblings',
          labelJa: '家族',
          descEn: 'Adoptive siblings',
          descJa: '義理の姉弟',
          debutGame: 'sky_fc',
        },
        {
          id: 'rel_dangling',
          source: 'estelle',
          target: 'non_existent_ghost_id',
          type: 'comrade',
          labelEn: 'Phantom Link',
          labelJa: '幽霊',
          descEn: 'Edge with unknown target',
          descJa: 'テスト',
          debutGame: 'sky_fc',
        },
      ];

      const adj = buildAdjacencyList(testRelationships, characterMap, 'sky_fc', true);
      expect(adj.has('non_existent_ghost_id')).toBe(false);
      const estelleEdges = adj.get('estelle') || [];
      expect(estelleEdges.some((e) => e.targetId === 'non_existent_ghost_id')).toBe(false);
      expect(estelleEdges.length).toBe(1);
      expect(estelleEdges[0].targetId).toBe('joshua');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Storage Persistence Service
  // --------------------------------------------------------------------------
  describe('Storage Persistence Service', () => {
    it('should validate and serialize state adhering to PersistentStateSchema', () => {
      const serialized = serializeState(DEFAULT_STATE);
      expect(typeof serialized).toBe('string');
      const hydrated = hydrateState(serialized);
      expect(hydrated).toEqual(DEFAULT_STATE);
    });

    it('should safely fall back to DEFAULT_STATE on invalid JSON or corrupt schemas', () => {
      expect(hydrateState(null)).toEqual(DEFAULT_STATE);
      expect(hydrateState(undefined)).toEqual(DEFAULT_STATE);
      expect(hydrateState('not valid json {')).toEqual(DEFAULT_STATE);
      expect(hydrateState('{"version": 999}')).toEqual(DEFAULT_STATE);
      expect(hydrateState('{"version": 1, "selectedGameId": "invalid_game"}')).toEqual(
        DEFAULT_STATE
      );
    });

    it('should generate SVG monogram fallback badges', () => {
      const svg = generateMonogramFallback('EB', '#38bdf8', 48);
      expect(svg).toContain('<svg');
      expect(svg).toContain('EB');
      expect(svg).toContain('#38bdf8');
    });
  });
});
