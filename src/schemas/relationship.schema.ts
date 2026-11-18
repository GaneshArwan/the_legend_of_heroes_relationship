import { z } from 'zod';
import { GameIdSchema } from './game.schema';

export const RelationshipTypeSchema = z.enum([
  'mentor',
  'comrade',
  'family',
  'rival',
  'secret',
]);

export const RelationshipSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    type: RelationshipTypeSchema,
    labelEn: z.string().min(1),
    labelJa: z.string().min(1),
    descEn: z.string().min(1),
    descJa: z.string().min(1),
    debutGame: GameIdSchema,
    spoilerDebutGame: GameIdSchema.optional(),
    isSecret: z.boolean().optional(),
  })
  .refine((rel) => rel.source !== rel.target, {
    message: 'Self-loops are forbidden: source and target must be different characters',
    path: ['target'],
  });


export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
