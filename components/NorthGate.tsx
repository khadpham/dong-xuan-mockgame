import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, GitCommitHorizontal, Heart } from 'lucide-react';
import { GameState, Train, TrainColor } from '../types';
import { GameOverlay } from './GameOverlay';

interface Props {
  onBack: () => void;
}

// Topology (Modified for longer start time): 
// Start (0-40) -> Sw1 (x=40)
// Sw1-UP -> Sw2 (x=65, y=25)
// Sw1-DOWN -> Sw3 (x=65, y=75)
// End segments shorten (65 -> 100)

const TRACK_PATHS = {
  'start': 'M 0 50 L 40 50',
  
  // From Switch 1 (40, 50)
  's1_up': 'M 40 50 C 50 50, 55 25, 65 25', 
  's1_down': 'M 40 50 C 50 50, 55 75, 65 75',

  // From Switch 2 (65, 25)
  's2_up': 'M 65 25 C 75 25, 90 10, 100 10', // RED
  's2_down': 'M 65 25 C 75 25, 90 40, 100 40', // BLUE

  // From Switch 3 (65, 75)
  's3_up': 'M 65 75 C 75 75, 90 60, 100 60', // YELLOW
  's3_down': 'M 65 75 C 75 75, 90 90, 100 90', // GREEN
};

const TRAIN_COLORS: Record<TrainColor, string> = {
  RED: 'bg-red-600',
  BLUE: 'bg-blue-600',
  YELLOW: 'bg-yellow-500',
  GREEN: 'bg-green-600'
};

const WIN_SCORE = 20;
const MAX_LIVES = 3;

