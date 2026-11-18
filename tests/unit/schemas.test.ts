import { describe, it, expect } from 'vitest';
import {
  GameArcSchema,
  FactionSchema,
  CharacterSchema,
  RelationshipSchema,
  GameIdSchema,
} from '../../src/schemas';
import {
  games,
  factions,
  characters,
  characterMap,
  relationships,
  relationshipMap,
} from '../../src/data';

describe('Milestone 1 Domain Schemas & Referential Integrity', () => {
  describe('GameArcSchema & Games Dataset', () => {
    it('should contain all 12 canonical mainline games', () => {
      expect(games.length).toBe(12);
      const expectedIds = [
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
      expect(games.map((g) => g.id)).toEqual(expectedIds);
    });

    it('should validate every game against GameArcSchema with zero errors', () => {
      for (const game of games) {
        const result = GameArcSchema.safeParse(game);
        expect(result.success, `Game ${game.id} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    });

    it('should have strictly ascending indices from 0 to 11', () => {
      games.forEach((game, index) => {
        expect(game.index).toBe(index);
      });
    });

    it('should ensure all games have valid chapter conflicts and active factions', () => {
      for (const game of games) {
        expect(game.chapterConflicts.length).toBeGreaterThan(0);
        expect(game.activeFactions.length).toBeGreaterThan(0);
        for (const conflict of game.chapterConflicts) {
          expect(conflict.chapter.length).toBeGreaterThan(0);
          expect(conflict.title.length).toBeGreaterThan(0);
          expect(conflict.summary.length).toBeGreaterThan(0);
        }
      }
    });

    it('should reject invalid game objects', () => {
      const invalidGame = {
        id: 'invalid_game_id',
        index: 15,
        nameEn: '',
        nameJa: '',
        year: '',
        region: '',
        orbmentSystem: '',
        activeFactions: [],
        chapterConflicts: [],
      };
      const result = GameArcSchema.safeParse(invalidGame);
      expect(result.success).toBe(false);
    });

    it('should reject game arcs with empty activeFactions or empty chapterConflicts', () => {
      const emptyActiveFactions = { ...games[0], activeFactions: [] };
      expect(GameArcSchema.safeParse(emptyActiveFactions).success).toBe(false);

      const emptyChapterConflicts = { ...games[0], chapterConflicts: [] };
      expect(GameArcSchema.safeParse(emptyChapterConflicts).success).toBe(false);
    });
  });

  describe('FactionSchema & Factions Dataset', () => {
    it('should validate every faction against FactionSchema with zero errors', () => {
      expect(factions.length).toBeGreaterThanOrEqual(30);
      for (const faction of factions) {
        const result = FactionSchema.safeParse(faction);
        expect(result.success, `Faction ${faction.id} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    });

    it('should have strictly unique faction IDs', () => {
      const seen = new Set<string>();
      for (const faction of factions) {
        expect(seen.has(faction.id), `Duplicate faction ID found: ${faction.id}`).toBe(false);
        seen.add(faction.id);
      }
    });

    it('should reject invalid faction objects', () => {
      const invalidFaction = {
        id: '',
        nameEn: '',
        nameJa: '',
        arc: 'invalid_arc',
        color: '',
        descriptionEn: '',
        descriptionJa: '',
      };
      const result = FactionSchema.safeParse(invalidFaction);
      expect(result.success).toBe(false);
    });
  });

  describe('CharacterSchema & 106+ Character Dataset', () => {
    it('should satisfy the 106+ character requirement', () => {
      expect(characters.length).toBeGreaterThanOrEqual(106);
    });

    it('should validate every character against CharacterSchema with zero errors', () => {
      for (const char of characters) {
        const result = CharacterSchema.safeParse(char);
        expect(result.success, `Character ${char.id} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    });

    it('should have unique character IDs', () => {
      const ids = characters.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(characters.length);
      expect(characterMap.size).toBe(characters.length);
    });

    it('should verify all characters have dual EN/JA metadata, weapons, and seiyuu', () => {
      for (const char of characters) {
        expect(char.nameEn.length).toBeGreaterThan(0);
        expect(char.nameJa.length).toBeGreaterThan(0);
        expect(char.titleEn.length).toBeGreaterThan(0);
        expect(char.titleJa.length).toBeGreaterThan(0);
        expect(char.bioEn.length).toBeGreaterThan(0);
        expect(char.bioJa.length).toBeGreaterThan(0);
        expect(char.weapons.length).toBeGreaterThan(0);
        expect(char.seiyuu.length).toBeGreaterThan(0);
        expect(char.initials.length).toBeGreaterThan(0);
        expect(char.initials.length).toBeLessThanOrEqual(5);

        // Verify debutGame is valid GameId
        const debutValidation = GameIdSchema.safeParse(char.debutGame);
        expect(debutValidation.success).toBe(true);
      }
    });

    it('should reject invalid character objects', () => {
      const invalidChar = {
        id: '',
        nameEn: '',
        nameJa: '',
        titleEn: '',
        titleJa: '',
        factionId: '',
        debutGame: 'non_existent_game',
        weapons: [],
        seiyuu: '',
        bioEn: '',
        bioJa: '',
        initials: '',
      };
      const result = CharacterSchema.safeParse(invalidChar);
      expect(result.success).toBe(false);
    });
  });

  describe('RelationshipSchema & Relationships Dataset', () => {
    it('should contain a rich relationship graph', () => {
      expect(relationships.length).toBeGreaterThanOrEqual(60);
      expect(relationshipMap.size).toBe(relationships.length);
    });

    it('should validate every relationship against RelationshipSchema with zero errors', () => {
      for (const rel of relationships) {
        const result = RelationshipSchema.safeParse(rel);
        expect(result.success, `Relationship ${rel.id} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    });

    it('should have strictly unique relationship IDs', () => {
      const seen = new Set<string>();
      for (const rel of relationships) {
        expect(seen.has(rel.id), `Duplicate relationship ID found: ${rel.id}`).toBe(false);
        seen.add(rel.id);
      }
    });

    it('should only use the 5 canonical relationship types', () => {
      const validTypes = new Set(['mentor', 'comrade', 'family', 'rival', 'secret']);
      for (const rel of relationships) {
        expect(validTypes.has(rel.type)).toBe(true);
      }
    });

    it('should reject invalid relationship objects', () => {
      const invalidRel = {
        id: 'rel_test',
        source: 'rean',
        target: 'crow',
        type: 'invalid_type',
        labelEn: '',
        labelJa: '',
        descEn: '',
        descJa: '',
        debutGame: 'cs1',
      };
      const result = RelationshipSchema.safeParse(invalidRel);
      expect(result.success).toBe(false);
    });
  });

  describe('Referential Integrity', () => {
    const factionIdSet = new Set(factions.map((f) => f.id));
    const characterIdSet = new Set(characters.map((c) => c.id));

    it('every character factionId must exist in factions dataset', () => {
      for (const char of characters) {
        expect(
          factionIdSet.has(char.factionId),
          `Character ${char.id} references non-existent factionId: ${char.factionId}`
        ).toBe(true);
      }
    });

    it('every game activeFaction must exist in factions dataset', () => {
      for (const game of games) {
        for (const factionId of game.activeFactions) {
          expect(
            factionIdSet.has(factionId),
            `Game ${game.id} references non-existent activeFaction: ${factionId}`
          ).toBe(true);
        }
      }
    });

    it('every relationship source must exist in characters dataset', () => {
      for (const rel of relationships) {
        expect(
          characterIdSet.has(rel.source),
          `Relationship ${rel.id} has invalid source character ID: ${rel.source}`
        ).toBe(true);
      }
    });

    it('every relationship target must exist in characters dataset', () => {
      for (const rel of relationships) {
        expect(
          characterIdSet.has(rel.target),
          `Relationship ${rel.id} has invalid target character ID: ${rel.target}`
        ).toBe(true);
      }
    });

    it('relationships must not connect a character to themselves', () => {
      for (const rel of relationships) {
        expect(
          rel.source !== rel.target,
          `Self-loop relationship detected on ID: ${rel.id}`
        ).toBe(true);
      }
    });
  });
});
