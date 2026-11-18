import { useState, useMemo, useEffect } from 'react';
import { games, ALL_TIMELINE_ARC } from './data/games';
import { factions } from './data/factions';
import { characters } from './data/characters';
import { relationships } from './data/relationships';
import { GameId } from './types';
import { GameProgressionBar } from './components/navigation/GameProgressionBar';
import { DeepDiveArcView } from './components/deepdive/DeepDiveArcView';
import { FactionHierarchyTree } from './components/tree/FactionHierarchyTree';
import { OrbmentBondGraph } from './components/graph/OrbmentBondGraph';
import { RelationshipPathFinder } from './components/pathfinder/RelationshipPathFinder';
import { CharacterDossierModal } from './components/dossier/CharacterDossierModal';
import { CharacterAvatar } from './components/common/CharacterAvatar';
import { usePersistentState } from './hooks/usePersistentState';
import type { ViewMode } from './services/storage';
import {
  Sparkles,
  BookOpen,
  Shield,
  Users,
  Network,
  Sun,
  Moon,
  Layers,
  Compass,
  Search,
  X,
} from 'lucide-react';

export default function App() {
  const { state, setState } = usePersistentState();
  const [lightTheme, setLightTheme] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // Sync light/dark theme attribute on documentElement
  useEffect(() => {
    if (lightTheme) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [lightTheme]);

  // Global Ctrl+K / Cmd+K shortcut for Tactical Command Search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isCommandSearchOpen) {
        setIsCommandSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCommandSearchOpen]);

  // Active Game Object
  const activeGame = useMemo(() => {
    if (state.selectedGameId === 'all') {
      return ALL_TIMELINE_ARC;
    }
    return games.find((g) => g.id === state.selectedGameId) || games[0];
  }, [state.selectedGameId]);

  // Selected Character for Dossier Modal
  const [dossierCharId, setDossierCharId] = useState<string | null>(null);
  const selectedDossierCharacter = useMemo(() => {
    return characters.find((c) => c.id === dossierCharId) || null;
  }, [dossierCharId]);

  // Path Finder Origin & Target State
  const [pathOriginId, setPathOriginId] = useState<string>('estelle');
  const [pathTargetId, setPathTargetId] = useState<string>('van');

  // Convert unmasked spoilers array to Set for fast lookups
  const unmaskedSpoilerSet = useMemo(() => {
    return new Set(state.unmaskedSpoilerIds);
  }, [state.unmaskedSpoilerIds]);

  const factionMap = useMemo(() => {
    return new Map(factions.map((f) => [f.id, f]));
  }, []);

  // Global Command Search Results
  const commandSearchResults = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) {
      return characters.slice(0, 12);
    }
    return characters
      .filter((c) => {
        const fac = factionMap.get(c.factionId);
        return (
          c.nameEn.toLowerCase().includes(q) ||
          c.nameJa.toLowerCase().includes(q) ||
          c.titleEn.toLowerCase().includes(q) ||
          c.titleJa.toLowerCase().includes(q) ||
          c.seiyuu.toLowerCase().includes(q) ||
          c.weapons.some((w) => w.toLowerCase().includes(q)) ||
          (fac && fac.nameEn.toLowerCase().includes(q))
        );
      })
      .slice(0, 24);
  }, [commandQuery, factionMap]);

  // Handlers
  const handleSelectGame = (gameId: GameId) => {
    setState((prev) => ({ ...prev, selectedGameId: gameId }));
  };

  const handleToggleUnmaskSpoiler = (id: string) => {
    setState((prev) => {
      const next = new Set(prev.unmaskedSpoilerIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, unmaskedSpoilerIds: Array.from(next) };
    });
  };

  const handleSetPathOrigin = (charId: string) => {
    setPathOriginId(charId);
    setState((prev) => ({ ...prev, activeView: 'pathfinder' }));
  };

  const handleSetPathTarget = (charId: string) => {
    setPathTargetId(charId);
    setState((prev) => ({ ...prev, activeView: 'pathfinder' }));
  };

  const handleFocusInGraph = (charId: string) => {
    setState((prev) => ({ ...prev, activeView: 'network', selectedCharId: charId }));
  };

  return (
    <div
      className={`min-h-dvh bg-bg-deep text-slate-100 flex flex-col font-inter ${
        state.highContrastMode ? 'high-contrast-mode' : ''
      }`}
    >
      {/* 1. Tactical Command Header */}
      <header className="border-b border-arcus-cyan/20 bg-bg-panel/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-arcus-cyan animate-pulse" />
              <span className="text-[11px] uppercase tracking-widest text-arcus-cyan font-mono font-semibold">
                ARCUS II / XIPHA Tactical Command Network
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold font-cinzel text-white tracking-wide mt-0.5">
              THE LEGEND OF HEROES — ZEMURIAN RELATIONSHIP VISUALIZER
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Global Operative Quick-Search Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={() => setIsCommandSearchOpen(true)}
              aria-label="Open Global Character Search"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-arcus-cyan/60 text-xs text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-arcus-cyan" />
              <span>Search {characters.length} Operatives...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 border border-slate-700 rounded text-slate-400">
                Ctrl+K
              </kbd>
            </button>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              aria-label={lightTheme ? 'Switch to Dark Tactical Theme' : 'Switch to Light Archival Theme'}
              onClick={() => setLightTheme((prev) => !prev)}
              title={lightTheme ? 'Switch to Dark Tactical Theme' : 'Switch to Light Archival Theme'}
              className="p-2 rounded-lg border bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 text-xs font-mono transition cursor-pointer"
            >
              {lightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* High Contrast Mode Toggle */}
            <button
              type="button"
              aria-label="Toggle WCAG AAA High-Contrast Mode"
              onClick={() =>
                setState((prev) => ({ ...prev, highContrastMode: !prev.highContrastMode }))
              }
              title="Toggle WCAG AAA High-Contrast Mode"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                state.highContrastMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              AAA
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              aria-label="Toggle English or Japanese Language"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  language: prev.language === 'en' ? 'ja' : 'en',
                }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              {state.language.toUpperCase()}
            </button>

            <span className="hidden lg:inline-block px-3 py-1 rounded-lg bg-arcus-cyan/10 border border-arcus-cyan/30 text-arcus-cyan text-xs font-mono">
              Status: ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* 2. 1-Click Game Progression Toolbar */}
      <GameProgressionBar
        games={games}
        selectedGameId={state.selectedGameId}
        onSelectGame={handleSelectGame}
      />

      {/* 3. Main Dashboard Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* View Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'deepdive', label: 'Deep Dive Arc', icon: BookOpen },
              { id: 'tree', label: 'Faction Hierarchy', icon: Layers },
              { id: 'network', label: 'Orbment Bond Graph', icon: Network },
              { id: 'pathfinder', label: 'Link Path Finder', icon: Compass },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setState((prev) => ({ ...prev, activeView: id as ViewMode }))}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  state.activeView === id
                    ? 'bg-arcus-cyan text-slate-950 shadow-md shadow-arcus-cyan/20 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Active Horizon:{' '}
            <span className="text-arcus-cyan font-bold">
              {state.language === 'ja' ? activeGame.nameJa : activeGame.nameEn}
            </span>
          </div>
        </div>

        {/* Tactical Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-bg-panel/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-arcus-cyan/10 text-arcus-cyan">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">{games.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Mainline Releases
              </div>
            </div>
          </div>

          <div className="bg-bg-panel/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-imperial-gold/10 text-imperial-gold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">{factions.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Factions & Forces
              </div>
            </div>
          </div>

          <div className="bg-bg-panel/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">{characters.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Verified Operatives
              </div>
            </div>
          </div>

          <div className="bg-bg-panel/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">
                {relationships.length}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Tactical Links
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic View Container */}
        <div className="flex-1">
          {state.activeView === 'deepdive' && (
            <DeepDiveArcView
              activeGame={activeGame}
              allCharacters={characters}
              allFactions={factions}
              allRelationships={relationships}
              unmaskedSpoilerIds={unmaskedSpoilerSet}
              onToggleUnmaskSpoiler={handleToggleUnmaskSpoiler}
              onSelectCharacter={(charId) => setDossierCharId(charId)}
              language={state.language}
            />
          )}

          {state.activeView === 'tree' && (
            <FactionHierarchyTree
              characters={characters}
              factions={factions}
              activeGameId={state.selectedGameId}
              selectedCharId={state.selectedCharId}
              onSelectCharacter={(charId) => setDossierCharId(charId)}
              language={state.language}
            />
          )}

          {state.activeView === 'network' && (
            <OrbmentBondGraph
              characters={characters}
              relationships={relationships}
              activeGameId={state.selectedGameId}
              selectedCharId={state.selectedCharId}
              onSelectCharacter={(char) => setDossierCharId(char.id)}
              highContrastMode={state.highContrastMode}
              unmaskedSpoilerIds={state.unmaskedSpoilerIds}
              physicsConfig={state.physicsConfig}
              onPhysicsChange={(config) => setState((prev) => ({ ...prev, physicsConfig: config }))}
              language={state.language}
            />
          )}

          {state.activeView === 'pathfinder' && (
            <RelationshipPathFinder
              characters={characters}
              relationships={relationships}
              activeGameId={state.selectedGameId}
              defaultOriginId={pathOriginId}
              defaultTargetId={pathTargetId}
              onSelectCharacter={(charId) => setDossierCharId(charId)}
              unmaskedSpoilerIds={unmaskedSpoilerSet}
              onToggleUnmaskSpoiler={handleToggleUnmaskSpoiler}
              language={state.language}
            />
          )}
        </div>
      </main>

      {/* Global Command Search Modal (Ctrl+K) */}
      {isCommandSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global Operative Command Search"
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsCommandSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-bg-panel border border-arcus-cyan/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <Search className="w-4 h-4 text-arcus-cyan shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search any character, NPC, faction, weapon, or voice actor (EN / JA)..."
                aria-label="Global character search input"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {commandQuery && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => setCommandQuery('')}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Close Global Search"
                onClick={() => setIsCommandSearchOpen(false)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {commandSearchResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  No operatives matched &ldquo;{commandQuery}&rdquo;.
                </div>
              ) : (
                commandSearchResults.map((char) => {
                  const fac = factionMap.get(char.factionId);
                  const eraCount = char.variants ? Object.keys(char.variants).length : 0;
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        setDossierCharId(char.id);
                        setIsCommandSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-arcus-cyan/60 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-14 rounded-lg overflow-hidden shrink-0 border bg-slate-950"
                          style={{ borderColor: fac?.color || '#38bdf8' }}
                        >
                          <CharacterAvatar
                            character={char}
                            factionColor={fac?.color}
                            size={48}
                            aspectRatio="portrait"
                            fit="cover"
                            activeGameId={state.selectedGameId}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-bold text-sm text-white group-hover:text-arcus-cyan truncate">
                              {state.language === 'ja' ? char.nameJa : char.nameEn}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {state.language === 'ja' ? char.nameEn : char.nameJa}
                            </span>
                            {eraCount >= 2 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-400/50 text-amber-300 text-[9px] font-mono font-bold tabular-nums">
                                ✦ {eraCount + 1} Eras
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-imperial-gold truncate">{char.titleEn}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {fac?.nameEn} • Debut: {char.debutGame.toUpperCase()} • CV: {char.seiyuu}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-arcus-cyan shrink-0 ml-2">
                        Inspect →
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Character Dossier Inspector Modal */}
      <CharacterDossierModal
        character={selectedDossierCharacter}
        activeGameId={state.selectedGameId}
        allCharacters={characters}
        allFactions={factions}
        allRelationships={relationships}
        unmaskedSpoilerIds={unmaskedSpoilerSet}
        isOpen={selectedDossierCharacter !== null}
        onClose={() => setDossierCharId(null)}
        onSelectCharacter={(charId) => setDossierCharId(charId)}
        onSetPathOrigin={handleSetPathOrigin}
        onSetPathTarget={handleSetPathTarget}
        onFocusInGraph={handleFocusInGraph}
        onToggleUnmaskSpoiler={handleToggleUnmaskSpoiler}
        language={state.language}
      />

      {/* Tactical Command Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        The Legend of Heroes (Trails / Kiseki) Saga Interactive Visualizer • ARCUS II & XIPHA
        Tactical Interface
      </footer>
    </div>
  );
}
