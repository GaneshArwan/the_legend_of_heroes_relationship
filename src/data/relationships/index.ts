import { Relationship } from '../../types';
import { liberlRelationships } from './liberl';
import { crossbellRelationships } from './crossbell';
import { ereboniaRelationships } from './erebonia';
import { crossArcRelationships } from './cross_arc';

export const relationships: Relationship[] = [
  ...liberlRelationships,
  ...crossbellRelationships,
  ...ereboniaRelationships,
  ...crossArcRelationships,
];

export const relationshipMap = new Map<string, Relationship>(
  relationships.map((rel) => [rel.id, rel])
);

export {
  liberlRelationships,
  crossbellRelationships,
  ereboniaRelationships,
  crossArcRelationships,
};
