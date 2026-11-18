import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { characters } from '../../src/data/characters';
import { relationships } from '../../src/data/relationships';
import { factions } from '../../src/data/factions';
import { ALL_TIMELINE_ARC, games } from '../../src/data/games';
import { CHARACTER_PORTRAITS } from '../../src/data/portraits';
import { GameArcSchema, GameIdSchema } from '../../src/schemas';
import {
  isCharacterVisible,
  sanitizeRelationship,
  getCharacterEffectiveTitle,
  filterSpoilerNotes,
  GAME_ORDER,
} from '../../src/services/spoilerEngine';
import { generateMonogramFallback } from '../../src/components/common/CharacterAvatar';

describe('All-Timeline & Character Portrait Integrity Verification', () => {
  describe('1. ALL_TIMELINE_ARC Domain & Schema Integrity', () => {
    it('should validate ALL_TIMELINE_ARC against GameArcSchema', () => {
      const result = GameArcSchema.safeParse(ALL_TIMELINE_ARC);
      expect(result.success, `ALL_TIMELINE_ARC validation failed: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    });

    it('should have id="all" recognized by GameIdSchema', () => {
      expect(GameIdSchema.safeParse('all').success).toBe(true);
    });

    it('should have 5 comprehensive saga chapters covering all arcs', () => {
      expect(ALL_TIMELINE_ARC.chapterConflicts.length).toBe(5);
      const chapters = ALL_TIMELINE_ARC.chapterConflicts.map((c) => c.chapter);
      expect(chapters.some((c) => c.includes('Liberl'))).toBe(true);
      expect(chapters.some((c) => c.includes('Crossbell'))).toBe(true);
      expect(chapters.some((c) => c.includes('Erebonia'))).toBe(true);
      expect(chapters.some((c) => c.includes('Reverie'))).toBe(true);
      expect(chapters.some((c) => c.includes('Calvard'))).toBe(true);
    });

    it('should include all major regional and trans-national factions in activeFactions', () => {
      const activeSet = new Set(ALL_TIMELINE_ARC.activeFactions);
      expect(activeSet.has('bracer_guild')).toBe(true);
      expect(activeSet.has('bracer_guild_liberl')).toBe(true);
      expect(activeSet.has('bracer_guild_crossbell')).toBe(true);
      expect(activeSet.has('bracer_guild_erebonia')).toBe(true);
      expect(activeSet.has('bracer_guild_calvard')).toBe(true);
      expect(activeSet.has('jaeger_zephyr')).toBe(true);
      expect(activeSet.has('red_constellation')).toBe(true);
      expect(activeSet.has('northern_jaegers')).toBe(true);
      expect(activeSet.has('krugha_warriors')).toBe(true);
      expect(activeSet.has('ikaruga_shinobi')).toBe(true);
      expect(activeSet.has('special_support_section')).toBe(true);
      expect(activeSet.has('thors_class_vii')).toBe(true);
      expect(activeSet.has('arkride_solutions')).toBe(true);
      expect(activeSet.has('ouroboros')).toBe(true);
      expect(activeSet.has('gralsritter')).toBe(true);
    });
  });

  describe('2. All-Timeline Visibility & Spoiler Unmasking Engine', () => {
    it('should make 100% of characters (360/360) visible when activeGame is "all"', () => {
      expect(characters.length).toBe(360);
      const visible = characters.filter((c) => isCharacterVisible(c, 'all'));
      expect(visible.length).toBe(360);
    });

    it('should make 100% of relationships (404/404) active and unmasked when activeGame is "all"', () => {
      expect(relationships.length).toBe(404);
      const sanitized = relationships
        .map((r) => sanitizeRelationship(r, 'all'))
        .filter((r) => r !== null);
      expect(sanitized.length).toBe(404);

      // Verify none are masked as classified
      const classified = sanitized.filter((r) => r!.labelEn.includes('Classified'));
      expect(classified.length).toBe(0);
    });

    it('should resolve the latest canonical character titles under "all"', () => {
      const rean = characters.find((c) => c.id === 'rean')!;
      const titleEn = getCharacterEffectiveTitle(rean, 'all', 'en');
      expect(titleEn).toBe('Visiting Master of Eight Leaves');
    });

    it('should unmask all spoiler notes when activeGame is "all"', () => {
      const rean = characters.find((c) => c.id === 'rean')!;
      const notes = filterSpoilerNotes(rean.spoilerNotes, 'all');
      expect(notes.length).toBe(rean.spoilerNotes!.length);
    });
  });

  describe('3. Character Portrait Asset Completeness (165/165 Characters)', () => {
    const portraitsDir = path.resolve(__dirname, '../../public/assets/portraits');

    it('should verify that all 165 characters have a downloaded .webp portrait in public/assets/portraits', () => {
      const missingFiles: string[] = [];
      for (const char of characters) {
        const filePath = path.join(portraitsDir, `${char.id}.webp`);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(`${char.id}.webp`);
        }
      }
      expect(missingFiles, `Missing portraits for: ${missingFiles.join(', ')}`).toEqual([]);
    });

    it('should verify that all 165 characters have non-empty file size (> 1KB)', () => {
      for (const char of characters) {
        const filePath = path.join(portraitsDir, `${char.id}.webp`);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(1024);
      }
    });

    it('should verify that CHARACTER_PORTRAITS has entry for all 165 characters', () => {
      const missingInMap: string[] = [];
      for (const char of characters) {
        if (!CHARACTER_PORTRAITS[char.id]) {
          missingInMap.push(char.id);
        }
      }
      expect(missingInMap, `Missing in CHARACTER_PORTRAITS map: ${missingInMap.join(', ')}`).toEqual([]);
    });

    it('should ensure all CHARACTER_PORTRAITS URLs are valid HTTPS Falcom/Kiseki Wiki links', () => {
      for (const [id, url] of Object.entries(CHARACTER_PORTRAITS)) {
        expect(url.startsWith('https://'), `Invalid URL for ${id}: ${url}`).toBe(true);
        expect(url).toContain('static.wikia.nocookie.net/kiseki/images');
      }
    });
  });

  describe('4. High-Fidelity Character Portrait Scaling & Asset Robustness', () => {
    it('should generate valid scalable SVG fallback badges at 48px, 128px, 256px, and 480px', () => {
      const rean = characters.find((c) => c.id === 'rean')!;
      for (const size of [48, 128, 256, 480]) {
        const svg = generateMonogramFallback(rean, rean.factionId, size);
        expect(svg).toContain(`width="${size}"`);
        expect(svg).toContain(`height="${size}"`);
        expect(svg).toContain(rean.initials);
      }
    });

    it('should verify that all character portrait WebP assets exist and are under 500KB (optimized)', () => {
      const portraitsDir = path.resolve(__dirname, '../../public/assets/portraits');
      for (const char of characters) {
        const filePath = path.join(portraitsDir, `${char.id}.webp`);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeLessThan(500 * 1024); // Under 500KB for rapid 60fps rendering
      }
    });
  });
});
