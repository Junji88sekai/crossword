import { Adjective, CellData, WordPlacement } from '../types';

export function generateCrossword(
  adjectives: Adjective[],
  gridSize: number = 10
): { grid: CellData[][]; placements: WordPlacement[] } {
  let bestPlacements: WordPlacement[] = [];
  let bestGrid: CellData[][] = [];

  // Try 100 attempts to get a decent word density
  for (let attempt = 0; attempt < 100; attempt++) {
    const tempGrid: CellData[][] = Array.from({ length: gridSize }, (_, y) =>
      Array.from({ length: gridSize }, (_, x) => ({
        char: '', x, y, wordIds: [], isBlack: true, userInput: '', isCorrect: false, isRevealed: true
      }))
    );
    const tempPlacements: WordPlacement[] = [];
    const pool = [...adjectives];
    
    // Sort pool by length descending to place longest words first
    pool.sort((a, b) => b.kana.length - a.kana.length);

    function attemptPlace(word: Adjective, x: number, y: number, direction: 'horizontal' | 'vertical') {
      const chars = word.kana.split('');
      const id = Math.random().toString(36).substring(2, 9);
      tempPlacements.push({ id, adjective: word, position: { x, y }, direction, answered: false });
      for (let i = 0; i < chars.length; i++) {
        const cx = direction === 'horizontal' ? x + i : x;
        const cy = direction === 'horizontal' ? y : y + i;
        tempGrid[cy][cx].char = chars[i];
        tempGrid[cy][cx].isBlack = false;
        tempGrid[cy][cx].isRevealed = true;
        if (!tempGrid[cy][cx].wordIds.includes(id)) tempGrid[cy][cx].wordIds.push(id);
      }
    }

    // Start with the longest word in a random valid position near the center
    const first = pool.shift();
    if (first) {
      const startX = Math.floor((gridSize - first.kana.length) / 2) + (Math.floor(Math.random() * 3) - 1);
      const startY = Math.floor(gridSize / 2) + (Math.floor(Math.random() * 3) - 1);
      attemptPlace(first, Math.max(0, startX), Math.max(0, startY), 'horizontal');
    }

    // Shuffle remaining pool to avoid deterministic failures
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

    // Try to place words without overlapping and without requiring intersections
    // This addresses the issue where overlapping words could be confusing or cause words to be skipped
    for (const word of pool) {
      let placed = false;
      
      // Try many random positions for each word to find a fit
      for (let retry = 0; retry < 500; retry++) {
        if (placed) break;
        
        const dir = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        const sx = Math.floor(Math.random() * (gridSize - (dir === 'horizontal' ? word.kana.length : 0)));
        const sy = Math.floor(Math.random() * (gridSize - (dir === 'vertical' ? word.kana.length : 0)));

        let fits = true;
        // Collision check - ensure space is blank AND has a small buffer (optional but good for clarity)
        for (let k = 0; k < word.kana.length; k++) {
          const cx = dir === 'horizontal' ? sx + k : sx;
          const cy = dir === 'horizontal' ? sy : sy + k;
          
          if (!tempGrid[cy][cx].isBlack) {
            fits = false;
            break;
          }
          
          // Check neighbors to avoid words touching side-by-side (adds buffer)
          const neighbors = [
            {dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1},
            {dx: -1, dy: -1}, {dx: 1, dy: 1}, {dx: -1, dy: 1}, {dx: 1, dy: -1}
          ];
          for (const n of neighbors) {
            const nx = cx + n.dx;
            const ny = cy + n.dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              if (!tempGrid[ny][nx].isBlack) {
                // If the neighbor is already occupied, we don't fit (ensures separation)
                fits = false;
                break;
              }
            }
          }
          if (!fits) break;
        }

        if (fits) {
          attemptPlace(word, sx, sy, dir);
          placed = true;
        }
      }
    }

    if (tempPlacements.length > bestPlacements.length) {
      bestPlacements = tempPlacements;
      bestGrid = JSON.parse(JSON.stringify(tempGrid)); // Deep copy grid
    }
    if (bestPlacements.length === adjectives.length) break;
  }

  // Fill remaining black squares with random characters from the adjective pool
  const allKana = adjectives.map(a => a.kana).join('').split('');
  const uniqueKana = Array.from(new Set(allKana));
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (bestGrid[y][x].isBlack) {
        const randomChar = uniqueKana[Math.floor(Math.random() * uniqueKana.length)] || 'あ';
        bestGrid[y][x].char = randomChar;
        // Keep isBlack as true to distinguish for styling, but we'll show the character
      }
    }
  }

  return { grid: bestGrid, placements: bestPlacements };
}
