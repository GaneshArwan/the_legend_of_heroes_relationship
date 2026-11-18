import { Character } from '../../types';
import { liberlCharacters } from './liberl';
import { crossbellCharacters } from './crossbell';
import { ereboniaCharacters } from './erebonia';
import { reverieCharacters } from './reverie';
import { calvardCharacters } from './calvard';

export const characters: Character[] = [
  ...liberlCharacters,
  ...crossbellCharacters,
  ...ereboniaCharacters,
  ...reverieCharacters,
  ...calvardCharacters,
];

export const characterMap = new Map<string, Character>(
  characters.map((char) => [char.id, char])
);

export {
  liberlCharacters,
  crossbellCharacters,
  ereboniaCharacters,
  reverieCharacters,
  calvardCharacters,
};
