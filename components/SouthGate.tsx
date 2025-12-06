import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Trash2, Heart, Plus } from 'lucide-react';
import { GameOverlay } from './GameOverlay';
import { GameState, NoodleType, ToppingType, Pot, CustomerOrder, Bowl } from '../types';

interface Props {
  onBack: () => void;
}

const TOPPINGS: Record<ToppingType, string> = {
  BEEF: 'BÒ', CHICKEN: 'GÀ', EGG: 'TRỨNG', QUAY: 'QUẨY', ONION: 'HÀNH', MEATBALL: 'MỌC'
};

const NOODLES: Record<NoodleType, string> = {
  PHO: 'PHỞ', BUN: 'BÚN', MIEN: 'MIẾN'
};

const WIN_SCORE = 60; // 60 Xu
const MAX_LIVES = 3;

export const SouthGate: React.FC<Props> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ isPlaying: false, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
  const [pots, setPots] = useState<Pot[]>([
    { id: 1, type: 'PHO', state: 'EMPTY', progress: 0 },
    { id: 2, type: 'BUN', state: 'EMPTY', progress: 0 }
  ]);
  const [bowls, setBowls] = useState<Bowl[]>([]); // Max 2 bowls
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  const frameRef = useRef<number>(0);

  const initGame = () => {
    setOrders([]);
    setBowls([]);
    setPots([
        { id: 1, type: 'PHO', state: 'EMPTY', progress: 0 },
        { id: 2, type: 'BUN', state: 'EMPTY', progress: 0 }
    ]);
    setGameState({ isPlaying: true, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
    // Initial spawn handled by useEffect
  };

  const spawnOrder = useCallback(() => {
     const noodles: NoodleType[] = ['PHO', 'BUN', 'MIEN'];
     const toppingsKeys = Object.keys(TOPPINGS) as ToppingType[];
     const randomToppings = [
         toppingsKeys[Math.floor(Math.random() * toppingsKeys.length)],
         toppingsKeys[Math.floor(Math.random() * toppingsKeys.length)]
     ]; 

     const newOrder: CustomerOrder = {
         id: Date.now().toString() + Math.random(), // Ensure unique ID
         noodle: noodles[Math.floor(Math.random() * noodles.length)],
         toppings: Array.from(new Set(randomToppings)), 
         patience: 100
     };
     setOrders(prev => [...prev, newOrder]);
  }, []);

  // ZERO DOWNTIME LOGIC: If no orders, spawn immediately
  useEffect(() => {
    if (gameState.isPlaying && orders.length === 0) {
        spawnOrder();
    }
  }, [gameState.isPlaying, orders.length, spawnOrder]);

  // Periodic Spawn Logic
  useEffect(() => {
    if (!gameState.isPlaying) return;
    
    // Adjusted Spawn Rate: 4000ms
    const interval = setInterval(() => {
        if (orders.length < 5) spawnOrder(); 
    }, 4000);
    return () => clearInterval(interval);
  }, [gameState.isPlaying, orders.length, spawnOrder]);

  useEffect(() => {
      if (!gameState.isPlaying) return;
      
      const loop = () => {
          setPots(prev => prev.map(pot => {
              if (pot.state === 'COOKING') {
                  if (pot.progress >= 100) return { ...pot, state: 'COOKED', progress: 100 };
                  return { ...pot, progress: pot.progress + 0.8 }; 
              }
              if (pot.state === 'COOKED') {
                  if (pot.progress >= 200) return { ...pot, state: 'BURNT', progress: 200 };
                  return { ...pot, progress: pot.progress + 0.4 }; 
              }
              return pot;
          }));

          setOrders(prev => {
              const next = prev.map(o => ({ ...o, patience: o.patience - 0.1 }));
              if (next.some(o => o.patience <= 0)) {
                  // Patience logic handled below
              }
              return next;
          });
          
          // Check for timeout removal
          const timedOut = orders.find(o => o.patience <= 0);
          if (timedOut) {
              setOrders(prev => prev.filter(o => o.id !== timedOut.id));
              setGameState(s => {
                   const newLives = (s.lives || 1) - 1;
                   if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
                   return { ...s, lives: newLives };
              });
          }

          if (gameState.score >= WIN_SCORE && !gameState.isWon) {
              setGameState(s => ({ ...s, isPlaying: false, isWon: true }));
          }

          frameRef.current = requestAnimationFrame(loop);
      };

      frameRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frameRef.current);
  }, [gameState.isPlaying, orders]);

  // Actions
  const addBowl = () => {
      if (bowls.length < 2) {
          setBowls(prev => {
              const newBowl = { id: Date.now(), noodle: null, toppings: [], isSelected: prev.length === 0 };
              return [...prev, newBowl];
          });
      }
  };

  const selectBowl = (id: number) => {
      setBowls(prev => prev.map(b => ({ ...b, isSelected: b.id === id })));
  };

  const handleCookCommand = (type: NoodleType) => {
      // Find first empty pot
      const emptyPot = pots.find(p => p.state === 'EMPTY');
      if (emptyPot) {
          setPots(prev => prev.map(p => p.id === emptyPot.id ? { ...p, type: type, state: 'COOKING', progress: 0 } : p));
      }
      // Else ignore
  };

  const transferPotToBowl = (potId: number) => {
      const pot = pots.find(p => p.id === potId);
      const targetBowl = bowls.find(b => b.isSelected);

      if (pot?.state === 'BURNT') {
          return; 
      }

      if (pot?.state === 'COOKED' && targetBowl && targetBowl.noodle === null) {
          setBowls(prev => prev.map(b => b.id === targetBowl.id ? { ...b, noodle: pot.type } : b));
          setPots(prev => prev.map(p => p.id === potId ? { ...p, state: 'EMPTY', progress: 0 } : p));
      }
  };

  const addTopping = (t: ToppingType) => {
      const targetBowl = bowls.find(b => b.isSelected);
      if (targetBowl && !targetBowl.toppings.includes(t)) {
          setBowls(prev => prev.map(b => b.id === targetBowl.id ? { ...b, toppings: [...b.toppings, t] } : b));
      }
  };

  const handleTrash = () => {
    // 1. Check if selected bowl needs clearing
    const selectedBowl = bowls.find(b => b.isSelected);
    if (selectedBowl) {
        setBowls(prev => prev.filter(b => b.id !== selectedBowl.id));
        return;
    }
    // 2. Check if any pot is burnt (optional convenience)
    const burntPot = pots.find(p => p.state === 'BURNT');
    if (burntPot) {
        setPots(prev => prev.map(p => p.id === burntPot.id ? { ...p, state: 'EMPTY', progress: 0 } : p));
         setGameState(s => {
            const newLives = (s.lives || 1) - 1;
            if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
            return { ...s, lives: newLives };
        });
    }
  };

  const serveBowl = (bowlId: number) => {
      const bowl = bowls.find(b => b.id === bowlId);
      if (!bowl || !bowl.noodle) return;

      const orderIdx = orders.findIndex(o => 
          o.noodle === bowl.noodle &&
          o.toppings.length === bowl.toppings.length &&
          o.toppings.every(t => bowl.toppings.includes(t))
      );

      if (orderIdx > -1) {
          const price = 5 + bowl.toppings.length;
          setGameState(s => ({ ...s, score: s.score + price }));
          setOrders(prev => prev.filter((_, i) => i !== orderIdx));
          setBowls(prev => prev.filter(b => b.id !== bowlId)); 
      } else {
          setBowls(prev => prev.filter(b => b.id !== bowlId)); 
          setGameState(s => {
               const newLives = (s.lives || 1) - 1;
               if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
               return { ...s, lives: newLives };
          });
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#fff3e0] relative">
      {!gameState.isPlaying && (
        <GameOverlay 
          status={gameState.isLost ? 'LOST' : gameState.isWon ? 'WON' : 'START'}
          title="BẾP TRƯỞNG NGÕ ĐỒNG XUÂN"
          description={`Kiếm đủ ${WIN_SCORE} Xu. Chọn món để nấu tự động. Kéo thả hoặc click để gắp vào bát. Bấm Thùng Rác để đổ đồ sai/cháy.`}
          onAction={initGame}
          onHome={onBack}
        />
      )}

      {/* Orders Bar */}
      <div className="h-28 bg-white border-b shadow-sm flex gap-2 p-2 overflow-x-auto">
          {orders.map(order => (
              <div key={order.id} className="min-w-[120px] bg-yellow-50 border-2 border-yellow-200 rounded p-1 flex flex-col text-sm relative">
                  <div className="font-bold text-red-800 text-center uppercase border-b border-red-200 mb-1">{NOODLES[order.noodle]}</div>
                  <div className="flex flex-col gap-0.5">
                      {order.toppings.map(t => <span key={t} className="text-xs bg-white px-1 rounded border border-gray-200">{TOPPINGS[t]}</span>)}
                  </div>
                  <div className="mt-auto h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${order.patience < 30 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${order.patience}%`}}></div>
                  </div>
              </div>
          ))}
      </div>

      <div className="flex-1 p-2 grid grid-cols-12 gap-2">
          
          {/* LEFT: Noodle Selection + Pots */}
          <div className="col-span-4 flex flex-col justify-start gap-4 border-r border-orange-200 pr-2">
              
              {/* Pots (Moved ABOVE buttons) */}
              {pots.map(pot => (
                  <div key={pot.id} className="relative z-10 w-full aspect-square">
                    <button 
                        onClick={() => transferPotToBowl(pot.id)}
                        disabled={pot.state === 'EMPTY'}
                        className={`w-full h-full rounded-full border-4 shadow-md flex items-center justify-center flex-col transition-all active:scale-95
                        ${pot.state === 'EMPTY' ? 'bg-gray-100 border-gray-300' : ''}
                        ${pot.state === 'COOKING' ? 'bg-blue-100 border-blue-400' : ''}
                        ${pot.state === 'COOKED' ? 'bg-green-100 border-green-600 animate-bounce' : ''}
                        ${pot.state === 'BURNT' ? 'bg-gray-800 border-black' : ''}
                        `}
                    >
                        {pot.state === 'EMPTY' ? <span className="text-gray-400 text-xs">TRỐNG</span> : <span className="font-bold text-xs">{NOODLES[pot.type]}</span>}
                        {pot.state === 'COOKED' && <span className="text-[10px] text-green-700 font-bold">XONG</span>}
                        {pot.state === 'BURNT' && <span className="text-[10px] text-red-500 font-bold">CHÁY</span>}
                    </button>
                    {pot.state !== 'EMPTY' && (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300 rounded-full overflow-hidden">
                             <div className={`h-full ${pot.state === 'BURNT' ? 'bg-black' : pot.progress > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, pot.state === 'COOKED' || pot.state === 'BURNT' ? pot.progress - 100 : pot.progress)}%`}}></div>
                        </div>
                    )}
                  </div>
              ))}

              {/* Cooking Buttons (Moved BELOW pots) */}
              <div className="grid grid-cols-1 gap-2 mt-4">
                  {(['PHO', 'BUN', 'MIEN'] as NoodleType[]).map(type => (
                      <button 
                        key={type}
                        onClick={() => handleCookCommand(type)}
                        className="bg-orange-600 text-white font-bold py-2 rounded shadow active:scale-95 hover:bg-orange-700 text-xs"
                      >
                          {NOODLES[type]}
                      </button>
                  ))}
              </div>
          </div>

          {/* CENTER: Tray / Bowls */}
          <div className="col-span-5 bg-orange-50 rounded-lg border-2 border-dashed border-orange-300 p-2 flex flex-col items-center">
              <div className="text-xs text-orange-800 font-bold mb-2 uppercase tracking-widest">Mâm (Tối đa 2)</div>
              
              <div className="flex-1 flex flex-col gap-2 w-full">
                  {bowls.map(bowl => (
                      <div 
                        key={bowl.id}
                        onClick={() => selectBowl(bowl.id)}
                        className={`flex-1 rounded-md border-2 p-2 relative transition-all ${bowl.isSelected ? 'border-blue-600 bg-white shadow-lg ring-2 ring-blue-200' : 'border-gray-300 bg-gray-50 opacity-80'}`}
                      >
                          {/* Bowl Content */}
                          <div className="flex justify-between items-start">
                              <div className="font-bold text-sm text-red-800">{bowl.noodle ? NOODLES[bowl.noodle] : '---'}</div>
                              <button onClick={(e) => { e.stopPropagation(); serveBowl(bowl.id); }} className="bg-green-600 text-white text-[10px] px-2 py-1 rounded shadow hover:bg-green-700">TRẢ</button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                              {bowl.toppings.map((t, i) => (
                                  <span key={i} className="text-[10px] bg-yellow-100 border border-yellow-300 px-1 rounded">{TOPPINGS[t]}</span>
                              ))}
                          </div>
                          {bowl.toppings.length === 0 && !bowl.noodle && <div className="text-xs text-gray-400 mt-2 text-center">Bát Trống</div>}
                      </div>
                  ))}
                  
                  {bowls.length < 2 && (
                      <button onClick={addBowl} className="flex-1 border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100">
                          + LẤY BÁT
                      </button>
                  )}
              </div>

              {/* Trash Button */}
              <button 
                onClick={handleTrash}
                className="mt-2 w-full bg-red-100 border-2 border-red-300 text-red-700 py-2 rounded flex items-center justify-center gap-2 hover:bg-red-200 font-bold text-xs"
              >
                <Trash2 size={16} /> ĐỔ ĐI (Bát/Cháy)
              </button>
          </div>

          {/* RIGHT: Toppings */}
          <div className="col-span-3 grid grid-cols-1 gap-1 overflow-y-auto max-h-[400px]">
               {(Object.keys(TOPPINGS) as ToppingType[]).map(t => (
                   <button 
                    key={t}
                    onClick={() => addTopping(t)}
                    disabled={bowls.length === 0}
                    className="bg-white border-b-4 border-gray-300 active:border-b-0 active:translate-y-1 rounded p-2 text-[10px] font-bold text-gray-700 shadow-sm disabled:opacity-50"
                   >
                       {TOPPINGS[t]}
                   </button>
               ))}
          </div>

          <div className="col-span-12 flex justify-between items-center bg-white p-2 rounded shadow border border-gray-200 mt-2">
               <div className="flex text-red-500">
                  {Array(gameState.lives).fill(0).map((_, i) => <Heart key={i} fill="currentColor" size={20}/>)}
               </div>
               <div className="font-bold text-xl text-green-700">{gameState.score} Xu / {WIN_SCORE}</div>
          </div>
      </div>
    </div>
  );
};