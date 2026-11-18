/**
 * ============================================================================
 * TIER 4: REAL-WORLD SCENARIOS & WORKLOAD JOURNEYS
 * File: tests/e2e/real_world.test.ts
 *
 * Verifies end-to-end player journeys and performance stress benchmarks:
 * • Scenario 1: Newcomer safe companion journey through Sky FC to Sky the 3rd
 * • Scenario 2: Veteran cross-arc lore exploration (Estelle -> Renne -> Van)
 * • Scenario 3: High-frequency stress benchmark (1,000 BFS queries <100ms)
 * • Scenario 4: Offline browsing resilience using vector monogram fallback badges
 * • Scenario 5: Full session persistence & state restoration across reloads
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_GAMES,
  CANONICAL_FACTIONS,
  CANONICAL_CHARACTERS,
  CANONICAL_RELATIONSHIPS,
  DEFAULT_STATE,
  isCharacterVisible,
  sanitizeRelationship,
  findShortestRelationshipPath,
  generateMonogramFallback,
  hydrateState,
  serializeState,
  type Character,
  type Relationship,
  type PersistentState,
  type GameId,
} from './fixtures';

describe('Tier 4: Real-World Scenarios & Workload Journeys', () => {
  const characterMap = new Map<string, Character>(
    CANONICAL_CHARACTERS.map((c) => [c.id, c])
  );

  // --------------------------------------------------------------------------
  // SCENARIO 1: NEWCOMER SAFE COMPANION JOURNEY (Sky FC -> SC -> the 3rd)
  // --------------------------------------------------------------------------
  describe('Scenario 1: Newcomer Safe Companion Journey (Liberl Arc)', () => {
    it('TC-4.1: simulates progressive spoiler unmasking across Sky FC, SC, and the 3rd', () => {
      // Step 1: Player starts Trails in the Sky FC
      let activeGame: GameId = 'sky_fc';
      let visibleChars = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, activeGame)
      );

      // Verify only Sky FC characters are visible (13 total)
      expect(visibleChars.length).toBe(13);
      expect(visibleChars.some((c) => c.id === 'estelle')).toBe(true);
      expect(visibleChars.some((c) => c.id === 'joshua')).toBe(true);
      expect(visibleChars.some((c) => c.id === 'kevin')).toBe(false); // Kevin debuts in SC
      expect(visibleChars.some((c) => c.id === 'ries')).toBe(false);  // Ries debuts in the 3rd

      // Step 2: Player finishes FC, advances toolbar to Sky SC
      activeGame = 'sky_sc';
      visibleChars = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, activeGame)
      );

      // Kevin and Renne are now visible
      expect(visibleChars.some((c) => c.id === 'kevin')).toBe(true);
      expect(visibleChars.some((c) => c.id === 'renne')).toBe(true);
      expect(visibleChars.some((c) => c.id === 'ries')).toBe(false);  // Ries still hidden

      // Step 3: Player finishes SC, advances toolbar to Sky the 3rd
      activeGame = 'sky_3rd';
      visibleChars = CANONICAL_CHARACTERS.filter((c) =>
        isCharacterVisible(c, activeGame)
      );

      // Ries Argent debuts in the 3rd and is now visible
      expect(visibleChars.some((c) => c.id === 'ries')).toBe(true);

      // Verify that future arc characters (Crossbell, Erebonia, Calvard) remain strictly hidden
      const futureProtagonists = ['lloyd', 'elie', 'rean', 'van'];
      for (const protag of futureProtagonists) {
        expect(
          visibleChars.some((c) => c.id === protag),
          `${protag} must not be visible in Sky the 3rd`
        ).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: VETERAN CROSS-ARC LORE EXPLORATION (Estelle -> Renne -> Van)
  // --------------------------------------------------------------------------
  describe('Scenario 2: Veteran Cross-Arc Lore Exploration', () => {
    it('TC-4.2: traces 2-degree cross-arc relationship bridge from Estelle Bright to Van Arkride', () => {
      // In Daybreak II, trace path from Liberl protagonist (Estelle) to Calvard fixer (Van)
      const pathResult = findShortestRelationshipPath(
        'estelle',
        'van',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(pathResult.found).toBe(true);
      expect(pathResult.degrees).toBe(2);

      // Canonical bridge: Estelle -> Renne Bright (family bond) -> Van Arkride (comrade / council collaborator)
      const pathNodeIds = pathResult.nodes.map((n) => n.id);
      expect(pathNodeIds).toEqual(['estelle', 'renne', 'van']);

      // Validate the 2 traversing edges
      expect(pathResult.edges.length).toBe(2);
      expect(pathResult.edges[0].source === 'estelle' || pathResult.edges[0].target === 'estelle').toBe(true);
      expect(pathResult.edges[1].source === 'van' || pathResult.edges[1].target === 'van').toBe(true);
    });

    it('TC-4.3: verifies cross-arc relationship bridge between Crossbell SSS and Erebonia Class VII', () => {
      // Lloyd Bannings (SSS, Crossbell) to Rean Schwarzer (Class VII, Erebonia)
      const pathResult = findShortestRelationshipPath(
        'lloyd',
        'rean',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(pathResult.found).toBe(true);
      expect(pathResult.degrees).toBeGreaterThanOrEqual(1);
      expect(pathResult.nodes[0].id).toBe('lloyd');
      expect(pathResult.nodes[pathResult.nodes.length - 1].id).toBe('rean');
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: HIGH-FREQUENCY STRESS BENCHMARK (1,000 BFS Queries <100ms)
  // --------------------------------------------------------------------------
  describe('Scenario 3: High-Frequency Algorithmic Stress Benchmark', () => {
    it('TC-4.4: executes 1,000 randomized BFS shortest-path queries in under 100ms total wall-clock time', () => {
      const allCharacterIds = CANONICAL_CHARACTERS.map((c) => c.id);
      const queryCount = 1000;

      // Seed a pseudo-random sequence of 1,000 pairs
      const queries: [string, string][] = [];
      let seed = 1204; // Erebonian imperial calendar seed
      function pseudoRandom(): number {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      for (let i = 0; i < queryCount; i++) {
        const fromIdx = Math.floor(pseudoRandom() * allCharacterIds.length);
        const toIdx = Math.floor(pseudoRandom() * allCharacterIds.length);
        queries.push([allCharacterIds[fromIdx], allCharacterIds[toIdx]]);
      }

      // Benchmark execution
      const tStart = performance.now();
      let successfulPaths = 0;

      for (let i = 0; i < queryCount; i++) {
        const [fromId, toId] = queries[i];
        const res = findShortestRelationshipPath(
          fromId,
          toId,
          characterMap,
          CANONICAL_RELATIONSHIPS,
          'daybreak2',
          true
        );
        if (res.found) {
          successfulPaths++;
        }
      }

      const tElapsed = performance.now() - tStart;

      // Assertions
      expect(tElapsed).toBeLessThan(100); // Must complete under 100ms total
      expect(successfulPaths).toBeGreaterThan(0); // Valid paths resolved
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 4: OFFLINE BROWSING RESILIENCE (Vector Monogram Fallbacks)
  // --------------------------------------------------------------------------
  describe('Scenario 4: Offline Browsing Resilience (Vector Monogram Badges)', () => {
    it('TC-4.5: generates valid SVG monogram fallback badges for all 106 canonical characters', () => {
      for (const char of CANONICAL_CHARACTERS) {
        const svgBadge = generateMonogramFallback(char);

        // SVG structural integrity checks
        expect(svgBadge).toContain('<svg');
        expect(svgBadge).toContain('</svg>');
        expect(svgBadge).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svgBadge).toContain('viewBox="0 0 100 100"');

        // Monogram text must match character initials (1-2 uppercase letters)
        expect(svgBadge).toContain(`>${char.initials}</text>`);

        // Faction color gradient check
        expect(svgBadge).toContain(`grad-${char.factionId}`);
      }
    });

    it('TC-4.6: supports dynamic badge sizing (32px, 48px, 64px, 128px) without markup degradation', () => {
      const rean = characterMap.get('rean')!;
      const sizes = [32, 48, 64, 128];

      for (const sz of sizes) {
        const badge = generateMonogramFallback(rean, sz);
        expect(badge).toContain(`width="${sz}"`);
        expect(badge).toContain(`height="${sz}"`);
        expect(badge).toContain('>RS</text>');
      }
    });
  });

  // --------------------------------------------------------------------------
  // SCENARIO 5: FULL SESSION PERSISTENCE & STATE RESTORATION
  // --------------------------------------------------------------------------
  describe('Scenario 5: Session Persistence & Browser Reload Restoration', () => {
    it('TC-4.7: serializes complex multi-component state and restores it with 100% fidelity', () => {
      // 1. User configures an in-depth exploration session
      const originalSessionState: PersistentState = {
        version: 1,
        selectedGameId: 'cs4',
        activeView: 'pathfinder',
        selectedCharId: 'crow',
        highContrastMode: true,
        language: 'ja',
        unmaskedSpoilerIds: [
          'crow_awakener',
          'george_copper',
          'rel_rean_osborne_secret',
        ],
        physicsConfig: {
          gravity: 0.75,
          repulsion: 820,
          linkDistance: 160,
          damping: 0.9,
          isPaused: true,
        },
      };

      // 2. Serialized to browser storage JSON
      const storagePayload = serializeState(originalSessionState);
      expect(typeof storagePayload).toBe('string');
      expect(storagePayload.length).toBeGreaterThan(50);

      // 3. User refreshes browser; app hydrates from storage
      const restoredState = hydrateState(storagePayload, DEFAULT_STATE);

      // 4. Assert 100% fidelity of every single state parameter
      expect(restoredState.version).toBe(1);
      expect(restoredState.selectedGameId).toBe('cs4');
      expect(restoredState.activeView).toBe('pathfinder');
      expect(restoredState.selectedCharId).toBe('crow');
      expect(restoredState.highContrastMode).toBe(true);
      expect(restoredState.language).toBe('ja');
      expect(restoredState.unmaskedSpoilerIds).toEqual([
        'crow_awakener',
        'george_copper',
        'rel_rean_osborne_secret',
      ]);
      expect(restoredState.physicsConfig).toEqual({
        gravity: 0.75,
        repulsion: 820,
        linkDistance: 160,
        damping: 0.9,
        isPaused: true,
      });

      expect(restoredState).toEqual(originalSessionState);
    });
  });
});
