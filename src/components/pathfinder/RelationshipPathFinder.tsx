import React, { useState, useMemo, useEffect } from 'react';
import { Character, Relationship, GameId } from '../../types';
import { CharacterAvatar } from '../common/CharacterAvatar';
import { findShortestRelationshipPath, PathResult } from '../../services/pathfinder';
import { isCharacterVisible, sanitizeRelationship } from '../../services/spoilerEngine';
import {
  Compass,
  ArrowRight,
  ArrowLeftRight,
  Zap,
  Eye,
  AlertCircle,
  Network,
  Search,
} from 'lucide-react';

export interface RelationshipPathFinderProps {
  characters: Character[];
  relationships: Relationship[];
  activeGameId: GameId;
  defaultOriginId?: string;
  defaultTargetId?: string;
  onSelectCharacter?: (charId: string) => void;
  unmaskedSpoilerIds?: Set<string>;
  onToggleUnmaskSpoiler?: (id: string) => void;
  language?: 'en' | 'ja';
  className?: string;
}

export const RelationshipPathFinder: React.FC<RelationshipPathFinderProps> = ({
  characters,
  relationships,
  activeGameId,
  defaultOriginId = 'estelle',
  defaultTargetId = 'van',
  onSelectCharacter,
  unmaskedSpoilerIds = new Set(),
  onToggleUnmaskSpoiler,
  language = 'en',
  className = '',
}) => {
  const [originId, setOriginId] = useState<string>(defaultOriginId);
  const [targetId, setTargetId] = useState<string>(defaultTargetId);
  const [allowSpoilers, setAllowSpoilers] = useState<boolean>(false);
  const [originFilter, setOriginFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  // Keep synced when Dossier dispatches "Set as Path Origin" or "Set as Path Target"
  useEffect(() => {
    setOriginId(defaultOriginId);
  }, [defaultOriginId]);

  useEffect(() => {
    setTargetId(defaultTargetId);
  }, [defaultTargetId]);

  // Character map
  const characterMap = useMemo(() => {
    return new Map<string, Character>(characters.map((c) => [c.id, c]));
  }, [characters]);

  // Filter candidates for dropdowns based on spoiler preference
  const availableCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (allowSpoilers) return true;
      return isCharacterVisible(c, activeGameId, unmaskedSpoilerIds);
    });
  }, [characters, allowSpoilers, activeGameId, unmaskedSpoilerIds]);

  const filteredOriginList = useMemo(() => {
    if (!originFilter.trim()) return availableCharacters;
    const q = originFilter.toLowerCase();
    return availableCharacters.filter(
      (c) =>
        c.id === originId ||
        c.nameEn.toLowerCase().includes(q) ||
        c.nameJa.toLowerCase().includes(q) ||
        c.titleEn.toLowerCase().includes(q)
    );
  }, [availableCharacters, originFilter, originId]);

  const filteredTargetList = useMemo(() => {
    if (!targetFilter.trim()) return availableCharacters;
    const q = targetFilter.toLowerCase();
    return availableCharacters.filter(
      (c) =>
        c.id === targetId ||
        c.nameEn.toLowerCase().includes(q) ||
        c.nameJa.toLowerCase().includes(q) ||
        c.titleEn.toLowerCase().includes(q)
    );
  }, [availableCharacters, targetFilter, targetId]);

  const originCharacter = characterMap.get(originId);
  const targetCharacter = characterMap.get(targetId);

  // Presets
  const presets = [
    { label: 'Estelle → Van', origin: 'estelle', target: 'van' },
    { label: 'Renne → Kenneth', origin: 'renne', target: 'kenneth' },
    { label: 'Lloyd → Rean', origin: 'lloyd', target: 'rean' },
    { label: 'Rean → Osborne', origin: 'rean', target: 'osborne' },
    { label: 'Rean → Shizuna', origin: 'rean', target: 'shizuna' },
    { label: 'Randy → Shirley', origin: 'randy', target: 'shirley' },
  ];

  // Execute BFS pathfinding
  const pathResult: PathResult = useMemo(() => {
    return findShortestRelationshipPath(
      originId,
      targetId,
      characterMap,
      relationships,
      activeGameId,
      allowSpoilers
    );
  }, [originId, targetId, characterMap, relationships, activeGameId, allowSpoilers]);

  // Swap endpoints
  const handleSwap = () => {
    setOriginId(targetId);
    setTargetId(originId);
  };

  const getBondTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'family':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'mentor':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'rival':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'secret':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
      case 'comrade':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Tactical Command Box */}
      <div className="bg-bg-panel/85 border border-arcus-cyan/30 rounded-xl p-6 backdrop-blur-md shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-arcus-cyan/10 text-arcus-cyan">
              <Compass className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-lg text-white">
                ARCUS II / XIPHA LINK PATH FINDER
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Bidirectional BFS Shortest-Path Routing Engine • Sub-5ms Realtime
              </p>
            </div>
          </div>

          {/* Spoiler Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <input
              type="checkbox"
              checked={allowSpoilers}
              onChange={(e) => setAllowSpoilers(e.target.checked)}
              className="accent-arcus-cyan cursor-pointer"
            />
            <span className="text-slate-300 font-mono">
              Allow Spoilers (Reveal Future Chronicles)
            </span>
          </label>
        </div>

        {/* Origin & Destination Selectors with Visual Endpoint Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
          {/* Origin Selector & Preview */}
          <div className="space-y-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Origin Operative
              </span>
              <div className="relative w-36">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  placeholder="Filter list..."
                  aria-label="Filter origin operative dropdown"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-arcus-cyan"
                />
              </div>
            </div>

            <select
              aria-label="Origin Operative"
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-arcus-cyan cursor-pointer font-sans"
            >
              {filteredOriginList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} ({c.nameJa}) — [{c.debutGame.toUpperCase()}]
                </option>
              ))}
            </select>

            {originCharacter && (
              <div
                onClick={() => onSelectCharacter && onSelectCharacter(originCharacter.id)}
                className="flex items-center gap-3 pt-1 cursor-pointer group"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-emerald-500/50 bg-slate-950">
                  <CharacterAvatar
                    character={originCharacter}
                    size={56}
                    aspectRatio="portrait"
                    fit="cover"
                    activeGameId={activeGameId}
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-cinzel font-bold text-white group-hover:text-arcus-cyan truncate">
                    {language === 'ja' ? originCharacter.nameJa : originCharacter.nameEn}
                  </div>
                  <div className="text-[11px] text-imperial-gold truncate">
                    {originCharacter.titleEn}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Debut: {originCharacter.debutGame.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              type="button"
              aria-label="Swap Origin and Destination"
              onClick={handleSwap}
              title="Swap Origin and Destination"
              className="p-3 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-arcus-cyan hover:border-arcus-cyan/60 hover:bg-slate-800 transition cursor-pointer shadow-lg"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Selector & Preview */}
          <div className="space-y-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Target Destination
              </span>
              <div className="relative w-36">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  placeholder="Filter list..."
                  aria-label="Filter target destination dropdown"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-arcus-cyan"
                />
              </div>
            </div>

            <select
              aria-label="Target Destination"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-arcus-cyan cursor-pointer font-sans"
            >
              {filteredTargetList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} ({c.nameJa}) — [{c.debutGame.toUpperCase()}]
                </option>
              ))}
            </select>

            {targetCharacter && (
              <div
                onClick={() => onSelectCharacter && onSelectCharacter(targetCharacter.id)}
                className="flex items-center gap-3 pt-1 cursor-pointer group"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-amber-500/50 bg-slate-950">
                  <CharacterAvatar
                    character={targetCharacter}
                    size={56}
                    aspectRatio="portrait"
                    fit="cover"
                    activeGameId={activeGameId}
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-cinzel font-bold text-white group-hover:text-arcus-cyan truncate">
                    {language === 'ja' ? targetCharacter.nameJa : targetCharacter.nameEn}
                  </div>
                  <div className="text-[11px] text-imperial-gold truncate">
                    {targetCharacter.titleEn}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Debut: {targetCharacter.debutGame.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-slate-400 mr-1">Quick Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOriginId(p.origin);
                setTargetId(p.target);
              }}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Routing Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-bg-panel/70 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-arcus-cyan/10 text-arcus-cyan">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tabular-nums">
              {pathResult.found ? `${pathResult.degrees} Degrees` : 'No Connection'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">
              Degrees of Separation
            </div>
          </div>
        </div>

        <div className="bg-bg-panel/70 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
              {pathResult.executionTimeMs.toFixed(2)} ms
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">
              Execution Latency (Sub-5ms)
            </div>
          </div>
        </div>

        <div className="bg-bg-panel/70 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tabular-nums">
              {pathResult.nodes.length} Characters
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">
              Total Route Operatives
            </div>
          </div>
        </div>
      </div>

      {/* 3. Step-by-Step Connection Chain */}
      {pathResult.found ? (
        <div className="bg-bg-panel/80 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Verified Step-by-Step Resonance Chain
            </h3>
            <span className="text-xs font-mono text-arcus-cyan tabular-nums">
              {pathResult.degrees === 0
                ? 'Reflexive Origin/Target Match'
                : `${pathResult.degrees} Hop${pathResult.degrees > 1 ? 's' : ''}`}
            </span>
          </div>

          {pathResult.degrees === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono">
              Origin and destination are identical. Zero hops required.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pathResult.nodes.map((char, idx) => {
                const edge = pathResult.edges[idx];
                const sanitizedEdge = edge
                  ? sanitizeRelationship(edge, activeGameId, unmaskedSpoilerIds)
                  : null;

                return (
                  <div key={char.id} className="space-y-4">
                    {/* Node Card */}
                    <div
                      onClick={() => onSelectCharacter && onSelectCharacter(char.id)}
                      className="bg-slate-950/80 border border-slate-800 hover:border-arcus-cyan/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all shadow-md group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-7 h-7 rounded-full bg-slate-900 border border-arcus-cyan/50 flex items-center justify-center text-xs font-mono font-bold text-arcus-cyan shrink-0 tabular-nums">
                          {idx + 1}
                        </span>

                        {/* Prominent High-Definition Character Portrait */}
                        <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shrink-0 border-2 border-slate-700/80 shadow-md group-hover:border-arcus-cyan group-hover:scale-105 transition-all bg-slate-950 flex items-center justify-center">
                          <CharacterAvatar
                            character={char}
                            size={90}
                            aspectRatio="portrait"
                            fit="cover"
                            activeGameId={activeGameId}
                            showRing={true}
                            className="w-full h-full"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-cinzel font-bold text-base text-white group-hover:text-arcus-cyan transition">
                              {language === 'ja' ? char.nameJa : char.nameEn}
                            </h4>
                            <span className="text-xs font-mono text-slate-400">
                              {language === 'ja' ? char.nameEn : char.nameJa}
                            </span>
                          </div>
                          <p className="text-xs text-imperial-gold font-medium">{char.titleEn}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Weapons: {char.weapons.join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {char.debutGame.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-arcus-cyan group-hover:underline">
                          View Dossier →
                        </span>
                      </div>
                    </div>

                    {/* Edge Connector Card (if not last node) */}
                    {edge && (
                      <div className="pl-6 pr-2 py-2 flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-4 bg-arcus-cyan/40" />
                          <ArrowRight className="w-4 h-4 text-arcus-cyan rotate-90" />
                          <div className="w-0.5 h-4 bg-arcus-cyan/40" />
                        </div>

                        <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getBondTypeBadgeClass(
                                  edge.type
                                )}`}
                              >
                                {edge.type}
                              </span>
                              <span className="font-semibold text-slate-200">
                                {sanitizedEdge ? sanitizedEdge.labelEn : edge.labelEn}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                ({sanitizedEdge ? sanitizedEdge.labelJa : edge.labelJa})
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px]">
                              {sanitizedEdge ? sanitizedEdge.descEn : edge.descEn}
                            </p>
                          </div>

                          {edge.isSecret &&
                            sanitizedEdge?.labelEn.includes('Classified') &&
                            onToggleUnmaskSpoiler && (
                              <button
                                type="button"
                                onClick={() => onToggleUnmaskSpoiler(edge.id)}
                                className="px-2 py-1 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-900/60 text-[10px] font-mono shrink-0 cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Unmask Lore</span>
                              </button>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Disconnected State */
        <div className="bg-bg-panel/80 border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-cinzel text-white">
            No Resonance Path Detected in Current Chronicle
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            The selected operatives are separated by narrative chronological boundaries or belong to
            isolated network components under {activeGameId.toUpperCase()}.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAllowSpoilers(true)}
              className="px-4 py-2 rounded-lg bg-arcus-cyan text-slate-950 text-xs font-bold hover:bg-sky-400 transition cursor-pointer shadow-md shadow-arcus-cyan/20"
            >
              Enable 'Allow Spoilers' to search entire Zemurian history
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
