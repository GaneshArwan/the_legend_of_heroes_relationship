import { z } from 'zod';

export const GameIdSchema = z.enum([
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
]);

export const ChapterConflictSchema = z.object({
  chapter: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const GameArcSchema = z.object({
  id: GameIdSchema,
  index: z.number().int().min(0).max(11),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  year: z.string().min(1),
  region: z.string().min(1),
  orbmentSystem: z.string().min(1),
  activeFactions: z.array(z.string().min(1)).min(1),
  chapterConflicts: z.array(ChapterConflictSchema).min(1),
});

export type GameId = z.infer<typeof GameIdSchema>;
export type ChapterConflict = z.infer<typeof ChapterConflictSchema>;
export type GameArc = z.infer<typeof GameArcSchema>;
