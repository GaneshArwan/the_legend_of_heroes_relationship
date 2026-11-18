import { CHARACTER_PORTRAITS } from '../src/data/portraits';
import { characters, liberlCharacters, crossbellCharacters, ereboniaCharacters, reverieCharacters, calvardCharacters } from '../src/data/characters';
import { relationships, liberlRelationships, crossbellRelationships, ereboniaRelationships, crossArcRelationships } from '../src/data/relationships';

console.log('Liberl chars:', liberlCharacters.length);
console.log('Crossbell chars:', crossbellCharacters.length);
console.log('Erebonia chars:', ereboniaCharacters.length);
console.log('Reverie chars:', reverieCharacters.length);
console.log('Calvard chars:', calvardCharacters.length);
console.log('Total chars:', characters.length);

console.log('Liberl rels:', liberlRelationships.length);
console.log('Crossbell rels:', crossbellRelationships.length);
console.log('Erebonia rels:', ereboniaRelationships.length);
console.log('Cross-arc rels:', crossArcRelationships.length);
console.log('Total rels:', relationships.length);

const missing = characters.filter((c) => !CHARACTER_PORTRAITS[c.id]);
console.log('Missing portraits count:', missing.length);

