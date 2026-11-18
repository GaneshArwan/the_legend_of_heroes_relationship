import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Character, Relationship, GameId, RelationshipType } from '../../types';
import { CharacterAvatar } from '../common/CharacterAvatar';
import { factions } from '../../data/factions';
import { sanitizeRelationship, isCharacterVisible } from '../../services/spoilerEngine';
import { ZoomIn, ZoomOut, RotateCcw, Sliders, Play, Pause, Search } from 'lucide-react';

export interface PhysicsConfig {
  gravity: number;
  repulsion: number;
  linkDistance: number;
  damping: number;
  isPaused: boolean;
}

export interface OrbmentBondGraphProps {
  characters: Character[];
  relationships: Relationship[];
  activeGameId: GameId;
  selectedCharId: string;
  onSelectCharacter: (char: Character) => void;
  highContrastMode?: boolean;
  unmaskedSpoilerIds?: string[];
  arcFilter?: string;
  bondTypeFilter?: RelationshipType | 'all';
  physicsConfig?: PhysicsConfig;
  onPhysicsChange?: (config: PhysicsConfig) => void;
  language?: 'en' | 'ja';
  className?: string;
}

interface GraphNode {
  id: string;
  char: Character;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fx?: number;
  fy?: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 0.15,
  repulsion: 450,
  linkDistance: 120,
  damping: 0.85,
  isPaused: false,
};

