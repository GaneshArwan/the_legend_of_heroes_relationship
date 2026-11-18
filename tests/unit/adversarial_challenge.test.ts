import { describe, it, expect } from 'vitest';
import {
  GameArcSchema,
  FactionSchema,
  CharacterSchema,
  RelationshipSchema,
  GameIdSchema,
  FactionArcSchema,
  RelationshipTypeSchema,
  type GameArc,
  type Faction,
  type Character,
  type Relationship,
} from '../../src/schemas';
import {
  games,
  factions,
  characters,
  characterMap,
  relationships,
  relationshipMap,
} from '../../src/data';

describe('Adversarial Stress Testing & Referential Integrity (Milestone 1)', () => {
  // ==========================================================================
  // SECTION 1: ADVERSARIAL STRESS TESTS AGAINST ZOD SCHEMAS
  // ==========================================================================

  describe('1. GameIdSchema Adversarial Validation', () => {
    it('should reject empty strings, whitespace, and null/undefined', () => {
      expect(GameIdSchema.safeParse('').success).toBe(false);
      expect(GameIdSchema.safeParse('   ').success).toBe(false);
      expect(GameIdSchema.safeParse(null).success).toBe(false);
      expect(GameIdSchema.safeParse(undefined).success).toBe(false);
    });

    it('should reject malformed or invalid game IDs', () => {
      const invalidIds = [
        'sky_4th',
        'zero2',
        'cs5',
        'daybreak3',
        'ys8',
        'cold_steel_1',
        'trails_sky',
        'SKY_FC',
        'Cs1',
        'zero_no_kiseki',
        '123',
        'true',
        '__proto__',
        '<script>alert(1)</script>',
      ];
      for (const id of invalidIds) {
        const res = GameIdSchema.safeParse(id);
        expect(res.success, `Expected GameIdSchema to reject "${id}"`).toBe(false);
      }
    });

    it('should reject non-string types', () => {
      expect(GameIdSchema.safeParse(12).success).toBe(false);
      expect(GameIdSchema.safeParse(true).success).toBe(false);
      expect(GameIdSchema.safeParse({}).success).toBe(false);
      expect(GameIdSchema.safeParse([]).success).toBe(false);
    });
  });

  describe('1.2 GameArcSchema Adversarial Boundaries & Payload Corruption', () => {
    const validGame = games[0];

    it('should reject boundary index values (-1, 12, 11.5, NaN, Infinity)', () => {
      expect(GameArcSchema.safeParse({ ...validGame, index: -1 }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: 12 }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: -100 }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: 11.5 }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: NaN }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: Infinity }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: null }).success).toBe(false);
      expect(GameArcSchema.safeParse({ ...validGame, index: undefined }).success).toBe(false);
    });

    it('should accept valid boundary indices 0, 5, 11', () => {
      expect(GameArcSchema.safeParse({ ...validGame, index: 0 }).success).toBe(true);
      expect(GameArcSchema.safeParse({ ...validGame, index: 5 }).success).toBe(true);
      expect(GameArcSchema.safeParse({ ...validGame, index: 11 }).success).toBe(true);
    });

    it('should reject empty strings on all required string fields', () => {
      const stringFields = ['nameEn', 'nameJa', 'year', 'region', 'orbmentSystem'] as const;
      for (const field of stringFields) {
        const res = GameArcSchema.safeParse({ ...validGame, [field]: '' });
        expect(res.success, `Expected GameArcSchema to reject empty ${field}`).toBe(false);
      }
    });

    it('should reject missing required fields', () => {
      const requiredFields = [
        'id',
        'index',
        'nameEn',
        'nameJa',
        'year',
        'region',
        'orbmentSystem',
        'activeFactions',
        'chapterConflicts',
      ];
      for (const field of requiredFields) {
        const copy: Record<string, unknown> = { ...validGame };
        delete copy[field];
        const res = GameArcSchema.safeParse(copy);
        expect(res.success, `Expected GameArcSchema to reject missing ${field}`).toBe(false);
      }
    });

    it('should reject invalid chapter conflicts (empty chapter, title, summary, or missing fields)', () => {
      const invalidConflicts = [
        { chapter: '', title: 'Title', summary: 'Summary' },
        { chapter: 'Ch1', title: '', summary: 'Summary' },
        { chapter: 'Ch1', title: 'Title', summary: '' },
        { chapter: 'Ch1', title: 'Title' }, // missing summary
        {},
      ];
      for (const badConflict of invalidConflicts) {
        const res = GameArcSchema.safeParse({
          ...validGame,
          chapterConflicts: [badConflict as unknown as GameArc['chapterConflicts'][0]],
        });
        expect(res.success, `Expected GameArcSchema to reject conflict ${JSON.stringify(badConflict)}`).toBe(false);
      }
    });

    it('should reject empty strings inside activeFactions array', () => {
      const res = GameArcSchema.safeParse({
        ...validGame,
        activeFactions: ['bracer_guild', ''],
      });
      expect(res.success).toBe(false);
    });

    it('should reject extra unexpected fields when evaluated strictly', () => {
      const strictGameSchema = GameArcSchema.strict();
      const res = strictGameSchema.safeParse({
        ...validGame,
        unexpectedField: 'adversarial_injection',
      });
      expect(res.success).toBe(false);
    });

    it('should strip extra unexpected fields during normal safeParse', () => {
      const res = GameArcSchema.safeParse({
        ...validGame,
        extraPollution: 'should_be_stripped',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect('extraPollution' in res.data).toBe(false);
      }
    });

    it('adversarial probe: empty activeFactions and empty chapterConflicts are rejected by hardened schema', () => {
      const emptyFactions = GameArcSchema.safeParse({ ...validGame, activeFactions: [] });
      expect(emptyFactions.success).toBe(false);

      const emptyConflicts = GameArcSchema.safeParse({ ...validGame, chapterConflicts: [] });
      expect(emptyConflicts.success).toBe(false);

      // And production dataset must have non-empty activeFactions and chapterConflicts
      for (const g of games) {
        expect(g.activeFactions.length).toBeGreaterThanOrEqual(1);
        expect(g.chapterConflicts.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('1.3 FactionSchema Adversarial Boundaries & Injections', () => {
    const validFaction = factions[0];

    it('should reject invalid arc values outside FactionArcSchema', () => {
      const invalidArcs = ['all', 'crossbell_calvard', 'zemuria', 'other', '', null, 123];
      for (const arc of invalidArcs) {
        const res = FactionSchema.safeParse({ ...validFaction, arc });
        expect(res.success, `Expected FactionSchema to reject arc ${arc}`).toBe(false);
      }
    });

    it('should accept all valid canonical arcs in FactionArcSchema', () => {
      const validArcs = ['liberl', 'crossbell', 'erebonia', 'reverie', 'calvard', 'pan_zemuria'];
      for (const arc of validArcs) {
        const res = FactionArcSchema.safeParse(arc);
        expect(res.success).toBe(true);
      }
    });

    it('should reject empty string on all required faction fields', () => {
      const requiredFields = ['id', 'nameEn', 'nameJa', 'color', 'descriptionEn', 'descriptionJa'] as const;
      for (const field of requiredFields) {
        const res = FactionSchema.safeParse({ ...validFaction, [field]: '' });
        expect(res.success, `Expected rejection of empty ${field}`).toBe(false);
      }
    });

    it('should reject empty strings inside hierarchyRanks array', () => {
      const res = FactionSchema.safeParse({
        ...validFaction,
        hierarchyRanks: ['Commander', ''],
      });
      expect(res.success).toBe(false);
    });

    it('should reject extra fields under strict evaluation', () => {
      const strictSchema = FactionSchema.strict();
      const res = strictSchema.safeParse({
        ...validFaction,
        maliciousKey: 'payload',
      });
      expect(res.success).toBe(false);
    });

    it('empirical probe: verify color hex format across all 46 factions in production', () => {
      for (const f of factions) {
        expect(f.color).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      }
    });
  });

  describe('1.4 CharacterSchema Adversarial Stress Testing', () => {
    const validChar = characters[0];

    it('should reject empty strings on required character fields', () => {
      const stringFields = [
        'id',
        'nameEn',
        'nameJa',
        'titleEn',
        'titleJa',
        'factionId',
        'seiyuu',
        'bioEn',
        'bioJa',
        'initials',
      ] as const;

      for (const field of stringFields) {
        const res = CharacterSchema.safeParse({ ...validChar, [field]: '' });
        expect(res.success, `Expected rejection of empty string for ${field}`).toBe(false);
      }
    });

    it('should reject invalid initials lengths (empty or > 5 chars)', () => {
      expect(CharacterSchema.safeParse({ ...validChar, initials: '' }).success).toBe(false);
      expect(CharacterSchema.safeParse({ ...validChar, initials: 'A' }).success).toBe(true);
      expect(CharacterSchema.safeParse({ ...validChar, initials: 'AB' }).success).toBe(true);
      expect(CharacterSchema.safeParse({ ...validChar, initials: 'ABCDE' }).success).toBe(true);
      expect(CharacterSchema.safeParse({ ...validChar, initials: 'ABCDEF' }).success).toBe(false);
    });

    it('should reject empty strings inside weapons array', () => {
      const resEmptyString = CharacterSchema.safeParse({
        ...validChar,
        weapons: ['Bo Staff', ''],
      });
      expect(resEmptyString.success).toBe(false);
    });

    it('adversarial probe: schema rejects weapons: [] (mutation gap closed)', () => {
      // In src/schemas/character.schema.ts:
      // weapons: z.array(z.string().min(1)).min(1)
      const resEmptyArray = CharacterSchema.safeParse({
        ...validChar,
        weapons: [],
      });
      // The schema now strictly rejects weapons: []
      expect(resEmptyArray.success).toBe(false);

      // And production data is 100% compliant: every character has >= 1 weapon
      for (const char of characters) {
        expect(char.weapons.length, `Character ${char.id} has empty weapons`).toBeGreaterThan(0);
      }
    });

    it('should reject invalid variants structure', () => {
      // Invalid GameId key
      const resBadKey = CharacterSchema.safeParse({
        ...validChar,
        variants: {
          invalid_game_id: { titleEn: 'Test' },
        },
      });
      expect(resBadKey.success).toBe(false);

      // Invalid variant inner field types
      const resBadField = CharacterSchema.safeParse({
        ...validChar,
        variants: {
          sky_fc: { portraitUrl: 12345 as unknown as string },
        },
      });
      expect(resBadField.success).toBe(false);
    });

    it('should reject invalid spoiler notes', () => {
      // Bad minGame
      const resBadGame = CharacterSchema.safeParse({
        ...validChar,
        spoilerNotes: [{ minGame: 'bad_game' as unknown as 'sky_fc', note: 'Valid note' }],
      });
      expect(resBadGame.success).toBe(false);

      // Empty note
      const resEmptyNote = CharacterSchema.safeParse({
        ...validChar,
        spoilerNotes: [{ minGame: 'cs1', note: '' }],
      });
      expect(resEmptyNote.success).toBe(false);
    });

    it('should reject extra fields under strict evaluation and strip them under normal safeParse', () => {
      const strictCharSchema = CharacterSchema.strict();
      const resStrict = strictCharSchema.safeParse({
        ...validChar,
        secretHackerField: 42,
      });
      expect(resStrict.success).toBe(false);

      const resNormal = CharacterSchema.safeParse({
        ...validChar,
        secretHackerField: 42,
      });
      expect(resNormal.success).toBe(true);
      if (resNormal.success) {
        expect('secretHackerField' in resNormal.data).toBe(false);
      }
    });
  });

  describe('1.5 RelationshipSchema Adversarial Testing', () => {
    const validRel = relationships[0];

    it('should reject invalid relationship types outside the 5 canonical types', () => {
      const invalidTypes = ['enemy', 'lover', 'friend', 'ally', 'nemesis', '', null, 123];
      for (const t of invalidTypes) {
        const res = RelationshipSchema.safeParse({ ...validRel, type: t });
        expect(res.success, `Expected rejection for type ${t}`).toBe(false);
      }
    });

    it('should accept all 5 canonical relationship types in RelationshipTypeSchema', () => {
      const types = ['mentor', 'comrade', 'family', 'rival', 'secret'];
      for (const t of types) {
        expect(RelationshipTypeSchema.safeParse(t).success).toBe(true);
      }
    });

    it('should reject empty strings on all required relationship fields', () => {
      const stringFields = ['id', 'source', 'target', 'labelEn', 'labelJa', 'descEn', 'descJa'] as const;
      for (const field of stringFields) {
        const res = RelationshipSchema.safeParse({ ...validRel, [field]: '' });
        expect(res.success, `Expected rejection for empty ${field}`).toBe(false);
      }
    });

    it('should reject invalid debutGame and spoilerDebutGame', () => {
      expect(RelationshipSchema.safeParse({ ...validRel, debutGame: 'sky_4th' }).success).toBe(false);
      expect(RelationshipSchema.safeParse({ ...validRel, spoilerDebutGame: 'invalid_game' }).success).toBe(false);
    });

    it('should reject non-boolean isSecret values', () => {
      expect(RelationshipSchema.safeParse({ ...validRel, isSecret: 'true' as unknown as boolean }).success).toBe(false);
      expect(RelationshipSchema.safeParse({ ...validRel, isSecret: 1 as unknown as boolean }).success).toBe(false);
    });

    it('adversarial check: raw RelationshipSchema rejects self-loops (source === target)', () => {
      const selfLoopRel = { ...validRel, source: 'rean', target: 'rean' };
      const res = RelationshipSchema.safeParse(selfLoopRel);
      expect(res.success).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 2: EMPIRICAL REFERENTIAL INTEGRITY ACROSS DATASETS
  // ==========================================================================

  describe('2. Comprehensive Referential Graph Integrity', () => {
    it('verifies dataset counts satisfy or exceed milestone minimums', () => {
      // Characters: 360 (exceeding 106+ requirement)
      expect(characters.length).toBe(360);
      expect(characterMap.size).toBe(360);

      // Factions: 66 (exceeding 42 planned factions, enriched with dedicated Bracer, Jaeger & Regional branches)
      expect(factions.length).toBe(66);
      const factionIdSet = new Set(factions.map((f) => f.id));
      expect(factionIdSet.size).toBe(66);

      // Relationships: 404 (exceeding 75 planned relationships)
      expect(relationships.length).toBe(404);
      expect(relationshipMap.size).toBe(404);

      // Games: exactly 12 mainline titles
      expect(games.length).toBe(12);
    });

    it('every character factionId strictly exists in factions dataset', () => {
      const factionIdSet = new Set(factions.map((f) => f.id));
      for (const char of characters) {
        expect(
          factionIdSet.has(char.factionId),
          `Character "${char.id}" has dangling factionId: "${char.factionId}"`
        ).toBe(true);
      }
    });

    it('every game activeFaction strictly exists in factions dataset', () => {
      const factionIdSet = new Set(factions.map((f) => f.id));
      for (const game of games) {
        for (const factionId of game.activeFactions) {
          expect(
            factionIdSet.has(factionId),
            `Game "${game.id}" references non-existent activeFaction: "${factionId}"`
          ).toBe(true);
        }
      }
    });

    it('every relationship source and target strictly exists in characters dataset (zero dangling edges)', () => {
      const charIdSet = new Set(characters.map((c) => c.id));
      for (const rel of relationships) {
        expect(
          charIdSet.has(rel.source),
          `Relationship "${rel.id}" has dangling source: "${rel.source}"`
        ).toBe(true);
        expect(
          charIdSet.has(rel.target),
          `Relationship "${rel.id}" has dangling target: "${rel.target}"`
        ).toBe(true);
      }
    });

    it('no self-loops exist in relationships dataset (rel.source !== rel.target)', () => {
      for (const rel of relationships) {
        expect(
          rel.source !== rel.target,
          `Self-loop detected on relationship ID "${rel.id}" (source === target: "${rel.source}")`
        ).toBe(true);
      }
    });

    it('no duplicate relationship IDs exist', () => {
      const seen = new Set<string>();
      for (const rel of relationships) {
        expect(seen.has(rel.id), `Duplicate relationship ID: "${rel.id}"`).toBe(false);
        seen.add(rel.id);
      }
    });

    it('empirical character initials audit across all 200 characters', () => {
      for (const char of characters) {
        expect(char.initials.length).toBeGreaterThanOrEqual(2);
        expect(char.initials.length).toBeLessThanOrEqual(5);
        expect(char.initials).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it('faction population distribution analysis', () => {
      const factionCount = new Map<string, number>();
      for (const f of factions) {
        factionCount.set(f.id, 0);
      }
      for (const c of characters) {
        const count = factionCount.get(c.factionId) ?? 0;
        factionCount.set(c.factionId, count + 1);
      }

      const populatedFactions: string[] = [];
      const unpopulatedFactions: string[] = [];
      for (const [factionId, count] of factionCount.entries()) {
        if (count > 0) {
          populatedFactions.push(factionId);
        } else {
          unpopulatedFactions.push(factionId);
        }
      }

      console.log(`[FACTION AUDIT] Populated factions: ${populatedFactions.length} / ${factions.length}`);
      console.log(`[FACTION AUDIT] Unpopulated (world/institutional lore) factions: ${unpopulatedFactions.length} / ${factions.length}`);
      console.log(`[FACTION AUDIT] Unpopulated factions list: ${unpopulatedFactions.join(', ')}`);

      expect(populatedFactions.length).toBeGreaterThanOrEqual(25);
    });

    it('graph topology analysis: isolates, connected components, and degree distribution', () => {
      const adjacency = new Map<string, Set<string>>();
      for (const char of characters) {
        adjacency.set(char.id, new Set());
      }

      for (const rel of relationships) {
        adjacency.get(rel.source)?.add(rel.target);
        adjacency.get(rel.target)?.add(rel.source);
      }

      const isolatedChars: string[] = [];
      const connectedChars: string[] = [];

      for (const [charId, neighbors] of adjacency.entries()) {
        if (neighbors.size === 0) {
          isolatedChars.push(charId);
        } else {
          connectedChars.push(charId);
        }
      }

      console.log(`[GRAPH INTEGRITY] Total characters: ${characters.length}`);
      console.log(`[GRAPH INTEGRITY] Connected characters: ${connectedChars.length}`);
      console.log(`[GRAPH INTEGRITY] Isolated characters (degree 0): ${isolatedChars.length}`);
      console.log(`[GRAPH INTEGRITY] Isolated character list: ${isolatedChars.join(', ')}`);
      console.log(`[GRAPH INTEGRITY] Total relationships: ${relationships.length}`);

      // 360 connected characters and 0 isolated characters
      expect(connectedChars.length).toBe(360);
      expect(isolatedChars.length).toBe(0);
      expect(connectedChars.length + isolatedChars.length).toBe(360);

      // Verify that major hub protagonists have high degrees
      expect(adjacency.get('rean')?.size).toBeGreaterThanOrEqual(10);
      expect(adjacency.get('estelle')?.size).toBeGreaterThanOrEqual(5);
      expect(adjacency.get('lloyd')?.size).toBeGreaterThanOrEqual(5);
      expect(adjacency.get('van')?.size).toBeGreaterThanOrEqual(3);
    });

    it('detects cycles in undirected relationship graph', () => {
      // Build adjacency
      const adj = new Map<string, Set<string>>();
      for (const char of characters) {
        adj.set(char.id, new Set());
      }
      for (const rel of relationships) {
        adj.get(rel.source)?.add(rel.target);
        adj.get(rel.target)?.add(rel.source);
      }

      // Check for cycles using DFS across connected components
      let cycleCount = 0;
      const visited = new Set<string>();

      function hasCycle(node: string, parent: string | null): boolean {
        visited.add(node);
        const neighbors = adj.get(node) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor, node)) return true;
          } else if (neighbor !== parent) {
            return true;
          }
        }
        return false;
      }

      for (const char of characters) {
        if (!visited.has(char.id)) {
          if (hasCycle(char.id, null)) {
            cycleCount++;
          }
        }
      }

      console.log(`[GRAPH INTEGRITY] Connected components with cycles: ${cycleCount}`);
      // In a social / relationship graph, triads/cycles (e.g. Estelle-Joshua-Cassius, Class VII bonding) are normal and expected
      expect(cycleCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 3: EMPIRICAL ZOD PARSE PERFORMANCE & BENCHMARK
  // ==========================================================================

  describe('3. Empirical Zod Parse Performance Benchmark', () => {
    it('measures single-pass parse time across the entire canonical dataset', () => {
      const startTime = performance.now();

      // Parse all 12 games
      for (const game of games) {
        const res = GameArcSchema.safeParse(game);
        expect(res.success).toBe(true);
      }

      // Parse all 46 factions
      for (const faction of factions) {
        const res = FactionSchema.safeParse(faction);
        expect(res.success).toBe(true);
      }

      // Parse all 114 characters
      for (const char of characters) {
        const res = CharacterSchema.safeParse(char);
        expect(res.success).toBe(true);
      }

      // Parse all 92 relationships
      for (const rel of relationships) {
        const res = RelationshipSchema.safeParse(rel);
        expect(res.success).toBe(true);
      }

      const totalTimeMs = performance.now() - startTime;
      const totalRecords = games.length + factions.length + characters.length + relationships.length;

      console.log(`[PERFORMANCE] Single-pass parse time for all ${totalRecords} records: ${totalTimeMs.toFixed(3)} ms`);
      console.log(`[PERFORMANCE] Average parse latency per record: ${(totalTimeMs / totalRecords).toFixed(4)} ms`);

      // Single-pass parse across entire dataset should complete in < 50ms (well under any bottleneck)
      expect(totalTimeMs).toBeLessThan(50);
    });

    it('measures throughput across 1,000 iterations to stress-test memory and CPU bottleneck', () => {
      const iterations = 1000;
      const startTime = performance.now();

      let successCount = 0;
      for (let i = 0; i < iterations; i++) {
        // Sample characters parse
        const char = characters[i % characters.length];
        if (CharacterSchema.safeParse(char).success) {
          successCount++;
        }
      }

      const elapsedMs = performance.now() - startTime;
      const opsPerSec = (iterations / (elapsedMs / 1000)).toFixed(0);

      console.log(`[PERFORMANCE] 1,000 character parses: ${elapsedMs.toFixed(2)} ms (${opsPerSec} ops/sec)`);

      expect(successCount).toBe(iterations);
      expect(elapsedMs).toBeLessThan(500); // 1,000 validations in < 500ms
    });
  });
});
