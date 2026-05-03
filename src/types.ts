/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdjectiveType = 'i' | 'na';

export interface Adjective {
  id: string;
  kana: string;    // Hiragana
  romaji: string;  // For typing
  english: string; // Meaning
  spanish: string; // Meaning in Spanish
  lesson: number;  // Lesson number
  type: AdjectiveType;
}

export type Level = 1 | 2 | 3;

export interface Position {
  x: number;
  y: number;
}

export interface WordPlacement {
  id: string;
  adjective: Adjective;
  position: Position;
  direction: 'horizontal' | 'vertical';
  answered: boolean;
}

export interface CellData {
  char: string;
  x: number;
  y: number;
  wordIds: string[];
  isBlack: boolean;
  userInput: string;
  isCorrect: boolean;
  isRevealed: boolean;
  number?: number; // Number for the hint
}
