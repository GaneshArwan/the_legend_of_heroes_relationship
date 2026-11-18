import React, { useState, useMemo } from 'react';
import { Character, Faction, GameId } from '../../types';
import { CharacterAvatar } from '../common/CharacterAvatar';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  Search,
  Award,
  Swords,
  Flame,
  Users,
} from 'lucide-react';
import { isCharacterVisible, getCharacterEffectiveTitle } from '../../services/spoilerEngine';

export interface FactionHierarchyTreeProps {
  characters: Character[];
  factions: Faction[];
  activeGameId: GameId;
  selectedCharId?: string;
  onSelectCharacter: (charId: string) => void;
  language?: 'en' | 'ja';
  className?: string;
}

type SpotlightFilter = 'all' | 'bracer' | 'jaeger' | 'active';

interface TierCategorization {
  leaders: Character[];
  officers: Character[];
  members: Character[];
}

export const FactionHierarchyTree: React.FC<FactionHierarchyTreeProps> = ({
  characters,
  factions,
  activeGameId,
  selectedCharId,
  onSelectCharacter,
  language = 'en',
  className = '',
}) => {
  const [spotlight, setSpotlight] = useState<SpotlightFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFactions, setCollapsedFactions] = useState<Set<string>>(new Set());

  // Toggle collapse state for a faction accordion
  const toggleCollapse = (factionId: string) => {
    setCollapsedFactions((prev) => {
      const next = new Set(prev);
      if (next.has(factionId)) next.delete(factionId);
      else next.add(factionId);
      return next;
    });
  };

  // 1. Filter characters visible in current game
  const visibleCharacters = useMemo(() => {
    return characters.filter((c) => isCharacterVisible(c, activeGameId));
  }, [characters, activeGameId]);

  // 2. Faction categorization and spotlights
  const BRACER_FACTION_IDS = useMemo(
    () =>
      new Set([
        'bracer_guild',
        'bracer_guild_liberl',
        'bracer_guild_crossbell',
        'bracer_guild_erebonia',
        'bracer_guild_calvard',
      ]),
    []
  );

  const JAEGER_FACTION_IDS = useMemo(
    () =>
      new Set([
        'jaeger_zephyr',
        'red_constellation',
        'krugha_warriors',
        'northern_jaegers',
        'ikaruga_shinobi',
      ]),
    []
  );

  // Filter factions based on spotlight
  const filteredFactions = useMemo(() => {
    let result = factions;

    if (spotlight === 'bracer') {
      result = factions.filter(
        (f) =>
          BRACER_FACTION_IDS.has(f.id) ||
          f.id.includes('bracer') ||
          f.nameEn.toLowerCase().includes('bracer')
      );
    } else if (spotlight === 'jaeger') {
      result = factions.filter(
        (f) =>
          JAEGER_FACTION_IDS.has(f.id) ||
          f.id.includes('jaeger') ||
          f.nameEn.toLowerCase().includes('jaeger') ||
          f.nameEn.toLowerCase().includes('constellation') ||
          f.nameEn.toLowerCase().includes('krugha') ||
          f.nameEn.toLowerCase().includes('ikaruga')
      );
    } else if (spotlight === 'active') {
      // Keep factions that have at least one visible member in current game
      const populatedFactionIds = new Set(visibleCharacters.map((c) => c.factionId));
      result = factions.filter((f) => populatedFactionIds.has(f.id));
    }

    // Apply search query filter if present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => {
        const matchesFaction =
          f.nameEn.toLowerCase().includes(q) || f.nameJa.toLowerCase().includes(q);
        const hasMatchingMember = visibleCharacters.some(
          (c) =>
            c.factionId === f.id &&
            (c.nameEn.toLowerCase().includes(q) ||
              c.nameJa.toLowerCase().includes(q) ||
              c.titleEn.toLowerCase().includes(q))
        );
        return matchesFaction || hasMatchingMember;
      });
    }

    return result;
  }, [
    factions,
    spotlight,
    searchQuery,
    visibleCharacters,
    BRACER_FACTION_IDS,
    JAEGER_FACTION_IDS,
  ]);

  // Helper to categorize characters in a faction into 3 tiers
  const categorizeTiers = (roster: Character[]): TierCategorization => {
    const leaders: Character[] = [];
    const officers: Character[] = [];
    const members: Character[] = [];

    roster.forEach((c) => {
      const title = (c.variants?.[activeGameId]?.titleEn || c.titleEn).toLowerCase();
      const name = c.nameEn.toLowerCase();

      // Leadership: Grandmaster, Anguis, Commander, Chief, Leader, Guildmaster, S-Rank, Principal, General
      if (
        title.includes('leader') ||
        title.includes('commander') ||
        title.includes('chief') ||
        title.includes('principal') ||
        title.includes('guildmaster') ||
        title.includes('grandmaster') ||
        title.includes('s-rank') ||
        title.includes('anguis') ||
        title.includes('governor') ||
        title.includes('head') ||
        name.includes('cassius') ||
        name.includes('osborne')
      ) {
        leaders.push(c);
      }
      // Officers & Instructors: Instructor, Captain, Dominion, A-Rank, B-Rank, Senior, Enforcer, Major, Specialist
      else if (
        title.includes('instructor') ||
        title.includes('captain') ||
        title.includes('dominion') ||
        title.includes('a-rank') ||
        title.includes('b-rank') ||
        title.includes('senior') ||
        title.includes('enforcer') ||
        title.includes('major') ||
        title.includes('vice') ||
        title.includes('officer') ||
        title.includes('divine blade')
      ) {
        officers.push(c);
      }
      // Members / Cadets / Students
      else {
        members.push(c);
      }
    });

    return { leaders, officers, members };
  };

  // Helper for bracer rank badge styling
  const getBracerRankBadge = (char: Character) => {
    const title = (char.variants?.[activeGameId]?.titleEn || char.titleEn).toLowerCase();
    if (title.includes('s-rank')) {
      return {
        label: 'S-Rank Bracer',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      };
    }
    if (title.includes('a-rank') || title.includes('divine blade')) {
      return {
        label: 'A-Rank Bracer',
        color: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      };
    }
    if (title.includes('b-rank')) {
      return {
        label: 'B-Rank Bracer',
        color: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
      };
    }
    if (title.includes('senior')) {
      return {
        label: 'Senior Bracer',
        color: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      };
    }
    if (title.includes('junior')) {
      return {
        label: 'Junior Bracer',
        color: 'bg-slate-700/40 text-slate-400 border-slate-600/50',
      };
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header Toolbar with Spotlights and Search */}
      <div className="bg-bg-panel/80 border border-slate-800 rounded-xl p-4 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Spotlight Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Spotlight:
          </span>
          <button
            onClick={() => setSpotlight('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              spotlight === 'all'
                ? 'bg-arcus-cyan text-slate-950 font-bold shadow-md shadow-arcus-cyan/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>All Organizations</span>
          </button>

          <button
            onClick={() => setSpotlight('bracer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              spotlight === 'bracer'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-400/20'
                : 'bg-slate-900 text-sky-400 hover:bg-slate-800 border border-sky-900/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Bracer Guild Branches</span>
          </button>

          <button
            onClick={() => setSpotlight('jaeger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              spotlight === 'jaeger'
                ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-900/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Jaeger Corps</span>
          </button>

          <button
            onClick={() => setSpotlight('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              spotlight === 'active'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-900/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active in Horizon</span>
          </button>
        </div>

        {/* Search Bar & Expand/Collapse Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsedFactions(new Set())}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setCollapsedFactions(new Set(filteredFactions.map((f) => f.id)))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
          >
            Collapse All
          </button>
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faction or operative..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-arcus-cyan"
            />
          </div>
        </div>
      </div>

      {/* 2. Factions Accordion Tree */}
      <div className="space-y-4">
        {filteredFactions.map((faction) => {
          const isCollapsed = collapsedFactions.has(faction.id);
          const roster = visibleCharacters.filter(
            (c) =>
              c.factionId === faction.id ||
              c.subgroupId === faction.id ||
              (faction.id === 'old_class_vii' && (c.factionId === 'thors_class_vii' || c.factionId === 'old_class_vii')) ||
              (faction.id === 'thors_class_vii' && c.factionId === 'old_class_vii') ||
              (faction.id === 'bracer_guild' && (BRACER_FACTION_IDS.has(c.factionId) || c.subgroupId?.startsWith('bracer_guild'))) ||
              (faction.id.startsWith('bracer_guild') &&
                (c.factionId === faction.id || c.factionId === 'bracer_guild' || c.subgroupId === faction.id))
          );

          const { leaders, officers, members } = categorizeTiers(roster);
          const isBracerGroup =
            BRACER_FACTION_IDS.has(faction.id) || faction.nameEn.toLowerCase().includes('bracer');
          const isJaegerGroup =
            JAEGER_FACTION_IDS.has(faction.id) || faction.nameEn.toLowerCase().includes('jaeger');

          return (
            <div
              key={faction.id}
              className="bg-bg-panel/70 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-md"
              style={{ borderLeftColor: faction.color, borderLeftWidth: '4px' }}
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleCollapse(faction.id)}
                className="p-4 bg-slate-900/50 hover:bg-slate-900/80 cursor-pointer flex items-center justify-between transition select-none"
              >
                <div className="flex items-center gap-3">
                  <button type="button" className="text-slate-400 hover:text-white">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: faction.color }}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-cinzel font-bold text-sm text-white">
                        {language === 'ja' ? faction.nameJa : faction.nameEn}
                      </h3>
                      {isBracerGroup && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                          Bracer Guild Branch
                        </span>
                      )}
                      {isJaegerGroup && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                          Jaeger Corps
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {language === 'ja' ? faction.nameEn : faction.nameJa}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {roster.length} Active Operatives
                  </span>
                </div>
              </div>

              {/* Accordion Content Body (3 Tiers) */}
              {!isCollapsed && (
                <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/40">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {language === 'ja' ? faction.descriptionJa : faction.descriptionEn}
                  </p>

                  {roster.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">
                      No active operatives introduced under {activeGameId.toUpperCase()} timeline
                      horizon.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Tier 1: Leadership & Strategic Command */}
                      {leaders.length > 0 && (
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-wider text-imperial-gold mb-2 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" />
                            <span>Tier 1: Leadership & Strategic Command ({leaders.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {leaders.map((char) => renderCharacterCard(char))}
                          </div>
                        </div>
                      )}

                      {/* Tier 2: Officers & Specialists */}
                      {officers.length > 0 && (
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-wider text-arcus-cyan mb-2 flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5" />
                            <span>
                              Tier 2: Officers, Instructors & Aces ({officers.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {officers.map((char) => renderCharacterCard(char))}
                          </div>
                        </div>
                      )}

                      {/* Tier 3: Members & Operatives */}
                      {members.length > 0 && (
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              Tier 3: Members, Operatives & Cadets ({members.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {members.map((char) => renderCharacterCard(char))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  function renderCharacterCard(char: Character) {
    const isSelected = char.id === selectedCharId;
    const title = getCharacterEffectiveTitle(char, activeGameId, language);
    const bracerBadge = getBracerRankBadge(char);
    const variantCount = char.variants ? Object.keys(char.variants).length : 0;

    return (
      <div
        key={char.id}
        onClick={() => onSelectCharacter(char.id)}
        className={`p-3.5 rounded-xl border flex items-center gap-4 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-lg ${
          isSelected
            ? 'bg-slate-900 border-arcus-cyan ring-1 ring-arcus-cyan/50 shadow-arcus-cyan/20'
            : 'bg-slate-900/80 border-slate-800 hover:border-arcus-cyan/60 hover:bg-slate-800/90'
        }`}
      >
        {/* Prominent High-Definition Character Portrait */}
        <div
          className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shrink-0 border-2 shadow-lg group-hover:scale-105 group-hover:border-arcus-cyan transition-all duration-200 bg-slate-950 flex items-center justify-center relative"
          style={{ borderColor: isSelected ? '#38bdf8' : undefined }}
        >
          <CharacterAvatar
            character={char}
            size={96}
            aspectRatio="portrait"
            fit="cover"
            activeGameId={activeGameId}
            showRing={isSelected}
            ringColor="#38bdf8"
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
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-cinzel font-bold text-sm text-white group-hover:text-arcus-cyan transition truncate">
              {language === 'ja' ? char.nameJa : char.nameEn}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 shrink-0">
              {char.debutGame.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-imperial-gold font-medium truncate mt-0.5">{title}</div>
          <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
            {char.weapons[0] || 'Combat Arts'}
          </div>

          {bracerBadge && (
            <div className="mt-1.5">
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border ${bracerBadge.color}`}
              >
                {bracerBadge.label}
              </span>
            </div>
          )}

          <div className="text-[10px] text-arcus-cyan/80 group-hover:text-arcus-cyan font-mono mt-1 flex items-center gap-1">
            <span>View Dossier</span>
            <span>→</span>
          </div>
        </div>
      </div>
    );
  }
};
