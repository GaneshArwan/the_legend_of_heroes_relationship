import { z } from 'zod';
import { GameIdSchema } from './game.schema';

export const CharacterVariantSchema = z.object({
  portraitUrl: z.string().optional(),
  titleEn: z.string().optional(),
  titleJa: z.string().optional(),
  weapons: z.array(z.string().min(1)).min(1).optional(),
  eraLabel: z.string().optional(),
  eraLabelJa: z.string().optional(),
});

export const SpoilerNoteSchema = z.object({
  minGame: GameIdSchema,
  note: z.string().min(1),
});

export const CharacterSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  titleEn: z.string().min(1),
  titleJa: z.string().min(1),
  factionId: z.string().min(1),
  subgroupId: z.string().optional(),
  debutGame: GameIdSchema,
  weapons: z.array(z.string().min(1)).min(1),
  seiyuu: z.string().min(1),
  bioEn: z.string().min(1),
  bioJa: z.string().min(1),
  initials: z.string().min(1).max(5),
  variants: z.record(GameIdSchema, CharacterVariantSchema).optional(),
  spoilerNotes: z.array(SpoilerNoteSchema).min(1).optional(),
});

export type CharacterVariant = z.infer<typeof CharacterVariantSchema>;
export type SpoilerNote = z.infer<typeof SpoilerNoteSchema>;
export type Character = z.infer<typeof CharacterSchema>;
