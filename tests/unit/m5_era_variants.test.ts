import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { characters, characterMap } from '../../src/data/characters';
import { CharacterVariantSchema } from '../../src/schemas/character.schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTRAITS_DIR = path.resolve(__dirname, '../../public/assets/portraits');

describe('Milestone 5: Multi-Era Portrait Variant Gallery & Asset Pipeline', () => {
  describe('1. Multi-Era Variant Definitions Completeness', () => {
    it('should verify Renne has rich era variants for sky_sc, zero, cs4, reverie, and daybreak1', () => {
      const renne = characterMap.get('renne')!;
      expect(renne).toBeDefined();
      expect(renne.variants).toBeDefined();

      const requiredEras = ['sky_sc', 'zero', 'cs4', 'reverie', 'daybreak1'] as const;
      for (const era of requiredEras) {
        const variant = renne.variants![era];
        expect(variant, `Missing Renne variant for ${era}`).toBeDefined();
        expect(variant!.eraLabel).toBeDefined();
        expect(variant!.titleEn).toBeDefined();
        expect(variant!.weapons).toBeDefined();
        expect(variant!.weapons!.length).toBeGreaterThanOrEqual(1);
        expect(variant!.weapons!.length).toBeLessThanOrEqual(2);
        expect(variant!.portraitUrl).toBeDefined();
        expect(variant!.portraitUrl).toBe(`/assets/portraits/renne_${era}.webp`);

        // Check Zod schema validation
        const parsed = CharacterVariantSchema.safeParse(variant);
        expect(parsed.success).toBe(true);
      }

      expect(renne.variants!['sky_sc']!.eraLabel).toBe('Sky SC (Child)');
      expect(renne.variants!['zero']!.eraLabel).toBe('Zero');
      expect(renne.variants!['cs4']!.eraLabel).toBe('Cold Steel IV');
      expect(renne.variants!['reverie']!.eraLabel).toBe('Reverie');
      expect(renne.variants!['daybreak1']!.eraLabel).toBe('Daybreak');
    });

    it('should verify Rean has rich era variants for cs1, cs3, cs4, reverie, and daybreak2', () => {
      const rean = characterMap.get('rean')!;
      expect(rean).toBeDefined();
      expect(rean.variants).toBeDefined();

      const requiredEras = ['cs1', 'cs3', 'cs4', 'reverie', 'daybreak2'] as const;
      for (const era of requiredEras) {
        const variant = rean.variants![era];
        expect(variant, `Missing Rean variant for ${era}`).toBeDefined();
        expect(variant!.eraLabel).toBeDefined();
        expect(variant!.titleEn).toBeDefined();
        expect(variant!.weapons).toBeDefined();
        expect(variant!.weapons!.length).toBeGreaterThanOrEqual(1);
        expect(variant!.weapons!.length).toBeLessThanOrEqual(2);
        expect(variant!.portraitUrl).toBeDefined();
        expect(variant!.portraitUrl).toBe(`/assets/portraits/rean_${era}.webp`);

        const parsed = CharacterVariantSchema.safeParse(variant);
        expect(parsed.success).toBe(true);
      }
    });

    it('should verify Estelle, Joshua, Lloyd, Crow, and Altina have rich era variants with labels and weapons', () => {
      const keyMultiEraIds = ['estelle', 'joshua', 'lloyd', 'crow', 'altina'];
      for (const id of keyMultiEraIds) {
        const char = characterMap.get(id)!;
        expect(char, `Character ${id} must exist`).toBeDefined();
        expect(char.variants, `${id} must have variants`).toBeDefined();
        expect(Object.keys(char.variants!).length).toBeGreaterThanOrEqual(4);

        for (const [gameId, variant] of Object.entries(char.variants!)) {
          expect(variant.eraLabel, `${id} [${gameId}] must have eraLabel`).toBeDefined();
          expect(variant.titleEn, `${id} [${gameId}] must have titleEn`).toBeDefined();
          expect(variant.weapons, `${id} [${gameId}] must have weapons`).toBeDefined();
          expect(variant.weapons!.length).toBeGreaterThanOrEqual(1);
          expect(variant.weapons!.length).toBeLessThanOrEqual(2);
          expect(variant.portraitUrl, `${id} [${gameId}] must have portraitUrl`).toBeDefined();

          const parsed = CharacterVariantSchema.safeParse(variant);
          expect(parsed.success, `${id} [${gameId}] variant must satisfy schema`).toBe(true);
        }
      }
    });
  });

  describe('2. Physical Asset Pipeline Verification in public/assets/portraits', () => {
    it('should verify that all 360 characters have valid WebP assets > 1KB', () => {
      expect(characters.length).toBe(360);
      const missingWebp: string[] = [];
      const smallWebp: string[] = [];

      for (const char of characters) {
        const filePath = path.join(PORTRAITS_DIR, `${char.id}.webp`);
        if (!fs.existsSync(filePath)) {
          missingWebp.push(char.id);
        } else {
          const stats = fs.statSync(filePath);
          if (stats.size <= 1024) {
            smallWebp.push(`${char.id} (${stats.size} bytes)`);
          }
        }
      }

      expect(missingWebp, `Missing base webp for: ${missingWebp.join(', ')}`).toEqual([]);
      expect(smallWebp, `Sub-1KB webp for: ${smallWebp.join(', ')}`).toEqual([]);
    });

    it('should verify that all multi-era variant WebP and SVG assets physically exist in public/assets/portraits', () => {
      const auditChars = ['renne', 'rean', 'estelle', 'joshua', 'lloyd', 'crow', 'altina'];
      for (const id of auditChars) {
        const char = characterMap.get(id)!;
        for (const [gameId, variant] of Object.entries(char.variants!)) {
          const webpName = variant.portraitUrl
            ? path.basename(variant.portraitUrl)
            : `${char.id}_${gameId}.webp`;
          const webpPath = path.join(PORTRAITS_DIR, webpName);
          const svgPath = path.join(PORTRAITS_DIR, `${char.id}_${gameId}.svg`);

          expect(fs.existsSync(webpPath), `Variant WebP missing: ${webpName}`).toBe(true);
          const stats = fs.statSync(webpPath);
          expect(stats.size, `Variant WebP ${webpName} must be > 1024 bytes`).toBeGreaterThan(1024);

          expect(fs.existsSync(svgPath), `Variant SVG missing: ${char.id}_${gameId}.svg`).toBe(true);
          const svgContent = fs.readFileSync(svgPath, 'utf-8');
          expect(svgContent).toContain('<svg');
          expect(svgContent).toContain('</svg>');
        }
      }
    });

    it('should verify manifest.json records totalCharacters: 360 and totalVariants', () => {
      const manifestPath = path.join(PORTRAITS_DIR, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.totalCharacters).toBe(360);
      expect(manifest.totalVariants).toBeGreaterThan(0);
      expect(manifest.directory).toBe('public/assets/portraits');
    });

    it('should verify Renne and flagship multi-era characters have visually distinct era variant images (unique hashes)', () => {
      const renneFiles = [
        'renne.webp',
        'renne_sky_sc.webp',
        'renne_zero.webp',
        'renne_cs4.webp',
        'renne_reverie.webp',
        'renne_daybreak1.webp',
      ];
      const renneHashes = new Set(
        renneFiles.map((f) =>
          crypto.createHash('md5').update(fs.readFileSync(path.join(PORTRAITS_DIR, f))).digest('hex')
        )
      );
      expect(renneHashes.size, 'All 6 Renne era portraits must be distinct images').toBe(6);

      const flagshipIds = ['rean', 'estelle', 'joshua', 'lloyd', 'crow', 'altina'];
      for (const id of flagshipIds) {
        const char = characterMap.get(id)!;
        const hashes = new Set<string>();
        for (const gameId of Object.keys(char.variants!)) {
          const p = path.join(PORTRAITS_DIR, `${id}_${gameId}.webp`);
          hashes.add(crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'));
        }
        expect(hashes.size, `${id} must have multiple distinct era variant images`).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
