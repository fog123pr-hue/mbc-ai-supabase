
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, GameRecord, GuessEntry } from './types';
import { fetchBestRecord, saveRecord } from './supabase';
import { getAICommentary } from './geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [playerName, setPlayerName] = useState('');
  const [bestRecord, setBestRecord] = useState<GameRecord | null>(null);
  const [targetNumber, setTargetNumber] = useState(0);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [aiHint, setAiHint] = useState('Welcome to the Quest!');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [inputError, setInputError] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load best record on mount
  useEffect(() => {
    const loadBest = async () => {
      const best = await fetchBestRecord();
      if (best) setBestRecord(best);
    };
    loadBest();
  }, []);

  const startGame = () => {
    if (!playerName.trim()) return;
    // Correctly generates an integer between 1 and 100 (inclusive)
    const newTarget = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(newTarget);
    setGuesses([]);
    setTimer(0);
    setCurrentGuess('');
    setAiHint(`I've picked a number between 1 and 100, ${playerName}. Good luck!`);
    setStatus(GameStatus.PLAYING);
    setIsNewRecord(false);
    setInputError(false);

    timerRef.current = window.setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(currentGuess);
    
    if (isNaN(num) || num < 1 || num > 100) {
      setInputError(true);
      setAiHint("Please enter a valid number between 1 and 100!");
      return;
    }

    setInputError(false);
    const feedback = num > targetNumber ? 'High' : num < targetNumber ? 'Low' : 'Correct';
    const newEntry: GuessEntry = {
      number: num,
      feedback,
      timestamp: Date.now(),
    };

    const updatedGuesses = [newEntry, ...guesses];
    setGuesses(updatedGuesses);
    setCurrentGuess('');

    if (num === targetNumber) {
      stopTimer();
      setStatus(GameStatus.WON);
      checkAndSaveRecord(updatedGuesses.length, timer);
    } else {
      const hint = await getAICommentary(num, targetNumber, updatedGuesses.length, playerName);
      setAiHint(hint);
    }
  };

  const checkAndSaveRecord = async (attempts: number, timeSec: number) => {
    const isBetter = !bestRecord || 
      attempts < bestRecord.attempts || 
      (attempts === bestRecord.attempts && timeSec < bestRecord.time_seconds);

    if (isBetter) {
      setIsNewRecord(true);
      const newRec: GameRecord = {
        player_name: playerName,
        attempts,
        time_seconds: timeSec
      };
      await saveRecord(newRec);
      setBestRecord(newRec);
    }
  };

  const resetGame = () => {
    setStatus(GameStatus.IDLE);
    setPlayerName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          GEMINI QUEST
        </h1>
        <p className="text-slate-400 uppercase tracking-widest text-sm">Find the number between 1 and 100</p>
      </div>

      <div className="w-full max-w-xl glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

        {status === GameStatus.IDLE && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hall of Fame Snippet */}
            {bestRecord ? (
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-blue-500/20">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-blue-400 text-xs font-bold uppercase flex items-center gap-2">
                        <i className="fas fa-trophy text-amber-400"></i> Best Record
                    </h2>
                    <span className="text-[10px] text-slate-500 italic">Global Leaderboard</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-2xl font-bold">{bestRecord.player_name}</div>
                    <div className="text-slate-400 text-sm">Champion</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-400">{bestRecord.attempts} <span className="text-xs text-slate-500 font-normal">guesses</span></div>
                    <div className="text-sm text-slate-300">{bestRecord.time_seconds}s <span className="text-xs text-slate-500 font-normal">elapsed</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-500 italic">The throne is empty. Claim it.</div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300 ml-1">Enter Challenger Name</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: King Arthur"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              />
              <button 
                onClick={startGame}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
              >
                ENTER THE QUEST (1-100)
              </button>
            </div>
          </div>
        )}

        {status === GameStatus.PLAYING && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-slate-300">
                <i className="far fa-clock text-blue-400"></i>
                <span>{timer}s</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-slate-300">
                <i className="fas fa-hashtag text-emerald-400"></i>
                <span>{guesses.length} Attempts</span>
              </div>
            </div>

            <div className={`bg-slate-900/80 p-4 rounded-2xl border ${inputError ? 'border-rose-500/50 animate-shake' : 'border-slate-800'} min-h-[80px] flex items-center justify-center text-center transition-colors`}>
              <p className={`${inputError ? 'text-rose-400' : 'text-slate-200'} font-medium italic`}>"{aiHint}"</p>
            </div>

            <form onSubmit={handleGuess} className="flex gap-2">
              <input 
                autoFocus
                type="number" 
                min="1" 
                max="100"
                value={currentGuess}
                onChange={(e) => {
                    setCurrentGuess(e.target.value);
                    if (inputError) setInputError(false);
                }}
                placeholder="1-100"
                className={`flex-1 bg-slate-900/50 border ${inputError ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-4 text-2xl text-center font-bold focus:outline-none focus:ring-2 ${inputError ? 'focus:ring-rose-500/50' : 'focus:ring-emerald-500/50'} transition-all`}
              />
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 px-8 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
              >
                GUESS
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                <span>Recent Guesses</span>
                <span>Latest First</span>
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {guesses.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 text-sm italic">The battlefield is quiet. Start guessing!</div>
                ) : (
                  guesses.map((g, i) => (
                    <div key={g.timestamp} className={`flex justify-between items-center p-3 rounded-lg border ${i === 0 ? 'bg-slate-700/50 border-blue-500/30' : 'bg-slate-800/30 border-transparent shadow-inner'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {guesses.length - i}
                        </span>
                        <span className="text-lg font-bold">#{g.number}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${g.feedback === 'High' ? 'text-rose-400 bg-rose-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                        {g.feedback}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {status === GameStatus.WON && (
          <div className="text-center space-y-8 animate-in zoom-in duration-500">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/20 rounded-full mb-4">
              <i className="fas fa-check text-4xl text-emerald-400 animate-bounce-subtle"></i>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white">CORRECT!</h2>
              <p className="text-slate-400">The secret number was <span className="text-white font-bold text-xl">{targetNumber}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-tighter">Time Taken</div>
                <div className="text-3xl font-bold">{timer}<span className="text-sm font-normal text-slate-500 ml-1">sec</span></div>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-tighter">Attempts</div>
                <div className="text-3xl font-bold">{guesses.length}<span className="text-sm font-normal text-slate-500 ml-1">times</span></div>
              </div>
            </div>

            {isNewRecord && (
              <div className="bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-500/50 p-4 rounded-2xl animate-pulse flex items-center justify-center gap-2">
                <i className="fas fa-star text-amber-400"></i>
                <p className="text-amber-400 font-bold">✨ WORLD RECORD ACHIEVED! ✨</p>
                <i className="fas fa-star text-amber-400"></i>
              </div>
            )}

            <button 
              onClick={resetGame}
              className="w-full bg-slate-100 hover:bg-white text-slate-900 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-redo-alt"></i> PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      <footer className="mt-8 text-slate-600 text-xs flex items-center gap-4">
        <span>GEMINI 3 FLASH AI ENGINE</span>
        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
        <span>SUPABASE DATA REALTIME</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .animate-shake {
            animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default App;
