import React, { useState, useMemo } from 'react';
import { GameArc, Character, Faction, Relationship } from '../../types';
import { CharacterAvatar } from '../common/CharacterAvatar';
import {
  Shield,
  BookOpen,
  Users,
  Eye,
  EyeOff,
  Radio,
  MapPin,
  Calendar,
  LayoutGrid,
  Image,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { GAME_ORDER } from '../../services/spoilerEngine';

export interface DeepDiveArcViewProps {
  activeGame: GameArc;
  allCharacters: Character[];
  allFactions: Faction[];
  allRelationships: Relationship[];
  unmaskedSpoilerIds: Set<string>;
  onToggleUnmaskSpoiler: (id: string) => void;
  onSelectCharacter: (charId: string) => void;
  onFindPathBetween?: (originId: string, targetId: string) => void;
  language?: 'en' | 'ja';
  className?: string;
}

type RosterQuickFilter = 'all' | 'multi_era' | 'spoilers';

export const DeepDiveArcView: React.FC<DeepDiveArcViewProps> = ({
  activeGame,
  allCharacters,
  allFactions,
  unmaskedSpoilerIds,
  onToggleUnmaskSpoiler,
  onSelectCharacter,
  language = 'en',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'hero'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<RosterQuickFilter>('all');
  const [selectedFactionChip, setSelectedFactionChip] = useState<string>('all');

  // 1. Filter characters visible in current game horizon
  const visibleCharacters = useMemo(() => {
    const activeOrder = GAME_ORDER[activeGame.id];
    return allCharacters.filter((char) => {
      if (unmaskedSpoilerIds.has(char.id)) return true;
      return GAME_ORDER[char.debutGame] <= activeOrder;
    });
  }, [allCharacters, activeGame.id, unmaskedSpoilerIds]);

  // Apply search query & quick filter to visible characters
  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleCharacters.filter((char) => {
      if (rosterFilter === 'multi_era') {
        const eraCount = char.variants ? Object.keys(char.variants).length : 0;
        if (eraCount < 2) return false;
      } else if (rosterFilter === 'spoilers') {
        if (!char.spoilerNotes || char.spoilerNotes.length === 0) return false;
      }

      if (!q) return true;
      return (
        char.nameEn.toLowerCase().includes(q) ||
        char.nameJa.toLowerCase().includes(q) ||
        char.titleEn.toLowerCase().includes(q) ||
        char.titleJa.toLowerCase().includes(q) ||
        char.seiyuu.toLowerCase().includes(q) ||
        char.weapons.some((w) => w.toLowerCase().includes(q))
      );
    });
  }, [visibleCharacters, searchQuery, rosterFilter]);

  // 2. Filter factions active in this game
  const activeFactions = useMemo(() => {
    const activeFactionIds = new Set(activeGame.activeFactions);
    return allFactions.filter((f) => activeFactionIds.has(f.id));
  }, [allFactions, activeGame.activeFactions]);

  // 3. Characters grouped by faction for localized roster
  const charactersByFaction = useMemo(() => {
    const map = new Map<string, Character[]>();
    activeFactions.forEach((f) => map.set(f.id, []));
    filteredCharacters.forEach((char) => {
      // Primary faction match
      if (map.has(char.factionId)) {
        if (!map.get(char.factionId)!.some((c) => c.id === char.id)) {
          map.get(char.factionId)!.push(char);
        }
      }
      // Subgroup faction match
      if (char.subgroupId && map.has(char.subgroupId)) {
        if (!map.get(char.subgroupId)!.some((c) => c.id === char.id)) {
          map.get(char.subgroupId)!.push(char);
        }
      }
      // Old Class VII in CS3+
      if (
        map.has('old_class_vii') &&
        (char.factionId === 'thors_class_vii' || char.factionId === 'old_class_vii')
      ) {
        if (!map.get('old_class_vii')!.some((c) => c.id === char.id)) {
          map.get('old_class_vii')!.push(char);
        }
      }
      // Thors Class VII in CS1/CS2 if char is old_class_vii
      if (map.has('thors_class_vii') && char.factionId === 'old_class_vii') {
        if (!map.get('thors_class_vii')!.some((c) => c.id === char.id)) {
          map.get('thors_class_vii')!.push(char);
        }
      }
      // Pan-Zemurian Bracer Guild umbrella
      if (
        map.has('bracer_guild') &&
        (char.factionId.startsWith('bracer_guild') ||
          char.subgroupId?.startsWith('bracer_guild'))
      ) {
        if (!map.get('bracer_guild')!.some((c) => c.id === char.id)) {
          map.get('bracer_guild')!.push(char);
        }
      }
    });
    return map;
  }, [activeFactions, filteredCharacters]);

  // Factions to display based on selectedFactionChip and non-empty search matches
  const displayedFactions = useMemo(() => {
    return activeFactions.filter((f) => {
      if (selectedFactionChip !== 'all' && f.id !== selectedFactionChip) {
        return false;
      }
      // If user is actively filtering/searching, hide empty faction boxes so results are immediate
      if (searchQuery.trim() !== '' || rosterFilter !== 'all') {
        const roster = charactersByFaction.get(f.id) || [];
        return roster.length > 0;
      }
      return true;
    });
  }, [activeFactions, selectedFactionChip, searchQuery, rosterFilter, charactersByFaction]);

  const multiEraCount = useMemo(
    () =>
      visibleCharacters.filter((c) => c.variants && Object.keys(c.variants).length >= 2).length,
    [visibleCharacters]
  );

  return (
    <div
      className={`space-y-6 ${className}`}
      id={`deepdive-panel-${activeGame.id}`}
      role="tabpanel"
    >
      {/* 1. Tactical Header Banner */}
      <div className="bg-bg-panel/80 border border-arcus-cyan/30 rounded-xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-arcus-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-arcus-cyan uppercase tracking-wider mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{activeGame.year}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>{activeGame.region}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-white tracking-wide text-balance">
              {language === 'ja' ? activeGame.nameJa : activeGame.nameEn}
            </h1>
            <p className="text-sm font-inter text-slate-400 mt-0.5">
              {language === 'ja' ? activeGame.nameEn : activeGame.nameJa}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-arcus-cyan/40 text-xs font-mono text-arcus-cyan flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-arcus-cyan animate-pulse" />
              <span>Orbment: {activeGame.orbmentSystem}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-imperial-gold/40 text-xs font-mono text-imperial-gold flex items-center gap-1.5 tabular-nums">
              <Users className="w-3.5 h-3.5" />
              <span>{visibleCharacters.length} Active Operatives</span>
            </div>
          </div>
        </div>

        {/* Chapter Conflicts Breakdown */}
        <div className="mt-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
            <BookOpen className="w-4 h-4 text-arcus-cyan" />
            <span>Canonical Chapter Narrative Conflicts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeGame.chapterConflicts.map((conflict, i) => (
              <div
                key={i}
                className="bg-slate-950/70 border border-slate-800 hover:border-arcus-cyan/40 rounded-lg p-3 text-xs transition-colors"
              >
                <div className="text-arcus-cyan font-mono font-semibold">{conflict.chapter}</div>
                <div className="font-semibold text-slate-200 mt-0.5 text-sm">{conflict.title}</div>
                <div className="text-slate-400 mt-1 leading-relaxed text-[11px] text-pretty">
                  {conflict.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Regional Factions & Localized Character Rosters */}
      <div className="space-y-4">
        {/* Control Bar: Search, Quick Filters & View Mode */}
        <div className="bg-slate-900/75 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
              <Shield className="w-4 h-4 text-imperial-gold" />
              <span>
                Regional Factions & Deployed Personnel ({displayedFactions.length}/
                {activeFactions.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Instant Operative Search Input */}
              <div className="relative min-w-[230px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter character, title, weapon, CV..."
                  aria-label="Filter characters in active arc"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-arcus-cyan"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear character search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Roster Filter Pills */}
              <button
                type="button"
                onClick={() => setRosterFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                  rosterFilter === 'all'
                    ? 'bg-slate-800 text-white border-arcus-cyan/60 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                All ({visibleCharacters.length})
              </button>
              <button
                type="button"
                onClick={() =>
                  setRosterFilter(rosterFilter === 'multi_era' ? 'all' : 'multi_era')
                }
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                  rosterFilter === 'multi_era'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                    : 'bg-slate-950 text-amber-400/80 hover:text-amber-300 border-slate-800'
                }`}
                title="Show characters with multiple era portraits across games"
              >
                <Sparkles className="w-3 h-3" />
                <span>Multi-Era ({multiEraCount})</span>
              </button>

              {/* Card Size Toggle */}
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-arcus-cyan text-slate-950 font-bold shadow-md shadow-arcus-cyan/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title="Large Tactical Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Tactical Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('hero')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    viewMode === 'hero'
                      ? 'bg-imperial-gold text-slate-950 font-bold shadow-md shadow-amber-400/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title="Extra-Large Hero Art Showcase"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Hero Art Showcase</span>
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Faction Quick-Jump Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80 scrollbar-thin scrollbar-thumb-slate-700">
            <button
              type="button"
              onClick={() => setSelectedFactionChip('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition cursor-pointer border ${
                selectedFactionChip === 'all'
                  ? 'bg-arcus-cyan/20 text-arcus-cyan border-arcus-cyan font-bold'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All Factions ({activeFactions.length})
            </button>
            {activeFactions.map((f) => {
              const count = (charactersByFaction.get(f.id) || []).length;
              const isSelected = selectedFactionChip === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFactionChip(isSelected ? 'all' : f.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800 text-white border-arcus-cyan font-bold'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                  <span className="truncate max-w-[160px]">
                    {language === 'ja' ? f.nameJa : f.nameEn}
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Search State */}
        {displayedFactions.length === 0 ? (
          <div className="bg-bg-panel/60 border border-slate-800 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-cinzel font-bold text-white">
              No Matching Operatives Found in {activeGame.nameEn}
            </p>
            <p className="text-xs text-slate-400">
              Try clearing your filter or switching to &ldquo;ALL SAGAS&rdquo; in the timeline bar.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRosterFilter('all');
                setSelectedFactionChip('all');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-arcus-cyan text-slate-950 text-xs font-mono font-bold hover:bg-sky-300 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'hero' ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
            }
          >
            {displayedFactions.map((faction) => {
              const roster = charactersByFaction.get(faction.id) || [];
              return (
                <div
                  key={faction.id}
                  className="bg-bg-panel/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: faction.color }}
                        />
                        <div>
                          <h3 className="font-cinzel font-bold text-sm text-white">
                            {language === 'ja' ? faction.nameJa : faction.nameEn}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {language === 'ja' ? faction.nameEn : faction.nameJa}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 tabular-nums">
                        {roster.length} members
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed text-pretty">
                      {language === 'ja' ? faction.descriptionJa : faction.descriptionEn}
                    </p>

                    {/* Character Showcase Grid */}
                    {viewMode === 'cards' ? (
                      /* Standard Tactical Cards with Prominent Portraits */
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {roster.map((char) => {
                          const hasSpoilers = char.spoilerNotes && char.spoilerNotes.length > 0;
                          const isUnmasked = unmaskedSpoilerIds.has(char.id);
                          const variantCount = char.variants
                            ? Object.keys(char.variants).length
                            : 0;

                          return (
                            <div
                              key={char.id}
                              onClick={() => onSelectCharacter(char.id)}
                              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-arcus-cyan/70 hover:bg-slate-900/90 cursor-pointer transition-all duration-200 group shadow-md hover:shadow-arcus-cyan/15"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {/* Prominent High-Definition Portrait */}
                                <div
                                  className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shrink-0 border-2 shadow-lg relative group-hover:scale-105 transition-all duration-200 bg-slate-950 flex items-center justify-center"
                                  style={{ borderColor: faction.color }}
                                >
                                  <CharacterAvatar
                                    character={char}
                                    factionColor={faction.color}
                                    size={100}
                                    aspectRatio="portrait"
                                    fit="cover"
                                    activeGameId={activeGame.id}
                                    className="w-full h-full"
                                  />
                                  {variantCount >= 2 && (
                                    <span
                                      className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-slate-950/90 border border-amber-400/60 text-amber-300 text-[9px] font-mono font-bold tabular-nums shadow"
                                      title={`${variantCount + 1} Era Portraits Available`}
                                    >
                                      ✦ {variantCount + 1} Eras
                                    </span>
                                  )}
                                  <div className="absolute inset-0 bg-slate-950/15 group-hover:bg-transparent transition-colors pointer-events-none" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-cinzel font-bold text-sm text-white group-hover:text-arcus-cyan transition truncate">
                                      {language === 'ja' ? char.nameJa : char.nameEn}
                                    </span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                                      {char.debutGame.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-imperial-gold font-medium truncate mt-0.5">
                                    {char.variants?.[activeGame.id]?.titleEn || char.titleEn}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                    {char.weapons[0] || 'Tactical Combatant'}
                                  </div>
                                  <div className="text-[10px] text-arcus-cyan/80 group-hover:text-arcus-cyan font-mono mt-1 flex items-center gap-1">
                                    <span>View Dossier</span>
                                    <span>→</span>
                                  </div>
                                </div>
                              </div>

                              {/* Selective Unmask Trigger */}
                              {hasSpoilers && (
                                <button
                                  type="button"
                                  aria-label={isUnmasked ? 'Mask Spoilers' : 'Unmask Spoilers'}
                                  title={isUnmasked ? 'Mask Spoilers' : 'Unmask Spoilers'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleUnmaskSpoiler(char.id);
                                  }}
                                  className={`p-2 rounded-lg transition shrink-0 ml-1.5 ${
                                    isUnmasked
                                      ? 'text-purple-400 bg-purple-950/40 hover:bg-purple-950/70'
                                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  {isUnmasked ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Extra-Large Hero Art Showcase Cards */
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {roster.map((char) => {
                          const hasSpoilers = char.spoilerNotes && char.spoilerNotes.length > 0;
                          const isUnmasked = unmaskedSpoilerIds.has(char.id);
                          const variantCount = char.variants
                            ? Object.keys(char.variants).length
                            : 0;

                          return (
                            <div
                              key={char.id}
                              onClick={() => onSelectCharacter(char.id)}
                              className="rounded-2xl bg-slate-950 border-2 overflow-hidden cursor-pointer transition-all duration-300 group hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between"
                              style={{ borderColor: `${faction.color}60` }}
                            >
                              {/* Massive Hero Artwork Showcase */}
                              <div className="w-full h-64 sm:h-72 relative bg-slate-950 flex items-center justify-center p-2 overflow-hidden border-b border-slate-800">
                                <CharacterAvatar
                                  character={char}
                                  factionColor={faction.color}
                                  size={260}
                                  aspectRatio="portrait"
                                  fit="contain"
                                  activeGameId={activeGame.id}
                                  className="w-full h-full drop-shadow-xl"
                                />

                                {/* Faction Badge Watermark */}
                                <span
                                  className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md border"
                                  style={{
                                    backgroundColor: `${faction.color}25`,
                                    borderColor: `${faction.color}70`,
                                    color: faction.color,
                                  }}
                                >
                                  {char.debutGame.toUpperCase()}
                                </span>

                                {variantCount >= 2 && (
                                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/90 border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold tabular-nums">
                                    ✦ {variantCount + 1} Era Portraits
                                  </span>
                                )}

                                {/* Spoiler toggle if applicable */}
                                {hasSpoilers && (
                                  <button
                                    type="button"
                                    aria-label={isUnmasked ? 'Mask Spoilers' : 'Unmask Spoilers'}
                                    title={isUnmasked ? 'Mask Spoilers' : 'Unmask Spoilers'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleUnmaskSpoiler(char.id);
                                    }}
                                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-purple-400 hover:text-white transition"
                                  >
                                    {isUnmasked ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Card Details Footer */}
                              <div className="p-3.5 space-y-1 bg-slate-900/80">
                                <h4 className="font-cinzel font-bold text-base text-white group-hover:text-arcus-cyan transition truncate">
                                  {language === 'ja' ? char.nameJa : char.nameEn}
                                </h4>
                                <div className="text-xs text-imperial-gold font-medium truncate">
                                  {char.variants?.[activeGame.id]?.titleEn || char.titleEn}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {language === 'ja' ? char.nameEn : char.nameJa} • {char.seiyuu}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                  Weapon: {char.weapons[0] || 'Combat Arts'}
                                </div>

                                <div className="pt-2">
                                  <span className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-950 border border-arcus-cyan/40 text-arcus-cyan group-hover:bg-arcus-cyan group-hover:text-slate-950 font-mono text-xs font-bold transition">
                                    <span>Full Dossier & HD Art</span>
                                    <span>→</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
