import React, { useState, useEffect, useMemo } from 'react';
import { Character, Faction, Relationship, GameId } from '../../types';
import { CharacterAvatar } from '../common/CharacterAvatar';
import {
  X,
  Swords,
  Mic,
  Eye,
  EyeOff,
  Navigation,
  Compass,
  Network,
  Cpu,
  Maximize2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { GAME_ORDER } from '../../services/spoilerEngine';

const GAME_LABELS: Record<GameId, string> = {
  sky_fc: 'Sky FC',
  sky_sc: 'Sky SC',
  sky_3rd: 'Sky the 3rd',
  zero: 'Zero',
  azure: 'Azure',
  cs1: 'Cold Steel I',
  cs2: 'Cold Steel II',
  cs3: 'Cold Steel III',
  cs4: 'Cold Steel IV',
  reverie: 'Reverie',
  daybreak1: 'Daybreak I',
  daybreak2: 'Daybreak II',
  all: 'All Saga',
};

function getGameLabel(gameId: GameId): string {
  return GAME_LABELS[gameId] || gameId.toUpperCase();
}

export interface CharacterDossierModalProps {
  character: Character | null;
  activeGameId: GameId;
  allCharacters: Character[];
  allFactions: Faction[];
  allRelationships: Relationship[];
  unmaskedSpoilerIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (charId: string) => void;
  onSetPathOrigin?: (charId: string) => void;
  onSetPathTarget?: (charId: string) => void;
  onFocusInGraph?: (charId: string) => void;
  onToggleUnmaskSpoiler?: (id: string) => void;
  language?: 'en' | 'ja';
}

export const CharacterDossierModal: React.FC<CharacterDossierModalProps> = ({
  character,
  activeGameId,
  allCharacters,
  allFactions,
  allRelationships,
  unmaskedSpoilerIds,
  isOpen,
  onClose,
  onSelectCharacter,
  onSetPathOrigin,
  onSetPathTarget,
  onFocusInGraph,
  onToggleUnmaskSpoiler,
  language = 'en',
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedEra, setSelectedEra] = useState<GameId | null>(null);
  const [bondSearch, setBondSearch] = useState('');

  // Synchronize/reset selected era when character or ambient game changes
  useEffect(() => {
    setBondSearch('');
    if (!character) {
      setSelectedEra(null);
      return;
    }
    if (activeGameId !== 'all' && character.variants && character.variants[activeGameId]) {
      setSelectedEra(activeGameId);
    } else {
      setSelectedEra(null);
    }
  }, [character?.id, activeGameId]);

  // Ordered list of era options ([null (Base), ...variantGameIds]) for keyboard / lightbox cycling
  const eraSequence = useMemo<(GameId | null)[]>(() => {
    if (!character?.variants) return [null];
    const keys = Object.keys(character.variants) as GameId[];
    return [null, ...keys];
  }, [character]);

  const cycleEra = (direction: -1 | 1) => {
    if (eraSequence.length <= 1) return;
    const currentIndex = eraSequence.indexOf(selectedEra);
    const nextIndex = (currentIndex + direction + eraSequence.length) % eraSequence.length;
    setSelectedEra(eraSequence[nextIndex]);
  };

  // Close on Escape key, or cycle eras with Left/Right arrow keys when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLightbox) setShowLightbox(false);
        else onClose();
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        if (eraSequence.length > 1) {
          cycleEra(e.key === 'ArrowLeft' ? -1 : 1);
        }
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showLightbox, selectedEra, eraSequence]);

  // Resolve direct relationships
  const directBonds = useMemo(() => {
    if (!character) return [];
    const charMap = new Map(allCharacters.map((c) => [c.id, c]));
    return allRelationships
      .filter((r) => r.source === character.id || r.target === character.id)
      .map((rel) => {
        const otherId = rel.source === character.id ? rel.target : rel.source;
        return {
          rel,
          partner: charMap.get(otherId),
        };
      })
      .filter(
        (item): item is { rel: Relationship; partner: Character } => item.partner !== undefined
      );
  }, [character, allRelationships, allCharacters]);

  const filteredBonds = useMemo(() => {
    if (!bondSearch.trim()) return directBonds;
    const q = bondSearch.toLowerCase();
    return directBonds.filter(
      ({ rel, partner }) =>
        partner.nameEn.toLowerCase().includes(q) ||
        partner.nameJa.toLowerCase().includes(q) ||
        rel.type.toLowerCase().includes(q) ||
        rel.labelEn.toLowerCase().includes(q) ||
        rel.labelJa.toLowerCase().includes(q)
    );
  }, [directBonds, bondSearch]);

  if (!isOpen || !character) return null;

  // Resolve faction metadata
  const faction = allFactions.find((f) => f.id === character.factionId);
  const factionColor = faction ? faction.color : '#38bdf8';

  // Resolve active variant based on local era selection or ambient fallback
  const effectiveVariant =
    selectedEra && character.variants ? character.variants[selectedEra] : undefined;

  // Dynamic title resolution
  const activeTitleEn =
    effectiveVariant?.titleEn ||
    (selectedEra === null && activeGameId !== 'all' && character.variants?.[activeGameId]?.titleEn) ||
    character.titleEn;
  const activeTitleJa =
    effectiveVariant?.titleJa ||
    (selectedEra === null && activeGameId !== 'all' && character.variants?.[activeGameId]?.titleJa) ||
    character.titleJa;

  // Dynamic weaponry resolution
  const activeWeapons =
    effectiveVariant?.weapons && effectiveVariant.weapons.length > 0
      ? effectiveVariant.weapons
      : character.weapons;

  // Dynamic avatar gameId passed to CharacterAvatar
  // When selectedEra === null (user clicked Base pill), pass 'all' so CharacterAvatar renders the base portrait
  const effectiveAvatarGameId: GameId | undefined =
    selectedEra !== null ? selectedEra : 'all';

  // Check spoiler status
  const isUnmasked = unmaskedSpoilerIds.has(character.id);
  const activeOrder = GAME_ORDER[activeGameId];
  const variantEntries = character.variants ? Object.entries(character.variants) : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-char-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-bg-panel border border-arcus-cyan/40 rounded-2xl shadow-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-arcus-cyan/30 scrollbar-track-slate-900 p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close Character Dossier"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Header Profile Banner with Large High-Fidelity Character Portrait */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-slate-800">
          {/* Prominent Portrait Card Showcase */}
          <div className="relative group shrink-0">
            <div
              className="w-52 sm:w-64 h-68 sm:h-80 rounded-2xl overflow-hidden border-2 shadow-2xl relative bg-slate-950 flex items-center justify-center transition-all duration-300"
              style={{ borderColor: factionColor }}
            >
              <CharacterAvatar
                character={character}
                factionColor={factionColor}
                size={300}
                aspectRatio="portrait"
                fit="contain"
                activeGameId={effectiveAvatarGameId}
                className="w-full h-full"
              />

              {/* Prev / Next Era Floating Quick-Flip Controls when Multiple Eras Exist */}
              {eraSequence.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous Character Era"
                    onClick={() => cycleEra(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-arcus-cyan hover:border-arcus-cyan transition cursor-pointer opacity-85 group-hover:opacity-100"
                    title="Previous Era Portrait (←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next Character Era"
                    onClick={() => cycleEra(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-arcus-cyan hover:border-arcus-cyan transition cursor-pointer opacity-85 group-hover:opacity-100"
                    title="Next Era Portrait (→)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Active Era Watermark Pill */}
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-700/80 text-[10px] font-mono text-amber-300 backdrop-blur-md">
                {selectedEra
                  ? effectiveVariant?.eraLabel || getGameLabel(selectedEra)
                  : `Base • ${getGameLabel(character.debutGame)}`}
              </span>

              {/* Expand High-Res Artwork Button Overlay */}
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-arcus-cyan/70 text-arcus-cyan hover:text-white text-xs font-mono flex items-center gap-1.5 backdrop-blur-md shadow-xl transition cursor-pointer"
                title="View Full Resolution Falcom Artwork"
              >
                <Maximize2 className="w-4 h-4" />
                <span>HD Art</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-center text-slate-400 mt-1.5">
              {eraSequence.length > 1
                ? `Use ←/→ keys or click era portraits (${eraSequence.length} versions)`
                : 'Click HD Art to expand illustration'}
            </div>
          </div>

          <div className="space-y-2 min-w-0 flex-1 w-full text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className="px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border font-mono"
                style={{
                  backgroundColor: `${factionColor}20`,
                  borderColor: `${factionColor}60`,
                  color: factionColor,
                }}
              >
                {language === 'ja'
                  ? faction?.nameJa || '独立'
                  : faction?.nameEn || 'Independent'}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Debut: {character.debutGame.toUpperCase()}
              </span>
              {variantEntries.length > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 tabular-nums">
                  ✦ {variantEntries.length + 1} Era Portraits
                </span>
              )}
            </div>

            <h2
              id="dossier-char-name"
              className="text-2xl sm:text-3xl font-bold font-cinzel text-white leading-tight text-balance"
            >
              {language === 'ja' ? character.nameJa : character.nameEn}
            </h2>
            <p className="text-sm font-inter text-slate-400">
              {language === 'ja' ? character.nameEn : character.nameJa}
            </p>

            <p className="text-sm font-semibold text-imperial-gold mt-1">
              {activeTitleEn} {activeTitleJa && `• ${activeTitleJa}`}
            </p>

            {/* Quick Summary Preview */}
            <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed pt-1 text-pretty">
              {language === 'ja' ? character.bioJa : character.bioEn}
            </p>

            {/* Interactive Visual Era Portrait Strip for Multi-Era Characters */}
            {variantEntries.length > 0 && (
              <div className="pt-2.5 pb-1 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-arcus-cyan">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Tactical Arc Timeline Archives ({variantEntries.length + 1} Eras)</span>
                  </span>
                  <span className="text-slate-400">Click era portrait to switch</span>
                </div>

                <div
                  role="tablist"
                  aria-label="Character Era Variants"
                  className="flex flex-wrap items-center justify-center sm:justify-start gap-2"
                >
                  {/* Base / Debut Profile Visual Card Pill */}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedEra === null}
                    onClick={() => setSelectedEra(null)}
                    className={`group/pill flex items-center gap-2 p-1.5 pr-2.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer border ${
                      selectedEra === null
                        ? 'bg-arcus-cyan/20 border-arcus-cyan text-white shadow-md shadow-arcus-cyan/30 ring-1 ring-arcus-cyan/50'
                        : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="w-8 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                      <CharacterAvatar
                        character={character}
                        factionColor={factionColor}
                        size={36}
                        aspectRatio="portrait"
                        fit="cover"
                        activeGameId="all"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-left">
                      <span className="block text-[11px] font-bold">
                        [Base: {character.debutGame.toUpperCase()}]
                      </span>
                      <span className="block text-[9px] text-slate-400 truncate max-w-[110px]">
                        {character.titleEn}
                      </span>
                    </div>
                  </button>

                  {/* Variant Visual Card Pills */}
                  {variantEntries.map(([gameId, variant]) => {
                    const isSelected = selectedEra === gameId;
                    const label = variant.eraLabel || getGameLabel(gameId as GameId);

                    return (
                      <button
                        key={gameId}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setSelectedEra(gameId as GameId)}
                        className={`group/pill flex items-center gap-2 p-1.5 pr-2.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-400/30 ring-1 ring-amber-400/50'
                            : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        <div className="w-8 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                          <CharacterAvatar
                            character={character}
                            factionColor={factionColor}
                            size={36}
                            aspectRatio="portrait"
                            fit="cover"
                            activeGameId={gameId as GameId}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="text-left">
                          <span className="block text-[11px] font-bold">[{label}]</span>
                          <span className="block text-[9px] text-slate-400 truncate max-w-[110px]">
                            {variant.titleEn || character.titleEn}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Combat Style & Voice Actor Credits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-arcus-cyan/10 text-arcus-cyan">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">
                Combat Style & Weaponry
              </div>
              <div className="font-semibold text-slate-200 mt-0.5">
                {activeWeapons.join(' • ')}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-purple-500/10 text-purple-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">
                Japanese Voice Actor (CV)
              </div>
              <div className="font-semibold text-slate-200 mt-0.5">{character.seiyuu}</div>
            </div>
          </div>
        </div>

        {/* 3. Canonical Biographical Lore */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Zemurian Intelligence Record
          </h3>
          <p className="text-slate-200 leading-relaxed text-pretty">{character.bioEn}</p>
          <p className="text-slate-400 leading-relaxed text-[11px] pt-1 border-t border-slate-800/80 text-pretty">
            {character.bioJa}
          </p>
        </div>

        {/* 4. ARCUS II / Xipha Tactical Slot Lines */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-arcus-cyan">
              <Cpu className="w-4 h-4" />
              <span>ARCUS II Tactical Orbment Resonance Lines</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Slots: 8 • Central Master Quartz
            </span>
          </div>

          {/* Orbment Circuit Wireframe */}
          <div className="flex items-center justify-center p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Line 1 */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-arcus-cyan animate-pulse shadow-md shadow-arcus-cyan/50" />
                <span className="w-6 h-0.5 bg-arcus-cyan/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-6 h-0.5 bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>

              {/* Central Core */}
              <div className="px-3 py-1 rounded-full bg-arcus-cyan/20 border border-arcus-cyan text-[10px] font-mono font-bold text-arcus-cyan">
                CORE
              </div>

              {/* Line 2 */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span className="w-6 h-0.5 bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="w-6 h-0.5 bg-purple-400/60" />
                <span className="w-3 h-3 rounded-full bg-purple-400 shadow-md shadow-purple-400/50" />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Late-Game Spoiler Dossier Section */}
        {character.spoilerNotes && character.spoilerNotes.length > 0 && (
          <div className="bg-purple-950/30 border border-purple-500/40 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-300 font-mono flex items-center gap-1.5">
                <span>★</span> Late-Game Narrative Intelligence
              </span>
              {onToggleUnmaskSpoiler && (
                <button
                  type="button"
                  onClick={() => onToggleUnmaskSpoiler(character.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-600/40 hover:bg-purple-800/60 transition cursor-pointer"
                >
                  {isUnmasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{isUnmasked ? 'Mask Secrets' : 'Unmask Secrets'}</span>
                </button>
              )}
            </div>

            {character.spoilerNotes.map((note, idx) => {
              const isFuture = GAME_ORDER[note.minGame] > activeOrder;
              const shouldRedact = isFuture && !isUnmasked;

              return (
                <div key={idx} className="text-xs leading-relaxed text-slate-300">
                  {shouldRedact ? (
                    <span className="text-slate-500 italic font-mono">
                      [Classified — Narrative disclosure restricted to {note.minGame.toUpperCase()}{' '}
                      onwards. Click Unmask to inspect.]
                    </span>
                  ) : (
                    <span>{note.note}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Direct Relationships Roster */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span className="tabular-nums">Direct Connected Bonds ({directBonds.length})</span>
            {directBonds.length > 4 ? (
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={bondSearch}
                  onChange={(e) => setBondSearch(e.target.value)}
                  placeholder="Filter bonds by name or type..."
                  aria-label="Filter connected bonds"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-arcus-cyan font-sans normal-case tracking-normal"
                />
              </div>
            ) : (
              <span className="text-[10px]">Click bond to inspect partner</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto scrollbar-thin pr-1">
            {filteredBonds.map(({ rel, partner }) => (
              <div
                key={rel.id}
                onClick={() => onSelectCharacter(partner.id)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-arcus-cyan/50 hover:bg-slate-900 cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CharacterAvatar
                    character={partner}
                    size={32}
                    activeGameId={activeGameId}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {language === 'ja' ? partner.nameJa : partner.nameEn}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{rel.type}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-arcus-cyan border border-slate-700 shrink-0">
                  {language === 'ja' ? rel.labelJa : rel.labelEn}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Action Tray (Path Finder & Graph Integration) */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onSetPathOrigin && (
              <button
                type="button"
                onClick={() => {
                  onSetPathOrigin(character.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-medium transition cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Set as Path Origin</span>
              </button>
            )}

            {onSetPathTarget && (
              <button
                type="button"
                onClick={() => {
                  onSetPathTarget(character.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-medium transition cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Set as Path Target</span>
              </button>
            )}
          </div>

          {onFocusInGraph && (
            <button
              type="button"
              onClick={() => {
                onFocusInGraph(character.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arcus-cyan/20 text-arcus-cyan border border-arcus-cyan/40 hover:bg-arcus-cyan/30 text-xs font-medium transition cursor-pointer"
            >
              <Network className="w-3.5 h-3.5" />
              <span>View in Bond Graph</span>
            </button>
          )}
        </div>
      </div>

      {/* 8. Full-Resolution Falcom Artwork Lightbox Modal with Multi-Era Switcher */}
      {showLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${character.nameEn} Full Artwork Showcase`}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 border-2 border-arcus-cyan/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4"
            style={{ borderColor: factionColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close Full Artwork"
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* High-Definition Illustration Container */}
            <div className="w-full max-w-lg h-[420px] sm:h-[500px] rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-950/90 border border-slate-800 shadow-inner p-3">
              <CharacterAvatar
                character={character}
                factionColor={factionColor}
                size={480}
                aspectRatio="portrait"
                fit="contain"
                activeGameId={effectiveAvatarGameId}
                className="w-full h-full drop-shadow-2xl"
              />

              {eraSequence.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous Era in Lightbox"
                    onClick={() => cycleEra(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-arcus-cyan hover:border-arcus-cyan transition cursor-pointer shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next Era in Lightbox"
                    onClick={() => cycleEra(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-arcus-cyan hover:border-arcus-cyan transition cursor-pointer shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Era Strip if Multi-Era */}
            {variantEntries.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedEra(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                    selectedEra === null
                      ? 'bg-arcus-cyan text-slate-950 border-arcus-cyan font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Base ({character.debutGame.toUpperCase()})
                </button>
                {variantEntries.map(([gameId, variant]) => {
                  const isSelected = selectedEra === gameId;
                  const label = variant.eraLabel || getGameLabel(gameId as GameId);
                  return (
                    <button
                      key={gameId}
                      type="button"
                      onClick={() => setSelectedEra(gameId as GameId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Character Info Card Banner */}
            <div className="text-center space-y-1 w-full">
              <h3 className="text-2xl font-bold font-cinzel text-white">
                {character.nameEn}
              </h3>
              <p className="text-xs text-imperial-gold font-mono">
                {activeTitleEn} {activeTitleJa && `• ${activeTitleJa}`}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Weapons: {activeWeapons.join(' • ')} • Voice: {character.seiyuu} • Official Falcom Artwork
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
