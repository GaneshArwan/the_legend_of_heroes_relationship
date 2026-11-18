/**
 * ============================================================================
 * TIER 2: BOUNDARY & CORNER CASES (Boundary Value Analysis & Fault Tolerance)
 * File: tests/e2e/boundary_corner.test.ts
 *
 * Verifies lower/upper domain boundaries, disconnected graphs, self-referential
 * path queries, malicious/regex input sanitization, extreme physics bounds,
 * corrupted LocalStorage payload recovery, and rapid game switching.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_GAMES,
  CANONICAL_CHARACTERS,
  CANONICAL_RELATIONSHIPS,
  CharacterSchema,
  RelationshipSchema,
  PersistentStateSchema,
  DEFAULT_STATE,
  isCharacterVisible,
  sanitizeRelationship,
  findShortestRelationshipPath,
  hydrateState,
  serializeState,
  generateMonogramFallback,
  type Character,
  type Relationship,
  type PersistentState,
} from './fixtures';

describe('Tier 2: Boundary & Corner Cases (Boundary Value Analysis)', () => {

  // --------------------------------------------------------------------------
  // 1. LOWER BOUNDARY: Sky FC (Index 0)
  // --------------------------------------------------------------------------
  describe('1. Lower Boundary: Sky FC (Index 0)', () => {
    it('TC-2.1: strictly excludes characters debuting in later games', () => {
      const visibleChars = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, 'sky_fc')
      );

      // Sky FC debut characters must be visible
      const estelle = visibleChars.find((c) => c.id === 'estelle');
      const joshua = visibleChars.find((c) => c.id === 'joshua');
      const cassius = visibleChars.find((c) => c.id === 'cassius');
      const richard = visibleChars.find((c) => c.id === 'richard');

      expect(estelle).toBeDefined();
      expect(joshua).toBeDefined();
      expect(cassius).toBeDefined();
      expect(richard).toBeDefined();

      // Characters from later games must be strictly excluded
      const laterChars = [
        'kevin',     // Sky the 3rd
        'lloyd',     // Zero
        'elie',      // Zero
        'rean',      // Cold Steel I
        'altina',    // Cold Steel II
        'ash',       // Cold Steel III
        'c_rufus',   // Reverie
        'van',       // Daybreak I
      ];

      for (const charId of laterChars) {
        const found = visibleChars.find((c) => c.id === charId);
        expect(found, `Character ${charId} should not be visible in Sky FC`).toBeUndefined();
      }

      // Exactly 13 canonical characters debut in sky_fc
      expect(visibleChars.length).toBe(13);
    });

    it('TC-2.2: strictly sanitizes or hides relationships with future debut dates', () => {
      const visibleRels = CANONICAL_RELATIONSHIPS.map((r) =>
        sanitizeRelationship(r, 'sky_fc', [])
      ).filter((r): r is Relationship => r !== null);

      // Estelle and Joshua family relationship was present in Sky FC
      const estelleJoshua = visibleRels.find(
        (r) =>
          (r.source === 'estelle' && r.target === 'joshua') ||
          (r.source === 'joshua' && r.target === 'estelle')
      );
      expect(estelleJoshua).toBeDefined();
      expect(estelleJoshua?.debutGame).toBe('sky_fc');

      // Rean and Osborne secret/rival relationship from CS2/CS3 must be excluded
      const reanOsborne = visibleRels.find(
        (r) =>
          (r.source === 'rean' && r.target === 'osborne') ||
          (r.source === 'osborne' && r.target === 'rean')
      );
      expect(reanOsborne).toBeUndefined();

      // All visible relationship endpoints must exist in Sky FC
      const visibleCharIds = new Set(
        CANONICAL_CHARACTERS.filter((c) => isCharacterVisible(c, 'sky_fc')).map((c) => c.id)
      );

      for (const rel of visibleRels) {
        expect(visibleCharIds.has(rel.source)).toBe(true);
        expect(visibleCharIds.has(rel.target)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. UPPER BOUNDARY: Daybreak II (Index 11)
  // --------------------------------------------------------------------------
  describe('2. Upper Boundary: Daybreak II (Index 11)', () => {
    it('TC-2.3: unlocks 100% of the canonical character roster (106 characters)', () => {
      const visibleChars = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, 'daybreak2')
      );

      expect(visibleChars.length).toBe(CANONICAL_CHARACTERS.length);
      expect(visibleChars.length).toBeGreaterThanOrEqual(100);

      // Verify representatives across every single game arc are visible
      const arcRepresentatives = [
        { id: 'estelle', arc: 'Liberl' },
        { id: 'lloyd', arc: 'Crossbell' },
        { id: 'rean', arc: 'Erebonia' },
        { id: 'c_rufus', arc: 'Reverie' },
        { id: 'van', arc: 'Calvard' },
      ];

      for (const rep of arcRepresentatives) {
        const found = visibleChars.find((c) => c.id === rep.id);
        expect(found, `Representative ${rep.id} of ${rep.arc} arc must be visible in Daybreak II`).toBeDefined();
      }
    });

    it('TC-2.4: exposes all non-spoiler relationships across all 12 games', () => {
      const visibleRels = CANONICAL_RELATIONSHIPS.map((r) =>
        sanitizeRelationship(r, 'daybreak2', [])
      ).filter((r): r is Relationship => r !== null);

      expect(visibleRels.length).toBe(CANONICAL_RELATIONSHIPS.length);

      // Check relationships debuting in daybreak1 are visible
      const vanElaine = visibleRels.find(
        (r) =>
          (r.source === 'van' && r.target === 'elaine') ||
          (r.source === 'elaine' && r.target === 'van')
      );
      expect(vanElaine).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 3. ISOLATED NODE & GRAPH TOPOLOGY CORNER CASES
  // --------------------------------------------------------------------------
  describe('3. Isolated Nodes & Topology Corners', () => {
    const isolatedChar: Character = {
      id: 'isolated_npc',
      nameEn: 'Isolated Hermit',
      nameJa: '隠遁者',
      titleEn: 'Wandering Monk',
      titleJa: '放浪の僧侶',
      factionId: 'neutral',
      debutGame: 'sky_fc',
      weapons: ['Wooden Staff'],
      seiyuu: 'Unknown Seiyuu',
      bioEn: 'A lone traveler with no connections in Zemuria.',
      bioJa: 'ゼムリア大陸に誰とも縁を持たない孤高の旅人。',
      initials: 'IH',
    };

    const characterMap = new Map<string, Character>(
      CANONICAL_CHARACTERS.map((c) => [c.id, c])
    );

    it('TC-2.5: gracefully renders and computes monogram fallback for isolated nodes', () => {
      expect(() => CharacterSchema.parse(isolatedChar)).not.toThrow();

      const monogramSvg = generateMonogramFallback(isolatedChar);
      expect(monogramSvg).toContain('<svg');
      expect(monogramSvg).toContain('IH');
      expect(monogramSvg).toContain('grad-neutral');
    });

    it('TC-2.6: BFS path search returns found:false when querying an isolated node', () => {
      const extendedMap = new Map<string, Character>([
        ...characterMap.entries(),
        [isolatedChar.id, isolatedChar],
      ]);

      const result = findShortestRelationshipPath(
        'estelle',
        'isolated_npc',
        extendedMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(result.found).toBe(false);
      expect(result.degrees).toBe(0);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('TC-2.7: self-referential path query (Origin === Target) returns 0 hops immediately', () => {
      const result = findShortestRelationshipPath(
        'rean',
        'rean',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(result.found).toBe(true);
      expect(result.degrees).toBe(0);
      expect(result.nodes.map((n) => n.id)).toEqual(['rean']);
      expect(result.edges).toEqual([]);
    });

    it('TC-2.8: nonexistent character IDs in path query return found:false without throwing', () => {
      const result = findShortestRelationshipPath(
        'nonexistent_hero',
        'estelle',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(result.found).toBe(false);
      expect(result.degrees).toBe(0);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // 4. SEARCH FILTER BOUNDARIES & ADVERSARIAL SANITIZATION
  // --------------------------------------------------------------------------
  describe('4. Search Filter Boundaries & Input Sanitization', () => {
    // Reference search filter function mimicking UI filtering
    function filterCharacters(chars: Character[], query: string): Character[] {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) return chars;
      return chars.filter(
        (c) =>
          c.nameEn.toLowerCase().includes(trimmed) ||
          c.nameJa.toLowerCase().includes(trimmed) ||
          c.titleEn.toLowerCase().includes(trimmed) ||
          c.titleJa.toLowerCase().includes(trimmed) ||
          c.seiyuu.toLowerCase().includes(trimmed) ||
          c.weapons.some((w) => w.toLowerCase().includes(trimmed))
      );
    }

    it('TC-2.9: empty or whitespace-only search string returns the full active roster', () => {
      expect(filterCharacters(CANONICAL_CHARACTERS, '').length).toBe(CANONICAL_CHARACTERS.length);
      expect(filterCharacters(CANONICAL_CHARACTERS, '   ').length).toBe(CANONICAL_CHARACTERS.length);
      expect(filterCharacters(CANONICAL_CHARACTERS, '\t\n  ').length).toBe(CANONICAL_CHARACTERS.length);
    });

    it('TC-2.10: adversarial regex metacharacters and injections do not crash filter logic', () => {
      const adversarialQueries = [
        '.*',
        '^(.*)$',
        '[[[',
        '???',
        '\\',
        '+',
        '*',
        '{1,5}',
        'Rean|Estelle',
        'SELECT * FROM characters;',
        '<script>alert(1)</script>',
      ];

      for (const badQuery of adversarialQueries) {
        expect(() => {
          const results = filterCharacters(CANONICAL_CHARACTERS, badQuery);
          expect(Array.isArray(results)).toBe(true);
        }).not.toThrow();
      }
    });

    it('TC-2.11: handles Japanese, accents, and non-ASCII characters accurately', () => {
      // Accent search: René
      const rene = filterCharacters(CANONICAL_CHARACTERS, 'rené');
      expect(rene.some((c) => c.id === 'kincaid')).toBe(true);

      // Japanese kanji search: リィン
      const reanJa = filterCharacters(CANONICAL_CHARACTERS, 'リィン');
      expect(reanJa.some((c) => c.id === 'rean')).toBe(true);

      // Japanese title search: 剣聖
      const bladeMasters = filterCharacters(CANONICAL_CHARACTERS, '剣聖');
      expect(bladeMasters.length).toBeGreaterThan(0);
      expect(bladeMasters.some((c) => c.id === 'rean' || c.id === 'cassius' || c.id === 'shizuna')).toBe(true);

      // Japanese symbol search: ≪C≫
      const cRufus = filterCharacters(CANONICAL_CHARACTERS, '≪C≫');
      expect(cRufus.some((c) => c.id === 'c_rufus')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. EXTREME PHYSICS SLIDER BOUNDARIES
  // --------------------------------------------------------------------------
  describe('5. Extreme Physics Slider Boundaries', () => {
    it('TC-2.12: validates minimum and maximum clamped physics ranges', () => {
      const minPhysics = {
        gravity: 0,
        repulsion: 50,
        linkDistance: 20,
        damping: 0.1,
        isPaused: true,
      };

      const maxPhysics = {
        gravity: 1,
        repulsion: 1500,
        linkDistance: 400,
        damping: 0.99,
        isPaused: false,
      };

      const stateMin: PersistentState = {
        ...DEFAULT_STATE,
        physicsConfig: minPhysics,
      };

      const stateMax: PersistentState = {
        ...DEFAULT_STATE,
        physicsConfig: maxPhysics,
      };

      expect(() => PersistentStateSchema.parse(stateMin)).not.toThrow();
      expect(() => PersistentStateSchema.parse(stateMax)).not.toThrow();
    });

    it('TC-2.13: rejects out-of-boundary physics configurations', () => {
      const invalidPhysicsConfigs = [
        { gravity: -0.1, repulsion: 50, linkDistance: 20, damping: 0.5, isPaused: false },
        { gravity: 1.5, repulsion: 50, linkDistance: 20, damping: 0.5, isPaused: false },
        { gravity: 0.5, repulsion: 20, linkDistance: 20, damping: 0.5, isPaused: false },   // repulsion < 50
        { gravity: 0.5, repulsion: 2500, linkDistance: 20, damping: 0.5, isPaused: false }, // repulsion > 1500
        { gravity: 0.5, repulsion: 300, linkDistance: 10, damping: 0.5, isPaused: false },   // linkDistance < 20
        { gravity: 0.5, repulsion: 300, linkDistance: 500, damping: 0.5, isPaused: false },  // linkDistance > 400
        { gravity: 0.5, repulsion: 300, linkDistance: 100, damping: 0.05, isPaused: false }, // damping < 0.1
        { gravity: 0.5, repulsion: 300, linkDistance: 100, damping: 1.0, isPaused: false },  // damping > 0.99
      ];

      for (const invalidCfg of invalidPhysicsConfigs) {
        const testState = {
          ...DEFAULT_STATE,
          physicsConfig: invalidCfg,
        };
        const parseResult = PersistentStateSchema.safeParse(testState);
        expect(parseResult.success, `Config should fail: ${JSON.stringify(invalidCfg)}`).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. CORRUPTED LOCALSTORAGE RECOVERY & RESILIENCE
  // --------------------------------------------------------------------------
  describe('6. Corrupted LocalStorage Recovery & Safe Fallbacks', () => {
    it('TC-2.14: falls back to DEFAULT_STATE on null, undefined, or empty payload', () => {
      expect(hydrateState(null)).toEqual(DEFAULT_STATE);
      expect(hydrateState(undefined)).toEqual(DEFAULT_STATE);
      expect(hydrateState('')).toEqual(DEFAULT_STATE);
      expect(hydrateState('   ')).toEqual(DEFAULT_STATE);
    });

    it('TC-2.15: falls back to DEFAULT_STATE on malformed JSON strings', () => {
      const malformedPayloads = [
        '{',
        '{"version": 1, "selectedGameId":',
        'undefined',
        '<state>bad xml</state>',
        'NaN',
        '{"version": 1, "unclosed: [}',
      ];

      for (const badPayload of malformedPayloads) {
        const recovered = hydrateState(badPayload);
        expect(recovered).toEqual(DEFAULT_STATE);
      }
    });

    it('TC-2.16: falls back to DEFAULT_STATE on invalid schema or corrupted field types', () => {
      const corruptedObjects = [
        { version: 2, selectedGameId: 'sky_fc' }, // unsupported version
        { version: 1, selectedGameId: 'mario_kart' }, // nonexistent game
        { version: 1, activeView: '3d_matrix' }, // nonexistent view
        { version: 1, language: 'fr' }, // unsupported language
        { version: 1, unmaskedSpoilerIds: 'not_an_array' }, // bad type
      ];

      for (const obj of corruptedObjects) {
        const json = JSON.stringify(obj);
        const recovered = hydrateState(json);
        expect(recovered).toEqual(DEFAULT_STATE);
      }
    });

    it('TC-2.17: roundtrips valid custom state through serialization and hydration without data loss', () => {
      const customState: PersistentState = {
        version: 1,
        selectedGameId: 'cs4',
        activeView: 'pathfinder',
        selectedCharId: 'crow',
        highContrastMode: true,
        language: 'ja',
        unmaskedSpoilerIds: ['crow_awakener', 'george_copper'],
        physicsConfig: {
          gravity: 0.8,
          repulsion: 650,
          linkDistance: 140,
          damping: 0.85,
          isPaused: true,
        },
      };

      const serialized = serializeState(customState);
      const hydrated = hydrateState(serialized);

      expect(hydrated).toEqual(customState);
    });
  });

  // --------------------------------------------------------------------------
  // 7. RAPID SEQUENTIAL GAME SELECTION (Concurrency Simulation)
  // --------------------------------------------------------------------------
  describe('7. Rapid Sequential Game Selection & State Transitions', () => {
    it('TC-2.18: deterministically applies the final selected game after rapid sequence', () => {
      let currentState: PersistentState = { ...DEFAULT_STATE };

      // Simulate a user rapidly clicking 10 different game pills in quick succession
      const clickSequence: PersistentState['selectedGameId'][] = [
        'sky_fc',
        'cs1',
        'zero',
        'azure',
        'sky_sc',
        'cs3',
        'reverie',
        'daybreak1',
        'sky_3rd',
        'daybreak2',
      ];

      for (const gameId of clickSequence) {
        currentState = {
          ...currentState,
          selectedGameId: gameId,
        };
      }

      // The final state must strictly match the last clicked game
      expect(currentState.selectedGameId).toBe('daybreak2');

      // The visible character count must reflect the final game
      const visibleCount = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, currentState.selectedGameId)
      ).length;

      expect(visibleCount).toBe(CANONICAL_CHARACTERS.length);
    });
  });
});
