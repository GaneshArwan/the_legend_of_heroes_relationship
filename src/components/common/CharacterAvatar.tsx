import React, { useState, useEffect, useMemo } from 'react';
import type { Character, GameId } from '../../types';
import { factions } from '../../data/factions';
import { CHARACTER_PORTRAITS, VARIANT_PORTRAITS } from '../../data/portraits';
import { GAME_ORDER } from '../../services/spoilerEngine';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'hero' | number;

export interface CharacterAvatarProps {
  character: Character;
  size?: AvatarSize;
  activeGameId?: GameId;
  aspectRatio?: 'square' | 'portrait';
  fit?: 'cover' | 'contain';
  showFactionBadge?: boolean;
  showRing?: boolean;
  ringColor?: string;
  factionColor?: string;
  className?: string;
  onClick?: () => void;
  alt?: string;
}

const SIZE_MAP: Record<string, { px: number; tw: string; font: number; crest: number }> = {
  xs: { px: 24, tw: 'w-6 h-6', font: 10, crest: 10 },
  sm: { px: 32, tw: 'w-8 h-8', font: 12, crest: 12 },
  md: { px: 48, tw: 'w-12 h-12', font: 16, crest: 16 },
  lg: { px: 64, tw: 'w-16 h-16', font: 20, crest: 20 },
  xl: { px: 96, tw: 'w-24 h-24', font: 30, crest: 28 },
  '2xl': { px: 128, tw: 'w-32 h-32', font: 40, crest: 32 },
  '3xl': { px: 192, tw: 'w-48 h-48', font: 56, crest: 44 },
  '4xl': { px: 256, tw: 'w-64 h-64', font: 64, crest: 52 },
  hero: { px: 320, tw: 'w-80 h-96', font: 80, crest: 60 },
};

/**
 * Generates an SVG monogram fallback badge string.
 */
