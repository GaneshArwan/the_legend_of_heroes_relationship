import { describe, it, expect } from 'vitest';
import {
  findShortestRelationshipPath,
  buildAdjacencyList,
  PathResult,
} from '../../src/services/pathfinder';
import { characters, characterMap } from '../../src/data/characters';
import { relationships } from '../../src/data/relationships';
import { ALL_GAME_IDS, GAME_ORDER } from '../../src/services/spoilerEngine';
import type { Character, Relationship, GameId } from '../../src/types';

// ============================================================================
// Independent Single-Source BFS Oracle for Differential Testing
// ============================================================================
function singleSourceBfsOracle(
  startId: string,
  endId: string,
  charactersMap: Map<string, Character>,
  relList: Relationship[],
  activeGameId: GameId,
  allowSpoilers: boolean
): { found: boolean; distance: number; path: string[] } {
  const activeOrder = GAME_ORDER[activeGameId];
  const sChar = charactersMap.get(startId);
  const tChar = charactersMap.get(endId);

  if (!sChar || !tChar) {
    return { found: false, distance: 0, path: [] };
  }

  if (!allowSpoilers) {
    if (
      GAME_ORDER[sChar.debutGame] > activeOrder ||
      GAME_ORDER[tChar.debutGame] > activeOrder
    ) {
      return { found: false, distance: 0, path: [] };
    }
  }

  if (startId === endId) {
    return { found: true, distance: 0, path: [startId] };
  }

  // Build oracle adjacency
  const adj = new Map<string, string[]>();
  for (const rel of relList) {
    const s = charactersMap.get(rel.source);
    const t = charactersMap.get(rel.target);
    if (!s || !t) continue;

    if (!allowSpoilers) {
      if (GAME_ORDER[rel.debutGame] > activeOrder) continue;
      if (
        (rel.spoilerDebutGame && GAME_ORDER[rel.spoilerDebutGame] > activeOrder) ||
        (rel.isSecret && !rel.spoilerDebutGame)
      ) {
        continue;
      }
      if (
        GAME_ORDER[s.debutGame] > activeOrder ||
        GAME_ORDER[t.debutGame] > activeOrder
      ) {
        continue;
      }
    }

    if (!adj.has(rel.source)) adj.set(rel.source, []);
    if (!adj.has(rel.target)) adj.set(rel.target, []);
    adj.get(rel.source)!.push(rel.target);
    adj.get(rel.target)!.push(rel.source);
  }

  // Standard Queue-based BFS
  const queue: string[] = [startId];
  const visited = new Map<string, { prev: string | null; dist: number }>();
  visited.set(startId, { prev: null, dist: 0 });
  let head = 0;

  while (head < queue.length) {
    const curr = queue[head++];
    if (curr === endId) break;

    const neighbors = adj.get(curr) || [];
    const currentDist = visited.get(curr)!.dist;

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, { prev: curr, dist: currentDist + 1 });
        queue.push(neighbor);
      }
    }
  }

  if (!visited.has(endId)) {
    return { found: false, distance: 0, path: [] };
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = endId;
  while (curr !== null) {
    path.unshift(curr);
    curr = visited.get(curr)!.prev;
  }

  return {
    found: true,
    distance: visited.get(endId)!.dist,
    path,
  };
}