export const OrbmentBondGraph: React.FC<OrbmentBondGraphProps> = ({
  characters,
  relationships,
  activeGameId,
  selectedCharId,
  onSelectCharacter,
  highContrastMode = false,
  unmaskedSpoilerIds = [],
  arcFilter = 'all',
  bondTypeFilter = 'all',
  physicsConfig = DEFAULT_PHYSICS,
  onPhysicsChange,
  language = 'en',
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport dimensions
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'dynamic' | 'ego'>('dynamic');
  const [showPhysicsDrawer, setShowPhysicsDrawer] = useState(false);
  const [hideInspector, setHideInspector] = useState(false);
  const [localArcFilter, setLocalArcFilter] = useState<string>(arcFilter);
  const [localBondType, setLocalBondType] = useState<RelationshipType | 'all'>(bondTypeFilter);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  // Dedicated animation frame render trigger (decoupled from pan/zoom camera state)
  const [, setFrameTick] = useState(0);

  useEffect(() => {
    setLocalArcFilter(arcFilter);
  }, [arcFilter]);

  useEffect(() => {
    setLocalBondType(bondTypeFilter);
  }, [bondTypeFilter]);

  // Reset inspector visibility on selection change
  useEffect(() => {
    setHideInspector(false);
  }, [selectedCharId]);

  // Active unmasked set
  const unmaskedSet = useMemo(() => new Set(unmaskedSpoilerIds), [unmaskedSpoilerIds]);

  // Filter visible characters based on active game & filters
  const visibleCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (!isCharacterVisible(c, activeGameId, unmaskedSet)) return false;
      if (localArcFilter !== 'all') {
        if (localArcFilter === 'liberl' && !['sky_fc', 'sky_sc', 'sky_3rd'].includes(c.debutGame)) {
          return false;
        }
        if (localArcFilter === 'crossbell' && !['zero', 'azure'].includes(c.debutGame)) {
          return false;
        }
        if (localArcFilter === 'erebonia' && !['cs1', 'cs2', 'cs3', 'cs4'].includes(c.debutGame)) {
          return false;
        }
        if (localArcFilter === 'reverie' && c.debutGame !== 'reverie') {
          return false;
        }
        if (localArcFilter === 'calvard' && !['daybreak1', 'daybreak2'].includes(c.debutGame)) {
          return false;
        }
      }
      return true;
    });
  }, [characters, activeGameId, unmaskedSet, localArcFilter]);

  const visibleCharMap = useMemo(() => {
    return new Map(visibleCharacters.map((c) => [c.id, c]));
  }, [visibleCharacters]);

  const visibleRelationships = useMemo(() => {
    return relationships
      .map((r) => sanitizeRelationship(r, activeGameId, unmaskedSet))
      .filter((r): r is Relationship => {
        if (!r) return false;
        if (localBondType !== 'all' && r.type !== localBondType) return false;
        return visibleCharMap.has(r.source) && visibleCharMap.has(r.target);
      });
  }, [relationships, activeGameId, unmaskedSet, localBondType, visibleCharMap]);

  // Focus character for Tactical Quick-View Inspector HUD
  const activeFocusChar = useMemo(() => {
    return (
      visibleCharacters.find((c) => c.id === hoveredNodeId) ||
      visibleCharacters.find((c) => c.id === selectedCharId) ||
      visibleCharacters[0] ||
      null
    );
  }, [visibleCharacters, hoveredNodeId, selectedCharId]);

  const activeFocusCharFaction = useMemo(() => {
    if (!activeFocusChar) return null;
    return factions.find((f) => f.id === activeFocusChar.factionId) || null;
  }, [activeFocusChar]);

  const activeFocusCharBondsCount = useMemo(() => {
    if (!activeFocusChar) return 0;
    return visibleRelationships.filter(
      (r) => r.source === activeFocusChar.id || r.target === activeFocusChar.id
    ).length;
  }, [activeFocusChar, visibleRelationships]);

  // Node positions map for simulation
  const nodesRef = useRef<Map<string, GraphNode>>(new Map());

  // Initialize or update node records without resetting existing coordinates on state update
  useEffect(() => {
    const currentNodes = nodesRef.current;
    const newNodes = new Map<string, GraphNode>();
    const cx = dims.width / 2;
    const cy = dims.height / 2;

    visibleCharacters.forEach((char, idx) => {
      const existing = currentNodes.get(char.id);
      if (existing) {
        existing.char = char;
        existing.radius = char.id === selectedCharId ? 46 : 34;
        newNodes.set(char.id, existing);
      } else {
        // Seed initial position in concentric circle
        const angle = (2 * Math.PI * idx) / Math.max(1, visibleCharacters.length);
        const r = 180 + (idx % 3) * 40;
        newNodes.set(char.id, {
          id: char.id,
          char,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          vx: 0,
          vy: 0,
          radius: char.id === selectedCharId ? 46 : 34,
        });
      }
    });

    nodesRef.current = newNodes;
  }, [visibleCharacters, dims, selectedCharId]);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth || 900,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Force simulation loop with kinetic sleep gating and ego convergence
  useEffect(() => {
    if (physicsConfig.isPaused) return;

    let animId: number;
    let isActive = true;

    const tick = () => {
      if (!isActive) return;

      const nodes = Array.from(nodesRef.current.values());
      const cx = dims.width / 2;
      const cy = dims.height / 2;

      let isSettled = false;

      if (layoutMode === 'dynamic') {
        // 1. Center gravity
        nodes.forEach((node) => {
          if (node.fx !== undefined) return;
          const dx = cx - node.x;
          const dy = cy - node.y;
          node.vx += dx * (physicsConfig.gravity * 0.005);
          node.vy += dy * (physicsConfig.gravity * 0.005);
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
              const force = physicsConfig.repulsion / (distSq + 100);
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
        visibleRelationships.forEach((rel) => {
          const s = nodesRef.current.get(rel.source);
          const t = nodesRef.current.get(rel.target);
          if (!s || !t) return;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Target distance based on relationship type
          let targetDist = physicsConfig.linkDistance;
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
            node.vx *= physicsConfig.damping;
            node.vy *= physicsConfig.damping;
            node.x += node.vx;
            node.y += node.vy;

            // Viewport boundary clamp with normal velocity absorption
            const minX = node.radius + 20;
            const maxX = dims.width - node.radius - 20;
            const minY = node.radius + 20;
            const maxY = dims.height - node.radius - 20;

            if (node.x <= minX && node.vx < 0) {
              node.vx = 0;
              node.vy *= 0.7;
            }
            if (node.x >= maxX && node.vx > 0) {
              node.vx = 0;
              node.vy *= 0.7;
            }
            if (node.y <= minY && node.vy < 0) {
              node.vy = 0;
              node.vx *= 0.7;
            }
            if (node.y >= maxY && node.vy > 0) {
              node.vy = 0;
              node.vx *= 0.7;
            }

            if (Math.abs(node.vx) < 0.01) node.vx = 0;
            if (Math.abs(node.vy) < 0.01) node.vy = 0;

            node.x = Math.max(minX, Math.min(maxX, node.x));
            node.y = Math.max(minY, Math.min(maxY, node.y));

            totalEnergy += node.vx * node.vx + node.vy * node.vy;
          }
        });

        // Sleep mode when kinetic energy drops below threshold and no drag active
        if (totalEnergy < 0.05 && draggedNodeId === null) {
          isSettled = true;
          // Zero residual velocities for clean rest state
          nodes.forEach((node) => {
            node.vx = 0;
            node.vy = 0;
          });
        }
      } else if (layoutMode === 'ego') {
        // Ego radial layout
        const focusedNode = nodesRef.current.get(selectedCharId);
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
        visibleRelationships.forEach((r) => {
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

        // Ego convergence check: when max displacement is < 0.1px and no node is being dragged
        if (maxDisplacement < 0.1 && draggedNodeId === null) {
          isSettled = true;
          // Snap remaining nodes to exact target coordinates
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
      }

      // Trigger frame render decoupled from pan camera state
      setFrameTick((f) => (f + 1) | 0);

      // Halt animation frame scheduling when settled (drops CPU to 0%)
      if (!isSettled) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      isActive = false;
      cancelAnimationFrame(animId);
    };
  }, [physicsConfig, layoutMode, visibleCharacters, visibleRelationships, dims, selectedCharId, draggedNodeId]);

  // Pan & Zoom event handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.25, Math.min(3.5, z * zoomFactor)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      } else if (draggedNodeId) {
        const node = nodesRef.current.get(draggedNodeId);
        if (node && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          node.fx = (e.clientX - rect.left - pan.x) / zoom;
          node.fy = (e.clientY - rect.top - pan.y) / zoom;
        }
      }
    },
    [isPanning, panStart, draggedNodeId, pan, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggedNodeId) {
      const node = nodesRef.current.get(draggedNodeId);
      if (node) {
        node.fx = undefined;
        node.fy = undefined;
      }
      setDraggedNodeId(null);
    }
  }, [draggedNodeId]);

  // Window-level mouseup listener to catch releases outside SVG bounds
  useEffect(() => {
    if (!draggedNodeId && !isPanning) return;
    const onWindowMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [draggedNodeId, isPanning, handleMouseUp]);

  // Edge style computation meeting WCAG 2.1 AAA
  const getEdgeStyle = useCallback(
    (type: RelationshipType, isFocused: boolean) => {
      if (highContrastMode) {
        switch (type) {
          case 'mentor':
            return { stroke: '#fbbf24', strokeWidth: 4, strokeDasharray: '8 4', opacity: 1.0 };
          case 'family':
            return { stroke: '#38bdf8', strokeWidth: 4, strokeDasharray: '3 3', opacity: 1.0 };
          case 'rival':
            return { stroke: '#f87171', strokeWidth: 4, strokeDasharray: '8 3 2 3', opacity: 1.0 };
          case 'secret':
            return { stroke: '#c084fc', strokeWidth: 4, strokeDasharray: '4 4', opacity: 1.0 };
          case 'comrade':
          default:
            return { stroke: '#34d399', strokeWidth: 4, strokeDasharray: 'none', opacity: 1.0 };
        }
      }
      // Standard tactical mode
      const baseColors: Record<RelationshipType, string> = {
        mentor: '#fbbf24',
        comrade: '#34d399',
        family: '#38bdf8',
        rival: '#ef4444',
        secret: '#a855f7',
      };
      return {
        stroke: baseColors[type] || '#94a3b8',
        strokeWidth: isFocused ? 2.8 : 1.4,
        strokeDasharray: type === 'secret' ? '5 3' : 'none',
        opacity: isFocused ? 0.95 : 0.45,
      };
    },
    [highContrastMode]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[650px] bg-bg-deep rounded-xl border border-arcus-cyan/25 overflow-hidden select-none ${className}`}
    >
      {/* Tactical Canvas Header Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <span className="text-slate-400 font-mono">LAYOUT:</span>
            <button
              onClick={() => setLayoutMode('dynamic')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                layoutMode === 'dynamic'
                  ? 'bg-arcus-cyan text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Dynamic Force
            </button>
            <button
              onClick={() => setLayoutMode('ego')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                layoutMode === 'ego'
                  ? 'bg-arcus-cyan text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ego Radial
            </button>
          </div>

          {/* Arc Filter Selector */}
          <select
            aria-label="Filter Graph by Saga Arc"
            value={localArcFilter}
            onChange={(e) => setLocalArcFilter(e.target.value)}
            className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-arcus-cyan cursor-pointer"
          >
            <option value="all">All Arcs ({visibleCharacters.length})</option>
            <option value="liberl">Liberl Arc</option>
            <option value="crossbell">Crossbell Arc</option>
            <option value="erebonia">Erebonia Arc</option>
            <option value="reverie">Reverie Arc</option>
            <option value="calvard">Calvard Arc</option>
          </select>

          {/* Node Locator Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={nodeSearchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setNodeSearchQuery(val);
                if (val.trim()) {
                  const q = val.toLowerCase();
                  const match = visibleCharacters.find(
                    (c) =>
                      c.nameEn.toLowerCase().includes(q) || c.nameJa.toLowerCase().includes(q)
                  );
                  if (match) {
                    setHoveredNodeId(match.id);
                    const node = nodesRef.current.get(match.id);
                    if (node) {
                      setPan({
                        x: dims.width / 2 - node.x * zoom,
                        y: dims.height / 2 - node.y * zoom,
                      });
                    }
                  }
                } else {
                  setHoveredNodeId(null);
                }
              }}
              placeholder="Locate node..."
              aria-label="Locate character node in graph"
              className="w-40 sm:w-48 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-arcus-cyan"
            />
          </div>
        </div>

        {/* Zoom & Viewport Controls HUD */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, z * 1.15))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z * 0.85))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (onPhysicsChange) {
                onPhysicsChange({ ...physicsConfig, isPaused: !physicsConfig.isPaused });
              }
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title={physicsConfig.isPaused ? 'Resume Physics' : 'Pause Physics'}
          >
            {physicsConfig.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowPhysicsDrawer(!showPhysicsDrawer)}
            className={`p-1.5 rounded cursor-pointer ${
              showPhysicsDrawer
                ? 'bg-arcus-cyan/20 text-arcus-cyan'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Physics Parameters"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Physics Drawer */}
      {showPhysicsDrawer && (
        <div className="absolute top-16 right-4 z-20 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 text-xs space-y-3 shadow-xl">
          <div className="flex items-center justify-between font-mono font-bold text-arcus-cyan">
            <span>PHYSICS PARAMETERS</span>
            <button
              onClick={() => setShowPhysicsDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Gravity:</span>
              <span className="font-mono text-arcus-cyan">
                {physicsConfig.gravity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={physicsConfig.gravity}
              onChange={(e) =>
                onPhysicsChange &&
                onPhysicsChange({ ...physicsConfig, gravity: parseFloat(e.target.value) })
              }
              className="w-full accent-arcus-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Repulsion:</span>
              <span className="font-mono text-arcus-cyan">{physicsConfig.repulsion}</span>
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="25"
              value={physicsConfig.repulsion}
              onChange={(e) =>
                onPhysicsChange &&
                onPhysicsChange({ ...physicsConfig, repulsion: parseInt(e.target.value, 10) })
              }
              className="w-full accent-arcus-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Link Distance:</span>
              <span className="font-mono text-arcus-cyan">{physicsConfig.linkDistance}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="400"
              step="10"
              value={physicsConfig.linkDistance}
              onChange={(e) =>
                onPhysicsChange &&
                onPhysicsChange({ ...physicsConfig, linkDistance: parseInt(e.target.value, 10) })
              }
              className="w-full accent-arcus-cyan"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Damping:</span>
              <span className="font-mono text-arcus-cyan">
                {physicsConfig.damping.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.99"
              step="0.05"
              value={physicsConfig.damping}
              onChange={(e) =>
                onPhysicsChange &&
                onPhysicsChange({ ...physicsConfig, damping: parseFloat(e.target.value) })
              }
              className="w-full accent-arcus-cyan"
            />
          </div>
        </div>
      )}

      {/* Interactive SVG Surface */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        role="graphics-document"
        aria-label="Interactive Orbment Tactical Relationship Graph"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Tactical Radar Background Grid */}
          <circle
            cx={dims.width / 2}
            cy={dims.height / 2}
            r="150"
            fill="none"
            stroke="#38bdf8"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
          <circle
            cx={dims.width / 2}
            cy={dims.height / 2}
            r="280"
            fill="none"
            stroke="#38bdf8"
            strokeOpacity="0.06"
            strokeDasharray="6 6"
          />

          {/* Render Relationship Edges */}
          <g id="edges-layer">
            {visibleRelationships.map((rel) => {
              const sNode = nodesRef.current.get(rel.source);
              const tNode = nodesRef.current.get(rel.target);
              if (!sNode || !tNode) return null;

              const isFocused =
                rel.source === selectedCharId ||
                rel.target === selectedCharId ||
                rel.source === hoveredNodeId ||
                rel.target === hoveredNodeId;

              const style = getEdgeStyle(rel.type, isFocused);

              return (
                <line
                  key={rel.id}
                  x1={sNode.x}
                  y1={sNode.y}
                  x2={tNode.x}
                  y2={tNode.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  strokeOpacity={style.opacity}
                  className="transition-colors duration-150"
                />
              );
            })}
          </g>

          {/* Render Character Nodes */}
          <g id="nodes-layer">
            {visibleCharacters.map((char) => {
              const node = nodesRef.current.get(char.id);
              if (!node) return null;

              const isSelected = char.id === selectedCharId;
              const isHovered = char.id === hoveredNodeId;

              return (
                <g
                  key={char.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(char.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggedNodeId(char.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCharacter(char);
                  }}
                  className="cursor-pointer"
                >
                  {/* Tactical Reticle Ring for Selected */}
                  {isSelected && (
                    <circle
                      r={node.radius + 9}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Character Node Frame */}
                  <foreignObject
                    x={-node.radius}
                    y={-node.radius}
                    width={node.radius * 2}
                    height={node.radius * 2}
                    className="overflow-visible"
                  >
                    <CharacterAvatar
                      character={char}
                      size={node.radius * 2}
                      activeGameId={activeGameId}
                      showRing={isSelected || isHovered}
                      ringColor={isSelected ? '#f59e0b' : '#38bdf8'}
                    />
                  </foreignObject>

                  {/* Name Label Pill */}
                  <text
                    y={node.radius + 16}
                    textAnchor="middle"
                    fill={highContrastMode ? '#ffffff' : isSelected ? '#fbbf24' : '#e2e8f0'}
                    fontSize="11"
                    fontFamily="Inter, sans-serif"
                    fontWeight={isSelected ? '700' : '500'}
                    className="pointer-events-none drop-shadow"
                  >
                    {language === 'ja' ? char.nameJa : char.nameEn}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Interactive Bond Type Legend & Filter Bar (Bottom-Right HUD) */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-2 text-[11px] font-mono shadow-xl">
        {(
          [
            { id: 'all', label: 'All Links', color: '#38bdf8' },
            { id: 'comrade', label: 'Comrade', color: '#34d399' },
            { id: 'family', label: 'Family', color: '#38bdf8' },
            { id: 'mentor', label: 'Mentor', color: '#fbbf24' },
            { id: 'rival', label: 'Rival', color: '#ef4444' },
            { id: 'secret', label: 'Secret', color: '#a855f7' },
          ] as const
        ).map((item) => {
          const isActive = localBondType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLocalBondType(item.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer border ${
                isActive
                  ? 'bg-slate-800 text-white border-arcus-cyan/70 font-bold'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tactical Quick-View Inspector HUD Card with Big Character Portrait */}
      {activeFocusChar && !hideInspector && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-arcus-cyan/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Big Character Portrait Showcase */}
          <div
            onClick={() => onSelectCharacter(activeFocusChar)}
            className="w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden shrink-0 border-2 shadow-xl cursor-pointer group hover:scale-105 transition-transform bg-slate-950 flex items-center justify-center relative"
            style={{ borderColor: activeFocusCharFaction?.color || '#38bdf8' }}
            title="Click to view full dossier"
          >
            <CharacterAvatar
              character={activeFocusChar}
              factionColor={activeFocusCharFaction?.color}
              size={144}
              aspectRatio="portrait"
              fit="cover"
              activeGameId={activeGameId}
              className="w-full h-full"
            />
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 border border-arcus-cyan/60 text-arcus-cyan text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              Dossier ↗
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase truncate"
                style={{
                  color: activeFocusCharFaction?.color || '#38bdf8',
                  borderColor: `${activeFocusCharFaction?.color || '#38bdf8'}50`,
                  backgroundColor: `${activeFocusCharFaction?.color || '#38bdf8'}15`,
                }}
              >
                {activeFocusCharFaction?.nameEn || 'Independent'}
              </span>
              <button
                type="button"
                onClick={() => setHideInspector(true)}
                className="text-slate-500 hover:text-slate-300 p-0.5 text-xs cursor-pointer"
                title="Dismiss preview"
              >
                ✕
              </button>
            </div>

            <h4
              onClick={() => onSelectCharacter(activeFocusChar)}
              className="font-cinzel font-bold text-base sm:text-lg text-white hover:text-arcus-cyan cursor-pointer truncate mt-1"
            >
              {activeFocusChar.nameEn}
            </h4>
            <div className="text-xs text-imperial-gold font-medium truncate">
              {activeFocusChar.variants?.[activeGameId]?.titleEn || activeFocusChar.titleEn}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {activeFocusChar.nameJa} • {activeFocusChar.seiyuu}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              Weapon: {activeFocusChar.weapons[0]}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectCharacter(activeFocusChar)}
                className="px-3 py-1.5 rounded-lg bg-arcus-cyan text-slate-950 font-bold text-xs font-mono hover:bg-cyan-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>Full Dossier & HD Art</span>
                <span>→</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                {activeFocusCharBondsCount} Links
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
