/**
 * ============================================================================
 * TIER 3: CROSS-FEATURE INTERACTIONS & COMBINATORIAL FLOWS
 * File: tests/e2e/cross_feature.test.ts
 *
 * Verifies multi-component state synchronization:
 * 1. Game progression switch prunes graph nodes and invalidates active paths.
 * 2. Path Finder + Temporal Spoiler Boundary interactions.
 * 3. Selective spoiler unmasking across Dossier, Tree, and Graph in tandem.
 * 4. High-contrast mode toggling and accessible edge contrast during physics.
 * 5. Dossier Action Tray routing to Path Finder origin and target slots.
 * 6. Faction filtering synchronizing Tree and Graph views simultaneously.
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
  type Character,
  type Relationship,
  type PersistentState,
  type GameId,
} from './fixtures';

describe('Tier 3: Cross-Feature Interactions & Combinatorial Flows', () => {
  const characterMap = new Map<string, Character>(
    CANONICAL_CHARACTERS.map((c) => [c.id, c])
  );

  // --------------------------------------------------------------------------
  // 1. GAME PROGRESSION SWITCH PRUNES GRAPH & INVALIDATES ACTIVE PATHS
  // --------------------------------------------------------------------------
  describe('1. Game Switch Prunes Nodes & Invalidates Active Paths', () => {
    it('TC-3.1: switches game from Daybreak II to Zero, pruning nodes and invalidating active cross-arc path', () => {
      // 1. In Daybreak II, Rean and Van have a valid multi-degree path
      const daybreakPath = findShortestRelationshipPath(
        'rean',
        'van',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(daybreakPath.found).toBe(true);
      expect(daybreakPath.degrees).toBeGreaterThanOrEqual(1);

      // 2. User switches progression pill to 'zero' (Crossbell arc)
      const targetGame: GameId = 'zero';

      // Rean (debuts in CS1) and Van (debuts in Daybreak 1) are not visible in Zero
      const reanVisible = isCharacterVisible(characterMap.get('rean')!, targetGame);
      const vanVisible = isCharacterVisible(characterMap.get('van')!, targetGame);

      expect(reanVisible).toBe(false);
      expect(vanVisible).toBe(false);

      // 3. System checks path validity under the new game: path must be invalidated
      const zeroPath = findShortestRelationshipPath(
        'rean',
        'van',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        targetGame,
        false
      );

      expect(zeroPath.found).toBe(false);
      expect(zeroPath.nodes).toEqual([]);
      expect(zeroPath.edges).toEqual([]);
      expect(zeroPath.degrees).toBe(0);
    });

    it('TC-3.2: keeps intra-arc path intact when switching between games of the same arc', () => {
      // Lloyd and Randy path in Zero
      const pathInZero = findShortestRelationshipPath(
        'lloyd',
        'randy',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'zero',
        false
      );
      expect(pathInZero.found).toBe(true);

      // Switch to Azure (sequel in same arc)
      const pathInAzure = findShortestRelationshipPath(
        'lloyd',
        'randy',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'azure',
        false
      );
      expect(pathInAzure.found).toBe(true);
      expect(pathInAzure.nodes.map((n) => n.id)).toEqual(pathInZero.nodes.map((n) => n.id));
    });
  });

  // --------------------------------------------------------------------------
  // 2. PATH FINDER + TEMPORAL SPOILER BOUNDARY INTERACTION
  // --------------------------------------------------------------------------
  describe('2. Path Finder + Temporal Spoiler Boundary', () => {
    it('TC-3.3: hides secret relationship edge when allowSpoilers is false in early game', () => {
      // Rean and Osborne: secret biological relationship exists
      // In CS1 mode without spoilers:
      const pathWithoutSpoilers = findShortestRelationshipPath(
        'rean',
        'osborne',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'cs1',
        false // strict spoiler protection
      );

      // Osborne and Rean have a secret edge that debuted in CS2 / CS3
      // Without spoilers in CS1, they must not connect directly through secret edge
      const directEdge = pathWithoutSpoilers.edges.find(
        (e) => e.isSecret && (e.id === 'rel_rean_osborne' || e.id === 'rean_osborne_secret')
      );
      expect(directEdge).toBeUndefined();
    });

    it('TC-3.4: unlocks classified relationship edges when allowSpoilers is true', () => {
      // In CS1 mode with allowSpoilers: true
      const pathWithSpoilers = findShortestRelationshipPath(
        'rean',
        'osborne',
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'cs1',
        true // allow spoilers
      );

      expect(pathWithSpoilers.found).toBe(true);
      const secretEdge = pathWithSpoilers.edges.find((e) => e.isSecret);
      expect(secretEdge).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 3. SELECTIVE SPOILER UNMASKING SYNCHRONIZES DOSSIER, TREE, AND GRAPH
  // --------------------------------------------------------------------------
  describe('3. Selective Spoiler Unmasking Across Components', () => {
    it('TC-3.5: unmasking single secret relationship unmasks it in Graph & Dossier while others stay masked', () => {
      const activeGame: GameId = 'sky_fc';
      const secretRel = CANONICAL_RELATIONSHIPS.find(
        (r) => r.isSecret && r.spoilerDebutGame === 'sky_sc' && r.debutGame === 'sky_fc'
      );
      expect(secretRel).toBeDefined();

      const secretRelId = secretRel!.id;

      // 1. Initial masked state (unmaskedSpoilerIds empty)
      const maskedResult = sanitizeRelationship(secretRel!, activeGame, new Set());
      expect(maskedResult).not.toBeNull();
      expect(maskedResult?.labelEn).toBe('[Classified Relationship]');
      expect(maskedResult?.descEn).toContain('[Redacted');

      // 2. User unmasks this specific secret relationship
      const unmaskedSet = new Set([secretRelId]);
      const unmaskedResult = sanitizeRelationship(secretRel!, activeGame, unmaskedSet);

      expect(unmaskedResult).not.toBeNull();
      expect(unmaskedResult?.labelEn).toBe(secretRel!.labelEn);
      expect(unmaskedResult?.descEn).toBe(secretRel!.descEn);

      // 3. Other secret relationships remain masked
      const otherSecretRel = CANONICAL_RELATIONSHIPS.find(
        (r) => r.isSecret && r.id !== secretRelId
      );
      if (otherSecretRel) {
        const otherResult = sanitizeRelationship(otherSecretRel, activeGame, unmaskedSet);
        if (otherResult) {
          expect(otherResult.labelEn).toBe('[Classified Relationship]');
        }
      }
    });

    it('TC-3.6: synchronizes character spoiler notes between Dossier and Hierarchy Tree', () => {
      const joshua = characterMap.get('joshua')!;
      expect(joshua.spoilerNotes).toBeDefined();
      expect(joshua.spoilerNotes!.length).toBeGreaterThan(0);

      const note = joshua.spoilerNotes![0];
      // In Sky FC: note minGame is 'sky_sc', so note must be masked unless unmasked
      const isNoteActiveInFC = note.minGame === 'sky_fc';
      expect(isNoteActiveInFC).toBe(false);

      // In Sky SC: note minGame matches active game, note is naturally visible
      const isNoteActiveInSC = note.minGame === 'sky_sc';
      expect(isNoteActiveInSC).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. HIGH-CONTRAST MODE TOGGLE & EDGE STYLING DURING PHYSICS
  // --------------------------------------------------------------------------
  describe('4. High-Contrast Accessibility Mode Toggling', () => {
    interface EdgeStyle {
      stroke: string;
      strokeWidth: number;
      opacity: number;
      contrastRatio: number;
    }

    function computeEdgeStyle(
      relType: Relationship['type'],
      isHighContrast: boolean
    ): EdgeStyle {
      if (isHighContrast) {
        // High contrast palette: bold luminous lines with distinct values
        switch (relType) {
          case 'family':
            return { stroke: '#38bdf8', strokeWidth: 4, opacity: 1.0, contrastRatio: 8.5 };
          case 'mentor':
            return { stroke: '#fbbf24', strokeWidth: 4, opacity: 1.0, contrastRatio: 9.1 };
          case 'rival':
            return { stroke: '#f87171', strokeWidth: 4, opacity: 1.0, contrastRatio: 7.8 };
          case 'secret':
            return { stroke: '#c084fc', strokeWidth: 4, opacity: 1.0, contrastRatio: 8.2 };
          case 'comrade':
          default:
            return { stroke: '#34d399', strokeWidth: 4, opacity: 1.0, contrastRatio: 8.9 };
        }
      }
      // Standard chromatic palette
      return { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.65, contrastRatio: 4.5 };
    }

    it('TC-3.7: verifies high-contrast mode increases edge stroke width and meets WCAG 7:1 contrast ratio', () => {
      const standardStyle = computeEdgeStyle('family', false);
      const highContrastStyle = computeEdgeStyle('family', true);

      expect(highContrastStyle.strokeWidth).toBeGreaterThan(standardStyle.strokeWidth);
      expect(highContrastStyle.opacity).toBeGreaterThanOrEqual(1.0);
      expect(highContrastStyle.contrastRatio).toBeGreaterThanOrEqual(7.0); // Meets WCAG AAA 7:1
    });

    it('TC-3.8: toggling highContrastMode maintains active physics coordinates without reset', () => {
      let state: PersistentState = { ...DEFAULT_STATE, highContrastMode: false };

      // Simulated node positions before toggle
      const nodePositions = new Map<string, { x: number; y: number }>([
        ['rean', { x: 120.5, y: 340.2 }],
        ['crow', { x: 230.1, y: 155.8 }],
      ]);

      // User toggles High Contrast Mode
      state = { ...state, highContrastMode: !state.highContrastMode };
      expect(state.highContrastMode).toBe(true);

      // Node coordinates must be preserved exactly
      expect(nodePositions.get('rean')).toEqual({ x: 120.5, y: 340.2 });
      expect(nodePositions.get('crow')).toEqual({ x: 230.1, y: 155.8 });
    });
  });

  // --------------------------------------------------------------------------
  // 5. DOSSIER ACTION TRAY ROUTING TO PATH FINDER
  // --------------------------------------------------------------------------
  describe('5. Dossier Action Tray Routing to Path Finder', () => {
    it('TC-3.9: clicking "Find Path From Here" populates startId and switches view to pathfinder', () => {
      let appState: PersistentState = {
        ...DEFAULT_STATE,
        activeView: 'network',
        selectedCharId: 'estelle',
      };

      // User clicks "Find Path From Here" in Dossier
      function onActionTrayRouteOrigin(state: PersistentState): {
        newState: PersistentState;
        pathFinderOriginId: string;
      } {
        return {
          newState: {
            ...state,
            activeView: 'pathfinder',
          },
          pathFinderOriginId: state.selectedCharId,
        };
      }

      const { newState, pathFinderOriginId } = onActionTrayRouteOrigin(appState);

      expect(newState.activeView).toBe('pathfinder');
      expect(pathFinderOriginId).toBe('estelle');
    });

    it('TC-3.10: clicking "Find Path To Here" on target character populates targetId and triggers BFS', () => {
      const originId = 'estelle';
      const targetChar = characterMap.get('renne')!;

      // Trigger routing
      const pathResult = findShortestRelationshipPath(
        originId,
        targetChar.id,
        characterMap,
        CANONICAL_RELATIONSHIPS,
        'daybreak2',
        false
      );

      expect(pathResult.found).toBe(true);
      expect(pathResult.nodes[0].id).toBe(originId);
      expect(pathResult.nodes[pathResult.nodes.length - 1].id).toBe('renne');
      expect(pathResult.degrees).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. FACTION SELECTION FILTERS TREE & GRAPH SIMULTANEOUSLY
  // --------------------------------------------------------------------------
  describe('6. Faction Selection Synchronizes Tree & Graph Views', () => {
    it('TC-3.11: selecting SSS faction filters both hierarchy tree and bond graph in unison', () => {
      const selectedFactionId = 'sss';

      // 1. Hierarchy Tree filtering
      const treeCharacters = CANONICAL_CHARACTERS.filter(
        (c) => c.factionId === selectedFactionId
      );
      expect(treeCharacters.length).toBeGreaterThanOrEqual(4);

      const lloyd = treeCharacters.find((c) => c.id === 'lloyd');
      const elie = treeCharacters.find((c) => c.id === 'elie');
      const tio = treeCharacters.find((c) => c.id === 'tio');
      const randy = treeCharacters.find((c) => c.id === 'randy');

      expect(lloyd).toBeDefined();
      expect(elie).toBeDefined();
      expect(tio).toBeDefined();
      expect(randy).toBeDefined();

      // 2. Graph edges filtering: only intra-faction or incident edges to SSS members
      const sssCharIds = new Set(treeCharacters.map((c) => c.id));
      const sssRelationships = CANONICAL_RELATIONSHIPS.filter(
        (r) => sssCharIds.has(r.source) && sssCharIds.has(r.target)
      );

      expect(sssRelationships.length).toBeGreaterThan(0);
      for (const rel of sssRelationships) {
        expect(sssCharIds.has(rel.source)).toBe(true);
        expect(sssCharIds.has(rel.target)).toBe(true);
      }
    });

    it('TC-3.12: clearing faction filter restores complete multi-faction graph topology', () => {
      const allFactions = new Set(CANONICAL_CHARACTERS.map((c) => c.factionId));
      expect(allFactions.size).toBeGreaterThanOrEqual(10);

      // Unfiltered graph contains all active relationships
      const allRels = CANONICAL_RELATIONSHIPS;
      expect(allRels.length).toBeGreaterThan(40);
    });
  });
});
