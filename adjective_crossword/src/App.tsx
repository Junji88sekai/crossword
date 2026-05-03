/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Trophy, RotateCcw, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Adjective, Level, CellData, WordPlacement } from './types';
import { ADJECTIVES } from './data/adjectives';
import { generateCrossword } from './utils/crossword';

// --- Components ---

const CasinoChip = ({ color, style, ...props }: { color: string; style: React.CSSProperties; [key: string]: any }) => (
  <motion.div
    {...props}
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{ 
      y: [-20, -100, 0], 
      opacity: [1, 1, 0],
      rotate: [0, 180, 360],
      scale: [1, 1.2, 0.8]
    }}
    transition={{ duration: 1, ease: "easeOut" }}
    className="absolute pointer-events-none"
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: `4px dashed white`,
      backgroundColor: color,
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      ...style
    }}
  />
);

export default function App() {
  const [selectedLessons, setSelectedLessons] = useState<number[]>([8, 12]);
  const [wordCount, setWordCount] = useState<number>(15);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [gameData, setGameData] = useState<{ grid: CellData[][]; placements: WordPlacement[] } | null>(null);
  const [userInput, setUserInput] = useState("");
  const [chips, setChips] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isGameClear, setIsGameClear] = useState(false);

  // Available lessons from data
  const availableLessons = useMemo(() => {
    return Array.from(new Set(ADJECTIVES.map(a => a.lesson))).sort((a, b) => a - b);
  }, []);

  const toggleLesson = (lesson: number) => {
    setSelectedLessons(prev => 
      prev.includes(lesson) 
        ? (prev.length > 1 ? prev.filter(l => l !== lesson) : prev) 
        : [...prev, lesson]
    );
  };

  const toggleAllLessons = () => {
    if (selectedLessons.length === availableLessons.length) {
      setSelectedLessons([8]); // Default back to Lesson 8 if clearing
    } else {
      setSelectedLessons(availableLessons);
    }
  };

  const playInputSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const handleCellClick = (char: string) => {
    playInputSound();
    setUserInput(prev => {
      const newVal = prev + char;
      checkAnswer(newVal);
      return newVal;
    });
  };

  // Filter adjectives based on selected lessons
  const filteredAdjectives = useMemo(() => {
    return ADJECTIVES.filter(a => selectedLessons.includes(a.lesson));
  }, [selectedLessons]);

  const startNewGame = useCallback(() => {
    const randomAdjectives = [...filteredAdjectives]
      .sort(() => Math.random() - 0.5)
      .slice(0, wordCount);
    
    // Adjust grid size based on word count
    const gridSize = wordCount <= 8 ? 8 : wordCount <= 13 ? 10 : wordCount <= 18 ? 11 : 12;
    const result = generateCrossword(randomAdjectives, gridSize);
    setGameData(result);
    setUserInput("");
    setScore(0);
    setIsGameClear(false);
  }, [filteredAdjectives, wordCount]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const spawnChips = (x: number, y: number) => {
    const colors = ['#d40000', '#0000d4', '#ffd700', '#ffffff'];
    const newChips = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setChips(prev => [...prev, ...newChips]);
    setTimeout(() => {
      setChips(prev => prev.filter(c => !newChips.find(nc => nc.id === c.id)));
    }, 1000);
  };

  const checkAnswer = useCallback((input: string) => {
    if (!gameData) return;

    // Support both Romaji typing and Kana clicking/input
    const matchingPlacements = gameData.placements.filter(p => 
      !p.answered && (
        p.adjective.romaji.toLowerCase() === input.toLowerCase() ||
        p.adjective.kana === input
      )
    );

    if (matchingPlacements.length > 0) {
      // Find all words with the SAME kana to handle "同一とします" (treat same readings as same)
      const targetKana = matchingPlacements[0].adjective.kana;
      const allMatchingWithSameReading = gameData.placements.filter(p => p.adjective.kana === targetKana);
      const wordIds = allMatchingWithSameReading.map(p => p.id);
      
      setGameData(prev => {
        if (!prev) return prev;
        const newPlacements = prev.placements.map(p => 
          wordIds.includes(p.id) ? { ...p, answered: true } : p
        );
        return { ...prev, placements: newPlacements };
      });

      setScore(s => s + (100 * allMatchingWithSameReading.length));
      
      // Display Kana / Meaning based on language
      const meaning = language === 'es' ? matchingPlacements[0].adjective.spanish : matchingPlacements[0].adjective.english;
      setShowSuccess(`${targetKana} / ${meaning}`);
      spawnChips(window.innerWidth / 2, window.innerHeight / 2);
      
      setTimeout(() => setShowSuccess(null), 2000);
      setUserInput("");

      // Check for Game Clear
      setGameData(current => {
        const remaining = current?.placements.filter(p => !p.answered).length || 0;
        if (remaining === 0) {
          setIsGameClear(true);
        }
        return current;
      });
    }
  }, [gameData]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isGameClear) return;
    
    // Handle backspace
    if (e.key === 'Backspace') {
      playInputSound();
      setUserInput(prev => prev.slice(0, -1));
      return;
    }

    // Handle letters
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      playInputSound();
      const nextChar = e.key.toLowerCase();
      setUserInput(prev => {
        const newVal = prev + nextChar;
        checkAnswer(newVal);
        return newVal;
      });
    }

    // Handle Enter to clear
    if (e.key === 'Enter') {
      setUserInput("");
    }
  }, [isGameClear, checkAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Helper to check if a cell should be blue
  const isCellBlue = (cell: CellData) => {
    if (!gameData || cell.wordIds.length === 0) return false;
    return cell.wordIds.some(id => {
      const placement = gameData.placements.find(p => p.id === id);
      return placement?.answered === true;
    });
  };

  return (
    <div className="h-screen w-full bg-casino-blue flex flex-row font-sans overflow-hidden select-none relative">
      {/* Background Suits */}
      <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
        <div className="suit-spade text-[40vh] font-serif">♠</div>
        <div className="suit-heart text-[35vh] font-serif">♥</div>
        <div className="suit-diamond text-[50vh] font-serif">♦</div>
        <div className="suit-club text-[45vh] font-serif">♣</div>
      </div>

      {/* Left Sidebar - Menu & Controls */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-black/60 backdrop-blur-md border-r border-white/10 flex flex-col z-40 relative shrink-0 p-6 gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="w-10 h-10 bg-casino-gold rounded-full flex items-center justify-center shadow-lg transform rotate-12 mx-auto mb-1">
            <span className="text-casino-blue font-black text-xl italic underline decoration-casino-blue">A</span>
          </div>
          <h1 className="text-lg font-display font-black text-white italic tracking-tighter uppercase text-center leading-tight">
            ADJECTIVE<br/>クロスワード
          </h1>
        </div>

        {/* Language Selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold text-center">Language</p>
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1 selection:rounded-lg text-[10px] font-bold transition-all ${
                language === 'en' ? 'bg-casino-gold text-casino-blue rounded-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              ENGLISH
            </button>
            <button
              onClick={() => setLanguage('es')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                language === 'es' ? 'bg-casino-gold text-casino-blue rounded-lg' : 'text-white/40 hover:text-white/60'
              }`}
            >
              ESPAÑOL
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Lesson Selection */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Lessons</span>
              <button 
                onClick={toggleAllLessons}
                className="text-[9px] font-bold text-casino-gold hover:underline"
              >
                {selectedLessons.length === availableLessons.length ? 'Clear' : 'All'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {availableLessons.map((l) => (
                <button
                  key={l}
                  onClick={() => toggleLesson(l)}
                  className={`px-1 py-1 rounded-md text-[9px] font-bold transition-all border ${
                    selectedLessons.includes(l) 
                      ? 'bg-casino-gold text-casino-blue border-casino-gold' 
                      : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                  }`}
                >
                  L.{l}
                </button>
              ))}
            </div>
          </div>

          {/* Word Count Selection */}
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-2">Word Count</p>
            <div className="flex justify-center gap-1">
              {[5, 10, 15, 20].map(c => (
                <button 
                  key={c}
                  onClick={() => setWordCount(c)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${wordCount === c ? 'bg-casino-gold text-casino-blue border border-white/20' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button 
            onClick={startNewGame}
            className="w-full py-4 bg-chip-red text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <RotateCcw size={18} /> RESET GAME
          </button>
        </div>
      </motion.div>

      {/* Main Content Area - Center Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <div className="bg-black/20 p-4 sm:p-8 rounded-[48px] shadow-2xl border border-white/5 backdrop-blur-md flex items-center justify-center">
            <div 
              className="grid gap-1.5 sm:gap-2" 
              style={{ 
                gridTemplateColumns: `repeat(${gameData?.grid[0]?.length || 0}, minmax(0, 1fr))`,
              }}
            >
              {gameData?.grid.map((row, y) => (
                row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => !cell.isBlack && handleCellClick(cell.char)}
                      className={`
                        w-[7vmin] h-[7vmin] sm:w-[8vmin] sm:h-[8vmin] max-w-[65px] max-h-[65px] flex items-center justify-center cursor-pointer select-none
                        ${cell.isBlack ? 'bg-transparent' : 'tile-cell'}
                        ${!cell.isBlack && isCellBlue(cell) ? 'correct-complete shadow-lg' : ''}
                        active:scale-95 transition-all
                      `}
                    >
                      {!cell.isBlack && (
                        <span 
                          className={`kana-text font-black transition-all flex items-center justify-center leading-none ${isCellBlue(cell) ? 'scale-110' : 'text-gray-800'}`}
                          style={{
                            fontSize: wordCount <= 8 ? '4.5vmin' : wordCount <= 13 ? '3.5vmin' : '2.8vmin',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            width: '100%',
                            marginTop: '-0.1em' // Subtle visual adjustment for vertical centering in some fonts
                          }}
                        >
                          {cell.char}
                        </span>
                      )}
                    </div>
                ))
              ))}
            </div>
          </div>
        </div>

      {/* Right Sidebar - Input Column & Answered List */}
      <div className="w-64 bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col z-40 relative shrink-0">
        <div className="flex flex-col items-center gap-3 p-4 h-full overflow-hidden">
          {/* Horizontal Input Row */}
          <div className="w-full min-h-[100px] bg-black/40 rounded-[28px] border border-white/10 flex flex-col items-center shadow-inner p-3 relative overflow-hidden">
            <div className="w-full text-[8px] font-bold text-casino-gold/40 uppercase tracking-[0.3em] mb-2 text-center">INPUT</div>
            
            <div className="flex-1 flex flex-wrap items-center justify-center gap-1.5 w-full overflow-y-auto custom-scrollbar py-1">
              <AnimatePresence>
                {userInput.split('').map((char, i) => (
                  <motion.div
                    key={`${char}-${i}`}
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg border border-white/10 shadow-sm shrink-0"
                  >
                    <span className="text-base font-bold text-casino-gold uppercase leading-none">
                      {char}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {userInput.length > 0 && (
              <button 
                onClick={() => setUserInput("")}
                className="mt-2 p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-all w-full flex justify-center"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <div className="w-full h-px bg-white/10" />

          {/* Answered Adjectives List */}
          <div className="w-full flex-1 flex flex-col overflow-hidden">
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-3 text-center">SOLVED_WORDS</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              <AnimatePresence>
                {gameData && Array.from(new Set(gameData.placements.filter(p => p.answered).map(p => p.id))).map((id) => {
                   const p = gameData.placements.find(item => item.id === id);
                   if (!p) return null;
                   return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-black/30 border border-white/10 p-2 rounded-xl flex flex-col"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-casino-gold">{p.adjective.kana}</span>
                        <span className="text-[10px] text-white/80 font-bold">
                          {language === 'es' ? p.adjective.spanish : p.adjective.english}
                        </span>
                      </div>
                      <span className="text-[8px] text-white/30 uppercase font-black tracking-tighter">{p.adjective.romaji}</span>
                    </motion.div>
                   );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Effects Layer */}
      <AnimatePresence>
        {chips.map(chip => (
          <CasinoChip key={chip.id} color={chip.color} style={{ left: chip.x, top: chip.y }} />
        ))}
        {showSuccess && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 text-center px-4"
          >
            <div className="bg-casino-gold text-casino-blue px-12 py-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white max-w-2xl">
              <p className="text-5xl font-display font-bold italic tracking-tighter uppercase leading-tight">
                {showSuccess}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Game Clear Overlay */}
      <AnimatePresence>
        {isGameClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-casino-blue-dark border-4 border-casino-gold p-12 rounded-[3rem] text-center shadow-[0_0_50px_rgba(255,215,0,0.3)]"
            >
              <Trophy size={80} className="mx-auto text-casino-gold mb-6" />
              <h2 className="text-5xl font-display font-bold text-casino-gold mb-2 tracking-tighter">CONGRATULATIONS!</h2>
              <p className="text-white/60 mb-8 font-bold uppercase tracking-widest">You mastered the lessons: {selectedLessons.join(', ')}!</p>
              
              <div className="flex gap-4 justify-center">
                <button 
                   onClick={startNewGame}
                   className="flex items-center gap-2 px-10 py-4 bg-casino-gold text-casino-blue rounded-2xl font-bold text-xl hover:bg-white transition-all transform hover:scale-105"
                >
                  <RotateCcw /> PLAY AGAIN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,215,0,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,215,0,0.4);
        }
      `}</style>
    </div>
  );
}
