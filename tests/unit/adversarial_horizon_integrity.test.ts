import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
import { generateMonogramFallback as avatarMonogramFallback } from '../../src/components/common/CharacterAvatar';
import { generateMonogramFallback as storageMonogramFallback } from '../../src/services/storage';
import { GameId, Character, Relationship } from '../../src/types';

// Helper for deep freezing objects
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe('Empirical Challenger M2-2: Horizon Integrity, Classified Relationships & Asset Resilience', () => {
  // ==========================================================================
  // 1. TEMPORAL SPOILER HORIZON AUDIT IN SKY FC
  // ==========================================================================
  describe('1. Temporal Spoiler Horizon Audit (Sky FC Zero-Leak Guarantee)', () => {
    it('1.1 should audit visibility of non-Liberl characters under Sky FC horizon', () => {
      const nonLiberlGroups = [
        { name: 'Crossbell', list: crossbellCharacters },
        { name: 'Erebonia', list: ereboniaCharacters },
        { name: 'Reverie', list: reverieCharacters },
        { name: 'Calvard', list: calvardCharacters },
      ];

      const leakedCharacters: { arc: string; id: string; nameEn: string; debutGame: string }[] = [];

      for (const group of nonLiberlGroups) {
        for (const char of group.list) {
          if (isCharacterVisible(char, 'sky_fc')) {
            leakedCharacters.push({
              arc: group.name,
              id: char.id,
              nameEn: char.nameEn,
              debutGame: char.debutGame,
            });
          }
        }
      }

      console.log(`[HORIZON AUDIT] Non-Liberl characters visible in Sky FC: ${leakedCharacters.length}`);
      if (leakedCharacters.length > 0) {
        console.warn('[HORIZON AUDIT] Leaked character details:', leakedCharacters);
      }

      // Requirement: Zero characters from Crossbell, Erebonia, Reverie, or Calvard visible in Sky FC
      expect(
        leakedCharacters,
        `Expected 0 non-Liberl characters visible in Sky FC, but found ${leakedCharacters.length}: ${JSON.stringify(
          leakedCharacters
        )}`
      ).toEqual([]);
    });

    it('1.2 should strictly allow only canonical Sky FC characters to be visible in Sky FC', () => {
      const visibleInFC = characters.filter((c) => isCharacterVisible(c, 'sky_fc'));

      // All visible characters must have debutGame === 'sky_fc'
      for (const char of visibleInFC) {
        expect(
          char.debutGame,
          `Character ${char.id} is visible in Sky FC but debut is ${char.debutGame}`
        ).toBe('sky_fc');
      }

      // Verify known later Liberl characters are NOT visible in Sky FC
      const kevin = characterMap.get('kevin');
      const renne = characterMap.get('renne');
      const ries = characterMap.get('ries');
      expect(kevin && isCharacterVisible(kevin, 'sky_fc'), 'Kevin must not be visible in Sky FC').toBe(false);
      expect(renne && isCharacterVisible(renne, 'sky_fc'), 'Renne must not be visible in Sky FC').toBe(false);
      expect(ries && isCharacterVisible(ries, 'sky_fc'), 'Ries must not be visible in Sky FC').toBe(false);
    });

    it('1.3 should prevent BFS traversal from reaching ANY future character from any Sky FC character', () => {
      const fcCharacters = characters.filter((c) => c.debutGame === 'sky_fc');

      let leaksFound = 0;
      const leakDetails: string[] = [];

      // Test every FC character trying to route to representative future characters across all eras
      const testTargets = [
        'lloyd', 'elie', 'tio', 'randy', 'kea', // Crossbell
        'rean', 'alisa', 'crow', 'altina', 'osborne', 'rufus', // Erebonia
        'c_rufus', 'lapis', 'swin', 'nadia', // Reverie
        'van', 'agnes', 'ferri', 'aaron', 'shizuna', // Calvard
      ];

      for (const startChar of fcCharacters) {
        for (const targetId of testTargets) {
          const result = findShortestRelationshipPath(
            startChar.id,
            targetId,
            characterMap,
            relationships,
            'sky_fc',
            false // allowSpoilers = false
          );

          if (result.found) {
            leaksFound++;
            leakDetails.push(`${startChar.id} -> ${targetId} succeeded via ${result.nodes.map((n) => n.id).join('->')}`);
          }
        }
      }

      expect(leaksFound, `BFS reached future characters under Sky FC horizon: ${leakDetails.join(', ')}`).toBe(0);
    });

    it('1.4 should ensure internal BFS paths between Sky FC characters contain ZERO future characters or future edges', () => {
      const fcCharacters = characters.filter((c) => c.debutGame === 'sky_fc');

      for (let i = 0; i < fcCharacters.length; i++) {
        for (let j = i + 1; j < fcCharacters.length; j++) {
          const startId = fcCharacters[i].id;
          const endId = fcCharacters[j].id;

          const result = findShortestRelationshipPath(
            startId,
            endId,
            characterMap,
            relationships,
            'sky_fc',
            false
          );

          if (result.found) {
            // Verify every node in path is visible in FC
            for (const node of result.nodes) {
              expect(
                GAME_ORDER[node.debutGame],
                `Path ${startId}->${endId} contains future character ${node.id} (${node.debutGame})`
              ).toBeLessThanOrEqual(GAME_ORDER['sky_fc']);
            }

            // Verify every edge in path debuted in FC and is not secret beyond FC
            for (const edge of result.edges) {
              expect(
                GAME_ORDER[edge.debutGame],
                `Path ${startId}->${endId} contains future edge ${edge.id} (${edge.debutGame})`
              ).toBeLessThanOrEqual(GAME_ORDER['sky_fc']);

              if (edge.spoilerDebutGame) {
                expect(
                  GAME_ORDER[edge.spoilerDebutGame],
                  `Path ${startId}->${endId} traversed secret spoiler edge ${edge.id} revealed in ${edge.spoilerDebutGame}`
                ).toBeLessThanOrEqual(GAME_ORDER['sky_fc']);
              }
            }
          }
        }
      }
    });
  });

  // ==========================================================================
  // 2. CLASSIFIED RELATIONSHIP MASKING ADVERSARIAL AUDIT
  // ==========================================================================
  describe('2. Classified Relationship Masking Audit', () => {
    it('2.1 should strictly mask Rean & Osborne relationship as [Classified Relationship] in CS1', () => {
      const rel = relationships.find((r) => r.id === 'rel_rean_osborne');
      expect(rel, 'Expected rel_rean_osborne to exist').toBeDefined();
      if (!rel) return;

      // In Sky FC to Azure: completely hidden (null)
      expect(sanitizeRelationship(rel, 'sky_fc'), 'Must be null in Sky FC').toBeNull();
      expect(sanitizeRelationship(rel, 'azure'), 'Must be null in Azure').toBeNull();

      // In CS1: introduced (CS1) but biological father/son is revealed in CS2
      const maskedCS1 = sanitizeRelationship(rel, 'cs1');
      expect(maskedCS1, 'Must not be null in CS1').not.toBeNull();
      expect(maskedCS1?.labelEn, 'Must be masked in CS1').toBe('[Classified Relationship]');
      expect(maskedCS1?.labelJa, 'Must have Japanese mask').toBe('【機密関係】');
      expect(maskedCS1?.descEn, 'Description must be redacted in CS1').toContain('[Redacted');

      // In CS2: revealed
      const revealedCS2 = sanitizeRelationship(rel, 'cs2');
      expect(revealedCS2?.labelEn).toBe('Biological Father & Son');

      // In CS1 with explicit unmasking: revealed
      const unmaskedCS1 = sanitizeRelationship(rel, 'cs1', new Set(['rel_rean_osborne']));
      expect(unmaskedCS1?.labelEn).toBe('Biological Father & Son');
    });

    it('2.2 should strictly mask Joshua & Loewe relationship as [Classified Relationship] in Sky FC', () => {
      const rel = relationships.find((r) => r.id === 'rel_joshua_loewe');
      expect(rel, 'Expected rel_joshua_loewe to exist').toBeDefined();
      if (!rel) return;

      const sanitizedInFC = sanitizeRelationship(rel, 'sky_fc');
      console.log('[SPOILER AUDIT] rel_joshua_loewe sanitized in Sky FC:', {
        labelEn: sanitizedInFC?.labelEn,
        descEn: sanitizedInFC?.descEn,
      });

      // Requirement: Joshua & Loewe must be masked in Sky FC
      expect(
        sanitizedInFC?.labelEn,
        `Expected rel_joshua_loewe to be masked as [Classified Relationship] in Sky FC, but got "${sanitizedInFC?.labelEn}"`
      ).toBe('[Classified Relationship]');
    });

    it('2.3 should audit masking compliance across all 16 classified and spoiler-debut relationships', () => {
      const classifiedCandidates = relationships.filter((r) => r.isSecret || r.spoilerDebutGame);
      const unmaskedSpoilers: { id: string; activeGame: string; labelEn: string; reason: string }[] = [];

      for (const rel of classifiedCandidates) {
        // If an edge has spoilerDebutGame, in all games between debutGame and spoilerDebutGame - 1,
        // it must be either null (if before debut) or masked as [Classified Relationship]
        if (rel.spoilerDebutGame) {
          const debutIdx = GAME_ORDER[rel.debutGame];
          const spoilerIdx = GAME_ORDER[rel.spoilerDebutGame];

          for (let g = debutIdx; g < spoilerIdx; g++) {
            const gameId = ALL_GAME_IDS[g];
            const sanitized = sanitizeRelationship(rel, gameId);
            if (sanitized && sanitized.labelEn !== '[Classified Relationship]') {
              unmaskedSpoilers.push({
                id: rel.id,
                activeGame: gameId,
                labelEn: sanitized.labelEn,
                reason: `Has spoilerDebutGame=${rel.spoilerDebutGame} but isSecret=${rel.isSecret}; returned unmasked label in ${gameId}`,
              });
            }
          }
        }

        // If an edge is marked isSecret: true but lacks spoilerDebutGame, check what happens in its debut game
        if (rel.isSecret && !rel.spoilerDebutGame) {
          const sanitized = sanitizeRelationship(rel, rel.debutGame);
          if (sanitized && sanitized.labelEn !== '[Classified Relationship]') {
            unmaskedSpoilers.push({
              id: rel.id,
              activeGame: rel.debutGame,
              labelEn: sanitized.labelEn,
              reason: `isSecret=true without spoilerDebutGame; returned raw label "${sanitized.labelEn}" in debutGame ${rel.debutGame}`,
            });
          }
        }
      }

      console.log(`[CLASSIFIED AUDIT] Found ${unmaskedSpoilers.length} classified relationship leaks:`);
      for (const leak of unmaskedSpoilers) {
        console.warn(`  - [LEAK] ${leak.id} in ${leak.activeGame}: "${leak.labelEn}" (${leak.reason})`);
      }

      expect(
        unmaskedSpoilers.length,
        `Found ${unmaskedSpoilers.length} classified relationship leaks where spoilers were revealed unmasked: ${unmaskedSpoilers
          .map((u) => u.id + '@' + u.activeGame)
          .join(', ')}`
      ).toBe(0);
    });
  });

  // ==========================================================================
  // 3. VISUAL ASSET INTEGRITY & MONOGRAM FALLBACKS AUDIT
  // ==========================================================================
  describe('3. Visual Asset Integrity & Monogram Fallbacks Audit', () => {
    it('3.1 should verify all 114 characters have non-empty valid initials and factionIds', () => {
      for (const char of characters) {
        expect(char.initials, `Character ${char.id} has invalid initials`).toBeTruthy();
        expect(char.initials.length, `Character ${char.id} initials length should be 1-3`).toBeLessThanOrEqual(3);
        expect(char.initials.length, `Character ${char.id} initials length should be 1-3`).toBeGreaterThanOrEqual(1);
        expect(char.factionId, `Character ${char.id} missing factionId`).toBeTruthy();
      }
    });

    it('3.2 should generate valid, well-formed SVG monogram fallbacks for all 114 characters from CharacterAvatar', () => {
      for (const char of characters) {
        const svg = avatarMonogramFallback(char);
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('viewBox="0 0 100 100"');
        expect(svg).toContain(char.initials);
        expect(svg).not.toContain('undefined');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('null');
      }
    });

    it('3.3 should generate valid SVG monogram fallbacks for all characters from storage service', () => {
      for (const char of characters) {
        const faction = factions.find((f) => f.id === char.factionId);
        const color = faction?.color || '#38bdf8';
        const svg = storageMonogramFallback(char.initials, color, 48);
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain(char.initials);
        expect(svg).toContain(color);
        expect(svg).not.toContain('undefined');
        expect(svg).not.toContain('NaN');
      }
    });

    it('3.4 should verify physical presence and validity of all generated SVG placeholder files in public/assets/portraits', () => {
      const portraitsDir = path.resolve(process.cwd(), 'public', 'assets', 'portraits');
      const manifestPath = path.join(portraitsDir, 'manifest.json');

      expect(fs.existsSync(manifestPath), 'manifest.json must exist in public/assets/portraits').toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.totalCharacters).toBe(360);
      expect(manifest.totalVariants).toBeGreaterThanOrEqual(247);
      expect(manifest.totalVariants).toBe(913);

      for (const char of characters) {
        const charSvgPath = path.join(portraitsDir, `${char.id}.svg`);
        expect(fs.existsSync(charSvgPath), `SVG file for ${char.id} must exist at ${charSvgPath}`).toBe(true);
        const content = fs.readFileSync(charSvgPath, 'utf-8');
        expect(content.length, `SVG file for ${char.id} must not be empty`).toBeGreaterThan(100);
        expect(content).toContain('<svg');
        expect(content).toContain('</svg>');
        expect(content).toContain(char.initials);

        // Check variants if any
        if (char.variants) {
          for (const variantKey of Object.keys(char.variants)) {
            const variantSvgPath = path.join(portraitsDir, `${char.id}_${variantKey}.svg`);
            expect(fs.existsSync(variantSvgPath), `Variant SVG for ${char.id}_${variantKey} must exist`).toBe(true);
          }
        }
      }
    });
  });

  // ==========================================================================
  // 4. DATA MUTATION RESILIENCE & GRAPH IMMUTABILITY AUDIT
  // ==========================================================================
  describe('4. Data Mutation Resilience Audit', () => {
    it('4.1 should execute BFS pathfinding on deeply frozen datasets without mutating or throwing', () => {
      const frozenCharacters = new Map<string, Character>();
      for (const [id, char] of characterMap.entries()) {
        frozenCharacters.set(id, deepFreeze(JSON.parse(JSON.stringify(char))));
      }
      const frozenRelationships = deepFreeze(JSON.parse(JSON.stringify(relationships))) as Relationship[];

      const testPairs = [
        ['estelle', 'joshua', 'sky_fc'],
        ['estelle', 'rean', 'cs4'],
        ['lloyd', 'van', 'daybreak2'],
        ['rean', 'crow', 'cs1'],
        ['kevin', 'ries', 'sky_3rd'],
      ] as const;

      for (const [start, end, game] of testPairs) {
        expect(() => {
          const res = findShortestRelationshipPath(
            start,
            end,
            frozenCharacters,
            frozenRelationships,
            game,
            false
          );
          expect(res).toBeDefined();
        }).not.toThrow();
      }
    });

    it('4.2 should execute sanitizeRelationship across all relationships and games without mutating', () => {
      const clonedRels = relationships.map((r) => deepFreeze(JSON.parse(JSON.stringify(r)))) as Relationship[];

      for (const rel of clonedRels) {
        for (const gameId of ALL_GAME_IDS) {
          expect(() => {
            const sanitized = sanitizeRelationship(rel, gameId);
            if (sanitized) {
              expect(sanitized.id).toBe(rel.id);
            }
          }).not.toThrow();
        }
      }
    });

    it('4.3 should execute getCharacterEffectiveTitle without mutating character objects', () => {
      const clonedChars = characters.map((c) => deepFreeze(JSON.parse(JSON.stringify(c)))) as Character[];

      for (const char of clonedChars) {
        for (const gameId of ALL_GAME_IDS) {
          expect(() => {
            const titleEn = getCharacterEffectiveTitle(char, gameId, 'en');
            const titleJa = getCharacterEffectiveTitle(char, gameId, 'ja');
            expect(titleEn).toBeTruthy();
            expect(titleJa).toBeTruthy();
          }).not.toThrow();
        }
      }
    });
  });
});
