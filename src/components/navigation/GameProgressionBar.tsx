import React, { useRef, useEffect } from 'react';
import { GameArc, GameId } from '../../types';
import { Sparkles } from 'lucide-react';

export interface GameProgressionBarProps {
  games: GameArc[];
  selectedGameId: GameId;
  onSelectGame: (gameId: GameId) => void;
  className?: string;
}

export const GameProgressionBar: React.FC<GameProgressionBarProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active pill into view on change
  useEffect(() => {
    if (activeBtnRef.current && containerRef.current) {
      const container = containerRef.current;
      const button = activeBtnRef.current;
      const offsetLeft = button.offsetLeft;
      const buttonWidth = button.offsetWidth;
      const containerWidth = container.offsetWidth;
      container.scrollTo({
        left: offsetLeft - containerWidth / 2 + buttonWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [selectedGameId]);

  const getPillAcronym = (nameEn: string): string => {
    return nameEn
      .replace('Trails of Cold Steel ', 'CS ')
      .replace('Trails in the Sky ', 'Sky ')
      .replace('Trails from ', '')
      .replace('Trails to ', '')
      .replace('Trails through ', '')
      .replace('Trails into ', '')
      .replace(' -CRIMSON SiN-', '')
      .replace(' -THE END OF SAGA-', '');
  };

  const getArcColorBadge = (gameId: GameId): string => {
    if (gameId.startsWith('sky')) return 'border-sky-500/40 text-sky-400 bg-sky-950/40';
    if (gameId === 'zero' || gameId === 'azure')
      return 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40';
    if (gameId.startsWith('cs')) return 'border-amber-500/40 text-amber-400 bg-amber-950/40';
    if (gameId === 'reverie') return 'border-purple-500/40 text-purple-400 bg-purple-950/40';
    return 'border-rose-500/40 text-rose-400 bg-rose-950/40'; // Daybreak
  };

  return (
    <nav
      aria-label="Trails Saga Chronological Progression Bar"
      className={`w-full bg-slate-950/80 border-y border-arcus-cyan/20 backdrop-blur-md px-4 py-2.5 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono uppercase tracking-widest text-slate-400 hidden sm:flex">
          <Sparkles className="w-3.5 h-3.5 text-arcus-cyan animate-pulse" />
          <span>Timeline:</span>
        </div>

        {/* Horizontal Pill Track */}
        <div
          ref={containerRef}
          role="tablist"
          aria-orientation="horizontal"
          className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-arcus-cyan/30 scrollbar-track-slate-900/40 select-none"
        >
          {/* [ALL SAGAS / ALL TIMELINES] Master Pill */}
          <button
            key="all"
            ref={selectedGameId === 'all' ? activeBtnRef : null}
            role="tab"
            aria-selected={selectedGameId === 'all'}
            aria-controls="deepdive-panel-all"
            id="game-pill-all"
            tabIndex={selectedGameId === 'all' ? 0 : -1}
            onClick={() => onSelectGame('all')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer border ${
              selectedGameId === 'all'
                ? 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400 scale-[1.03]'
                : 'bg-slate-900/80 border-amber-500/30 text-amber-300 hover:bg-amber-950/40 hover:border-amber-400 hover:text-amber-100'
            }`}
            title="Connect all characters and relationships across all timelines without spoiler barriers"
          >
            {selectedGameId === 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
            <Sparkles className={`w-3.5 h-3.5 ${selectedGameId === 'all' ? 'text-amber-300 animate-spin' : 'text-amber-400/80'}`} />
            <span className="font-cinzel font-bold tracking-wider">ALL SAGAS</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                selectedGameId === 'all'
                  ? 'bg-amber-400/20 border-amber-300 text-amber-200 font-bold'
                  : 'border-amber-500/30 text-amber-400 bg-amber-950/30'
              }`}
            >
              PAN-ZEMURIA
            </span>
          </button>

          {games.map((game) => {
            const isSelected = game.id === selectedGameId;
            const acronym = getPillAcronym(game.nameEn);
            const arcBadgeClass = getArcColorBadge(game.id);

            return (
              <button
                key={game.id}
                ref={isSelected ? activeBtnRef : null}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`deepdive-panel-${game.id}`}
                id={`game-pill-${game.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectGame(game.id)}
                className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 border-arcus-cyan text-white shadow-lg shadow-arcus-cyan/20 ring-1 ring-arcus-cyan/60 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700 hover:text-white'
                }`}
              >
                {/* Active Indicator Pip */}
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-arcus-cyan animate-ping absolute -top-0.5 -right-0.5" />
                )}

                {/* Game Title */}
                <span className="font-cinzel font-semibold tracking-wide">{acronym}</span>

                {/* Calendar Year Badge */}
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isSelected
                      ? 'bg-arcus-cyan/20 border-arcus-cyan/40 text-arcus-cyan'
                      : arcBadgeClass
                  }`}
                >
                  {game.year.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
