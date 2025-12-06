import React from 'react';
import { Home, RefreshCw, Trophy, XCircle } from 'lucide-react';

interface GameOverlayProps {
  status: 'START' | 'WON' | 'LOST';
  title: string;
  description: string;
  onAction: () => void;
  onHome: () => void;
  buttonText?: string;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ 
  status, 
  title, 
  description, 
  onAction, 
  onHome,
  buttonText 
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#fdfbf7] p-8 max-w-md w-full rounded-sm border-4 border-double border-yellow-800 shadow-2xl text-center">
        
        <div className="flex justify-center mb-4">
          {status === 'WON' && <Trophy className="w-16 h-16 text-yellow-600" />}
          {status === 'LOST' && <XCircle className="w-16 h-16 text-red-800" />}
          {status === 'START' && <div className="w-16 h-16 bg-yellow-800 rounded-full flex items-center justify-center text-white font-serif text-2xl font-bold">?</div>}
        </div>

        <h2 className="text-3xl font-bold text-yellow-900 mb-2 font-serif uppercase tracking-wider">{title}</h2>
        <p className="text-gray-700 mb-8 leading-relaxed">{description}</p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onAction}
            className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-800 hover:bg-yellow-900 text-white font-bold tracking-widest uppercase transition-colors"
          >
            {status === 'START' ? 'Bắt Đầu' : <><RefreshCw size={18} /> Chơi Lại</>}
          </button>
          
          <button 
            onClick={onHome}
            className="flex items-center justify-center gap-2 w-full py-3 border border-yellow-800 text-yellow-900 hover:bg-yellow-50 font-bold tracking-widest uppercase transition-colors"
          >
            <Home size={18} /> Quay về Cổng
          </button>
        </div>
      </div>
    </div>
  );
};