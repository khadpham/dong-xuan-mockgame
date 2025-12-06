import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, User, Heart } from 'lucide-react';
import { GameOverlay } from './GameOverlay';
import { GameState, PortResource, Worker, Boat } from '../types';

interface Props {
  onBack: () => void;
}

const RESOURCES: Record<PortResource, { color: string, name: string }> = {
  BROWN: { color: 'bg-[#8D6E63]', name: 'Tạp Phẩm' },
  PINK: { color: 'bg-[#F48FB1]', name: 'Đồ Chơi' },
  BLUE: { color: 'bg-[#90CAF9]', name: 'Đồ Dùng' },
  YELLOW: { color: 'bg-[#FFF59D]', name: 'Nông Sản' },
  ORANGE: { color: 'bg-[#FFCC80]', name: 'Hoa Quả' },
  GREEN: { color: 'bg-[#A5D6A7]', name: 'Thực Phẩm' },
  PURPLE: { color: 'bg-[#CE93D8]', name: 'Vải Sợi' },
};

const WIN_BOATS = 12; // Updated to 12
const MAX_LIVES = 3;

export const EastGate: React.FC<Props> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ isPlaying: false, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [boatsCleared, setBoatsCleared] = useState(0);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  
  const frameRef = useRef<number>(0);

  const initGame = () => {
    setWorkers(Array(5).fill(null).map((_, i) => ({
      id: i,
      state: 'IDLE',
      progress: 0
    })));
    setBoats([]);
    setBoatsCleared(0);
    setSelectedWorkerId(null);
    setGameState({ isPlaying: true, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
    // Initial spawn handled by useEffect
  };

  const spawnBoat = useCallback(() => {
    const keys = Object.keys(RESOURCES) as PortResource[];
    const count = 2 + Math.floor(Math.random() * 2); 
    const requests: PortResource[] = [];
    for(let i=0; i<count; i++) {
        requests.push(keys[Math.floor(Math.random() * keys.length)]);
    }

    const newBoat: Boat = {
      id: Date.now().toString() + Math.random(),
      requests,
      patience: 100,
      maxPatience: 100
    };
    setBoats(prev => [...prev, newBoat]);
  }, []);

  // ZERO DOWNTIME LOGIC
  useEffect(() => {
    if (gameState.isPlaying && boats.length === 0) {
        spawnBoat();
    }
  }, [gameState.isPlaying, boats.length, spawnBoat]);

  // Periodic Spawn
  useEffect(() => {
    const interval = setInterval(() => {
        if(gameState.isPlaying && boats.length < 3) spawnBoat();
    }, 4000);
    return () => clearInterval(interval);
  }, [gameState.isPlaying, boats.length, spawnBoat]);

  const gameLoop = () => {
    if (!gameState.isPlaying) return;

    // 1. Boat Logic (Patience)
    setBoats(prev => {
      let lost = false;
      const nextBoats = prev.map(b => {
        if (b.patience <= 0) lost = true;
        // Increased decay rate from 0.05 to 0.08
        return { ...b, patience: b.patience - 0.08 };
      });
      
      if (lost && gameState.lives && gameState.lives > 0) {
         setGameState(s => ({ ...s, isPlaying: false, isLost: true }));
      }
      return nextBoats.filter(b => b.requests.length > 0);
    });

    // 2. Worker Logic & Delivery Check
    setWorkers(prevWorkers => {
        // We create a copy to mutate
        const nextWorkers = prevWorkers.map(w => ({...w}));
        const speed = 3;

        nextWorkers.forEach(w => {
            if (w.state === 'MOVING_TO_WAREHOUSE') {
                if (w.progress < 100) {
                    w.progress += speed;
                } else {
                    w.state = 'LOADED';
                    w.progress = 0;
                    w.carrying = w.targetResource;
                }
            } else if (w.state === 'MOVING_TO_BOAT') {
                if (w.progress < 100) {
                    w.progress += speed;
                } else {
                    // ARRIVAL DETECTED
                    w.state = 'RETURNING';
                    w.progress = 0;
                    // Trigger delivery processing
                    handleDelivery(w.id, w.targetBoatId!, w.carrying!);
                    
                    w.carrying = undefined;
                    w.targetBoatId = undefined;
                }
            } else if (w.state === 'RETURNING') {
                if (w.progress < 100) {
                    w.progress += speed;
                } else {
                    w.state = 'IDLE';
                    w.progress = 0;
                }
            }
        });
        return nextWorkers;
    });

    // Win Check
    if (boatsCleared >= WIN_BOATS && !gameState.isWon) {
        setGameState(s => ({ ...s, isPlaying: false, isWon: true }));
    }

    frameRef.current = requestAnimationFrame(gameLoop);
  };

  // Logic for handling delivery safely
  const handleDelivery = (workerId: number, boatId: string, cargo: PortResource) => {
      setBoats(currentBoats => {
          // Find the boat
          const boatIndex = currentBoats.findIndex(b => b.id === boatId);
          
          // Boat might have left (patience 0) or be gone
          if (boatIndex === -1) {
              return currentBoats;
          }

          const boat = currentBoats[boatIndex];
          const reqIndex = boat.requests.indexOf(cargo);

          if (reqIndex > -1) {
              // CORRECT DELIVERY
              const newRequests = [...boat.requests];
              newRequests.splice(reqIndex, 1);
              
              const updatedBoats = [...currentBoats];
              
              if (newRequests.length === 0) {
                  // Boat Cleared
                  updatedBoats.splice(boatIndex, 1); // Remove boat
                  setBoatsCleared(c => c + 1); // Increment score
              } else {
                  // Update boat
                  updatedBoats[boatIndex] = {
                      ...boat,
                      requests: newRequests,
                      patience: Math.min(100, boat.patience + 15) // Bonus patience
                  };
              }
              return updatedBoats;
          } else {
              // WRONG DELIVERY
              setGameState(s => {
                  const newLives = (s.lives || 1) - 1;
                  if (newLives <= 0) return { ...s, lives: 0, isPlaying: false, isLost: true };
                  return { ...s, lives: newLives };
              });
              return currentBoats;
          }
      });
  };

  useEffect(() => {
    if (gameState.isPlaying) frameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState.isPlaying, boats, workers]); 

  // Interaction Flow
  const handleResourceTap = (res: PortResource) => {
    if (!gameState.isPlaying) return;
    
    // Auto-assign to first IDLE worker
    const idleWorkerIdx = workers.findIndex(w => w.state === 'IDLE');
    if (idleWorkerIdx !== -1) {
        setWorkers(prev => {
            const next = [...prev];
            next[idleWorkerIdx] = {
                ...next[idleWorkerIdx],
                state: 'MOVING_TO_WAREHOUSE',
                targetResource: res,
                progress: 0
            };
            return next;
        });
    }
  };

  const handleWorkerTap = (workerId: number) => {
      const worker = workers.find(w => w.id === workerId);
      if (worker && worker.state === 'LOADED') {
          setSelectedWorkerId(workerId);
      }
  };

  const handleBoatTap = (boatId: string) => {
    if (!gameState.isPlaying || selectedWorkerId === null) return;

    // Send selected worker to boat
    setWorkers(prev => prev.map(w => {
        if (w.id === selectedWorkerId) {
            return {
                ...w,
                state: 'MOVING_TO_BOAT',
                targetBoatId: boatId,
                progress: 0
            };
        }
        return w;
    }));
    setSelectedWorkerId(null);
  };

  return (
    <div className="h-full flex flex-col bg-blue-50 font-serif relative">
      {!gameState.isPlaying && (
        <GameOverlay 
          status={gameState.isLost ? 'LOST' : gameState.isWon ? 'WON' : 'START'}
          title="BẾN CẢNG 7 NGÀNH HÀNG"
          description={`Hoàn thành ${WIN_BOATS} chuyến thuyền. QUY TRÌNH: 1. Bấm Hàng (Cửu vạn tự lấy). 2. Bấm Cửu vạn đang vác hàng. 3. Bấm Thuyền để giao. Sai 3 lần hoặc Thuyền hết giờ là THUA.`}
          onAction={initGame}
          onHome={onBack}
        />
      )}

      {/* Header Info */}
      <div className="absolute top-0 right-0 p-2 z-10 flex gap-4 bg-white/50 rounded-bl-lg">
          <div className="flex text-red-500">
             {Array(gameState.lives).fill(0).map((_, i) => <Heart key={i} fill="currentColor" size={20}/>)}
          </div>
          <div className="font-bold">THUYỀN: {boatsCleared}/{WIN_BOATS}</div>
      </div>

      {/* Boats Zone */}
      <div className="flex-1 bg-blue-200 border-b-4 border-[#8d6e63] relative p-2 flex gap-2 overflow-x-auto items-end">
         {boats.map(boat => (
           <button 
             key={boat.id} 
             onClick={() => handleBoatTap(boat.id)}
             className={`w-1/3 min-w-[100px] bg-white rounded-t-lg p-2 border-4 relative transition-all active:scale-95 ${selectedWorkerId !== null ? 'border-yellow-400 animate-pulse' : 'border-blue-900'}`}
           >
              <div className="h-2 w-full bg-gray-200 mb-2 rounded-full overflow-hidden">
                 <div className={`h-full ${boat.patience < 30 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${boat.patience}%` }}></div>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                 {boat.requests.map((req, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full border border-black/20 ${RESOURCES[req].color}`} title={RESOURCES[req].name}></div>
                 ))}
                 {boat.requests.length === 0 && <span className="text-green-600 font-bold">OK!</span>}
              </div>
              <div className="absolute -bottom-8 left-0 w-full text-center text-4xl">⛵</div>
           </button>
         ))}
      </div>

      {/* Worker Zone (Middle) */}
      <div className="h-48 bg-[#fdfbf7] relative border-b border-gray-300 overflow-hidden">
         {workers.map(w => {
            let bottom = '10%';
            let left = '50%';
            
            // Visual Positioning Logic
            if (w.state === 'IDLE') {
               left = `${10 + (w.id * 18)}%`;
            } else if (w.state === 'MOVING_TO_WAREHOUSE') {
               bottom = `${10 - (w.progress * 0.1)}%`; 
               left = `${10 + (w.id * 18)}%`;
            } else if (w.state === 'LOADED') {
               bottom = '20%';
               left = `${10 + (w.id * 18)}%`;
            } else if (w.state === 'MOVING_TO_BOAT') {
               bottom = `${20 + (w.progress * 0.7)}%`;
               left = `${10 + (w.id * 18)}%`;
            } else if (w.state === 'RETURNING') {
               bottom = `${90 - (w.progress * 0.8)}%`;
               left = `${10 + (w.id * 18)}%`;
            }

            const isSelected = selectedWorkerId === w.id;

            return (
              <button 
                key={w.id}
                onClick={() => handleWorkerTap(w.id)}
                disabled={w.state !== 'LOADED'}
                className={`absolute transition-all duration-75 flex flex-col items-center ${isSelected ? 'scale-125 z-20 drop-shadow-xl' : ''} ${w.state === 'LOADED' ? 'cursor-pointer hover:scale-110' : ''}`}
                style={{ bottom, left }}
              >
                 <User className={`w-8 h-8 ${w.state === 'IDLE' ? 'text-gray-300' : isSelected ? 'text-yellow-600' : 'text-blue-600'}`} />
                 {w.carrying && (
                    <div className={`w-5 h-5 rounded-full ${RESOURCES[w.carrying].color} -mt-3 border-2 border-white shadow-sm z-10`}></div>
                 )}
                 {w.state === 'LOADED' && !isSelected && (
                    <div className="animate-bounce text-xs font-bold text-yellow-600">!</div>
                 )}
              </button>
            );
         })}
      </div>

      {/* Warehouse Controls */}
      <div className="bg-[#5D4037] p-4">
         <div className="text-white text-xs mb-1 text-center font-bold">
            {selectedWorkerId !== null ? 'BƯỚC 3: CHỌN THUYỀN ĐỂ GIAO' : 'BƯỚC 1: CHỌN HÀNG (Cửu vạn tự lấy)'}
         </div>
         <div className="grid grid-cols-4 gap-2">
            {(Object.keys(RESOURCES) as PortResource[]).map(res => (
                <button
                key={res}
                onClick={() => handleResourceTap(res)}
                className={`${RESOURCES[res].color} h-16 rounded-md shadow-md active:scale-95 border-b-4 border-black/20 flex flex-col items-center justify-center`}
                >
                <span className="text-[10px] font-bold text-black/70 uppercase text-center leading-tight px-1">{RESOURCES[res].name}</span>
                </button>
            ))}
         </div>
      </div>
    </div>
  );
};