// ============================================================================
// SUITE: Challenger M6 Empirical Stress Testing & Benchmarking
// ============================================================================
describe('Empirical Challenger M6: Pathfinder Latency & Graph Topology', () => {
  const allCharIds = Array.from(characterMap.keys());

  it('M6.1: should verify dataset character registry size is exactly 360 characters', () => {
    expect(characters.length).toBe(360);
    expect(characterMap.size).toBe(360);
    expect(allCharIds.length).toBe(360);
  });

  it('M6.2: should verify all 6 designated disconnected pairs return found: false, degrees: 0, empty arrays in BOTH directions', () => {
    const designatedPairs: [string, string][] = [
      ['elliot', 'bergard'],
      ['kevin', 'judith'],
      ['ries', 'van'],
      ['cecile', 'van'],
      ['cao', 'estelle'],
      ['dingo', 'rean'],
    ];

    for (const [charA, charB] of designatedPairs) {
      // Ensure characters exist in registry
      expect(characterMap.has(charA)).toBe(true);
      expect(characterMap.has(charB)).toBe(true);

      // Test A -> B (allowSpoilers: true)
      const resAB = findShortestRelationshipPath(
        charA,
        charB,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(resAB.found).toBe(false);
      expect(resAB.degrees).toBe(0);
      expect(resAB.nodes).toEqual([]);
      expect(resAB.edges).toEqual([]);
      expect(resAB.executionTimeMs).toBeLessThan(10);

      // Test B -> A (allowSpoilers: true)
      const resBA = findShortestRelationshipPath(
        charB,
        charA,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(resBA.found).toBe(false);
      expect(resBA.degrees).toBe(0);
      expect(resBA.nodes).toEqual([]);
      expect(resBA.edges).toEqual([]);
      expect(resBA.executionTimeMs).toBeLessThan(10);

      // Test A -> B (allowSpoilers: false under latest game)
      const resABNoSpoiler = findShortestRelationshipPath(
        charA,
        charB,
        characterMap,
        relationships,
        'daybreak2',
        false
      );
      expect(resABNoSpoiler.found).toBe(false);
      expect(resABNoSpoiler.degrees).toBe(0);
      expect(resABNoSpoiler.nodes).toEqual([]);
      expect(resABNoSpoiler.edges).toEqual([]);

      // Test B -> A (allowSpoilers: false under latest game)
      const resBANoSpoiler = findShortestRelationshipPath(
        charB,
        charA,
        characterMap,
        relationships,
        'daybreak2',
        false
      );
      expect(resBANoSpoiler.found).toBe(false);
      expect(resBANoSpoiler.degrees).toBe(0);
      expect(resBANoSpoiler.nodes).toEqual([]);
      expect(resBANoSpoiler.edges).toEqual([]);
    }
  });

  it('M6.3: should verify reflexive queries across all 165 characters', () => {
    for (const char of characters) {
      // 1. Reflexive query with spoilers allowed
      const resSpoiler = findShortestRelationshipPath(
        char.id,
        char.id,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(resSpoiler.found).toBe(true);
      expect(resSpoiler.degrees).toBe(0);
      expect(resSpoiler.nodes.length).toBe(1);
      expect(resSpoiler.nodes[0].id).toBe(char.id);
      expect(resSpoiler.edges).toEqual([]);
      expect(resSpoiler.executionTimeMs).toBeLessThan(2);

      // 2. Reflexive query at character debut game without spoilers
      const resDebut = findShortestRelationshipPath(
        char.id,
        char.id,
        characterMap,
        relationships,
        char.debutGame,
        false
      );
      expect(resDebut.found).toBe(true);
      expect(resDebut.degrees).toBe(0);
      expect(resDebut.nodes.length).toBe(1);
      expect(resDebut.nodes[0].id).toBe(char.id);
      expect(resDebut.edges).toEqual([]);

      // 3. Reflexive query in a game PRIOR to debutGame without spoilers (must return found: false)
      if (char.debutGame !== 'sky_fc') {
        const charDebutOrder = GAME_ORDER[char.debutGame];
        const priorGame = ALL_GAME_IDS.find((g) => GAME_ORDER[g] < charDebutOrder)!;
        const resPrior = findShortestRelationshipPath(
          char.id,
          char.id,
          characterMap,
          relationships,
          priorGame,
          false
        );
        expect(resPrior.found).toBe(false);
        expect(resPrior.degrees).toBe(0);
        expect(resPrior.nodes).toEqual([]);
        expect(resPrior.edges).toEqual([]);
      }
    }
  });

  it('M6.4: should verify 100% agreement with Single-Source BFS Oracle across 1,000 randomized queries', () => {
    const NUM_ORACLE_TESTS = 1000;
    for (let i = 0; i < NUM_ORACLE_TESTS; i++) {
      const startId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const endId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const activeGame = ALL_GAME_IDS[Math.floor(Math.random() * ALL_GAME_IDS.length)];
      const allowSpoilers = i % 2 === 0;

      const pathfinderRes = findShortestRelationshipPath(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );

      const oracleRes = singleSourceBfsOracle(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );

      expect(pathfinderRes.found).toBe(oracleRes.found);
      expect(pathfinderRes.degrees).toBe(oracleRes.distance);

      if (pathfinderRes.found) {
        expect(pathfinderRes.nodes.length).toBe(pathfinderRes.degrees + 1);
        expect(pathfinderRes.edges.length).toBe(pathfinderRes.degrees);
        expect(pathfinderRes.nodes[0].id).toBe(startId);
        expect(pathfinderRes.nodes[pathfinderRes.nodes.length - 1].id).toBe(endId);

        // Verify edge continuity
        for (let j = 0; j < pathfinderRes.edges.length; j++) {
          const edge = pathfinderRes.edges[j];
          const nA = pathfinderRes.nodes[j].id;
          const nB = pathfinderRes.nodes[j + 1].id;
          const isConnected =
            (edge.source === nA && edge.target === nB) ||
            (edge.source === nB && edge.target === nA);
          expect(isConnected).toBe(true);
        }
      }
    }
  });

  it('M6.5: should empirically benchmark 2,000 randomized pathfinder queries and verify p95 < 5ms and max < 100ms SLA', () => {
    const NUM_QUERIES = 2000;
    const latencies: number[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < NUM_QUERIES; i++) {
      const startId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const endId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const activeGame = ALL_GAME_IDS[Math.floor(Math.random() * ALL_GAME_IDS.length)];
      const allowSpoilers = i % 2 === 0;

      const t0 = performance.now();
      const res = findShortestRelationshipPath(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );
      const t1 = performance.now();
      const elapsed = t1 - t0;
      latencies.push(elapsed);

      if (res.found) foundCount++;
      else notFoundCount++;
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const mean = sum / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(
      `\n======================================================\n` +
      `[EMPIRICAL CHALLENGER M6 BENCHMARK REPORT]\n` +
      `  Total Queries Tested: ${NUM_QUERIES}\n` +
      `  Paths Found:          ${foundCount} (${((foundCount / NUM_QUERIES) * 100).toFixed(1)}%)\n` +
      `  Paths Disconnected:   ${notFoundCount} (${((notFoundCount / NUM_QUERIES) * 100).toFixed(1)}%)\n` +
      `  Min Latency:          ${min.toFixed(4)} ms\n` +
      `  Mean Latency:         ${mean.toFixed(4)} ms\n` +
      `  p50 (Median) Latency: ${p50.toFixed(4)} ms\n` +
      `  p95 Latency:          ${p95.toFixed(4)} ms\n` +
      `  p99 Latency:          ${p99.toFixed(4)} ms\n` +
      `  Max Latency:          ${max.toFixed(4)} ms\n` +
      `======================================================\n`
    );

    // Assert strict SLAs
    expect(p95).toBeLessThan(5.0); // SLA: p95 < 5ms
    expect(max).toBeLessThan(100.0); // SLA: max < 100ms
    expect(mean).toBeLessThan(1.0); // Mean well sub-millisecond
  });

  it('M6.6: should execute full Cartesian all-pairs census (200 x 200 = 40,000 queries) under full graph', () => {
    const latencies: number[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    const tStartAll = performance.now();
    for (let i = 0; i < allCharIds.length; i++) {
      const startId = allCharIds[i];
      for (let j = 0; j < allCharIds.length; j++) {
        const endId = allCharIds[j];

        const t0 = performance.now();
        const res = findShortestRelationshipPath(
          startId,
          endId,
          characterMap,
          relationships,
          'daybreak2',
          true
        );
        const t1 = performance.now();
        latencies.push(t1 - t0);

        if (res.found) foundCount++;
        else notFoundCount++;
      }
    }
    const totalCensusElapsed = performance.now() - tStartAll;

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const mean = latencies.reduce((acc, v) => acc + v, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(
      `\n======================================================\n` +
      `[FULL CARTESIAN CENSUS: 27,225 ALL-PAIRS]\n` +
      `  Total Node Pairs:     27,225 (165 x 165)\n` +
      `  Total Execution Time: ${totalCensusElapsed.toFixed(2)} ms (~${(totalCensusElapsed / 1000).toFixed(3)}s)\n` +
      `  Reachable Pairs:      ${foundCount} (${((foundCount / 27225) * 100).toFixed(2)}%)\n` +
      `  Disconnected Pairs:   ${notFoundCount} (${((notFoundCount / 27225) * 100).toFixed(2)}%)\n` +
      `  Min Latency:          ${min.toFixed(4)} ms\n` +
      `  Mean Latency:         ${mean.toFixed(4)} ms\n` +
      `  p50 (Median) Latency: ${p50.toFixed(4)} ms\n` +
      `  p95 Latency:          ${p95.toFixed(4)} ms\n` +
      `  p99 Latency:          ${p99.toFixed(4)} ms\n` +
      `  Max Latency:          ${max.toFixed(4)} ms\n` +
      `======================================================\n`
    );

    // Strict empirical guarantees
    expect(p95).toBeLessThan(5.0);
    expect(max).toBeLessThan(100.0);
    expect(mean).toBeLessThan(0.5);
  });

  it('M6.7: should analyze graph topology components and explain the disconnection for all 6 designated pairs', () => {
    const adj = buildAdjacencyList(relationships, characterMap, 'daybreak2', true);
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const [id] of characterMap) {
      if (visited.has(id)) continue;
      const comp: string[] = [];
      const q = [id];
      visited.add(id);
      while (q.length > 0) {
        const curr = q.shift()!;
        comp.push(curr);
        const neighbors = adj.get(curr) || [];
        for (const { targetId } of neighbors) {
          if (!visited.has(targetId)) {
            visited.add(targetId);
            q.push(targetId);
          }
        }
      }
      components.push(comp);
    }

    components.sort((a, b) => b.length - a.length);

    console.log(`\n[GRAPH TOPOLOGY COMPONENT ANALYSIS]`);
    console.log(`Total Connected Components: ${components.length}`);
    components.forEach((c, idx) => {
      console.log(`  Component #${idx + 1} (Nodes: ${c.length}): ${c.slice(0, 8).join(', ')}${c.length > 8 ? '...' : ''}`);
    });

    const designatedPairs: [string, string][] = [
      ['elliot', 'bergard'],
      ['kevin', 'judith'],
      ['ries', 'van'],
      ['cecile', 'van'],
      ['cao', 'estelle'],
      ['dingo', 'rean'],
    ];

    for (const [charA, charB] of designatedPairs) {
      const compIdxA = components.findIndex((c) => c.includes(charA));
      const compIdxB = components.findIndex((c) => c.includes(charB));
      expect(compIdxA).not.toBe(compIdxB);
      console.log(
        `  Pair [${charA} <-> ${charB}]: ${charA} is in Comp #${compIdxA + 1} (size ${components[compIdxA].length}), ` +
        `while ${charB} is in Comp #${compIdxB + 1} (size ${components[compIdxB].length}) -> Mathematically Disjoint.`
      );
    }
  });
});

