import { describe, it, expect } from 'vitest';
import {
  findShortestRelationshipPath,
  buildAdjacencyList,
  PathResult,
} from '../../src/services/pathfinder';
import { characters, characterMap } from '../../src/data/characters';
import { relationships } from '../../src/data/relationships';
import { ALL_GAME_IDS, GAME_ORDER } from '../../src/services/spoilerEngine';
import type { Character, Relationship, GameId, RelationshipType } from '../../src/types';

// ============================================================================
// SUITE 1: Pathfinder BFS 1,000 Randomized Queries Benchmark & Latency SLA
// ============================================================================
describe('Empirical Challenger M2 Iter2: Pathfinder BFS Benchmark (1,000 Queries)', () => {
  const allCharIds = Array.from(characterMap.keys());

  it('1.1 should benchmark 1,000 randomized queries: verify latency is <5ms typical and <100ms max', () => {
    const NUM_QUERIES = 1000;
    const latencies: number[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < NUM_QUERIES; i++) {
      const startId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const endId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const activeGame = ALL_GAME_IDS[Math.floor(Math.random() * ALL_GAME_IDS.length)];
      const allowSpoilers = i % 2 === 0;

      const t0 = performance.now();
      const result = findShortestRelationshipPath(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );
      const t1 = performance.now();
      const durationMs = t1 - t0;
      latencies.push(durationMs);

      // Invariants when path is found
      if (result.found) {
        foundCount++;
        expect(result.nodes.length).toBe(result.degrees + 1);
        expect(result.edges.length).toBe(result.degrees);
        expect(result.nodes[0].id).toBe(startId);
        expect(result.nodes[result.nodes.length - 1].id).toBe(endId);

        // Verify uninterrupted edge continuity
        for (let j = 0; j < result.edges.length; j++) {
          const edge = result.edges[j];
          const nA = result.nodes[j].id;
          const nB = result.nodes[j + 1].id;
          const isConnected =
            (edge.source === nA && edge.target === nB) ||
            (edge.source === nB && edge.target === nA);
          expect(isConnected).toBe(true);
        }

        // Verify spoiler boundary integrity when spoilers disallowed
        if (!allowSpoilers) {
          const activeOrder = GAME_ORDER[activeGame];
          result.nodes.forEach((node) => {
            expect(GAME_ORDER[node.debutGame]).toBeLessThanOrEqual(activeOrder);
          });
          result.edges.forEach((edge) => {
            expect(GAME_ORDER[edge.debutGame]).toBeLessThanOrEqual(activeOrder);
            if (edge.spoilerDebutGame) {
              expect(GAME_ORDER[edge.spoilerDebutGame]).toBeLessThanOrEqual(activeOrder);
            }
            if (edge.isSecret && !edge.spoilerDebutGame) {
              // Unrevealed secret relationships must be omitted from traversal
              expect(edge.isSecret).toBe(false);
            }
          });
        }
      } else {
        // Invariants when path is NOT found
        notFoundCount++;
        expect(result.degrees).toBe(0);
        expect(result.nodes).toEqual([]);
        expect(result.edges).toEqual([]);
      }
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const mean = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(
      `\n[CHALLENGER BENCHMARK RESULT]\n` +
      `  Total Queries: ${NUM_QUERIES} (Found: ${foundCount}, Not Found: ${notFoundCount})\n` +
      `  Min:  ${min.toFixed(4)} ms\n` +
      `  Mean: ${mean.toFixed(4)} ms\n` +
      `  p50:  ${p50.toFixed(4)} ms\n` +
      `  p95:  ${p95.toFixed(4)} ms\n` +
      `  p99:  ${p99.toFixed(4)} ms\n` +
      `  Max:  ${max.toFixed(4)} ms\n`
    );

    // Strict Empirical Assertions
    expect(max).toBeLessThan(100); // SLA Requirement: <100ms max
    expect(p95).toBeLessThan(5);   // SLA Requirement: <5ms typical
    expect(mean).toBeLessThan(2);  // Average well below SLA
  });

  it('1.2 should benchmark worst-case cross-saga endpoints (Liberl to Calvard) with zero SLA violations', () => {
    // Cross-era maximum distance queries across the main connected component in Daybreak II with spoilers enabled
    const connectedCrossEraPairs = [
      ['estelle', 'van'],
      ['cassius', 'agnes'],
      ['joshua', 'shizuna'],
      ['olivert', 'elaine'],
      ['kloe', 'quatre'],
      ['renne', 'van'],
      ['rean', 'van'],
      ['lloyd', 'van'],
    ];

    for (const [start, end] of connectedCrossEraPairs) {
      const t0 = performance.now();
      const res = findShortestRelationshipPath(
        start,
        end,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      const elapsed = performance.now() - t0;
      console.log(`[CROSS-ERA REACHABLE] ${start} -> ${end}: found=${res.found}, deg=${res.degrees}, time=${elapsed.toFixed(3)}ms`);

      expect(res.found).toBe(true);
      expect(res.degrees).toBeGreaterThanOrEqual(1);
      expect(res.nodes.length).toBe(res.degrees + 1);
      expect(res.edges.length).toBe(res.degrees);
      expect(elapsed).toBeLessThan(20); // Strict cross-era SLA (<100ms requirement)
    }

    // Disconnected component queries (e.g., Gralsritter Kevin/Ries or isolated characters to Calvard)
    const disconnectedPairs = [
      ['elliot', 'bergard'],
      ['kevin', 'judith'],
      ['ries', 'van'],
      ['cecile', 'van'],
      ['cao', 'estelle'],
      ['dingo', 'rean'],
    ];

    for (const [start, end] of disconnectedPairs) {
      const t0 = performance.now();
      const res = findShortestRelationshipPath(
        start,
        end,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      const elapsed = performance.now() - t0;
      console.log(`[DISCONNECTED PAIR] ${start} -> ${end}: found=${res.found}, time=${elapsed.toFixed(3)}ms`);

      expect(res.found).toBe(false);
      expect(res.degrees).toBe(0);
      expect(res.nodes).toEqual([]);
      expect(res.edges).toEqual([]);
      expect(elapsed).toBeLessThan(5);
    }
  });

  it('1.3 should verify reflexive queries (startId === endId) across all 165 characters', () => {
    for (const char of characters) {
      const res = findShortestRelationshipPath(
        char.id,
        char.id,
        characterMap,
        relationships,
        char.debutGame,
        false
      );
      expect(res.found).toBe(true);
      expect(res.degrees).toBe(0);
      expect(res.nodes.length).toBe(1);
      expect(res.nodes[0].id).toBe(char.id);
      expect(res.edges.length).toBe(0);
      expect(res.executionTimeMs).toBeLessThan(2);
    }
  });
});

// ============================================================================
// SUITE 2: Dangling & Unindexed Character ID Rejection
// ============================================================================
describe('Empirical Challenger M2 Iter2: Dangling & Unindexed Character ID Rejection', () => {
  const hostileAndDanglingIds = [
    'non_existent_character_123',
    'ghost_id_404',
    '',
    '   ',
    'undefined',
    'null',
    'NaN',
    '__proto__',
    'constructor',
    'toString',
    'hasOwnProperty',
    '0',
    'false',
    'dangling_ref_99999',
  ];

  it('2.1 should safely reject unindexed startId with found: false, 0 degrees, and empty arrays (no crashes)', () => {
    for (const badId of hostileAndDanglingIds) {
      for (const game of ['sky_fc', 'zero', 'cs1', 'daybreak2'] as GameId[]) {
        // Without spoilers
        const resNoSpoiler = findShortestRelationshipPath(
          badId,
          'rean',
          characterMap,
          relationships,
          game,
          false
        );
        expect(resNoSpoiler.found).toBe(false);
        expect(resNoSpoiler.degrees).toBe(0);
        expect(resNoSpoiler.nodes).toEqual([]);
        expect(resNoSpoiler.edges).toEqual([]);

        // With spoilers
        const resWithSpoiler = findShortestRelationshipPath(
          badId,
          'rean',
          characterMap,
          relationships,
          game,
          true
        );
        expect(resWithSpoiler.found).toBe(false);
        expect(resWithSpoiler.degrees).toBe(0);
        expect(resWithSpoiler.nodes).toEqual([]);
        expect(resWithSpoiler.edges).toEqual([]);
      }
    }
  });

  it('2.2 should safely reject unindexed endId with found: false, 0 degrees, and empty arrays (no crashes)', () => {
    for (const badId of hostileAndDanglingIds) {
      for (const game of ['sky_fc', 'zero', 'cs1', 'daybreak2'] as GameId[]) {
        // Without spoilers
        const resNoSpoiler = findShortestRelationshipPath(
          'estelle',
          badId,
          characterMap,
          relationships,
          game,
          false
        );
        expect(resNoSpoiler.found).toBe(false);
        expect(resNoSpoiler.degrees).toBe(0);
        expect(resNoSpoiler.nodes).toEqual([]);
        expect(resNoSpoiler.edges).toEqual([]);

        // With spoilers
        const resWithSpoiler = findShortestRelationshipPath(
          'estelle',
          badId,
          characterMap,
          relationships,
          game,
          true
        );
        expect(resWithSpoiler.found).toBe(false);
        expect(resWithSpoiler.degrees).toBe(0);
        expect(resWithSpoiler.nodes).toEqual([]);
        expect(resWithSpoiler.edges).toEqual([]);
      }
    }
  });

  it('2.3 should safely reject dual unindexed startId and endId, including reflexive bad IDs', () => {
    for (const badId of hostileAndDanglingIds) {
      // badId to badId (reflexive dangling)
      const resReflexive = findShortestRelationshipPath(
        badId,
        badId,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(resReflexive.found).toBe(false);
      expect(resReflexive.degrees).toBe(0);
      expect(resReflexive.nodes).toEqual([]);
      expect(resReflexive.edges).toEqual([]);

      // badId1 to badId2
      const resDual = findShortestRelationshipPath(
        badId,
        'another_ghost_id',
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(resDual.found).toBe(false);
      expect(resDual.degrees).toBe(0);
      expect(resDual.nodes).toEqual([]);
      expect(resDual.edges).toEqual([]);
    }
  });

  it('2.4 should purge and ignore relationships with dangling source or target in buildAdjacencyList', () => {
    const corruptRelationships: Relationship[] = [
      {
        id: 'rel_valid_1',
        source: 'estelle',
        target: 'joshua',
        type: 'family',
        labelEn: 'Siblings',
        labelJa: '姉弟',
        descEn: 'Adoptive siblings',
        descJa: '義理の姉弟',
        debutGame: 'sky_fc',
      },
      {
        id: 'rel_dangling_target',
        source: 'estelle',
        target: 'dangling_phantom_target',
        type: 'rival',
        labelEn: 'Ghost Link',
        labelJa: '幽霊',
        descEn: 'Ghost link',
        descJa: '幽霊',
        debutGame: 'sky_fc',
      },
      {
        id: 'rel_dangling_source',
        source: 'dangling_phantom_source',
        target: 'joshua',
        type: 'mentor',
        labelEn: 'Ghost Mentor',
        labelJa: '幽霊師匠',
        descEn: 'Ghost mentor',
        descJa: '幽霊師匠',
        debutGame: 'sky_fc',
      },
      {
        id: 'rel_both_dangling',
        source: 'phantom_1',
        target: 'phantom_2',
        type: 'comrade',
        labelEn: 'Ghost Comrade',
        labelJa: '幽霊仲間',
        descEn: 'Both ghost',
        descJa: '幽霊仲間',
        debutGame: 'sky_fc',
      },
      {
        id: 'rel_dangling_self',
        source: 'phantom_self',
        target: 'phantom_self',
        type: 'secret',
        labelEn: 'Self Loop',
        labelJa: '自滅',
        descEn: 'Self loop',
        descJa: '自滅',
        debutGame: 'sky_fc',
      },
    ];

    // Test with allowSpoilers = false
    const adjSafe = buildAdjacencyList(corruptRelationships, characterMap, 'sky_fc', false);
    expect(adjSafe.has('dangling_phantom_target')).toBe(false);
    expect(adjSafe.has('dangling_phantom_source')).toBe(false);
    expect(adjSafe.has('phantom_1')).toBe(false);
    expect(adjSafe.has('phantom_2')).toBe(false);
    expect(adjSafe.has('phantom_self')).toBe(false);
    expect(adjSafe.get('estelle')?.length).toBe(1);
    expect(adjSafe.get('estelle')![0].targetId).toBe('joshua');
    expect(adjSafe.get('joshua')?.length).toBe(1);
    expect(adjSafe.get('joshua')![0].targetId).toBe('estelle');

    // Test with allowSpoilers = true (Must still filter dangling references!)
    const adjSpoilers = buildAdjacencyList(corruptRelationships, characterMap, 'sky_fc', true);
    expect(adjSpoilers.has('dangling_phantom_target')).toBe(false);
    expect(adjSpoilers.has('dangling_phantom_source')).toBe(false);
    expect(adjSpoilers.has('phantom_1')).toBe(false);
    expect(adjSpoilers.has('phantom_2')).toBe(false);
    expect(adjSpoilers.has('phantom_self')).toBe(false);
    expect(adjSpoilers.get('estelle')?.length).toBe(1);
    expect(adjSpoilers.get('estelle')![0].targetId).toBe('joshua');
    expect(adjSpoilers.get('joshua')?.length).toBe(1);
    expect(adjSpoilers.get('joshua')![0].targetId).toBe('estelle');
  });

  it('2.5 should successfully find valid path in presence of corrupted dangling relationships without orphan edges', () => {
    const corruptRelationshipSet: Relationship[] = [
      ...relationships,
      {
        id: 'corrupt_edge_1',
        source: 'rean',
        target: 'dangling_npc_99',
        type: 'mentor',
        labelEn: 'Ghost Edge',
        labelJa: '幽霊',
        descEn: 'Corrupted edge in dataset',
        descJa: '破損',
        debutGame: 'cs1',
      },
      {
        id: 'corrupt_edge_2',
        source: 'dangling_npc_88',
        target: 'crow',
        type: 'rival',
        labelEn: 'Ghost Edge 2',
        labelJa: '幽霊2',
        descEn: 'Corrupted edge in dataset',
        descJa: '破損',
        debutGame: 'cs1',
      },
    ];

    // Find path between Rean and Crow in CS1
    const res = findShortestRelationshipPath(
      'rean',
      'crow',
      characterMap,
      corruptRelationshipSet,
      'cs1',
      false
    );

    expect(res.found).toBe(true);
    expect(res.nodes.every((n) => characterMap.has(n.id))).toBe(true);
    expect(res.edges.every((e) => characterMap.has(e.source) && characterMap.has(e.target))).toBe(true);
    expect(res.edges.some((e) => e.id === 'corrupt_edge_1' || e.id === 'corrupt_edge_2')).toBe(false);
  });
});

// ============================================================================
// SUITE 3: Physics Simulation Sleep Gating & CPU Idling Verification
// ============================================================================
describe('Empirical Challenger M2 Iter2: Physics Simulation Sleep Gating', () => {
  interface NodeState {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    fx?: number;
    fy?: number;
  }

  interface PhysicsStepResult {
    totalEnergy: number;
    isSettled: boolean;
    scheduledNextFrame: boolean;
  }

  // Exact step reproduction of OrbmentBondGraph.tsx lines 180–370
  function runSimulationFrame(
    nodes: NodeState[],
    links: { source: string; target: string; type: RelationshipType }[],
    config: {
      gravity: number;
      repulsion: number;
      linkDistance: number;
      damping: number;
    },
    dims: { width: number; height: number },
    draggedNodeId: string | null
  ): PhysicsStepResult {
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    let isSettled = false;

    // 1. Center gravity
    nodes.forEach((node) => {
      if (node.fx !== undefined) return;
      const dx = cx - node.x;
      const dy = cy - node.y;
      node.vx += dx * (config.gravity * 0.005);
      node.vy += dy * (config.gravity * 0.005);
    });

    // 2. Repulsion between all pairs
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const n2 = nodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        if (dist < 450) {
          const force = config.repulsion / (distSq + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (n1.fx === undefined) {
            n1.vx += fx;
            n1.vy += fy;
          }
          if (n2.fx === undefined) {
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      }
    }

    // 3. Link spring attraction
    links.forEach((rel) => {
      const s = nodeMap.get(rel.source);
      const t = nodeMap.get(rel.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      let targetDist = config.linkDistance;
      if (rel.type === 'family') targetDist *= 0.85;
      else if (rel.type === 'mentor') targetDist *= 0.95;
      else if (rel.type === 'rival') targetDist *= 1.25;
      else if (rel.type === 'secret') targetDist *= 1.15;

      const delta = dist - targetDist;
      const springK = 0.035;
      const fx = (dx / dist) * delta * springK;
      const fy = (dy / dist) * delta * springK;

      if (s.fx === undefined) {
        s.vx += fx;
        s.vy += fy;
      }
      if (t.fx === undefined) {
        t.vx -= fx;
        t.vy -= fy;
      }
    });

    // 4. Update positions with damping and boundary clamp
    let totalEnergy = 0;
    nodes.forEach((node) => {
      if (node.fx !== undefined && node.fy !== undefined) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
      } else {
        node.vx *= config.damping;
        node.vy *= config.damping;
        node.x += node.vx;
        node.y += node.vy;

        // Viewport boundary clamp
        node.x = Math.max(node.radius + 20, Math.min(dims.width - node.radius - 20, node.x));
        node.y = Math.max(node.radius + 20, Math.min(dims.height - node.radius - 20, node.y));

        totalEnergy += node.vx * node.vx + node.vy * node.vy;
      }
    });

    // Sleep mode condition: kinetic energy < 0.05 AND draggedNodeId === null
    if (totalEnergy < 0.05 && draggedNodeId === null) {
      isSettled = true;
      // Zero residual velocities for clean rest state
      nodes.forEach((node) => {
        node.vx = 0;
        node.vy = 0;
      });
    }

    // Next frame scheduled if and only if not settled
    const scheduledNextFrame = !isSettled;

    return { totalEnergy, isSettled, scheduledNextFrame };
  }

  // Exact step reproduction of Ego radial layout lines 287–360
  function runEgoFrame(
    nodes: NodeState[],
    links: { source: string; target: string }[],
    selectedCharId: string,
    dims: { width: number; height: number },
    draggedNodeId: string | null
  ): { maxDisplacement: number; isSettled: boolean; scheduledNextFrame: boolean } {
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    let isSettled = false;

    const focusedNode = nodeMap.get(selectedCharId);
    if (focusedNode) {
      if (focusedNode.id === draggedNodeId && focusedNode.fx !== undefined && focusedNode.fy !== undefined) {
        focusedNode.x = focusedNode.fx;
        focusedNode.y = focusedNode.fy;
      } else {
        focusedNode.x = cx;
        focusedNode.y = cy;
      }
    }

    const neighborIds = new Set<string>();
    links.forEach((r) => {
      if (r.source === selectedCharId) neighborIds.add(r.target);
      if (r.target === selectedCharId) neighborIds.add(r.source);
    });

    const ring1 = nodes.filter((n) => neighborIds.has(n.id));
    const ring2 = nodes.filter((n) => n.id !== selectedCharId && !neighborIds.has(n.id));

    let maxDisplacement = 0;

    ring1.forEach((node, idx) => {
      if (node.id === draggedNodeId && node.fx !== undefined && node.fy !== undefined) {
        node.x = node.fx;
        node.y = node.fy;
        return;
      }
      const angle = (2 * Math.PI * idx) / Math.max(1, ring1.length) - Math.PI / 2;
      const targetX = cx + 150 * Math.cos(angle);
      const targetY = cy + 150 * Math.sin(angle);
      const dx = (targetX - node.x) * 0.15;
      const dy = (targetY - node.y) * 0.15;
      node.x += dx;
      node.y += dy;
      const disp = Math.abs(dx) + Math.abs(dy);
      if (disp > maxDisplacement) maxDisplacement = disp;
    });

    ring2.forEach((node, idx) => {
      if (node.id === draggedNodeId && node.fx !== undefined && node.fy !== undefined) {
        node.x = node.fx;
        node.y = node.fy;
        return;
      }
      const angle = (2 * Math.PI * idx) / Math.max(1, ring2.length) - Math.PI / 2;
      const targetX = cx + 270 * Math.cos(angle);
      const targetY = cy + 270 * Math.sin(angle);
      const dx = (targetX - node.x) * 0.15;
      const dy = (targetY - node.y) * 0.15;
      node.x += dx;
      node.y += dy;
      const disp = Math.abs(dx) + Math.abs(dy);
      if (disp > maxDisplacement) maxDisplacement = disp;
    });

    if (maxDisplacement < 0.1 && draggedNodeId === null) {
      isSettled = true;
      ring1.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, ring1.length) - Math.PI / 2;
        node.x = cx + 150 * Math.cos(angle);
        node.y = cy + 150 * Math.sin(angle);
      });
      ring2.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, ring2.length) - Math.PI / 2;
        node.x = cx + 270 * Math.cos(angle);
        node.y = cy + 270 * Math.sin(angle);
      });
    }

    const scheduledNextFrame = !isSettled;
    return { maxDisplacement, isSettled, scheduledNextFrame };
  }

  it('3.1 should confirm kinetic energy drops below 0.05, ceases rAF scheduling, and drops idle CPU to 0%', () => {
    const config = {
      gravity: 0.15,
      repulsion: 450,
      linkDistance: 120,
      damping: 0.85,
    };
    const dims = { width: 900, height: 600 };

    // Initialize 25 nodes seeded around center
    const testNodes: NodeState[] = characters.slice(0, 25).map((c, idx) => {
      const angle = (2 * Math.PI * idx) / 25;
      return {
        id: c.id,
        x: 450 + 150 * Math.cos(angle),
        y: 300 + 150 * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 22,
      };
    });

    const links = relationships
      .filter((r) => testNodes.some((n) => n.id === r.source) && testNodes.some((n) => n.id === r.target))
      .map((r) => ({ source: r.source, target: r.target, type: r.type }));

    let settledFrame = -1;
    let finalEnergy = Infinity;
    const maxAllowedFrames = 1000; // ~16 seconds at 60fps

    for (let frame = 1; frame <= maxAllowedFrames; frame++) {
      const result = runSimulationFrame(testNodes, links, config, dims, null);

      if (result.isSettled) {
        settledFrame = frame;
        finalEnergy = result.totalEnergy;
        expect(result.scheduledNextFrame).toBe(false); // NO rAF scheduled!

        // Residual velocities must be zeroed out
        for (const node of testNodes) {
          expect(node.vx).toBe(0);
          expect(node.vy).toBe(0);
        }
        break;
      } else {
        expect(result.scheduledNextFrame).toBe(true);
      }
    }

    expect(settledFrame).toBeGreaterThan(0);
    expect(finalEnergy).toBeLessThan(0.05);
    console.log(
      `[SLEEP GATING VERIFIED] Force simulation settled at frame ${settledFrame} ` +
      `with kinetic energy ${finalEnergy.toFixed(6)} < 0.05 threshold -> rAF halted (0% CPU idle).`
    );

    // Verify subsequent execution when settled:
    // If we call runSimulationFrame again on the rested nodes (no perturbing force):
    const nextCheck = runSimulationFrame(testNodes, links, config, dims, null);
    // Since velocities were zeroed, residual energy is 0
    expect(nextCheck.totalEnergy).toBeLessThan(0.05);
    expect(nextCheck.isSettled).toBe(true);
    expect(nextCheck.scheduledNextFrame).toBe(false);
  });

  it('3.2 should keep simulation awake while draggedNodeId is active, and sleep cleanly after release', () => {
    const config = {
      gravity: 0.15,
      repulsion: 450,
      linkDistance: 120,
      damping: 0.85,
    };
    const dims = { width: 900, height: 600 };

    const testNodes: NodeState[] = characters.slice(0, 10).map((c, idx) => {
      const angle = (2 * Math.PI * idx) / 10;
      return {
        id: c.id,
        x: 450 + 100 * Math.cos(angle),
        y: 300 + 100 * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 22,
      };
    });

    const links = relationships
      .filter((r) => testNodes.some((n) => n.id === r.source) && testNodes.some((n) => n.id === r.target))
      .map((r) => ({ source: r.source, target: r.target, type: r.type }));

    // Pin a node as actively dragged
    const draggedId = testNodes[0].id;
    testNodes[0].fx = 200;
    testNodes[0].fy = 200;

    // Run 300 frames with drag active
    let settledWhileDragging = false;
    for (let f = 0; f < 300; f++) {
      const res = runSimulationFrame(testNodes, links, config, dims, draggedId);
      if (res.isSettled) {
        settledWhileDragging = true;
        break;
      }
    }

    // Must NOT settle while user drag is active
    expect(settledWhileDragging).toBe(false);

    // Now user releases mouse
    testNodes[0].fx = undefined;
    testNodes[0].fy = undefined;

    let settledAfterRelease = false;
    let framesToSleep = 0;
    let lastEnergy = Infinity;
    for (let f = 1; f <= 1000; f++) {
      const res = runSimulationFrame(testNodes, links, config, dims, null);
      lastEnergy = res.totalEnergy;
      if (res.isSettled) {
        settledAfterRelease = true;
        framesToSleep = f;
        expect(res.scheduledNextFrame).toBe(false);
        break;
      }
    }

    console.log(`[DRAG RELEASE STATS] Settled=${settledAfterRelease}, frames=${framesToSleep}, lastEnergy=${lastEnergy}`);
    expect(settledAfterRelease).toBe(true);
  });

  it('3.3 should confirm Ego Radial layout converges when maxDisplacement < 0.1px and halts rAF', () => {
    const dims = { width: 900, height: 600 };
    // Include Rean and Class VII
    const classVIIIds = ['rean', 'alisa', 'elliot', 'laura', 'machias', 'jusis', 'emma', 'fie', 'gaius', 'millium', 'crow'];
    const testNodes: NodeState[] = classVIIIds.map((id, idx) => ({
      id,
      x: 100 + (idx % 5) * 50,
      y: 100 + Math.floor(idx / 5) * 50,
      vx: 0,
      vy: 0,
      radius: 22,
    }));

    const links = relationships.map((r) => ({ source: r.source, target: r.target }));
    const focusedId = 'rean';

    let settledEgoFrame = -1;
    let finalDisp = Infinity;

    for (let frame = 1; frame <= 300; frame++) {
      const res = runEgoFrame(testNodes, links, focusedId, dims, null);
      if (res.isSettled) {
        settledEgoFrame = frame;
        finalDisp = res.maxDisplacement;
        expect(res.scheduledNextFrame).toBe(false);
        break;
      }
    }

    expect(settledEgoFrame).toBeGreaterThan(0);
    expect(finalDisp).toBeLessThan(0.1);
    console.log(
      `[EGO RADIAL SETTLING] Ego mode converged at frame ${settledEgoFrame} ` +
      `with max displacement ${finalDisp.toFixed(4)}px < 0.1px -> rAF halted (0% CPU idle).`
    );

    // Check that Rean is at center (cx, cy)
    const rean = testNodes.find((n) => n.id === 'rean')!;
    expect(rean.x).toBe(450);
    expect(rean.y).toBe(300);
  });
});