export const NorthGate: React.FC<Props> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ isPlaying: false, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
  const [trains, setTrains] = useState<Train[]>([]);
  const [switches, setSwitches] = useState({ s1: true, s2: true, s3: true });
  
  const frameRef = useRef<number>(0);
  const lastSpawnTime = useRef<number>(0);
  const spawnInterval = useRef<number>(2000); 
  const historyRef = useRef<TrainColor[]>([]); 

  const spawnTrain = () => {
    const colors: TrainColor[] = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
    
    let randomColor = colors[Math.floor(Math.random() * colors.length)];
    const history = historyRef.current;
    
    // Logic: Strictly prevent 3 consecutive same colors.
    if (history.length >= 2) {
        const last1 = history[history.length - 1];
        const last2 = history[history.length - 2];
        
        if (last1 === randomColor && last2 === randomColor) {
             const remaining = colors.filter(c => c !== randomColor);
             randomColor = remaining[Math.floor(Math.random() * remaining.length)];
        }
    }
    
    historyRef.current.push(randomColor);
    if (historyRef.current.length > 5) historyRef.current.shift();

    // Speed calculation: Base reduced to 0.9
    const baseSpeed = 0.9;
    const accel = Math.min(0.8, gameState.score * 0.05);

    const newTrain: Train = {
      id: Date.now().toString(),
      color: randomColor,
      trackId: 'start',
      progress: 0,
      speed: baseSpeed + accel
    };
    setTrains(prev => [...prev, newTrain]);
  };

  const gameLoop = () => {
    if (!gameState.isPlaying) return;

    const now = performance.now();
    if (now - lastSpawnTime.current > spawnInterval.current) {
      spawnTrain();
      lastSpawnTime.current = now;
      spawnInterval.current = Math.max(1200, 2500 - (gameState.score * 80)); 
    }

    setTrains(prevTrains => {
      const nextTrains: Train[] = [];
      let scored = false;
      let mistake = false;

      prevTrains.forEach(train => {
        let newProgress = train.progress + train.speed;
        let newTrackId = train.trackId;

        // Path Switching Logic
        if (newProgress >= 100) {
          newProgress = 0;
          
          if (train.trackId === 'start') {
            newTrackId = switches.s1 ? 's1_up' : 's1_down';
          } 
          else if (train.trackId === 's1_up') {
            newTrackId = switches.s2 ? 's2_up' : 's2_down';
          }
          else if (train.trackId === 's1_down') {
            newTrackId = switches.s3 ? 's3_up' : 's3_down';
          }
          else {
            // Reached End
            const endTracks: Record<string, TrainColor> = {
              's2_up': 'RED',
              's2_down': 'BLUE',
              's3_up': 'YELLOW',
              's3_down': 'GREEN'
            };

            if (endTracks[train.trackId] === train.color) {
              scored = true;
            } else {
              mistake = true;
            }
            return; // Train exits
          }
        }

        nextTrains.push({ ...train, trackId: newTrackId, progress: newProgress });
      });

      // Lives Logic
      if (mistake) {
         setGameState(prev => {
             const newLives = (prev.lives || 1) - 1;
             if (newLives <= 0) return { ...prev, lives: 0, isPlaying: false, isLost: true };
             return { ...prev, lives: newLives };
         });
      }

      if (scored) {
        setGameState(prev => {
             const newScore = prev.score + 1;
             if (newScore >= WIN_SCORE) return { ...prev, score: newScore, isPlaying: false, isWon: true };
             return { ...prev, score: newScore };
        });
      }

      return nextTrains;
    });

    frameRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState.isPlaying) {
      frameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState.isPlaying, switches, gameState.score]);

  const startGame = () => {
    setTrains([]);
    setGameState({ isPlaying: true, isWon: false, isLost: false, score: 0, lives: MAX_LIVES });
    setSwitches({ s1: true, s2: true, s3: true });
    lastSpawnTime.current = performance.now();
    historyRef.current = [];
  };

  const getTrainStyle = (train: Train) => {
    // Coordinate Mapping (Matches SVG Paths)
    // Start: 0 -> 40
    // S1: 40 -> 65 (Split to y=25 or y=75)
    // S2/3: 65 -> 100
    let start = {x:0, y:50}, end = {x:40, y:50};
    
    if (train.trackId === 'start') { start={x:0,y:50}; end={x:40,y:50}; }
    else if (train.trackId === 's1_up') { start={x:40,y:50}; end={x:65,y:25}; }
    else if (train.trackId === 's1_down') { start={x:40,y:50}; end={x:65,y:75}; }
    else if (train.trackId === 's2_up') { start={x:65,y:25}; end={x:100,y:10}; }
    else if (train.trackId === 's2_down') { start={x:65,y:25}; end={x:100,y:40}; }
    else if (train.trackId === 's3_up') { start={x:65,y:75}; end={x:100,y:60}; }
    else if (train.trackId === 's3_down') { start={x:65,y:75}; end={x:100,y:90}; }

    const x = start.x + (end.x - start.x) * (train.progress / 100);
    const y = start.y + (end.y - start.y) * (train.progress / 100);
    
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="h-full flex flex-col bg-[#2a2a2a] relative overflow-hidden font-tech">
      {!gameState.isPlaying && (
        <GameOverlay 
          status={gameState.isLost ? 'LOST' : gameState.isWon ? 'WON' : 'START'}
          title="ĐIỀU PHỐI HỎA XA"
          description={`Có 4 ga tàu (Đỏ, Xanh, Vàng, Lục). Bạn có ${MAX_LIVES} mạng. Đạt ${WIN_SCORE} điểm để chiến thắng. Tàu sẽ chạy nhanh dần!`}
          onAction={startGame}
          onHome={onBack}
        />
      )}

      {/* Header */}
      <div className="p-4 flex justify-between items-center z-10 bg-black/50 text-white">
        <button onClick={onBack}><ArrowLeft /></button>
        <div className="flex gap-4 items-center">
            <div className="flex text-red-500">
                {Array(gameState.lives).fill(0).map((_, i) => <Heart key={i} fill="currentColor" size={20}/>)}
            </div>
            <div className="text-xl font-bold text-yellow-500">ĐIỂM: {gameState.score}/{WIN_SCORE}</div>
        </div>
      </div>

      {/* Game Map */}
      <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')]">
        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Main Line - Extended to x=40 */}
          <path d={TRACK_PATHS.start} stroke="#555" strokeWidth="2" fill="none" />
          
          {/* Switch 1 Lines */}
          <path d={TRACK_PATHS.s1_up} stroke={switches.s1 ? "#fff" : "#444"} strokeWidth={switches.s1 ? "3" : "1"} fill="none" strokeDasharray={switches.s1 ? "" : "2"} />
          <path d={TRACK_PATHS.s1_down} stroke={!switches.s1 ? "#fff" : "#444"} strokeWidth={!switches.s1 ? "3" : "1"} fill="none" strokeDasharray={!switches.s1 ? "" : "2"} />

          {/* Switch 2 Lines (Top Branch) */}
          <path d={TRACK_PATHS.s2_up} stroke={switches.s2 ? "#ef4444" : "#444"} strokeWidth={switches.s2 ? "3" : "1"} fill="none" />
          <path d={TRACK_PATHS.s2_down} stroke={!switches.s2 ? "#3b82f6" : "#444"} strokeWidth={!switches.s2 ? "3" : "1"} fill="none" />

          {/* Switch 3 Lines (Bot Branch) */}
          <path d={TRACK_PATHS.s3_up} stroke={switches.s3 ? "#eab308" : "#444"} strokeWidth={switches.s3 ? "3" : "1"} fill="none" />
          <path d={TRACK_PATHS.s3_down} stroke={!switches.s3 ? "#22c55e" : "#444"} strokeWidth={!switches.s3 ? "3" : "1"} fill="none" />
        </svg>

        {/* Stations */}
        <div className="absolute right-0 top-[5%] w-16 h-8 bg-red-900 border-l-4 border-red-500 flex items-center justify-center text-white text-[10px] font-bold">RED</div>
        <div className="absolute right-0 top-[35%] w-16 h-8 bg-blue-900 border-l-4 border-blue-500 flex items-center justify-center text-white text-[10px] font-bold">BLUE</div>
        <div className="absolute right-0 top-[55%] w-16 h-8 bg-yellow-900 border-l-4 border-yellow-500 flex items-center justify-center text-white text-[10px] font-bold text-black">YEL</div>
        <div className="absolute right-0 top-[85%] w-16 h-8 bg-green-900 border-l-4 border-green-500 flex items-center justify-center text-white text-[10px] font-bold">GRN</div>

        {/* Switches - Position Updated */}
        {/* SW1 - Moved to 40% */}
        <button 
          onClick={() => setSwitches(s => ({ ...s, s1: !s.s1 }))}
          className={`absolute left-[40%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center z-20 ${switches.s1 ? 'bg-white border-white' : 'bg-gray-600 border-gray-400'}`}
        >
          <GitCommitHorizontal className={switches.s1 ? 'text-black' : 'text-white'} size={16} />
        </button>

        {/* SW2 - Moved to 65% */}
        <button 
          onClick={() => setSwitches(s => ({ ...s, s2: !s.s2 }))}
          className={`absolute left-[65%] top-[25%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center z-20 ${switches.s2 ? 'bg-red-500' : 'bg-blue-500'}`}
        >
          <GitCommitHorizontal className="text-white" size={16} />
        </button>

        {/* SW3 - Moved to 65% */}
        <button 
          onClick={() => setSwitches(s => ({ ...s, s3: !s.s3 }))}
          className={`absolute left-[65%] top-[75%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center z-20 ${switches.s3 ? 'bg-yellow-500' : 'bg-green-500'}`}
        >
          <GitCommitHorizontal className="text-white" size={16} />
        </button>

        {/* Trains */}
        {trains.map(train => {
          const style = getTrainStyle(train);
          return (
            <div 
              key={train.id}
              className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 shadow-lg border border-white rounded-sm ${TRAIN_COLORS[train.color]}`}
              style={style}
            >
            </div>
          );
        })}
      </div>
    </div>
  );
};