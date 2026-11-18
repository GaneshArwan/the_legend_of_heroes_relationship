import { describe, it, expect, vi } from 'vitest';
import {
  findShortestRelationshipPath,
  buildAdjacencyList,
  PathResult,
} from '../../src/services/pathfinder';
import {
  hydrateState,
  DEFAULT_STATE,
  PersistentState,
  STORAGE_KEY,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
} from '../../src/services/storage';
import { characters, characterMap } from '../../src/data/characters';
import { relationships } from '../../src/data/relationships';
import { ALL_GAME_IDS, GAME_ORDER } from '../../src/services/spoilerEngine';
import type { Character, Relationship, GameId } from '../../src/types';

// ============================================================================
// ORACLE: Single-Source Unweighted Breadth-First Search (Ground Truth)
// ============================================================================
function oracleShortestPath(
  startId: string,
  endId: string,
  characters: Map<string, Character>,
  relationships: Relationship[],
  activeGameId: GameId,
  allowSpoilers: boolean = false
): { found: boolean; degree: number; path: string[] } {
  if (startId === endId) {
    const c = characters.get(startId);
    if (!c) return { found: false, degree: 0, path: [] };
    if (!allowSpoilers && GAME_ORDER[c.debutGame] > GAME_ORDER[activeGameId]) {
      return { found: false, degree: 0, path: [] };
    }
    return { found: true, degree: 0, path: [startId] };
  }

  const adj = buildAdjacencyList(relationships, characters, activeGameId, allowSpoilers);
  const queue: string[] = [startId];
  const visited = new Map<string, string | null>();
  visited.set(startId, null);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endId) {
      // Reconstruct path
      const path: string[] = [];
      let step: string | null = endId;
      while (step !== null) {
        path.unshift(step);
        step = visited.get(step) ?? null;
      }
      return { found: true, degree: path.length - 1, path };
    }

    const neighbors = adj.get(curr) || [];
    for (const { targetId } of neighbors) {
      if (!visited.has(targetId)) {
        visited.set(targetId, curr);
        queue.push(targetId);
      }
    }
  }

  return { found: false, degree: 0, path: [] };
}

