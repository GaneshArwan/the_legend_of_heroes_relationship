import { z } from 'zod';

export const FactionArcSchema = z.enum([
  'liberl',
  'crossbell',
  'erebonia',
  'reverie',
  'calvard',
  'pan_zemuria',
]);

export const FactionSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameJa: z.string().min(1),
  arc: FactionArcSchema,
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Color must be a valid hex code (e.g. #38bdf8)',
  }),
  descriptionEn: z.string().min(1),
  descriptionJa: z.string().min(1),
  hierarchyRanks: z.array(z.string().min(1)).min(1).optional(),
});

export type FactionArc = z.infer<typeof FactionArcSchema>;
export type Faction = z.infer<typeof FactionSchema>;
