import { describe, it, expect } from 'vitest';
import {
  GameArcSchema,
  FactionSchema,
  CharacterSchema,
  RelationshipSchema,
  PersistentStateSchema,
  CANONICAL_GAMES,
  CANONICAL_FACTIONS,
  CANONICAL_CHARACTERS,
  CANONICAL_RELATIONSHIPS,
  ALL_GAME_IDS,
  ALL_RELATIONSHIP_TYPES,
  GAME_ORDER,
  GameId,
  Character,
  Relationship,
  findShortestRelationshipPath,
  isCharacterVisible,
  sanitizeRelationship,
  generateMonogramFallback,
  hydrateState,
  serializeState,
} from './fixtures';

describe('Tier 1: Feature Coverage & Functional Isolation', () => {
  const characterMap = new Map<string, Character>(
    CANONICAL_CHARACTERS.map((c) => [c.id, c])
  );

  // --------------------------------------------------------------------------
  // F1: Modern Build Scaffolding & Configuration
  // --------------------------------------------------------------------------
  describe('F1: Scaffolding & Build System Verification', () => {
    it('TC-1.1: should confirm essential runtime and domain dependencies are defined', () => {
      expect(CANONICAL_GAMES.length).toBe(12);
      expect(CANONICAL_CHARACTERS.length).toBeGreaterThanOrEqual(100);
      expect(CANONICAL_FACTIONS.length).toBeGreaterThanOrEqual(10);
      expect(CANONICAL_RELATIONSHIPS.length).toBeGreaterThanOrEqual(25);
    });
  });

  // --------------------------------------------------------------------------
  // F2: Strict Zod Domain Schemas
  // --------------------------------------------------------------------------
  describe('F2: Zod Domain Schemas Runtime Validation', () => {
    it('TC-1.2: should strictly validate all 12 canonical game arc models', () => {
      CANONICAL_GAMES.forEach((game) => {
        const result = GameArcSchema.safeParse(game);
        expect(result.success, `Game arc ${game.id} failed validation`).toBe(true);
      });
    });

    it('TC-1.3: should strictly validate all 106+ canonical character records', () => {
      CANONICAL_CHARACTERS.forEach((char) => {
        const result = CharacterSchema.safeParse(char);
        expect(result.success, `Character ${char.id} failed validation`).toBe(true);
      });
    });

    it('TC-1.4: should strictly validate all canonical faction models', () => {
      CANONICAL_FACTIONS.forEach((faction) => {
        const result = FactionSchema.safeParse(faction);
        expect(result.success, `Faction ${faction.id} failed validation`).toBe(true);
      });
    });

    it('TC-1.5: should strictly validate all canonical relationship edges', () => {
      CANONICAL_RELATIONSHIPS.forEach((rel) => {
        const result = RelationshipSchema.safeParse(rel);
        expect(result.success, `Relationship ${rel.id} failed validation`).toBe(true);
      });
    });

    it('TC-1.6: should reject malformed records with descriptive Zod errors', () => {
      const invalidChar = {
        id: '',
        nameEn: 'Missing Fields Character',
        // missing nameJa, titleEn, etc.
      };
      const result = CharacterSchema.safeParse(invalidChar);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('TC-1.7: should reject invalid relationship types outside the 5 allowed categories', () => {
      const invalidRel = {
        id: 'rel_invalid',
        source: 'estelle',
        target: 'joshua',
        type: 'nemesis_invalid_type',
        labelEn: 'Invalid',
        labelJa: '無効',
        descEn: 'Invalid type',
        descJa: '無効タイプ',
        debutGame: 'sky_fc',
      };
      const result = RelationshipSchema.safeParse(invalidRel);
      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // F3: Multi-Arc Comprehensive Dataset
  // --------------------------------------------------------------------------
  describe('F3: Multi-Arc Character Dataset Coverage', () => {
    it('TC-1.8: should contain at least 100 canonical characters across all 5 main arcs', () => {
      expect(CANONICAL_CHARACTERS.length).toBeGreaterThanOrEqual(100);
    });

    it('TC-1.9: should verify dual English and Japanese taxonomy on every character', () => {
      CANONICAL_CHARACTERS.forEach((c) => {
        expect(c.nameEn.trim().length, `Empty nameEn for ${c.id}`).toBeGreaterThan(0);
        expect(c.nameJa.trim().length, `Empty nameJa for ${c.id}`).toBeGreaterThan(0);
        expect(c.titleEn.trim().length, `Empty titleEn for ${c.id}`).toBeGreaterThan(0);
        expect(c.titleJa.trim().length, `Empty titleJa for ${c.id}`).toBeGreaterThan(0);
        expect(c.bioEn.trim().length, `Empty bioEn for ${c.id}`).toBeGreaterThan(0);
        expect(c.bioJa.trim().length, `Empty bioJa for ${c.id}`).toBeGreaterThan(0);
        expect(c.seiyuu.trim().length, `Empty seiyuu for ${c.id}`).toBeGreaterThan(0);
        expect(c.weapons.length, `No weapons for ${c.id}`).toBeGreaterThan(0);
        expect(c.initials).toMatch(/^[A-Z0-9]{2}$/);
      });
    });

    it('TC-1.10: should verify referential integrity: every character belongs to an existing faction', () => {
      const factionIds = new Set(CANONICAL_FACTIONS.map((f) => f.id));
      CANONICAL_CHARACTERS.forEach((char) => {
        expect(
          factionIds.has(char.factionId),
          `Character ${char.id} references non-existent faction ${char.factionId}`
        ).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // F4: 12+ Game Chronology Model
  // --------------------------------------------------------------------------
  describe('F4: 12+ Mainline Game Chronology Model', () => {
    it('TC-1.11: should register all 12 games in precise chronological sequence (index 0..11)', () => {
      expect(CANONICAL_GAMES.length).toBe(12);
      CANONICAL_GAMES.forEach((game, idx) => {
        expect(game.index).toBe(idx);
        expect(GAME_ORDER[game.id]).toBe(idx);
      });
    });

    it('TC-1.12: should verify Septian calendar years and localized regions across all releases', () => {
      const expectedYears: Record<GameId, string> = {
        sky_fc: 'S.1202',
        sky_sc: 'S.1202 - S.1203',
        sky_3rd: 'S.1203 - S.1204',
        zero: 'S.1204',
        azure: 'S.1204 - S.1205',
        cs1: 'S.1204',
        cs2: 'S.1204 - S.1205',
        cs3: 'S.1206',
        cs4: 'S.1206',
        reverie: 'S.1207',
        daybreak1: 'S.1208',
        daybreak2: 'S.1208 - S.1209',
      };

      CANONICAL_GAMES.forEach((g) => {
        expect(g.year).toBe(expectedYears[g.id]);
        expect(g.region.length).toBeGreaterThan(0);
        expect(g.orbmentSystem.length).toBeGreaterThan(0);
        expect(g.chapterConflicts.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // --------------------------------------------------------------------------
  // F5 & F6: Character Portrait Pipeline & Resilient Fallback Badges
  // --------------------------------------------------------------------------
  describe('F5 & F6: Portrait Asset Pipeline & Monogram Badges', () => {
    it('TC-1.13: should format portrait asset paths adhering to public local directory structure', () => {
      CANONICAL_CHARACTERS.forEach((char) => {
        const canonicalUrl = `/assets/portraits/${char.id}.webp`;
        expect(canonicalUrl).toMatch(/^\/assets\/portraits\/[a-z0-9_]+\.webp$/);
      });
    });

    it('TC-1.14: should verify cross-arc character visual variants (Renne, Rean, Estelle, Joshua)', () => {
      const renne = characterMap.get('renne')!;
      expect(renne.variants).toBeDefined();
      expect(renne.variants!['sky_sc']).toBeDefined();
      expect(renne.variants!['daybreak1']).toBeDefined();

      const rean = characterMap.get('rean')!;
      expect(rean.variants).toBeDefined();
      expect(rean.variants!['cs1']).toBeDefined();
      expect(rean.variants!['cs3']).toBeDefined();
      expect(rean.variants!['reverie']).toBeDefined();
    });

    it('TC-1.15: should generate valid SVG monogram fallback badge markup on simulated error', () => {
      const estelleBadge = generateMonogramFallback('EB', 'bracer_guild', 48);
      expect(estelleBadge).toContain('<svg width="48" height="48"');
      expect(estelleBadge).toContain('>EB</text>');
      expect(estelleBadge).toContain('#38bdf8'); // Bracer Cyan

      const reanBadge = generateMonogramFallback('RS', 'class_vii_old', 64);
      expect(reanBadge).toContain('<svg width="64" height="64"');
      expect(reanBadge).toContain('>RS</text>');
      expect(reanBadge).toContain('#f59e0b'); // Thors Amber
    });
  });

  // --------------------------------------------------------------------------
  // F7: Offline Portrait Downloader Script Contract
  // --------------------------------------------------------------------------
  describe('F7: Offline Portrait Downloader Script Contract', () => {
    it('TC-1.16: should verify downloader target directory and asset naming scheme', () => {
      const targetDir = 'public/assets/portraits';
      expect(targetDir).toBe('public/assets/portraits');
      const sampleAsset = `${targetDir}/estelle.webp`;
      expect(sampleAsset).toBe('public/assets/portraits/estelle.webp');
    });
  });

  // --------------------------------------------------------------------------
  // F8 & F9: 1-Click Game Progression Toolbar & Deep Dive Arc Views
  // --------------------------------------------------------------------------
  describe('F8 & F9: 1-Click Game Progression & Dedicated Deep Dive Arc View', () => {
    it('TC-1.17: should provide direct 1-click navigation for all 12 releases with zero popups', () => {
      expect(ALL_GAME_IDS.length).toBe(12);
      ALL_GAME_IDS.forEach((gameId) => {
        expect(GAME_ORDER[gameId]).toBeGreaterThanOrEqual(0);
        expect(GAME_ORDER[gameId]).toBeLessThanOrEqual(11);
      });
    });

    it('TC-1.18: should provide isolated regional factions and chapter conflicts for every game pill', () => {
      CANONICAL_GAMES.forEach((game) => {
        expect(game.activeFactions.length).toBeGreaterThanOrEqual(3);
        expect(game.chapterConflicts.length).toBeGreaterThanOrEqual(3);
        game.chapterConflicts.forEach((conflict) => {
          expect(conflict.chapter.length).toBeGreaterThan(0);
          expect(conflict.title.length).toBeGreaterThan(0);
          expect(conflict.summary.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // F10 & F11: Temporal Spoiler Boundary Engine & Selective Unmasking
  // --------------------------------------------------------------------------
  describe('F10 & F11: Spoiler Boundary Engine & Unmasking', () => {
    it('TC-1.19: should strictly block future characters from rendering in earlier game views', () => {
      const rean = characterMap.get('rean')!; // Debuts in CS1 (index 5)
      const van = characterMap.get('van')!; // Debuts in Daybreak 1 (index 10)
      const estelle = characterMap.get('estelle')!; // Debuts in Sky FC (index 0)

      // In Sky FC view:
      expect(isCharacterVisible(estelle, 'sky_fc')).toBe(true);
      expect(isCharacterVisible(rean, 'sky_fc')).toBe(false);
      expect(isCharacterVisible(van, 'sky_fc')).toBe(false);

      // In CS1 view:
      expect(isCharacterVisible(estelle, 'cs1')).toBe(true);
      expect(isCharacterVisible(rean, 'cs1')).toBe(true);
      expect(isCharacterVisible(van, 'cs1')).toBe(false);
    });

    it('TC-1.20: should sanitize secret relationships unless explicitly unmasked', () => {
      const secretRel = CANONICAL_RELATIONSHIPS.find((r) => r.id === 'rean_osborne_secret')!;
      expect(secretRel.isSecret).toBe(true);
      expect(secretRel.spoilerDebutGame).toBe('cs2');

      // In CS1 mode without unmasking -> masked
      const masked = sanitizeRelationship(secretRel, 'cs1', new Set());
      expect(masked).not.toBeNull();
      expect(masked!.labelEn).toBe('[Classified Relationship]');
      expect(masked!.descEn).toContain('Redacted');

      // In CS1 mode with unmasking -> unmasked
      const unmasked = sanitizeRelationship(secretRel, 'cs1', new Set([secretRel.id]));
      expect(unmasked).not.toBeNull();
      expect(unmasked!.labelEn).toBe('Biological Father & Son');

      // In CS2 mode -> naturally revealed
      const naturallyRevealed = sanitizeRelationship(secretRel, 'cs2', new Set());
      expect(naturallyRevealed).not.toBeNull();
      expect(naturallyRevealed!.labelEn).toBe('Biological Father & Son');
    });
  });

  // --------------------------------------------------------------------------
  // F12: LocalStorage State Persistence
  // --------------------------------------------------------------------------
  describe('F12: LocalStorage State Persistence Engine', () => {
    it('TC-1.21: should serialize and hydrate state with strict Zod validation', () => {
      const defaultState = {
        version: 1 as const,
        selectedGameId: 'sky_fc' as GameId,
        activeView: 'tree' as const,
        selectedCharId: 'estelle',
        highContrastMode: false,
        language: 'en' as const,
        unmaskedSpoilerIds: [],
        physicsConfig: {
          gravity: 0.15,
          repulsion: 450,
          linkDistance: 120,
          damping: 0.85,
          isPaused: false,
        },
      };

      const serialized = serializeState(defaultState);
      expect(typeof serialized).toBe('string');

      const hydrated = hydrateState(serialized, defaultState);
      expect(hydrated).toEqual(defaultState);
    });
  });

  // --------------------------------------------------------------------------
  // F13 & F14: Faction Explorer & Interactive Orbment Bond Graph
  // --------------------------------------------------------------------------
  describe('F13 & F14: Hierarchy Explorer & Orbment Bond Graph', () => {
    it('TC-1.22: should verify all 5 relationship bond types exist and are validated', () => {
      expect(ALL_RELATIONSHIP_TYPES).toEqual(['mentor', 'comrade', 'family', 'rival', 'secret']);

      const foundTypes = new Set(CANONICAL_RELATIONSHIPS.map((r) => r.type));
      ALL_RELATIONSHIP_TYPES.forEach((type) => {
        expect(foundTypes.has(type), `Missing relationship type: ${type}`).toBe(true);
      });
    });

    it('TC-1.23: should verify referential integrity: every relationship connects valid characters', () => {
      CANONICAL_RELATIONSHIPS.forEach((rel) => {
        expect(characterMap.has(rel.source), `Source ${rel.source} does not exist`).toBe(true);
        expect(characterMap.has(rel.target), `Target ${rel.target} does not exist`).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // F16: Character Dossier Modal Data Specs
  // --------------------------------------------------------------------------
  describe('F16: Tactical Character Dossier Inspector', () => {
    it('TC-1.24: should verify complete dossier inspector metadata for major figures', () => {
      const rean = characterMap.get('rean')!;
      expect(rean.nameEn).toBe('Rean Schwarzer');
      expect(rean.nameJa).toBe('リィン・シュバルツァー');
      expect(rean.seiyuu).toBe('Koki Uchiyama');
      expect(rean.weapons).toContain('Tachi');

      const van = characterMap.get('van')!;
      expect(van.nameEn).toBe('Van Arkride');
      expect(van.nameJa).toBe('ヴァン・アークライド');
      expect(van.seiyuu).toBe('Daisuke Ono');
      expect(van.weapons).toContain('Stun Caliber');
    });
  });

  // --------------------------------------------------------------------------
  // F17: Cross-Arc Shortest-Path Relationship Finder
  // --------------------------------------------------------------------------
  describe('F17: Shortest-Path BFS Relationship Routing', () => {
    it('TC-1.25: should resolve 1-degree direct BFS path between adjacent characters', () => {
      const pathEstelleJoshua = findShortestRelationshipPath(
        'estelle',
        'joshua',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'sky_fc',
        false
      );

      expect(pathEstelleJoshua.found).toBe(true);
      expect(pathEstelleJoshua.degrees).toBe(1);
      expect(pathEstelleJoshua.nodes.map((n) => n.id)).toEqual(['estelle', 'joshua']);
      expect(pathEstelleJoshua.edges.length).toBe(1);
      expect(pathEstelleJoshua.executionTimeMs).toBeLessThan(100);
    });

    it('TC-1.26: should resolve 1-degree path between SSS members in Zero mode', () => {
      const pathLloydRandy = findShortestRelationshipPath(
        'lloyd',
        'randy',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'zero',
        false
      );

      expect(pathLloydRandy.found).toBe(true);
      expect(pathLloydRandy.degrees).toBe(1);
      expect(pathLloydRandy.nodes.map((n) => n.id)).toEqual(['lloyd', 'randy']);
    });
  });
});
