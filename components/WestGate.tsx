import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, User, Heart, Trash2 } from 'lucide-react';
import { GameOverlay } from './GameOverlay';
import { GameState, FashionCustomer, FabricColor, Pattern, Style, FashionItem } from '../types';

interface Props {
  onBack: () => void;
}

const COLORS: Record<FabricColor, { label: string, css: string }> = {
  RED: { label: 'Đỏ', css: 'bg-red-700' },
  CREAM: { label: 'Mỡ Gà', css: 'bg-yellow-200' },
  WHITE: { label: 'Trắng', css: 'bg-white' }
};

const PATTERNS: Record<Pattern, string> = {
  LOTUS: 'Sen', CHRYSANTHEMUM: 'Cúc', BAMBOO: 'Trúc'
};

const STYLES: Record<Style, string> = {
  LONG: 'Dài', MIDI: 'Lửng', MODERN: 'Tân'
};

const WIN_SCORE = 100;
const MAX_LIVES = 3;

export const WestGate: React.FC<Props> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ isPlaying: false, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
  const [customers, setCustomers] = useState<FashionCustomer[]>([]);
  const [craftingState, setCraftingState] = useState<Partial<FashionItem>>({});
  const [craftedItem, setCraftedItem] = useState<FashionItem | null>(null);

  const initGame = () => {
    setCustomers([]);
    setCraftingState({});
    setCraftedItem(null);
    setGameState({ isPlaying: true, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
    // Initial spawn handled by useEffect
  };

  const createCustomer = () => {
    const colors = Object.keys(COLORS) as FabricColor[];
    const patterns = Object.keys(PATTERNS) as Pattern[];
    const styles = Object.keys(STYLES) as Style[];

    const newCustomer: FashionCustomer = {
      id: Date.now().toString() + Math.random(),
      createdAt: Date.now(),
      order: {
        color: colors[Math.floor(Math.random() * colors.length)],
        pattern: patterns[Math.floor(Math.random() * patterns.length)],
        style: styles[Math.floor(Math.random() * styles.length)],
      },
      patience: 100,
      isBubbleVisible: true
    };
    return newCustomer;
  };

  const spawnCustomer = useCallback(() => {
    setCustomers(prev => {
        if (prev.length >= 4) return prev;
        
        const newCustomer = createCustomer();
        // Check for double spawn chance inside the setter or after?
        // Since this is inside setCustomers, we can't trigger another setCustomers easily for the delay.
        // Simplified: Just add one, or add two immediately if we want double spawn logic here.
        // Let's keep it simple: Add one.
        return [...prev, newCustomer];
    });

    // Handle random double spawn via side effect or just probability here?
    // Since we are inside useCallback, let's keep it simple to ensure stability.
  }, []);

  // ZERO DOWNTIME LOGIC
  useEffect(() => {
    if (gameState.isPlaying && customers.length === 0) {
        spawnCustomer();
    }
  }, [gameState.isPlaying, customers.length, spawnCustomer]);

  // Periodic Spawn
  useEffect(() => {
     if (!gameState.isPlaying) return;
     const interval = setInterval(() => {
         spawnCustomer();
     }, 3500); 
     return () => clearInterval(interval);
  }, [gameState.isPlaying, spawnCustomer]);

  // Patience Loop & Visibility Check
  useEffect(() => {
      if (!gameState.isPlaying) return;
      const interval = setInterval(() => {
          setCustomers(prev => {
              const now = Date.now();
              const next = prev.map(c => {
                 // Check visibility (3.5s rule)
                 const shouldHide = (now - c.createdAt) > 3500;
                 
                 return {
                     ...c,
                     patience: c.patience - 1,
                     isBubbleVisible: shouldHide ? false : c.isBubbleVisible // Once hidden, stays hidden unless clicked
                 };
              });

              // Check timeout
              const lost = next.find(c => c.patience <= 0);
              if (lost) {
                  // Patience 0 -> lose life
                  // We remove the customer so they don't keep draining lives
                  setGameState(s => {
                       const newLives = (s.lives || 1) - 1;
                       if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
                       return { ...s, lives: newLives };
                  });
                  return next.filter(c => c.id !== lost.id);
              }
              return next;
          });
      }, 100);
      return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  const craft = () => {
    if (craftingState.color && craftingState.pattern && craftingState.style) {
       setCraftedItem(craftingState as FashionItem);
       setCraftingState({});
    }
  };

  const handleCustomerClick = (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      if (craftedItem) {
          // Attempt Delivery
            // Check match
            const isMatch = 
            customer.order.color === craftedItem.color &&
            customer.order.pattern === craftedItem.pattern &&
            customer.order.style === craftedItem.style;

            if (isMatch) {
            const newScore = gameState.score + 10;
            if (newScore >= WIN_SCORE) {
                setGameState(s => ({ ...s, score: newScore, isPlaying: false, isWon: true }));
            } else {
                setGameState(s => ({ ...s, score: newScore }));
                setCustomers(prev => prev.filter(c => c.id !== customerId));
                setCraftedItem(null);
            }
            } else {
            // Wrong item -> Lose Life
            setGameState(s => {
                const newLives = (s.lives || 1) - 1;
                if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
                return { ...s, lives: newLives };
            });
            // Keep customer, but item lost
            setCraftedItem(null);
            }
      } else {
          // Ask logic: Reveal bubble, Penalty patience
          setCustomers(prev => prev.map(c => {
              if (c.id === customerId) {
                  return {
                      ...c,
                      isBubbleVisible: true,
                      createdAt: Date.now(), // Reset timer so it stays for another 3.5s? Or just rely on isBubbleVisible? 
                      // Let's reset createdAt so it naturally hides again after 3.5s
                      patience: Math.max(0, c.patience - 10) // -1s penalty
                  };
              }
              return c;
          }));
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#212121] text-[#d4af37] font-deco relative">
       {!gameState.isPlaying && (
        <GameOverlay 
          status={gameState.isLost ? 'LOST' : gameState.isWon ? 'WON' : 'START'}
          title="XƯỞNG MAY CẤP TỐC"
          description={`May đúng trả khách. Order ẩn sau 3.5s. Bấm vào khách để xem lại (-1s kiên nhẫn). Giao sai = Mất mạng.`}
          onAction={initGame}
          onHome={onBack}
        />
      )}

      {/* Header Info */}
      <div className="absolute top-0 right-0 p-2 text-sm z-10 bg-black/50 rounded-bl-lg flex gap-4">
          <div className="flex text-red-500">
             {Array(gameState.lives).fill(0).map((_, i) => <Heart key={i} fill="currentColor" size={20}/>)}
          </div>
          <div>SCORE: {gameState.score}/{WIN_SCORE}</div>
      </div>

      {/* Customers Area - More padding top */}
      <div className="flex-1 flex justify-around items-start pt-32 border-b border-[#d4af37]/30">
         {customers.map(c => (
           <div key={c.id} className="relative flex flex-col items-center w-1/4">
              {/* Speech Bubble - Conditional Visibility */}
              <div className={`absolute -top-24 bg-white text-black p-2 rounded shadow-lg w-28 text-center text-xs z-20 transition-opacity duration-300 ${c.isBubbleVisible ? 'opacity-100' : 'opacity-0'}`}>
                 <span className="font-bold block text-sm">{COLORS[c.order.color].label}</span>
                 <span className="block italic">{PATTERNS[c.order.pattern]}</span>
                 <span className="block uppercase tracking-wider">{STYLES[c.order.style]}</span>
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
              </div>

              {/* Customer Avatar - Click to Give or Ask */}
              <button 
                onClick={() => handleCustomerClick(c.id)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-[#d4af37] flex items-center justify-center relative z-10 transition-all active:scale-95 ${craftedItem ? 'ring-4 ring-[#d4af37]/30 cursor-pointer' : 'cursor-help'}`}
              >
                 <User size={32} className="text-[#d4af37]" />
                 {!c.isBubbleVisible && !craftedItem && (
                     <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center animate-bounce">?</span>
                 )}
              </button>

              {/* Patience Bar */}
              <div className="w-16 sm:w-20 h-2 bg-gray-700 mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${c.patience < 30 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${c.patience}%`}}></div>
              </div>
           </div>
         ))}
      </div>

      {/* Crafting Area */}
      <div className="h-1/2 bg-[#1a1a1a] p-4 flex flex-col gap-4">
         
         <div className="flex-1 grid grid-cols-3 gap-2">
            {/* Column 1: Color */}
            <div className="flex flex-col gap-1">
               <div className="text-[10px] text-center uppercase tracking-widest text-gray-500">Màu</div>
               {(Object.keys(COLORS) as FabricColor[]).map(k => (
                  <button 
                    key={k}
                    onClick={() => setCraftingState(s => ({...s, color: k}))}
                    className={`flex-1 border border-[#d4af37]/50 ${craftingState.color === k ? 'bg-[#d4af37] text-black font-bold' : ''}`}
                  >
                     {COLORS[k].label}
                  </button>
               ))}
            </div>

            {/* Column 2: Pattern */}
            <div className="flex flex-col gap-1">
               <div className="text-[10px] text-center uppercase tracking-widest text-gray-500">Hoa</div>
               {(Object.keys(PATTERNS) as Pattern[]).map(k => (
                  <button 
                    key={k}
                    onClick={() => setCraftingState(s => ({...s, pattern: k}))}
                    className={`flex-1 border border-[#d4af37]/50 ${craftingState.pattern === k ? 'bg-[#d4af37] text-black font-bold' : ''}`}
                  >
                     {PATTERNS[k]}
                  </button>
               ))}
            </div>

            {/* Column 3: Style */}
            <div className="flex flex-col gap-1">
               <div className="text-[10px] text-center uppercase tracking-widest text-gray-500">Kiểu</div>
               {(Object.keys(STYLES) as Style[]).map(k => (
                  <button 
                    key={k}
                    onClick={() => setCraftingState(s => ({...s, style: k}))}
                    className={`flex-1 border border-[#d4af37]/50 ${craftingState.style === k ? 'bg-[#d4af37] text-black font-bold' : ''}`}
                  >
                     {STYLES[k]}
                  </button>
               ))}
            </div>
         </div>

         {/* Action Bar */}
         <div className="h-16 flex gap-4">
            <button 
               onClick={craft}
               disabled={!craftingState.color || !craftingState.pattern || !craftingState.style || !!craftedItem}
               className="flex-1 bg-[#9b2226] text-white font-bold uppercase disabled:opacity-50"
            >
               MAY (CRAFT)
            </button>
            
            <div className="w-1/3 border-2 border-dashed border-[#d4af37]/50 flex items-center justify-center relative">
               {craftedItem ? (
                  <div className="text-center w-full">
                     <div className="text-xs">Đang cầm:</div>
                     <div className="font-bold text-[#d4af37]">{COLORS[craftedItem.color].label}/{PATTERNS[craftedItem.pattern]}/{STYLES[craftedItem.style]}</div>
                     <div className="text-[10px] text-gray-400">Bấm vào khách để đưa</div>
                     
                     <button 
                        onClick={() => setCraftedItem(null)}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-400 p-1"
                        title="Hủy món đồ"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               ) : (
                  <span className="text-xs text-gray-500">Chưa có đồ</span>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};