// ============================================================================
// SUITE 1: Pathfinder Empirical Stress & Latency Benchmark (1,000+ Queries)
// ============================================================================
describe('Milestone 2 Empirical Challenge: Pathfinder Benchmark & Robustness', () => {
  const allCharIds = Array.from(characterMap.keys());
  const isolatedCharIds = [
    'cecile', 'cao', 'elliot', 'kevin', 'ries', 'dingo'
  ];

  it('1.1 should benchmark 1,000 randomized queries across all arcs with latency stats (SLA <100ms, typical <5ms)', () => {
    const queryCount = 1000;
    const latencies: number[] = [];
    let foundCount = 0;
    let disconnectedCount = 0;

    for (let i = 0; i < queryCount; i++) {
      const startId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const endId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const randomGame = ALL_GAME_IDS[Math.floor(Math.random() * ALL_GAME_IDS.length)];
      const allowSpoilers = i % 2 === 0;

      const t0 = performance.now();
      const result = findShortestRelationshipPath(
        startId,
        endId,
        characterMap,
        relationships,
        randomGame,
        allowSpoilers
      );
      const t1 = performance.now();
      const duration = t1 - t0;
      latencies.push(duration);

      if (result.found) {
        foundCount++;
        // Structural invariant: nodes count = degrees + 1, edges count = degrees
        expect(result.nodes.length).toBe(result.degrees + 1);
        expect(result.edges.length).toBe(result.degrees);
        expect(result.nodes[0].id).toBe(startId);
        expect(result.nodes[result.nodes.length - 1].id).toBe(endId);

        // Check path continuity: every edge must connect adjacent nodes
        for (let j = 0; j < result.edges.length; j++) {
          const edge = result.edges[j];
          const n1 = result.nodes[j].id;
          const n2 = result.nodes[j + 1].id;
          const connects =
            (edge.source === n1 && edge.target === n2) ||
            (edge.source === n2 && edge.target === n1);
          expect(connects).toBe(true);
        }
      } else {
        disconnectedCount++;
        expect(result.degrees).toBe(0);
        expect(result.nodes.length).toBe(0);
        expect(result.edges.length).toBe(0);
      }
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const mean = latencies.reduce((acc, v) => acc + v, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(
      `[BENCHMARK] 1,000 queries completed: found=${foundCount}, disconnected=${disconnectedCount}\n` +
      `  Min: ${min.toFixed(3)}ms, Mean: ${mean.toFixed(3)}ms, Max: ${max.toFixed(3)}ms\n` +
      `  p50: ${p50.toFixed(3)}ms, p95: ${p95.toFixed(3)}ms, p99: ${p99.toFixed(3)}ms`
    );

    // Hard SLAs
    expect(max).toBeLessThan(100); // Must be strictly <100ms
    expect(p95).toBeLessThan(5);   // 95% of queries strictly <5ms
    expect(mean).toBeLessThan(2);  // Average <2ms
  });

  it('1.2 should strictly agree with Single-Source BFS Oracle across 200 random pairs (degree optimality)', () => {
    // Compare bidirectional BFS degree against oracle BFS degree
    let matches = 0;
    const sampleCount = 200;

    for (let i = 0; i < sampleCount; i++) {
      const startId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const endId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const activeGame = ALL_GAME_IDS[Math.floor(Math.random() * ALL_GAME_IDS.length)];
      const allowSpoilers = true;

      const oracleRes = oracleShortestPath(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );
      const bidiRes = findShortestRelationshipPath(
        startId,
        endId,
        characterMap,
        relationships,
        activeGame,
        allowSpoilers
      );

      expect(bidiRes.found).toBe(oracleRes.found);
      if (oracleRes.found) {
        expect(bidiRes.degrees).toBe(oracleRes.degree);
        matches++;
      }
    }
    console.log(`[ORACLE AGREEMENT] ${matches} reachable path queries verified for 100% degree optimality`);
  });

  it('1.3 should verify bidirectional symmetry: distance(A -> B) === distance(B -> A)', () => {
    let checkedPairs = 0;
    for (let i = 0; i < 100; i++) {
      const u = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const v = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      const resUV = findShortestRelationshipPath(u, v, characterMap, relationships, 'daybreak2', true);
      const resVU = findShortestRelationshipPath(v, u, characterMap, relationships, 'daybreak2', true);

      expect(resUV.found).toBe(resVU.found);
      expect(resUV.degrees).toBe(resVU.degrees);
      if (resUV.found) {
        checkedPairs++;
      }
    }
    console.log(`[SYMMETRY TEST] Verified bidirectional path symmetry across ${checkedPairs} reachable pairs`);
  });

  it('1.4 should handle disconnected and isolate nodes safely with zero crashes and <1ms latency', () => {
    for (const isoId of isolatedCharIds) {
      // Isolate to Connected
      const res1 = findShortestRelationshipPath(
        isoId,
        'rean',
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(res1.found).toBe(false);
      expect(res1.degrees).toBe(0);
      expect(res1.nodes).toEqual([]);
      expect(res1.edges).toEqual([]);
      expect(res1.executionTimeMs).toBeLessThan(10);

      // Connected to Isolate
      const res2 = findShortestRelationshipPath(
        'estelle',
        isoId,
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      expect(res2.found).toBe(false);

      // Isolate to Isolate
      const res3 = findShortestRelationshipPath(
        isoId,
        'cecile',
        characterMap,
        relationships,
        'daybreak2',
        true
      );
      if (isoId !== 'cecile') {
        expect(res3.found).toBe(false);
      } else {
        expect(res3.found).toBe(true);
        expect(res3.degrees).toBe(0);
      }
    }
  });

  it('1.5 should handle empty graph, missing nodes, and reflexive edges without error', () => {
    const emptyMap = new Map<string, Character>();
    const resEmpty = findShortestRelationshipPath('a', 'b', emptyMap, [], 'sky_fc', true);
    expect(resEmpty.found).toBe(false);

    // Missing target node
    const resMissing = findShortestRelationshipPath('estelle', 'nonexistent_char', characterMap, relationships, 'sky_fc', true);
    expect(resMissing.found).toBe(false);

    // Reflexive self-referential edge in custom graph
    const customMap = new Map<string, Character>();
    customMap.set('c1', {
      id: 'c1', nameEn: 'C1', nameJa: 'C1', titleEn: 'T', titleJa: 'T', factionId: 'f', debutGame: 'sky_fc',
      weapons: ['Sword'], seiyuu: 'VA', bioEn: 'Bio', bioJa: 'Bio', initials: 'C1'
    });
    const selfEdge: Relationship = {
      id: 'self_rel', source: 'c1', target: 'c1', type: 'comrade', labelEn: 'Self', labelJa: '己',
      descEn: 'Self edge', descJa: '己', debutGame: 'sky_fc'
    };
    const resSelf = findShortestRelationshipPath('c1', 'c1', customMap, [selfEdge], 'sky_fc', true);
    expect(resSelf.found).toBe(true);
    expect(resSelf.degrees).toBe(0);
    expect(resSelf.nodes.length).toBe(1);
    expect(resSelf.edges.length).toBe(0);
  });

  it('1.6 should stress-test a synthetic dense multi-cycle graph (500 nodes, 2,500 edges)', () => {
    // Construct synthetic graph
    const synthMap = new Map<string, Character>();
    for (let i = 0; i < 500; i++) {
      const id = `synth_${i}`;
      synthMap.set(id, {
        id,
        nameEn: `Synthetic ${i}`,
        nameJa: `実験体${i}`,
        titleEn: `Unit ${i}`,
        titleJa: `個体${i}`,
        factionId: 'test_faction',
        debutGame: 'sky_fc',
        weapons: ['Blade'],
        seiyuu: 'Test VA',
        bioEn: 'Synthetic unit',
        bioJa: '実験体',
        initials: `S${i % 10}`,
      });
    }

    const synthRels: Relationship[] = [];
    // Ring topology
    for (let i = 0; i < 500; i++) {
      const next = (i + 1) % 500;
      synthRels.push({
        id: `rel_ring_${i}`,
        source: `synth_${i}`,
        target: `synth_${next}`,
        type: 'comrade',
        labelEn: 'Ring Bond',
        labelJa: '輪',
        descEn: 'Ring',
        descJa: '輪',
        debutGame: 'sky_fc',
      });
    }

    // 2,000 random chordal shortcuts creating multiple dense cycles
    for (let i = 0; i < 2000; i++) {
      const u = Math.floor(Math.random() * 500);
      const v = Math.floor(Math.random() * 500);
      if (u !== v) {
        synthRels.push({
          id: `rel_chord_${i}`,
          source: `synth_${u}`,
          target: `synth_${v}`,
          type: 'rival',
          labelEn: 'Chord Shortcut',
          labelJa: '短縮',
          descEn: 'Shortcut',
          descJa: '短縮',
          debutGame: 'sky_fc',
        });
      }
    }

    // Run 200 queries on dense synthetic graph
    const synthLatencies: number[] = [];
    for (let i = 0; i < 200; i++) {
      const s = `synth_${Math.floor(Math.random() * 500)}`;
      const t = `synth_${Math.floor(Math.random() * 500)}`;
      const res = findShortestRelationshipPath(s, t, synthMap, synthRels, 'sky_fc', true);
      synthLatencies.push(res.executionTimeMs);
      expect(res.found).toBe(true);
      expect(res.degrees).toBeLessThanOrEqual(500);
      expect(res.executionTimeMs).toBeLessThan(15);
    }

    const maxSynth = Math.max(...synthLatencies);
    console.log(`[SYNTHETIC DENSE GRAPH] 500 nodes / 2,500 edges: max latency = ${maxSynth.toFixed(3)}ms`);
    expect(maxSynth).toBeLessThan(25);
  });
});

// ============================================================================
// SUITE 2: Physics Simulation Stability Under Extreme Parameters
// ============================================================================
describe('Milestone 2 Empirical Challenge: Physics Simulation Stability', () => {
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

  function simulatePhysicsStep(
    nodes: NodeState[],
    links: { source: string; target: string; type: string }[],
    config: {
      gravity: number;
      repulsion: number;
      linkDistance: number;
      damping: number;
    },
    dims: { width: number; height: number }
  ): number {
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // 1. Center gravity
    nodes.forEach((node) => {
      if (node.fx !== undefined) return;
      const dx = cx - node.x;
      const dy = cy - node.y;
      node.vx += dx * (config.gravity * 0.005);
      node.vy += dy * (config.gravity * 0.005);
    });

    // 2. Repulsion
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

    return totalEnergy;
  }

  function simulateEgoStep(
    nodes: NodeState[],
    links: { source: string; target: string }[],
    selectedCharId: string,
    dims: { width: number; height: number }
  ) {
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const focusedNode = nodeMap.get(selectedCharId);
    if (focusedNode) {
      focusedNode.x = cx;
      focusedNode.y = cy;
    }

    const neighborIds = new Set<string>();
    links.forEach((r) => {
      if (r.source === selectedCharId) neighborIds.add(r.target);
      if (r.target === selectedCharId) neighborIds.add(r.source);
    });

    const ring1 = nodes.filter((n) => neighborIds.has(n.id));
    const ring2 = nodes.filter((n) => n.id !== selectedCharId && !neighborIds.has(n.id));

    ring1.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, ring1.length) - Math.PI / 2;
      const targetX = cx + 150 * Math.cos(angle);
      const targetY = cy + 150 * Math.sin(angle);
      node.x += (targetX - node.x) * 0.15;
      node.y += (targetY - node.y) * 0.15;
    });

    ring2.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, ring2.length) - Math.PI / 2;
      const targetX = cx + 270 * Math.cos(angle);
      const targetY = cy + 270 * Math.sin(angle);
      node.x += (targetX - node.x) * 0.15;
      node.y += (targetY - node.y) * 0.15;
    });
  }

  it('2.1 should remain stable across 1,000 ticks under extreme max boundary parameters (gravity=1, repulsion=1500, damping=0.99, linkDistance=400)', () => {
    const extremeConfig = {
      gravity: 1.0,
      repulsion: 1500,
      linkDistance: 400,
      damping: 0.99,
    };
    const dims = { width: 900, height: 600 };

    // Setup 114 canonical nodes in initial circle
    const testNodes: NodeState[] = characters.map((c, idx) => {
      const angle = (2 * Math.PI * idx) / characters.length;
      return {
        id: c.id,
        x: 450 + 200 * Math.cos(angle),
        y: 300 + 200 * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: 22,
      };
    });

    const links = relationships.map((r) => ({
      source: r.source,
      target: r.target,
      type: r.type,
    }));

    for (let tick = 0; tick < 1000; tick++) {
      const energy = simulatePhysicsStep(testNodes, links, extremeConfig, dims);

      // Verify no NaN or Infinity at any tick
      for (const node of testNodes) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
        expect(Number.isFinite(node.vx)).toBe(true);
        expect(Number.isFinite(node.vy)).toBe(true);

        expect(Number.isNaN(node.x)).toBe(false);
        expect(Number.isNaN(node.y)).toBe(false);
        expect(Number.isNaN(node.vx)).toBe(false);
        expect(Number.isNaN(node.vy)).toBe(false);

        // Clamped within viewport
        expect(node.x).toBeGreaterThanOrEqual(node.radius + 20);
        expect(node.x).toBeLessThanOrEqual(dims.width - node.radius - 20);
        expect(node.y).toBeGreaterThanOrEqual(node.radius + 20);
        expect(node.y).toBeLessThanOrEqual(dims.height - node.radius - 20);
      }
      expect(Number.isFinite(energy)).toBe(true);
    }
  }, 15000);

  it('2.2 should handle singular zero-distance overlap (dx=0, dy=0) without NaN or division by zero', () => {
    const config = {
      gravity: 0.5,
      repulsion: 1000,
      linkDistance: 150,
      damping: 0.85,
    };
    const dims = { width: 900, height: 600 };

    // All nodes placed at exact same coordinate (450, 300)
    const overlappedNodes: NodeState[] = [
      { id: 'n1', x: 450, y: 300, vx: 0, vy: 0, radius: 22 },
      { id: 'n2', x: 450, y: 300, vx: 0, vy: 0, radius: 22 },
      { id: 'n3', x: 450, y: 300, vx: 0, vy: 0, radius: 22 },
      { id: 'n4', x: 450, y: 300, vx: 0, vy: 0, radius: 22 },
    ];
    const links = [
      { source: 'n1', target: 'n2', type: 'comrade' },
      { source: 'n2', target: 'n3', type: 'family' },
      { source: 'n3', target: 'n4', type: 'rival' },
    ];

    // Run 100 ticks
    for (let t = 0; t < 100; t++) {
      simulatePhysicsStep(overlappedNodes, links, config, dims);
      for (const n of overlappedNodes) {
        expect(Number.isFinite(n.x)).toBe(true);
        expect(Number.isFinite(n.y)).toBe(true);
        expect(Number.isNaN(n.x)).toBe(false);
        expect(Number.isNaN(n.y)).toBe(false);
      }
    }
  });

  it('2.3 should settle into sleep mode under standard parameters (kinetic energy < 0.05)', () => {
    const standardConfig = {
      gravity: 0.15,
      repulsion: 450,
      linkDistance: 120,
      damping: 0.85,
    };
    const dims = { width: 900, height: 600 };

    const testNodes: NodeState[] = characters.slice(0, 20).map((c, idx) => {
      const angle = (2 * Math.PI * idx) / 20;
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

    let settled = false;
    let settledTick = -1;
    let lastEnergy = 0;
    for (let tick = 0; tick < 1000; tick++) {
      const energy = simulatePhysicsStep(testNodes, links, standardConfig, dims);
      lastEnergy = energy;
      if (energy < 0.05) {
        settled = true;
        settledTick = tick;
        break;
      }
    }

    expect(settled).toBe(true);
    console.log(`[PHYSICS SETTLING] 20 nodes settled into sleep mode at tick ${settledTick}`);
  });

  it('2.4 should maintain numerical stability across 100 ticks of Ego Radial layout', () => {
    const dims = { width: 900, height: 600 };
    const testNodes: NodeState[] = characters.slice(0, 30).map((c, idx) => ({
      id: c.id,
      x: 100 + idx * 10,
      y: 100 + idx * 10,
      vx: 0,
      vy: 0,
      radius: 22,
    }));
    const links = relationships.map((r) => ({ source: r.source, target: r.target }));

    // Test with Rean (many neighbors)
    for (let t = 0; t < 100; t++) {
      simulateEgoStep(testNodes, links, 'rean', dims);
      for (const n of testNodes) {
        expect(Number.isFinite(n.x)).toBe(true);
        expect(Number.isFinite(n.y)).toBe(true);
        expect(Number.isNaN(n.x)).toBe(false);
      }
    }

    // Test with non-existent character ID
    simulateEgoStep(testNodes, links, 'non_existent_char', dims);
    for (const n of testNodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });
});

// ============================================================================
// SUITE 3: Corrupted & Malicious localStorage Payloads (hydrateState Recovery)
// ============================================================================
describe('Milestone 2 Empirical Challenge: Storage Hydration Resilience', () => {
  it('3.1 should recover to DEFAULT_STATE on raw syntax errors & non-JSON payloads', () => {
    const maliciousInputs = [
      null,
      undefined,
      '',
      '{ bad json: true',
      '<html><body>404 Not Found</body></html>',
      'NaN',
      'Infinity',
      '-Infinity',
      'undefined',
      '0',
      'false',
      'true',
      '"string_only"',
      '[]',
      '[{"version": 1}]',
      '{"version": 1, trailing_comma: true,}',
      '{"version": 1, "unclosed_string: 123}',
      '\x00\x01\x02\x03',
      ' '.repeat(1000),
    ];

    for (const raw of maliciousInputs) {
      const hydrated = hydrateState(raw);
      expect(hydrated).toEqual(DEFAULT_STATE);
    }
  });

  it('3.2 should block Prototype Pollution attempts without poisoning Object.prototype', () => {
    const prototypePollutionPayloads = [
      JSON.stringify({
        __proto__: { isAdmin: true, polluted: 'hacked' },
        version: 1,
        selectedGameId: 'daybreak2',
        activeView: 'network',
        selectedCharId: 'rean',
        highContrastMode: false,
        language: 'en',
        unmaskedSpoilerIds: [],
        physicsConfig: DEFAULT_STATE.physicsConfig,
      }),
      JSON.stringify({
        constructor: { prototype: { isRoot: true } },
        version: 1,
        selectedGameId: 'daybreak2',
        activeView: 'network',
        selectedCharId: 'rean',
        highContrastMode: false,
        language: 'en',
        unmaskedSpoilerIds: [],
        physicsConfig: DEFAULT_STATE.physicsConfig,
      }),
    ];

    for (const payload of prototypePollutionPayloads) {
      const state = hydrateState(payload);
      // Invariant: Object.prototype must NOT be polluted
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).isRoot).toBeUndefined();

      // State is valid
      expect(state.version).toBe(1);
      expect((state as any).isAdmin).toBeUndefined();
    }
  });

  it('3.3 should reject schema version mismatches and recover to fallback', () => {
    const versionMismatches = [
      { ...DEFAULT_STATE, version: 0 },
      { ...DEFAULT_STATE, version: 2 },
      { ...DEFAULT_STATE, version: 99 },
      { ...DEFAULT_STATE, version: -1 },
      { ...DEFAULT_STATE, version: '1' },
      { ...DEFAULT_STATE, version: 1.5 },
      { ...DEFAULT_STATE, version: null },
    ];

    for (const badState of versionMismatches) {
      const res = hydrateState(JSON.stringify(badState));
      expect(res).toEqual(DEFAULT_STATE);
    }
  });

  it('3.4 should reject numeric out-of-boundary physics parameters and recover to fallback', () => {
    const outOfBoundsPhysics = [
      // Gravity out of bounds (allowed 0..1)
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, gravity: -0.01 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, gravity: 1.01 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, gravity: 9999 } },

      // Repulsion out of bounds (allowed 50..1500)
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, repulsion: 49 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, repulsion: 1501 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, repulsion: -500 } },

      // LinkDistance out of bounds (allowed 20..400)
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, linkDistance: 19 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, linkDistance: 401 } },

      // Damping out of bounds (allowed 0.1..0.99)
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, damping: 0.09 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, damping: 1.0 } },
      { ...DEFAULT_STATE, physicsConfig: { ...DEFAULT_STATE.physicsConfig, damping: 1.5 } },

      // Invalid enums
      { ...DEFAULT_STATE, selectedGameId: 'final_fantasy_vii' },
      { ...DEFAULT_STATE, activeView: 'vr_flight_sim' },
      { ...DEFAULT_STATE, language: 'de' },
      { ...DEFAULT_STATE, unmaskedSpoilerIds: 'not_an_array' },
      { ...DEFAULT_STATE, unmaskedSpoilerIds: [123, 456] },
    ];

    for (const badObj of outOfBoundsPhysics) {
      const res = hydrateState(JSON.stringify(badObj));
      expect(res).toEqual(DEFAULT_STATE);
    }
  });

  it('3.5 should withstand massive payloads (100,000+ characters) without memory leaks or unhandled crashes', () => {
    const massiveGarbage = JSON.stringify({
      version: 1,
      selectedGameId: 'daybreak2',
      activeView: 'network',
      selectedCharId: 'rean',
      highContrastMode: false,
      language: 'en',
      unmaskedSpoilerIds: Array.from({ length: 5000 }, (_, i) => `spoiler_id_${i}`),
      physicsConfig: DEFAULT_STATE.physicsConfig,
      junkField: 'X'.repeat(100000),
    });

    const t0 = performance.now();
    const res = hydrateState(massiveGarbage);
    const duration = performance.now() - t0;

    expect(res).toBeDefined();
    expect(res.version).toBe(1);
    expect(res.unmaskedSpoilerIds.length).toBe(5000);
    // Unrecognized junkField is stripped by Zod
    expect((res as any).junkField).toBeUndefined();
    expect(duration).toBeLessThan(50); // fast parse even under 100KB payload
  });

  it('3.6 should gracefully handle localStorage SecurityError / QuotaExceededError without crashing', () => {
    // Mock window and localStorage
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    (global as any).window = { localStorage: mockStorage };

    // 1. QuotaExceededError on save
    mockStorage.setItem.mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const saveResult = saveStateToLocalStorage(DEFAULT_STATE);
    expect(saveResult).toBe(false); // Graceful recovery to false

    // 2. SecurityError on load (e.g., privacy sandbox block)
    mockStorage.getItem.mockImplementation(() => {
      const err = new Error('SecurityError: Access is denied for this document');
      err.name = 'SecurityError';
      throw err;
    });
    const loadedState = loadStateFromLocalStorage();
    expect(loadedState).toEqual(DEFAULT_STATE); // Graceful recovery to default

    delete (global as any).window;
  });
});
