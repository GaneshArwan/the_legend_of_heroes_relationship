import { z } from 'zod';

export const PhysicsConfigSchema = z.object({
  gravity: z.number().min(0).max(1),
  repulsion: z.number().min(50).max(1500),
  linkDistance: z.number().min(20).max(400),
  damping: z.number().min(0.1).max(0.99),
  isPaused: z.boolean(),
});

export const ViewModeSchema = z.enum(['tree', 'network', 'pathfinder', 'deepdive']);

export const PersistentStateSchema = z.object({
  version: z.literal(1),
  selectedGameId: z.enum([
    'all',
    'sky_fc',
    'sky_sc',
    'sky_3rd',
    'zero',
    'azure',
    'cs1',
    'cs2',
    'cs3',
    'cs4',
    'reverie',
    'daybreak1',
    'daybreak2',
  ]),
  activeView: ViewModeSchema,
  selectedCharId: z.string(),
  highContrastMode: z.boolean(),
  language: z.enum(['en', 'ja']),
  unmaskedSpoilerIds: z.array(z.string()),
  physicsConfig: PhysicsConfigSchema,
});

export type PersistentState = z.infer<typeof PersistentStateSchema>;
export type ViewMode = z.infer<typeof ViewModeSchema>;
export type PhysicsConfig = z.infer<typeof PhysicsConfigSchema>;

export const STORAGE_KEY = 'zemuria_visualizer_state_v1';

export const DEFAULT_STATE: PersistentState = {
  version: 1,
  selectedGameId: 'daybreak2',
  activeView: 'network',
  selectedCharId: 'rean',
  highContrastMode: false,
  language: 'en',
  unmaskedSpoilerIds: [],
  physicsConfig: {
    gravity: 0.15,
    repulsion: 450,
    linkDistance: 120,
    damping: 0.85,
    isPaused: false,
  },
};

/**
 * Safely parses and validates a raw JSON string into PersistentState.
 * Recovers with fallbackState on any corruption or validation error.
 */
export function hydrateState(
  rawJson: string | null | undefined,
  fallbackState: PersistentState = DEFAULT_STATE
): PersistentState {
  if (!rawJson) return fallbackState;
  try {
    const parsed = JSON.parse(rawJson);
    const validated = PersistentStateSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    return fallbackState;
  } catch {
    return fallbackState;
  }
}

/**
 * Validates and serializes PersistentState into JSON.
 */
export function serializeState(state: PersistentState): string {
  return JSON.stringify(PersistentStateSchema.parse(state));
}

/**
 * Browser localStorage wrapper with SSR and quota guardrails.
 */
export function loadStateFromLocalStorage(): PersistentState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return hydrateState(raw, DEFAULT_STATE);
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveStateToLocalStorage(state: PersistentState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const serialized = serializeState(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an SVG monogram fallback badge when a portrait asset fails to load.
 */
export function generateMonogramFallback(
  initials: string,
  factionColor: string = '#38bdf8',
  size: number = 48
): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-monogram" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${factionColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad-monogram)" stroke="${factionColor}" stroke-width="3"/>
  <text x="50" y="60" font-family="'Cinzel', serif" font-size="34" font-weight="700" fill="#f8fafc" text-anchor="middle" letter-spacing="2">${initials}</text>
</svg>`;
}