export function generateMonogramFallback(
  input: Character | string,
  factionIdOrSize?: string | number,
  size: number = 48
): string {
  let initials: string;
  let factionId: string;
  let badgeSize = size;

  if (typeof input === 'object') {
    initials = input.initials;
    factionId = input.factionId;
    if (typeof factionIdOrSize === 'number') {
      badgeSize = factionIdOrSize;
    }
  } else {
    initials = input;
    factionId = typeof factionIdOrSize === 'string' ? factionIdOrSize : 'neutral';
  }

  const faction = factions.find((f) => f.id === factionId);
  const color = faction ? faction.color : '#38bdf8';
  return `<svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${factionId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad-${factionId})" stroke="${color}" stroke-width="3"/>
  <text x="50" y="60" font-family="'Cinzel', serif" font-size="34" font-weight="700" fill="#f8fafc" text-anchor="middle" letter-spacing="2">${initials}</text>
</svg>`;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  character,
  size = 'md',
  activeGameId,
  aspectRatio = 'square',
  fit = 'cover',
  showFactionBadge = false,
  showRing = false,
  ringColor,
  factionColor: customFactionColor,
  className = '',
  onClick,
  alt,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  // Compute pixel dimensions
  const dims = useMemo(() => {
    if (typeof size === 'number') {
      return {
        px: size,
        tw: '',
        font: Math.round(size * 0.34),
        crest: Math.round(size * 0.3),
      };
    }
    return SIZE_MAP[size] || SIZE_MAP.md;
  }, [size]);

  // Resolve faction color
  const faction = useMemo(() => {
    return factions.find((f) => f.id === character.factionId);
  }, [character.factionId]);
  const resolvedFactionColor = customFactionColor || faction?.color || '#38bdf8';

  // Resolve candidate portrait URLs waterfall:
  // 1. Exact or closest preceding arc-specific WebP variant from character.variants
  // 2. Local downloaded official base WebP asset
  // 3. Remote official Falcom CDN portrait
  // 4. Local vector SVG monogram badge (last-resort backup only)
  const candidateUrls = useMemo(() => {
    const list: string[] = [];
    let resolvedVariantGameId: GameId | undefined;

    if (activeGameId && activeGameId !== 'all' && character.variants) {
      if (character.variants[activeGameId]) {
        resolvedVariantGameId = activeGameId;
      } else {
        // Find closest preceding (or earliest available) variant for chronological era accuracy
        const targetOrder = GAME_ORDER[activeGameId] ?? 999;
        const variantKeys = Object.keys(character.variants) as GameId[];
        let bestPreceding: GameId | undefined;
        let bestPrecedingOrder = -1;
        let earliestKey: GameId | undefined;
        let earliestOrder = 999;

        for (const k of variantKeys) {
          const order = GAME_ORDER[k] ?? 999;
          if (order <= targetOrder && order > bestPrecedingOrder) {
            bestPrecedingOrder = order;
            bestPreceding = k;
          }
          if (order < earliestOrder) {
            earliestOrder = order;
            earliestKey = k;
          }
        }
        resolvedVariantGameId = bestPreceding || earliestKey;
      }
    }

    if (resolvedVariantGameId && character.variants?.[resolvedVariantGameId]) {
      const v = character.variants[resolvedVariantGameId]!;
      if (v.portraitUrl) {
        list.push(v.portraitUrl);
      }
      list.push(`/assets/portraits/${character.id}_${resolvedVariantGameId}.webp`);
      const variantRemoteUrl = VARIANT_PORTRAITS[`${character.id}_${resolvedVariantGameId}`];
      if (variantRemoteUrl) {
        list.push(variantRemoteUrl);
      }
    }

    list.push(`/assets/portraits/${character.id}.webp`);

    if (CHARACTER_PORTRAITS[character.id]) {
      list.push(CHARACTER_PORTRAITS[character.id]);
    }

    if (resolvedVariantGameId) {
      list.push(`/assets/portraits/${character.id}_${resolvedVariantGameId}.svg`);
    }
    list.push(`/assets/portraits/${character.id}.svg`);

    return Array.from(new Set(list));
  }, [character, activeGameId]);

  const [srcIndex, setSrcIndex] = useState(0);

  // Reset image error and loaded states on candidate URLs change
  useEffect(() => {
    setSrcIndex(0);
    setImgLoaded(false);
    setAllFailed(false);
  }, [candidateUrls]);

  const handleImageError = () => {
    if (srcIndex + 1 < candidateUrls.length) {
      setSrcIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  const currentSrc = candidateUrls[srcIndex];
  const resolvedRingColor = ringColor || resolvedFactionColor;
  const isPortrait = aspectRatio === 'portrait';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={
        typeof size === 'number' && !className.includes('w-full')
          ? {
              width: dims.px,
              height: isPortrait ? Math.round(dims.px * 1.25) : dims.px,
            }
          : undefined
      }
      className={`relative inline-block select-none shrink-0 ${
        typeof size === 'string' && !className.includes('w-full')
          ? (isPortrait ? `aspect-[3/4] ${dims.tw.replace(/h-\S+/, '')}` : dims.tw)
          : ''
      } ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400' : ''} ${className}`}
    >
      <div
        className={`w-full h-full rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-900/60 transition-transform duration-200 ${
          showRing ? 'border-2' : ''
        }`}
        style={showRing ? { borderColor: resolvedRingColor } : undefined}
      >
        {/* Subtle Faction Ambient Aura */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${resolvedFactionColor}40 0%, transparent 75%)`,
          }}
        />

        {/* Monogram Vector Fallback (Active when all candidates fail or no image) */}
        {allFailed || !currentSrc ? (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full block"
            aria-label={`${character.nameEn} Monogram`}
          >
            <defs>
              <linearGradient
                id={`grad-${character.id}-${character.factionId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={resolvedFactionColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <rect
              width="100"
              height="100"
              rx="20"
              fill={`url(#grad-${character.id}-${character.factionId})`}
              stroke={resolvedFactionColor}
              strokeWidth="3"
            />
            <text
              x="50"
              y="60"
              fontFamily="'Cinzel', serif"
              fontSize="34"
              fontWeight="700"
              fill="#f8fafc"
              textAnchor="middle"
              letterSpacing="2"
            >
              {character.initials}
            </text>
          </svg>
        ) : (
          <>
            {/* Shimmer backdrop prior to image load */}
            {!imgLoaded && (
              <div
                className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center"
                style={{ backgroundColor: `${resolvedFactionColor}15` }}
              >
                <span className="font-cinzel text-xs font-bold text-slate-400">
                  {character.initials}
                </span>
              </div>
            )}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={alt || `${character.nameEn} Portrait`}
              decoding="async"
              ref={(img) => {
                if (img && img.complete && img.naturalWidth > 0 && !imgLoaded) {
                  setImgLoaded(true);
                }
              }}
              onLoad={() => setImgLoaded(true)}
              onError={handleImageError}
              className={`w-full h-full ${
                fit === 'contain' ? 'object-contain' : 'object-cover object-top'
              } transition-all duration-300 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            />
          </>
        )}
      </div>

      {/* Optional Faction Crest Badge Indicator */}
      {showFactionBadge && faction && (
        <div
          title={faction.nameEn}
          style={{ width: dims.crest, height: dims.crest, borderColor: resolvedFactionColor }}
          className="absolute -bottom-1 -right-1 rounded-full bg-slate-950 border flex items-center justify-center overflow-hidden shadow-md"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: resolvedFactionColor }}
          />
        </div>
      )}
    </div>
  );
};
